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
    return JSON.parse(raw) as Record<string, ConversationState>
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


