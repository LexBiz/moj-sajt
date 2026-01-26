import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { recordInstagramAi, recordInstagramWebhook } from '../state'
import { readTokenFile } from '../oauth/_store'
import { getConversation, updateConversation, type ConversationLang, type ConversationMessage } from '../conversationStore'
import fs from 'fs'
import path from 'path'
import { buildTemoWebSystemPrompt, computeReadinessScoreHeuristic, computeStageHeuristic } from '../../temowebPrompt'
import { startInstagramFollowupScheduler } from '../followupScheduler'

// Start follow-up scheduler once per server process (enabled via env).
startInstagramFollowupScheduler()

export const dynamic = 'force-dynamic'
export const revalidate = 0

type IgWebhookMessage = {
  sender?: { id?: string }
  recipient?: { id?: string }
  message?: {
    text?: string
    is_echo?: boolean
    attachments?: Array<{ type?: string; payload?: { url?: string } }>
  }
}

type IgWebhookChangeValue = {
  sender?: { id?: string }
  recipient?: { id?: string }
  timestamp?: number
  message?: {
    mid?: string
    text?: string
    is_echo?: boolean
    attachments?: Array<{ type?: string; payload?: { url?: string } }>
  }
}

type IgWebhookChange = {
  field?: string
  value?: IgWebhookChangeValue
}

type IgWebhookPayload = {
  object?: string
  entry?: Array<{
    id?: string
    time?: number
    messaging?: IgWebhookMessage[]
    changes?: IgWebhookChange[]
  }>
}

const IG_VERIFY_TOKEN = (process.env.INSTAGRAM_VERIFY_TOKEN || '').trim()
const IG_APP_SECRET = (process.env.INSTAGRAM_APP_SECRET || '').trim()
const IG_SIGNATURE_BYPASS = (process.env.INSTAGRAM_SIGNATURE_BYPASS || '').trim() === 'true'
const IG_USER_ID = (process.env.INSTAGRAM_IG_USER_ID || '').trim()
const IG_API_HOST = (process.env.INSTAGRAM_API_HOST || 'graph.facebook.com').trim()
const IG_API_VERSION = (process.env.INSTAGRAM_API_VERSION || 'v24.0').trim()

function getOpenAiKey() {
  // Support both names (people often set OPENAI_KEY by habit).
  const k = (process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '').trim()
  return k
}

function openAiKeyMeta(k: string) {
  const key = (k || '').trim()
  return key
    ? { len: key.length, prefix: key.slice(0, 4), suffix: key.slice(-4) }
    : { len: 0, prefix: null as any, suffix: null as any }
}

const OPENAI_MODEL = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()
const OPENAI_TRANSCRIBE_MODEL = (process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1').trim()
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''

const LEADS_FILE = path.join(process.cwd(), 'data', 'leads.json')

function parseAllowlist(raw: string) {
  const list = raw
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)
  return new Set(list)
}

// Optional safety switch:
// If set, the bot will ONLY auto-reply to these sender IDs (Instagram-scoped IDs).
// Example: INSTAGRAM_ALLOWED_SENDER_IDS=123,456
const ALLOWED_SENDER_IDS = parseAllowlist(process.env.INSTAGRAM_ALLOWED_SENDER_IDS || '')

function isAllowedSender(senderId: string) {
  if (ALLOWED_SENDER_IDS.size === 0) return true // allow all by default
  return ALLOWED_SENDER_IDS.has(senderId)
}

function verifySignature(rawBody: Buffer, signatureHeader: string | null) {
  if (IG_SIGNATURE_BYPASS) {
    console.warn('INSTAGRAM_SIGNATURE_BYPASS=true; signature verification skipped')
    return true
  }
  if (!IG_APP_SECRET) {
    console.warn('INSTAGRAM_APP_SECRET is missing; signature verification skipped')
    return true
  }
  const header = signatureHeader?.trim()
  if (!header) return false
  if (!header.startsWith('sha256=')) return false

  const expected = `sha256=${crypto.createHmac('sha256', IG_APP_SECRET).update(rawBody).digest('hex')}`
  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(header)
  if (expectedBuf.length !== actualBuf.length) return false
  try {
    return crypto.timingSafeEqual(expectedBuf, actualBuf)
  } catch {
    return false
  }
}

