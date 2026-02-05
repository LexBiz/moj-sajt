import { NextResponse } from 'next/server'
import { getWhatsAppWebhookState } from '../state'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function tokenMeta(token: string) {
  return { len: token.length, prefix: token.slice(0, 4), suffix: token.slice(-4) }
}

export async function GET() {
  const VERIFY_TOKEN = (process.env.WHATSAPP_VERIFY_TOKEN || '').trim()
  const WA_APP_SECRET = (process.env.WHATSAPP_APP_SECRET || '').trim()
  const IG_APP_SECRET = (process.env.INSTAGRAM_APP_SECRET || '').trim()
  const SIGNATURE_BYPASS = (process.env.WHATSAPP_SIGNATURE_BYPASS || '').trim() === 'true'
  const ACCESS_TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim()
  const PHONE_NUMBER_ID = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
  const WABA_ID = (process.env.WHATSAPP_WABA_ID || '').trim()

  return NextResponse.json(
    {
      ok: true,
      whatsapp: {
        hasVerifyToken: Boolean(VERIFY_TOKEN),
        hasAppSecret: Boolean(WA_APP_SECRET || IG_APP_SECRET),
        appSecrets: {
          whatsapp: { present: Boolean(WA_APP_SECRET), len: WA_APP_SECRET.length },
          instagram: { present: Boolean(IG_APP_SECRET), len: IG_APP_SECRET.length },
          usingInstagramFallback: !WA_APP_SECRET && Boolean(IG_APP_SECRET),
        },
        signatureBypass: SIGNATURE_BYPASS,
        hasAccessToken: Boolean(ACCESS_TOKEN),
        accessTokenMeta: ACCESS_TOKEN ? tokenMeta(ACCESS_TOKEN) : null,
        hasPhoneNumberId: Boolean(PHONE_NUMBER_ID),
        phoneNumberIdLast4: PHONE_NUMBER_ID ? PHONE_NUMBER_ID.slice(-4) : null,
        hasWabaId: Boolean(WABA_ID),
        wabaIdLast4: WABA_ID ? WABA_ID.slice(-4) : null,
      },
      whatsappWebhook: getWhatsAppWebhookState(),
    },
    {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  )
}


