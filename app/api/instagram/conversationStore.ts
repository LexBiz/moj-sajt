import fs from 'fs'
import path from 'path'

export type ConversationStage = 'new' | 'qualify' | 'offer' | 'ask_contact' | 'collected' | 'done'

export type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ConversationLang = 'ru' | 'ua'

export type ConversationState = {
  senderId: string
  stage: ConversationStage
  lang: ConversationLang | null
  pendingText: string | null
  history: ConversationMessage[]
  leadId: number | null
  lastUserAt: string | null
  lastAssistantAt: string | null
  followUpSentAt: string | null
  createdAt: string
  updatedAt: string
}

const FILE = (process.env.INSTAGRAM_CONVERSATIONS_FILE || '').trim() || path.join(process.cwd(), 'data', 'instagram-conversations.json')

function ensureDir() {
  const dir = path.dirname(FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function loadAll(): Record<string, ConversationState> {
  try {
    if (!fs.existsSync(FILE)) return {}
    const raw = fs.readFileSync(FILE, 'utf8')
    const parsed = JSON.parse(raw) as Record<string, any>
    // Backward-compatible normalization for older stored shapes.
    for (const k of Object.keys(parsed || {})) {
      const c = parsed[k] || {}
      if (typeof c.lastUserAt === 'undefined') c.lastUserAt = null
      if (typeof c.lastAssistantAt === 'undefined') c.lastAssistantAt = null
      if (typeof c.followUpSentAt === 'undefined') c.followUpSentAt = null
      parsed[k] = c
    }
    return parsed as Record<string, ConversationState>
  } catch {
    return {}
  }
}

function saveAll(data: Record<string, ConversationState>) {
  ensureDir()
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8')
}

export function getConversation(senderId: string): ConversationState {
  const all = loadAll()
  const existing = all[senderId]
  if (existing) return existing
  const now = new Date().toISOString()
  return {
    senderId,
    stage: 'new',
    lang: null,
    pendingText: null,
    history: [],
    leadId: null,
    lastUserAt: null,
    lastAssistantAt: null,
    followUpSentAt: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function updateConversation(senderId: string, next: Partial<ConversationState>) {
  const all = loadAll()
  const current = all[senderId] || getConversation(senderId)
  const merged: ConversationState = {
    ...current,
    ...next,
    senderId,
    updatedAt: new Date().toISOString(),
  }
  all[senderId] = merged
  saveAll(all)
  return merged
}

export function getAllConversations() {
  return loadAll()
}

export function deleteConversation(senderId: string) {
  const all = loadAll()
  if (all[senderId]) {
    delete all[senderId]
    saveAll(all)
  }
}

export function resetConversation(senderId: string) {
  deleteConversation(senderId)
  return getConversation(senderId)
}