function clip(text: string, max = 1000) {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

type IncomingMedia = { kind: 'image' | 'audio' | 'video' | 'file'; url: string }

function extractMedia(anyMessage: any): IncomingMedia[] {
  const attachments = Array.isArray(anyMessage?.attachments) ? anyMessage.attachments : Array.isArray(anyMessage?.message?.attachments) ? anyMessage.message.attachments : []
  const out: IncomingMedia[] = []
  for (const a of attachments) {
    const url = typeof a?.payload?.url === 'string' ? a.payload.url : null
    if (!url) continue
    const t = String(a?.type || '').toLowerCase()
    const kind: IncomingMedia['kind'] =
      t.includes('image') || t === 'photo' ? 'image' : t.includes('audio') || t.includes('voice') ? 'audio' : t.includes('video') ? 'video' : 'file'
    out.push({ kind, url })
  }
  return out
}

function isUkrainianText(s: string) {
  return /[іїєґ]/i.test(s)
}

function detectLangFromText(text: string): ConversationLang {
  const t = String(text || '').trim()
  if (!t) return 'ua'
  // Ukrainian has unique letters
  if (isUkrainianText(t) || /(\b(ви|ваш|ваша|ваші)\b)/i.test(t)) return 'ua'
  // Russian has letters that Ukrainian doesn't use (ы, э, ё)
  if (/[ыэё]/i.test(t)) return 'ru'
  // Common Russian words (helps for texts without ы/э/ё)
  if (/(привет|здравствуйте|пожалуйста|как\s+дела|как\s+это|мне|нужно|хочу|скажите|расскажите|можете|подскажите|стоимость|сколько)/i.test(t))
    return 'ru'
  // Common Ukrainian words
  if (/(вітаю|добридень|будь\s+ласка|як\s+це|мені|потрібно|хочу|скажіть|розкажіть|можете|підкажіть|вартість|скільки)/i.test(t))
    return 'ua'
  // If unclear, default to Ukrainian 🇺🇦 (per requirement)
  return 'ua'
}

function parseLangChoice(text: string): ConversationLang | null {
  const t = text.trim().toLowerCase()
  if (!t) return null
  if (t === '1' || t === 'ru' || t.includes('рус')) return 'ru'
  if (t === '2' || t === 'ua' || t.includes('укр') || t.includes('укра')) return 'ua'
  if (isUkrainianText(t)) return 'ua'
  return null
}

function t(lang: ConversationLang, key: string) {
  const RU: Record<string, string> = {
    chooseLang: ['Здравствуйте! 👋 Я персональный AI‑ассистент TemoWeb.', 'Выберите удобный язык:', '1) Русский 🇷🇺', '2) Українська 🇺🇦'].join('\n'),
    askRepeating: 'Отлично ✅ Напишите, пожалуйста, одним сообщением, что нужно — я отвечу. 🙂',
    contactOk: ['Спасибо! ✅ Контакт получил.', '—', 'Я посмотрю детали и вернусь с конкретным планом.', 'Для точности: ниша + средний чек + источник заявок. 💬'].join('\n'),
    contactFix: ['Похоже, контакт указан не полностью. 🙌', 'Отправьте, пожалуйста, корректно:', '— email (name@domain.com)', '— телефон (+380..., +49..., +7...)', '— или Telegram @username'].join('\n'),
    askContact: ['Отлично, задачу понял ✅', '—', 'Чтобы продолжить и зафиксировать заявку, отправьте контакт:', 'email / телефон / Telegram @username'].join('\n'),
  }
  const UA: Record<string, string> = {
    chooseLang: ['Вітаю! 👋 Я персональний AI‑асистент TemoWeb.', 'Оберіть зручну мову:', '1) Русский 🇷🇺', '2) Українська 🇺🇦'].join('\n'),
    askRepeating: 'Чудово ✅ Напишіть, будь ласка, одним повідомленням, що потрібно — я відповім. 🙂',
    contactOk: ['Дякую! ✅ Контакт отримав.', '—', 'Перегляну деталі й повернусь з конкретним планом.', 'Для точності: ніша + середній чек + джерело заявок. 💬'].join('\n'),
    contactFix: ['Схоже, контакт вказаний не повністю. 🙌', 'Надішліть, будь ласка, коректно:', '— email (name@domain.com)', '— телефон (+380..., +49..., +7...)', '— або Telegram @username'].join('\n'),
    askContact: ['Чудово, задачу зрозумів ✅', '—', 'Щоб продовжити й зафіксувати заявку, надішліть контакт:', 'email / телефон / Telegram @username'].join('\n'),
  }
  return (lang === 'ua' ? UA : RU)[key] || key
}

function getAccessToken() {
  const envToken = (process.env.INSTAGRAM_ACCESS_TOKEN || '').trim()
  if (envToken) return envToken
  const saved = (readTokenFile()?.accessToken || '').trim()
  return saved
}

function safeJsonPreview(raw: Buffer, max = 1200) {
  try {
    return clip(raw.toString('utf8'), max)
  } catch {
    return null
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nowIso() {
  return new Date().toISOString()
}

function parseLangSwitch(text: string): ConversationLang | null {
  const t = String(text || '').trim().toLowerCase()
  if (!t) return null
  // "Speak Russian/Ukrainian" style commands
  if (/(говори|говорите|разговаривай|розмовляй|пиши|пишіть|пиши)\s+.*(рус|рос|russian)/i.test(t)) return 'ru'
  if (/(говори|говорите|разговаривай|розмовляй|пиши|пишіть|пиши)\s+.*(укр|укра|ukrain)/i.test(t)) return 'ua'
  // Direct mentions
  if (/\bрус(ский|ском)\b/i.test(t)) return 'ru'
  if (/\bукра(їнськ|инск|їнською)\b/i.test(t)) return 'ua'
  return null
}

function detectBookingIntent(text: string) {
  return /(запис|запиш|брон|бронь|встреч|созвон|консультац|демо|demo|call|appointment)/i.test(text)
}

function detectLeadIntent(text: string) {
  // Keep this reasonably strict: too-broad triggers ("хочу/нужно/интерес") makes the bot spam ask_contact templates.
  // We want the AI to answer first, then ask for contact when there's clear purchase/booking intent.
  return /(куп(ить|лю)|цена|стоим|пакет|сколько|подключ|замов|заказ|демо|demo|созвон|консультац|дзвінок|звонок|запис|брон)/i.test(
    text,
  )
}

function detectAiIdentityQuestion(text: string) {
  return /(ты\s+.*ai|справжн\w*\s+ai|реальн\w*\s+ai|ти\s+.*ai|бот\?|ти\s+бот|штучн\w*\s+інтелект|искусственн\w*\s+интеллект)/i.test(
    text,
  )
}

function detectReadyToProceed(text: string) {
  // Keep this strict: "интересно/цікав" is NOT readiness to proceed (it triggers premature ask_contact).
  return /(ок|okay|давай|погнали|готов|підключ|подключ|консультац|созвон|дзвінок|звонок|почнемо|почати)/i.test(text)
}

function detectResetIntent(text: string) {
  const t = String(text || '').trim().toLowerCase()
  if (!t) return false
  return (
    /^(давай\s+заново|заново|с\s*начала|сначала|по\s*новой|з\s*нуля|обнули|обнулить|reset|restart|start\s*over)\b/i.test(t) ||
    /\b(давай\s+заново|почнемо\s+заново|почати\s+заново|з\s*нуля|обнули|reset|restart|start\s*over)\b/i.test(t)
  )
}

function normalizeContact(text: string) {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
  if (email) return { type: 'email' as const, value: email.trim() }

  const phoneMatch = text.match(/\+?\d[\d\s().-]{7,}/)?.[0]
  if (phoneMatch) {
    const cleaned = phoneMatch.replace(/[^\d+]/g, '')
    const digits = cleaned.replace(/[^\d]/g, '')
    if (digits.length >= 8) return { type: 'phone' as const, value: cleaned }
  }

  const tg = text.match(/@[\w\d_]{3,}/)?.[0]
  if (tg) return { type: 'telegram' as const, value: tg.trim() }

  return null
}

function hasInvalidContactHint(text: string) {
  // If user tries to send contact but it doesn't match any pattern, ask again.
  const hasAt = text.includes('@')
  const hasDigits = /\d{6,}/.test(text)
  return (hasAt || hasDigits) && !normalizeContact(text)
}

function containsContactAsk(text: string) {
  const t = String(text || '').toLowerCase()
  if (!t) return false
  return (
    t.includes('отправ') && t.includes('контакт') ||
    t.includes('пришл') && t.includes('контакт') ||
    t.includes('надішл') && t.includes('контакт') ||
    t.includes('send') && t.includes('contact') ||
    t.includes('email /') ||
    t.includes('телефон') ||
    t.includes('telegram @') ||
    t.includes('@username') ||
    t.includes('зафиксировать') && t.includes('заявк') ||
    t.includes('зафіксувати') && t.includes('заявк')
  )
}

function stripContactAskBlock(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  if (lines.length === 0) return text
  // If a contact CTA appears near the end, drop it (and separator line right above it).
  const lastIdx = lines.length - 1
  const startSearch = Math.max(0, lastIdx - 12)
  let cutAt = -1
  for (let i = startSearch; i <= lastIdx; i += 1) {
    if (containsContactAsk(lines[i])) {
      cutAt = i
      break
    }
  }
  if (cutAt === -1) return text.trim()
  let cut = cutAt
  // Remove a preceding separator line like "—" or empty line blocks
  while (cut > 0) {
    const prev = lines[cut - 1].trim()
    if (prev === '—' || prev === '-' || prev === '') cut -= 1
    else break
  }
  const kept = lines.slice(0, cut).join('\n').trim()
  return kept || text.trim()
}

// readiness scoring + stage heuristic live in ../../temowebPrompt

async function generateAiReply(params: {
  userText: string
  lang: ConversationLang
  stage: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  images?: string[]
  readinessScore?: number
  channel?: 'instagram'
}) {
  const { userText, lang, stage, history, images = [], readinessScore = 0 } = params
  const OPENAI_API_KEY = getOpenAiKey()
  if (!OPENAI_API_KEY) {
    return {
      reply:
        lang === 'ua'
          ? 'Привіт! 👋 Напиши 1–2 деталі: ніша + звідки зараз йдуть заявки — і я покажу, як це автоматизуємо. 🚀'
          : 'Привет! 👋 Напиши 1–2 детали: ниша + откуда сейчас идут заявки — и я покажу, как это автоматизируем. 🚀',
      provider: 'fallback' as const,
      detail: 'missing_openai_key',
    }
  }

  const system = buildTemoWebSystemPrompt({
    lang,
    channel: 'instagram',
    stage: computeStageHeuristic(userText, readinessScore),
    readinessScore,
  })
  const historyMsgs = history.slice(-8).map((m) => ({ role: m.role, content: m.content }))
  const isFirstAssistantMsg = history.filter((m) => m.role === 'assistant').length === 0
  const firstMsgRule =
    lang === 'ua'
      ? 'Це перше повідомлення в діалозі: обовʼязково представтесь як "персональний AI‑асистент TemoWeb" і відповідайте на "Ви".'
      : 'Это первое сообщение в диалоге: обязательно представьтесь как "персональный AI‑ассистент TemoWeb" и общайтесь на "Вы".'
  const firstMsgLangAsk =
    lang === 'ua'
      ? 'У цьому ж першому повідомленні додайте 1 короткий рядок: "Якою мовою Вам зручніше: Русский 🇷🇺 чи Українська 🇺🇦? Якщо не скажете — відповідаю українською 🇺🇦."'
      : 'В этом же первом сообщении добавьте 1 короткую строку: "На каком языке Вам удобно: Русский 🇷🇺 или Українська 🇺🇦? Если не скажете — по умолчанию отвечаю українською 🇺🇦."'
  const userContent =
    images.length > 0
      ? ([
          { type: 'text', text: userText },
          ...images.slice(0, 3).map((url) => ({ type: 'image_url', image_url: { url } })),
        ] as any)
      : userText

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: system },
        ...(isFirstAssistantMsg ? [{ role: 'system', content: firstMsgRule }, { role: 'system', content: firstMsgLangAsk }] : []),
        ...historyMsgs,
        { role: 'user', content: userContent },
      ],
      temperature: 0.75,
      presence_penalty: 0.2,
      frequency_penalty: 0.2,
      max_tokens: 350,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('OpenAI error', response.status, text.slice(0, 400))
    return {
      reply:
        lang === 'ua'
          ? 'Я на звʼязку ✅ Напиши коротко: ніша + джерело заявок — і я покажу рішення. ✍️'
          : 'Я на связи ✅ Напиши коротко: ниша + источник заявок — и я покажу решение. ✍️',
      provider: 'fallback' as const,
      detail: `openai_http_${response.status}`,
    }
  }

  const json = (await response.json()) as any
  const content = json?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    return {
      reply: lang === 'ua' ? 'Дай 1–2 деталі по бізнесу — і я зберу рішення. 💡' : 'Дай 1–2 детали по бизнесу — и я соберу решение. 💡',
      provider: 'fallback' as const,
      detail: 'openai_bad_response',
    }
  }
  return { reply: clip(content.trim(), 1000), provider: 'openai' as const, detail: null }
}

