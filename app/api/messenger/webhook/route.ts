import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { listChannelConnections } from '@/app/lib/storage'
import { recordMessengerPost, recordMessengerWebhook } from '../state'
import { appendMessage, getConversation, setConversationLang } from '../conversationStore'
import { buildTemoWebSystemPrompt, computeReadinessScoreHeuristic, computeStageHeuristic } from '../../temowebPrompt'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
const OPENAI_MODEL = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()
const OPENAI_MODEL_MESSENGER = (process.env.OPENAI_MODEL_MESSENGER || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()

const LEADS_FILE = path.join(process.cwd(), 'data', 'leads.json')

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
  const dir = path.dirname(LEADS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, JSON.stringify([]), 'utf8')
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
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: OPENAI_MODEL_MESSENGER,
        temperature: 0.2,
        max_tokens: 260,
        messages: [
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
        ],
      }),
    })
    if (!resp.ok) return null
    const json = (await resp.json().catch(() => ({}))) as any
    const content = json?.choices?.[0]?.message?.content
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
  const raw = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'))
  const leads = Array.isArray(raw) ? raw : []
  // de-dupe: same sender + same contact within last 24h
  const now = Date.now()
  const exists = leads.slice(0, 200).some((l: any) => {
    if (String(l?.source || '').toLowerCase() !== 'messenger') return false
    if (String(l?.contact || '') !== input.contact) return false
    const notes = String(l?.notes || '')
    if (!notes.includes(`senderId: ${input.senderId}`)) return false
    const t = Date.parse(String(l?.createdAt || ''))
    if (!Number.isFinite(t)) return false
    return now - t < 24 * 60 * 60 * 1000
  })
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
  leads.unshift(newLead)
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2))
  return newLead.id as number
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
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL_MESSENGER,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userText },
      ],
      temperature: 0.7,
      max_tokens: 520,
    }),
  })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    console.error('OpenAI error (Messenger)', resp.status, t.slice(0, 300))
    return 'Ок. Напишите нишу и 1 главную боль — я сразу предложу схему автоматизации и ориентир по цене.'
  }
  const j = (await resp.json().catch(() => ({}))) as any
  const content = j?.choices?.[0]?.message?.content
  const finishReason = j?.choices?.[0]?.finish_reason
  const cleaned = typeof content === 'string' ? normalizeAnswer(content) : ''
  const guarded = enforceSingleQuestion(cleaned)
  let out = guarded || ''
  if (finishReason === 'length') out = trimToLastCompleteSentence(out)
  out = sanitizeMessengerText(out)
  return out ? clip(out, 900) : 'Ок. Напишите нишу и боль — я предложу схему и цену.'
}

async function generateAiReplyWithHistory(input: {
  userText: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  lang: 'ru' | 'ua'
  images?: string[]
}) {
  const userText = input.userText
  if (!OPENAI_API_KEY) return generateAiReply(userText, { lang: input.lang })
  const hist = Array.isArray(input.history) ? input.history : []
  const lastUser = userText
  const lang = input.lang
  const userTurns = hist.filter((m) => m.role === 'user').length || 1
  const readinessScore = computeReadinessScoreHeuristic(lastUser, userTurns)
  const stage = computeStageHeuristic(lastUser, readinessScore)
  const system = buildTemoWebSystemPrompt({ lang, channel: 'messenger', stage, readinessScore })
  const isFirstAssistant = hist.filter((m) => m.role === 'assistant').length === 0
  const firstMsgRule = isFirstAssistant
    ? lang === 'ua'
      ? 'Це перше повідомлення: представтесь як "персональний AI‑асистент TemoWeb". Питай максимум 1 питання.'
      : 'Это первое сообщение: представьтесь как "персональный AI‑ассистент TemoWeb". Задай максимум 1 вопрос.'
    : null

  const images = Array.isArray(input.images) ? input.images.filter(Boolean).slice(0, 2) : []
  const userContent =
    images.length > 0
      ? ([
          { type: 'text', text: userText || (lang === 'ua' ? '[Надіслано зображення]' : '[Отправлено изображение]') },
          ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
        ] as any)
      : userText

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL_MESSENGER,
      messages: [
        { role: 'system', content: system },
        ...(firstMsgRule ? [{ role: 'system', content: firstMsgRule }] : []),
        ...hist.slice(-24),
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 520,
    }),
  })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    console.error('OpenAI error (Messenger/history)', resp.status, t.slice(0, 300))
    return generateAiReply(userText, { lang })
  }
  const j = (await resp.json().catch(() => ({}))) as any
  const content = j?.choices?.[0]?.message?.content
  const finishReason = j?.choices?.[0]?.finish_reason
  const cleaned = typeof content === 'string' ? normalizeAnswer(content) : ''
  const guarded = enforceSingleQuestion(cleaned)
  let out = guarded || ''
  if (finishReason === 'length') out = trimToLastCompleteSentence(out)
  out = sanitizeMessengerText(out)
  return out ? clip(out, 900) : 'Ок. Напишите нишу и боль — я предложу схему и цену.'
}

