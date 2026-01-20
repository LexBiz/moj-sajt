import { NextRequest, NextResponse } from 'next/server'
import { recordInstagramWebhook } from '../../state'
import { readTokenFile, tokenMeta, verifyState, writeTokenFile } from '../_store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getAppAccessToken(appId: string, appSecret: string) {
  const url = new URL('https://graph.facebook.com/oauth/access_token')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('grant_type', 'client_credentials')
  const r = await fetch(url.toString())
  const j = (await r.json().catch(() => ({}))) as any
  if (!r.ok) throw new Error(`app_access_token_error ${r.status} ${JSON.stringify(j).slice(0, 300)}`)
  const token = j?.access_token
  if (typeof token !== 'string' || !token) throw new Error('app_access_token_missing')
  return token
}

async function debugToken(inputToken: string, appAccessToken: string) {
  const url = new URL('https://graph.facebook.com/debug_token')
  url.searchParams.set('input_token', inputToken)
  url.searchParams.set('access_token', appAccessToken)
  const r = await fetch(url.toString())
  const j = (await r.json().catch(() => ({}))) as any
  return { ok: r.ok, status: r.status, json: j }
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

  // Exchange code for user access token
  const tokenUrl = new URL('https://graph.facebook.com/v24.0/oauth/access_token')
  tokenUrl.searchParams.set('client_id', appId)
  tokenUrl.searchParams.set('client_secret', appSecret)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('code', code)

  const tokenResp = await fetch(tokenUrl.toString())
  const tokenJson = (await tokenResp.json().catch(() => ({}))) as any

  if (!tokenResp.ok) {
    return NextResponse.json(
      { error: 'token_exchange_failed', status: tokenResp.status, details: tokenJson },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const accessToken = tokenJson?.access_token
  if (typeof accessToken !== 'string' || !accessToken) {
    return NextResponse.json(
      { error: 'token_exchange_missing_access_token', details: tokenJson },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // Debug token scopes (best-effort)
  let debug: any = null
  try {
    const appAccessToken = await getAppAccessToken(appId, appSecret)
    debug = await debugToken(accessToken, appAccessToken)
  } catch (e) {
    debug = { ok: false, error: String(e) }
  }

  writeTokenFile({
    obtainedAt: new Date().toISOString(),
    accessToken,
    expiresIn: typeof tokenJson?.expires_in === 'number' ? tokenJson.expires_in : null,
    tokenType: typeof tokenJson?.token_type === 'string' ? tokenJson.token_type : null,
    appId,
    debug,
  })

  // Record in webhook-state store just as a visibility beacon (not a webhook).
  recordInstagramWebhook({ object: 'oauth', senderId: null, textPreview: `token_saved ${tokenMeta(accessToken).prefix}…` })

  const existing = readTokenFile()
  const meta = existing?.accessToken ? tokenMeta(existing.accessToken) : tokenMeta(accessToken)

  const returnTo = typeof statePayload?.returnTo === 'string' ? statePayload.returnTo : null

  return NextResponse.json(
    {
      ok: true,
      saved: true,
      tokenMeta: meta,
      next: {
        // Set these on server .env to switch the bot to the Instagram Login Messaging API
        env: {
          INSTAGRAM_API_HOST: 'graph.instagram.com',
          INSTAGRAM_API_VERSION: 'v24.0',
          INSTAGRAM_ACCESS_TOKEN: '[use saved token file]',
        },
      },
      note:
        'Token stored server-side. DO NOT share tokens. To view it on the server: cat data/instagram-login-token.json. If OAuth login shows "Invalid Scopes", set INSTAGRAM_OAUTH_SCOPE=instagram_basic,instagram_manage_messages (or the exact scopes available in your app).',
      returnTo,
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}


