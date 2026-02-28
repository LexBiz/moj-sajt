import { getAllConversations, updateConversation, type ConversationLang, type ConversationMessage } from './conversationStore'
import { readTokenFile } from './oauth/_store'

const FOLLOWUP_AFTER_MS = Number(process.env.INSTAGRAM_FOLLOWUP_AFTER_MS || '') || 20 * 60 * 1000 // 20m
const POLL_MS = Number(process.env.INSTAGRAM_FOLLOWUP_POLL_MS || '') || 60 * 1000 // 60s
// Enabled by default; disable explicitly if needed.
const ENABLED = (process.env.INSTAGRAM_FOLLOWUP_ENABLED || '').trim() !== 'false'

const IG_USER_ID = (process.env.INSTAGRAM_IG_USER_ID || '').trim()
const IG_API_HOST = (process.env.INSTAGRAM_API_HOST || 'graph.facebook.com').trim()
const IG_API_VERSION = (process.env.INSTAGRAM_API_VERSION || 'v24.0').trim()
const FOLLOWUP_MAX_DELAY_MS = Number(process.env.INSTAGRAM_FOLLOWUP_MAX_DELAY_MS || '') || 90 * 60 * 1000 // 90m

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

function buildFollowUp(params: { lang: ConversationLang; lastUser: string }) {
  const last = clip(String(params.lastUser || ''), 120)
  if (params.lang === 'ua') {
    return [
      'Повернусь на хвилинку 🙂',
      last ? `Я правильно зрозумів: ${last}?` : 'Я правильно зрозумів запит?',
      'Якщо зручніше — залиште номер, я напишу вам у WhatsApp.',
    ].join('\n')
  }
  if (params.lang === 'en') {
    return [
      'Quick follow‑up 🙂',
      last ? `Did I get it right: ${last}?` : 'Did I get it right?',
      'If it’s easier, drop your phone number and I’ll message you on WhatsApp.',
    ].join('\n')
  }
  return [
    'Вернусь на минуту 🙂',
    last ? `Правильно понял: ${last}?` : 'Правильно понял запрос?',
    'Если удобнее — оставьте номер, я напишу вам в WhatsApp.',
  ].join('\n')
}

async function tickOnce() {
  const all = await getAllConversations()
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
    if (now - lastAssistantMs > FOLLOWUP_MAX_DELAY_MS) continue

    const lastUser = lastUserText(Array.isArray(c.history) ? c.history : [])
    const msg = buildFollowUp({ lang: c.lang, lastUser })
    if (!msg.trim()) continue

    const sent = await sendInstagramMessage(senderId, msg)
    if (!sent.ok) continue

    const nextHistory: ConversationMessage[] = [...(Array.isArray(c.history) ? c.history : []), { role: 'assistant' as const, content: msg }].slice(-12) as any
    await updateConversation(senderId, {
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


