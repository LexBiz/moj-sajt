import fs from 'fs'
import path from 'path'

export type TelegramRole = 'user' | 'assistant'

export type TelegramMessage = {
  role: TelegramRole
  content: string
  at: string
}

export type TelegramConversation = {
  chatId: string
  createdAt: string
  updatedAt: string
  lang: 'ru' | 'ua' | null
  pendingImageFileIds: string[]
  lastMediaAt: string | null
  followUpSentAt: string | null
  leadCapturedAt: string | null
  messages: TelegramMessage[]
}

const FILE =
  (process.env.TELEGRAM_CONVERSATIONS_FILE || '').trim() ||
  path.join(process.cwd(), 'data', 'telegram-conversations.json')

const MAX_MESSAGES = Number(process.env.TELEGRAM_MAX_MESSAGES || 30)

function ensureFile() {
  const dir = path.dirname(FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({}), 'utf8')
}

function readAll(): Record<string, TelegramConversation> {
  try {
    ensureFile()
    const raw = fs.readFileSync(FILE, 'utf8')
    const parsed = JSON.parse(raw)
    const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, TelegramConversation>) : {}
    // Backward-compatible normalization.
    for (const k of Object.keys(obj)) {
      const c: any = obj[k] || {}
      if (typeof c.lang === 'undefined') c.lang = null
      if (!Array.isArray(c.pendingImageFileIds)) c.pendingImageFileIds = []
      if (typeof c.lastMediaAt === 'undefined') c.lastMediaAt = null
      if (typeof c.followUpSentAt === 'undefined') c.followUpSentAt = null
      if (typeof c.leadCapturedAt === 'undefined') c.leadCapturedAt = null
      if (!Array.isArray(c.messages)) c.messages = []
      obj[k] = c
    }
    return obj
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, TelegramConversation>) {
  ensureFile()
  const tmp = `${FILE}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(all, null, 2), 'utf8')
  fs.renameSync(tmp, FILE)
}

export function getConversation(chatId: string): TelegramConversation {
  const key = String(chatId || '').trim()
  const all = readAll()
  const existing = all[key] || null
  if (existing) return existing
  const now = new Date().toISOString()
  const conv: TelegramConversation = {
    chatId: key,
    createdAt: now,
    updatedAt: now,
    lang: null,
    pendingImageFileIds: [],
    lastMediaAt: null,
    followUpSentAt: null,
    leadCapturedAt: null,
    messages: [],
  }
  all[key] = conv
  writeAll(all)
  return conv
}

export function appendMessage(chatId: string, msg: { role: TelegramRole; content: string }) {
  const key = String(chatId || '').trim()
  if (!key) return null
  const all = readAll()
  const base = all[key] || getConversation(key)
  const now = new Date().toISOString()
  const next: TelegramConversation = {
    ...base,
    updatedAt: now,
    messages: [...(Array.isArray(base.messages) ? base.messages : []), { role: msg.role, content: String(msg.content || ''), at: now }]
      .filter((m) => m.content && m.content.trim())
      .slice(-Math.max(6, Math.min(80, MAX_MESSAGES))),
  }
  all[key] = next
  writeAll(all)
  return next
}

export function updateConversation(chatId: string, patch: Partial<TelegramConversation>) {
  const key = String(chatId || '').trim()
  if (!key) return null
  const all = readAll()
  const base = all[key] || getConversation(key)
  const now = new Date().toISOString()
  const next: TelegramConversation = { ...base, ...patch, chatId: key, updatedAt: now }
  all[key] = next
  writeAll(all)
  return next
}

export function getAllConversations() {
  return readAll()
}

