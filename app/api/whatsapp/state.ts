import fs from 'fs'
import path from 'path'

export type WhatsAppWebhookState = {
  totalReceived: number
  lastReceivedAt: string | null
  lastFrom: string | null
  lastTextPreview: string | null
  lastType: string | null
}

const state: WhatsAppWebhookState = {
  totalReceived: 0,
  lastReceivedAt: null,
  lastFrom: null,
  lastTextPreview: null,
  lastType: null,
}

const STATE_FILE = (process.env.WHATSAPP_WEBHOOK_STATE_FILE || '').trim() || 'data/whatsapp-webhook-state.json'

function loadFromDisk() {
  try {
    if (!fs.existsSync(STATE_FILE)) return
    const raw = fs.readFileSync(STATE_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<WhatsAppWebhookState>
    if (typeof parsed.totalReceived === 'number') state.totalReceived = parsed.totalReceived
    if (typeof parsed.lastReceivedAt === 'string' || parsed.lastReceivedAt === null) state.lastReceivedAt = parsed.lastReceivedAt ?? null
    if (typeof parsed.lastFrom === 'string' || parsed.lastFrom === null) state.lastFrom = parsed.lastFrom ?? null
    if (typeof parsed.lastTextPreview === 'string' || parsed.lastTextPreview === null) state.lastTextPreview = parsed.lastTextPreview ?? null
    if (typeof parsed.lastType === 'string' || parsed.lastType === null) state.lastType = parsed.lastType ?? null
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

export function recordWhatsAppWebhook(input: { from?: string | null; textPreview?: string | null; type?: string | null }) {
  if (state.totalReceived === 0 && state.lastReceivedAt === null) loadFromDisk()
  state.totalReceived += 1
  state.lastReceivedAt = new Date().toISOString()
  if (input.from) state.lastFrom = input.from
  if (input.textPreview) state.lastTextPreview = input.textPreview
  if (input.type) state.lastType = input.type
  saveToDisk()
}

export function getWhatsAppWebhookState() {
  loadFromDisk()
  return state
}


