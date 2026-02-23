import { listChannelConnections } from '@/app/lib/storage'
import { appendMessage, getAllConversations, updateConversationMeta } from './conversationStore'

const FOLLOWUP_AFTER_MS = Number(process.env.MESSENGER_FOLLOWUP_AFTER_MS || '') || 20 * 60 * 1000 // 20m
const POLL_MS = Number(process.env.MESSENGER_FOLLOWUP_POLL_MS || '') || 60 * 1000 // 60s
// Enabled by default; disable explicitly if needed.
const ENABLED = (process.env.MESSENGER_FOLLOWUP_ENABLED || '').trim() !== 'false'
const FOLLOWUP_MAX_DELAY_MS = Number(process.env.MESSENGER_FOLLOWUP_MAX_DELAY_MS || '') || 90 * 60 * 1000 // 90m

const API_HOST = (process.env.MESSENGER_API_HOST || 'graph.facebook.com').trim()
const API_VERSION = (process.env.MESSENGER_API_VERSION || 'v22.0').trim()
const DEFAULT_PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN || '').trim()

type ChannelConnection = {
  id: string
  tenantId: string
  channel: 'instagram' | 'whatsapp' | 'telegram' | 'website' | 'messenger'
  externalId: string | null
  meta?: Record<string, any> | null
  status: 'draft' | 'connected' | 'disabled'
}

function nowIso() {
  return new Date().toISOString()
}

function clip(text: string, max = 500) {
  const s = String(text || '')
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

function inferLang(text: string): 'ru' | 'ua' {
  const t = String(text || '').trim()
  if (/[іїєґ]/i.test(t)) return 'ua'
  return 'ru'
}

function getLastTimes(conv: { messages?: Array<{ role?: string; at?: string }> }) {
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

function lastUserText(messages: Array<{ role: string; content: string }>) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') return String(messages[i].content || '').trim()
  }
  return ''
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

async function resolvePageAccessToken(pageId: string) {
  const pid = String(pageId || '').trim()
  if (!pid) return null
  const conns = (await listChannelConnections()) as ChannelConnection[]
  const conn =
    conns.find((c) => {
      if (c.channel !== 'messenger') return false
      const ext = String(c.externalId || '').trim()
      if (ext && ext === pid) return true
      const meta: any = c.meta || {}
      const metaPid = String(meta.pageId || meta.page_id || meta.page || '').trim()
      return metaPid ? metaPid === pid : false
    }) || null
  if (!conn || conn.status === 'disabled') return null
  const token = String(conn?.meta?.pageAccessToken || DEFAULT_PAGE_ACCESS_TOKEN || '').trim()
  return token || null
}

const tokenCache = new Map<string, { token: string; at: number }>()
async function getPageTokenCached(pageId: string) {
  const pid = String(pageId || '').trim()
  if (!pid) return null
  const cached = tokenCache.get(pid)
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.token
  const token = await resolvePageAccessToken(pid)
  if (!token) return null
  tokenCache.set(pid, { token, at: Date.now() })
  return token
}

async function sendMessengerText(opts: { pageAccessToken: string; recipientId: string; text: string }) {
  const token = String(opts.pageAccessToken || '').trim()
  const rid = String(opts.recipientId || '').trim()
  const text = String(opts.text || '').trim()
  if (!token || !rid || !text) return false
  const url = `https://${API_HOST}/${API_VERSION}/me/messages?access_token=${encodeURIComponent(token)}`
  const body = {
    messaging_type: 'RESPONSE',
    recipient: { id: rid },
    message: { text: clip(text, 1800) },
  }
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    console.error('Messenger followup send error', resp.status, t.slice(0, 300))
    return false
  }
  return true
}

async function tickOnce() {
  const now = Date.now()
  const all = getAllConversations()
  for (const c of all) {
    if (!c) continue
    if (c.leadCapturedAt) continue
    if (c.followUpSentAt) continue
    const { lastUserMs, lastAssistantMs } = getLastTimes(c)
    if (!Number.isFinite(lastUserMs) || !Number.isFinite(lastAssistantMs)) continue
    if (lastAssistantMs <= lastUserMs) continue // last message wasn't from bot
    if (now - lastUserMs > 23 * 60 * 60 * 1000) continue
    if (now - lastAssistantMs < FOLLOWUP_AFTER_MS) continue
    if (now - lastAssistantMs > FOLLOWUP_MAX_DELAY_MS) continue

    const lang = (c.lang === 'ua' ? 'ua' : c.lang === 'ru' ? 'ru' : inferLang(lastUserText(c.messages || []))) as 'ru' | 'ua'
    const msg = buildFollowUp(lang, lastUserText(c.messages || []))
    const token = await getPageTokenCached(c.pageId)
    if (!token) continue
    const ok = await sendMessengerText({ pageAccessToken: token, recipientId: c.senderId, text: msg })
    if (!ok) continue
    appendMessage(c.pageId, c.senderId, { role: 'assistant', content: msg })
    updateConversationMeta(c.pageId, c.senderId, { followUpSentAt: nowIso() })
    console.log('Messenger followup sent', { pageId: c.pageId, senderIdLast4: c.senderId.slice(-4) })
  }
}

export function startMessengerFollowupScheduler() {
  if (!ENABLED) return
  const g = globalThis as any
  if (g.__msgrFollowupStarted) return
  g.__msgrFollowupStarted = true
  console.log('Messenger followup scheduler: enabled', { pollMs: POLL_MS, afterMs: FOLLOWUP_AFTER_MS })
  setInterval(() => void tickOnce(), POLL_MS)
  void tickOnce()
}

