export type InstagramWebhookState = {
  totalReceived: number
  lastReceivedAt: string | null
  lastObject: string | null
  lastSenderId: string | null
  lastTextPreview: string | null
}

const state: InstagramWebhookState = {
  totalReceived: 0,
  lastReceivedAt: null,
  lastObject: null,
  lastSenderId: null,
  lastTextPreview: null,
}

export function recordInstagramWebhook(payload: {
  object?: string | null
  senderId?: string | null
  textPreview?: string | null
}) {
  state.totalReceived += 1
  state.lastReceivedAt = new Date().toISOString()
  state.lastObject = payload.object ?? null
  if (payload.senderId) state.lastSenderId = payload.senderId
  if (payload.textPreview) state.lastTextPreview = payload.textPreview
}

export function getInstagramWebhookState() {
  return state
}


