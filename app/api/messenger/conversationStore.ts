import fs from 'fs'
import path from 'path'
import { deleteConversationState, getConversationState, listConversationState, setConversationState } from '@/app/lib/conversationStateDb'

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
  // media bursts (users often send multiple photos in a row)
  pendingImageUrls?: string[]
  lastMediaAt?: string | null
  // follow-up (avoid repeated nudges)
  followUpSentAt?: string | null
  // set when we already created a CRM lead (prevents follow-up spam)
  leadCapturedAt?: string | null
  messages: MessengerMessage[]
}

const FILE = path.join(process.cwd(), 'data', 'messenger-conversations.json')
const MAX_MESSAGES = Number(process.env.MESSENGER_MAX_MESSAGES || 30)
const SCOPE = 'messenger'

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
    const list = Array.isArray(parsed) ? (parsed as MessengerConversation[]) : []
    // Backward-compatible normalization.
    for (const c of list) {
      if (typeof (c as any).pendingImageUrls === 'undefined') (c as any).pendingImageUrls = []
      if (typeof (c as any).lastMediaAt === 'undefined') (c as any).lastMediaAt = null
      if (typeof (c as any).followUpSentAt === 'undefined') (c as any).followUpSentAt = null
      if (typeof (c as any).leadCapturedAt === 'undefined') (c as any).leadCapturedAt = null
    }
    return list
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

function hydrate(conv: Partial<MessengerConversation> | null | undefined, pid: string, sid: string): MessengerConversation {
  const now = new Date().toISOString()
  return {
    id: `${pid}:${sid}`,
    pageId: pid,
    senderId: sid,
    createdAt: String(conv?.createdAt || now),
    updatedAt: String(conv?.updatedAt || now),
    lang: conv?.lang === 'ru' ? 'ru' : conv?.lang === 'ua' ? 'ua' : null,
    pendingImageUrls: Array.isArray(conv?.pendingImageUrls) ? conv!.pendingImageUrls : [],
    lastMediaAt: typeof conv?.lastMediaAt === 'string' ? conv.lastMediaAt : null,
    followUpSentAt: typeof conv?.followUpSentAt === 'string' ? conv.followUpSentAt : null,
    leadCapturedAt: typeof conv?.leadCapturedAt === 'string' ? conv.leadCapturedAt : null,
    messages: Array.isArray(conv?.messages) ? conv!.messages.filter((m: any) => m && typeof m.content === 'string').slice(-Math.max(6, Math.min(60, MAX_MESSAGES))) : [],
  }
}

export async function getConversation(pageId: string, senderId: string): Promise<MessengerConversation> {
  const pid = String(pageId || '').trim()
  const sid = String(senderId || '').trim()
  const id = `${pid}:${sid}`
  const fromDb = await getConversationState<MessengerConversation>(SCOPE, id)
  if (fromDb) return hydrate(fromDb, pid, sid)
  const all = readAll()
  const existing = all.find((c) => c.id === id) || null
  if (existing) return hydrate(existing, pid, sid)
  const conv: MessengerConversation = hydrate(null, pid, sid)
  all.unshift(conv)
  writeAll(all.slice(0, 5000))
  await setConversationState(SCOPE, id, conv)
  return conv
}

export async function appendMessage(pageId: string, senderId: string, msg: { role: MessengerRole; content: string }) {
  const pid = String(pageId || '').trim()
  const sid = String(senderId || '').trim()
  if (!pid || !sid) return
  const id = `${pid}:${sid}`
  const current = (await getConversationState<MessengerConversation>(SCOPE, id)) || null
  const all = current ? null : readAll()
  const now = new Date().toISOString()
  const idx = all ? all.findIndex((c) => c.id === id) : -1
  const base = current ? hydrate(current, pid, sid) : idx >= 0 ? hydrate(all![idx], pid, sid) : await getConversation(pid, sid)
  const next: MessengerConversation = {
    ...base,
    updatedAt: now,
    messages: [...(Array.isArray(base.messages) ? base.messages : []), { role: msg.role, content: String(msg.content || ''), at: now }]
      .filter((m) => m.content && m.content.trim())
      .slice(-Math.max(6, Math.min(60, MAX_MESSAGES))),
  }
  if (all) {
    if (idx >= 0) all[idx] = next
    else all.unshift(next)
    writeAll(all.slice(0, 5000))
  }
  await setConversationState(SCOPE, id, next)
  return next
}

export async function setConversationLang(pageId: string, senderId: string, lang: 'ru' | 'ua' | null) {
  const pid = String(pageId || '').trim()
  const sid = String(senderId || '').trim()
  if (!pid || !sid) return
  const id = `${pid}:${sid}`
  const current = (await getConversationState<MessengerConversation>(SCOPE, id)) || null
  const all = current ? null : readAll()
  const now = new Date().toISOString()
  const idx = all ? all.findIndex((c) => c.id === id) : -1
  const base = current ? hydrate(current, pid, sid) : idx >= 0 ? hydrate(all![idx], pid, sid) : await getConversation(pid, sid)
  const next: MessengerConversation = { ...base, updatedAt: now, lang }
  if (all) {
    if (idx >= 0) all[idx] = next
    else all.unshift(next)
    writeAll(all.slice(0, 5000))
  }
  await setConversationState(SCOPE, id, next)
  return next
}

export async function updateConversationMeta(
  pageId: string,
  senderId: string,
  patch: Partial<Pick<MessengerConversation, 'pendingImageUrls' | 'lastMediaAt' | 'followUpSentAt' | 'leadCapturedAt' | 'lang'>>,
) {
  const pid = String(pageId || '').trim()
  const sid = String(senderId || '').trim()
  if (!pid || !sid) return
  const id = `${pid}:${sid}`
  const current = (await getConversationState<MessengerConversation>(SCOPE, id)) || null
  const all = current ? null : readAll()
  const now = new Date().toISOString()
  const idx = all ? all.findIndex((c) => c.id === id) : -1
  const base = current ? hydrate(current, pid, sid) : idx >= 0 ? hydrate(all![idx], pid, sid) : await getConversation(pid, sid)
  const next: MessengerConversation = { ...base, ...patch, updatedAt: now }
  if (all) {
    if (idx >= 0) all[idx] = next
    else all.unshift(next)
    writeAll(all.slice(0, 5000))
  }
  await setConversationState(SCOPE, id, next)
  return next
}

export async function getAllConversations() {
  const fromDb = await listConversationState<MessengerConversation>(SCOPE)
  const keys = Object.keys(fromDb || {})
  if (keys.length > 0) {
    const list: MessengerConversation[] = []
    for (const id of keys) {
      const v = fromDb[id]
      const [pid, sid] = String(id).split(':')
      if (!pid || !sid) continue
      list.push(hydrate(v, pid, sid))
    }
    return list
  }
  return readAll()
}

export async function deleteConversation(pageId: string, senderId: string) {
  const pid = String(pageId || '').trim()
  const sid = String(senderId || '').trim()
  const id = `${pid}:${sid}`
  const all = readAll()
  const idx = all.findIndex((c) => c.id === id)
  if (idx >= 0) {
    all.splice(idx, 1)
    writeAll(all.slice(0, 5000))
  }
  await deleteConversationState(SCOPE, id)
}

