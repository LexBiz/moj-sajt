import { getAllConversations, updateConversation, type ConversationLang, type ConversationMessage } from './conversationStore'
import { buildTemoWebSystemPrompt, computeReadinessScoreHeuristic, computeStageHeuristic } from '../temowebPrompt'
import { readTokenFile } from './oauth/_store'

const FOLLOWUP_AFTER_MS = Number(process.env.INSTAGRAM_FOLLOWUP_AFTER_MS || '') || 3 * 60 * 60 * 1000 // 3h
const POLL_MS = Number(process.env.INSTAGRAM_FOLLOWUP_POLL_MS || '') || 60 * 1000 // 60s
const ENABLED = (process.env.INSTAGRAM_FOLLOWUP_ENABLED || '').trim() === 'true'

const IG_USER_ID = (process.env.INSTAGRAM_IG_USER_ID || '').trim()
const IG_API_HOST = (process.env.INSTAGRAM_API_HOST || 'graph.facebook.com').trim()
const IG_API_VERSION = (process.env.INSTAGRAM_API_VERSION || 'v24.0').trim()

function nowIso() {
  return new Date().toISOString()
}

function clip(text: string, max = 1000) {
  const s = String(text || '')
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

function getAccessToken() {
  const envToken = (process.env.INSTAGRAM_ACCESS_TOKEN || '').trim()
  if (envToken) return envToken
  const saved = (readTokenFile()?.accessToken || '').trim()
  return saved
}

async function sendInstagramMessage(recipientId: string, text: string) {
  const IG_ACCESS_TOKEN = getAccessToken()
  if (!IG_ACCESS_TOKEN || !IG_USER_ID) return { ok: false, error: 'missing_token_or_user_id' as const }

  const urlObj = new URL(`https://${IG_API_HOST}/${IG_API_VERSION}/${IG_USER_ID}/messages`)
  if (IG_API_HOST !== 'graph.instagram.com') {
    urlObj.searchParams.set('access_token', IG_ACCESS_TOKEN)
  }
  const body = {
    recipient: { id: recipientId },
    messaging_type: 'RESPONSE',
    message: { text: clip(text, 1000) },
  }

  const resp = await fetch(urlObj.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${IG_ACCESS_TOKEN}` },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    console.error('IG followup send error', resp.status, t.slice(0, 300))
    return { ok: false, error: `http_${resp.status}` as const }
  }
  return { ok: true as const }
}

function lastUserText(history: ConversationMessage[]) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.role === 'user') return String(history[i].content || '').trim()
  }
  return ''
}

async function generateFollowUp(params: { lang: ConversationLang; history: ConversationMessage[] }) {
  const apiKey = (process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '').trim()
  if (!apiKey) return null

  const userTurns = params.history.filter((m) => m.role === 'user').length
  const lastUser = lastUserText(params.history)
  const readinessScore = computeReadinessScoreHeuristic(lastUser, userTurns)
  const stage = 'FOLLOW_UP'

  const system = buildTemoWebSystemPrompt({
    lang: params.lang,
    channel: 'instagram',
    stage,
    readinessScore,
  })

  const instruction =
    params.lang === 'ua'
      ? 'Клієнт мовчить ~3 години після Вашого останнього повідомлення. Напишіть ОДНЕ коротке follow‑up повідомлення (2–5 рядків), без спаму і БЕЗ прохання контакту. 1 людська фраза + 1 чітке питання по бізнесу/потребі. Обовʼязково на "Ви".'
      : params.lang === 'en'
      ? 'Client has been silent ~3 hours after your last message. Write ONE short follow-up (2–5 lines), no spam and NO contact request. 1 human line + 1 clear business question.'
      : 'Клиент молчит ~3 часа после вашего последнего сообщения. Напишите ОДНО короткое follow‑up сообщение (2–5 строк), без спама и БЕЗ просьбы контакта. 1 человеческая фраза + 1 четкий вопрос по бизнесу/потребности. Обязательно на "Вы".'

  const historyMsgs = params.history.slice(-10).map((m) => ({ role: m.role, content: clip(m.content, 420) }))
  const modelRaw = String(process.env.OPENAI_MODEL || 'gpt-4o-mini')
  const model = modelRaw.trim().replace(/[‐‑‒–—−]/g, '-')
  const modelLower = model.toLowerCase()
  const messages = [{ role: 'system', content: system }, { role: 'system', content: instruction }, ...historyMsgs]

  const isGpt5 = modelLower.startsWith('gpt-5') || modelLower.startsWith('gpt5')
  const maxKey = isGpt5 ? 'max_completion_tokens' : 'max_tokens'
  const body: any = { model, messages }
  if (!isGpt5) body.temperature = 0.55
  body[maxKey] = 160

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })
  if (!resp.ok) return null
  const json = (await resp.json()) as any
  const content =
    typeof json?.output_text === 'string'
      ? json.output_text
      : typeof json?.choices?.[0]?.message?.content === 'string'
        ? json.choices[0].message.content
        : null
  const out = typeof content === 'string' ? content.trim() : ''
  return out ? out.slice(0, 800) : null
}

async function tickOnce() {
  const all = getAllConversations()
  const now = Date.now()

  for (const senderId of Object.keys(all)) {
    const c = all[senderId]
    if (!c) continue
    if (!c.lang) continue
    if (c.leadId != null) continue // lead already created
    if (c.stage === 'collected' || c.stage === 'done') continue
    if (c.followUpSentAt) continue // already sent
    if (!c.lastAssistantAt || !c.lastUserAt) continue

    const lastAssistantMs = Date.parse(c.lastAssistantAt)
    const lastUserMs = Date.parse(c.lastUserAt)
    if (!Number.isFinite(lastAssistantMs) || !Number.isFinite(lastUserMs)) continue

    // Only if the last message was from the bot.
    if (lastAssistantMs <= lastUserMs) continue

    // Only within the 24h window since the last user message.
    if (now - lastUserMs > 23 * 60 * 60 * 1000) continue

    if (now - lastAssistantMs < FOLLOWUP_AFTER_MS) continue

    const msg = await generateFollowUp({ lang: c.lang, history: Array.isArray(c.history) ? c.history : [] })
    if (!msg) continue

    const sent = await sendInstagramMessage(senderId, msg)
    if (!sent.ok) continue

    const nextHistory: ConversationMessage[] = [...(Array.isArray(c.history) ? c.history : []), { role: 'assistant' as const, content: msg }].slice(-12) as any
    updateConversation(senderId, {
      followUpSentAt: nowIso(),
      lastAssistantAt: nowIso(),
      history: nextHistory,
    })
    console.log('IG followup sent', { senderId, at: nowIso() })
  }
}

export function startInstagramFollowupScheduler() {
  if (!ENABLED) return
  const g = globalThis as any
  if (g.__igFollowupStarted) return
  g.__igFollowupStarted = true

  console.log('IG followup scheduler: enabled', { pollMs: POLL_MS, afterMs: FOLLOWUP_AFTER_MS })
  // fire-and-forget interval
  setInterval(() => {
    void tickOnce()
  }, POLL_MS)
  // initial tick
  void tickOnce()
}


