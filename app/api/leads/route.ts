import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const LEADS_FILE = path.join(process.cwd(), 'data', 'leads.json')

// Ensure data directory exists
function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify([]))
  }
}

// GET - get all leads (protected)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  
  if (authHeader !== `Bearer ${password}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  ensureDataDir()
  const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'))
  
  return NextResponse.json(leads)
}

// POST - create new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone } = body

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    ensureDataDir()
    const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'))
    
    const newLead = {
      id: Date.now(),
      name,
      phone,
      createdAt: new Date().toISOString(),
      status: 'new'
    }

    leads.unshift(newLead)
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2))

    return NextResponse.json({ success: true, lead: newLead })
  } catch (error) {
    console.error('Error saving lead:', error)
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
  }
}

