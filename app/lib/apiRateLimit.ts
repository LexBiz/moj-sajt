import crypto from 'crypto'
import { db, hasDatabase } from './db'

type RateLimitInput = {
  scope: string
  identity: string
  windowSec: number
  limit: number
}

type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfterSec: number
}

const mem = new Map<string, { count: number; resetAt: number }>()

function nowMs() {
  return Date.now()
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function hashIdentity(v: string) {
  return crypto.createHash('sha256').update(String(v || '')).digest('hex').slice(0, 32)
}

async function hitPg(input: RateLimitInput): Promise<RateLimitResult | null> {
  if (!hasDatabase()) return null
  try {
    const windowSec = clamp(Math.floor(input.windowSec), 1, 3600)
    const limit = clamp(Math.floor(input.limit), 1, 100000)
    const scope = String(input.scope || '').trim().slice(0, 120)
    const identity = hashIdentity(input.identity)
    const bucketStartMs = Math.floor(nowMs() / (windowSec * 1000)) * windowSec * 1000
    const bucketStartIso = new Date(bucketStartMs).toISOString()
    const res = await db().query<{ count: number }>(
      `INSERT INTO api_rate_limits (scope, identity, bucket_start, count)
       VALUES ($1,$2,$3,1)
       ON CONFLICT (scope, identity, bucket_start) DO UPDATE SET
         count = api_rate_limits.count + 1
       RETURNING count`,
      [scope, identity, bucketStartIso],
    )
    const count = Number(res.rows?.[0]?.count || 1)
    const ok = count <= limit
    const remaining = Math.max(0, limit - count)
    const retryAfterSec = Math.max(1, Math.ceil((bucketStartMs + windowSec * 1000 - nowMs()) / 1000))
    return { ok, remaining, retryAfterSec }
  } catch {
    return null
  }
}

function hitMem(input: RateLimitInput): RateLimitResult {
  const windowSec = clamp(Math.floor(input.windowSec), 1, 3600)
  const limit = clamp(Math.floor(input.limit), 1, 100000)
  const key = `${input.scope}:${hashIdentity(input.identity)}:${Math.floor(nowMs() / (windowSec * 1000))}`
  const resetAt = Math.floor(nowMs() / (windowSec * 1000)) * windowSec * 1000 + windowSec * 1000
  const prev = mem.get(key)
  const count = (prev?.count || 0) + 1
  mem.set(key, { count, resetAt })
  if (mem.size > 20000) {
    const now = nowMs()
    for (const [k, v] of mem) if (v.resetAt <= now) mem.delete(k)
  }
  const ok = count <= limit
  const remaining = Math.max(0, limit - count)
  const retryAfterSec = Math.max(1, Math.ceil((resetAt - nowMs()) / 1000))
  return { ok, remaining, retryAfterSec }
}

export async function hitRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const pg = await hitPg(input)
  if (pg) return pg
  return hitMem(input)
}

