import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createLead, getTenantProfile, hasRecentLeadByContact, listChannelConnections, resolveTenantAssistantRules } from '@/app/lib/storage'
import { ensureAllPackagesMentioned, isPackageCompareRequest } from '@/app/lib/packageGuard'
import {
  applyChannelLimits,
  applyNextSteps,
  applyNoPaymentPolicy,
  applyIncompleteDetailsFix,
  applyPilotNudge,
  applyServicesRouter,
  applyWebsiteOfferGuard,
  applyPackageGuidance,
  expandNumericChoiceFromRecentAssistant,
  detectAiIntent,
  detectChosenPackageFromHistory,
  detectChosenPackage,
  buildTemoWebFirstMessage,
  applyManagerInitiative,
  applyPackageFactsGuard,
  ensureCta,
  evaluateQuality,
  stripBannedTemplates,
  enforcePackageConsistency,
} from '@/app/lib/aiPostProcess'
import { recordMessengerPost, recordMessengerWebhook } from '../state'
import { appendMessage, getConversation, setConversationLang, updateConversationMeta } from '../conversationStore'
import { buildTemoWebSystemPrompt, computeReadinessScoreHeuristic, computeStageHeuristic } from '../../temowebPrompt'
import fs from 'fs'
import path from 'path'
import { startMessengerFollowupScheduler } from '../followupScheduler'
import { hitRateLimit } from '@/app/lib/apiRateLimit'
import { getRequestIdentity } from '@/app/lib/requestIdentity'

export const dynamic = 'force-dynamic'
export const revalidate = 0

startMessengerFollowupScheduler()

// Deduplicate incoming messages: Meta can deliver the same event multiple times.
const SEEN_MIDS_TTL_MS = 6 * 60 * 60 * 1000
const seenMids = new Map<string, number>() // key -> firstSeenAt

function markMidSeen(key: string) {
  const now = Date.now()
  seenMids.set(key, now)
  // Simple cleanup
  if (seenMids.size > 12000) {
    for (const [k, ts] of seenMids) {
      if (now - ts > SEEN_MIDS_TTL_MS) seenMids.delete(k)
    }
    // Still too big: drop oldest-ish
    if (seenMids.size > 12000) {
      const items = Array.from(seenMids.entries()).sort((a, b) => a[1] - b[1]).slice(0, 3000)
      for (const [k] of items) seenMids.delete(k)
    }
  }
}

function wasMidSeen(key: string) {
  const ts = seenMids.get(key)
  if (!ts) return false
  return Date.now() - ts <= SEEN_MIDS_TTL_MS
}

type MsgrMessagingEvent = {
  sender?: { id?: string }
  recipient?: { id?: string } // page id
  timestamp?: number
  message?: {
    mid?: string
    text?: string
    is_echo?: boolean
    attachments?: Array<{
      type?: string
      payload?: { url?: string }
    }>
  }
  postback?: { title?: string; payload?: string }
}

type MsgrWebhookPayload = {
  object?: string
  entry?: Array<{
    id?: string // page id
    time?: number
    messaging?: MsgrMessagingEvent[]
  }>
}

type ChannelConnection = {
  id: string
  tenantId: string
  channel: 'instagram' | 'whatsapp' | 'telegram' | 'website' | 'messenger'
  externalId: string | null
  meta?: Record<string, any> | null
  status: 'draft' | 'connected' | 'disabled'
}

const VERIFY_TOKEN = (process.env.MESSENGER_VERIFY_TOKEN || '').trim()
const APP_SECRET = (process.env.MESSENGER_APP_SECRET || process.env.INSTAGRAM_APP_SECRET || '').trim()
const SIGNATURE_BYPASS = (process.env.MESSENGER_SIGNATURE_BYPASS || '').trim() === 'true'

const API_HOST = (process.env.MESSENGER_API_HOST || 'graph.facebook.com').trim()
const API_VERSION = (process.env.MESSENGER_API_VERSION || 'v22.0').trim()

const DEFAULT_PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN || '').trim()
const IGNORE_ECHO = (process.env.MESSENGER_IGNORE_ECHO || 'true').trim() !== 'false'

