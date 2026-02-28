import fs from 'fs'
import path from 'path'
import { deleteConversationState, getConversationState, listConversationState, setConversationState } from '@/app/lib/conversationStateDb'

export type ConversationStage = 'new' | 'qualify' | 'offer' | 'ask_contact' | 'collected' | 'done'

export type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ConversationLang = 'ru' | 'ua' | 'en'

export type ConversationContactDraft = {
  phone: string | null
  email: string | null
}

export type ConversationState = {
  senderId: string
  stage: ConversationStage
  lang: ConversationLang | null
  pendingText: string | null
  // When client sends multiple photos over a few minutes, we collect them here
  // and use in the next meaningful text turn (prevents "lost context").
  pendingImageUrls?: string[]
  lastMediaAt?: string | null
  history: ConversationMessage[]
  leadId: number | null
  contactDraft: ConversationContactDraft | null
  // If true, we allow resending contact and creating/sending a lead again (explicitly requested/agreed).
  resendArmed?: boolean
  lastUserAt: string | null
  lastAssistantAt: string | null
  followUpSentAt: string | null
  lastPlusDmAt?: string | null
  createdAt: string
  updatedAt: string
}

const FILE = (process.env.INSTAGRAM_CONVERSATIONS_FILE || '').trim() || path.join(process.cwd(), 'data', 'instagram-conversations.json')
const SCOPE = 'instagram'

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
      if (typeof c.contactDraft === 'undefined') c.contactDraft = null
      if (typeof c.lastPlusDmAt === 'undefined') c.lastPlusDmAt = null
      if (typeof c.resendArmed === 'undefined') c.resendArmed = false
      if (typeof c.pendingImageUrls === 'undefined') c.pendingImageUrls = []
      if (typeof c.lastMediaAt === 'undefined') c.lastMediaAt = null
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

function hydrate(conv: Partial<ConversationState> | null | undefined, senderId: string): ConversationState {
  const now = new Date().toISOString()
  return {
    senderId,
    stage: (conv?.stage as any) || 'new',
    lang: conv?.lang || null,
    pendingText: conv?.pendingText || null,
    pendingImageUrls: Array.isArray(conv?.pendingImageUrls) ? conv.pendingImageUrls : [],
    lastMediaAt: typeof conv?.lastMediaAt === 'string' ? conv.lastMediaAt : null,
    history: Array.isArray(conv?.history) ? conv.history.filter((m: any) => m && typeof m.content === 'string').slice(-24) : [],
    leadId: Number.isFinite(Number(conv?.leadId)) ? Number(conv?.leadId) : null,
    contactDraft: conv?.contactDraft || null,
    resendArmed: Boolean(conv?.resendArmed),
    lastUserAt: typeof conv?.lastUserAt === 'string' ? conv.lastUserAt : null,
    lastAssistantAt: typeof conv?.lastAssistantAt === 'string' ? conv.lastAssistantAt : null,
    followUpSentAt: typeof conv?.followUpSentAt === 'string' ? conv.followUpSentAt : null,
    lastPlusDmAt: typeof conv?.lastPlusDmAt === 'string' ? conv.lastPlusDmAt : null,
    createdAt: String(conv?.createdAt || now),
    updatedAt: String(conv?.updatedAt || now),
  }
}

export async function getConversation(senderId: string): Promise<ConversationState> {
  const fromDb = await getConversationState<ConversationState>(SCOPE, senderId)
  if (fromDb) return hydrate(fromDb, senderId)
  const all = loadAll()
  const existing = all[senderId]
  if (existing) return hydrate(existing, senderId)
  const base = hydrate(null, senderId)
  all[senderId] = base
  saveAll(all)
  await setConversationState(SCOPE, senderId, base)
  return base
}

export async function updateConversation(senderId: string, next: Partial<ConversationState>) {
  const all = loadAll()
  const current = all[senderId] || (await getConversation(senderId))
  const merged: ConversationState = {
    ...current,
    ...next,
    senderId,
    updatedAt: new Date().toISOString(),
  }
  all[senderId] = merged
  saveAll(all)
  await setConversationState(SCOPE, senderId, merged)
  return merged
}

export async function getAllConversations() {
  const fromDb = await listConversationState<ConversationState>(SCOPE)
  if (Object.keys(fromDb || {}).length > 0) {
    const out: Record<string, ConversationState> = {}
    for (const k of Object.keys(fromDb)) out[k] = hydrate(fromDb[k], k)
    return out
  }
  return loadAll()
}

export async function deleteConversation(senderId: string) {
  const all = loadAll()
  if (all[senderId]) {
    delete all[senderId]
    saveAll(all)
  }
  await deleteConversationState(SCOPE, senderId)
}

export async function resetConversation(senderId: string) {
  await deleteConversation(senderId)
  return getConversation(senderId)
}


