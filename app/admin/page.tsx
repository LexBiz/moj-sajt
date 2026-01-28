'use client'
import { useMemo, useEffect, useState } from 'react'

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost' | 'junk'
type Lead = {
  id: number
  tenantId?: string | null
  name: string | null
  contact: string
  email?: string | null
  businessType: string | null
  channel: string | null
  pain: string | null
  question: string | null
  clientMessages: string[] | null
  aiSummary: string | null
  aiReadiness?: { score: number; label: 'COLD' | 'WARM' | 'HOT' | 'READY'; stage?: string | null } | null
  source: string | null
  lang: string | null
  notes?: string | null
  status: LeadStatus | string
  createdAt: string
  updatedAt?: string | null
  telegramChatId?: string | null
  telegramUsername?: string | null
}

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'Новая',
  contacted: 'Связались',
  qualified: 'Квалиф.',
  won: 'Сделка',
  lost: 'Потеря',
  junk: 'Спам',
}

function readinessUi(r: NonNullable<Lead['aiReadiness']>) {
  const label = r.label
  const score = Math.round(Number(r.score || 0))
  if (label === 'READY') return { text: `Готов (${score}/100)`, tone: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30' }
  if (label === 'HOT') return { text: `Горячий (${score}/100)`, tone: 'bg-orange-500/15 text-orange-200 border-orange-400/30' }
  if (label === 'WARM') return { text: `Тёплый (${score}/100)`, tone: 'bg-amber-500/15 text-amber-200 border-amber-400/30' }
  return { text: `Холодный (${score}/100)`, tone: 'bg-slate-500/15 text-slate-200 border-slate-400/30' }
}

function badgeClass(status: string) {
  switch (status) {
    case 'new':
      return 'bg-indigo-500/15 text-indigo-200 border-indigo-400/30'
    case 'contacted':
      return 'bg-sky-500/15 text-sky-200 border-sky-400/30'
    case 'qualified':
      return 'bg-amber-500/15 text-amber-200 border-amber-400/30'
    case 'won':
      return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30'
    case 'lost':
      return 'bg-rose-500/15 text-rose-200 border-rose-400/30'
    case 'junk':
      return 'bg-slate-500/15 text-slate-200 border-slate-400/30'
    default:
      return 'bg-white/10 text-slate-200 border-white/10'
  }
}

function sourceBadge(source?: string | null) {
  const s = String(source || '').toLowerCase()
  if (s === 'telegram') return { label: 'Telegram', cls: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30' }
  if (s === 'flow') return { label: 'Flow', cls: 'bg-purple-500/15 text-purple-200 border-purple-400/30' }
  if (s === 'instagram') return { label: 'Instagram', cls: 'bg-pink-500/15 text-pink-200 border-pink-400/30' }
  return { label: source || '—', cls: 'bg-white/10 text-slate-200 border-white/10' }
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function dateKeyLocal(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtTimeOnly(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

type ViewMode = 'inbox' | 'work' | 'done' | 'all'

function inView(view: ViewMode, status: string) {
  const s = String(status || 'new')
  if (view === 'all') return true
  if (view === 'inbox') return s === 'new'
  if (view === 'work') return s === 'contacted' || s === 'qualified'
  if (view === 'done') return s === 'won' || s === 'lost' || s === 'junk'
  return true
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [tenantId, setTenantId] = useState<string>('temoweb')
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [view, setView] = useState<ViewMode>('inbox')
  const [dayFilter, setDayFilter] = useState<string>('') // YYYY-MM-DD
  const [dateFrom, setDateFrom] = useState<string>('') // YYYY-MM-DD
  const [dateTo, setDateTo] = useState<string>('') // YYYY-MM-DD
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editStatus, setEditStatus] = useState<string>('new')
  const [editNotes, setEditNotes] = useState<string>('')
  const [filtersOpen, setFiltersOpen] = useState(true)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/leads?tenantId=${encodeURIComponent(tenantId || 'temoweb')}`, {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLeads(data)
        await loadTenants(password)
        setIsAuthenticated(true)
        localStorage.setItem('adminPassword', password)
      } else {
        setError('Неверный пароль')
      }
    } catch (err) {
      setError('Ошибка подключения')
    } finally {
      setLoading(false)
    }
  }

  const loadTenants = async (savedPassword?: string) => {
    const p = savedPassword || localStorage.getItem('adminPassword') || ''
    if (!p) return
    try {
      const res = await fetch('/api/tenants', { headers: { Authorization: `Bearer ${p}` } })
      if (!res.ok) return
      const json = (await res.json().catch(() => ({}))) as any
      const list = Array.isArray(json?.tenants) ? json.tenants : []
      const compact = list
        .map((t: any) => ({ id: String(t?.id || ''), name: String(t?.name || t?.id || '') }))
        .filter((t: any) => t.id)
      setTenants(compact)
    } catch {
      // ignore
    }
  }

  const loadLeads = async () => {
    const savedPassword = localStorage.getItem('adminPassword')
    if (!savedPassword) return

    try {
      const response = await fetch(`/api/leads?tenantId=${encodeURIComponent(tenantId || 'temoweb')}`, {
        headers: {
          'Authorization': `Bearer ${savedPassword}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLeads(data)
        setIsAuthenticated(true)
        setPassword(savedPassword)
      }
    } catch (err) {
      console.error('Failed to load leads:', err)
    }
  }

  const refresh = async () => {
    const savedPassword = localStorage.getItem('adminPassword')
    if (!savedPassword) return
    setLoading(true)
    try {
      const response = await fetch(`/api/leads?tenantId=${encodeURIComponent(tenantId || 'temoweb')}`, {
        headers: { Authorization: `Bearer ${savedPassword}` },
      })
      if (!response.ok) throw new Error('Failed')
      const data = await response.json()
      setLeads(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Restore active tenant before first load
    try {
      const savedTenant = (localStorage.getItem('activeTenantId') || '').trim()
      if (savedTenant) setTenantId(savedTenant)
    } catch {
      // ignore
    }
    loadLeads()
    loadTenants()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('activeTenantId', tenantId)
    } catch {
      // ignore
    }
    if (isAuthenticated) {
      refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  // Persist filters/search “like home”
  useEffect(() => {
    try {
      const saved = localStorage.getItem('crm_filters_v2')
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (typeof parsed.q === 'string') setQ(parsed.q)
      if (typeof parsed.statusFilter === 'string') setStatusFilter(parsed.statusFilter)
      if (typeof parsed.sourceFilter === 'string') setSourceFilter(parsed.sourceFilter)
      if (typeof parsed.view === 'string') setView(parsed.view as ViewMode)
      if (typeof parsed.dayFilter === 'string') setDayFilter(parsed.dayFilter)
      if (typeof parsed.dateFrom === 'string') setDateFrom(parsed.dateFrom)
      if (typeof parsed.dateTo === 'string') setDateTo(parsed.dateTo)
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('crm_filters_v2', JSON.stringify({ q, statusFilter, sourceFilter, view, dayFilter, dateFrom, dateTo }))
    } catch {
      // ignore
    }
  }, [q, statusFilter, sourceFilter, view, dayFilter, dateFrom, dateTo])

  // Auto-refresh every 20s when authenticated
  useEffect(() => {
    if (!isAuthenticated) return
    const t = window.setInterval(() => {
      refresh()
    }, 20000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleLogout = () => {
    localStorage.removeItem('adminPassword')
    setIsAuthenticated(false)
    setPassword('')
    setLeads([])
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return leads.filter((l) => {
      if (!inView(view, String(l.status))) return false
      if (statusFilter !== 'all' && String(l.status) !== statusFilter) return false
      if (sourceFilter !== 'all' && String(l.source || '') !== sourceFilter) return false

      const dk = dateKeyLocal(l.createdAt)
      if (dayFilter && dk !== dayFilter) return false
      if (dateFrom && dk && dk < dateFrom) return false
      if (dateTo && dk && dk > dateTo) return false

      if (!query) return true
      const hay = [
        l.contact,
        l.name || '',
        l.businessType || '',
        l.channel || '',
        l.pain || '',
        l.question || '',
        l.aiSummary || '',
        ...(Array.isArray(l.clientMessages) ? l.clientMessages : []),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(query)
    })
  }, [leads, q, statusFilter, sourceFilter, view, dayFilter, dateFrom, dateTo])

  const dayOptions = useMemo(() => {
    const set = new Set<string>()
    for (const l of leads) {
      const dk = dateKeyLocal(l.createdAt)
      if (dk) set.add(dk)
    }
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1))
  }, [leads])

  const grouped = useMemo(() => {
    const map = new Map<string, Lead[]>()
    for (const l of filtered) {
      const dk = dateKeyLocal(l.createdAt) || 'unknown'
      const arr = map.get(dk) || []
      arr.push(l)
      map.set(dk, arr)
    }
    const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1))
    for (const k of keys) {
      map.get(k)!.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    }
    return { keys, map }
  }, [filtered])

  const stats = useMemo(() => {
    const total = leads.length
    const byStatus = { new: 0, contacted: 0, qualified: 0, won: 0, lost: 0, junk: 0 } as Record<LeadStatus, number>
    const bySource = { flow: 0, telegram: 0, other: 0 } as Record<string, number>
    const today = new Date().toDateString()
    let todayCount = 0
    for (const l of leads) {
      const st = String(l.status) as LeadStatus
      if (st in byStatus) byStatus[st]++
      const src = String(l.source || '').toLowerCase()
      if (src === 'flow') bySource.flow++
      else if (src === 'telegram') bySource.telegram++
      else bySource.other++
      const d = new Date(l.createdAt)
      if (!Number.isNaN(d.getTime()) && d.toDateString() === today) todayCount++
    }
    // last 7/30 days counts
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const inDays = (d: Date, days: number) => now - d.getTime() <= days * dayMs
    const last7 = { flow: 0, telegram: 0, other: 0 }
    const last30 = { flow: 0, telegram: 0, other: 0 }
    for (const l of leads) {
      const d = new Date(l.createdAt)
      if (Number.isNaN(d.getTime())) continue
      const src = String(l.source || '').toLowerCase()
      const bucket = src === 'flow' ? 'flow' : src === 'telegram' ? 'telegram' : 'other'
      if (inDays(d, 7)) last7[bucket]++
      if (inDays(d, 30)) last30[bucket]++
    }
    return { total, todayCount, byStatus, bySource, last7, last30 }
  }, [leads])

  const selected = useMemo(() => leads.find((l) => l.id === selectedId) || null, [leads, selectedId])

  // Auto-select newest lead when none selected
  useEffect(() => {
    if (selectedId != null) return
    if (!filtered.length) return
    setSelectedId(filtered[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length])

  useEffect(() => {
    if (!selected) return
    setEditStatus(String(selected.status || 'new'))
    setEditNotes(String(selected.notes || ''))
  }, [selectedId])

  const saveSelected = async () => {
    if (!selected) return
    const savedPassword = localStorage.getItem('adminPassword')
    if (!savedPassword) return
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${selected.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${savedPassword}`,
        },
        body: JSON.stringify({ status: editStatus, notes: editNotes }),
      })
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      const next = leads.map((l) => (l.id === selected.id ? json.lead : l))
      setLeads(next)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const quickSetStatus = async (next: LeadStatus) => {
    setEditStatus(next)
    await saveSelected()
  }

  const LeadDetail = ({ variant }: { variant: 'desktop' | 'mobile' }) => {
    if (!selected) {
      return <div className="text-slate-400 text-sm">Выбери заявку — и тут будут детали, статусы и заметки.</div>
    }
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Контакт</p>
              <p className="text-lg font-bold text-white break-all">{(selected as any)?.contact ? String((selected as any).contact) : '—'}</p>
              {(selected as any)?.email ? <p className="text-xs text-slate-400 mt-1 break-all">{String((selected as any).email)}</p> : null}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={() => navigator.clipboard.writeText(String((selected as any)?.contact || ''))}
                className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm"
                disabled={!String((selected as any)?.contact || '').trim()}
              >
                Копировать
              </button>
              {String((selected as any)?.contact || '').startsWith('@') ? (
                <a
                  href={`https://t.me/${String((selected as any)?.contact || '').slice(1)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm"
                >
                  Telegram
                </a>
              ) : /\S+@\S+\.\S+/.test(String((selected as any)?.contact || '')) ? (
                <a href={`mailto:${String((selected as any)?.contact || '')}`} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm">
                  Email
                </a>
              ) : /^[+\d][\d\s().-]{6,}$/.test(String((selected as any)?.contact || '')) ? (
                <a
                  href={`tel:${String((selected as any)?.contact || '').replace(/[^\d+]/g, '')}`}
                  className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm"
                >
                  Позвонить
                </a>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">{fmtDate(selected.createdAt)}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2 text-sm text-slate-200">
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Источник</span>
            <span>
              {selected.source || '—'}
              {selected.lang ? ` (${selected.lang})` : ''}
            </span>
          </div>
          {selected.aiReadiness ? (
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Готовность</span>
              <span className="text-right">{readinessUi(selected.aiReadiness).text}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Бизнес</span>
            <span className="text-right">{selected.businessType || '—'}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Каналы</span>
            <span className="text-right">{selected.channel || '—'}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Боль</span>
            <span className="text-right">{selected.pain || '—'}</span>
          </div>
        </div>

        {selected.aiSummary ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400 mb-2">AI‑итог</p>
            <p className="text-sm text-slate-100 whitespace-pre-wrap">{selected.aiSummary}</p>
          </div>
        ) : null}

        {Array.isArray(selected.clientMessages) && selected.clientMessages.length ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs text-slate-400">Сообщения клиента</p>
              {selected.aiReadiness ? (
                <span className={`text-[11px] px-2 py-1 rounded-full border ${readinessUi(selected.aiReadiness).tone}`}>{readinessUi(selected.aiReadiness).text}</span>
              ) : null}
            </div>
            <div className="space-y-2">
              {selected.clientMessages.slice(0, 20).map((m, i) => (
                <div key={i} className="text-sm text-slate-100 whitespace-pre-wrap border-l-2 border-indigo-400/40 pl-3">
                  {m}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => quickSetStatus('contacted')} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm" disabled={loading}>
              → Связались
            </button>
            <button onClick={() => quickSetStatus('qualified')} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm" disabled={loading}>
              → Квалиф.
            </button>
            <button onClick={() => quickSetStatus('won')} className="px-3 py-2 rounded-lg bg-emerald-600/70 hover:bg-emerald-600 text-white text-sm" disabled={loading}>
              ✅ Сделка
            </button>
            <button onClick={() => quickSetStatus('lost')} className="px-3 py-2 rounded-lg bg-rose-600/70 hover:bg-rose-600 text-white text-sm" disabled={loading}>
              ❌ Потеря
            </button>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Статус</p>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              {(['new', 'contacted', 'qualified', 'won', 'lost', 'junk'] as LeadStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Заметки</p>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={variant === 'mobile' ? 6 : 4}
              placeholder="Что важного? следующий шаг?"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            onClick={saveSelected}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
            disabled={loading}
          >
            Сохранить
          </button>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Админка</h1>
            <p className="text-slate-400 text-sm mt-2">Введите пароль для доступа</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                disabled={loading}
                title="К какому клиенту (tenant) относятся заявки"
              >
                {(tenants.length ? tenants : [{ id: 'temoweb', name: 'TemoWeb (внутренний)' }]).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg px-4 py-2 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Загрузка...' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="border-b border-slate-700 p-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">CRM • Заявки</h1>
              <p className="text-slate-400 text-sm mt-1">
                Всего: {stats.total} • Сегодня: {stats.todayCount} • Новые: {stats.byStatus.new}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                title="Активный клиент (tenant)"
              >
                {(tenants.length ? tenants : [{ id: 'temoweb', name: 'TemoWeb (внутренний)' }]).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                onClick={refresh}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {loading ? 'Обновляю…' : 'Обновить'}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Выйти
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 sm:p-6 border-b border-slate-700">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-sm text-slate-300 font-semibold">Фильтры</div>
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className="sm:hidden px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold"
              >
                {filtersOpen ? 'Свернуть' : 'Показать'}
              </button>
            </div>

            <div className={`${filtersOpen ? '' : 'hidden'} sm:block`}>
            <div className="flex sm:flex-wrap flex-nowrap items-center gap-2 mb-4 overflow-x-auto pb-2">
              {([
                { id: 'inbox', label: `Inbox (${stats.byStatus.new})` },
                { id: 'work', label: 'В работе' },
                { id: 'done', label: 'Закрыто' },
                { id: 'all', label: 'Все' },
              ] as { id: ViewMode; label: string }[]).map((x) => (
                <button
                  key={x.id}
                  onClick={() => setView(x.id)}
                  className={`px-3 py-2 rounded-full text-sm font-semibold border transition-all ${
                    view === x.id
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-indigo-400/40'
                      : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {x.label}
                </button>
              ))}
              <div className="sm:flex-1" />
              <button
                onClick={() => {
                  const today = dateKeyLocal(new Date().toISOString())
                  setDayFilter(today)
                  setDateFrom('')
                  setDateTo('')
                }}
                className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm"
              >
                Сегодня
              </button>
              <button
                onClick={() => {
                  const d = new Date()
                  const y = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000)
                  setDayFilter('')
                  setDateFrom(dateKeyLocal(y.toISOString()))
                  setDateTo(dateKeyLocal(d.toISOString()))
                }}
                className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm"
              >
                7 дней
              </button>
              <button
                onClick={() => {
                  const d = new Date()
                  const y = new Date(d.getTime() - 30 * 24 * 60 * 60 * 1000)
                  setDayFilter('')
                  setDateFrom(dateKeyLocal(y.toISOString()))
                  setDateTo(dateKeyLocal(d.toISOString()))
                }}
                className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm"
              >
                30 дней
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск: контакт, бизнес, боль, текст…"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">Все источники</option>
                <option value="flow">Flow</option>
                <option value="telegram">Telegram</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">Все статусы</option>
                <option value="new">Новые</option>
                <option value="contacted">Связались</option>
                <option value="qualified">Квалиф.</option>
                <option value="won">Сделка</option>
                <option value="lost">Потеря</option>
                <option value="junk">Спам</option>
              </select>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <select
                value={dayFilter}
                onChange={(e) => {
                  setDayFilter(e.target.value)
                  if (e.target.value) {
                    setDateFrom('')
                    setDateTo('')
                  }
                }}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Все дни</option>
                {dayOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  if (e.target.value) setDayFilter('')
                }}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  if (e.target.value) setDayFilter('')
                }}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-400">Flow</p>
                <p className="text-2xl font-bold text-white">{stats.bySource.flow}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-400">Telegram</p>
                <p className="text-2xl font-bold text-white">{stats.bySource.telegram}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-400">Новые</p>
                <p className="text-2xl font-bold text-white">{stats.byStatus.new}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-400">Всего</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <p className="text-xs text-slate-400">7 дней</p>
                    <p className="font-semibold">Flow {stats.last7.flow} • Telegram {stats.last7.telegram} • Другое {stats.last7.other}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">30 дней</p>
                    <p className="font-semibold">Flow {stats.last30.flow} • Telegram {stats.last30.telegram} • Другое {stats.last30.other}</p>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Main */}
          <div className="grid md:grid-cols-3">
            {/* List */}
            <div className="md:col-span-2 md:border-r border-slate-700">
              {/* Mobile list (cards) */}
              <div className="md:hidden p-3 space-y-3">
                {filtered.length === 0 ? (
                  <div className="px-4 py-10 text-center text-slate-500">Ничего не найдено</div>
                ) : (
                  grouped.keys.flatMap((dk) => {
                    const dayLeads = grouped.map.get(dk) || []
                    return [
                      <div key={`mh-${dk}`} className="text-xs font-semibold text-slate-300 px-1">
                        {dk === 'unknown' ? 'Без даты' : dk} <span className="text-slate-500 font-normal">• {dayLeads.length}</span>
                      </div>,
                      ...dayLeads.map((lead) => {
                        const src = sourceBadge(lead.source)
                        const selectedCls = selectedId === lead.id ? 'ring-2 ring-indigo-400/40' : ''
                        return (
                          <button
                            key={lead.id}
                            onClick={() => setSelectedId(lead.id)}
                            className={`w-full text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-4 ${selectedCls}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-white break-all">{lead.contact}</div>
                                <div className="mt-1 flex items-center gap-2 flex-wrap">
                                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(String(lead.status))}`}>
                                    {STATUS_LABEL[String(lead.status) as LeadStatus] || String(lead.status)}
                                  </span>
                                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${src.cls}`}>{src.label}</span>
                                  <span className="text-xs text-slate-400">{fmtTimeOnly(lead.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 text-sm text-slate-200">
                              <div className="font-semibold">{lead.businessType || '—'}</div>
                              <div className="text-xs text-slate-400 line-clamp-3">{lead.aiSummary || lead.pain || lead.question || '—'}</div>
                            </div>
                          </button>
                        )
                      }),
                    ]
                  })
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Время</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Источник</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Статус</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Контакт</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">О чём</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                          Ничего не найдено
                        </td>
                      </tr>
                    ) : (
                      grouped.keys.flatMap((dk) => {
                        const dayLeads = grouped.map.get(dk) || []
                        const header = (
                          <tr key={`h-${dk}`} className="bg-slate-900/60">
                            <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-slate-300">
                              {dk === 'unknown' ? 'Без даты' : dk}
                              <span className="text-slate-500 font-normal"> • {dayLeads.length}</span>
                            </td>
                          </tr>
                        )
                        const rows = dayLeads.map((lead) => {
                          const src = sourceBadge(lead.source)
                          return (
                            <tr
                              key={lead.id}
                              onClick={() => setSelectedId(lead.id)}
                              className={`cursor-pointer hover:bg-slate-700/40 transition-colors ${selectedId === lead.id ? 'bg-slate-700/30' : ''}`}
                            >
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{fmtTimeOnly(lead.createdAt)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${src.cls}`}>
                                  {src.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(String(lead.status))}`}>
                                  {STATUS_LABEL[String(lead.status) as LeadStatus] || String(lead.status)}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-white">{lead.contact}</td>
                              <td className="px-4 py-3 text-sm text-slate-200">
                                <div className="font-semibold">{lead.businessType || '—'}</div>
                                <div className="text-xs text-slate-400 line-clamp-2">{lead.aiSummary || lead.pain || lead.question || '—'}</div>
                              </td>
                            </tr>
                          )
                        })
                        return [header, ...rows]
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detail */}
            <div className="hidden md:block p-4 sm:p-6">
              <LeadDetail variant="desktop" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet (lead detail) */}
      {selected ? (
        <div className="md:hidden">
          <button
            className="fixed inset-0 bg-black/60"
            onClick={() => setSelectedId(null)}
            aria-label="Close lead details"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-slate-900 p-4 pb-10">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="h-1.5 w-12 rounded-full bg-white/20 mx-auto" />
              <button
                onClick={() => setSelectedId(null)}
                className="absolute right-3 top-3 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold"
              >
                Закрыть
              </button>
            </div>
            <LeadDetail variant="mobile" />
          </div>
        </div>
      ) : null}
    </div>
  )
}




