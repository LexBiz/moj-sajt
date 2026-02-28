import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { getAssistantTemplateById, getTenantAssistantConfig, getTenantProfile, upsertTenantAssistantConfig, upsertTenantProfile } from '@/app/lib/storage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function normTenantId(input: unknown) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const tenantId = normTenantId(searchParams.get('tenantId'))
  if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  const config = await getTenantAssistantConfig(tenantId)
  return NextResponse.json({ ok: true, config }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as any
  const tenantId = normTenantId(body?.tenantId)
  if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  const templateId = body?.templateId ? String(body.templateId).trim() : null
  const overrides = body?.overrides && typeof body.overrides === 'object' ? body.overrides : {}

  const saved = await upsertTenantAssistantConfig({
    tenantId,
    templateId,
    templateVersion: body?.templateVersion,
    overrides,
  })

  // Optional helper: apply selected template payload fields into tenant profile once.
  if (body?.applyToProfile === true && templateId) {
    const tpl = await getAssistantTemplateById(templateId)
    const payload = (tpl?.payload || {}) as any
    const current = (await getTenantProfile(tenantId).catch(() => null)) || { tenantId }
    const next = {
      ...current,
      tenantId,
      niche: payload?.niche ?? current?.niche ?? null,
      offer: payload?.offer ?? current?.offer ?? null,
      services: Array.isArray(payload?.services) ? payload.services : current?.services || [],
      faq: Array.isArray(payload?.faq) ? payload.faq : current?.faq || [],
      notes: payload?.notes ?? current?.notes ?? null,
      updatedAt: new Date().toISOString(),
    }
    await upsertTenantProfile(next)
  }

  return NextResponse.json({ ok: true, config: saved }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}

