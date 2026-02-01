'use client'

import { useEffect, useMemo, useState } from 'react'

type ChannelType = 'instagram' | 'whatsapp' | 'telegram' | 'website' | 'messenger'

type Connection = {
  id: string
  tenantId: string
  channel: ChannelType
  externalId: string | null
  meta?: Record<string, any> | null
  status: 'draft' | 'connected' | 'disabled'
  updatedAt: string | null
  notes: string | null
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString('ru-RU')
}

function tokenMeta(token: string) {
  const t = String(token || '')
  if (!t) return null
  return { len: t.length, prefix: t.slice(0, 4), suffix: t.slice(-4) }
}

function renderMetaHint(c: Connection) {
  const meta = (c.meta || {}) as any
  if (c.channel === 'messenger') {
    const tok = String(meta.pageAccessToken || '')
    const m = tokenMeta(tok)
    return m ? `token: set (${m.prefix}…${m.suffix})` : 'token: missing'
  }
  if (c.channel === 'whatsapp') {
    const phoneId = String(meta.phoneNumberId || meta.phone_number_id || '')
    return phoneId ? `phone_number_id: …${phoneId.slice(-6)}` : ''
  }
  return ''
}

export default function AdminConnectionsPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${password}` }), [password])

  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [tenantId, setTenantId] = useState('temoweb')
  const [channel, setChannel] = useState<ChannelType>('instagram')
  const [externalId, setExternalId] = useState('')
  const [status, setStatus] = useState<Connection['status']>('draft')
  const [notes, setNotes] = useState('')
  const [metaJson, setMetaJson] = useState('')

  const loadTenants = async () => {
    const res = await fetch('/api/tenants', { headers: authHeader })
    const json = (await res.json().catch(() => ({}))) as any
    if (!res.ok) throw new Error(json?.error || 'Failed to load tenants')
    const list = Array.isArray(json?.tenants) ? json.tenants : []
    setTenants(list.map((t: any) => ({ id: String(t.id || ''), name: String(t.name || '') })).filter((x: any) => x.id && x.name))
  }

  const loadConnections = async () => {
    const url = new URL('/api/channelConnections', window.location.origin)
    if (tenantId) url.searchParams.set('tenantId', tenantId)
    const res = await fetch(url.toString(), { headers: authHeader })
    const json = (await res.json().catch(() => ({}))) as any
    if (!res.ok) throw new Error(json?.error || 'Failed to load connections')
    setConnections(Array.isArray(json?.connections) ? (json.connections as Connection[]) : [])
  }

  const login = async () => {
    setLoading(true)
    setError('')
    try {
      await loadTenants()
      await loadConnections()
      setAuthed(true)
      localStorage.setItem('adminPassword', password)
    } catch (e: any) {
      setError(String(e?.message || e || 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    setLoading(true)
    setError('')
    try {
      const metaTrim = metaJson.trim()
      let meta: Record<string, any> | null = null
      if (metaTrim) {
        // Allow pasting a raw token (without JSON) and auto-wrap it.
        // Also normalize “smart quotes” and remove accidental newlines inside tokens.
        const normalized = metaTrim
          .replace(/[“”]/g, '"')
          .replace(/[‘’]/g, "'")
          .trim()

        const looksLikeJson = normalized.startsWith('{') || normalized.startsWith('[')
        const looksLikeRawToken = !looksLikeJson && !normalized.includes('{') && !normalized.includes('}') && !normalized.includes(':')
        if (looksLikeRawToken) {
          meta = { pageAccessToken: normalized.replace(/\s+/g, '') }
        } else {
          const tryParse = (s: string) => {
            const parsed = JSON.parse(s)
            return parsed && typeof parsed === 'object' ? (parsed as any) : null
          }
        try {
            meta = tryParse(normalized)
        } catch {
            // Recovery: if token got pasted with line breaks inside the JSON string, extract and normalize it.
            const m = normalized.match(/pageAccessToken"\s*:\s*"([\s\S]*?)"/i)
            if (m && m[1]) {
              meta = { pageAccessToken: String(m[1]).replace(/\s+/g, '') }
            } else {
              throw new Error('meta JSON: неверный JSON (пример: {"pageAccessToken":"EAAB..."} )')
            }
          }
        }
      }
      const res = await fetch('/api/channelConnections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          tenantId,
          channel,
          externalId: externalId.trim() || null,
          status,
          meta,
          notes: notes.trim() || null,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as any
      if (!res.ok) throw new Error(json?.error || 'Save failed')
      setExternalId('')
      setNotes('')
      setMetaJson('')
      await loadConnections()
    } catch (e: any) {
      setError(String(e?.message || e || 'Save failed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('adminPassword')
    if (saved) setPassword(saved)
  }, [])

  useEffect(() => {
    if (!password) return
    ;(async () => {
      try {
        await loadTenants()
        await loadConnections()
        setAuthed(true)
      } catch {
        // ignore
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password])

  if (!authed) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          <h1 className="text-2xl font-bold text-white">Подключения • Channels</h1>
          <p className="text-slate-400 text-sm mt-2">Вход тем же паролем, что и в CRM.</p>
          <div className="mt-4 space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль админа"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
            />
            {error ? <div className="text-sm text-red-300">{error}</div> : null}
            <button
              onClick={login}
              disabled={!password || loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Загрузка…' : 'Войти'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">Подключения каналов</h1>
              <p className="text-slate-400 text-sm mt-1">
                Тут мы привязываем конкретный канал (IG/WA/TG/Website) к tenant. Это основа, чтобы вести сотни клиентов одним ядром.
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('adminPassword')
                setAuthed(false)
                setPassword('')
                setConnections([])
                setTenants([])
              }}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium"
            >
              Выйти
            </button>
          </div>

          {error ? <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

          <div className="mt-6 grid gap-3 md:grid-cols-5">
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
              title="К какому клиенту относится подключение"
            >
              {(tenants.length ? tenants : [{ id: 'temoweb', name: 'TemoWeb' }]).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.id})
                </option>
              ))}
            </select>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as ChannelType)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
              title="Канал"
            >
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
              <option value="website">Website</option>
              <option value="messenger">Messenger</option>
            </select>
            <input
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="externalId (IG igUserId / WA phone_number_id / Messenger page_id / TG bot / Website key)"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 md:col-span-2"
              disabled={loading}
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
              title="Статус"
            >
              <option value="draft">draft</option>
              <option value="connected">connected</option>
              <option value="disabled">disabled</option>
            </select>
          </div>

          <div className="mt-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Заметки: чей канал, что подключили, где лежат токены..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
            />
          </div>

          <div className="mt-3">
            <textarea
              value={metaJson}
              onChange={(e) => setMetaJson(e.target.value)}
              rows={2}
              placeholder='meta JSON (пример для Messenger: {"pageAccessToken":"EAAB..."}; для WhatsApp: {"phoneNumberId":"..."} )'
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono text-sm"
              disabled={loading}
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={save}
              disabled={loading || !tenantId || !channel}
              className="px-5 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold transition-all disabled:opacity-50"
            >
              {loading ? 'Сохраняю…' : 'Сохранить'}
            </button>
            <button
              onClick={() => {
                setLoading(true)
                loadConnections()
                  .catch((e: any) => setError(String(e?.message || e)))
                  .finally(() => setLoading(false))
              }}
              className="px-5 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-all disabled:opacity-50"
              disabled={loading}
            >
              Обновить
            </button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
          <div className="border-b border-slate-700 px-6 py-4 flex items-center justify-between gap-3">
            <div className="text-white font-semibold">
              Подключений: <span className="font-bold">{connections.length}</span>
            </div>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden p-4 space-y-3">
            {connections.length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-500">Пока нет подключений. Создай первое сверху.</div>
            ) : (
              connections.map((c) => (
                <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-400">tenant</div>
                      <div className="text-sm text-white font-mono break-all">{c.tenantId}</div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-200">
                          {c.channel}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-200">
                          {c.status}
                        </span>
                        <span className="text-xs text-slate-500">updated: {fmt(c.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs text-slate-400">externalId</div>
                    <div className="text-sm text-slate-100 font-mono break-all">{c.externalId || '—'}</div>
                  </div>
                  {renderMetaHint(c) ? (
                    <div className="mt-2 text-xs text-slate-300">
                      <span className="text-slate-400">meta:</span> {renderMetaHint(c)}
                    </div>
                  ) : null}
                  {c.notes ? <div className="mt-3 text-sm text-slate-200 whitespace-pre-wrap">{c.notes}</div> : null}
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Tenant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Канал</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">externalId</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Updated</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {connections.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Пока нет подключений. Создай первое сверху.
                    </td>
                  </tr>
                ) : (
                  connections.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-sm text-slate-200 font-mono">{c.tenantId}</td>
                      <td className="px-4 py-3 text-sm text-white">{c.channel}</td>
                      <td className="px-4 py-3 text-sm text-slate-200 font-mono">{c.externalId || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-200">{c.status}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{fmt(c.updatedAt)}</td>
                      <td className="px-4 py-3 text-sm text-slate-200">
                        {c.notes || '—'}
                        {renderMetaHint(c) ? <div className="mt-1 text-xs text-slate-400">meta: {renderMetaHint(c)}</div> : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

