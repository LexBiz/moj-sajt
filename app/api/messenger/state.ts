import fs from 'fs'
import path from 'path'

export type MessengerWebhookState = {
  totalReceived: number
  lastReceivedAt: string | null
  lastPageId: string | null
  lastSenderId: string | null
  lastTextPreview: string | null
}

const state: MessengerWebhookState = {
  totalReceived: 0,
  lastReceivedAt: null,
  lastPageId: null,
  lastSenderId: null,
  lastTextPreview: null,
}

const STATE_FILE = (process.env.MESSENGER_WEBHOOK_STATE_FILE || '').trim() || 'data/messenger-webhook-state.json'

function loadFromDisk() {
  try {
    if (!fs.existsSync(STATE_FILE)) return
    const raw = fs.readFileSync(STATE_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<MessengerWebhookState>
    if (typeof parsed.totalReceived === 'number') state.totalReceived = parsed.totalReceived
    if (typeof parsed.lastReceivedAt === 'string' || parsed.lastReceivedAt === null) state.lastReceivedAt = parsed.lastReceivedAt ?? null
    if (typeof parsed.lastPageId === 'string' || parsed.lastPageId === null) state.lastPageId = parsed.lastPageId ?? null
    if (typeof parsed.lastSenderId === 'string' || parsed.lastSenderId === null) state.lastSenderId = parsed.lastSenderId ?? null
    if (typeof parsed.lastTextPreview === 'string' || parsed.lastTextPreview === null) state.lastTextPreview = parsed.lastTextPreview ?? null
  } catch {
    // ignore
  }
}

function saveToDisk() {
  try {
    const dir = path.dirname(STATE_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
  } catch {
    // ignore
  }
}

export function recordMessengerWebhook(input: {
  pageId?: string | null
  senderId?: string | null
  textPreview?: string | null
}) {
  if (state.totalReceived === 0 && state.lastReceivedAt === null) loadFromDisk()
  state.totalReceived += 1
  state.lastReceivedAt = new Date().toISOString()
  if (input.pageId) state.lastPageId = input.pageId
  if (input.senderId) state.lastSenderId = input.senderId
  if (input.textPreview) state.lastTextPreview = input.textPreview
  saveToDisk()
}

export function getMessengerWebhookState() {
  loadFromDisk()
  return state
}

