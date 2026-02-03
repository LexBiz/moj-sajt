import fs from 'fs'
import path from 'path'

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
  messages: WhatsAppMessage[]
}

const FILE =
  (process.env.WHATSAPP_CONVERSATIONS_FILE || '').trim() ||
  path.join(process.cwd(), 'data', 'whatsapp-conversations.json')

const MAX_MESSAGES = Number(process.env.WHATSAPP_MAX_MESSAGES || 24)

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
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, WhatsAppConversation>) : {}
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

export function getConversation(from: string): WhatsAppConversation {
  const key = String(from || '').trim()
  const all = readAll()
  const existing = all[key] || null
  if (existing) return existing
  const now = new Date().toISOString()
  const conv: WhatsAppConversation = { from: key, createdAt: now, updatedAt: now, messages: [] }
  all[key] = conv
  writeAll(all)
  return conv
}

export function appendMessage(from: string, msg: { role: WhatsAppRole; content: string }) {
  const key = String(from || '').trim()
  if (!key) return null
  const all = readAll()
  const base = all[key] || getConversation(key)
  const now = new Date().toISOString()
  const next: WhatsAppConversation = {
    ...base,
    updatedAt: now,
    messages: [...(Array.isArray(base.messages) ? base.messages : []), { role: msg.role, content: String(msg.content || ''), at: now }]
      .filter((m) => m.content && m.content.trim())
      .slice(-Math.max(6, Math.min(80, MAX_MESSAGES))),
  }
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
  return next
}

