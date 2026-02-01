import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { listTenants, upsertTenant } from '@/app/lib/storage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type TenantPlan = 'START' | 'BUSINESS' | 'PRO'

export type Tenant = {
  id: string
  name: string
  plan: TenantPlan
  createdAt: string
  updatedAt: string | null
  notes: string | null
}

const DEFAULT_TENANT: Tenant = {
  id: 'temoweb',
  name: 'TemoWeb (внутренний)',
  plan: 'PRO',
  createdAt: new Date().toISOString(),
  updatedAt: null,
  notes: 'Системный tenant для твоего бизнеса (TemoWeb).',
}

function normalizeId(input: string) {
  const raw = String(input || '').trim().toLowerCase()
  // keep: latin letters, digits, dash, underscore
  const safe = raw.replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return safe
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let tenants = await listTenants()
  // Ensure default tenant exists in DB (important for FK constraints like channel_connections.tenant_id -> tenants.id).
  const hasDefault = tenants.some((t: any) => String(t?.id || '') === DEFAULT_TENANT.id)
  if (!hasDefault) {
    try {
      await upsertTenant({ id: DEFAULT_TENANT.id, name: DEFAULT_TENANT.name, plan: DEFAULT_TENANT.plan, notes: DEFAULT_TENANT.notes })
      tenants = await listTenants()
    } catch (e) {
      console.error('Failed to upsert default tenant:', e)
      // Continue: UI can still show default tenant, but saves may fail until DB is fixed.
    }
  }
  const out = tenants.some((t: any) => String(t?.id || '') === DEFAULT_TENANT.id) ? tenants : [DEFAULT_TENANT, ...tenants]
  return NextResponse.json({ ok: true, tenants: out }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<Pick<Tenant, 'id' | 'name' | 'plan' | 'notes'>>
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const desiredId = typeof body.id === 'string' ? normalizeId(body.id) : ''
    const baseId = desiredId || normalizeId(name) || `tenant-${Date.now()}`
    const plan: TenantPlan = body.plan === 'START' || body.plan === 'BUSINESS' || body.plan === 'PRO' ? body.plan : 'START'
    const notes = body.notes == null ? null : String(body.notes).trim() || null

    let id = baseId
    if (id === DEFAULT_TENANT.id) {
      id = `${id}-${Date.now()}`
    }
    const now = new Date().toISOString()
    const next: Tenant = { id, name, plan, createdAt: now, updatedAt: null, notes }
    const saved = await upsertTenant({ id: next.id, name: next.name, plan: next.plan, notes: next.notes })
    return NextResponse.json({ ok: true, tenant: saved }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (e) {
    console.error('Tenants create error:', e)
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
  }
}