async function fetchBinary(url: string) {
  const token = getAccessToken()
  const resp = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!resp.ok) return null
  const ab = await resp.arrayBuffer()
  return Buffer.from(ab)
}

async function transcribeAudio(url: string) {
  const OPENAI_API_KEY = getOpenAiKey()
  if (!OPENAI_API_KEY) return null
  const buf = await fetchBinary(url)
  if (!buf) return null
  try {
    const form = new FormData()
    form.append('model', OPENAI_TRANSCRIBE_MODEL)
    form.append('file', new Blob([buf]), 'audio.mp3')
    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    })
    if (!resp.ok) {
      const t = await resp.text().catch(() => '')
      console.error('OpenAI transcribe error', resp.status, t.slice(0, 200))
      return null
    }
    const json = (await resp.json()) as any
    const text = typeof json?.text === 'string' ? json.text.trim() : null
    return text && text.length > 0 ? text : null
  } catch (e) {
    console.error('Transcribe exception', e)
    return null
  }
}

function ensureLeadsFile() {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, JSON.stringify([]))
}

type LeadReadiness = { score: number; label: 'COLD' | 'WARM' | 'HOT' | 'READY'; stage: string }

function readinessLabel(score: number): LeadReadiness['label'] {
  if (score >= 70) return 'READY'
  if (score >= 55) return 'HOT'
  if (score >= 30) return 'WARM'
  return 'COLD'
}