const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim()
const TELEGRAM_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim()

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim()
const OPENAI_MODEL = (process.env.OPENAI_MODEL || 'gpt-4o').trim()
const OPENAI_MODEL_MESSENGER = (process.env.OPENAI_MODEL_MESSENGER || process.env.OPENAI_MODEL || 'gpt-4o').trim()
const OPENAI_TRANSCRIBE_MODEL = (process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1').trim()
const OPENAI_TRANSCRIBE_TIMEOUT_MS = Math.max(
  3000,
  Math.min(25_000, Number(process.env.OPENAI_TRANSCRIBE_TIMEOUT_MS || 12_000) || 12_000),
)

function getOpenAiKey(apiKey?: string | null) {
  return String(apiKey || OPENAI_API_KEY || '').trim()
}

async function fetchBinary(url: string, opts?: { pageAccessToken?: string }) {
  const u = String(url || '').trim()
  if (!u) return null
  try {
    const r1 = await fetch(u)
    if (r1.ok) return Buffer.from(await r1.arrayBuffer())
  } catch {
    // ignore
  }
  const token = String(opts?.pageAccessToken || '').trim()
  if (!token) return null
  try {
    const r2 = await fetch(u, { headers: { Authorization: `Bearer ${token}` } })
    if (!r2.ok) return null
    return Buffer.from(await r2.arrayBuffer())
  } catch {
    return null
  }
}

async function transcribeAudioFromUrl(params: { url: string; apiKey?: string | null; mime?: string | null; pageAccessToken?: string }) {
  const key = getOpenAiKey(params.apiKey)
  if (!key) return null
  const buf = await fetchBinary(params.url, { pageAccessToken: params.pageAccessToken })
  if (!buf) return null
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), OPENAI_TRANSCRIBE_TIMEOUT_MS)
  try {
    const form = new FormData()
    form.append('model', OPENAI_TRANSCRIBE_MODEL)
    const mime = params.mime && params.mime.includes('/') ? params.mime : 'audio/mpeg'
    // Blob types in TS don't accept Buffer directly; wrap in Uint8Array.
    form.append('file', new Blob([new Uint8Array(buf)], { type: mime }), 'audio.mp3')
    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: ac.signal,
    })
    if (!resp.ok) {
      const t = await resp.text().catch(() => '')
      console.error('OpenAI transcribe error (Messenger)', resp.status, t.slice(0, 200))
      return null
    }
    const json = (await resp.json().catch(() => ({}))) as any
    const text = typeof json?.text === 'string' ? json.text.trim() : null
    return text && text.length > 0 ? text : null
  } catch (e) {
    const msg = String((e as any)?.message || e)
    const aborted = msg.toLowerCase().includes('aborted') || msg.toLowerCase().includes('abort')
    console.error('Transcribe exception (Messenger)', { aborted, msg })
    return null
  } finally {
    clearTimeout(timer)
  }
}


function clip(text: string, max = 1000) {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function sanitizeMessengerText(input: string) {
  let t = String(input || '')
  // Remove control characters / zero-width / line separators that can break Meta rendering.
  t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  t = t.replace(/[\u2028\u2029\u200B-\u200F\uFEFF]/g, '')
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  t = t.replace(/\.{2,}$/g, '.')
  return t
}

function trimToLastCompleteSentence(text: string) {
  const t = String(text || '').trim()
  if (!t) return t
  if (/[.!?…]$/.test(t)) return t.replace(/\.{2,}$/g, '.')
  const m = t.match(/[\s\S]*[.!?…]/)
  if (m && typeof m[0] === 'string' && m[0].trim().length >= 40) return m[0].trim().replace(/\.{2,}$/g, '.')
  return t
}

function splitTextIntoParts(input: string, partMaxChars: number, maxParts: number) {
  const raw = sanitizeMessengerText(input || '')
  if (!raw) return []
  if (raw.length <= partMaxChars) return [raw]

  const parts: string[] = []
  let remaining = raw

  const pushPart = (p: string) => {
    const s = sanitizeMessengerText(p)
    if (s) parts.push(s)
  }

  const trySplitByParagraph = (text: string, max: number) => {
    const blocks = text.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean)
    if (blocks.length <= 1) return null
    const out: string[] = []
    let buf = ''
    for (const b of blocks) {
      const next = buf ? `${buf}\n\n${b}` : b
      if (next.length <= max) buf = next
      else {
        if (buf) out.push(buf)
        buf = b
      }
    }
    if (buf) out.push(buf)
    return out
  }

  while (remaining.length > 0 && parts.length < maxParts) {
    if (remaining.length <= partMaxChars) {
      pushPart(remaining)
      break
    }
    const chunks = trySplitByParagraph(remaining, partMaxChars)
    if (chunks && chunks.length > 0) {
      pushPart(chunks[0])
      remaining = chunks.slice(1).join('\n\n').trim()
      continue
    }
    const slice = remaining.slice(0, partMaxChars)
    const m = slice.match(/[\s\S]*[.!?…]\s/)
    if (m && m[0] && m[0].trim().length >= Math.min(120, Math.floor(partMaxChars * 0.35))) {
      pushPart(m[0].trim())
      remaining = remaining.slice(m[0].length).trim()
      continue
    }
    pushPart(slice.trim())
    remaining = remaining.slice(slice.length).trim()
  }

  if (remaining.length > 0 && parts.length >= maxParts) {
    const last = parts[parts.length - 1] || ''
    parts[parts.length - 1] = clip(last, Math.max(120, partMaxChars - 1))
  }

  return parts.filter(Boolean)
}

