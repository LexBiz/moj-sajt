import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { recordWhatsAppWebhook } from '../state'
import { buildTemoWebSystemPrompt, computeReadinessScoreHeuristic, computeStageHeuristic } from '../../temowebPrompt'
import { createLead, getTenantProfile, hasRecentLeadByContact, resolveTenantIdByConnection } from '@/app/lib/storage'
import { appendMessage, getConversation, updateConversation } from '../conversationStore'
import {
  applyChannelLimits,
  applyPackageGuidance,
  applyNextSteps,
  applyIncompleteDetailsFix,
  applyNoPaymentPolicy,
  applyPilotNudge,
  applyServicesRouter,
  applyWebsiteOfferGuard,
  detectAiIntent,
  expandNumericChoiceFromRecentAssistant,
  detectChosenPackageFromHistory,
  detectChosenPackage,
  stripRepeatedIntro,
  stripBannedTemplates,
  textHasContactValue,
  buildTemoWebFirstMessage,
  applyManagerInitiative,
  applyPackageFactsGuard,
  enforcePackageConsistency,
  ensureCta,
  evaluateQuality,
} from '@/app/lib/aiPostProcess'
import { startWhatsAppFollowupScheduler } from '../followupScheduler'
import { hitRateLimit } from '@/app/lib/apiRateLimit'
import { getRequestIdentity } from '@/app/lib/requestIdentity'

export const dynamic = 'force-dynamic'
export const revalidate = 0

startWhatsAppFollowupScheduler()

type WaTextMessage = {
  from?: string
  id?: string
  timestamp?: string
  type?: string
  text?: { body?: string }
  audio?: { id?: string; mime_type?: string; voice?: boolean }
  image?: { id?: string; mime_type?: string }
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
const WA_APP_SECRET = (process.env.WHATSAPP_APP_SECRET || '').trim()
const IG_APP_SECRET = (process.env.INSTAGRAM_APP_SECRET || '').trim()
const SIGNATURE_BYPASS = (process.env.WHATSAPP_SIGNATURE_BYPASS || '').trim() === 'true'
const ACCESS_TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim()
const PHONE_NUMBER_ID = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
const WHATSAPP_API_HOST = (process.env.WHATSAPP_API_HOST || 'graph.facebook.com').trim()
const WHATSAPP_API_VERSION = (process.env.WHATSAPP_API_VERSION || 'v22.0').trim()
const IGNORE_TEST_EVENTS = (process.env.WHATSAPP_IGNORE_TEST_EVENTS || 'true').trim() !== 'false'

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim()
const OPENAI_MODEL = (process.env.OPENAI_MODEL_WHATSAPP || process.env.OPENAI_MODEL || 'gpt-4o').trim()
const OPENAI_TIMEOUT_MS_GLOBAL = Math.max(5000, Math.min(90000, Number(process.env.OPENAI_TIMEOUT_MS || 18000) || 18000))
// WhatsApp webhook must return quickly to Meta (10s-ish). Prefer shorter timeout + fallback.
const OPENAI_TIMEOUT_MS_WA = Math.max(
  3000,
  Math.min(30_000, Number(process.env.WHATSAPP_OPENAI_TIMEOUT_MS || OPENAI_TIMEOUT_MS_GLOBAL || 9000) || 9000),
)
const OPENAI_TRANSCRIBE_MODEL = (process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1').trim()
const OPENAI_TRANSCRIBE_TIMEOUT_MS = Math.max(
  3000,
  Math.min(20_000, Number(process.env.OPENAI_TRANSCRIBE_TIMEOUT_MS || 9000) || 9000),
)

function getOpenAiKey(apiKey?: string | null) {
  return String(apiKey || OPENAI_API_KEY || '').trim()
}

async function waFetchMediaUrl(mediaId: string) {
  const id = String(mediaId || '').trim()
  if (!id) return null
  if (!ACCESS_TOKEN) return null
  const url = `https://${WHATSAPP_API_HOST}/${WHATSAPP_API_VERSION}/${encodeURIComponent(id)}`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } })
  if (!resp.ok) return null
  const json = (await resp.json().catch(() => null)) as any
  const mediaUrl = typeof json?.url === 'string' ? json.url.trim() : ''
  const mime = typeof json?.mime_type === 'string' ? json.mime_type.trim() : null
  return mediaUrl ? { url: mediaUrl, mime } : null
}

