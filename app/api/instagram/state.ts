export type InstagramWebhookState = {
  totalReceived: number
  lastReceivedAt: string | null
  lastObject: string | null
  lastSenderId: string | null
  lastTextPreview: string | null
  lastCommentId?: string | null
  lastCommentReplyId?: string | null
  lastCommentReplyOk?: boolean | null
  lastCommentReplyError?: string | null
  lastAiProvider?: 'openai' | 'fallback' | null
  lastAiDetail?: string | null
  lastAiAt?: string | null
}

import fs from 'fs'
import path from 'path'

const state: InstagramWebhookState = {
  totalReceived: 0,
  lastReceivedAt: null,
  lastObject: null,
  lastSenderId: null,
  lastTextPreview: null,
  lastCommentId: null,
  lastCommentReplyId: null,
  lastCommentReplyOk: null,
  lastCommentReplyError: null,
  lastAiProvider: null,
  lastAiDetail: null,
  lastAiAt: null,
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
    if (typeof (parsed as any).lastCommentId === 'string' || (parsed as any).lastCommentId === null) state.lastCommentId = (parsed as any).lastCommentId ?? null
    if (typeof (parsed as any).lastCommentReplyId === 'string' || (parsed as any).lastCommentReplyId === null)
      state.lastCommentReplyId = (parsed as any).lastCommentReplyId ?? null
    if (typeof (parsed as any).lastCommentReplyOk === 'boolean' || (parsed as any).lastCommentReplyOk === null)
      state.lastCommentReplyOk = (parsed as any).lastCommentReplyOk ?? null
    if (typeof (parsed as any).lastCommentReplyError === 'string' || (parsed as any).lastCommentReplyError === null)
      state.lastCommentReplyError = (parsed as any).lastCommentReplyError ?? null
    if (parsed.lastAiProvider === 'openai' || parsed.lastAiProvider === 'fallback' || parsed.lastAiProvider === null)
      state.lastAiProvider = parsed.lastAiProvider ?? null
    if (typeof parsed.lastAiDetail === 'string' || parsed.lastAiDetail === null) state.lastAiDetail = parsed.lastAiDetail ?? null
    if (typeof parsed.lastAiAt === 'string' || parsed.lastAiAt === null) state.lastAiAt = parsed.lastAiAt ?? null
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
  commentId?: string | null
  commentReplyId?: string | null
  commentReplyOk?: boolean | null
  commentReplyError?: string | null
}) {
  // lazy-load once on first use
  if (state.totalReceived === 0 && state.lastReceivedAt === null) loadFromDisk()
  state.totalReceived += 1
  state.lastReceivedAt = new Date().toISOString()
  state.lastObject = payload.object ?? null
  if (payload.senderId) state.lastSenderId = payload.senderId
  if (payload.textPreview) state.lastTextPreview = payload.textPreview
  if (typeof payload.commentId === 'string' || payload.commentId === null) state.lastCommentId = payload.commentId ?? null
  if (typeof payload.commentReplyId === 'string' || payload.commentReplyId === null) state.lastCommentReplyId = payload.commentReplyId ?? null
  if (typeof payload.commentReplyOk === 'boolean' || payload.commentReplyOk === null) state.lastCommentReplyOk = payload.commentReplyOk ?? null
  if (typeof payload.commentReplyError === 'string' || payload.commentReplyError === null) state.lastCommentReplyError = payload.commentReplyError ?? null
  saveToDisk()
}

// Update only AI diagnostics (do NOT increment totalReceived).
export function recordInstagramAi(payload: { provider: 'openai' | 'fallback'; detail?: string | null }) {
  loadFromDisk()
  state.lastAiProvider = payload.provider
  state.lastAiDetail = payload.detail ?? null
  state.lastAiAt = new Date().toISOString()
  saveToDisk()
}

export function getInstagramWebhookState() {
  loadFromDisk()
  return state
}


