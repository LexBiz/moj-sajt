import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { getTenantProfile, upsertTenantProfile } from '@/app/lib/storage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export type TenantProfile = {
  tenantId: string
  updatedAt: string
  // defaults: system language policy
  defaultLang: 'ua' | 'ru'
  allowRuOnlyIfAsked: boolean
  timezone: string
  // business
  niche: string | null
  geo: string | null
  offer: string | null
  services: string[]
  faq: string[]
  // lead rules
  leadMustCollect: { phone: boolean; email: boolean }
  // notifications
  managerTelegramChatId: string | null
  openAiKey: string | null
  notes: string | null
}

function normalizeTenantId(input: unknown) {
  const raw = typeof input === 'string' ? input.trim().toLowerCase() : ''
  if (!raw) return ''
  const safe = raw.replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return safe
}

function defaultProfile(tenantId: string): TenantProfile {
  return {
    tenantId,
    updatedAt: new Date().toISOString(),
    defaultLang: 'ua',
    allowRuOnlyIfAsked: true,
    timezone: 'Europe/Kyiv',
    niche: null,
    geo: null,
    offer: null,
    services: [],
    faq: [],
    leadMustCollect: { phone: true, email: true },
    managerTelegramChatId: null,
    openAiKey: null,
    notes: null,
  }
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const tenantId = normalizeTenantId(searchParams.get('tenantId'))
  if (tenantId) {
    const found = (await getTenantProfile(tenantId)) as TenantProfile | null
    return NextResponse.json({ ok: true, profile: found })
  }
  // For now, keep listing via JSON-store in UI by fetching per tenant (admin UI already uses tenant selector).
  // Return empty list to avoid exposing huge DB reads until we add pagination.
  return NextResponse.json({ ok: true, profiles: [] }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as Partial<TenantProfile> & { tenantId?: string }
  const tenantId = normalizeTenantId(body.tenantId)
  if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })

  const existing = ((await getTenantProfile(tenantId)) as TenantProfile | null) || defaultProfile(tenantId)

  const next: TenantProfile = {
    ...existing,
    updatedAt: new Date().toISOString(),
    defaultLang: body.defaultLang === 'ru' ? 'ru' : 'ua',
    allowRuOnlyIfAsked: body.allowRuOnlyIfAsked !== false,
    timezone: typeof body.timezone === 'string' && body.timezone.trim() ? body.timezone.trim() : existing.timezone,
    niche: body.niche == null ? existing.niche : String(body.niche).trim() || null,
    geo: body.geo == null ? existing.geo : String(body.geo).trim() || null,
    offer: body.offer == null ? existing.offer : String(body.offer).trim() || null,
    services: Array.isArray(body.services) ? body.services.map((x) => String(x).trim()).filter(Boolean).slice(0, 80) : existing.services,
    faq: Array.isArray(body.faq) ? body.faq.map((x) => String(x).trim()).filter(Boolean).slice(0, 120) : existing.faq,
    leadMustCollect: {
      phone: body.leadMustCollect?.phone === false ? false : existing.leadMustCollect.phone,
      email: body.leadMustCollect?.email === false ? false : existing.leadMustCollect.email,
    },
    managerTelegramChatId:
      body.managerTelegramChatId == null ? existing.managerTelegramChatId : String(body.managerTelegramChatId).trim() || null,
    openAiKey: body.openAiKey == null ? existing.openAiKey : String(body.openAiKey).trim() || null,
    notes: body.notes == null ? existing.notes : String(body.notes).trim() || null,
  }

  await upsertTenantProfile(next as any)
  return NextResponse.json({ ok: true, profile: next }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}

