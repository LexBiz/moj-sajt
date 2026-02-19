import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { listAssistantMessages } from '@/app/lib/storage'

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
  const limit = Number(searchParams.get('limit') || 60) || 60
  const messages = await listAssistantMessages({ tenantId, limit })
  return NextResponse.json({ ok: true, tenantId, messages })
}

