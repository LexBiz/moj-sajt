import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { recordInstagramAi, recordInstagramWebhook } from '../state'
import { readTokenFile } from '../oauth/_store'
import { getConversation, updateConversation, type ConversationLang, type ConversationMessage, type ConversationContactDraft } from '../conversationStore'
import fs from 'fs'
import path from 'path'
import { buildTemoWebSystemPrompt, computeReadinessScoreHeuristic, computeStageHeuristic } from '../../temowebPrompt'
import { ensureAllPackagesMentioned, isPackageCompareRequest } from '@/app/lib/packageGuard'
import {
  applyChannelLimits,
  applyPilotNudge,
  applyServicesRouter,
  detectAiIntent,
  evaluateQuality,
} from '@/app/lib/aiPostProcess'
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
const OPENAI_MODEL_INSTAGRAM = (process.env.OPENAI_MODEL_INSTAGRAM || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()
const OPENAI_TRANSCRIBE_MODEL = (process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1').trim()
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''

const LEADS_FILE = path.join(process.cwd(), 'data', 'leads.json')
const COMMENTS_PROCESSED_FILE = path.join(process.cwd(), 'data', 'instagram-comments-processed.json')

const IG_COMMENT_REPLY_ENABLED = (process.env.INSTAGRAM_COMMENT_REPLY_ENABLED || '').trim() === 'true'
const IG_COMMENT_DM_ON_PRICE = (process.env.INSTAGRAM_COMMENT_DM_ON_PRICE || '').trim() !== 'false'
const IG_COMMENT_DM_ON_PLUS = (process.env.INSTAGRAM_COMMENT_DM_ON_PLUS || '').trim() !== 'false'
// Default ON: if user shows explicit interest (not only "price" and not only "+") we DM first.
const IG_COMMENT_DM_ON_INTEREST = (process.env.INSTAGRAM_COMMENT_DM_ON_INTEREST || '').trim() !== 'false'

function ensureCommentsFile() {
  const dir = path.dirname(COMMENTS_PROCESSED_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(COMMENTS_PROCESSED_FILE)) fs.writeFileSync(COMMENTS_PROCESSED_FILE, JSON.stringify({}))
}

function loadProcessedComments(): Record<string, string> {
  try {
    ensureCommentsFile()
    const raw = fs.readFileSync(COMMENTS_PROCESSED_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function markCommentProcessed(commentId: string) {
  if (!commentId) return
  const all = loadProcessedComments()
  all[String(commentId)] = new Date().toISOString()
  try {
    fs.writeFileSync(COMMENTS_PROCESSED_FILE, JSON.stringify(all, null, 2), 'utf8')
  } catch {
    // ignore
  }
}

function wasCommentProcessed(commentId: string) {
  if (!commentId) return false
  const all = loadProcessedComments()
  return Boolean(all[String(commentId)])
}

function isEmojiOrLikeOnly(text: string) {
  const t = String(text || '').trim()
  if (!t) return false
  // no letters/digits, short -> treat as "like/emoji"
  if (/[a-zа-яіїєґ0-9]/i.test(t)) return false
  return t.length <= 14
}

function isPriceIntent(text: string) {
  const t = String(text || '').toLowerCase()
  if (!t) return false
  return /(цена|стоим|сколько|прайс|price|ціна|вартість|варт|скільки|скільки\s+кошту|пакет|тариф)/i.test(t)
}

function isToxicOrHateComment(text: string) {
  const t = String(text || '').trim().toLowerCase()
  if (!t) return false
  // Keep it conservative: if we flag as toxic, we will NOT DM.
  return (
    /(лох|лохотрон|скам|scam|мошен|обман|развод|кидал|наеб|нахуй|хуй|пизд|еба|ебан|сука|бляд|идиот|дебил|туп(ой|ая)|говн)/i.test(t) ||
    /(иди\s+на|пош(ёл|ел|ли)\s+на)/i.test(t)
  )
}

function isExplicitInterestComment(text: string) {
  const t = String(text || '').trim().toLowerCase()
  if (!t) return false
  // Anything that looks like a buying intent / "write me details" / "how to connect" => DM.
  // Price is handled separately but we include it here for completeness.
  return (
    isPriceIntent(t) ||
    /(хочу|интересно|цікав|подключ|підключ|как\s+подключ|як\s+підключ|подробн|детал|услов|пакет|тариф|срок|скільки\s+днів|коли\s+можна|запис|брон|buy|order|connect|details)/i.test(
      t,
    ) ||
    // "How it works / how to order" explicit intent (RU/UA)
    /(як\s+це\s+працю(є|е)|як\s+працю(є|е)|як\s+замов(ити|ляти)|як\s+оформ(ити|ляти)|як\s+підключ(ити|ається)|як\s+під'єдн(ати|ати|яється)|що\s+вход(ить|ить)|що\s+в\s+пакет(і|е)|які\s+умови|які\s+термін(и|и)|термін(и|и)\s+запуск|коли\s+запуск|як\s+почат(и|и)|що\s+потрібно\s+щоб\s+почати)/i.test(
      t,
    ) ||
    /(как\s+это\s+работает|как\s+работает|как\s+заказать|как\s+оформить|как\s+подключить|что\s+входит|что\s+в\s+пакете|какие\s+условия|какие\s+сроки|сроки\s+запуска|что\s+нужно\s+чтобы\s+начать)/i.test(t) ||
    /(в\s*(директ|direct|dm)|в\s*(личк|лс)|напиши(те)?\s*(мне)?|скинь(те)?\s*(мне)?|можно\s+связ|можна\s+зв'яз|давайте\s+контакт)/i.test(
      t,
    )
  )
}

function isLowEffortOrLightComment(text: string) {
  const t = String(text || '').trim().toLowerCase()
  if (!t) return true
  if (isEmojiOrLikeOnly(t)) return true
  // Common "nice" / reaction-only comments (RU/UA)
  if (
    /^(класс|круто|супер|топ|огонь|🔥+|👍+|дякую|дякую!|дякую❤️|спасиб|клас|супер|топчик|гарно|круто|вау|wow|nice|cool)[!. ]*$/i.test(
      t,
    )
  )
    return true
  // Very short generic questions without intent keywords should stay public
  const wordCount = t.split(/\s+/).filter(Boolean).length
  if (wordCount <= 2 && !isPriceIntent(t) && !isPlusSignal(t) && !isExplicitInterestComment(t)) return true
  return false
}

async function sendInstagramCommentReply(commentId: string, message: string) {
  const IG_ACCESS_TOKEN = getAccessToken()
  if (!IG_ACCESS_TOKEN) {
    console.error('Missing INSTAGRAM_ACCESS_TOKEN for comment reply')
    return { ok: false as const, error: 'missing_token' as const }
  }
  const urlObj = new URL(`https://${IG_API_HOST}/${IG_API_VERSION}/${commentId}/replies`)
  if (IG_API_HOST !== 'graph.instagram.com') {
    urlObj.searchParams.set('access_token', IG_ACCESS_TOKEN)
  }
  const retryMs = [0, 350, 1200]
  let lastStatus: number | null = null
  let lastText: string = ''
  for (let attempt = 0; attempt < retryMs.length; attempt += 1) {
    if (retryMs[attempt]) await sleep(retryMs[attempt])
    const resp = await fetch(urlObj.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${IG_ACCESS_TOKEN}` },
      body: JSON.stringify({ message: clip(message, 900) }),
    })
    lastStatus = resp.status
    const text = await resp.text().catch(() => '')
    lastText = text
    if (resp.ok) {
      const json = (() => {
        try {
          return JSON.parse(text) as any
        } catch {
          return null
        }
      })()
      const replyId = typeof json?.id === 'string' ? json.id : null
      return { ok: true as const, replyId }
    }
    // Detect transient Meta errors (code=2 / is_transient=true) to retry.
    let isTransient = false
    try {
      const parsed = JSON.parse(text) as any
      const code = parsed?.error?.code
      const transient = parsed?.error?.is_transient
      if (transient === true) isTransient = true
      if (code === 2) isTransient = true
    } catch {
      // ignore
    }
    console.error('IG comment reply error', {
      attempt: attempt + 1,
      status: resp.status,
      transient: isTransient,
      body: text.slice(0, 300),
    })
    if (!isTransient) break
  }
  return { ok: false as const, error: `http_${lastStatus || 500}` as const }
}

function isPlusSignal(text: string) {
  const t = String(text || '').trim().toLowerCase()
  if (!t) return false
  // Normalize common punctuation/spaces for word checks
  const cleaned = t.replace(/[“”"'.!,;:()[\]{}<>]/g, ' ').replace(/\s+/g, ' ').trim()
  // Pure symbol plus
  if (cleaned === '+' || cleaned === '++' || cleaned === '+1' || cleaned === '＋' || cleaned === '➕') return true
  if (/^\+{1,8}$/.test(cleaned)) return true
  // Any plus symbol anywhere
  if (cleaned.includes('+') || cleaned.includes('＋') || cleaned.includes('➕')) return true
  // Word forms (RU/UA/EN)
  // NOTE: JS \b uses ASCII word chars and does NOT work for Cyrillic. Use Unicode-aware boundaries instead.
  if (/(?:^|[^\p{L}\p{N}_])(plus|плюсик|плюс|плюси)(?:$|[^\p{L}\p{N}_])/iu.test(cleaned)) return true
  return false
}

function detectCommentLang(text: string): ConversationLang {
  const t = String(text || '').trim()
  if (!t) return 'ua'

  // Hard default UA for very short / symbol-only comments (prevents random EN/RU)
  if (isPlusSignal(t)) return 'ua'
  if (isEmojiOrLikeOnly(t)) return 'ua'
  if (t.length <= 3) return 'ua'

  // Strong Ukrainian markers
  if (/[іїєґ]/i.test(t)) return 'ua'
  if (/\b(дякую|будь\s*ласка|як|це|працює|скільки|ціна|можна|підкажіть|потрібно|хочу)\b/i.test(t)) return 'ua'

  // Strong Russian markers
  if (/[ыэё]/i.test(t)) return 'ru'
  if (/\b(спасибо|пожалуйста|как|это|работает|сколько|цена|можно|подскажите|нужно|хочу|проверить)\b/i.test(t)) return 'ru'

  // English: only if there are enough latin letters and no Cyrillic at all
  const hasLatin = /[a-z]/i.test(t)
  const hasCyr = /[а-яіїєґ]/i.test(t)
  const latinCount = (t.match(/[a-z]/gi) || []).length
  if (hasLatin && !hasCyr && latinCount >= 6) return 'en'

  // default UA (per requirement)
  return 'ua'
}

function buildPlusFirstDm(lang: ConversationLang) {
  if (lang === 'ru') {
    return 'Привет 🙂 видел твой “+” под видео  \n\nПодскажи, у тебя какой сейчас бизнес?'
  }
  if (lang === 'en') {
    return 'Hi 🙂 saw your “+” under the video  \n\nWhat kind of business do you run?'
  }
  return 'Привіт 🙂 бачив твій “+” під відео  \n\nПідкажи, який у тебе зараз бізнес?'
}

async function generatePublicCommentReply(params: { text: string; lang: ConversationLang }) {
  const OPENAI_API_KEY = getOpenAiKey()
  if (!OPENAI_API_KEY) return null

  const userText = String(params.text || '').trim()
  const system = [
    '=== ROLE ===',
    'You are TemoWeb’s public brand defender and lead generator in Instagram comments.',
    'You represent a strong, confident, high-status company.',
    'You are never submissive.',
    'You are never aggressive.',
    'You are controlled, sharp, and professional.',
    'You never say you are an AI.',
    '',
    '=== LANGUAGE RULE ===',
    'Always reply in the same language as the user comment.',
    'RU → Russian',
    'UA → Ukrainian',
    'EN → English',
    'Never mix languages.',
    '',
    '=== MAIN OBJECTIVE ===',
    '— With serious users → move to DM',
    '— With haters → protect brand publicly',
    '— With trolls → close topic',
    '— With prospects → create interest',
    'Not every comment must go to DM.',
    '',
    '=== COMMENT CATEGORIES ===',
    '1) SERIOUS INTEREST (price/how/details/integration): calm, confident, helpful → brief answer → offer DM.',
    '2) SKEPTICAL BUT RATIONAL: firm, respectful → short proof → optional DM.',
    '3) TOXIC HATE / TROLLING: cold, sharp, minimal, dominant → public boundary → no DM.',
    '4) PRAISE / SUPPORT: appreciative, confident → thanks → soft engagement.',
    '5) OFF-TOPIC / JOKES: light, controlled → redirect or close.',
    '',
    '=== DM RULE ===',
    'Go to DM ONLY if user shows interest / meaningful question / business intent.',
    'Never push DM to trolls/haters/empty commenters.',
    '',
    '=== EMOJI POLICY ===',
    'Interest/praise: 1–3',
    'Hate/conflict: 0',
    'Business topics: max 2',
    'Never use emojis in arguments.',
    '',
    '=== SELF-CHECK ===',
    '1) Does this show strength?',
    '2) Does this protect brand?',
    '3) Does this filter bad leads?',
    '4) Does this attract serious clients?',
    'If NO — rewrite.',
  ].join('\n')

  const langLine =
    params.lang === 'ru' ? 'Reply ONLY in Russian.' : params.lang === 'en' ? 'Reply ONLY in English.' : 'Reply ONLY in Ukrainian.'

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.7,
        max_tokens: 130,
        messages: [
          { role: 'system', content: langLine },
          { role: 'system', content: system },
          { role: 'user', content: userText },
        ],
      }),
    })
    if (!resp.ok) return null
    const json = (await resp.json()) as any
    const content = json?.choices?.[0]?.message?.content
    const out = typeof content === 'string' ? content.trim() : ''
    return out ? out.slice(0, 700) : null
  } catch {
    return null
  }
}

async function generateCommentAiReply(params: { text: string; lang: ConversationLang }) {
  return await generatePublicCommentReply(params)
}

async function handleIncomingCommentChange(change: IgWebhookChange) {
  if (!IG_COMMENT_REPLY_ENABLED) return { processed: false as const, reason: 'disabled' as const }
  const v: any = change?.value as any
  const verb = String(v?.verb || 'add').toLowerCase()
  if (verb && verb !== 'add') return { processed: false as const, reason: 'not_add' as const }

  // IMPORTANT:
  // For IG "comments" webhooks, value.id is often the MEDIA id, while value.comment_id is the real comment id.
  // If we use media id, /{id}/replies will fail and it will look like "bot doesn't reply".
  const commentIdPrimary = String(v?.comment_id || '').trim()
  const commentIdFallback = String(v?.id || '').trim()
  const commentIdCandidates = [commentIdPrimary, commentIdFallback].filter(Boolean)
  const text = String(v?.text || v?.message || '').trim()
  const fromId = String(v?.from?.id || v?.sender_id || v?.sender?.id || '').trim()
  const fromUsername = String(v?.from?.username || v?.from?.name || '').trim()

  if (!commentIdCandidates.length || !text) return { processed: false as const, reason: 'missing_comment' as const }
  // Dedupe by REAL comment id when available; otherwise fallback to whatever id we have.
  const dedupeKey = commentIdPrimary || commentIdFallback
  if (dedupeKey && wasCommentProcessed(dedupeKey)) return { processed: false as const, reason: 'duplicate' as const }

  // Do not reply to our own comments if present.
  if (fromId && IG_USER_ID && fromId === IG_USER_ID) {
    if (dedupeKey) markCommentProcessed(dedupeKey)
    return { processed: false as const, reason: 'self' as const }
  }

  const lang: ConversationLang = detectCommentLang(text)

  let reply: string | null = null
  const plus = isPlusSignal(text)
  const price = isPriceIntent(text)
  const toxic = isToxicOrHateComment(text)
  const explicitInterestSignal = isExplicitInterestComment(text)
  // Extra safety against false positives: interest DM should look like a real question/intent, not 1–2 words.
  const wordCount = text.split(/\s+/).filter(Boolean).length
  const explicitInterest = plus || price || (explicitInterestSignal && (wordCount >= 3 || /\?/.test(text)))
  const light = isLowEffortOrLightComment(text)
  const shouldDm =
    Boolean(fromId) &&
    !toxic &&
    !light &&
    ((price && IG_COMMENT_DM_ON_PRICE) || (plus && IG_COMMENT_DM_ON_PLUS) || (explicitInterest && IG_COMMENT_DM_ON_INTEREST))

  const dmReason = shouldDm
    ? price
      ? 'price'
      : plus
        ? 'plus'
        : explicitInterestSignal
          ? 'interest'
          : 'unknown'
    : toxic
      ? 'blocked_toxic'
      : light
        ? 'blocked_light'
        : 'no_dm'
  if (shouldDm) {
    console.log('IG comment: DM trigger', { dmReason, fromIdLast4: fromId ? fromId.slice(-4) : null, wordCount, textPreview: clip(text, 120) })
  }

  if (shouldDm && explicitInterest) {
    // Public acknowledgement + DM (continue in private).
    reply =
      lang === 'ua'
        ? 'Супер ✅ Уже написав Вам у Direct 😉'
        : lang === 'en'
        ? 'Great ✅ Messaged you in Direct 😉'
        : 'Супер ✅ Уже написал Вам в Direct 😉'
  } else if (isEmojiOrLikeOnly(text)) {
    reply = lang === 'ua' ? 'Дякуємо! ❤️' : lang === 'en' ? 'Thank you! ❤️' : 'Спасибо! ❤️'
  } else {
    reply =
      (await generateCommentAiReply({ text, lang })) ||
      (lang === 'ua' ? 'Дякую за коментар! 🙌' : lang === 'en' ? 'Thanks for the comment! 🙌' : 'Спасибо за комментарий! 🙌')
  }

  // Try sending comment reply using available ids (comment_id first, then fallback).
  let sentOk = false
  let lastErr: string | null = null
  let replyId: string | null = null
  let usedCommentId: string | null = null
  for (const cid of commentIdCandidates) {
    const sent = await sendInstagramCommentReply(cid, reply)
    if (sent.ok) {
      sentOk = true
      replyId = (sent as any).replyId || null
      usedCommentId = cid
      break
    }
    lastErr = sent.error
  }
  // Mark processed ONLY if we actually replied (avoid "stuck" when ID was wrong).
  if (sentOk && dedupeKey) markCommentProcessed(dedupeKey)

  // DM rules:
  // - price / explicit interest: DM is allowed (continue in private)
  // - plus signal: DM using fixed template (lead conversion assistant)
  // - toxic/haters: NEVER DM
  if (shouldDm) {
    // Try to DM; if IG blocks (no open window), it's fine — public reply already sent.
    const dmText = plus
      ? buildPlusFirstDm(lang)
      : lang === 'ua'
        ? [
            'Вітаю! 👋 Я персональний AI‑асистент TemoWeb.',
            'Підкажіть, будь ласка, Ваш бізнес і звідки зараз йдуть заявки — і я підберу пакет + строки. ⚡️',
          ].join('\n')
        : lang === 'en'
        ? [
            'Hi! 👋 I’m your personal AI assistant from TemoWeb.',
            'Tell me your business and where leads come from — I’ll suggest the right package + timeline. ⚡️',
          ].join('\n')
        : [
            'Здравствуйте! 👋 Я персональный AI‑ассистент TemoWeb.',
            'Подскажите, пожалуйста, ваш бизнес и откуда сейчас идут заявки — и я подберу пакет + сроки. ⚡️',
          ].join('\n')
    try {
      await sendInstagramMessage(fromId, dmText)
      if (plus) {
        // Seed conversation so next DM continues with main system (and avoid re-sending).
        const c = getConversation(fromId)
        const seededHistory = Array.isArray(c.history) ? c.history : []
        const nextHistory: ConversationMessage[] = [...seededHistory, { role: 'assistant' as const, content: dmText }].slice(-24) as any
        updateConversation(fromId, {
          lang,
          stage: 'qualify',
          history: nextHistory,
          lastAssistantAt: nowIso(),
          lastPlusDmAt: nowIso(),
        } as any)
      }
    } catch {
      // ignore
    }
  }

  recordInstagramWebhook({
    senderId: fromId || null,
    textPreview: clip(
      `comment:${fromUsername ? `${fromUsername}: ` : ''}${text}${sentOk ? ' ✅replied' : lastErr ? ` ❌${lastErr}` : ''} [dm:${dmReason}]`,
      120
    ),
    commentId: usedCommentId || (commentIdPrimary || commentIdFallback) || null,
    commentReplyId: replyId,
    commentReplyOk: sentOk,
    commentReplyError: sentOk ? null : lastErr,
  })

  return { processed: sentOk }
}

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

function sanitizeInstagramText(input: string) {
  let t = String(input || '')
  // Remove control characters that can truncate rendering on some clients/APIs.
  t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  // Remove line separators / zero-width chars that sometimes break Meta rendering.
  t = t.replace(/[\u2028\u2029\u200B-\u200F\uFEFF]/g, '')
  // Normalize whitespace
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  // Avoid weird endings like ".." (happens after guardrails neutralize extra "?")
  t = t.replace(/\.{2,}$/g, '.')
  return t
}

function trimToLastCompleteSentence(text: string) {
  const t = String(text || '').trim()
  if (!t) return t
  // If it already ends cleanly, keep as-is (but normalize trailing dots).
  if (/[.!?…]$/.test(t)) return t.replace(/\.{2,}$/g, '.')
  // Try cut to last sentence end.
  const m = t.match(/[\s\S]*[.!?…]/)
  if (m && typeof m[0] === 'string' && m[0].trim().length >= 40) return m[0].trim().replace(/\.{2,}$/g, '.')
  return t
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
  if (isUkrainianText(t) || /(\b(ви|ваші)\b)/i.test(t)) return 'ua'
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
    askContact: [
      'Отлично, задачу понял ✅',
      '—',
      'Чтобы зафиксировать заявку, пришлите, пожалуйста ЛЮБОЙ один контакт:',
      '— телефон 📞',
      '— или email ✉️',
      '',
      'Если дадите оба — супер, но это НЕ обязательно.',
    ].join('\n'),
  }
  const UA: Record<string, string> = {
    chooseLang: ['Вітаю! 👋 Я персональний AI‑асистент TemoWeb.', 'Оберіть зручну мову:', '1) Русский 🇷🇺', '2) Українська 🇺🇦'].join('\n'),
    askRepeating: 'Чудово ✅ Напишіть, будь ласка, одним повідомленням, що потрібно — я відповім. 🙂',
    contactOk: ['Дякую! ✅ Контакт отримав.', '—', 'Перегляну деталі й повернусь з конкретним планом.', 'Для точності: ніша + середній чек + джерело заявок. 💬'].join('\n'),
    contactFix: ['Схоже, контакт вказаний не повністю. 🙌', 'Надішліть, будь ласка, коректно:', '— email (name@domain.com)', '— телефон (+380..., +49..., +7...)', '— або Telegram @username'].join('\n'),
    askContact: [
      'Чудово, задачу зрозумів ✅',
      '—',
      'Щоб зафіксувати заявку, надішліть, будь ласка БУДЬ‑ЯКИЙ один контакт:',
      '— телефон 📞',
      '— або email ✉️',
      '',
      'Якщо надішлете і телефон, і email — класно, але це НЕ обовʼязково.',
    ].join('\n'),
  }
  const EN: Record<string, string> = {
    chooseLang: ['Hi! 👋 I’m your personal AI assistant of TemoWeb.', 'Choose a language:', '1) Русский 🇷🇺', '2) Українська 🇺🇦'].join('\n'),
    askRepeating: 'Great ✅ Please write in one message what you need — I’ll reply. 🙂',
    contactOk: ['Thanks! ✅ I got your contact.', '—', 'I’ll review details and come back with a clear plan.', 'To be precise: niche + avg ticket + lead source. 💬'].join('\n'),
    contactFix: ['Looks like the contact is incomplete. 🙌', 'Please send correctly:', '— email (name@domain.com)', '— phone (+... )'].join('\n'),
    askContact: [
      'Got it ✅',
      '—',
      'To lock the request, please send ANY ONE contact:',
      '— phone 📞',
      '— or email ✉️',
      '',
      'Both is nice, but NOT required.',
    ].join('\n'),
  }
  return (lang === 'ua' ? UA : lang === 'en' ? EN : RU)[key] || key
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
  if (/(english|англ|speak\s+english|in\s+english)/i.test(t)) return 'en'
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

function detectResendContactIntent(text: string) {
  const t = String(text || '').trim().toLowerCase()
  if (!t) return false
  // Explicit resend-only intent (we'll re-capture and re-send ONLY after this agreement).
  return /(ще\s+раз|еще\s+раз|знову|повтор(но|и)?|дубл(ю|юю|иру)|перешлю|перекину|скину\s+снова|отправлю\s+снова|надішлю\s+ще\s+раз|відправлю\s+ще\s+раз|send\s+again)/i.test(
    t,
  )
}

function detectResetIntent(text: string) {
  const t = String(text || '').trim().toLowerCase()
  if (!t) return false
  return (
    /^(давай\s+заново|заново|с\s*начала|сначала|по\s*новой|з\s*нуля|обнули|обнулить|reset|restart|start\s*over)\b/i.test(t) ||
    /\b(давай\s+заново|почнемо\s+заново|почати\s+заново|з\s*нуля|обнули|reset|restart|start\s*over)\b/i.test(t)
  )
}

function extractEmail(text: string) {
  const email = String(text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
  return email ? email.trim() : null
}

function extractPhone(text: string) {
  const phoneMatch = String(text || '').match(/\+?\d[\d\s().-]{7,}/)?.[0]
  if (!phoneMatch) return null
  const cleaned = phoneMatch.replace(/[^\d+]/g, '')
  const digits = cleaned.replace(/[^\d]/g, '')
  if (digits.length < 8) return null
  return cleaned
}

function extractContactDraft(text: string): ConversationContactDraft | null {
  const email = extractEmail(text)
  const phone = extractPhone(text)
  if (!email && !phone) return null
  return { email: email || null, phone: phone || null }
}

function hasInvalidContactHint(text: string) {
  // If user tries to send contact but it doesn't match any pattern, ask again.
  const hasAt = text.includes('@')
  const hasDigits = /\d{6,}/.test(text)
  return (hasAt || hasDigits) && !extractContactDraft(text)
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

// We avoid hard-truncation; long answers are split into multiple messages.
// This is a soft cap only (guardrails), NOT a hard-cut for sending.
const IG_DM_MAX_CHARS = Number(process.env.INSTAGRAM_DM_MAX_CHARS || 6000)
const IG_DM_SOFT_CTA_MIN_SCORE = Number(process.env.INSTAGRAM_DM_SOFT_CTA_MIN_SCORE || 60)

function countQuestionMarks(text: string) {
  return (String(text || '').match(/\?/g) || []).length
}

function keepSingleQuestion(text: string) {
  // Keep only the first "?" and neutralize the rest to avoid multi-question "резина".
  const s = String(text || '')
  let seen = false
  let out = ''
  for (const ch of s) {
    if (ch === '?') {
      if (seen) out += '.'
      else {
        out += '?'
        seen = true
      }
    } else out += ch
  }
  return out
}

function limitParagraphs(text: string, maxParas: number) {
  const paras = String(text || '').split(/\n{2,}/).filter((p) => p.trim().length > 0)
  if (paras.length <= maxParas) return String(text || '').trim()
  return paras.slice(0, maxParas).join('\n\n').trim()
}

function truncatePreservingLastLine(text: string, maxChars: number) {
  const t = String(text || '').trim()
  if (t.length <= maxChars) return t
  const lines = t.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const last = lines.length ? lines[lines.length - 1] : ''
  const keepLast = containsContactAsk(last) || /наступн|далі|дальше|щоб\s+продовж|чтобы\s+продолж/i.test(last)
  if (!keepLast) return clip(t, maxChars)

  const reserved = Math.min(last.length + 2, Math.floor(maxChars * 0.6))
  const headMax = Math.max(80, maxChars - reserved)
  const head = clip(lines.slice(0, -1).join('\n').trim(), headMax).trim()
  return `${head}\n${last}`.trim()
}

function splitTextIntoParts(input: string, partMaxChars: number, maxParts: number) {
  const raw = sanitizeInstagramText(input || '')
  if (!raw) return []
  if (raw.length <= partMaxChars) return [raw]

  const parts: string[] = []
  let remaining = raw

  const pushPart = (p: string) => {
    const s = sanitizeInstagramText(p)
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

    // Prefer paragraph boundaries.
    const chunks = trySplitByParagraph(remaining, partMaxChars)
    if (chunks && chunks.length > 0) {
      pushPart(chunks[0])
      remaining = chunks.slice(1).join('\n\n').trim()
      continue
    }

    // Next: sentence boundary.
    const slice = remaining.slice(0, partMaxChars)
    const m = slice.match(/[\s\S]*[.!?…]\s/)
    if (m && m[0] && m[0].trim().length >= Math.min(120, Math.floor(partMaxChars * 0.35))) {
      pushPart(m[0].trim())
      remaining = remaining.slice(m[0].length).trim()
      continue
    }

    // Fallback: hard cut without ellipsis (we will send next part).
    pushPart(slice.trim())
    remaining = remaining.slice(slice.length).trim()
  }

  if (remaining.length > 0 && parts.length >= maxParts) {
    const last = parts[parts.length - 1] || ''
    parts[parts.length - 1] = clip(last, Math.max(120, partMaxChars - 1))
  }

  return parts.filter(Boolean)
}

function softCtaLine(lang: ConversationLang) {
  return lang === 'ua'
    ? 'Щоб продовжити — надішліть, будь ласка, телефон або email.'
    : 'Чтобы продолжить — пришлите, пожалуйста, телефон или email.'
}

function enforceIgDirectGuardrails(input: {
  reply: string
  lang: ConversationLang
  nextStage: string
  readinessScore: number
  recentContactAsk: boolean
}) {
  let out = String(input.reply || '').trim()
  out = out.replace(/\n{3,}/g, '\n\n')

  // Hard: max 1 question per message
  if (countQuestionMarks(out) > 1) out = keepSingleQuestion(out)

  // Keep it short: fewer paragraphs unless it's OFFER
  const maxParas = input.nextStage === 'offer' ? 5 : 3
  out = limitParagraphs(out, maxParas)

  // Stronger funnel: add a soft CTA when user is warm/hot and we haven't asked recently
  if (input.nextStage !== 'ask_contact' && input.readinessScore >= IG_DM_SOFT_CTA_MIN_SCORE && !input.recentContactAsk) {
    out = `${out}\n\n${softCtaLine(input.lang)}`
  }

  // Soft cap only: we will split into multiple messages when sending.
  // Keep it high enough to never cut package comparisons.
  if (out.length > IG_DM_MAX_CHARS) out = out.slice(0, IG_DM_MAX_CHARS).trim()
  return out.trim()
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

  const intent = detectAiIntent(userText || '')
  const supportRules = intent.isSupport
    ? [
        lang === 'ua'
          ? 'SUPPORT MODE: користувач має проблему або вже налаштовану систему. Перейдіть у режим підтримки. Питайте: канал, що саме зламалось, коли почалось. Не продавайте пакети.'
          : 'SUPPORT MODE: клиент сообщает о проблеме или уже подключенной системе. Перейдите в режим поддержки. Спросите: канал, что сломалось, когда началось. Не продавайте пакеты.',
      ]
    : []
  const system = buildTemoWebSystemPrompt({
    lang,
    channel: 'instagram',
    stage: computeStageHeuristic(userText, readinessScore),
    readinessScore,
    extraRules: supportRules,
  })
  const historyMsgs = history.slice(-16).map((m) => ({ role: m.role, content: m.content }))
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
      model: OPENAI_MODEL_INSTAGRAM,
      messages: [
        { role: 'system', content: system },
        ...(isFirstAssistantMsg ? [{ role: 'system', content: firstMsgRule }, { role: 'system', content: firstMsgLangAsk }] : []),
        ...historyMsgs,
        { role: 'user', content: userContent },
      ],
      temperature: 0.65,
      presence_penalty: 0.2,
      frequency_penalty: 0.2,
      max_tokens: 520,
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
  const finishReason = json?.choices?.[0]?.finish_reason
  if (typeof content !== 'string') {
    return {
      reply: lang === 'ua' ? 'Дай 1–2 деталі по бізнесу — і я зберу рішення. 💡' : 'Дай 1–2 детали по бизнесу — и я соберу решение. 💡',
      provider: 'fallback' as const,
      detail: 'openai_bad_response',
    }
  }
  // Strip markdown-ish formatting that sometimes appears (**bold**, *bullets*).
  // Keep it plain-text for Instagram DM.
  let out = content.trim()
  out = out.replace(/\*\*/g, '')
  out = out.replace(/\*(?=\S)/g, '')
  out = out.replace(/(^|\n)\s*\*\s+/g, '$1— ')
  out = out.replace(/\n{3,}/g, '\n\n')
  if (finishReason === 'length') out = trimToLastCompleteSentence(out)
  out = sanitizeInstagramText(out)
  return {
    reply: clip(out.trim(), 1000),
    provider: 'openai' as const,
    detail: finishReason === 'length' ? 'openai_truncated_length' : null,
  }
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
  history: ConversationMessage[]
}) {
  const OPENAI_API_KEY = getOpenAiKey()
  if (!OPENAI_API_KEY) return null

  const payload = {
    readiness: input.readiness,
    transcript: input.history.slice(-20).map((m) => ({ role: m.role, content: clip(m.content, 320) })),
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
        max_tokens: 420,
        messages: [
          {
            role: 'system',
            content: [
              langLine,
              'Сделай сильное, ПРАВДИВОЕ резюме лида для CRM TemoWeb — как опытный менеджер, который будет продолжать общение.',
              'Можно использовать только данные из JSON (ничего не выдумывать).',
              'Формат: 7–10 строк, каждая начинается с эмодзи. Коротко, но максимально информативно.',
              'Первая строка — готовность покупки: 🟢/🟡/🟠/🔴 + label + score.',
              'Дальше ОБЯЗАТЕЛЬНО:',
              '🏷 бізнес/ніша (якщо є)',
              '🎯 що хоче (1 речення)',
              '🧩 що обговорили / до чого дійшли (якщо є рішення)',
              '⛔️ обмеження/умови (канали, бюджет, “1 канал”, сроки, оплата/запис тощо)',
              '➡️ наступний крок (дзвінок/демо/доступи/оплата/інтеграції)',
              'Если клиент “сам не знает” — так и напиши: "не до кінця сформулював потребу" + что нужно уточнить одним вопросом.',
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
  phone: string | null
  email: string | null
  clientMessages: string[]
  lastMessage: string
  lang: ConversationLang
  aiSummary: string | null
  aiReadiness: LeadReadiness
}) {
  ensureLeadsFile()
  const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'))
  const contact = (input.phone || input.email || '').trim()
  if (!contact) throw new Error('missing_contact')
  const newLead = {
    id: Date.now(),
    name: null,
    contact,
    email: input.email,
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
    notes: `senderId: ${input.senderId}`,
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
  const parts = splitTextIntoParts(text, 900, 8)
  if (!parts.length) return

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

    let allOk = true
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i]
      const body = {
        recipient: { id: recipientId },
        messaging_type: 'RESPONSE',
        message: { text: clip(part, 1000) },
      }
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Both hosts accept Authorization header; it's REQUIRED for graph.instagram.com per docs.
          Authorization: `Bearer ${IG_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(body),
      })
      lastStatus = resp.status
      if (resp.ok) {
        if (i < parts.length - 1) await sleep(180)
        continue
      }
      const respText = await resp.text().catch(() => '')
      lastBodyPreview = respText.slice(0, 400)
      allOk = false
      break
    }

    if (allOk) {
      console.log('Instagram send ok', { recipientId, parts: parts.length })
      return
    }

    // Retry only for transient/server-side errors or known transient OAuth error.
    let isTransient = (lastStatus || 500) >= 500
    try {
      const parsed = JSON.parse(lastBodyPreview) as any
      const code = parsed?.error?.code
      const transient = parsed?.error?.is_transient
      if (transient === true) isTransient = true
      if (code === 2) isTransient = true // service temporarily unavailable
    } catch {
      // ignore
    }

    console.error('Instagram send error', {
      attempt: attempt + 1,
      status: lastStatus,
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
  aiSummary,
  leadId,
}: {
  senderId: string
  messageText: string
  contactHint: string | null
  aiSummary: string | null
  leadId: number | null
}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Telegram is not configured for IG leads')
    return false
  }

  const parts = [
    '📥 НОВА ЗАЯВКА З INSTAGRAM',
    '',
    leadId != null ? `🆔 Lead ID: ${leadId}` : null,
    `🧾 Контакт (IG): ${senderId}`,
    contactHint ? `☎️ Контакт клієнта: ${contactHint}` : '☎️ Контакт клієнта: —',
    '',
    aiSummary ? ['🧠 Резюме (AI):', clip(aiSummary, 1200), ''].join('\n') : null,
    '🗣 Повідомлення клієнта:',
    `— ${clip(messageText, 800)}`,
    '',
    `🕒 Час: ${new Date().toISOString()}`,
  ]
    .filter(Boolean)

  const text = parts.join('\n')
  const retryMs = [0, 350, 1200]
  try {
    for (let i = 0; i < retryMs.length; i += 1) {
      if (retryMs[i]) await sleep(retryMs[i])
      const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          disable_web_page_preview: true,
        }),
      })
      if (resp.ok) {
        console.log('Telegram lead sent (IG)', { senderIdLast4: senderId.slice(-4) })
        return true
      }
      const body = await resp.text().catch(() => '')
      console.error('Telegram send error (IG lead)', { attempt: i + 1, status: resp.status, body: body.slice(0, 300) })
    }
    return false
  } catch (e) {
    console.error('Telegram send exception (IG lead)', e)
    return false
  }
}

async function handleIncomingMessage(senderId: string, text: string, media: IncomingMedia[]) {
  const conversation = getConversation(senderId)
  const maybeLang = parseLangChoice(text)
  const requestedLang = parseLangSwitch(text) || maybeLang
  // Start ALWAYS in Ukrainian by default. Switch only when user explicitly asks.
  const lang: ConversationLang | null = conversation.lang || requestedLang || 'ua'

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
  if (!conversation.lang) {
    updateConversation(senderId, { lang, pendingText: null })
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
    const nextHistory: ConversationMessage[] = [...conversation.history, { role: 'user' as const, content: text }, { role: 'assistant' as const, content: ai.reply }].slice(-24) as any
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

    const history: ConversationMessage[] = [...conversation.history, { role: 'user' as const, content: text }, { role: 'assistant' as const, content: reply }].slice(-24) as ConversationMessage[]
    updateConversation(senderId, { stage: conversation.stage === 'new' ? 'qualify' : conversation.stage, history })
    await sendInstagramMessage(senderId, reply)
    updateConversation(senderId, { lastAssistantAt: nowIso() })
    return
  }

  const history: ConversationMessage[] = [...conversation.history, { role: 'user' as const, content: text }].slice(-24) as ConversationMessage[]
  const userTurns = history.filter((m) => m.role === 'user').length
  const draftFromText = extractContactDraft(text)
  const readinessScore = computeReadinessScoreHeuristic(text, userTurns)

  // Always store the message first
  updateConversation(senderId, { history, lastUserAt: nowIso() })

  if (!isAllowedSender(senderId)) {
    console.log('IG webhook: sender not in allowlist; skipping auto-reply', { senderId })
    return
  }

  // Resend mode: if lead already created, we resend ONLY after explicit agreement.
  // 1) User asks to resend -> arm mode, ask for contact again.
  // 2) Next message contains contact -> create & send NEW lead + notify Telegram, then disarm.
  if (conversation.leadId != null) {
    const resendArmed = Boolean((conversation as any).resendArmed)
    if (detectResendContactIntent(text) && !resendArmed) {
      updateConversation(senderId, { resendArmed: true, stage: 'ask_contact' } as any)
      await sendInstagramMessage(
        senderId,
        lang === 'ua'
          ? 'Ок ✅ Домовились. Надішліть, будь ласка, контакт ще раз (телефон або email) — і я зафіксую повторно.'
          : 'Ок ✅ Договорились. Пришлите, пожалуйста, контакт ещё раз (телефон или email) — и я зафиксирую повторно.',
      )
      updateConversation(senderId, { lastAssistantAt: nowIso() })
      return
    }
    if (resendArmed && draftFromText) {
      const mergedDraft = { phone: draftFromText.phone || null, email: draftFromText.email || null }
      const hasAny = Boolean(mergedDraft.phone || mergedDraft.email)
      if (hasAny) {
        const readiness = { score: readinessScore, label: readinessLabel(readinessScore), stage: computeStageHeuristic(text, readinessScore) }
        const aiSummary =
          (await generateLeadAiSummary({
            lang,
            readiness,
            history,
          })) || null
        let leadId: number | null = null
        try {
          leadId = await saveLeadFromInstagram({
            senderId,
            phone: mergedDraft.phone,
            email: mergedDraft.email,
            clientMessages: history.filter((m) => m.role === 'user').map((m) => m.content),
            lastMessage: text,
            lang,
            aiSummary,
            aiReadiness: readiness,
          })
          console.log('IG lead saved (resend)', { leadId, senderIdLast4: senderId.slice(-4) })
        } catch (e) {
          console.error('IG lead resend save failed', { senderIdLast4: senderId.slice(-4), error: String(e) })
        }
        // Always disarm after one attempt (prevents spam loops)
        updateConversation(senderId, { resendArmed: false, leadId: leadId ?? conversation.leadId } as any)
        const hint = [mergedDraft.phone || null, mergedDraft.email || null].filter(Boolean).join(' | ')
        await sendTelegramLead({ senderId, messageText: text, contactHint: hint || null, aiSummary, leadId })
        await sendInstagramMessage(senderId, lang === 'ua' ? 'Готово ✅ Зафіксував повторно. Дякую!' : 'Готово ✅ Зафиксировал повторно. Спасибо!')
        updateConversation(senderId, { lastAssistantAt: nowIso() })
        return
      }
    }
  }

  // Contact capture: ONE of (phone/email) is enough to create a lead.
  if (conversation.leadId == null) {
    const existingDraft = conversation.contactDraft || { phone: null, email: null }
    const mergedDraft = {
      phone: draftFromText?.phone || existingDraft.phone,
      email: draftFromText?.email || existingDraft.email,
    }
    const hasAny = Boolean(mergedDraft.phone || mergedDraft.email)

    if (hasAny) updateConversation(senderId, { contactDraft: mergedDraft })

    if (hasAny) {
      const readiness = { score: readinessScore, label: readinessLabel(readinessScore), stage: computeStageHeuristic(text, readinessScore) }
      const aiSummary =
        (await generateLeadAiSummary({
          lang,
          readiness,
          history,
        })) || null
      let leadId: number | null = null
      try {
        leadId = await saveLeadFromInstagram({
          senderId,
          phone: mergedDraft.phone || null,
          email: mergedDraft.email || null,
          clientMessages: history.filter((m) => m.role === 'user').map((m) => m.content),
          lastMessage: text,
          lang,
          aiSummary,
          aiReadiness: readiness,
        })
        console.log('IG lead saved', { leadId, senderIdLast4: senderId.slice(-4), hasPhone: Boolean(mergedDraft.phone), hasEmail: Boolean(mergedDraft.email) })
      } catch (e) {
        console.error('IG lead save failed', { senderIdLast4: senderId.slice(-4), error: String(e) })
      }

      if (leadId == null) {
        updateConversation(senderId, { stage: 'ask_contact', history })
        await sendInstagramMessage(senderId, t(lang, 'askContact'))
        updateConversation(senderId, { lastAssistantAt: nowIso() })
        return
      }
      updateConversation(senderId, { stage: 'collected', leadId, history, contactDraft: null })
      const hint = [mergedDraft.phone || null, mergedDraft.email || null].filter(Boolean).join(' | ')
      const tgOk = await sendTelegramLead({ senderId, messageText: text, contactHint: hint || null, aiSummary, leadId })
      console.log('IG lead telegram status', { leadId, ok: Boolean(tgOk) })
      const ai = await generateAiReply({
        userText:
          'Client provided contact details (phone and/or email). Thank them, confirm that the request is saved, and say we will contact them to arrange the next step. Keep it short. Do NOT demand the missing contact.',
        lang,
        stage: 'collected',
        history,
        images: [],
      })
      recordInstagramAi({ provider: ai.provider, detail: ai.detail })
      const reply = ai.provider === 'openai' ? ai.reply : t(lang, 'contactOk')
      updateConversation(senderId, { history: [...history, { role: 'assistant' as const, content: reply }].slice(-24) })
      await sendInstagramMessage(senderId, reply)
      updateConversation(senderId, { lastAssistantAt: nowIso() })
      return
    }

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
    updateConversation(senderId, { history: [...history, { role: 'assistant' as const, content: reply }].slice(-24) })
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
  const intent = detectAiIntent(composedUserText || '')

  // Main rule: after language selection, NO hard-coded templates — all replies are from OpenAI.
  const ai = await generateAiReply({ userText: composedUserText, lang, stage: nextStage, history, images, readinessScore, channel: 'instagram' })
  // Guardrails for IG Direct:
  // - Avoid nagging: don't repeat contact ask every turn.
  // - But also avoid "резина": keep replies short and lead to next step when warm/hot.
  const recentAsks = history
    .filter((m) => m.role === 'assistant')
    .slice(-4)
    .some((m) => containsContactAsk(m.content))
  let reply = ai.reply
  if (nextStage !== 'ask_contact') {
    // Allow a soft CTA via enforceIgDirectGuardrails, but strip big contact blocks.
    reply = stripContactAskBlock(reply)
  } else if (recentAsks && containsContactAsk(reply)) {
    // Don't repeat contact request every turn.
    reply = stripContactAskBlock(reply)
  }
  reply = enforceIgDirectGuardrails({ reply, lang, nextStage, readinessScore, recentContactAsk: recentAsks })
  if (isPackageCompareRequest(text)) {
    reply = ensureAllPackagesMentioned(reply, lang === 'ru' ? 'ru' : 'ua')
  }
  if (lang === 'ru' || lang === 'ua') {
    if (!intent.isSupport) {
      reply = applyServicesRouter(reply, lang, intent)
      reply = applyPilotNudge(reply, lang, intent)
    }
    reply = applyChannelLimits(reply, 'instagram')
    const quality = evaluateQuality(reply, lang, intent, 'instagram')
    if (quality.missingPackages || quality.missingAddons || quality.tooLong || quality.noCta) {
      console.warn('IG AI quality flags', { quality, lang })
    }
  }
  recordInstagramAi({ provider: ai.provider, detail: ai.detail })
  updateConversation(senderId, { history: [...history, { role: 'assistant' as const, content: reply }].slice(-24) })
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
      model: OPENAI_MODEL_INSTAGRAM,
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

    // Newer Instagram Webhooks format uses entry[].changes[].*
    for (const change of changes) {
      if (change.field === 'messages') {
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
        continue
      }

      if (change.field === 'comments') {
        const r = await handleIncomingCommentChange(change)
        if (r.processed) processedCount += 1
        continue
      }
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