async function generateLeadAiSummary(input: {
  lang: ConversationLang
  readiness: LeadReadiness
  clientMessages: string[]
}) {
  const OPENAI_API_KEY = getOpenAiKey()
  if (!OPENAI_API_KEY) return null

  const payload = {
    readiness: input.readiness,
    clientMessages: input.clientMessages.slice(0, 18),
  }

  const langLine = input.lang === 'ua' ? 'Пиши українською.' : 'Пиши по‑русски.'

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        max_tokens: 240,
        messages: [
          {
            role: 'system',
            content: [
              langLine,
              'Сделай короткое, ПРАВДИВОЕ резюме лида для CRM TemoWeb.',
              'Можно использовать только данные из JSON (ничего не выдумывать).',
              'Формат: 5–8 строк, каждая начинается с эмодзи.',
              'Первая строка — готовность покупки: 🟢/🟡/🟠/🔴 + label + score.',
              'Дальше: 🏷 ниша/бизнес (если есть), 😤 боль, 💬 что хочет, 🧩 следующий шаг.',
              'Без markdown (#, **). Обращайся на "Вы/Ви".',
            ].join(' '),
          },
          { role: 'user', content: JSON.stringify(payload) },
        ],
      }),
    })
    if (!resp.ok) return null
    const json = (await resp.json()) as any
    const content = json?.choices?.[0]?.message?.content
    const s = typeof content === 'string' ? content.trim() : ''
    return s ? s.slice(0, 1200) : null
  } catch {
    return null
  }
}

