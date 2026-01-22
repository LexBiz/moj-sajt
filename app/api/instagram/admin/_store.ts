import fs from 'fs'
import path from 'path'

export type InstagramAdminConfig = {
  selectedPageId: string | null
  selectedIgUserId: string | null
  updatedAt: string | null
}

const FILE = (process.env.INSTAGRAM_ADMIN_CONFIG_FILE || '').trim() || path.join(process.cwd(), 'data', 'instagram-admin-config.json')

function ensureDir() {
  const dir = path.dirname(FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function readInstagramAdminConfig(): InstagramAdminConfig {
  try {
    if (!fs.existsSync(FILE)) {
      return { selectedPageId: null, selectedIgUserId: null, updatedAt: null }
    }
    const raw = fs.readFileSync(FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<InstagramAdminConfig>
    return {
      selectedPageId: typeof parsed.selectedPageId === 'string' ? parsed.selectedPageId : null,
      selectedIgUserId: typeof parsed.selectedIgUserId === 'string' ? parsed.selectedIgUserId : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    }
  } catch {
    return { selectedPageId: null, selectedIgUserId: null, updatedAt: null }
  }
}

export function writeInstagramAdminConfig(next: { selectedPageId: string | null; selectedIgUserId: string | null }) {
  ensureDir()
  const out: InstagramAdminConfig = {
    selectedPageId: next.selectedPageId,
    selectedIgUserId: next.selectedIgUserId,
    updatedAt: new Date().toISOString(),
  }
  fs.writeFileSync(FILE, JSON.stringify(out, null, 2), 'utf8')
  return out
}



