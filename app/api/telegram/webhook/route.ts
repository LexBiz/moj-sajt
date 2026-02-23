import { NextRequest, NextResponse } from 'next/server'
import {
  applyChannelLimits,
  applyPackageFactsGuard,
  applyPackageGuidance,
  applyPilotNudge,
  applyNoPaymentPolicy,
  applyServicesRouter,
  applyWebsiteOfferGuard,
  applyIncompleteDetailsFix,
  applyManagerInitiative,
  applyNextSteps,
  detectAiIntent,
  detectChosenPackage,
  detectChosenPackageFromHistory,
  ensureCta,
  enforcePackageConsistency,
  expandNumericChoiceFromRecentAssistant,
  stripBannedTemplates,
  stripRepeatedIntro,
  buildTemoWebFirstMessage,
  textHasContactValue,
  evaluateQuality,
} from '@/app/lib/aiPostProcess'
import { buildTemoWebSystemPrompt, computeReadinessScoreHeuristic, computeStageHeuristic } from '@/app/api/temowebPrompt'
import { appendMessage, getConversation, updateConversation } from '../conversationStore'
import { startTelegramFollowupScheduler } from '../followupScheduler'
import { createLead, hasRecentLeadByContact } from '@/app/lib/storage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

startTelegramFollowupScheduler()

