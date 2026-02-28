import fs from 'fs'
import path from 'path'
import { getConversationState, listConversationState, setConversationState } from '@/app/lib/conversationStateDb'

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
const SCOPE = 'telegram'

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

function hydrate(conv: Partial<TelegramConversation> | null | undefined, key: string): TelegramConversation {
  const now = new Date().toISOString()
  return {
    chatId: key,
    createdAt: String(conv?.createdAt || now),
    updatedAt: String(conv?.updatedAt || now),
    lang: conv?.lang === 'ru' ? 'ru' : conv?.lang === 'ua' ? 'ua' : null,
    pendingImageFileIds: Array.isArray(conv?.pendingImageFileIds) ? conv.pendingImageFileIds : [],
    lastMediaAt: typeof conv?.lastMediaAt === 'string' ? conv.lastMediaAt : null,
    followUpSentAt: typeof conv?.followUpSentAt === 'string' ? conv.followUpSentAt : null,
    leadCapturedAt: typeof conv?.leadCapturedAt === 'string' ? conv.leadCapturedAt : null,
    messages: Array.isArray(conv?.messages) ? conv.messages.filter((m: any) => m && typeof m.content === 'string').slice(-Math.max(6, Math.min(80, MAX_MESSAGES))) : [],
  }
}

export async function getConversation(chatId: string): Promise<TelegramConversation> {
  const key = String(chatId || '').trim()
  const fromDb = await getConversationState<TelegramConversation>(SCOPE, key)
  if (fromDb) return hydrate(fromDb, key)
  const all = readAll()
  const existing = all[key] || null
  if (existing) return hydrate(existing, key)
  const conv: TelegramConversation = hydrate(null, key)
  all[key] = conv
  writeAll(all)
  await setConversationState(SCOPE, key, conv)
  return conv
}

export async function appendMessage(chatId: string, msg: { role: TelegramRole; content: string }) {
  const key = String(chatId || '').trim()
  if (!key) return null
  const current = (await getConversationState<TelegramConversation>(SCOPE, key)) || null
  const all = current ? null : readAll()
  const base = current ? hydrate(current, key) : all?.[key] ? hydrate(all[key], key) : await getConversation(key)
  const now = new Date().toISOString()
  const next: TelegramConversation = {
    ...base,
    updatedAt: now,
    messages: [...(Array.isArray(base.messages) ? base.messages : []), { role: msg.role, content: String(msg.content || ''), at: now }]
      .filter((m) => m.content && m.content.trim())
      .slice(-Math.max(6, Math.min(80, MAX_MESSAGES))),
  }
  if (all) {
    all[key] = next
    writeAll(all)
  }
  await setConversationState(SCOPE, key, next)
  return next
}

export async function updateConversation(chatId: string, patch: Partial<TelegramConversation>) {
  const key = String(chatId || '').trim()
  if (!key) return null
  const current = (await getConversationState<TelegramConversation>(SCOPE, key)) || null
  const all = current ? null : readAll()
  const base = current ? hydrate(current, key) : all?.[key] ? hydrate(all[key], key) : await getConversation(key)
  const now = new Date().toISOString()
  const next: TelegramConversation = { ...base, ...patch, chatId: key, updatedAt: now }
  if (all) {
    all[key] = next
    writeAll(all)
  }
  await setConversationState(SCOPE, key, next)
  return next
}

export async function getAllConversations() {
  const fromDb = await listConversationState<TelegramConversation>(SCOPE)
  const keys = Object.keys(fromDb || {})
  if (keys.length > 0) {
    const out: Record<string, TelegramConversation> = {}
    for (const k of keys) out[k] = hydrate(fromDb[k], k)
    return out
  }
  return readAll()
}

