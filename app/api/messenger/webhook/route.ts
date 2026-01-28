import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { listChannelConnections } from '@/app/lib/storage'
import { recordMessengerPost, recordMessengerWebhook } from '../state'
import { appendMessage, getConversation, setConversationLang } from '../conversationStore'
import { buildTemoWebSystemPrompt, computeReadinessScoreHeuristic, computeStageHeuristic } from '../../temowebPrompt'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type MsgrMessagingEvent = {
  sender?: { id?: string }
  recipient?: { id?: string } // page id
  timestamp?: number
  message?: { mid?: string; text?: string; is_echo?: boolean }
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

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim()
const OPENAI_MODEL = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()

function clip(text: string, max = 1000) {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
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
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userText },
      ],
      temperature: 0.8,
      max_tokens: 360,
    }),
  })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    console.error('OpenAI error (Messenger)', resp.status, t.slice(0, 300))
    return 'Ок. Напишите нишу и 1 главную боль — я сразу предложу схему автоматизации и ориентир по цене.'
  }
  const j = (await resp.json().catch(() => ({}))) as any
  const content = j?.choices?.[0]?.message?.content
  const cleaned = typeof content === 'string' ? normalizeAnswer(content) : ''
  const guarded = enforceSingleQuestion(cleaned)
  return guarded ? clip(guarded, 900) : 'Ок. Напишите нишу и боль — я предложу схему и цену.'
}

async function generateAiReplyWithHistory(input: {
  userText: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  lang: 'ru' | 'ua'
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

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: system },
        ...(firstMsgRule ? [{ role: 'system', content: firstMsgRule }] : []),
        ...hist.slice(-16),
        { role: 'user', content: userText },
      ],
      temperature: 0.85,
      max_tokens: 420,
    }),
  })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    console.error('OpenAI error (Messenger/history)', resp.status, t.slice(0, 300))
    return generateAiReply(userText, { lang })
  }
  const j = (await resp.json().catch(() => ({}))) as any
  const content = j?.choices?.[0]?.message?.content
  const cleaned = typeof content === 'string' ? normalizeAnswer(content) : ''
  const guarded = enforceSingleQuestion(cleaned)
  return guarded ? clip(guarded, 900) : 'Ок. Напишите нишу и боль — я предложу схему и цену.'
}

async function sendMessengerText(opts: { pageAccessToken: string; recipientId: string; text: string }) {
  const token = (opts.pageAccessToken || '').trim()
  if (!token) {
    console.error('Missing Messenger page access token (meta.pageAccessToken or MESSENGER_PAGE_ACCESS_TOKEN)')
    return
  }
  const url = `https://${API_HOST}/${API_VERSION}/me/messages?access_token=${encodeURIComponent(token)}`
  const body = {
    messaging_type: 'RESPONSE',
    recipient: { id: opts.recipientId },
    message: { text: clip(opts.text, 1800) },
  }
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    console.error('Messenger send error', resp.status, t.slice(0, 500))
  } else {
    console.log('Messenger send ok', { recipientIdLast4: opts.recipientId.slice(-4), api: `${API_HOST}/${API_VERSION}` })
  }
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
      const isEcho = Boolean(ev?.message?.is_echo)

      recordMessengerWebhook({ pageId: pageId || null, senderId: senderId || null, textPreview: msgText ? clip(msgText, 120) : null })

      if (!senderId) continue
      if (IGNORE_ECHO && isEcho) continue
      if (!msgText) continue

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

      console.log('Messenger webhook: incoming text', { pageId, senderIdLast4: senderId.slice(-4), text: clip(msgText, 200) })
      const conv = getConversation(pageId, senderId)
      const explicitLang = parseLangSwitch(msgText)
      if (explicitLang) setConversationLang(pageId, senderId, explicitLang)
      const preferredLang = explicitLang || conv.lang || 'ua'
      appendMessage(pageId, senderId, { role: 'user', content: msgText })
      const history = (conv.messages || []).slice(-14).map((m) => ({ role: m.role, content: m.content }))
      const reply = await generateAiReplyWithHistory({ userText: msgText, history, lang: preferredLang })
      await sendMessengerText({ pageAccessToken, recipientId: senderId, text: reply })
      appendMessage(pageId, senderId, { role: 'assistant', content: reply })
      recordMessengerPost({ length: rawBuffer.length, hasSignature: Boolean(signature), result: 'ok', note: `replied pageId=${pageId || '—'}` })
    }
  }

  return NextResponse.json({ ok: true })
}

