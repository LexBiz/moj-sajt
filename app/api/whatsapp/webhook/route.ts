import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { recordWhatsAppWebhook } from '../state'
import { buildTemoWebSystemPrompt, computeReadinessScoreHeuristic, computeStageHeuristic } from '../../temowebPrompt'
import { createLead, getTenantProfile, hasRecentLeadByContact, resolveTenantIdByConnection } from '@/app/lib/storage'
import { appendMessage, getConversation } from '../conversationStore'
import {
  applyChannelLimits,
  applyPackageGuidance,
  applyNextSteps,
  applyIncompleteDetailsFix,
  applyNoPaymentPolicy,
  applyPilotNudge,
  applyServicesRouter,
  detectAiIntent,
  expandNumericChoiceFromRecentAssistant,
  detectChosenPackageFromHistory,
  detectChosenPackage,
  stripRepeatedIntro,
  textHasContactValue,
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
const WA_APP_SECRET = (process.env.WHATSAPP_APP_SECRET || '').trim()
const IG_APP_SECRET = (process.env.INSTAGRAM_APP_SECRET || '').trim()
const SIGNATURE_BYPASS = (process.env.WHATSAPP_SIGNATURE_BYPASS || '').trim() === 'true'
const ACCESS_TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim()
const PHONE_NUMBER_ID = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
const WHATSAPP_API_HOST = (process.env.WHATSAPP_API_HOST || 'graph.facebook.com').trim()
const WHATSAPP_API_VERSION = (process.env.WHATSAPP_API_VERSION || 'v22.0').trim()
const IGNORE_TEST_EVENTS = (process.env.WHATSAPP_IGNORE_TEST_EVENTS || 'true').trim() !== 'false'

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim()
const OPENAI_MODEL = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()
const OPENAI_TIMEOUT_MS_GLOBAL = Math.max(5000, Math.min(90000, Number(process.env.OPENAI_TIMEOUT_MS || 18000) || 18000))
// WhatsApp webhook must return quickly to Meta (10s-ish). Prefer shorter timeout + fallback.
const OPENAI_TIMEOUT_MS_WA = Math.max(
  3000,
  Math.min(30_000, Number(process.env.WHATSAPP_OPENAI_TIMEOUT_MS || OPENAI_TIMEOUT_MS_GLOBAL || 9000) || 9000),
)

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
}) {
  const userText = params.userText
  const key = (params.apiKey || OPENAI_API_KEY || '').trim()
  if (!key) {
    return 'Принято. Напиши нишу и где приходят заявки — покажу, как автоматизация заберёт это на себя.'
  }
  const isUa = /[іїєґ]/i.test(String(userText || ''))
  const hist = Array.isArray(params.history) ? params.history : []
  const userTurns = Math.max(1, hist.filter((m) => m.role === 'user').length)
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
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), OPENAI_TIMEOUT_MS_WA)
  let resp: Response
  try {
    resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      signal: ac.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: system },
          ...hist.slice(-16).map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: userText },
        ],
        temperature: 0.8,
        max_tokens: 300,
      }),
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
    return 'Ок. Напиши нишу и 1 главную боль — я сразу предложу схему автоматизации и цену.'
  }
  const j = (await resp.json().catch(() => ({}))) as any
  const content = j?.choices?.[0]?.message?.content
  let out = typeof content === 'string' && content.trim() ? content.trim() : 'Ок. Напиши нишу и боль — я предложу схему и цену.'
  const isFirstAssistant = hist.filter((m) => m.role === 'assistant').length === 0
  out = stripRepeatedIntro(out, isFirstAssistant)
  const lang = isUa ? 'ua' : 'ru'
  const stage = computeStageHeuristic(userText, readinessScore)
  const hasContactAlready = textHasContactValue(userText) || hist.some((m) => m.role === 'user' && textHasContactValue(m.content))
  const hasChosenPackage = Boolean(detectChosenPackage(userText || '') || detectChosenPackageFromHistory([{ role: 'user', content: userText || '' }]))
  if (!intent.isSupport) {
    out = applyServicesRouter(out, lang, intent, hasChosenPackage)
    out = applyPackageGuidance(out, lang)
    out = applyIncompleteDetailsFix(out, lang)
    out = applyPilotNudge(out, lang, intent)
    out = applyNoPaymentPolicy(out, lang)
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

        // Conversation memory (parity with other channels):
        // - improves answer quality
        // - enables digit-only selections for "next steps" options
        const baseConv = getConversation(from)
        const afterUser = appendMessage(from, { role: 'user', content: text }) || baseConv
        const recentAssistantTexts = (afterUser?.messages || []).filter((x) => x.role === 'assistant').slice(-6).map((x) => x.content)
        const expandedUserText = expandNumericChoiceFromRecentAssistant({
          userText: text,
          lang: /[іїєґ]/i.test(text) ? 'ua' : 'ru',
          recentAssistantTexts,
        })
        const history = (afterUser?.messages || [])
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content }))

        const tenantId = metaPhoneNumberId ? await resolveTenantIdByConnection('whatsapp', metaPhoneNumberId).catch(() => null) : null
        const profile = tenantId ? await getTenantProfile(String(tenantId)).catch(() => null) : null
        const apiKey = profile && typeof (profile as any).openAiKey === 'string' ? String((profile as any).openAiKey).trim() : null

        // Lead capture (unified CRM): WhatsApp always has a sender number, so we create a lead
        // only when the user is actually warm/ready (stage=ASK_CONTACT) and we have some context.
        try {
          const userTurns = Math.max(1, (afterUser?.messages || []).filter((x) => x.role === 'user').length)
          const readinessScore = computeReadinessScoreHeuristic(text, userTurns)
          const stage = computeStageHeuristic(text, readinessScore)
          const intent = detectAiIntent(text)
          const contact = normalizeWaContact(from)
          const shouldCreate =
            Boolean(contact) &&
            !intent.isSupport &&
            userTurns >= 3 &&
            (stage === 'ASK_CONTACT' || textHasContactValue(text))

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
                question: text,
                clientMessages,
                aiRecommendation: null,
                aiSummary: null,
                source: 'whatsapp',
                lang: /[іїєґ]/i.test(text) ? 'ua' : 'ru',
                notes: metaPhoneNumberId ? `phone_number_id:${metaPhoneNumberId}` : null,
                status: 'new',
              })
              const tg = await sendTelegramLeadWhatsApp({
                tenantId: tenantId || null,
                contact,
                from,
                text,
                metaPhoneNumberId,
                metaDisplayPhone,
              })
              console.log('WA lead saved', { leadId: saved?.id, telegram: tg.ok })
            }
          }
        } catch (e) {
          console.error('WA lead capture failed', { error: String((e as any)?.message || e) })
        }

        const reply = await generateAiReply({ userText: expandedUserText, history, apiKey })
        await sendWhatsAppText(from, reply, { phoneNumberId: metaPhoneNumberId })
        appendMessage(from, { role: 'assistant', content: reply })
      }
    }
  }

  return NextResponse.json({ ok: true })
}


