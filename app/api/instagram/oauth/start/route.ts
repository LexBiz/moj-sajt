import { NextRequest, NextResponse } from 'next/server'
import { signState } from '../_store'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const appId = (process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID || '').trim()
  const redirectUri = (process.env.INSTAGRAM_OAUTH_REDIRECT_URI || '').trim()
  const scope =
    (process.env.INSTAGRAM_OAUTH_SCOPE || '').trim() ||
    'instagram_business_basic,instagram_business_manage_messages'

  if (!appId || !redirectUri) {
    return NextResponse.json(
      {
        error: 'Missing INSTAGRAM_APP_ID or INSTAGRAM_OAUTH_REDIRECT_URI',
        required: ['INSTAGRAM_APP_ID', 'INSTAGRAM_OAUTH_REDIRECT_URI'],
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const url = new URL('https://www.facebook.com/v24.0/dialog/oauth')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scope)

  // CSRF protection + correlation id
  const nonce = crypto.randomUUID()
  const state = signState({
    v: 1,
    nonce,
    ts: Date.now(),
    // allow returning to original page
    returnTo: new URL(request.url).searchParams.get('returnTo'),
  })
  url.searchParams.set('state', state)

  return NextResponse.redirect(url.toString(), {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}


