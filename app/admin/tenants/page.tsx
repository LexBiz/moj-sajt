'use client'

import { useEffect, useMemo, useState } from 'react'

type TenantPlan = 'START' | 'BUSINESS' | 'PRO'

type Tenant = {
  id: string
  name: string
  plan: TenantPlan
  createdAt: string
  updatedAt: string | null
  notes: string | null
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString('ru-RU')
}

export default function AdminTenantsPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${password}` }), [password])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tenants, setTenants] = useState<Tenant[]>([])

  const [name, setName] = useState('')
  const [plan, setPlan] = useState<TenantPlan>('START')
  const [notes, setNotes] = useState('')

  const loadTenants = async () => {
    setError('')
    const res = await fetch('/api/tenants', { headers: authHeader })
    const json = (await res.json().catch(() => ({}))) as any
    if (!res.ok) throw new Error(json?.error || 'Failed to load tenants')
    const list = Array.isArray(json?.tenants) ? (json.tenants as Tenant[]) : []
    setTenants(list)
  }

  const login = async () => {
    setLoading(true)
    setError('')
    try {
      await loadTenants()
      setAuthed(true)
      localStorage.setItem('adminPassword', password)
    } catch (e: any) {
      setError(String(e?.message || e || 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  const createTenant = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ name: name.trim(), plan, notes: notes.trim() || null }),
      })
      const json = (await res.json().catch(() => ({}))) as any
      if (!res.ok) throw new Error(json?.error || 'Create failed')
      setName('')
      setNotes('')
      await loadTenants()
    } catch (e: any) {
      setError(String(e?.message || e || 'Create failed'))
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
          <h1 className="text-2xl font-bold text-white">Клиенты • Tenants</h1>
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
              <h1 className="text-2xl font-bold text-white">Клиенты (tenants)</h1>
              <p className="text-slate-400 text-sm mt-1">
                Это внутренний список клиентов. Тут ты создаёшь tenant — дальше мы привяжем к нему Instagram/WhatsApp/и т.д.
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('adminPassword')
                setAuthed(false)
                setPassword('')
                setTenants([])
              }}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium"
            >
              Выйти
            </button>
          </div>

          {error ? <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название клиента (например: Barbershop Berlin)"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
            />
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as TenantPlan)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
            >
              <option value="START">START</option>
              <option value="BUSINESS">BUSINESS</option>
              <option value="PRO">PRO</option>
            </select>
            <button
              onClick={createTenant}
              disabled={loading || !name.trim()}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Создаю…' : 'Создать tenant'}
            </button>
          </div>
          <div className="mt-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Заметки (необязательно): кто контакт, какие каналы, что обещали…"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
            />
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
          <div className="border-b border-slate-700 px-6 py-4 flex items-center justify-between gap-3">
            <div className="text-white font-semibold">
              Всего tenants: <span className="font-bold">{tenants.length}</span>
            </div>
            <button
              onClick={() => {
                setLoading(true)
                loadTenants()
                  .catch((e: any) => setError(String(e?.message || e)))
                  .finally(() => setLoading(false))
              }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
              disabled={loading}
            >
              {loading ? 'Обновляю…' : 'Обновить'}
            </button>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden p-4 space-y-3">
            {tenants.length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-500">Пока нет клиентов. Создай первого tenant сверху.</div>
            ) : (
              tenants.map((t) => (
                <div key={t.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white font-semibold">{t.name}</div>
                      <div className="text-xs text-slate-400 mt-1 break-all font-mono">{t.id}</div>
                      <div className="text-xs text-slate-500 mt-1">created: {fmt(t.createdAt)} • updated: {fmt(t.updatedAt)}</div>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-200">
                      {t.plan}
                    </span>
                  </div>
                  {t.notes ? <div className="mt-3 text-sm text-slate-200 whitespace-pre-wrap">{t.notes}</div> : null}
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Клиент</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">План</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Создан</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Заметки</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      Пока нет клиентов. Создай первого tenant сверху.
                    </td>
                  </tr>
                ) : (
                  tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-sm text-slate-200 font-mono">{t.id}</td>
                      <td className="px-4 py-3 text-sm text-white">
                        <div className="font-semibold">{t.name}</div>
                        <div className="text-xs text-slate-400">updated: {fmt(t.updatedAt)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-200">{t.plan}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{fmt(t.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-slate-200">{t.notes || '—'}</td>
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