function ensureLeadsFile() {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function extractContact(text: string): { phone: string | null; email: string | null } {
  const t = String(text || '').trim()
  if (!t) return { phone: null, email: null }
  const email = (() => {
    const m = t.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
    return m ? m[0].trim() : null
  })()
  const phone = (() => {
    const m = t.match(/(\+?\d[\d\s().-]{7,}\d)/)
    if (!m) return null
    const raw = m[1]
    const digits = raw.replace(/[^\d+]/g, '')
    const normalized = digits.startsWith('+') ? digits : `+${digits.replace(/^\+/, '')}`
    // minimal sanity
    const len = normalized.replace(/[^\d]/g, '').length
    if (len < 9) return null
    return normalized
  })()
  return { phone, email }
}

async function generateLeadAiSummary(input: { lang: 'ru' | 'ua'; contact: string; clientMessages: string[] }) {
  if (!OPENAI_API_KEY) return null
  const langLine = input.lang === 'ua' ? 'Пиши українською.' : 'Пиши по‑русски.'
  const payload = {
    source: 'messenger',
    contact: input.contact,
    channel: 'Messenger',
    clientMessages: input.clientMessages.slice(0, 20),
  }
  try {
    const modelRaw = String(OPENAI_MODEL_MESSENGER || process.env.OPENAI_MODEL || 'gpt-4o')
    const model = modelRaw.trim().replace(/[‐‑‒–—−]/g, '-')
    const modelLower = model.toLowerCase()
    const messages = [
      {
        role: 'system',
        content: [
          langLine,
          'Сделай короткое, ПРАВДИВОЕ резюме лида для CRM (ничего не выдумывать).',
          'Формат: 5–8 строк, каждая начинается с эмодзи: 🏷 🎯 🧩 ⛔️ ➡️ 💬',
          'Если данных нет — пиши “не уточнили”. Без markdown (#, **).',
        ].join(' '),
      },
      { role: 'user', content: JSON.stringify(payload) },
    ]

    // Use Chat Completions. For gpt-5 use `max_completion_tokens` and avoid non-default temperature.
    const isGpt5 = modelLower.startsWith('gpt-5') || modelLower.startsWith('gpt5')
    const maxKey = isGpt5 ? 'max_completion_tokens' : 'max_tokens'
    const body: any = { model, messages }
    if (!isGpt5) body.temperature = 0.2
    body[maxKey] = 260

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify(body),
    })
    if (!resp.ok) return null
    const json = (await resp.json().catch(() => ({}))) as any
    const content =
      typeof json?.output_text === 'string'
        ? json.output_text
        : typeof json?.choices?.[0]?.message?.content === 'string'
          ? json.choices[0].message.content
          : null
    const s = typeof content === 'string' ? content.trim() : ''
    return s ? s.slice(0, 1200) : null
  } catch {
    return null
  }
}

async function saveLeadFromMessenger(input: {
  tenantId: string
  pageId: string
  senderId: string
  contact: string
  lang: 'ru' | 'ua'
  lastMessage: string
  clientMessages: string[]
  aiSummary: string | null
}) {
  ensureLeadsFile()
  // de-dupe: same contact within last 24h
  const exists = await hasRecentLeadByContact({ contact: input.contact, source: 'messenger', withinMs: 24 * 60 * 60 * 1000 })
  if (exists) return null

  const newLead = {
    id: Date.now(),
    tenantId: input.tenantId,
    name: null,
    contact: input.contact,
    email: input.contact.includes('@') ? input.contact : null,
    businessType: null,
    channel: 'Messenger',
    pain: null,
    question: input.lastMessage || null,
    clientMessages: input.clientMessages.slice(0, 20),
    aiRecommendation: null,
    aiSummary: input.aiSummary,
    source: 'messenger',
    lang: input.lang,
    notes: `pageId: ${input.pageId}; senderId: ${input.senderId}`,
    createdAt: new Date().toISOString(),
    status: 'new',
  }
  const saved = await createLead(newLead)
  return saved?.id as number
}

async function sendTelegramLeadMessenger(input: { leadId: number | null; tenantId: string; pageId: string; senderId: string; contact: string; aiSummary: string | null; lastMessage: string }) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false
  const parts = [
    '📥 НОВА ЗАЯВКА З MESSENGER',
    '',
    input.leadId != null ? `🆔 Lead ID: ${input.leadId}` : null,
    `🏢 tenant: ${input.tenantId}`,
    `📄 pageId: ${input.pageId}`,
    `🧾 senderId: ${input.senderId}`,
    `☎️ контакт: ${input.contact || '—'}`,
    '',
    input.aiSummary ? ['🧠 Резюме (AI):', clip(input.aiSummary, 1200), ''].join('\n') : null,
    '🗣 Повідомлення клієнта:',
    `— ${clip(input.lastMessage, 800)}`,
    '',
    `🕒 Час: ${new Date().toISOString()}`,
  ].filter(Boolean)
  const text = parts.join('\n')
  const retryMs = [0, 350, 1200]
  try {
    for (let i = 0; i < retryMs.length; i += 1) {
      if (retryMs[i]) await new Promise((r) => setTimeout(r, retryMs[i]))
      const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
      })
      if (resp.ok) return true
    }
    return false
  } catch {
    return false
  }
}

