'use client'
import { useMemo, useEffect, useState } from 'react'

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost' | 'junk'
type Lead = {
  id: number
  name: string | null
  contact: string
  businessType: string | null
  channel: string | null
  pain: string | null
  question: string | null
  clientMessages: string[] | null
  aiSummary: string | null
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

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editStatus, setEditStatus] = useState<string>('new')
  const [editNotes, setEditNotes] = useState<string>('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/leads', {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLeads(data)
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

  const loadLeads = async () => {
    const savedPassword = localStorage.getItem('adminPassword')
    if (!savedPassword) return

    try {
      const response = await fetch('/api/leads', {
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
      const response = await fetch('/api/leads', {
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
    loadLeads()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('adminPassword')
    setIsAuthenticated(false)
    setPassword('')
    setLeads([])
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return leads.filter((l) => {
      if (statusFilter !== 'all' && String(l.status) !== statusFilter) return false
      if (sourceFilter !== 'all' && String(l.source || '') !== sourceFilter) return false
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
  }, [leads, q, statusFilter, sourceFilter])

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
    return { total, todayCount, byStatus, bySource }
  }, [leads])

  const selected = useMemo(() => leads.find((l) => l.id === selectedId) || null, [leads, selectedId])

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
            </div>
          </div>

          {/* Main */}
          <div className="grid md:grid-cols-3">
            {/* List */}
            <div className="md:col-span-2 border-r border-slate-700">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Дата</th>
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
                      filtered.map((lead) => {
                        const src = sourceBadge(lead.source)
                        return (
                          <tr
                            key={lead.id}
                            onClick={() => setSelectedId(lead.id)}
                            className={`cursor-pointer hover:bg-slate-700/40 transition-colors ${selectedId === lead.id ? 'bg-slate-700/30' : ''}`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{fmtDate(lead.createdAt)}</td>
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
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detail */}
            <div className="p-4 sm:p-6">
              {!selected ? (
                <div className="text-slate-400 text-sm">
                  Выбери заявку слева — и тут будут детали, статусы и заметки.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs text-slate-400">Контакт</p>
                        <p className="text-lg font-bold text-white break-all">{selected.contact}</p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(selected.contact)}
                        className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm"
                      >
                        Копировать
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{fmtDate(selected.createdAt)}</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2 text-sm text-slate-200">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Источник</span>
                      <span>{selected.source || '—'}{selected.lang ? ` (${selected.lang})` : ''}</span>
                    </div>
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
                      <p className="text-xs text-slate-400 mb-2">Сообщения клиента</p>
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
                        rows={4}
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