async function saveLeadFromInstagram(input: {
  senderId: string
  contact: { type: 'email' | 'phone' | 'telegram'; value: string }
  clientMessages: string[]
  lastMessage: string
  lang: ConversationLang
  aiSummary: string | null
  aiReadiness: LeadReadiness
}) {
  ensureLeadsFile()
  const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'))
  const newLead = {
    id: Date.now(),
    name: null,
    contact: input.contact.value,
    businessType: null,
    channel: 'Instagram',
    pain: null,
    question: input.lastMessage || null,
    clientMessages: input.clientMessages.slice(0, 20),
    aiRecommendation: null,
    aiSummary: input.aiSummary,
    aiReadiness: input.aiReadiness,
    source: 'instagram',
    lang: input.lang,
    notes: `senderId: ${input.senderId} | contactType: ${input.contact.type}`,
    createdAt: new Date().toISOString(),
    status: 'new',
  }
  leads.unshift(newLead)
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2))
  return newLead.id
}

function shouldAskForContact(stage: string, text: string, userTurns: number, readinessScore: number) {
  if (stage === 'ask_contact' || stage === 'collected' || stage === 'done') return false
  // ASK_CONTACT is allowed only when score is high enough (per the prompt).
  if (readinessScore < 55) return false
  // Clear "start intent" signals
  if (/(как\s+начать|что\s+дальше|созвон|call|встреч|готов|подключ|старт|оплач)/i.test(text)) return true
  // Booking intent implies readiness, but still keep it non-early.
  if (detectBookingIntent(text)) return true
  // Price/package questions: move to contact only after some context is collected.
  if (userTurns >= 3 && /цена|стоимость|пакет|тариф|срок/i.test(text)) return true
  // Ask for contact ONLY when user indicates readiness (otherwise it looks like a шаблон).
  if (userTurns >= 4 && stage !== 'new' && detectReadyToProceed(text)) return true
  return false
}

