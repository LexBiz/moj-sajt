import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../_auth'
import { readTokenFile } from '../../oauth/_store'
import { readInstagramAdminConfig } from '../_store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getAccessToken() {
  const envToken = (process.env.INSTAGRAM_ACCESS_TOKEN || '').trim()
  if (envToken) return envToken
  const saved = (readTokenFile()?.accessToken || '').trim()
  return saved
}

async function graphPost(path: string, accessToken: string, params: Record<string, string>) {
  const url = new URL(`https://graph.facebook.com/v24.0/${path}`)
  url.searchParams.set('access_token', accessToken)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const resp = await fetch(url.toString(), { method: 'POST' })
  const text = await resp.text().catch(() => '')
  const json = (() => {
    try {
      return JSON.parse(text) as any
    } catch {
      return null
    }
  })()
  return { ok: resp.ok, status: resp.status, json, text }
}

async function graphGet(path: string, accessToken: string) {
  const url = new URL(`https://graph.facebook.com/v24.0/${path}`)
  url.searchParams.set('access_token', accessToken)
  const resp = await fetch(url.toString(), { method: 'GET' })
  const text = await resp.text().catch(() => '')
  const json = (() => {
    try {
      return JSON.parse(text) as any
    } catch {
      return null
    }
  })()
  return { ok: resp.ok, status: resp.status, json, text }
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cfg = readInstagramAdminConfig()
  const body = (await request.json().catch(() => ({}))) as any
  const igUserId = (typeof body?.igUserId === 'string' ? body.igUserId : cfg.selectedIgUserId || '').trim()
  if (!igUserId) return NextResponse.json({ error: 'Missing igUserId (select IG account first)' }, { status: 400 })

  const token = getAccessToken()
  if (!token) return NextResponse.json({ error: 'Missing access token (run Meta Login first)' }, { status: 400 })

  // Subscribe Instagram business account to this app.
  // This is the subscription that typically controls real Instagram messaging webhooks delivery.
  const subscribedFields = (typeof body?.fields === 'string' && body.fields.trim())
    ? body.fields.trim()
    : 'messages,message_reactions,messaging_postbacks'

  const subResp = await graphPost(`${igUserId}/subscribed_apps`, token, { subscribed_fields: subscribedFields })
  const checkResp = await graphGet(`${igUserId}/subscribed_apps?limit=50`, token)

  return NextResponse.json(
    {
      ok: true,
      igUserId,
      requestedFields: subscribedFields,
      subscribe: subResp.ok ? { ok: true, json: subResp.json } : { ok: false, status: subResp.status, details: subResp.json || subResp.text?.slice(0, 900) },
      subscribedApps: checkResp.ok ? { ok: true, json: checkResp.json } : { ok: false, status: checkResp.status, details: checkResp.json || checkResp.text?.slice(0, 900) },
      note:
        'If this succeeds, real (non-test) IG message webhooks should start arriving for the selected Instagram business account (assuming you configured the webhook URL in Meta Dashboard).',
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}


