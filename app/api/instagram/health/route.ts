import { NextResponse } from 'next/server'

export async function GET() {
  const IG_VERIFY_TOKEN = (process.env.INSTAGRAM_VERIFY_TOKEN || '').trim()
  const IG_APP_SECRET = (process.env.INSTAGRAM_APP_SECRET || '').trim()
  const IG_SIGNATURE_BYPASS = (process.env.INSTAGRAM_SIGNATURE_BYPASS || '').trim() === 'true'
  const IG_ACCESS_TOKEN = (process.env.INSTAGRAM_ACCESS_TOKEN || '').trim()
  const IG_USER_ID = (process.env.INSTAGRAM_IG_USER_ID || '').trim()

  return NextResponse.json({
    ok: true,
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
    },
  })
}


