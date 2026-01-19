export type InstagramWebhookState = {
  totalReceived: number
  lastReceivedAt: string | null
  lastObject: string | null
  lastSenderId: string | null
  lastTextPreview: string | null
}

import fs from 'fs'
import path from 'path'

const state: InstagramWebhookState = {
  totalReceived: 0,
  lastReceivedAt: null,
  lastObject: null,
  lastSenderId: null,
  lastTextPreview: null,
}

const STATE_FILE = process.env.INSTAGRAM_WEBHOOK_STATE_FILE || 'data/instagram-webhook-state.json'

function loadFromDisk() {
  try {
    if (!fs.existsSync(STATE_FILE)) return
    const raw = fs.readFileSync(STATE_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<InstagramWebhookState>
    if (typeof parsed.totalReceived === 'number') state.totalReceived = parsed.totalReceived
    if (typeof parsed.lastReceivedAt === 'string' || parsed.lastReceivedAt === null) state.lastReceivedAt = parsed.lastReceivedAt ?? null
    if (typeof parsed.lastObject === 'string' || parsed.lastObject === null) state.lastObject = parsed.lastObject ?? null
    if (typeof parsed.lastSenderId === 'string' || parsed.lastSenderId === null) state.lastSenderId = parsed.lastSenderId ?? null
    if (typeof parsed.lastTextPreview === 'string' || parsed.lastTextPreview === null) state.lastTextPreview = parsed.lastTextPreview ?? null
  } catch {
    // ignore
  }
}

function saveToDisk() {
  try {
    // ensure directory exists
    const dir = path.dirname(STATE_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8')
  } catch {
    // ignore
  }
}

export function recordInstagramWebhook(payload: {
  object?: string | null
  senderId?: string | null
  textPreview?: string | null
}) {
  // lazy-load once on first use
  if (state.totalReceived === 0 && state.lastReceivedAt === null) loadFromDisk()
  state.totalReceived += 1
  state.lastReceivedAt = new Date().toISOString()
  state.lastObject = payload.object ?? null
  if (payload.senderId) state.lastSenderId = payload.senderId
  if (payload.textPreview) state.lastTextPreview = payload.textPreview
  saveToDisk()
}

export function getInstagramWebhookState() {
  loadFromDisk()
  return state
}


