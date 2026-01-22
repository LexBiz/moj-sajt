import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../_auth'
import { getInstagramWebhookState } from '../../state'
import { readInstagramAdminConfig } from '../_store'
import { readTokenFile } from '../../oauth/_store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const IG_API_HOST = (process.env.INSTAGRAM_API_HOST || 'graph.facebook.com').trim()
const IG_API_VERSION = (process.env.INSTAGRAM_API_VERSION || 'v24.0').trim()

function getAccessToken() {
  const envToken = (process.env.INSTAGRAM_ACCESS_TOKEN || '').trim()
  if (envToken) return envToken
  const saved = (readTokenFile()?.accessToken || '').trim()
  return saved
}

function clip(text: string, max = 1000) {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

async function sendInstagramMessage(opts: { igUserId: string; recipientId: string; text: string }) {
  const IG_ACCESS_TOKEN = getAccessToken()
  if (!IG_ACCESS_TOKEN) {
    return { ok: false, error: 'Missing INSTAGRAM_ACCESS_TOKEN' as const }
  }

  const urlObj = new URL(`https://${IG_API_HOST}/${IG_API_VERSION}/${opts.igUserId}/messages`)
  // For graph.facebook.com we keep access_token in query (URL-encoded) since many examples use it.
  // For graph.instagram.com (Instagram Login API) we do NOT include it in query.
  if (IG_API_HOST !== 'graph.instagram.com') {
    urlObj.searchParams.set('access_token', IG_ACCESS_TOKEN)
  }

  const body = {
    recipient: { id: opts.recipientId },
    messaging_type: 'RESPONSE',
    message: { text: clip(opts.text, 1000) },
  }

  const resp = await fetch(urlObj.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${IG_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  })

  const respText = await resp.text().catch(() => '')
  const parsed = (() => {
    try {
      return JSON.parse(respText) as any
    } catch {
      return null
    }
  })()

  if (!resp.ok) {
    return {
      ok: false,
      status: resp.status,
      responseTextPreview: respText.slice(0, 800),
      responseJson: parsed,
      request: {
        api: `${IG_API_HOST}/${IG_API_VERSION}`,
        igUserIdLast4: opts.igUserId.slice(-4),
        recipientId: opts.recipientId,
        textPreview: clip(opts.text, 200),
      },
    }
  }

  return {
    ok: true,
    status: resp.status,
    responseJson: parsed,
    request: {
      api: `${IG_API_HOST}/${IG_API_VERSION}`,
      igUserIdLast4: opts.igUserId.slice(-4),
      recipientId: opts.recipientId,
      textPreview: clip(opts.text, 200),
    },
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const state = getInstagramWebhookState()
  const cfg = readInstagramAdminConfig()

  const body = (await request.json().catch(() => ({}))) as any
  const recipientId = (typeof body?.recipientId === 'string' ? body.recipientId : state.lastSenderId || '').trim()
  const text = (typeof body?.text === 'string' ? body.text : '').trim()
  const igUserId = (typeof body?.igUserId === 'string' ? body.igUserId : cfg.selectedIgUserId || (process.env.INSTAGRAM_IG_USER_ID || '')).trim()

  if (!igUserId) {
    return NextResponse.json(
      { error: 'Missing igUserId (select a Page/IG account first, or set INSTAGRAM_IG_USER_ID)' },
      { status: 400 },
    )
  }
  if (!recipientId) {
    return NextResponse.json(
      { error: 'Missing recipientId and no lastSenderId in state. Send a DM to the IG account first so we can capture sender id.' },
      { status: 400 },
    )
  }
  if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 })

  const result = await sendInstagramMessage({ igUserId, recipientId, text })
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}


