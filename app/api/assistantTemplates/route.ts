import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { listAssistantTemplates, upsertAssistantTemplate } from '@/app/lib/storage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const templates = await listAssistantTemplates()
  return NextResponse.json({ ok: true, templates }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as any
  const name = String(body?.name || '').trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  let payload: any = body?.payload
  if (typeof payload === 'string' && payload.trim()) {
    try {
      payload = JSON.parse(payload)
    } catch {
      return NextResponse.json({ error: 'payload must be valid JSON' }, { status: 400 })
    }
  }
  if (!payload || typeof payload !== 'object') payload = {}

  const saved = await upsertAssistantTemplate({
    id: body?.id,
    slug: body?.slug,
    name,
    description: body?.description ?? null,
    payload,
    isActive: body?.isActive !== false,
    version: body?.version,
  })
  return NextResponse.json({ ok: true, template: saved }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}