async function sendMessengerText(opts: { pageAccessToken: string; recipientId: string; text: string }) {
  const token = (opts.pageAccessToken || '').trim()
  if (!token) {
    console.error('Missing Messenger page access token (meta.pageAccessToken or MESSENGER_PAGE_ACCESS_TOKEN)')
    return
  }
  const url = `https://${API_HOST}/${API_VERSION}/me/messages?access_token=${encodeURIComponent(token)}`
  const parts = splitTextIntoParts(opts.text, 1550, 5)
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
    if (i < parts.length - 1) await new Promise((r) => setTimeout(r, 160))
  }
  console.log('Messenger send ok', { recipientIdLast4: opts.recipientId.slice(-4), api: `${API_HOST}/${API_VERSION}`, parts: parts.length })
}

async function findMessengerConnection(pageId: string): Promise<ChannelConnection | null> {
  const all = (await listChannelConnections()) as ChannelConnection[]
  const pid = String(pageId || '').trim()
  if (!pid) return null
  return all.find((c) => c.channel === 'messenger' && String(c.externalId || '').trim() === pid) || null
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
      const attachments = Array.isArray(ev?.message?.attachments) ? ev.message!.attachments : []
      const imageUrls = attachments
        .filter((a) => (a?.type || '').toLowerCase() === 'image')
        .map((a) => String(a?.payload?.url || '').trim())
        .filter(Boolean)
      const isEcho = Boolean(ev?.message?.is_echo)

      const preview = msgText ? clip(msgText, 120) : imageUrls.length ? '[image]' : null
      recordMessengerWebhook({ pageId: pageId || null, senderId: senderId || null, textPreview: preview })

      if (!senderId) continue
      if (IGNORE_ECHO && isEcho) continue
      if (!msgText && !imageUrls.length) continue

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
      })
      const conv = getConversation(pageId, senderId)
      const explicitLang = parseLangSwitch(msgText || '')
      if (explicitLang) setConversationLang(pageId, senderId, explicitLang)
      const preferredLang = explicitLang || conv.lang || 'ua'
      appendMessage(pageId, senderId, { role: 'user', content: msgText || (preferredLang === 'ua' ? '[Надіслано зображення]' : '[Отправлено изображение]') })
      const history = (conv.messages || []).slice(-14).map((m) => ({ role: m.role, content: m.content }))

      // Lead capture: if user sent phone/email -> save lead to CRM and notify Telegram.
      const contactDraft = extractContact(msgText || '')
      const contact = (contactDraft.email || contactDraft.phone || '').trim()
      if (contact && conn?.tenantId) {
        const clientMessages = [msgText, ...history.filter((m) => m.role === 'user').map((m) => m.content)]
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .slice(0, 20)
        const aiSummary = await generateLeadAiSummary({ lang: preferredLang, contact, clientMessages })
        const leadId = await saveLeadFromMessenger({
          tenantId: String(conn.tenantId),
          pageId,
          senderId,
          contact,
          lang: preferredLang,
          lastMessage: msgText || '[image]',
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
          lastMessage: msgText || '[image]',
        })
        const okMsg =
          preferredLang === 'ua'
            ? 'Готово ✅ Зафіксував заявку. Напишемо/зателефонуємо для наступного кроку.'
            : 'Готово ✅ Зафиксировал заявку. Напишем/созвонимся для следующего шага.'
        await sendMessengerText({ pageAccessToken, recipientId: senderId, text: okMsg })
        appendMessage(pageId, senderId, { role: 'assistant', content: okMsg })
        recordMessengerPost({ length: rawBuffer.length, hasSignature: Boolean(signature), result: 'ok', note: `lead_saved tenant=${String(conn.tenantId)} leadId=${leadId ?? 'dup'}` })
        continue
      }

      const reply = await generateAiReplyWithHistory({ userText: msgText || '', history, lang: preferredLang, images: imageUrls })
      await sendMessengerText({ pageAccessToken, recipientId: senderId, text: reply })
      appendMessage(pageId, senderId, { role: 'assistant', content: reply })
      recordMessengerPost({ length: rawBuffer.length, hasSignature: Boolean(signature), result: 'ok', note: `replied pageId=${pageId || '—'}` })
    }
  }

  return NextResponse.json({ ok: true })
}

