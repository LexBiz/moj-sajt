import { NextRequest, NextResponse } from 'next/server'
import { getInstagramWebhookState } from '../state'
import { readTokenFile } from '../oauth/_store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const IG_USER_ID = (process.env.INSTAGRAM_IG_USER_ID || '').trim()
const IG_API_HOST = (process.env.INSTAGRAM_API_HOST || 'graph.facebook.com').trim()
const IG_API_VERSION = (process.env.INSTAGRAM_API_VERSION || 'v24.0').trim()

const DEBUG_SECRET = (process.env.INSTAGRAM_DEBUG_SECRET || '').trim()

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

async function sendInstagramMessage(recipientId: string, text: string) {
  const IG_ACCESS_TOKEN = getAccessToken()
  if (!IG_ACCESS_TOKEN || !IG_USER_ID) {
    return { ok: false, error: 'Missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_IG_USER_ID' as const }
  }

  const urlObj = new URL(`https://${IG_API_HOST}/${IG_API_VERSION}/${IG_USER_ID}/messages`)
  // For graph.facebook.com we keep access_token in query (URL-encoded) since many examples use it.
  // For graph.instagram.com (Instagram API with Instagram Login) we do NOT include it in query.
  if (IG_API_HOST !== 'graph.instagram.com') {
    urlObj.searchParams.set('access_token', IG_ACCESS_TOKEN)
  }

  const body = {
    recipient: { id: recipientId },
    messaging_type: 'RESPONSE',
    message: { text: clip(text, 1000) },
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
        igUserIdLast4: IG_USER_ID ? IG_USER_ID.slice(-4) : null,
        recipientId,
        textPreview: clip(text, 200),
      },
    }
  }

  return {
    ok: true,
    status: resp.status,
    responseJson: parsed,
    request: {
      api: `${IG_API_HOST}/${IG_API_VERSION}`,
      igUserIdLast4: IG_USER_ID ? IG_USER_ID.slice(-4) : null,
      recipientId,
      textPreview: clip(text, 200),
    },
  }
}

export async function GET() {
  const state = getInstagramWebhookState()
  const IG_ACCESS_TOKEN = getAccessToken()
  return NextResponse.json(
    {
      ok: true,
      hint: 'POST with JSON { "text": "hi", "recipientId": "optional" }. If recipientId is omitted, lastSenderId from webhook state is used.',
      requires: ['INSTAGRAM_DEBUG_SECRET (header x-debug-secret)'],
      env: {
        hasAccessToken: Boolean(IG_ACCESS_TOKEN),
        hasIgUserId: Boolean(IG_USER_ID),
        api: `${IG_API_HOST}/${IG_API_VERSION}`,
      },
      last: {
        lastSenderId: state.lastSenderId,
        lastTextPreview: state.lastTextPreview,
        lastReceivedAt: state.lastReceivedAt,
      },
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}

export async function POST(request: NextRequest) {
  if (!DEBUG_SECRET) {
    return NextResponse.json({ error: 'INSTAGRAM_DEBUG_SECRET is not configured' }, { status: 500 })
  }
  const provided = (request.headers.get('x-debug-secret') || '').trim()
  if (!provided || provided !== DEBUG_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const state = getInstagramWebhookState()

  let body: any = {}
  try {
    body = (await request.json().catch(() => ({}))) as any
  } catch {
    body = {}
  }

  const recipientId = (typeof body?.recipientId === 'string' ? body.recipientId : state.lastSenderId || '').trim()
  const text = (typeof body?.text === 'string' ? body.text : '').trim()

  if (!recipientId) {
    return NextResponse.json(
      { error: 'Missing recipientId and no lastSenderId in state. Send a DM to the IG account first so we can capture sender id.' },
      { status: 400 },
    )
  }
  if (!text) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 })
  }

  const result = await sendInstagramMessage(recipientId, text)
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}





