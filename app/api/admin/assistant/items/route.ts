import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { createAssistantItem, listAssistantItems, updateAssistantItem } from '@/app/lib/storage'

function normalizeTenantId(input: unknown) {
  const raw = typeof input === 'string' ? input.trim().toLowerCase() : ''
  if (!raw) return 'temoweb'
  const safe = raw.replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return safe || 'temoweb'
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tenantId = normalizeTenantId(searchParams.get('tenantId'))
  const kind = searchParams.get('kind')
  const status = searchParams.get('status')
  const q = searchParams.get('q')
  const limit = Number(searchParams.get('limit') || 60) || 60

  const items = await listAssistantItems({ tenantId, kind, status, q, limit })
  return NextResponse.json({ ok: true, tenantId, items })
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as any
  const tenantId = normalizeTenantId(body?.tenantId)
  const item = await createAssistantItem({
    tenantId,
    kind: body?.kind,
    title: body?.title,
    body: body?.body,
    status: body?.status,
    priority: body?.priority,
    dueAt: body?.dueAt,
    remindAt: body?.remindAt,
    tags: body?.tags,
    meta: body?.meta,
  })
  return NextResponse.json({ ok: true, item })
}

export async function PATCH(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as any
  const id = Number(body?.id)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

  const updated = await updateAssistantItem(id, body?.patch || {})
  return NextResponse.json({ ok: true, item: updated })
}

