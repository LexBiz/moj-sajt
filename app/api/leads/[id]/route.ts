import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const LEADS_FILE = path.join(process.cwd(), 'data', 'leads.json')

function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, JSON.stringify([]))
}

function isAuthorized(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  return authHeader === `Bearer ${password}`
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  ensureDataDir()

  const idNum = Number(params.id)
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const body = (await request.json()) as { status?: string; notes?: string | null }
    const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'))
    const idx = Array.isArray(leads) ? leads.findIndex((l) => Number(l?.id) === idNum) : -1
    if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const allowed = new Set(['new', 'contacted', 'qualified', 'won', 'lost', 'junk'])
    const nextStatus = typeof body.status === 'string' && allowed.has(body.status) ? body.status : null
    const nextNotes = body.notes == null ? null : String(body.notes).trim() || null

    const updated = {
      ...leads[idx],
      ...(nextStatus ? { status: nextStatus } : {}),
      notes: nextNotes,
      updatedAt: new Date().toISOString(),
    }
    leads[idx] = updated
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2))
    return NextResponse.json({ success: true, lead: updated })
  } catch (e) {
    console.error('Lead update error:', e)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}