function normalizeAnswer(text: string) {
  let out = text
  out = out.replace(/\*\*/g, '')
  out = out.replace(/\*(?=\S)/g, '')
  out = out.replace(/(^|\n)\s*#{1,6}\s+/g, '$1')
  out = out.replace(/(^|\n)\s*\*\s+/g, '$1— ')
  out = out.replace(/\n{3,}/g, '\n\n')
  return out.trim()
}

function enforceSingleQuestion(text: string) {
  const out = String(text || '')
  const qs = (out.match(/\?/g) || []).length
  if (qs <= 1) return out
  let remaining = 1
  const chars = out.split('')
  for (let i = chars.length - 1; i >= 0; i -= 1) {
    if (chars[i] === '?') {
      if (remaining > 0) remaining -= 1
      else chars[i] = '.'
    }
  }
  return chars.join('')
}

function parseLangSwitch(text: string): 'ru' | 'ua' | null {
  const t = String(text || '').trim().toLowerCase()
  if (!t) return null
  if (/(говори|говорите|разговаривай|пиши|пишіть|пиши)\s+.*(рус|рос|russian)/i.test(t)) return 'ru'
  if (/(говори|говорите|разговаривай|розмовляй|пиши|пишіть|пиши)\s+.*(укр|укра|ukrain)/i.test(t)) return 'ua'
  if (/\bрус(ский|ском)\b/i.test(t)) return 'ru'
  if (/\bукра(їнськ|инск|їнською)\b/i.test(t)) return 'ua'
  return null
}

function verifySignature(rawBody: Buffer, signatureHeader: string | null) {
  if (SIGNATURE_BYPASS) {
    console.warn('MESSENGER_SIGNATURE_BYPASS=true; signature verification skipped')
    return true
  }
  if (!APP_SECRET) {
    console.warn('MESSENGER_APP_SECRET is missing; signature verification skipped')
    return true
  }
  const header = signatureHeader?.trim()
  if (!header) return false
  if (!header.startsWith('sha256=')) return false
  const expected = `sha256=${crypto.createHmac('sha256', APP_SECRET).update(rawBody).digest('hex')}`
  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(header)
  if (expectedBuf.length !== actualBuf.length) return false
  try {
    return crypto.timingSafeEqual(expectedBuf, actualBuf)
  } catch {
    return false
  }
}

async function generateAiReply(userText: string, opts?: { lang?: 'ru' | 'ua' }) {
  if (!OPENAI_API_KEY) {
    return 'Принято. Напишите нишу и где приходят заявки — покажу схему и следующие шаги.'
  }
  const lang = opts?.lang === 'ru' ? 'ru' : 'ua'
  const userTurns = 1
  const readinessScore = computeReadinessScoreHeuristic(userText, userTurns)
  const system = buildTemoWebSystemPrompt({
    lang,
    channel: 'messenger',
    stage: computeStageHeuristic(userText, readinessScore),
    readinessScore,
  })
  let model = String(OPENAI_MODEL_MESSENGER || process.env.OPENAI_MODEL || 'gpt-4o')
    .trim()
    .replace(/[‐‑‒–—−]/g, '-')
  let modelLower = model.toLowerCase()
  // Speed/stability: if gpt-5 is configured for Messenger, use a fast fallback unless explicitly overridden.
  if (modelLower.startsWith('gpt-5') || modelLower.startsWith('gpt5')) {
    const fb = String(process.env.OPENAI_MODEL_MESSENGER_FALLBACK || 'gpt-4o').trim().replace(/[‐‑‒–—−]/g, '-')
    model = fb || model
    modelLower = model.toLowerCase()
  }
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: userText },
  ]

  // Use Chat Completions. For gpt-5 use `max_completion_tokens` and avoid non-default temperature.
  const isGpt5 = modelLower.startsWith('gpt-5') || modelLower.startsWith('gpt5')
  const maxKey = isGpt5 ? 'max_completion_tokens' : 'max_tokens'
  const body: any = { model, messages }
  if (!isGpt5) body.temperature = 0.7
  body[maxKey] = 360

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    console.error('OpenAI error (Messenger)', resp.status, t.slice(0, 300))
    return 'Ок. Напишите нишу и 1 главную боль — я сразу предложу схему автоматизации и ориентир по цене.'
  }
  const j = (await resp.json().catch(() => ({}))) as any
  const cc = j?.choices?.[0]?.message?.content
  const content =
    typeof j?.output_text === 'string'
      ? j.output_text
      : typeof cc === 'string'
        ? cc
        : Array.isArray(cc)
          ? cc
              .map((p: any) =>
                typeof p === 'string' ? p : typeof p?.text === 'string' ? p.text : typeof p?.text?.value === 'string' ? p.text.value : '',
              )
              .filter(Boolean)
              .join('')
          : null
  const finishReason = j?.choices?.[0]?.finish_reason
  const cleaned = typeof content === 'string' ? normalizeAnswer(content) : ''
  const guarded = enforceSingleQuestion(cleaned)
  let out = guarded || ''
  if (finishReason === 'length') out = trimToLastCompleteSentence(out)
  out = sanitizeMessengerText(out)
  // Do NOT clip here; sending layer will split into multiple messages.
  return out ? out : 'Ок. Напишите нишу и боль — я предложу схему и цену.'
}

