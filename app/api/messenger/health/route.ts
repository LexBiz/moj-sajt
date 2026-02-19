import { NextResponse } from 'next/server'
import { getMessengerWebhookState } from '../state'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function tokenMeta(token: string) {
  return { len: token.length, prefix: token.slice(0, 4), suffix: token.slice(-4) }
}

export async function GET() {
  const VERIFY_TOKEN = (process.env.MESSENGER_VERIFY_TOKEN || '').trim()
  const APP_SECRET = (process.env.MESSENGER_APP_SECRET || process.env.INSTAGRAM_APP_SECRET || '').trim()
  const SIGNATURE_BYPASS = (process.env.MESSENGER_SIGNATURE_BYPASS || '').trim() === 'true'
  const DEFAULT_PAGE_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN || '').trim()
  const API_HOST = (process.env.MESSENGER_API_HOST || 'graph.facebook.com').trim()
  const API_VERSION = (process.env.MESSENGER_API_VERSION || 'v22.0').trim()

  return NextResponse.json(
    {
      ok: true,
      messenger: {
        hasVerifyToken: Boolean(VERIFY_TOKEN),
        hasAppSecret: Boolean(APP_SECRET),
        signatureBypass: SIGNATURE_BYPASS,
        hasDefaultPageAccessToken: Boolean(DEFAULT_PAGE_TOKEN),
        defaultPageAccessTokenMeta: DEFAULT_PAGE_TOKEN ? tokenMeta(DEFAULT_PAGE_TOKEN) : null,
        api: `${API_HOST}/${API_VERSION}`,
      },
      messengerWebhook: getMessengerWebhookState(),
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}

