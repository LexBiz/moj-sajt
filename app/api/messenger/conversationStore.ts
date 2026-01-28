import fs from 'fs'
import path from 'path'

export type MessengerRole = 'user' | 'assistant'

export type MessengerMessage = {
  role: MessengerRole
  content: string
  at: string
}

export type MessengerConversation = {
  id: string // `${pageId}:${senderId}`
  pageId: string
  senderId: string
  createdAt: string
  updatedAt: string
  // language preference for this conversation (default: ua)
  lang: 'ru' | 'ua' | null
  messages: MessengerMessage[]
}

const FILE = path.join(process.cwd(), 'data', 'messenger-conversations.json')
const MAX_MESSAGES = Number(process.env.MESSENGER_MAX_MESSAGES || 20)

function ensureFile() {
  const dir = path.dirname(FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([]), 'utf8')
}

function readAll(): MessengerConversation[] {
  try {
    ensureFile()
    const raw = fs.readFileSync(FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as MessengerConversation[]) : []
  } catch {
    return []
  }
}

function writeAll(all: MessengerConversation[]) {
  ensureFile()
  const tmp = `${FILE}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(all, null, 2), 'utf8')
  fs.renameSync(tmp, FILE)
}

export function getConversation(pageId: string, senderId: string): MessengerConversation {
  const pid = String(pageId || '').trim()
  const sid = String(senderId || '').trim()
  const id = `${pid}:${sid}`
  const all = readAll()
  const now = new Date().toISOString()
  const existing = all.find((c) => c.id === id) || null
  if (existing) return existing
  const conv: MessengerConversation = {
    id,
    pageId: pid,
    senderId: sid,
    createdAt: now,
    updatedAt: now,
    lang: null,
    messages: [],
  }
  all.unshift(conv)
  writeAll(all.slice(0, 5000))
  return conv
}

export function appendMessage(pageId: string, senderId: string, msg: { role: MessengerRole; content: string }) {
  const pid = String(pageId || '').trim()
  const sid = String(senderId || '').trim()
  if (!pid || !sid) return
  const id = `${pid}:${sid}`
  const all = readAll()
  const now = new Date().toISOString()
  const idx = all.findIndex((c) => c.id === id)
  const base = idx >= 0 ? all[idx] : getConversation(pid, sid)
  const next: MessengerConversation = {
    ...base,
    updatedAt: now,
    messages: [...(Array.isArray(base.messages) ? base.messages : []), { role: msg.role, content: String(msg.content || ''), at: now }]
      .filter((m) => m.content && m.content.trim())
      .slice(-Math.max(6, Math.min(60, MAX_MESSAGES))),
  }
  if (idx >= 0) all[idx] = next
  else all.unshift(next)
  writeAll(all.slice(0, 5000))
  return next
}

export function setConversationLang(pageId: string, senderId: string, lang: 'ru' | 'ua' | null) {
  const pid = String(pageId || '').trim()
  const sid = String(senderId || '').trim()
  if (!pid || !sid) return
  const id = `${pid}:${sid}`
  const all = readAll()
  const now = new Date().toISOString()
  const idx = all.findIndex((c) => c.id === id)
  const base = idx >= 0 ? all[idx] : getConversation(pid, sid)
  const next: MessengerConversation = { ...base, updatedAt: now, lang }
  if (idx >= 0) all[idx] = next
  else all.unshift(next)
  writeAll(all.slice(0, 5000))
  return next
}

