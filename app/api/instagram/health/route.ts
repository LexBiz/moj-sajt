import { NextResponse } from 'next/server'
import { getInstagramWebhookState } from '../state'
import { getBuildInfo } from '../../_build'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const build = getBuildInfo()
  const IG_VERIFY_TOKEN = (process.env.INSTAGRAM_VERIFY_TOKEN || '').trim()
  const IG_APP_SECRET = (process.env.INSTAGRAM_APP_SECRET || '').trim()
  const IG_SIGNATURE_BYPASS = (process.env.INSTAGRAM_SIGNATURE_BYPASS || '').trim() === 'true'
  const IG_ACCESS_TOKEN = (process.env.INSTAGRAM_ACCESS_TOKEN || '').trim()
  const IG_USER_ID = (process.env.INSTAGRAM_IG_USER_ID || '').trim()
  const IG_API_HOST = (process.env.INSTAGRAM_API_HOST || 'graph.facebook.com').trim()
  const IG_API_VERSION = (process.env.INSTAGRAM_API_VERSION || 'v24.0').trim()
  const IG_DEBUG_SECRET = (process.env.INSTAGRAM_DEBUG_SECRET || '').trim()
  const OPENAI_KEY = (process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '').trim()
  const OPENAI_MODEL = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()

  return NextResponse.json(
    {
    ok: true,
    build,
    instagram: {
      hasVerifyToken: Boolean(IG_VERIFY_TOKEN),
      hasAppSecret: Boolean(IG_APP_SECRET),
      signatureBypass: IG_SIGNATURE_BYPASS,
      hasAccessToken: Boolean(IG_ACCESS_TOKEN),
      accessTokenMeta: IG_ACCESS_TOKEN
        ? {
            len: IG_ACCESS_TOKEN.length,
            prefix: IG_ACCESS_TOKEN.slice(0, 4),
            suffix: IG_ACCESS_TOKEN.slice(-4),
          }
        : null,
      hasIgUserId: Boolean(IG_USER_ID),
      igUserIdLast4: IG_USER_ID ? IG_USER_ID.slice(-4) : null,
      hasDebugSecret: Boolean(IG_DEBUG_SECRET),
      api: {
        host: IG_API_HOST,
        version: IG_API_VERSION,
      },
    },
    openai: {
      hasKey: Boolean(OPENAI_KEY),
      model: OPENAI_MODEL,
      keyMeta: OPENAI_KEY ? { len: OPENAI_KEY.length, prefix: OPENAI_KEY.slice(0, 4), suffix: OPENAI_KEY.slice(-4) } : null,
    },
    instagramWebhook: getInstagramWebhookState(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  )
}


