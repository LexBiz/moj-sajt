import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../_auth'
import { readTokenFile, tokenMeta } from '../../oauth/_store'
import { readInstagramAdminConfig } from '../_store'
import { getInstagramWebhookState } from '../../state'
import { getBuildInfo } from '../../../_build'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tokenFile = readTokenFile()
  const cfg = readInstagramAdminConfig()

  const openaiKey = (process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '').trim()
  const build = getBuildInfo()

  return NextResponse.json(
    {
      ok: true,
      build,
      auth: { ok: true },
      token: tokenFile?.accessToken ? { exists: true, meta: tokenMeta(tokenFile.accessToken), obtainedAt: tokenFile.obtainedAt } : { exists: false },
      selected: cfg,
      webhook: getInstagramWebhookState(),
      env: {
        hasAccessToken: Boolean((process.env.INSTAGRAM_ACCESS_TOKEN || '').trim()),
        hasIgUserId: Boolean((process.env.INSTAGRAM_IG_USER_ID || '').trim()),
        apiHost: (process.env.INSTAGRAM_API_HOST || 'graph.facebook.com').trim(),
        apiVersion: (process.env.INSTAGRAM_API_VERSION || 'v24.0').trim(),
        openai: {
          hasKey: Boolean(openaiKey),
          model: (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
          keyMeta: openaiKey ? { len: openaiKey.length, prefix: openaiKey.slice(0, 4), suffix: openaiKey.slice(-4) } : null,
        },
      },
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}