async function generateAiReplyWithHistory(input: {
  userText: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  lang: 'ru' | 'ua'
  images?: string[]
  apiKey?: string | null
  pageAccessToken?: string
  extraRules?: string[]
}) {
  const userText = input.userText
  const apiKey = (input.apiKey || OPENAI_API_KEY || '').trim()
  if (!apiKey) return generateAiReply(userText, { lang: input.lang })
  const hist = Array.isArray(input.history) ? input.history : []
  const lastUser = userText
  const lang = input.lang
  const userTurns = hist.filter((m) => m.role === 'user').length || 1
  const readinessScore = computeReadinessScoreHeuristic(lastUser, userTurns)
  const stage = computeStageHeuristic(lastUser, readinessScore)
  const intent = detectAiIntent(lastUser || '')
  const supportRules = intent.isSupport
    ? [
        lang === 'ua'
          ? 'SUPPORT MODE: користувач має проблему або вже налаштовану систему. Перейдіть у режим підтримки. Питайте: канал, що саме зламалось, коли почалось. Не продавайте пакети.'
          : 'SUPPORT MODE: клиент сообщает о проблеме или уже подключенной системе. Перейдите в режим поддержки. Спросите: канал, что сломалось, когда началось. Не продавайте пакеты.',
      ]
    : []
  const tenantRules = Array.isArray(input.extraRules) ? input.extraRules : []
  const system = buildTemoWebSystemPrompt({ lang, channel: 'messenger', stage, readinessScore, extraRules: [...tenantRules, ...supportRules] })
  const isFirstAssistant = hist.filter((m) => m.role === 'assistant').length === 0
  const firstMsgRule = isFirstAssistant
    ? lang === 'ua'
      ? 'Це перше повідомлення: представтесь як "персональний AI‑асистент TemoWeb". Питай максимум 1 питання.'
      : 'Это первое сообщение: представьтесь как "персональный AI‑ассистент TemoWeb". Задай максимум 1 вопрос.'
    : null

  async function prepareImagesForOpenAI(urls: string[]) {
    const out: string[] = []
    for (let i = 0; i < Math.min(urls.length, 2); i += 1) {
      const u = String(urls[i] || '').trim()
      if (!u) continue
      const buf = await fetchBinary(u, { pageAccessToken: input.pageAccessToken })
      if (buf && buf.length > 0 && buf.length <= 900_000) {
        out.push(`data:image/jpeg;base64,${buf.toString('base64')}`)
      } else {
        out.push(u)
      }
    }
    for (let i = out.length; i < Math.min(urls.length, 3); i += 1) {
      const u = String(urls[i] || '').trim()
      if (u) out.push(u)
    }
    return out
  }

  const imagesRaw = Array.isArray(input.images) ? input.images.filter(Boolean).slice(0, 3) : []
  const images = await prepareImagesForOpenAI(imagesRaw)
  const userContent =
    images.length > 0
      ? ([
          { type: 'text', text: userText || (lang === 'ua' ? '[Надіслано зображення]' : '[Отправлено изображение]') },
          ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
        ] as any)
      : userText

  let model = String(OPENAI_MODEL_MESSENGER || process.env.OPENAI_MODEL || 'gpt-4o')
    .trim()
    .replace(/[‐‑‒–—−]/g, '-')
  let modelLower = model.toLowerCase()
  // Speed/stability: if gpt-5 is configured for Messenger, use a fast fallback unless explicitly overridden.
  if (modelLower.startsWith('gpt-5') || modelLower.startsWith('gpt5')) {
    const fb = String(process.env.OPENAI_MODEL_MESSENGER_FALLBACK || 'gpt-4o').trim().replace(/[‐‑‒–—−]/g, '-')
    model = fb || model
    modelLower = model.toLowerCase()
  }
  const messages: any[] = [
    { role: 'system', content: system },
    ...(firstMsgRule ? [{ role: 'system', content: firstMsgRule }] : []),
    ...hist.slice(-16),
    { role: 'user', content: userContent },
  ]
  const toInputContent = (v: any) => {
    if (typeof v === 'string') return v
    try {
      return JSON.stringify(v)
    } catch {
      return String(v || '')
    }
  }

  // Use Chat Completions. For gpt-5 use `max_completion_tokens` and avoid non-default temperature.
  const isGpt5 = modelLower.startsWith('gpt-5') || modelLower.startsWith('gpt5')
  const maxKey = isGpt5 ? 'max_completion_tokens' : 'max_tokens'
  const body: any = { model, messages }
  if (!isGpt5) body.temperature = 0.7
  body[maxKey] = 360

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    console.error('OpenAI error (Messenger/history)', resp.status, t.slice(0, 300))
    return generateAiReply(userText, { lang })
  }
  const j = (await resp.json().catch(() => ({}))) as any
  const content =
    typeof j?.output_text === 'string' ? j.output_text : typeof j?.choices?.[0]?.message?.content === 'string' ? j.choices[0].message.content : null
  const finishReason = j?.choices?.[0]?.finish_reason
  const cleaned = typeof content === 'string' ? normalizeAnswer(content) : ''
  const guarded = enforceSingleQuestion(cleaned)
  let out = guarded || ''
  if (finishReason === 'length') out = trimToLastCompleteSentence(out)
  out = sanitizeMessengerText(out)
  // Do NOT clip here; sending layer will split into multiple messages.
  return out ? out : 'Ок. Напишите нишу и боль — я предложу схему и цену.'
}

async function sendMessengerText(opts: { pageAccessToken: string; recipientId: string; text: string }) {
  const token = (opts.pageAccessToken || '').trim()
  if (!token) {
    console.error('Missing Messenger page access token (meta.pageAccessToken or MESSENGER_PAGE_ACCESS_TOKEN)')
    return
  }
  const url = `https://${API_HOST}/${API_VERSION}/me/messages?access_token=${encodeURIComponent(token)}`
  const parts = splitTextIntoParts(opts.text, 1650, 30)
  if (!parts.length) return

  for (let i = 0; i < parts.length; i += 1) {
    const body = {
      messaging_type: 'RESPONSE',
      recipient: { id: opts.recipientId },
      message: { text: clip(parts[i], 1800) },
    }
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!resp.ok) {
      const t = await resp.text().catch(() => '')
      console.error('Messenger send error', resp.status, t.slice(0, 500))
      break
    }
    // Log response ids to confirm delivery target (no token leakage).
    try {
      const j = (await resp.json().catch(() => null)) as any
      if (j && (j.message_id || j.recipient_id)) {
        console.log('Messenger send ok (meta)', {
          recipientIdLast4: opts.recipientId.slice(-4),
          recipient_id_last4: typeof j.recipient_id === 'string' ? j.recipient_id.slice(-4) : null,
          message_id_last6: typeof j.message_id === 'string' ? j.message_id.slice(-6) : null,
        })
      }
    } catch {
      // ignore
    }
    if (i < parts.length - 1) await new Promise((r) => setTimeout(r, 160))
  }
  console.log('Messenger send ok', { recipientIdLast4: opts.recipientId.slice(-4), api: `${API_HOST}/${API_VERSION}`, parts: parts.length })
}

