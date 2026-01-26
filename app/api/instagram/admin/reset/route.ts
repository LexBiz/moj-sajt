import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../_auth'
import { getInstagramWebhookState } from '../../state'
import { resetConversation } from '../../conversationStore'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const state = getInstagramWebhookState()
  const body = (await request.json().catch(() => ({}))) as any
  const senderId = String(body?.senderId || state?.lastSenderId || '').trim()
  if (!senderId) {
    return NextResponse.json({ error: 'Missing senderId (and no lastSenderId in state)' }, { status: 400 })
  }

  const reset = resetConversation(senderId)
  return NextResponse.json({ ok: true, senderId, conversation: reset }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}


