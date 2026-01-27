import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

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

const TENANTS_FILE = path.join(process.cwd(), 'data', 'tenants.json')
const DEFAULT_TENANT: Tenant = {
  id: 'temoweb',
  name: 'TemoWeb (внутренний)',
  plan: 'PRO',
  createdAt: new Date().toISOString(),
  updatedAt: null,
  notes: 'Системный tenant для твоего бизнеса (TemoWeb).',
}

function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function isAuthorized(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const password = (process.env.ADMIN_PASSWORD || 'admin123').trim()
  return authHeader === `Bearer ${password}`
}

function readTenants(): Tenant[] {
  try {
    ensureDataDir()
    if (!fs.existsSync(TENANTS_FILE)) return [DEFAULT_TENANT]
    const raw = fs.readFileSync(TENANTS_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    const arr = Array.isArray(parsed) ? parsed : []
    const normalized: Tenant[] = arr
      .map((x: any) => ({
        id: typeof x?.id === 'string' ? x.id.trim() : '',
        name: typeof x?.name === 'string' ? x.name.trim() : '',
        plan: (x?.plan === 'START' || x?.plan === 'BUSINESS' || x?.plan === 'PRO' ? x.plan : 'START') as TenantPlan,
        createdAt: typeof x?.createdAt === 'string' ? x.createdAt : new Date().toISOString(),
        updatedAt: typeof x?.updatedAt === 'string' ? x.updatedAt : null,
        notes: x?.notes == null ? null : String(x.notes).trim() || null,
      }))
      .filter((t) => Boolean(t.id && t.name))

    // Ensure default tenant exists (for backward compatibility).
    if (!normalized.some((t) => t.id === DEFAULT_TENANT.id)) {
      normalized.unshift(DEFAULT_TENANT)
    }
    return normalized
  } catch {
    return [DEFAULT_TENANT]
  }
}

function writeTenants(list: Tenant[]) {
  ensureDataDir()
  fs.writeFileSync(TENANTS_FILE, JSON.stringify(list, null, 2), 'utf-8')
}

function normalizeId(input: string) {
  const raw = String(input || '').trim().toLowerCase()
  // keep: latin letters, digits, dash, underscore
  const safe = raw.replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return safe
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenants = readTenants()
  return NextResponse.json({ ok: true, tenants }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<Pick<Tenant, 'id' | 'name' | 'plan' | 'notes'>>
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const desiredId = typeof body.id === 'string' ? normalizeId(body.id) : ''
    const baseId = desiredId || normalizeId(name) || `tenant-${Date.now()}`
    const plan: TenantPlan = body.plan === 'START' || body.plan === 'BUSINESS' || body.plan === 'PRO' ? body.plan : 'START'
    const notes = body.notes == null ? null : String(body.notes).trim() || null

    const tenants = readTenants()
    let id = baseId
    if (id === DEFAULT_TENANT.id) {
      id = `${id}-${Date.now()}`
    }
    if (tenants.some((t) => t.id === id)) {
      id = `${id}-${String(Date.now()).slice(-6)}`
    }

    const now = new Date().toISOString()
    const next: Tenant = { id, name, plan, createdAt: now, updatedAt: null, notes }
    const out = [next, ...tenants]
    writeTenants(out)
    return NextResponse.json({ ok: true, tenant: next }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (e) {
    console.error('Tenants create error:', e)
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
  }
}

