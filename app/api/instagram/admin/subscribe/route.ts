import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../_auth'
import { readTokenFile } from '../../oauth/_store'
import { readInstagramAdminConfig } from '../_store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getUserAccessToken() {
  const envToken = (process.env.INSTAGRAM_ACCESS_TOKEN || '').trim()
  if (envToken) return envToken
  const saved = (readTokenFile()?.accessToken || '').trim()
  return saved
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

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cfg = readInstagramAdminConfig()
  const body = (await request.json().catch(() => ({}))) as any
  const pageId = (typeof body?.pageId === 'string' ? body.pageId : cfg.selectedPageId || '').trim()

  if (!pageId) return NextResponse.json({ error: 'Missing pageId (select a Page first)' }, { status: 400 })

  const userToken = getUserAccessToken()
  if (!userToken) return NextResponse.json({ error: 'Missing user access token (run Meta Login first)' }, { status: 400 })

  // Find a Page access token for the selected page
  const pagesResp = await graphGet('me/accounts?fields=id,name,access_token&limit=200', userToken)
  if (!pagesResp.ok) {
    return NextResponse.json(
      { error: 'me/accounts failed', status: pagesResp.status, details: pagesResp.json || pagesResp.text?.slice(0, 600) },
      { status: 400 },
    )
  }
  const pages = Array.isArray(pagesResp.json?.data) ? pagesResp.json.data : []
  const found = pages.find((p: any) => String(p?.id || '') === pageId)
  const pageToken = (typeof found?.access_token === 'string' ? found.access_token : '').trim()
  if (!pageToken) {
    return NextResponse.json(
      {
        error: 'Missing page access token',
        hint: 'Your user token may not include page access / required permissions to manage subscriptions.',
      },
      { status: 400 },
    )
  }

  // Subscribe the Page to this app so real webhooks are delivered (not only Meta "Test").
  // Instagram messaging is delivered under Page webhooks as "messages" (and sometimes messaging_postbacks / message_reactions).
  const subscribedFields = (typeof body?.fields === 'string' && body.fields.trim())
    ? body.fields.trim()
    : 'messages,message_reactions,messaging_postbacks'

  const subResp = await graphPost(`${pageId}/subscribed_apps`, pageToken, { subscribed_fields: subscribedFields })

  // Also fetch current subscriptions for visibility
  const checkResp = await graphGet(`${pageId}/subscribed_apps?limit=50`, pageToken)

  return NextResponse.json(
    {
      ok: true,
      pageId,
      requestedFields: subscribedFields,
      subscribe: subResp.ok ? { ok: true, json: subResp.json } : { ok: false, status: subResp.status, details: subResp.json || subResp.text?.slice(0, 800) },
      subscribedApps: checkResp.ok ? { ok: true, json: checkResp.json } : { ok: false, status: checkResp.status, details: checkResp.json || checkResp.text?.slice(0, 800) },
      note:
        'If real DMs still do not arrive, ensure you subscribed to the correct Webhooks object/field in Meta Dashboard and that the IG professional account is connected to this Page.',
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}