async function sendInstagramMessage(recipientId: string, text: string) {
  const IG_ACCESS_TOKEN = getAccessToken()
  if (!IG_ACCESS_TOKEN || !IG_USER_ID) {
    console.error('Missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_IG_USER_ID')
    return
  }
  const urlObj = new URL(`https://${IG_API_HOST}/${IG_API_VERSION}/${IG_USER_ID}/messages`)
  // For graph.facebook.com we keep access_token in query (URL-encoded) since many examples use it.
  // For graph.instagram.com (Instagram API with Instagram Login) we do NOT include it in query.
  if (IG_API_HOST !== 'graph.instagram.com') {
    urlObj.searchParams.set('access_token', IG_ACCESS_TOKEN)
  }
  const url = urlObj.toString()
  const body = {
    recipient: { id: recipientId },
    messaging_type: 'RESPONSE',
    message: { text: clip(text, 1000) },
  }

  const retryDelaysMs = [0, 300, 1200, 2500]
  let lastStatus: number | null = null
  let lastBodyPreview = ''

  const tokenMeta = {
    len: IG_ACCESS_TOKEN.length,
    prefix: IG_ACCESS_TOKEN ? IG_ACCESS_TOKEN.slice(0, 4) : null,
    suffix: IG_ACCESS_TOKEN ? IG_ACCESS_TOKEN.slice(-4) : null,
  }

  for (let attempt = 0; attempt < retryDelaysMs.length; attempt += 1) {
    const delay = retryDelaysMs[attempt]
    if (delay) await sleep(delay)

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Both hosts accept Authorization header; it's REQUIRED for graph.instagram.com per docs.
        Authorization: `Bearer ${IG_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    })

    if (resp.ok) {
      console.log('Instagram send ok', { recipientId })
      return
    }

    const respText = await resp.text().catch(() => '')
    lastStatus = resp.status
    lastBodyPreview = respText.slice(0, 400)

    // Retry only for transient/server-side errors or known transient OAuth error.
    let isTransient = resp.status >= 500
    try {
      const parsed = JSON.parse(respText) as any
      const code = parsed?.error?.code
      const transient = parsed?.error?.is_transient
      if (transient === true) isTransient = true
      if (code === 2) isTransient = true // service temporarily unavailable
    } catch {
      // ignore
    }

    console.error('Instagram send error', {
      attempt: attempt + 1,
      status: resp.status,
      transient: isTransient,
      body: lastBodyPreview,
      tokenMeta,
    })

    if (!isTransient) break
  }

  console.error('Instagram send failed (giving up)', {
    status: lastStatus,
    body: lastBodyPreview,
    recipientId,
    tokenMeta,
  })
}

async function sendTelegramLead({
  senderId,
  messageText,
  contactHint,
}: {
  senderId: string
  messageText: string
  contactHint: string | null
}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Telegram is not configured for IG leads')
    return
  }

  const parts = [
    '📥 НОВА ЗАЯВКА З INSTAGRAM',
    '',
    `🧾 Контакт (IG): ${senderId}`,
    contactHint ? `☎️ Контакт клієнта: ${contactHint}` : '☎️ Контакт клієнта: —',
    '',
    '🗣 Повідомлення клієнта:',
    `— ${clip(messageText, 800)}`,
    '',
    `🕒 Час: ${new Date().toISOString()}`,
  ]

  const text = parts.join('\n')
  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true,
    }),
  })
  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    console.error('Telegram send error (IG lead)', resp.status, body.slice(0, 400))
  }
}

async function handleIncomingMessage(senderId: string, text: string, media: IncomingMedia[]) {
  const conversation = getConversation(senderId)
  const lang = conversation.lang
  const maybeLang = parseLangChoice(text)

  // Hard reset: user asks to "start over" -> clear conversation state and restart language selection.
  if (detectResetIntent(text)) {
    updateConversation(senderId, {
      stage: 'new',
      lang: null,
      pendingText: null,
      history: [],
      leadId: null,
    })
    await sendInstagramMessage(senderId, t(detectLangFromText(text), 'chooseLang'))
    updateConversation(senderId, { lastAssistantAt: nowIso() })
    return
  }

  // language selection gate
  if (!lang) {
    // If user explicitly chose language (1/2/ru/ua) - respect it.
    if (maybeLang) {
      updateConversation(senderId, { lang: maybeLang, pendingText: null })
      await sendInstagramMessage(senderId, t(maybeLang, 'askRepeating'))
      updateConversation(senderId, { lastAssistantAt: nowIso() })
      return
    }
    // Auto language by first message text.
    const auto = detectLangFromText(text)
    updateConversation(senderId, { lang: auto, pendingText: null })
    // First message must introduce itself as personal AI assistant (required).
    // We answer immediately via AI, using the user's original message.
    // Continue with the normal flow using the detected language.
    await handleIncomingMessage(senderId, text, media)
    return
  }

  // if user keeps sending "1/2/ru/ua" after selection, ignore as noise
  if (maybeLang && maybeLang === lang && text.trim().length <= 3) return

  // Allow switching language at any time.
  const switchLang = parseLangSwitch(text)
  if (switchLang && switchLang !== lang) {
    updateConversation(senderId, { lang: switchLang })
    const ai = await generateAiReply({
      userText:
        switchLang === 'ua'
          ? 'Client asked to switch language to Ukrainian. Confirm politely and continue.'
          : 'Client asked to switch language to Russian. Confirm politely and continue.',
      lang: switchLang,
      stage: conversation.stage || 'qualify',
      history: conversation.history as any,
      images: [],
      readinessScore: 35,
      channel: 'instagram',
    })
    recordInstagramAi({ provider: ai.provider, detail: ai.detail })
    const nextHistory: ConversationMessage[] = [...conversation.history, { role: 'user' as const, content: text }, { role: 'assistant' as const, content: ai.reply }].slice(-12) as any
    updateConversation(senderId, { history: nextHistory, lastAssistantAt: nowIso() })
    await sendInstagramMessage(senderId, ai.reply)
    return
  }

  // Handle "are you real AI/bot" type questions early (do NOT jump to contact request)
  if (detectAiIdentityQuestion(text)) {
    const reply =
      lang === 'ua'
        ? [
            'Я менеджер TemoWeb 🙂',
            '—',
            'Пишу тут у Direct і допомагаю розібратись, як автоматизація може принести більше заявок і забрати ручну рутину.',
            'Щоб підказати точніше: яка у тебе ніша і звідки зараз приходять клієнти?',
          ].join('\n')
        : [
            'Я менеджер TemoWeb 🙂',
            '—',
            'Пишу здесь в Direct и помогаю разобраться, как автоматизация может принести больше заявок и убрать ручную рутину.',
            'Чтобы подсказать точнее: какая у тебя ниша и откуда сейчас приходят клиенты?',
          ].join('\n')

    const history: ConversationMessage[] = [...conversation.history, { role: 'user' as const, content: text }, { role: 'assistant' as const, content: reply }].slice(-12) as ConversationMessage[]
    updateConversation(senderId, { stage: conversation.stage === 'new' ? 'qualify' : conversation.stage, history })
    await sendInstagramMessage(senderId, reply)
    updateConversation(senderId, { lastAssistantAt: nowIso() })
    return
  }

  const history: ConversationMessage[] = [...conversation.history, { role: 'user' as const, content: text }].slice(-12) as ConversationMessage[]
  const userTurns = history.filter((m) => m.role === 'user').length
  const contact = normalizeContact(text)
  const readinessScore = computeReadinessScoreHeuristic(text, userTurns)

  // Always store the message first
  updateConversation(senderId, { history, lastUserAt: nowIso() })

  if (!isAllowedSender(senderId)) {
    console.log('IG webhook: sender not in allowlist; skipping auto-reply', { senderId })
    return
  }

  if (contact && conversation.leadId == null) {
    const readiness = { score: readinessScore, label: readinessLabel(readinessScore), stage: computeStageHeuristic(text, readinessScore) }
    const aiSummary =
      (await generateLeadAiSummary({
        lang,
        readiness,
        clientMessages: history.filter((m) => m.role === 'user').map((m) => m.content),
      })) || null
    const leadId = await saveLeadFromInstagram({
      senderId,
      contact,
      clientMessages: history.filter((m) => m.role === 'user').map((m) => m.content),
      lastMessage: text,
      lang,
      aiSummary,
      aiReadiness: readiness,
    })
    updateConversation(senderId, { stage: 'collected', leadId, history })
    await sendTelegramLead({ senderId, messageText: text, contactHint: contact.value })
    // Confirm via AI (no templates); fallback only if OpenAI is unavailable.
    const ai = await generateAiReply({
      userText: `Client provided contact: ${contact.value}. Thank them and confirm next steps. Keep it short.`,
      lang,
      stage: 'collected',
      history,
      images: [],
    })
    recordInstagramAi({ provider: ai.provider, detail: ai.detail })
    const reply = ai.provider === 'openai' ? ai.reply : t(lang, 'contactOk')
    updateConversation(senderId, { history: [...history, { role: 'assistant' as const, content: reply }].slice(-12) })
    await sendInstagramMessage(senderId, reply)
    updateConversation(senderId, { lastAssistantAt: nowIso() })
    return
  }

  if (hasInvalidContactHint(text)) {
    updateConversation(senderId, { stage: 'ask_contact', history })
    // Ask to resend contact (prefer AI, fallback to a short deterministic hint)
    const ai = await generateAiReply({
      userText:
        `Client tried to send contact but it looks invalid: "${clip(text, 120)}". ` +
        `Ask them to resend ONLY one of: email / phone / Telegram @username.`,
      lang,
      stage: 'ask_contact',
      history,
      images: [],
    })
    recordInstagramAi({ provider: ai.provider, detail: ai.detail })
    const reply = ai.provider === 'openai' ? ai.reply : t(lang, 'contactFix')
    updateConversation(senderId, { history: [...history, { role: 'assistant' as const, content: reply }].slice(-12) })
    await sendInstagramMessage(senderId, reply)
    updateConversation(senderId, { lastAssistantAt: nowIso() })
    return
  }

  const nextStage = shouldAskForContact(conversation.stage, text, userTurns, readinessScore) ? 'ask_contact' : conversation.stage === 'new' ? 'qualify' : conversation.stage
  updateConversation(senderId, { stage: nextStage, history })

  const images = media.filter((m) => m.kind === 'image').map((m) => m.url)
  const audio = media.find((m) => m.kind === 'audio')?.url || null
  const transcript = audio ? await transcribeAudio(audio) : null
  const composedUserText =
    transcript && transcript.length > 0
      ? `${text}\n\n[Voice message transcript]: ${transcript}`
      : text || (images.length > 0 ? '[Image sent]' : '')

  // Main rule: after language selection, NO hard-coded templates — all replies are from OpenAI.
  const ai = await generateAiReply({ userText: composedUserText, lang, stage: nextStage, history, images, readinessScore, channel: 'instagram' })
  // Guardrail: if model tries to paste "send contact" too often, strip it unless we really are in ask_contact.
  const recentAsks = history
    .filter((m) => m.role === 'assistant')
    .slice(-3)
    .some((m) => containsContactAsk(m.content))
  let reply = ai.reply
  if (nextStage !== 'ask_contact') {
    reply = stripContactAskBlock(reply)
  } else if (recentAsks && containsContactAsk(reply)) {
    // Don't repeat contact request every turn.
    reply = stripContactAskBlock(reply)
  }
  recordInstagramAi({ provider: ai.provider, detail: ai.detail })
  updateConversation(senderId, { history: [...history, { role: 'assistant' as const, content: reply }].slice(-12) })
  await sendInstagramMessage(senderId, reply)
  updateConversation(senderId, { lastAssistantAt: nowIso() })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token && token === IG_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  const rawBuffer = Buffer.from(await request.arrayBuffer())
  const signature = request.headers.get('x-hub-signature-256')
  const IG_ACCESS_TOKEN = getAccessToken()
  const OPENAI_API_KEY = getOpenAiKey()

  console.log('IG webhook: received', {
    hasSignature: Boolean(signature),
    length: rawBuffer.length,
    hasVerifyToken: Boolean(IG_VERIFY_TOKEN),
    hasAppSecret: Boolean(IG_APP_SECRET),
    signatureBypass: IG_SIGNATURE_BYPASS,
    hasAccessToken: Boolean(IG_ACCESS_TOKEN),
    hasIgUserId: Boolean(IG_USER_ID),
    igUserIdLast4: IG_USER_ID ? IG_USER_ID.slice(-4) : null,
    openai: {
      hasKey: Boolean(OPENAI_API_KEY),
      model: OPENAI_MODEL,
      keyMeta: Boolean(OPENAI_API_KEY) ? openAiKeyMeta(OPENAI_API_KEY) : null,
    },
  })
  console.log('IG webhook: raw preview', safeJsonPreview(rawBuffer, 1400))

  if (!verifySignature(rawBuffer, signature)) {
    console.warn('IG webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let payload: IgWebhookPayload | null = null
  try {
    payload = JSON.parse(rawBuffer.toString('utf8'))
  } catch (error) {
    console.error('Invalid JSON payload', error)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('IG webhook: parsed payload', {
    hasEntry: Boolean(payload?.entry?.length),
    object: payload?.object || null,
  })

  recordInstagramWebhook({ object: payload?.object || null })

  const entries = payload?.entry || []
  let processedCount = 0
  for (const entry of entries) {
    const messages = entry.messaging || []
    const changes = entry.changes || []
    const entryKeys = entry ? Object.keys(entry as any) : []
    console.log('IG webhook: entry summary', {
      id: entry?.id || null,
      time: entry?.time || null,
      keys: entryKeys,
      messagingCount: messages.length,
      changesCount: changes.length,
    })

    // Newer Instagram Webhooks format uses entry[].changes[].value.message
    for (const change of changes) {
      if (change.field !== 'messages') continue
      const senderId = change.value?.sender?.id
      const text = change.value?.message?.text?.trim()
      const media = extractMedia(change.value)
      const isEcho = Boolean(change.value?.message?.is_echo)
      if (isEcho) continue
      if (!senderId || (!text && media.length === 0)) {
        console.log('IG webhook: skipped change (no senderId/text or echo)', {
          field: change.field || null,
          senderId: senderId || null,
          recipientId: change.value?.recipient?.id || null,
          hasMessage: Boolean(change.value?.message),
          messageKeys: change.value?.message ? Object.keys(change.value.message) : [],
          isEcho,
        })
        continue
      }

      console.log('IG webhook: incoming message (changes)', { senderId, text: text ? clip(text, 200) : null, mediaCount: media.length })
      processedCount += 1
      recordInstagramWebhook({ senderId, textPreview: clip(text || '[media]', 120) })
      await handleIncomingMessage(senderId, text || '', media)
    }

    for (const msg of messages) {
      if (msg.message?.is_echo) continue
      const senderId = msg.sender?.id
      const text = msg.message?.text?.trim()
      const media = extractMedia(msg)
      if (!senderId || (!text && media.length === 0)) {
        console.log('IG webhook: skipped event (no senderId/text or echo)', {
          senderId: senderId || null,
          recipientId: msg.recipient?.id || null,
          hasMessage: Boolean(msg.message),
          messageKeys: msg.message ? Object.keys(msg.message) : [],
          isEcho: Boolean(msg.message?.is_echo),
        })
        continue
      }

      console.log('IG webhook: incoming message', { senderId, text: text ? clip(text, 200) : null, mediaCount: media.length })
      processedCount += 1
      recordInstagramWebhook({ senderId, textPreview: clip(text || '[media]', 120) })
      await handleIncomingMessage(senderId, text || '', media)
    }
  }
  if (processedCount === 0) {
    console.warn('IG webhook: no processable messages found in payload')
  }

  return NextResponse.json({ ok: true })
}

