import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { requireAdmin } from '@/app/lib/adminAuth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function nowStamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function safeCopy(src: string, dst: string) {
  try {
    if (!fs.existsSync(src)) return false
    fs.copyFileSync(src, dst)
    return true
  } catch {
    return false
  }
}

function safeWrite(src: string, content: string) {
  const dir = path.dirname(src)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(src, content, 'utf8')
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dataDir = path.join(process.cwd(), 'data')
  const backupDir = path.join(dataDir, `backup_conversations_${nowStamp()}`)
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

  const files: Array<{ name: string; abs: string; empty: string }> = [
    { name: 'whatsapp-conversations.json', abs: path.join(dataDir, 'whatsapp-conversations.json'), empty: '{}' },
    { name: 'whatsapp-webhook-state.json', abs: path.join(dataDir, 'whatsapp-webhook-state.json'), empty: '{}' },
    { name: 'instagram-conversations.json', abs: path.join(dataDir, 'instagram-conversations.json'), empty: '{}' },
    { name: 'instagram-webhook-state.json', abs: path.join(dataDir, 'instagram-webhook-state.json'), empty: '{}' },
    { name: 'messenger-conversations.json', abs: path.join(dataDir, 'messenger-conversations.json'), empty: '[]' },
    { name: 'messenger-webhook-state.json', abs: path.join(dataDir, 'messenger-webhook-state.json'), empty: '{}' },
  ]

  const report: Record<string, any> = {}

  for (const f of files) {
    const bak = path.join(backupDir, f.name)
    const backedUp = safeCopy(f.abs, bak)
    const beforeBytes = (() => {
      try {
        return fs.existsSync(f.abs) ? fs.statSync(f.abs).size : 0
      } catch {
        return 0
      }
    })()
    safeWrite(f.abs, f.empty)
    const afterBytes = (() => {
      try {
        return fs.existsSync(f.abs) ? fs.statSync(f.abs).size : 0
      } catch {
        return 0
      }
    })()
    report[f.name] = { backedUp, beforeBytes, afterBytes }
  }

  return NextResponse.json(
    { ok: true, backupDir: path.basename(backupDir), reset: report },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}

