import { NextRequest, NextResponse } from 'next/server'
import { signState } from '../_store'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const appId = (process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID || '').trim()
  const redirectUri = (process.env.INSTAGRAM_OAUTH_REDIRECT_URI || '').trim()
  const urlIn = new URL(request.url)
  const mode = (urlIn.searchParams.get('mode') || '').trim().toLowerCase()
  const scopeParam = (urlIn.searchParams.get('scope') || '').trim()
  const scope =
    scopeParam ||
    (process.env.INSTAGRAM_OAUTH_SCOPE || '').trim() ||
    // Updated Instagram Login scopes (2025+):
    // These scopes are used both for App Review and for OAuth consent.
    // Add page scopes in "pages" mode to enable resource selection (Page → IG business account).
    (mode === 'pages'
      ? 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging'
      : 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments')

  if (!appId || !redirectUri) {
    return NextResponse.json(
      {
        error: 'Missing INSTAGRAM_APP_ID or INSTAGRAM_OAUTH_REDIRECT_URI',
        required: ['INSTAGRAM_APP_ID', 'INSTAGRAM_OAUTH_REDIRECT_URI'],
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // Instagram API with Instagram Login uses Instagram OAuth authorize endpoint.
  // This is required for instagram_business_* scopes; using Facebook /dialog/oauth will produce "Invalid Scopes".
  const url = new URL('https://api.instagram.com/oauth/authorize')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scope)
  url.searchParams.set('force_reauth', 'true')

  // CSRF protection + correlation id
  const nonce = crypto.randomUUID()
  const state = signState({
    v: 1,
    nonce,
    ts: Date.now(),
    // allow returning to original page
    returnTo: urlIn.searchParams.get('returnTo'),
    mode: mode || null,
  })
  url.searchParams.set('state', state)

  return NextResponse.redirect(url.toString(), {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}


