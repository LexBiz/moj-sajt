import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export type InstagramLoginTokenFile = {
  obtainedAt: string
  accessToken: string
  expiresIn?: number | null
  tokenType?: string | null
  appId?: string | null
  debug?: any
}

const DATA_FILE =
  (process.env.INSTAGRAM_OAUTH_TOKEN_FILE || '').trim() || path.join(process.cwd(), 'data', 'instagram-login-token.json')

function ensureDir() {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function writeTokenFile(file: InstagramLoginTokenFile) {
  ensureDir()
  fs.writeFileSync(DATA_FILE, JSON.stringify(file, null, 2), 'utf8')
}

export function readTokenFile(): InstagramLoginTokenFile | null {
  try {
    if (!fs.existsSync(DATA_FILE)) return null
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    return JSON.parse(raw) as InstagramLoginTokenFile
  } catch {
    return null
  }
}

export function tokenMeta(token: string) {
  return {
    len: token.length,
    prefix: token.slice(0, 4),
    suffix: token.slice(-4),
  }
}

export function signState(payload: Record<string, any>) {
  const secret = (process.env.INSTAGRAM_OAUTH_STATE_SECRET || '').trim()
  if (!secret) {
    // Fallback to something stable-ish, but you should set INSTAGRAM_OAUTH_STATE_SECRET in production.
    console.warn('INSTAGRAM_OAUTH_STATE_SECRET is missing; using INSTAGRAM_APP_SECRET as fallback')
  }
  const key = secret || (process.env.INSTAGRAM_APP_SECRET || '')
  const json = JSON.stringify(payload)
  const mac = crypto.createHmac('sha256', key).update(json).digest('hex')
  return Buffer.from(`${json}.${mac}`).toString('base64url')
}

export function verifyState(state: string | null) {
  if (!state) return null
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8')
    const idx = decoded.lastIndexOf('.')
    if (idx < 0) return null
    const json = decoded.slice(0, idx)
    const mac = decoded.slice(idx + 1)
    const secret = (process.env.INSTAGRAM_OAUTH_STATE_SECRET || '').trim()
    const key = secret || (process.env.INSTAGRAM_APP_SECRET || '')
    const expected = crypto.createHmac('sha256', key).update(json).digest('hex')
    if (expected !== mac) return null
    return JSON.parse(json) as any
  } catch {
    return null
  }
}