const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim()
const WEBHOOK_SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()
const OWNER_CHAT_ID = (process.env.TELEGRAM_OWNER_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '').trim()
const TENANT_ID = (process.env.TENANT_ID || 'temoweb').trim() || 'temoweb'

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim()
const OPENAI_MODEL = (process.env.OPENAI_MODEL_TELEGRAM || process.env.OPENAI_MODEL || 'gpt-4o').trim()
const OPENAI_TIMEOUT_MS = Math.max(5000, Math.min(90_000, Number(process.env.OPENAI_TIMEOUT_MS || 18_000) || 18_000))
const OPENAI_TRANSCRIBE_MODEL = (process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1').trim()
const OPENAI_TRANSCRIBE_TIMEOUT_MS = Math.max(3000, Math.min(20_000, Number(process.env.OPENAI_TRANSCRIBE_TIMEOUT_MS || 9000) || 9000))

function nowIso() {
  return new Date().toISOString()
}

function clip(text: string, max = 1200) {
  const s = String(text || '')
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
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

function inferLang(text: string): 'ru' | 'ua' {
  const t = String(text || '')
  return /[іїєґ]/i.test(t) ? 'ua' : 'ru'
}

function extractContact(text: string) {
  const s = String(text || '').trim()
  if (!s) return null
  const email = s.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  if (email) return email[0]
  const phone = s.match(/(\+?\d[\d\s().-]{7,}\d)/)
  if (phone) return phone[1].replace(/\s+/g, ' ').trim()
  const tg = s.match(/(^|\s)@([a-zA-Z0-9_]{4,32})\b/)
  if (tg) return `@${tg[2]}`
  return null
}

async function tgApi(method: string, body: any) {
  if (!BOT_TOKEN) return { ok: false as const, data: null as any }
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = (await resp.json().catch(() => null)) as any
  return { ok: resp.ok && Boolean(json?.ok), data: json }
}

async function sendTelegramText(chatId: string, text: string) {
  const s = String(text || '').trim()
  if (!s) return
  await tgApi('sendMessage', { chat_id: chatId, text: clip(s, 3500), disable_web_page_preview: true })
}

async function sendLeadToOwner(text: string) {
  if (!OWNER_CHAT_ID) return false
  const r = await tgApi('sendMessage', {
    chat_id: OWNER_CHAT_ID,
    text: clip(text, 3900),
    disable_web_page_preview: true,
  })
  return Boolean(r.ok)
}

async function getFileUrl(fileId: string) {
  const id = String(fileId || '').trim()
  if (!id) return null
  const r = await tgApi('getFile', { file_id: id })
  const filePath = typeof r.data?.result?.file_path === 'string' ? r.data.result.file_path.trim() : ''
  if (!r.ok || !filePath) return null
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`
}

async function fetchBinary(url: string) {
  const u = String(url || '').trim()
  if (!u) return null
  const resp = await fetch(u)
  if (!resp.ok) return null
  const ab = await resp.arrayBuffer()
  return Buffer.from(ab)
}

async function transcribeAudioUrl(url: string) {
  const key = OPENAI_API_KEY
  if (!key) return null
  const buf = await fetchBinary(url)
  if (!buf || buf.length === 0) return null
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), OPENAI_TRANSCRIBE_TIMEOUT_MS)
  try {
    const form = new FormData()
    form.append('model', OPENAI_TRANSCRIBE_MODEL)
    form.append('file', new Blob([new Uint8Array(buf)], { type: 'audio/mpeg' }), 'audio.mp3')
    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: ac.signal,
    })
    if (!resp.ok) return null
    const json = (await resp.json().catch(() => ({}))) as any
    const text = typeof json?.text === 'string' ? json.text.trim() : null
    return text && text.length > 0 ? text : null
  } catch (e) {
    const msg = String((e as any)?.message || e)
    const aborted = msg.toLowerCase().includes('aborted') || msg.toLowerCase().includes('abort')
    console.error('Telegram transcribe exception', { aborted, msg })
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function prepareImagesAsDataUrls(fileIds: string[]) {
  const out: string[] = []
  for (let i = 0; i < Math.min(fileIds.length, 2); i += 1) {
    const fid = String(fileIds[i] || '').trim()
    if (!fid) continue
    const url = await getFileUrl(fid)
    if (!url) continue
    const buf = await fetchBinary(url)
    if (!buf || buf.length === 0 || buf.length > 900_000) continue
    out.push(`data:image/jpeg;base64,${buf.toString('base64')}`)
  }
  return out
}

async function generateAiReply(params: {
  userText: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  lang: 'ru' | 'ua'
  images?: string[]
}) {
  const rawUserText = params.userText
  const key = OPENAI_API_KEY
  const hist = Array.isArray(params.history) ? params.history : []
  const lang = params.lang

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
    return lang === 'ua'
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
  let stage = computeStageHeuristic(composedUserText, readinessScore)
  if (!hasContactAlready && userTurns >= 6 && !contactAskedRecently && !intent.isSupport) stage = 'ASK_CONTACT'
  const system = buildTemoWebSystemPrompt({ lang, channel: 'telegram', stage, readinessScore })

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), OPENAI_TIMEOUT_MS)
  let resp: Response
  try {
    const model = String(OPENAI_MODEL || 'gpt-4o').trim().replace(/[‐‑‒–—−]/g, '-')
    const modelLower = model.toLowerCase()
    const isGpt5 = modelLower.startsWith('gpt-5') || modelLower.startsWith('gpt5')
    const maxKey = isGpt5 ? 'max_completion_tokens' : 'max_tokens'

    const images = Array.isArray(params.images) ? params.images.filter(Boolean).slice(0, 3) : []
    const userContent =
      images.length > 0
        ? ([
            { type: 'text', text: composedUserText || (lang === 'ua' ? '[Надіслано зображення]' : '[Отправлено изображение]') },
            ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
          ] as any)
        : composedUserText

    const messages = [
      { role: 'system', content: system },
      ...hist.slice(-12).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userContent },
    ]

    const body: any = { model, messages }
    if (!isGpt5) body.temperature = 0.75
    body[maxKey] = 280

    resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: ac.signal,
    })
  } catch (e: any) {
    const msg = String(e?.message || e)
    const aborted = msg.toLowerCase().includes('aborted') || msg.toLowerCase().includes('abort')
    console.error('OpenAI error (Telegram): fetch failed', { aborted, msg })
    return lang === 'ua'
      ? 'Ок. Напишіть нішу і 1 головний біль — я одразу запропоную схему автоматизації і ціну.'
      : 'Ок. Напишите нишу и 1 главную боль — я сразу предложу схему автоматизации и цену.'
  } finally {
    clearTimeout(timer)
  }

  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    console.error('OpenAI error (Telegram)', resp.status, t.slice(0, 300))
    return lang === 'ua'
      ? 'Ок. Напишіть нішу і 1 головний біль — я одразу запропоную схему автоматизації і ціну.'
      : 'Ок. Напишите нишу и 1 главную боль — я сразу предложу схему автоматизации и цену.'
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
      : lang === 'ua'
        ? 'Ок. Напишіть нішу і біль — я запропоную схему та ціну.'
        : 'Ок. Напишите нишу и боль — я предложу схему и цену.'

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
  out = applyChannelLimits(out, 'telegram')
  const quality = evaluateQuality(out, lang, intent, 'telegram')
  if (quality.missingPackages || quality.missingAddons || quality.tooLong || quality.noCta) {
    console.warn('Telegram AI quality flags', { quality, lang })
  }
  return out
}

export async function POST(request: NextRequest) {
  if (WEBHOOK_SECRET) {
    const secret = String(request.headers.get('x-telegram-bot-api-secret-token') || '').trim()
    if (!secret || secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }
  }

  const update = (await request.json().catch(() => null)) as any
  const msg = update?.message || update?.edited_message || null
  const chatId = msg?.chat?.id != null ? String(msg.chat.id) : ''
  if (!chatId) return NextResponse.json({ ok: true })

  const baseConv = getConversation(chatId)

  const text = String(msg?.text || msg?.caption || '').trim()
  const voiceFileId = msg?.voice?.file_id ? String(msg.voice.file_id).trim() : null
  const audioFileId = msg?.audio?.file_id ? String(msg.audio.file_id).trim() : null
  const photoArr = Array.isArray(msg?.photo) ? msg.photo : []
  const photoFileId =
    photoArr.length > 0
      ? String(photoArr[photoArr.length - 1]?.file_id || '').trim() || null
      : null

  const explicitLang = parseLangSwitch(text)
  const inferredLang = inferLang(text)
  const preferredLang = explicitLang || baseConv.lang || (text ? inferredLang : inferredLang)
  if (explicitLang && explicitLang !== baseConv.lang) updateConversation(chatId, { lang: explicitLang })
  if (!explicitLang && !baseConv.lang && text) updateConversation(chatId, { lang: inferredLang })

  // Media burst buffering.
  const now = Date.now()
  const prevPending = Array.isArray(baseConv.pendingImageFileIds) ? baseConv.pendingImageFileIds : []
  const lastMediaAt = baseConv.lastMediaAt ? Date.parse(baseConv.lastMediaAt) : NaN
  const pendingFresh = Number.isFinite(lastMediaAt) && now - lastMediaAt < 10 * 60 * 1000 ? prevPending : []
  const pendingAll = [...pendingFresh, ...(photoFileId ? [photoFileId] : [])].filter(Boolean)
  const pendingDedup = Array.from(new Set(pendingAll)).slice(0, 6)
  if (pendingDedup.length > 0) updateConversation(chatId, { pendingImageFileIds: pendingDedup, lastMediaAt: nowIso() })

  // Voice/audio: transcribe to text.
  let transcript: string | null = null
  const audioId = voiceFileId || audioFileId
  if (audioId) {
    const url = await getFileUrl(audioId)
    if (url) transcript = await transcribeAudioUrl(url)
  }

  const effectiveText =
    transcript && transcript.trim()
      ? text
        ? `${text}\n\n[Voice message transcript]: ${transcript.trim()}`
        : `[Voice message transcript]: ${transcript.trim()}`
      : text || (photoFileId ? '' : audioId ? '[Voice message]' : '')

  // Store user message.
  const userContentForHistory = effectiveText || (photoFileId ? '[Image]' : '')
  const afterUser = appendMessage(chatId, { role: 'user', content: userContentForHistory }) || baseConv
  const history = (afterUser.messages || []).slice(-14).map((m) => ({ role: m.role, content: m.content }))

  const contactFromText = extractContact(text) || extractContact(effectiveText)
  const username = msg?.from?.username ? String(msg.from.username).trim() : ''
  const fallbackContact = username ? `@${username}` : null
  const contact = contactFromText || fallbackContact

  // Intro.
  const hasAnyAssistant = history.some((m) => m.role === 'assistant')
  if (!hasAnyAssistant) {
    const intro = buildTemoWebFirstMessage(preferredLang === 'ua' ? 'ua' : 'ru')
    await sendTelegramText(chatId, intro)
    appendMessage(chatId, { role: 'assistant', content: intro })
  }

  // Images-only: acknowledge once and wait.
  if (!text && !transcript && photoFileId && pendingDedup.length > 0) {
    const lastAssistantAt = (afterUser.messages || []).slice().reverse().find((x) => x.role === 'assistant')?.at || null
    const lastAssistantMs = lastAssistantAt ? Date.parse(String(lastAssistantAt)) : NaN
    if (!Number.isFinite(lastAssistantMs) || now - lastAssistantMs > 2 * 60 * 1000) {
      const ack =
        preferredLang === 'ua'
          ? `Бачу ${pendingDedup.length} фото ✅ Напишіть одним рядком, що саме перевірити/порадити (і можете докинути ще фото, якщо треба).`
          : `Вижу ${pendingDedup.length} фото ✅ Напишите одним рядком, что именно проверить/подсказать (и можете докинуть ещё фото, если надо).`
      await sendTelegramText(chatId, ack)
      appendMessage(chatId, { role: 'assistant', content: ack })
    }
    return NextResponse.json({ ok: true })
  }

  const pendingIds = Array.isArray((afterUser as any).pendingImageFileIds) ? ((afterUser as any).pendingImageFileIds as any[]).map(String) : pendingDedup
  const images = pendingIds.length > 0 ? await prepareImagesAsDataUrls(pendingIds) : []

  // Lead capture for Telegram channel (parity with legacy tg-ai-bot):
  // - send a short lead summary to owner chat
  // - save lead to CRM storage (dedup by contact)
  const alreadyCaptured = Boolean((afterUser as any)?.leadCapturedAt) || Boolean(baseConv.leadCapturedAt)
  const intent = detectAiIntent(effectiveText || text || '')
  const userTurns = Math.max(1, history.filter((m) => m.role === 'user').length)
  const readinessScore = computeReadinessScoreHeuristic(effectiveText || text || '', userTurns)
  const stageGuess = computeStageHeuristic(effectiveText || text || '', readinessScore)
  const shouldCapture =
    !alreadyCaptured &&
    Boolean(contact) &&
    !intent.isSupport &&
    (Boolean(contactFromText) || stageGuess === 'ASK_CONTACT' || userTurns >= 6)

  if (shouldCapture && contact) {
    try {
      const exists = await hasRecentLeadByContact({ contact, source: 'telegram', withinMs: 24 * 60 * 60 * 1000 })
      if (!exists) {
        const clientMessages = history.filter((m) => m.role === 'user').map((m) => m.content).slice(-12)
        await createLead({
          id: Date.now(),
          tenantId: TENANT_ID,
          name: null,
          contact,
          email: /\S+@\S+\.\S+/.test(contact) ? contact : null,
          businessType: null,
          channel: 'Telegram',
          pain: null,
          question: effectiveText || text || null,
          clientMessages,
          aiSummary: null,
          source: 'telegram',
          lang: preferredLang,
          notes: `telegramChatId:${chatId}${username ? ` username:@${username}` : ''}`,
          status: 'new',
        })
      }

      const leadText = [
        '📥 НОВАЯ ЗАЯВКА (TELEGRAM)',
        '',
        `👤 user: ${username ? `@${username}` : '—'}`,
        `🆔 chatId: ${chatId}`,
        `📩 контакт: ${contact || '—'}`,
        '',
        '🗣 последнее сообщение:',
        `— ${clip(effectiveText || text || '[message]', 900)}`,
        '',
        `🕒 ${new Date().toISOString()}`,
      ].join('\n')
      await sendLeadToOwner(leadText)
      updateConversation(chatId, { leadCapturedAt: nowIso(), followUpSentAt: nowIso() })
    } catch (e) {
      console.error('Telegram lead capture failed', { msg: String((e as any)?.message || e) })
    }
  }

  const reply = await generateAiReply({
    userText: effectiveText,
    history,
    lang: preferredLang === 'ua' ? 'ua' : 'ru',
    images,
  })
  await sendTelegramText(chatId, reply)
  appendMessage(chatId, { role: 'assistant', content: reply })
  if (pendingIds.length > 0) updateConversation(chatId, { pendingImageFileIds: [], lastMediaAt: null })

  return NextResponse.json({ ok: true })
}

