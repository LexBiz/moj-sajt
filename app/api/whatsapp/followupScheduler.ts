import { appendMessage, getAllConversations, updateConversation, type WhatsAppConversation } from './conversationStore'

const FOLLOWUP_AFTER_MS = Number(process.env.WHATSAPP_FOLLOWUP_AFTER_MS || '') || 20 * 60 * 1000 // 20m
const POLL_MS = Number(process.env.WHATSAPP_FOLLOWUP_POLL_MS || '') || 60 * 1000 // 60s
// Enabled by default; disable explicitly if needed.
const ENABLED = (process.env.WHATSAPP_FOLLOWUP_ENABLED || '').trim() !== 'false'
const FOLLOWUP_MAX_DELAY_MS = Number(process.env.WHATSAPP_FOLLOWUP_MAX_DELAY_MS || '') || 90 * 60 * 1000 // 90m

const ACCESS_TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim()
const PHONE_NUMBER_ID = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
const WHATSAPP_API_HOST = (process.env.WHATSAPP_API_HOST || 'graph.facebook.com').trim()
const WHATSAPP_API_VERSION = (process.env.WHATSAPP_API_VERSION || 'v22.0').trim()

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

function getLastTimes(conv: WhatsAppConversation) {
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
      'Якщо актуально — напишіть одним повідомленням: ніша + що хочете автоматизувати.',
    ].join('\n')
  }
  return [
    'Вернусь на минуту 🙂',
    last ? `Правильно понял: ${last}?` : 'Правильно понял запрос?',
    'Если актуально — напишите одним сообщением: ниша + что хотите автоматизировать.',
  ].join('\n')
}

async function sendWhatsAppText(to: string, text: string) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) return false
  const url = `https://${WHATSAPP_API_HOST}/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: clip(text, 1600) },
  }
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ACCESS_TOKEN}` },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    console.error('WhatsApp followup send error', resp.status, t.slice(0, 300))
    return false
  }
  return true
}

async function tickOnce() {
  const now = Date.now()
  const all = await getAllConversations()
  for (const from of Object.keys(all)) {
    const c = all[from]
    if (!c) continue
    if ((c as any).leadCapturedAt) continue
    if ((c as any).followUpSentAt) continue
    const { lastUserMs, lastAssistantMs } = getLastTimes(c)
    if (!Number.isFinite(lastUserMs) || !Number.isFinite(lastAssistantMs)) continue
    if (lastAssistantMs <= lastUserMs) continue
    if (now - lastUserMs > 23 * 60 * 60 * 1000) continue
    if (now - lastAssistantMs < FOLLOWUP_AFTER_MS) continue
    if (now - lastAssistantMs > FOLLOWUP_MAX_DELAY_MS) continue

    const lastU = lastUserText(c.messages || [])
    const lang = ((c as any).lang === 'ua' ? 'ua' : (c as any).lang === 'ru' ? 'ru' : inferLang(lastU)) as 'ru' | 'ua'
    const msg = buildFollowUp(lang, lastU)
    const ok = await sendWhatsAppText(from, msg)
    if (!ok) continue
    await appendMessage(from, { role: 'assistant', content: msg })
    await updateConversation(from, { followUpSentAt: nowIso() } as any)
    console.log('WhatsApp followup sent', { fromLast4: from.slice(-4) })
  }
}

export function startWhatsAppFollowupScheduler() {
  if (!ENABLED) return
  const g = globalThis as any
  if (g.__waFollowupStarted) return
  g.__waFollowupStarted = true
  console.log('WhatsApp followup scheduler: enabled', { pollMs: POLL_MS, afterMs: FOLLOWUP_AFTER_MS })
  setInterval(() => void tickOnce(), POLL_MS)
  void tickOnce()
}

