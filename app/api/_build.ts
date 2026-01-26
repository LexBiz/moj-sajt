import fs from 'fs'
import path from 'path'

export type BuildInfo = {
  rev: string | null
  short: string | null
  source: 'git' | 'env' | 'none'
}

function safeRead(filePath: string) {
  try {
    return fs.readFileSync(filePath, 'utf8').trim()
  } catch {
    return null
  }
}

function resolveGitHead(gitDir: string) {
  const head = safeRead(path.join(gitDir, 'HEAD'))
  if (!head) return null
  if (head.startsWith('ref:')) {
    const ref = head.replace(/^ref:\s*/i, '').trim()
    const refPath = path.join(gitDir, ref)
    const refHash = safeRead(refPath)
    if (refHash) return refHash
    // Packed refs fallback (best-effort)
    const packed = safeRead(path.join(gitDir, 'packed-refs'))
    if (packed) {
      const line = packed
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l && !l.startsWith('#') && !l.startsWith('^') && l.endsWith(` ${ref}`))
      if (line) return line.split(' ')[0]
    }
    return null
  }
  // Detached HEAD contains the hash directly
  return head
}

export function getBuildInfo(): BuildInfo {
  const env =
    (process.env.GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.RENDER_GIT_COMMIT || process.env.HEROKU_SLUG_COMMIT || '')
      .trim()
  if (env) {
    return { rev: env, short: env.slice(0, 7), source: 'env' }
  }

  const gitDir = path.join(process.cwd(), '.git')
  if (!fs.existsSync(gitDir)) return { rev: null, short: null, source: 'none' }

  const rev = resolveGitHead(gitDir)
  if (!rev) return { rev: null, short: null, source: 'none' }
  return { rev, short: rev.slice(0, 7), source: 'git' }
}


