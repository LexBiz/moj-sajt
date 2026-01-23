import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { recordInstagramWebhook } from '../state'
import { readTokenFile } from '../oauth/_store'
import { getConversation, updateConversation } from '../conversationStore'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type IgWebhookMessage = {
  sender?: { id?: string }
  recipient?: { id?: string }
  message?: { text?: string; is_echo?: boolean }
}

type IgWebhookChangeValue = {
  sender?: { id?: string }
  recipient?: { id?: string }
  timestamp?: number
  message?: { mid?: string; text?: string; is_echo?: boolean }
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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
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

function detectBookingIntent(text: string) {
  return /(запис|запиш|брон|бронь|встреч|созвон|консультац|демо|demo|call|appointment)/i.test(text)
}

function detectLeadIntent(text: string) {
  return /(купит|цена|стоим|пакет|сколько|интерес|нужно|хочу|подключ|заказ|демо|созвон|запис)/i.test(text)
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

function buildSystemPrompt(stage: string, history: Array<{ role: string; content: string }>) {
  const lastTurns = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Клиент' : 'Бот'}: ${clip(m.content, 220)}`)
    .join(' | ')
  return [
    'Ты — AI-ассистент по внедрению систем автоматизации заявок.',
    'Стиль: профессионально, уверенно, дружелюбно, без агрессии.',
    'Цель: помочь клиенту и мягко довести до заявки.',
    'Всегда пишешь живо, с эмодзи и чёткой пунктуацией.',
    'Используй короткие блоки, разделяй смысл линиями/разделителями.',
    'Не используй markdown-звёздочки; можно использовать переносы строк и символы вроде "—".',
    'Если спрашивают цену/сроки/пакеты — отвечай прямо, кратко и по делу.',
    'Если нужно задать вопрос — один конкретный вопрос.',
    'НЕ проси контактные данные, пока стадия не ask_contact.',
    `Текущая стадия диалога: ${stage}.`,
    `Последние фразы: ${lastTurns || 'нет истории'}.`,
    'Знания:',
    '- Запуск: обычно 3–7 дней (пилот), сложные интеграции 10–14 дней.',
    '- Пакеты: 600–900 €, 1200–1500 €, 2000–3000 €.',
    '- Пилот: полный пакет за $299 (5 мест).',
  ].join(' ')
}

async function generateAiReply(userText: string, stage: string, history: Array<{ role: string; content: string }>) {
  if (!OPENAI_API_KEY) {
    return 'Привет! 👋 Дай 1–2 детали: какой бизнес и откуда приходят заявки — покажу, как это автоматизируем. 🚀'
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt(stage, history) },
        { role: 'user', content: userText },
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
    return 'Я на связи ✅ Напиши коротко: ниша + источник заявок — и я покажу решение. ✍️'
  }

  const json = (await response.json()) as any
  const content = json?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    return 'Дай 1–2 детали по бизнесу, и я соберу решение. 💡'
  }
  return clip(content.trim(), 1000)
}

function ensureLeadsFile() {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, JSON.stringify([]))
}

function saveLeadFromInstagram(input: {
  senderId: string
  contact: { type: 'email' | 'phone' | 'telegram'; value: string }
  clientMessages: string[]
  lastMessage: string
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
    aiSummary: null,
    source: 'instagram',
    lang: 'ru',
    notes: `senderId: ${input.senderId} | contactType: ${input.contact.type}`,
    createdAt: new Date().toISOString(),
    status: 'new',
  }
  leads.unshift(newLead)
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2))
  return newLead.id
}

