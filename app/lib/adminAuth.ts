import crypto from 'crypto'
import { NextRequest } from 'next/server'

const authAttempts = new Map<string, { count: number; resetAt: number }>()

function timingSafeEqualText(a: string, b: string) {
  const aa = Buffer.from(a)
  const bb = Buffer.from(b)
  if (aa.length !== bb.length) return false
  try {
    return crypto.timingSafeEqual(aa, bb)
  } catch {
    return false
  }
}

function checkAdminThrottle(identity: string) {
  const now = Date.now()
  const windowMs = 60_000
  const maxAttempts = Number(process.env.ADMIN_AUTH_MAX_ATTEMPTS || 30)
  const row = authAttempts.get(identity)
  if (!row || row.resetAt <= now) {
    authAttempts.set(identity, { count: 1, resetAt: now + windowMs })
    return true
  }
  row.count += 1
  authAttempts.set(identity, row)
  return row.count <= Math.max(1, maxAttempts)
}

export function requireAdmin(request: NextRequest) {
  const authHeader = String(request.headers.get('authorization') || '')
  const expected = String(process.env.ADMIN_PASSWORD || '').trim()
  const expectedFallback = String(process.env.ADMIN_PASSWORD_FALLBACK || '').trim()
  if (!expected) return false
  const identity = `${String(request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'ip:unknown')
    .split(',')[0]
    .trim()}|${String(request.headers.get('user-agent') || 'ua:unknown').slice(0, 160)}`
  if (!checkAdminThrottle(identity)) return false
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return false
  if (timingSafeEqualText(token, expected)) return true
  if (expectedFallback && timingSafeEqualText(token, expectedFallback)) return true
  return false
}