async function waDownloadMediaBinary(mediaUrl: string) {
  const url = String(mediaUrl || '').trim()
  if (!url) return null
  if (!ACCESS_TOKEN) return null
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } })
  if (!resp.ok) return null
  const ab = await resp.arrayBuffer()
  return Buffer.from(ab)
}

async function transcribeAudioBuffer(params: { buf: Buffer; apiKey?: string | null; mime?: string | null }) {
  const key = getOpenAiKey(params.apiKey)
  if (!key) return null
  const buf = params.buf
  if (!buf || buf.length === 0) return null
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
      console.error('OpenAI transcribe error (WA)', resp.status, t.slice(0, 200))
      return null
    }
    const json = (await resp.json().catch(() => ({}))) as any
    const text = typeof json?.text === 'string' ? json.text.trim() : null
    return text && text.length > 0 ? text : null
  } catch (e) {
    const msg = String((e as any)?.message || e)
    const aborted = msg.toLowerCase().includes('aborted') || msg.toLowerCase().includes('abort')
    console.error('Transcribe exception (WA)', { aborted, msg })
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function transcribeWhatsAppMediaAudio(params: { mediaId: string; apiKey?: string | null }) {
  const media = await waFetchMediaUrl(params.mediaId)
  if (!media?.url) return null
  const buf = await waDownloadMediaBinary(media.url)
  if (!buf) return null
  return transcribeAudioBuffer({ buf, apiKey: params.apiKey, mime: media.mime })
}

const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim()
const TELEGRAM_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim()

function clip(text: string, max = 1000) {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function normalizeWaContact(from: string) {
  const raw = String(from || '').trim()
  if (!raw) return null
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return null
  // WhatsApp wa_id is digits without '+'
  return `+${digits}`
}

async function sendTelegramLeadWhatsApp(input: {
  tenantId: string | null
  contact: string
  from: string
  text: string
  metaPhoneNumberId: string | null
  metaDisplayPhone: string | null
}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return { attempted: false as const, ok: false as const }
  const lines = [
    '📥 НОВА ЗАЯВКА З WHATSAPP',
    '',
    `🏢 tenant: ${input.tenantId || '—'}`,
    `📞 контакт (wa): ${input.contact || '—'}`,
    `🧾 from: ${input.from || '—'}`,
    input.metaDisplayPhone ? `📱 номер бізнесу: ${input.metaDisplayPhone}` : null,
    input.metaPhoneNumberId ? `🆔 phone_number_id: …${input.metaPhoneNumberId.slice(-4)}` : null,
    '',
    '🗣 Повідомлення клієнта:',
    `— ${clip(input.text || '', 800)}`,
    '',
    `🕒 Час: ${new Date().toISOString()}`,
  ].filter(Boolean)
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: lines.join('\n'),
    disable_web_page_preview: true,
  }
  try {
    const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      console.error('Telegram send error (WA lead)', { status: resp.status, body: body.slice(0, 400) })
      return { attempted: true as const, ok: false as const }
    }
    return { attempted: true as const, ok: true as const }
  } catch (e) {
    console.error('Telegram send exception (WA lead)', e)
    return { attempted: true as const, ok: false as const }
  }
}