function shouldAskForContact(stage: string, text: string, userTurns: number) {
  if (stage === 'ask_contact' || stage === 'collected' || stage === 'done') return false
  if (detectLeadIntent(text) || detectBookingIntent(text)) return true
  if (/цена|стоимость|пакет|срок|подключ/i.test(text)) return true
  if (userTurns >= 2) return true
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

async function handleIncomingMessage(senderId: string, text: string) {
  const conversation = getConversation(senderId)
  const history = [...conversation.history, { role: 'user' as const, content: text }].slice(-12)
  const userTurns = history.filter((m) => m.role === 'user').length
  const contact = normalizeContact(text)

  // Always store the message first
  updateConversation(senderId, { history })

  if (!isAllowedSender(senderId)) {
    console.log('IG webhook: sender not in allowlist; skipping auto-reply', { senderId })
    return
  }

  if (contact && conversation.leadId == null) {
    const leadId = saveLeadFromInstagram({
      senderId,
      contact,
      clientMessages: history.filter((m) => m.role === 'user').map((m) => m.content),
      lastMessage: text,
    })
    updateConversation(senderId, { stage: 'collected', leadId, history })
    await sendTelegramLead({ senderId, messageText: text, contactHint: contact.value })
    const reply = [
      'Спасибо! ✅ Контакт получил.',
      '—',
      'Я посмотрю детали и вернусь с конкретным планом.',
      'Если удобно, напиши ещё: ниша + средний чек + источник заявок. 💬',
    ].join('\n')
    updateConversation(senderId, { history: [...history, { role: 'assistant', content: reply }].slice(-12) })
    await sendInstagramMessage(senderId, reply)
    return
  }

  if (hasInvalidContactHint(text)) {
    updateConversation(senderId, { stage: 'ask_contact', history })
    const reply = [
      'Похоже, контакт указан не полностью. 🙌',
      'Отправь, пожалуйста, корректно:',
      '— email (name@domain.com) или',
      '— телефон (+380..., +49..., +7...) или',
      '— Telegram @username',
    ].join('\n')
    updateConversation(senderId, { history: [...history, { role: 'assistant', content: reply }].slice(-12) })
    await sendInstagramMessage(senderId, reply)
    return
  }

  const nextStage = shouldAskForContact(conversation.stage, text, userTurns) ? 'ask_contact' : conversation.stage === 'new' ? 'qualify' : conversation.stage
  updateConversation(senderId, { stage: nextStage, history })

  if (nextStage === 'ask_contact') {
    const reply = [
      'Круто, я понял задачу. ✅',
      '—',
      'Чтобы собрать точную систему под тебя, отправь контакт:',
      'email / телефон / Telegram @username',
    ].join('\n')
    updateConversation(senderId, { history: [...history, { role: 'assistant', content: reply }].slice(-12) })
    await sendInstagramMessage(senderId, reply)
    return
  }

  const reply = await generateAiReply(text, nextStage, history)
  updateConversation(senderId, { history: [...history, { role: 'assistant', content: reply }].slice(-12) })
  await sendInstagramMessage(senderId, reply)
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

  console.log('IG webhook: received', {
    hasSignature: Boolean(signature),
    length: rawBuffer.length,
    hasVerifyToken: Boolean(IG_VERIFY_TOKEN),
    hasAppSecret: Boolean(IG_APP_SECRET),
    signatureBypass: IG_SIGNATURE_BYPASS,
    hasAccessToken: Boolean(IG_ACCESS_TOKEN),
    hasIgUserId: Boolean(IG_USER_ID),
    igUserIdLast4: IG_USER_ID ? IG_USER_ID.slice(-4) : null,
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
      const isEcho = Boolean(change.value?.message?.is_echo)
      if (isEcho) continue
      if (!senderId || !text) {
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

      console.log('IG webhook: incoming message (changes)', { senderId, text: clip(text, 200) })
      processedCount += 1
      recordInstagramWebhook({ senderId, textPreview: clip(text, 120) })
      await handleIncomingMessage(senderId, text)
    }

    for (const msg of messages) {
      if (msg.message?.is_echo) continue
      const senderId = msg.sender?.id
      const text = msg.message?.text?.trim()
      if (!senderId || !text) {
        console.log('IG webhook: skipped event (no senderId/text or echo)', {
          senderId: senderId || null,
          recipientId: msg.recipient?.id || null,
          hasMessage: Boolean(msg.message),
          messageKeys: msg.message ? Object.keys(msg.message) : [],
          isEcho: Boolean(msg.message?.is_echo),
        })
        continue
      }

      console.log('IG webhook: incoming message', { senderId, text: clip(text, 200) })
      processedCount += 1
      recordInstagramWebhook({ senderId, textPreview: clip(text, 120) })
      await handleIncomingMessage(senderId, text)
    }
  }
  if (processedCount === 0) {
    console.warn('IG webhook: no processable messages found in payload')
  }

  return NextResponse.json({ ok: true })
}

