import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { recordWhatsAppWebhook } from '../state'
import { buildTemoWebSystemPrompt, computeReadinessScoreHeuristic, computeStageHeuristic } from '../../temowebPrompt'
import {
  applyChannelLimits,
  applyPilotNudge,
  applyServicesRouter,
  detectAiIntent,
  ensureCta,
  evaluateQuality,
} from '@/app/lib/aiPostProcess'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type WaTextMessage = {
  from?: string
  id?: string
  timestamp?: string
  type?: string
  text?: { body?: string }
}

type WaChangeValue = {
  messaging_product?: string
  metadata?: { display_phone_number?: string; phone_number_id?: string }
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>
  messages?: WaTextMessage[]
  statuses?: any[]
}

type WaWebhookPayload = {
  object?: string
  entry?: Array<{
    id?: string
    changes?: Array<{ field?: string; value?: WaChangeValue }>
  }>
}

const VERIFY_TOKEN = (process.env.WHATSAPP_VERIFY_TOKEN || '').trim()
const APP_SECRET = (process.env.WHATSAPP_APP_SECRET || process.env.INSTAGRAM_APP_SECRET || '').trim()
const SIGNATURE_BYPASS = (process.env.WHATSAPP_SIGNATURE_BYPASS || '').trim() === 'true'
const ACCESS_TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim()
const PHONE_NUMBER_ID = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
const WHATSAPP_API_HOST = (process.env.WHATSAPP_API_HOST || 'graph.facebook.com').trim()
const WHATSAPP_API_VERSION = (process.env.WHATSAPP_API_VERSION || 'v22.0').trim()
const IGNORE_TEST_EVENTS = (process.env.WHATSAPP_IGNORE_TEST_EVENTS || 'true').trim() !== 'false'

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim()
const OPENAI_MODEL = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()

function clip(text: string, max = 1000) {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function verifySignature(rawBody: Buffer, signatureHeader: string | null) {
  if (SIGNATURE_BYPASS) {
    console.warn('WHATSAPP_SIGNATURE_BYPASS=true; signature verification skipped')
    return true
  }
  if (!APP_SECRET) {
    console.warn('WHATSAPP_APP_SECRET is missing; signature verification skipped')
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

async function generateAiReply(userText: string) {
  if (!OPENAI_API_KEY) {
    return 'Принято. Напиши нишу и где приходят заявки — покажу, как автоматизация заберёт это на себя.'
  }
  const isUa = /[іїєґ]/i.test(String(userText || ''))
  const userTurns = 1
  const readinessScore = computeReadinessScoreHeuristic(userText, userTurns)
  const intent = detectAiIntent(userText || '')
  const supportRules = intent.isSupport
    ? [
        isUa
          ? 'SUPPORT MODE: користувач має проблему або вже налаштовану систему. Перейдіть у режим підтримки. Питайте: канал, що саме зламалось, коли почалось. Не продавайте пакети.'
          : 'SUPPORT MODE: клиент сообщает о проблеме или уже подключенной системе. Перейдите в режим поддержки. Спросите: канал, что сломалось, когда началось. Не продавайте пакеты.',
      ]
    : []
  const system = buildTemoWebSystemPrompt({
    lang: isUa ? 'ua' : 'ru',
    channel: 'whatsapp',
    stage: computeStageHeuristic(userText, readinessScore),
    readinessScore,
    extraRules: supportRules,
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
      max_tokens: 300,
    }),
  })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    console.error('OpenAI error (WA)', resp.status, t.slice(0, 300))
    return 'Ок. Напиши нишу и 1 главную боль — я сразу предложу схему автоматизации и цену.'
  }
  const j = (await resp.json().catch(() => ({}))) as any
  const content = j?.choices?.[0]?.message?.content
  let out = typeof content === 'string' && content.trim() ? content.trim() : 'Ок. Напиши нишу и боль — я предложу схему и цену.'
  const lang = isUa ? 'ua' : 'ru'
  const stage = computeStageHeuristic(userText, readinessScore)
  if (!intent.isSupport) {
    out = applyServicesRouter(out, lang, intent)
    out = applyPilotNudge(out, lang, intent)
    out = ensureCta(out, lang, stage, readinessScore, intent)
  }
  out = applyChannelLimits(out, 'whatsapp')
  const quality = evaluateQuality(out, lang, intent, 'whatsapp')
  if (quality.missingPackages || quality.missingAddons || quality.tooLong || quality.noCta) {
    console.warn('WhatsApp AI quality flags', { quality, lang })
  }
  return out
}

async function sendWhatsAppText(to: string, text: string, opts?: { phoneNumberId?: string | null }) {
  const phoneNumberId = (opts?.phoneNumberId || PHONE_NUMBER_ID || '').trim()
  if (!ACCESS_TOKEN || !phoneNumberId) {
    console.error('Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID')
    return
  }
  const url = `https://${WHATSAPP_API_HOST}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: clip(text, 1000) },
  }
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    console.error('WhatsApp send error', resp.status, t.slice(0, 500))
  } else {
    console.log('WhatsApp send ok', { to, phoneNumberIdLast4: phoneNumberId.slice(-4), api: `${WHATSAPP_API_HOST}/${WHATSAPP_API_VERSION}` })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = (searchParams.get('hub.verify_token') || '').trim()
  const challenge = searchParams.get('hub.challenge')

  console.log('WA webhook: verify attempt', {
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
      hint: 'Ensure Meta "Verify token" matches WHATSAPP_VERIFY_TOKEN exactly (including dots/spaces).',
    },
    { status: 403, headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(request: NextRequest) {
  const rawBuffer = Buffer.from(await request.arrayBuffer())
  const signature = request.headers.get('x-hub-signature-256')

  console.log('WA webhook: received', { hasSignature: Boolean(signature), length: rawBuffer.length })
  if (!verifySignature(rawBuffer, signature)) {
    console.warn('WA webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let payload: WaWebhookPayload | null = null
  try {
    payload = JSON.parse(rawBuffer.toString('utf8'))
  } catch (e) {
    console.error('WA webhook: invalid JSON', e)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const entries = payload?.entry || []
  for (const entry of entries) {
    const changes = entry?.changes || []
    for (const ch of changes) {
      const value = ch.value
      const metaPhoneNumberId = value?.metadata?.phone_number_id?.trim() || null
      const metaDisplayPhone = value?.metadata?.display_phone_number?.trim() || null
      const messages = value?.messages || []
      for (const m of messages) {
        const from = m.from
        const type = (m.type || '').toLowerCase()
        const text = m.text?.body?.trim()
        recordWhatsAppWebhook({ from: from || null, type: type || null, textPreview: text ? clip(text, 120) : null })
        if (!from) continue
        if (type !== 'text' || !text) continue

        console.log('WA webhook: incoming text', { from, text: clip(text, 200) })
        // Meta "Test" webhook often sends a dummy message from 16315551181 with body "this is a text message".
        if (IGNORE_TEST_EVENTS && (from === '16315551181' || text.toLowerCase() === 'this is a text message')) {
          console.log('WA webhook: ignoring test event', {
            from,
            metaDisplayPhone,
            metaPhoneNumberIdLast4: metaPhoneNumberId ? metaPhoneNumberId.slice(-4) : null,
          })
          continue
        }
        const reply = await generateAiReply(text)
        await sendWhatsAppText(from, reply, { phoneNumberId: metaPhoneNumberId })
      }
    }
  }

  return NextResponse.json({ ok: true })
}


