import { NextRequest, NextResponse } from 'next/server'
import { recordInstagramWebhook } from '../../state'
import { readTokenFile, tokenMeta, verifyState, writeTokenFile } from '../_store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function exchangeCodeForShortLivedToken(input: { appId: string; appSecret: string; redirectUri: string; code: string }) {
  const url = new URL('https://graph.instagram.com/access_token')
  // According to Instagram OAuth spec, this endpoint expects a POST form.
  const body = new URLSearchParams()
  body.set('client_id', input.appId)
  body.set('client_secret', input.appSecret)
  body.set('grant_type', 'authorization_code')
  body.set('redirect_uri', input.redirectUri)
  body.set('code', input.code)

  const r = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const j = (await r.json().catch(() => ({}))) as any
  if (!r.ok) throw new Error(`token_exchange_failed ${r.status} ${JSON.stringify(j).slice(0, 300)}`)
  const token = j?.access_token
  if (typeof token !== 'string' || !token) throw new Error('token_exchange_missing_access_token')
  const expiresIn = typeof j?.expires_in === 'number' ? j.expires_in : null
  return { accessToken: token, expiresIn, raw: j }
}

async function exchangeShortLivedToLongLived(input: { appSecret: string; shortLivedToken: string }) {
  const url = new URL('https://graph.instagram.com/access_token')
  url.searchParams.set('grant_type', 'ig_exchange_token')
  url.searchParams.set('client_secret', input.appSecret)
  url.searchParams.set('access_token', input.shortLivedToken)
  const r = await fetch(url.toString())
  const j = (await r.json().catch(() => ({}))) as any
  if (!r.ok) throw new Error(`long_lived_exchange_failed ${r.status} ${JSON.stringify(j).slice(0, 300)}`)
  const token = j?.access_token
  if (typeof token !== 'string' || !token) throw new Error('long_lived_exchange_missing_access_token')
  const expiresIn = typeof j?.expires_in === 'number' ? j.expires_in : null
  return { accessToken: token, expiresIn, raw: j }
}

export async function GET(request: NextRequest) {
  const u = new URL(request.url)
  const code = u.searchParams.get('code')
  const state = u.searchParams.get('state')

  const appId = (process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID || '').trim()
  const appSecret = (process.env.INSTAGRAM_APP_SECRET || '').trim()
  const redirectUri = (process.env.INSTAGRAM_OAUTH_REDIRECT_URI || '').trim()

  if (!appId || !appSecret || !redirectUri) {
    return NextResponse.json(
      {
        error: 'Missing INSTAGRAM_APP_ID/INSTAGRAM_APP_SECRET/INSTAGRAM_OAUTH_REDIRECT_URI',
        required: ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET', 'INSTAGRAM_OAUTH_REDIRECT_URI'],
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const statePayload = verifyState(state)
  if (!statePayload) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }

  if (!code) {
    return NextResponse.json(
      { error: 'Missing code', hint: 'Open /api/instagram/oauth/start to begin OAuth flow' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // Exchange code -> short-lived token -> long-lived token (recommended for server use).
  let accessToken = ''
  let expiresIn: number | null = null
  let debug: any = null
  try {
    const short = await exchangeCodeForShortLivedToken({ appId, appSecret, redirectUri, code })
    debug = { stage: 'short', ok: true, expiresIn: short.expiresIn }
    const long = await exchangeShortLivedToLongLived({ appSecret, shortLivedToken: short.accessToken })
    accessToken = long.accessToken
    expiresIn = long.expiresIn
    debug = { stage: 'long', ok: true, expiresIn }
  } catch (e: any) {
    return NextResponse.json(
      { error: 'oauth_exchange_failed', details: String(e?.message || e) },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  writeTokenFile({
    obtainedAt: new Date().toISOString(),
    accessToken,
    expiresIn,
    tokenType: 'bearer',
    appId,
    debug,
  })

  // Record in webhook-state store just as a visibility beacon (not a webhook).
  recordInstagramWebhook({ object: 'oauth', senderId: null, textPreview: `token_saved ${tokenMeta(accessToken).prefix}…` })

  const existing = readTokenFile()
  const meta = existing?.accessToken ? tokenMeta(existing.accessToken) : tokenMeta(accessToken)

  const returnTo = typeof statePayload?.returnTo === 'string' ? statePayload.returnTo : null

  // Prefer redirecting back to the UI after login (better for App Review video).
  if (returnTo && typeof returnTo === 'string' && returnTo.startsWith('/')) {
    const back = new URL(returnTo, u.origin)
    back.searchParams.set('oauth', 'ok')
    return NextResponse.redirect(back.toString(), { headers: { 'Cache-Control': 'no-store' } })
  }

  return NextResponse.json(
    { ok: true, saved: true, tokenMeta: meta, returnTo },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}


