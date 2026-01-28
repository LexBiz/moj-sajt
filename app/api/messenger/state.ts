import fs from 'fs'
import path from 'path'

export type MessengerWebhookState = {
  totalReceived: number
  lastReceivedAt: string | null
  lastPageId: string | null
  lastSenderId: string | null
  lastTextPreview: string | null

  // Debug: last POST attempt meta (even if signature/json fails)
  lastPostAt: string | null
  lastPostLength: number | null
  lastPostHasSignature: boolean | null
  lastPostResult: 'ok' | 'invalid_signature' | 'invalid_json' | 'no_entries' | 'no_events' | 'ignored' | 'error' | null
  lastPostNote: string | null
}

const state: MessengerWebhookState = {
  totalReceived: 0,
  lastReceivedAt: null,
  lastPageId: null,
  lastSenderId: null,
  lastTextPreview: null,

  lastPostAt: null,
  lastPostLength: null,
  lastPostHasSignature: null,
  lastPostResult: null,
  lastPostNote: null,
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

    if (typeof parsed.lastPostAt === 'string' || parsed.lastPostAt === null) state.lastPostAt = parsed.lastPostAt ?? null
    if (typeof parsed.lastPostLength === 'number' || parsed.lastPostLength === null) state.lastPostLength = parsed.lastPostLength ?? null
    if (typeof parsed.lastPostHasSignature === 'boolean' || parsed.lastPostHasSignature === null)
      state.lastPostHasSignature = parsed.lastPostHasSignature ?? null
    if (typeof parsed.lastPostResult === 'string' || parsed.lastPostResult === null) state.lastPostResult = (parsed.lastPostResult as any) ?? null
    if (typeof parsed.lastPostNote === 'string' || parsed.lastPostNote === null) state.lastPostNote = parsed.lastPostNote ?? null
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

export function recordMessengerPost(input: {
  length?: number | null
  hasSignature?: boolean | null
  result?: MessengerWebhookState['lastPostResult']
  note?: string | null
}) {
  loadFromDisk()
  state.lastPostAt = new Date().toISOString()
  if (typeof input.length === 'number') state.lastPostLength = input.length
  if (typeof input.hasSignature === 'boolean') state.lastPostHasSignature = input.hasSignature
  if (input.result) state.lastPostResult = input.result
  if (input.note != null) state.lastPostNote = String(input.note)
  saveToDisk()
}

export function getMessengerWebhookState() {
  loadFromDisk()
  return state
}

