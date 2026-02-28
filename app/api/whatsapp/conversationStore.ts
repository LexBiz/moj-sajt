import fs from 'fs'
import path from 'path'
import { getConversationState, listConversationState, setConversationState } from '@/app/lib/conversationStateDb'

export type WhatsAppRole = 'user' | 'assistant'

export type WhatsAppMessage = {
  role: WhatsAppRole
  content: string
  at: string
}

export type WhatsAppConversation = {
  from: string // wa_id
  createdAt: string
  updatedAt: string
  lang?: 'ru' | 'ua' | null
  pendingImageUrls?: string[]
  lastMediaAt?: string | null
  followUpSentAt?: string | null
  leadCapturedAt?: string | null
  messages: WhatsAppMessage[]
}

const FILE =
  (process.env.WHATSAPP_CONVERSATIONS_FILE || '').trim() ||
  path.join(process.cwd(), 'data', 'whatsapp-conversations.json')

const MAX_MESSAGES = Number(process.env.WHATSAPP_MAX_MESSAGES || 24)
const SCOPE = 'whatsapp'

function ensureFile() {
  const dir = path.dirname(FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({}), 'utf8')
}

function readAll(): Record<string, WhatsAppConversation> {
  try {
    ensureFile()
    const raw = fs.readFileSync(FILE, 'utf8')
    const parsed = JSON.parse(raw)
    const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, WhatsAppConversation>) : {}
    // Backward-compatible normalization.
    for (const k of Object.keys(obj)) {
      const c: any = obj[k] || {}
      if (typeof c.lang === 'undefined') c.lang = null
      if (typeof c.pendingImageUrls === 'undefined') c.pendingImageUrls = []
      if (typeof c.lastMediaAt === 'undefined') c.lastMediaAt = null
      if (typeof c.followUpSentAt === 'undefined') c.followUpSentAt = null
      if (typeof c.leadCapturedAt === 'undefined') c.leadCapturedAt = null
      obj[k] = c
    }
    return obj
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, WhatsAppConversation>) {
  ensureFile()
  const tmp = `${FILE}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(all, null, 2), 'utf8')
  fs.renameSync(tmp, FILE)
}

function hydrate(conv: Partial<WhatsAppConversation> | null | undefined, key: string): WhatsAppConversation {
  const now = new Date().toISOString()
  return {
    from: key,
    createdAt: String(conv?.createdAt || now),
    updatedAt: String(conv?.updatedAt || now),
    lang: conv?.lang === 'ru' ? 'ru' : conv?.lang === 'ua' ? 'ua' : null,
    pendingImageUrls: Array.isArray(conv?.pendingImageUrls) ? conv.pendingImageUrls : [],
    lastMediaAt: typeof conv?.lastMediaAt === 'string' ? conv.lastMediaAt : null,
    followUpSentAt: typeof conv?.followUpSentAt === 'string' ? conv.followUpSentAt : null,
    leadCapturedAt: typeof conv?.leadCapturedAt === 'string' ? conv.leadCapturedAt : null,
    messages: Array.isArray(conv?.messages) ? conv.messages.filter((m: any) => m && typeof m.content === 'string').slice(-Math.max(6, Math.min(80, MAX_MESSAGES))) : [],
  }
}

export async function getConversation(from: string): Promise<WhatsAppConversation> {
  const key = String(from || '').trim()
  const fromDb = await getConversationState<WhatsAppConversation>(SCOPE, key)
  if (fromDb) return hydrate(fromDb, key)
  const all = readAll()
  const existing = all[key] || null
  if (existing) return hydrate(existing, key)
  const conv: WhatsAppConversation = hydrate(null, key)
  all[key] = conv
  writeAll(all)
  await setConversationState(SCOPE, key, conv)
  return conv
}

export async function appendMessage(from: string, msg: { role: WhatsAppRole; content: string }) {
  const key = String(from || '').trim()
  if (!key) return null
  const current = (await getConversationState<WhatsAppConversation>(SCOPE, key)) || null
  const all = current ? null : readAll()
  const base = current ? hydrate(current, key) : all?.[key] ? hydrate(all[key], key) : await getConversation(key)
  const now = new Date().toISOString()
  const next: WhatsAppConversation = {
    ...base,
    updatedAt: now,
    messages: [...(Array.isArray(base.messages) ? base.messages : []), { role: msg.role, content: String(msg.content || ''), at: now }]
      .filter((m) => m.content && m.content.trim())
      .slice(-Math.max(6, Math.min(80, MAX_MESSAGES))),
  }
  if (all) {
    all[key] = next
    // Keep file bounded (avoid unbounded growth if many unknown senders)
    const keys = Object.keys(all)
    if (keys.length > 6000) {
      // crude pruning: keep newest by updatedAt
      keys
        .sort((a, b) => String(all[b]?.updatedAt || '').localeCompare(String(all[a]?.updatedAt || '')))
        .slice(5000)
        .forEach((k) => delete all[k])
    }
    writeAll(all)
  }
  await setConversationState(SCOPE, key, next)
  return next
}

export async function updateConversation(from: string, patch: Partial<WhatsAppConversation>) {
  const key = String(from || '').trim()
  if (!key) return null
  const current = (await getConversationState<WhatsAppConversation>(SCOPE, key)) || null
  const all = current ? null : readAll()
  const base = current ? hydrate(current, key) : all?.[key] ? hydrate(all[key], key) : await getConversation(key)
  const now = new Date().toISOString()
  const next: WhatsAppConversation = { ...base, ...patch, from: key, updatedAt: now }
  if (all) {
    all[key] = next
    writeAll(all)
  }
  await setConversationState(SCOPE, key, next)
  return next
}

export async function getAllConversations() {
  const fromDb = await listConversationState<WhatsAppConversation>(SCOPE)
  const keys = Object.keys(fromDb || {})
  if (keys.length > 0) {
    const out: Record<string, WhatsAppConversation> = {}
    for (const k of keys) out[k] = hydrate(fromDb[k], k)
    return out
  }
  return readAll()
}

