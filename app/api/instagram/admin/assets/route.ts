import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../_auth'
import { readTokenFile } from '../../oauth/_store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type FbPage = {
  id: string
  name?: string
  access_token?: string
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

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userAccessToken =
    (readTokenFile()?.accessToken || '').trim() || (process.env.INSTAGRAM_ACCESS_TOKEN || '').trim()

  if (!userAccessToken) {
    return NextResponse.json(
      { error: 'Missing token', hint: 'Run OAuth first: /api/instagram/oauth/start', required: ['INSTAGRAM_ACCESS_TOKEN or saved token file'] },
      { status: 400 },
    )
  }

  // Pages the user manages
  const pagesResp = await graphGet('me/accounts?fields=id,name,access_token&limit=50', userAccessToken)
  if (!pagesResp.ok) {
    return NextResponse.json(
      { error: 'me/accounts failed', status: pagesResp.status, details: pagesResp.json || pagesResp.text?.slice(0, 600) },
      { status: 400 },
    )
  }

  const pages: FbPage[] = Array.isArray(pagesResp.json?.data) ? pagesResp.json.data : []

  // For each page, resolve connected Instagram business account
  const out: Array<{
    pageId: string
    pageName: string | null
    igBusinessAccountId: string | null
  }> = []

  for (const p of pages) {
    const pageId = String(p?.id || '').trim()
    if (!pageId) continue
    const pageName = typeof p?.name === 'string' ? p.name : null
    const pageToken = (typeof p?.access_token === 'string' ? p.access_token : '').trim() || userAccessToken

    // Try a couple of common fields; not all apps have all fields enabled.
    const r1 = await graphGet(`${pageId}?fields=instagram_business_account`, pageToken)
    const ig1 = r1.ok ? r1.json?.instagram_business_account?.id : null
    const r2 = ig1 ? null : await graphGet(`${pageId}?fields=connected_instagram_account`, pageToken)
    const ig2 = r2?.ok ? r2.json?.connected_instagram_account?.id : null

    out.push({
      pageId,
      pageName,
      igBusinessAccountId: typeof ig1 === 'string' ? ig1 : typeof ig2 === 'string' ? ig2 : null,
    })
  }

  return NextResponse.json(
    {
      ok: true,
      pages: out,
      note: 'Pick a Page that has a connected Instagram professional account (igBusinessAccountId). This is used for “resource selection” in App Review.',
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}



