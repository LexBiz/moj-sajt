import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../_auth'
import { writeInstagramAdminConfig } from '../_store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as any
  const pageId = (typeof body?.pageId === 'string' ? body.pageId : '').trim()
  const igUserId = (typeof body?.igUserId === 'string' ? body.igUserId : '').trim()

  if (!pageId || !igUserId) {
    return NextResponse.json(
      { error: 'Missing pageId or igUserId', expected: { pageId: '...', igUserId: '...' } },
      { status: 400 },
    )
  }

  const saved = writeInstagramAdminConfig({ selectedPageId: pageId, selectedIgUserId: igUserId })
  return NextResponse.json({ ok: true, saved }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}



