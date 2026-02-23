import { appendMessage, getAllConversations, updateConversation, type TelegramConversation } from './conversationStore'

const FOLLOWUP_AFTER_MS = Number(process.env.TELEGRAM_FOLLOWUP_AFTER_MS || '') || 20 * 60 * 1000 // 20m
const POLL_MS = Number(process.env.TELEGRAM_FOLLOWUP_POLL_MS || '') || 60 * 1000 // 60s
// Enabled by default; disable explicitly if needed.
const ENABLED = (process.env.TELEGRAM_FOLLOWUP_ENABLED || '').trim() !== 'false'
const FOLLOWUP_MAX_DELAY_MS = Number(process.env.TELEGRAM_FOLLOWUP_MAX_DELAY_MS || '') || 90 * 60 * 1000 // 90m

const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim()

function nowIso() {
  return new Date().toISOString()
}

function clip(text: string, max = 800) {
  const s = String(text || '')
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

function inferLang(text: string): 'ru' | 'ua' {
  const t = String(text || '')
  return /[іїєґ]/i.test(t) ? 'ua' : 'ru'
}

function lastUserText(messages: Array<{ role: string; content: string }>) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') return String(messages[i].content || '').trim()
  }
  return ''
}

function getLastTimes(conv: TelegramConversation) {
  const msgs = Array.isArray(conv.messages) ? conv.messages : []
  let lastUserMs = NaN
  let lastAssistantMs = NaN
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    const m = msgs[i]
    const at = typeof m?.at === 'string' ? Date.parse(m.at) : NaN
    if (!Number.isFinite(at)) continue
    if (!Number.isFinite(lastUserMs) && m?.role === 'user') lastUserMs = at
    if (!Number.isFinite(lastAssistantMs) && m?.role === 'assistant') lastAssistantMs = at
    if (Number.isFinite(lastUserMs) && Number.isFinite(lastAssistantMs)) break
  }
  return { lastUserMs, lastAssistantMs }
}

function buildFollowUp(lang: 'ru' | 'ua', lastUser: string) {
  const last = clip(String(lastUser || ''), 120)
  if (lang === 'ua') {
    return [
      'Повернусь на хвилинку 🙂',
      last ? `Я правильно зрозумів: ${last}?` : 'Я правильно зрозумів запит?',
      'Якщо зручніше — залиште номер, я напишу вам у WhatsApp.',
    ].join('\n')
  }
  return [
    'Вернусь на минуту 🙂',
    last ? `Правильно понял: ${last}?` : 'Правильно понял запрос?',
    'Если удобнее — оставьте номер, я напишу вам в WhatsApp.',
  ].join('\n')
}

async function sendTelegramText(chatId: string, text: string) {
  if (!BOT_TOKEN) return false
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  const body = {
    chat_id: chatId,
    text: clip(text, 3500),
    disable_web_page_preview: true,
  }
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    console.error('Telegram followup send error', resp.status, t.slice(0, 300))
    return false
  }
  return true
}

async function tickOnce() {
  if (!BOT_TOKEN) return
  const now = Date.now()
  const all = getAllConversations()
  for (const chatId of Object.keys(all)) {
    const c = all[chatId]
    if (!c) continue
    if (c.leadCapturedAt) continue
    if (c.followUpSentAt) continue
    const { lastUserMs, lastAssistantMs } = getLastTimes(c)
    if (!Number.isFinite(lastUserMs) || !Number.isFinite(lastAssistantMs)) continue
    if (lastAssistantMs <= lastUserMs) continue
    if (now - lastUserMs > 23 * 60 * 60 * 1000) continue
    if (now - lastAssistantMs < FOLLOWUP_AFTER_MS) continue
    if (now - lastAssistantMs > FOLLOWUP_MAX_DELAY_MS) continue

    const lastU = lastUserText(c.messages || [])
    const lang = (c.lang === 'ua' ? 'ua' : c.lang === 'ru' ? 'ru' : inferLang(lastU)) as 'ru' | 'ua'
    const msg = buildFollowUp(lang, lastU)
    const ok = await sendTelegramText(chatId, msg)
    if (!ok) continue
    appendMessage(chatId, { role: 'assistant', content: msg })
    updateConversation(chatId, { followUpSentAt: nowIso() })
    console.log('Telegram followup sent', { chatIdLast4: chatId.slice(-4) })
  }
}

export function startTelegramFollowupScheduler() {
  if (!ENABLED) return
  const g = globalThis as any
  if (g.__tgFollowupStarted) return
  g.__tgFollowupStarted = true
  console.log('Telegram followup scheduler: enabled', { pollMs: POLL_MS, afterMs: FOLLOWUP_AFTER_MS })
  setInterval(() => void tickOnce(), POLL_MS)
  void tickOnce()
}