function verifySignature(
  rawBody: Buffer,
  signatureHeader: string | null,
): { ok: boolean; matched: 'bypass' | 'whatsapp' | 'instagram' | null; headerPrefix: string | null; headerLen: number } {
  // Meta can send the sha256 hex in upper/lower case. Normalize to lowercase before comparing.
  const header = signatureHeader?.trim().toLowerCase() || ''
  const headerPrefix = header ? header.slice(0, 12) : null
  const headerLen = header ? header.length : 0

  if (!header) {
    if (SIGNATURE_BYPASS) {
      console.warn('WHATSAPP_SIGNATURE_BYPASS=true; signature verification skipped', { headerPrefix, headerLen })
      return { ok: true, matched: 'bypass', headerPrefix, headerLen }
    }
    return { ok: false, matched: null, headerPrefix: null, headerLen: 0 }
  }

  type SigFormat = 'sha256=' | 'hex-only' | 'other'
  let format: SigFormat = 'other'
  let normalizedHeader = header
  if (header.startsWith('sha256=')) {
    format = 'sha256='
  } else if (/^[0-9a-f]{64}$/.test(header)) {
    // Some environments/loggers can strip the "sha256=" prefix. Normalize it back.
    format = 'hex-only'
    normalizedHeader = `sha256=${header}`
  }

  // We compare against a "sha256=<hex>" string (Meta header format).
  const actualBuf = Buffer.from(normalizedHeader)

  const matchesSecret = (secret: string) => {
    if (!secret) return false
    const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`
    const expectedBuf = Buffer.from(expected)
    if (expectedBuf.length !== actualBuf.length) return false
    try {
      return crypto.timingSafeEqual(expectedBuf, actualBuf)
    } catch {
      return false
    }
  }

  const waMatch = matchesSecret(WA_APP_SECRET)
  const igMatch = matchesSecret(IG_APP_SECRET)
  if (SIGNATURE_BYPASS) {
    console.warn('WA webhook: bypass audit', {
      format,
      headerPrefix,
      headerLen,
      waMatch,
      igMatch,
      waSecretPresent: Boolean(WA_APP_SECRET),
      igSecretPresent: Boolean(IG_APP_SECRET),
    })
    return { ok: true, matched: 'bypass', headerPrefix, headerLen }
  }

  // Try WhatsApp app secret first (expected), then fall back to IG secret for diagnosis.
  // This avoids "silent death" when webhook is attached to a different Meta App.
  if (waMatch) return { ok: true, matched: 'whatsapp', headerPrefix, headerLen }
  if (igMatch) {
    console.warn('WA webhook: signature matched INSTAGRAM_APP_SECRET (check Meta App + WHATSAPP_APP_SECRET)')
    return { ok: true, matched: 'instagram', headerPrefix, headerLen }
  }
  if (!WA_APP_SECRET) console.warn('WHATSAPP_APP_SECRET is missing')
  return { ok: false, matched: null, headerPrefix, headerLen }
}

async function generateAiReply(params: {
  userText: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  apiKey?: string | null
  lang?: 'ru' | 'ua'
  images?: string[]
}) {
  const rawUserText = params.userText
  const key = (params.apiKey || OPENAI_API_KEY || '').trim()
  const hist = Array.isArray(params.history) ? params.history : []
  // Persist language per conversation when possible; fall back to heuristic.
  const hinted = params.lang === 'ru' ? 'ru' : params.lang === 'ua' ? 'ua' : null
  const t = String(rawUserText || '').trim().toLowerCase()
  const wantsRu = /\b(рус|русский|по-русски|російськ|російською|ru)\b/i.test(t)
  const wantsUa = /\b(укр|укра|українськ|українською|ua)\b/i.test(t) || /[іїєґ]/i.test(String(rawUserText || ''))
  const inferred: 'ru' | 'ua' = wantsUa ? 'ua' : wantsRu ? 'ru' : /[іїєґ]/i.test(String(rawUserText || '')) ? 'ua' : 'ru'
  const lang: 'ua' | 'ru' = hinted || inferred
  const isUa = lang === 'ua'

  // If user replies with a digit (1/2/3), treat it as choosing an option from the previous next-steps block.
  const recentAssistantTextsForChoice = hist
    .filter((m) => m.role === 'assistant')
    .slice(-6)
    .map((m) => String(m.content || ''))
  const composedUserText = expandNumericChoiceFromRecentAssistant({
    userText: rawUserText || '',
    lang,
    recentAssistantTexts: recentAssistantTextsForChoice,
  })

  if (!key) {
    return isUa
      ? 'Прийнято ✅ Напишіть 1–2 деталі: ніша + звідки зараз приходять заявки — і я покажу рішення.'
      : 'Принято ✅ Напишите 1–2 детали: ниша + откуда сейчас приходят заявки — и я покажу решение.'
  }
  const userTurns = Math.max(1, hist.filter((m) => m.role === 'user').length)
  const readinessScore = computeReadinessScoreHeuristic(composedUserText, userTurns)
  const intent = detectAiIntent(composedUserText || '')
  const hasContactAlready =
    textHasContactValue(rawUserText) || hist.some((m) => m.role === 'user' && textHasContactValue(m.content))
  const contactAskedRecently = hist
    .filter((m) => m.role === 'assistant')
    .slice(-6)
    .some((m) => /\b(телефон|email|почт|контакт|скиньте|надішліть|залиште)\b/i.test(String(m.content || '')))
  // Decision layer: if dialogue is long and we still don't have contact, force closing.
  let stage = computeStageHeuristic(composedUserText, readinessScore)
  if (!hasContactAlready && userTurns >= 6 && !contactAskedRecently && !intent.isSupport) stage = 'ASK_CONTACT'
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
    stage,
    readinessScore,
    extraRules: supportRules,
  })
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), OPENAI_TIMEOUT_MS_WA)
  let resp: Response
  try {
    let model = String(OPENAI_MODEL || 'gpt-4o')
      .trim()
      .replace(/[‐‑‒–—−]/g, '-')
    let modelLower = model.toLowerCase()
    // Speed/stability: if gpt-5 is configured for WhatsApp, use a fast fallback unless explicitly overridden.
    if (modelLower.startsWith('gpt-5') || modelLower.startsWith('gpt5')) {
      const fb = String(process.env.OPENAI_MODEL_WHATSAPP_FALLBACK || 'gpt-4o').trim().replace(/[‐‑‒–—−]/g, '-')
      model = fb || model
      modelLower = model.toLowerCase()
    }
    const images = Array.isArray(params.images) ? params.images.filter(Boolean).slice(0, 3) : []
    const userContent =
      images.length > 0
        ? ([
            { type: 'text', text: composedUserText || (isUa ? '[Надіслано зображення]' : '[Отправлено изображение]') },
            ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
          ] as any)
        : composedUserText
    const messages = [
      { role: 'system', content: system },
      ...hist.slice(-12).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userContent },
    ]

    // Use Chat Completions. For gpt-5 use `max_completion_tokens` and avoid non-default temperature.
    const isGpt5 = modelLower.startsWith('gpt-5') || modelLower.startsWith('gpt5')
    const maxKey = isGpt5 ? 'max_completion_tokens' : 'max_tokens'
    const body: any = { model, messages }
    if (!isGpt5) body.temperature = 0.8
    body[maxKey] = 240

    resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      signal: ac.signal,
      body: JSON.stringify(body),
    })
  } catch (e: any) {
    const msg = String(e?.message || e)
    const aborted = msg.toLowerCase().includes('aborted') || msg.toLowerCase().includes('abort')
    console.error('OpenAI error (WA): fetch failed', { aborted, msg, OPENAI_TIMEOUT_MS_WA })
    return isUa
      ? 'Ок. Напишіть нішу і 1 головний біль — я одразу запропоную схему автоматизації і ціну.'
      : 'Ок. Напиши нишу и 1 главную боль — я сразу предложу схему автоматизации и цену.'
  } finally {
    clearTimeout(timer)
  }
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    console.error('OpenAI error (WA)', resp.status, t.slice(0, 300))
    return isUa
      ? 'Ок. Напишіть нішу і 1 головний біль — я одразу запропоную схему автоматизації і ціну.'
      : 'Ок. Напиши нишу и 1 главную боль — я сразу предложу схему автоматизации и цену.'
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
  let out =
    typeof content === 'string' && content.trim()
      ? content.trim()
      : isUa
        ? 'Ок. Напишіть нішу і біль — я запропоную схему та ціну.'
        : 'Ок. Напиши нишу и боль — я предложу схему и цену.'
  const isFirstAssistant = hist.filter((m) => m.role === 'assistant').length === 0
  out = stripRepeatedIntro(out, isFirstAssistant)
  out = stripBannedTemplates(out)
  const hasChosenPackage = Boolean(
    detectChosenPackage(composedUserText || '') || detectChosenPackageFromHistory([{ role: 'user', content: composedUserText || '' }]),
  )
  if (!intent.isSupport) {
    out = applyServicesRouter(out, lang, intent, hasChosenPackage)
    out = applyWebsiteOfferGuard({ text: out, lang, intent, userText: composedUserText || rawUserText || '' })
    const recentAssistantTexts = hist.filter((m) => m.role === 'assistant').slice(-6).map((m) => String(m.content || ''))
    out = applyPackageGuidance({ text: out, lang, intent, recentAssistantTexts })
    out = enforcePackageConsistency({ reply: out, lang, userText: composedUserText, recentAssistantTexts })
    out = applyIncompleteDetailsFix(out, lang)
    out = applyPilotNudge(out, lang, intent)
    out = applyNoPaymentPolicy(out, lang)
    out = applyPackageFactsGuard(out, lang)
    out = applyManagerInitiative({ text: out, lang, stage, intent, userText: composedUserText })
    out = ensureCta(out, lang, stage, readinessScore, intent, hasContactAlready)
    out = applyNextSteps({ text: out, lang, stage, readinessScore, intent, hasChosenPackage })
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
    text: { body: clip(text, 1600) },
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
  const rl = await hitRateLimit({
    scope: 'whatsapp_webhook',
    identity: getRequestIdentity(request),
    windowSec: 60,
    limit: Number(process.env.RATE_LIMIT_WHATSAPP_WEBHOOK_PER_MIN || 600),
  })
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } })
  }
  const rawBuffer = Buffer.from(await request.arrayBuffer())
  const signature = request.headers.get('x-hub-signature-256')
  const contentEncoding = request.headers.get('content-encoding')
  const userAgent = request.headers.get('user-agent')

  console.log('WA webhook: received', {
    hasSignature: Boolean(signature),
    length: rawBuffer.length,
    contentEncoding: contentEncoding || null,
    ua: userAgent ? clip(userAgent, 120) : null,
  })
  const sig = verifySignature(rawBuffer, signature)
  if (!sig.ok) {
    console.warn('WA webhook: invalid signature', sig)
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
        const audioId = m.audio?.id ? String(m.audio.id).trim() : null
        const imageId = m.image?.id ? String(m.image.id).trim() : null
        const preview = text ? clip(text, 120) : imageId ? '[image]' : audioId ? '[audio]' : null
        recordWhatsAppWebhook({ from: from || null, type: type || null, textPreview: preview })
        if (!from) continue
        if (type !== 'text' && type !== 'audio' && type !== 'image') continue
        if (type === 'text' && !text) continue
        if (type === 'audio' && !audioId) continue
        if (type === 'image' && !imageId) continue

        if (type === 'text') console.log('WA webhook: incoming text', { from, text: clip(text || '', 200) })
        if (type === 'audio' && audioId) console.log('WA webhook: incoming audio', { from, audioIdLast6: audioId.slice(-6) })
        if (type === 'image' && imageId) console.log('WA webhook: incoming image', { from, imageIdLast6: imageId.slice(-6) })
        // Meta "Test" webhook often sends a dummy message from 16315551181 with body "this is a text message".
        if (type === 'text' && IGNORE_TEST_EVENTS && (from === '16315551181' || (text || '').toLowerCase() === 'this is a text message')) {
          console.log('WA webhook: ignoring test event', {
            from,
            metaDisplayPhone,
            metaPhoneNumberIdLast4: metaPhoneNumberId ? metaPhoneNumberId.slice(-4) : null,
          })
          continue
        }

        // Conversation memory (parity with other channels):
        // - improves answer quality
        // - enables digit-only selections for "next steps" options
        const tenantId = metaPhoneNumberId ? await resolveTenantIdByConnection('whatsapp', metaPhoneNumberId).catch(() => null) : null
        const profile = tenantId ? await getTenantProfile(String(tenantId)).catch(() => null) : null
        const apiKey = profile && typeof (profile as any).openAiKey === 'string' ? String((profile as any).openAiKey).trim() : null

        // Voice/audio: transcribe to text so AI can handle it like a normal message.
        const transcript =
          type === 'audio' && audioId
            ? await transcribeWhatsAppMediaAudio({ mediaId: audioId, apiKey })
            : null
        const effectiveText =
          type === 'audio'
            ? transcript && transcript.trim()
              ? `[Voice message transcript]: ${transcript.trim()}`
              : '[Voice message]'
            : type === 'image'
              ? ''
              : (text || '').trim()

        const baseConv = await getConversation(from)
        const explicitLang = parseLangSwitch(effectiveText || '')
        const inferredLang: 'ru' | 'ua' = /[іїєґ]/i.test(effectiveText || '') ? 'ua' : 'ru'
        const preferredLang = explicitLang || (baseConv as any).lang || (effectiveText ? inferredLang : inferredLang)
        if (explicitLang && explicitLang !== (baseConv as any).lang) await updateConversation(from, { lang: explicitLang } as any)
        if (!explicitLang && !(baseConv as any).lang && effectiveText) await updateConversation(from, { lang: inferredLang } as any)

        const now = Date.now()
        const prevPending: string[] = Array.isArray((baseConv as any).pendingImageUrls)
          ? ((baseConv as any).pendingImageUrls as any[]).map(String)
          : []
        const lastMediaAtIso = typeof (baseConv as any).lastMediaAt === 'string' ? String((baseConv as any).lastMediaAt) : ''
        const lastMediaAt = lastMediaAtIso ? Date.parse(lastMediaAtIso) : NaN
        const pendingFresh = Number.isFinite(lastMediaAt) && now - lastMediaAt < 10 * 60 * 1000 ? prevPending : []
        const pendingAll = [...pendingFresh, ...(imageId ? [imageId] : [])].filter(Boolean)
        const pendingDedup = Array.from(new Set(pendingAll)).slice(0, 6)
        if (pendingDedup.length > 0) await updateConversation(from, { pendingImageUrls: pendingDedup, lastMediaAt: new Date().toISOString() } as any)

        const userContentForHistory = effectiveText || (imageId ? '[Image]' : '')
        const afterUser = (await appendMessage(from, { role: 'user', content: userContentForHistory })) || baseConv
        const recentAssistantTexts = (afterUser?.messages || []).filter((x) => x.role === 'assistant').slice(-6).map((x) => x.content)
        const expandedUserText = expandNumericChoiceFromRecentAssistant({
          userText: effectiveText || userContentForHistory,
          lang: preferredLang === 'ua' ? 'ua' : 'ru',
          recentAssistantTexts,
        })
        const history = (afterUser?.messages || [])
          .slice(-14)
          .map((m) => ({ role: m.role, content: m.content }))

        // Hard requirement: first assistant message is a fixed intro (then default UA afterwards).
        const hasAnyAssistant = (afterUser?.messages || []).some((x) => x.role === 'assistant')
        if (!hasAnyAssistant) {
          const intro = buildTemoWebFirstMessage(preferredLang === 'ua' ? 'ua' : 'ru')
          await sendWhatsAppText(from, intro, { phoneNumberId: metaPhoneNumberId })
          await appendMessage(from, { role: 'assistant', content: intro })
          // Do NOT return: after intro we still answer the user's first message (text or voice).
        }

        // Images-only: acknowledge once and wait for a clarifying line (while buffering images).
        if (type === 'image' && pendingDedup.length > 0) {
          const lastAssistantAt = (afterUser?.messages || []).slice().reverse().find((x) => x.role === 'assistant')?.at || null
          const lastAssistantMs = lastAssistantAt ? Date.parse(String(lastAssistantAt)) : NaN
          if (!Number.isFinite(lastAssistantMs) || now - lastAssistantMs > 2 * 60 * 1000) {
            const ack =
              preferredLang === 'ua'
                ? `Бачу ${pendingDedup.length} фото ✅ Напишіть одним рядком, що саме перевірити/порадити (і можете докинути ще фото, якщо треба).`
                : `Вижу ${pendingDedup.length} фото ✅ Напишите одним рядком, что именно проверить/подсказать (и можете докинуть ещё фото, если надо).`
            await sendWhatsAppText(from, ack, { phoneNumberId: metaPhoneNumberId })
            await appendMessage(from, { role: 'assistant', content: ack })
          }
          continue
        }

        // Lead capture (unified CRM): WhatsApp always has a sender number, so we create a lead
        // only when the user is actually warm/ready (stage=ASK_CONTACT) and we have some context.
        try {
          const userTurns = Math.max(1, (afterUser?.messages || []).filter((x) => x.role === 'user').length)
          const readinessScore = computeReadinessScoreHeuristic(expandedUserText, userTurns)
          const stage = computeStageHeuristic(expandedUserText, readinessScore)
          const intent = detectAiIntent(expandedUserText)
          const contact = normalizeWaContact(from)
          const shouldCreate =
            Boolean(contact) &&
            !intent.isSupport &&
            userTurns >= 3 &&
            (stage === 'ASK_CONTACT' || textHasContactValue(expandedUserText))

          if (shouldCreate && contact) {
            const exists = await hasRecentLeadByContact({ contact, source: 'whatsapp', withinMs: 24 * 60 * 60 * 1000 })
            if (!exists) {
              const clientMessages = (afterUser?.messages || [])
                .filter((x) => x.role === 'user')
                .slice(-12)
                .map((x) => x.content)
                .filter(Boolean)
              const saved = await createLead({
                id: Date.now(),
                tenantId: tenantId || 'temoweb',
                name: null,
                contact,
                email: null,
                businessType: null,
                channel: 'WhatsApp',
                pain: null,
                question: expandedUserText,
                clientMessages,
                aiRecommendation: null,
                aiSummary: null,
                source: 'whatsapp',
                lang: /[іїєґ]/i.test(expandedUserText) ? 'ua' : 'ru',
                notes: metaPhoneNumberId ? `phone_number_id:${metaPhoneNumberId}` : null,
                status: 'new',
              })
              const tg = await sendTelegramLeadWhatsApp({
                tenantId: tenantId || null,
                contact,
                from,
                text: expandedUserText,
                metaPhoneNumberId,
                metaDisplayPhone,
              })
              console.log('WA lead saved', { leadId: saved?.id, telegram: tg.ok })
            }
          }
        } catch (e) {
          console.error('WA lead capture failed', { error: String((e as any)?.message || e) })
        }

        async function prepareImageDataUrls(ids: string[]) {
          const out: string[] = []
          for (let i = 0; i < Math.min(ids.length, 2); i += 1) {
            const id = String(ids[i] || '').trim()
            if (!id) continue
            const media = await waFetchMediaUrl(id)
            if (!media?.url) continue
            const buf = await waDownloadMediaBinary(media.url)
            if (!buf || buf.length === 0 || buf.length > 900_000) continue
            const mime = (media.mime || 'image/jpeg').includes('/') ? media.mime! : 'image/jpeg'
            out.push(`data:${mime};base64,${buf.toString('base64')}`)
          }
          return out
        }

        const pendingIds = Array.isArray((afterUser as any)?.pendingImageUrls)
          ? ((afterUser as any).pendingImageUrls as any[]).map(String).filter(Boolean)
          : pendingDedup
        const images = await prepareImageDataUrls(pendingIds)

        const reply = await generateAiReply({ userText: expandedUserText, history, apiKey, lang: preferredLang === 'ua' ? 'ua' : 'ru', images })
        await sendWhatsAppText(from, reply, { phoneNumberId: metaPhoneNumberId })
        await appendMessage(from, { role: 'assistant', content: reply })
        if (pendingIds.length > 0) await updateConversation(from, { pendingImageUrls: [], lastMediaAt: null } as any)
      }
    }
  }

  return NextResponse.json({ ok: true })
}


