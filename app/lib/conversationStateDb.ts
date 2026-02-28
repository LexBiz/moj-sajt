import { db, hasDatabase } from './db'

type Row = {
  scope: string
  conv_key: string
  payload: any
}

function isPgEnabled() {
  return hasDatabase()
}

export async function getConversationState<T = any>(scope: string, key: string): Promise<T | null> {
  if (!isPgEnabled()) return null
  try {
    const res = await db().query<Row>(
      'SELECT scope, conv_key, payload FROM conversation_state WHERE scope=$1 AND conv_key=$2 LIMIT 1',
      [scope, key],
    )
    return (res.rows?.[0]?.payload as T) ?? null
  } catch {
    return null
  }
}

export async function setConversationState(scope: string, key: string, payload: any): Promise<boolean> {
  if (!isPgEnabled()) return false
  try {
    await db().query(
      `INSERT INTO conversation_state (scope, conv_key, payload)
       VALUES ($1,$2,$3::jsonb)
       ON CONFLICT (scope, conv_key) DO UPDATE SET
         payload=EXCLUDED.payload,
         updated_at=now()`,
      [scope, key, JSON.stringify(payload ?? null)],
    )
    return true
  } catch {
    return false
  }
}

export async function deleteConversationState(scope: string, key: string): Promise<boolean> {
  if (!isPgEnabled()) return false
  try {
    await db().query('DELETE FROM conversation_state WHERE scope=$1 AND conv_key=$2', [scope, key])
    return true
  } catch {
    return false
  }
}

export async function listConversationState<T = any>(scope: string): Promise<Record<string, T>> {
  if (!isPgEnabled()) return {}
  try {
    const res = await db().query<Row>('SELECT conv_key, payload FROM conversation_state WHERE scope=$1', [scope])
    const out: Record<string, T> = {}
    for (const r of res.rows || []) {
      const k = String((r as any)?.conv_key || '').trim()
      if (!k) continue
      out[k] = (r as any)?.payload as T
    }
    return out
  } catch {
    return {}
  }
}