async function findMessengerConnection(pageId: string): Promise<ChannelConnection | null> {
  const all = (await listChannelConnections()) as ChannelConnection[]
  const pid = String(pageId || '').trim()
  if (!pid) return null
  return (
    all.find((c) => {
      if (c.channel !== 'messenger') return false
      const ext = String(c.externalId || '').trim()
      if (ext && ext === pid) return true
      const meta: any = c.meta || {}
      const metaPid = String(meta.pageId || meta.page_id || meta.page || '').trim()
      return metaPid ? metaPid === pid : false
    }) || null
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = (searchParams.get('hub.verify_token') || '').trim()
  const challenge = searchParams.get('hub.challenge')

  console.log('Messenger webhook: verify attempt', {
    mode,
    tokenLen: token.length,
    tokenPrefix: token ? token.slice(0, 4) : null,
    tokenSuffix: token ? token.slice(-4) : null,
    hasChallenge: Boolean(challenge),
  })

  if (mode === 'subscribe' && token && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }
  return NextResponse.json(
    {
      error: 'Invalid verify token',
      hint: 'Ensure Meta "Verify token" matches MESSENGER_VERIFY_TOKEN exactly (including dots/spaces).',
    },
    { status: 403, headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(request: NextRequest) {
  const rl = await hitRateLimit({
    scope: 'messenger_webhook',
    identity: getRequestIdentity(request),
    windowSec: 60,
    limit: Number(process.env.RATE_LIMIT_MESSENGER_WEBHOOK_PER_MIN || 600),
  })
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } })
  }
  const rawBuffer = Buffer.from(await request.arrayBuffer())
  const signature = request.headers.get('x-hub-signature-256')

  console.log('Messenger webhook: received', { hasSignature: Boolean(signature), length: rawBuffer.length })
  recordMessengerPost({ length: rawBuffer.length, hasSignature: Boolean(signature), result: null, note: null })
  if (!verifySignature(rawBuffer, signature)) {
    console.warn('Messenger webhook: invalid signature')
    recordMessengerPost({ length: rawBuffer.length, hasSignature: Boolean(signature), result: 'invalid_signature', note: 'Signature verification failed' })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let payload: MsgrWebhookPayload | null = null
  try {
    payload = JSON.parse(rawBuffer.toString('utf8'))
  } catch (e) {
    console.error('Messenger webhook: invalid JSON', e)
    recordMessengerPost({ length: rawBuffer.length, hasSignature: Boolean(signature), result: 'invalid_json', note: 'JSON parse failed' })
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const entries = payload?.entry || []
  if (!entries.length) recordMessengerPost({ length: rawBuffer.length, hasSignature: Boolean(signature), result: 'no_entries', note: `object=${String(payload?.object || '')}` })
  for (const entry of entries) {
    const pageId = String(entry?.id || '').trim()
    const events = entry?.messaging || []
    if (!events.length) recordMessengerPost({ length: rawBuffer.length, hasSignature: Boolean(signature), result: 'no_events', note: `pageId=${pageId || '—'}` })
    for (const ev of events) {
      const senderId = String(ev?.sender?.id || '').trim()
      const msgText = ev?.message?.text?.trim() || null
      const mid = String(ev?.message?.mid || '').trim()
      const attachments = Array.isArray(ev?.message?.attachments) ? ev.message!.attachments : []
      const imageUrls = attachments
        .filter((a) => (a?.type || '').toLowerCase() === 'image')
        .map((a) => String(a?.payload?.url || '').trim())
        .filter(Boolean)
      const audioUrls = attachments
        .filter((a) => {
          const t = String(a?.type || '').toLowerCase()
          return t === 'audio' || t === 'voice' || t === 'video'
        })
        .map((a) => String(a?.payload?.url || '').trim())
        .filter(Boolean)
      const isEcho = Boolean(ev?.message?.is_echo)

      const preview = msgText ? clip(msgText, 120) : imageUrls.length ? '[image]' : audioUrls.length ? '[audio]' : null
      recordMessengerWebhook({ pageId: pageId || null, senderId: senderId || null, textPreview: preview })

      if (!senderId) continue
      if (IGNORE_ECHO && isEcho) continue
      if (!msgText && !imageUrls.length && !audioUrls.length) continue

      if (mid) {
        const dedupeKey = `${pageId}:${senderId}:${mid}`
        if (wasMidSeen(dedupeKey)) {
          console.log('Messenger webhook: duplicate mid ignored', { pageId, senderIdLast4: senderId.slice(-4), mid })
          continue
        }
        markMidSeen(dedupeKey)
      }

      const conn = pageId ? await findMessengerConnection(pageId) : null
      const status = conn?.status || 'draft'
      if (status === 'disabled') {
        console.log('Messenger webhook: connection disabled; ignoring message', { pageId, senderIdLast4: senderId.slice(-4) })
        recordMessengerPost({ length: rawBuffer.length, hasSignature: Boolean(signature), result: 'ignored', note: `disabled pageId=${pageId || '—'}` })
        continue
      }

      const pageAccessToken = String(conn?.meta?.pageAccessToken || DEFAULT_PAGE_ACCESS_TOKEN || '').trim()
      if (!pageAccessToken) {
        console.error('Messenger webhook: missing page access token', { pageId, hasConn: Boolean(conn) })
        continue
      }

      console.log('Messenger webhook: incoming', {
        pageId,
        senderIdLast4: senderId.slice(-4),
        text: msgText ? clip(msgText, 200) : null,
        imageCount: imageUrls.length,
        audioCount: audioUrls.length,
      })
      const conv = await getConversation(pageId, senderId)
      const explicitLang = parseLangSwitch(msgText || '')
      const baseTextForLang = String(msgText || '').trim()
      const inferredLang: 'ru' | 'ua' = /[іїєґ]/i.test(baseTextForLang) ? 'ua' : 'ru'
      if (explicitLang) await setConversationLang(pageId, senderId, explicitLang)
      if (!explicitLang && !conv.lang && baseTextForLang) await setConversationLang(pageId, senderId, inferredLang)
      const preferredLang = explicitLang || conv.lang || (baseTextForLang ? inferredLang : 'ua')
      const tenantProfile = conn?.tenantId ? await getTenantProfile(String(conn.tenantId)).catch(() => null) : null
      const tenantExtraRules = conn?.tenantId ? await resolveTenantAssistantRules(String(conn.tenantId)).catch(() => []) : []
      const apiKey = tenantProfile && typeof (tenantProfile as any).openAiKey === 'string' ? String((tenantProfile as any).openAiKey).trim() : null

      const audioUrl = audioUrls[0] || null
      const transcript = audioUrl ? await transcribeAudioFromUrl({ url: audioUrl, apiKey, pageAccessToken }) : null
      const baseText = (msgText || '').trim()
      const composedUserText =
        transcript && transcript.trim()
          ? baseText
            ? `${baseText}\n\n[Voice message transcript]: ${transcript.trim()}`
            : `[Voice message transcript]: ${transcript.trim()}`
          : baseText || (imageUrls.length ? (preferredLang === 'ua' ? '[Надіслано зображення]' : '[Отправлено изображение]') : audioUrl ? '[Voice message]' : '')

      // Media burst buffering: store images for the next meaningful turn.
      const now = Date.now()
      const prevPending: string[] = Array.isArray((conv as any).pendingImageUrls) ? ((conv as any).pendingImageUrls as any[]).map(String) : []
      const lastMediaAtIso = typeof (conv as any).lastMediaAt === 'string' ? String((conv as any).lastMediaAt) : ''
      const lastMediaAt = lastMediaAtIso ? Date.parse(lastMediaAtIso) : NaN
      const pendingFresh = Number.isFinite(lastMediaAt) && now - lastMediaAt < 10 * 60 * 1000 ? prevPending : []
      const pendingAll = [...pendingFresh, ...imageUrls].filter(Boolean)
      const pendingDedup = Array.from(new Set(pendingAll)).slice(0, 6)
      if (pendingDedup.length > 0) {
        await updateConversationMeta(pageId, senderId, { pendingImageUrls: pendingDedup, lastMediaAt: new Date().toISOString() })
      }

      await appendMessage(pageId, senderId, { role: 'user', content: composedUserText })
      const history = (conv.messages || []).slice(-14).map((m) => ({ role: m.role, content: m.content }))

      // Lead capture: if user sent phone/email -> save lead to CRM and notify Telegram.
      const contactDraft = extractContact(baseText || '')
      const contact = (contactDraft.email || contactDraft.phone || '').trim()
      if (contact && conn?.tenantId) {
        const clientMessages = [composedUserText, ...history.filter((m) => m.role === 'user').map((m) => m.content)]
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .slice(0, 20)
        const aiSummary = await generateLeadAiSummary({ lang: preferredLang, contact, clientMessages })
        const leadId = await saveLeadFromMessenger({
          tenantId: String(conn.tenantId),
          pageId,
          senderId,
          contact,
          lang: preferredLang,
          lastMessage: composedUserText || '[message]',
          clientMessages,
          aiSummary,
        })
        await sendTelegramLeadMessenger({
          leadId,
          tenantId: String(conn.tenantId),
          pageId,
          senderId,
          contact,
          aiSummary,
          lastMessage: composedUserText || '[message]',
        })
        const okMsg =
          preferredLang === 'ua'
            ? 'Готово ✅ Зафіксував заявку. Напишемо/зателефонуємо для наступного кроку.'
            : 'Готово ✅ Зафиксировал заявку. Напишем/созвонимся для следующего шага.'
        await sendMessengerText({ pageAccessToken, recipientId: senderId, text: okMsg })
        await appendMessage(pageId, senderId, { role: 'assistant', content: okMsg })
        await updateConversationMeta(pageId, senderId, { leadCapturedAt: new Date().toISOString(), followUpSentAt: new Date().toISOString(), pendingImageUrls: [], lastMediaAt: null })
        recordMessengerPost({ length: rawBuffer.length, hasSignature: Boolean(signature), result: 'ok', note: `lead_saved tenant=${String(conn.tenantId)} leadId=${leadId ?? 'dup'}` })
        continue
      }

      const recentAssistantTextsForChoice = history
        .filter((m) => m.role === 'assistant')
        .slice(-6)
        .map((m) => String(m.content || ''))
      const effectiveUserText = expandNumericChoiceFromRecentAssistant({
        userText: composedUserText || '',
        lang: preferredLang,
        recentAssistantTexts: recentAssistantTextsForChoice,
      })

      // Hard requirement: first assistant message is a fixed intro.
      const hasAnyAssistant = history.some((m) => m.role === 'assistant')
      if (!hasAnyAssistant) {
        const intro = buildTemoWebFirstMessage(preferredLang === 'ru' ? 'ru' : 'ua')
        await sendMessengerText({ pageAccessToken, recipientId: senderId, text: intro })
        await appendMessage(pageId, senderId, { role: 'assistant', content: intro })
        recordMessengerPost({ length: rawBuffer.length, hasSignature: Boolean(signature), result: 'ok', note: `intro_sent pageId=${pageId || '—'}` })
        // Do NOT return: after intro we still answer the user's first message (text or voice).
      }

      // If user only sends images (no text/voice), acknowledge once and wait for a clarifying line.
      if (!baseText && !transcript && pendingDedup.length > 0) {
        const lastAssistantAt = [...(conv.messages || [])].reverse().find((m) => m.role === 'assistant')?.at || null
        const lastAssistantMs = lastAssistantAt ? Date.parse(String(lastAssistantAt)) : NaN
        if (!Number.isFinite(lastAssistantMs) || now - lastAssistantMs > 2 * 60 * 1000) {
          const ack =
            preferredLang === 'ua'
              ? `Бачу ${pendingDedup.length} фото ✅ Напишіть одним рядком, що саме перевірити/порадити (і можете докинути ще фото, якщо треба).`
              : `Вижу ${pendingDedup.length} фото ✅ Напишите одним рядком, что именно проверить/подсказать (и можете докинуть ещё фото, если надо).`
          await sendMessengerText({ pageAccessToken, recipientId: senderId, text: ack })
          await appendMessage(pageId, senderId, { role: 'assistant', content: ack })
        }
        recordMessengerPost({ length: rawBuffer.length, hasSignature: Boolean(signature), result: 'ok', note: `images_only buffered=${pendingDedup.length}` })
        continue
      }

      const imagesForAi = pendingDedup.slice(0, 3)
      let reply = await generateAiReplyWithHistory({
        userText: effectiveUserText || '',
        history,
        lang: preferredLang,
        images: imagesForAi,
        apiKey,
        pageAccessToken,
        extraRules: tenantExtraRules,
      })
      const intent = detectAiIntent(effectiveUserText || '')
      const userTurns = history.filter((m) => m.role === 'user').length || 1
      const readinessScore = computeReadinessScoreHeuristic(effectiveUserText || '', userTurns)
      const hasContactAlready =
        history.some((m) => m.role === 'user' && /\S+@\S+\.\S+/.test(m.content)) ||
        history.some((m) => m.role === 'user' && /(\+?\d[\d\s().-]{7,}\d)/.test(m.content)) ||
        history.some((m) => m.role === 'user' && /(^|\s)@([a-zA-Z0-9_]{4,32})\b/.test(m.content))
      const contactAskedRecently = recentAssistantTextsForChoice.some((t) =>
        /\b(телефон|email|почт|контакт|скиньте|надішліть|залиште)\b/i.test(String(t || '')),
      )
      let stage = computeStageHeuristic(effectiveUserText || '', readinessScore)
      if (!hasContactAlready && userTurns >= 6 && !contactAskedRecently && !intent.isSupport) stage = 'ASK_CONTACT'
      const hasChosenPackage = Boolean(detectChosenPackage(effectiveUserText || '') || detectChosenPackageFromHistory(history))
      if (!hasChosenPackage && isPackageCompareRequest(baseText || '')) {
        reply = ensureAllPackagesMentioned(reply, preferredLang === 'ru' ? 'ru' : 'ua')
      }
      if (preferredLang === 'ru' || preferredLang === 'ua') {
        if (!intent.isSupport) {
          reply = applyServicesRouter(reply, preferredLang, intent, hasChosenPackage)
          reply = applyWebsiteOfferGuard({ text: reply, lang: preferredLang, intent, userText: effectiveUserText || msgText || '' })
          reply = applyPackageGuidance({ text: reply, lang: preferredLang, intent, recentAssistantTexts: recentAssistantTextsForChoice })
          reply = enforcePackageConsistency({
            reply,
            lang: preferredLang,
            userText: effectiveUserText || '',
            recentAssistantTexts: recentAssistantTextsForChoice,
          })
          reply = applyIncompleteDetailsFix(reply, preferredLang)
          reply = applyPilotNudge(reply, preferredLang, intent)
          reply = applyNoPaymentPolicy(reply, preferredLang)
          reply = applyPackageFactsGuard(reply, preferredLang)
          reply = applyManagerInitiative({
            text: reply,
            lang: preferredLang,
            stage,
            intent,
            userText: effectiveUserText || msgText || '',
          })
          reply = ensureCta(reply, preferredLang, stage, readinessScore, intent)
          const recentAssistantTexts = history
            .filter((m) => m.role === 'assistant')
            .slice(-3)
            .map((m) => String(m.content || ''))
          const recentUserTexts = history
            .filter((m) => m.role === 'user')
            .slice(-3)
            .map((m) => String(m.content || ''))
          reply = applyNextSteps({
            text: reply,
            lang: preferredLang,
            stage,
            readinessScore,
            intent,
            hasChosenPackage,
            recentAssistantTexts,
            recentUserTexts,
          })
        }
        reply = stripBannedTemplates(reply)
        reply = applyChannelLimits(reply, 'messenger')
        const quality = evaluateQuality(reply, preferredLang, intent, 'messenger')
        if (quality.missingPackages || quality.missingAddons || quality.tooLong || quality.noCta) {
          console.warn('Messenger AI quality flags', { quality, lang: preferredLang })
        }
      }
      await sendMessengerText({ pageAccessToken, recipientId: senderId, text: reply })
      await appendMessage(pageId, senderId, { role: 'assistant', content: reply })
      if (pendingDedup.length > 0) await updateConversationMeta(pageId, senderId, { pendingImageUrls: [], lastMediaAt: null })
      recordMessengerPost({ length: rawBuffer.length, hasSignature: Boolean(signature), result: 'ok', note: `replied pageId=${pageId || '—'}` })
    }
  }

  return NextResponse.json({ ok: true })
}

