'use client'

import { useEffect, useMemo, useState } from 'react'

type Profile = {
  tenantId: string
  updatedAt: string
  defaultLang: 'ua' | 'ru'
  allowRuOnlyIfAsked: boolean
  timezone: string
  niche: string | null
  geo: string | null
  offer: string | null
  services: string[]
  faq: string[]
  leadMustCollect: { phone: boolean; email: boolean }
  managerTelegramChatId: string | null
  notes: string | null
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString('ru-RU')
}

export default function AdminProfilesPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${password}` }), [password])

  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([])
  const [tenantId, setTenantId] = useState('temoweb')
  const [profile, setProfile] = useState<Profile | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [defaultLang, setDefaultLang] = useState<'ua' | 'ru'>('ua')
  const [allowRuOnlyIfAsked, setAllowRuOnlyIfAsked] = useState(true)
  const [timezone, setTimezone] = useState('Europe/Kyiv')
  const [niche, setNiche] = useState('')
  const [geo, setGeo] = useState('')
  const [offer, setOffer] = useState('')
  const [servicesText, setServicesText] = useState('')
  const [faqText, setFaqText] = useState('')
  const [tgChatId, setTgChatId] = useState('')
  const [notes, setNotes] = useState('')

  const loadTenants = async () => {
    const res = await fetch('/api/tenants', { headers: authHeader })
    const json = (await res.json().catch(() => ({}))) as any
    if (!res.ok) throw new Error(json?.error || 'Failed to load tenants')
    const list = Array.isArray(json?.tenants) ? json.tenants : []
    setTenants(list.map((t: any) => ({ id: String(t.id || ''), name: String(t.name || '') })).filter((x: any) => x.id && x.name))
  }

  const loadProfile = async (tId: string) => {
    const url = new URL('/api/tenantProfiles', window.location.origin)
    url.searchParams.set('tenantId', tId)
    const res = await fetch(url.toString(), { headers: authHeader })
    const json = (await res.json().catch(() => ({}))) as any
    if (!res.ok) throw new Error(json?.error || 'Failed to load profile')
    const p = (json?.profile || null) as Profile | null
    setProfile(p)
    if (p) {
      setDefaultLang(p.defaultLang)
      setAllowRuOnlyIfAsked(Boolean(p.allowRuOnlyIfAsked))
      setTimezone(p.timezone || 'Europe/Kyiv')
      setNiche(p.niche || '')
      setGeo(p.geo || '')
      setOffer(p.offer || '')
      setServicesText((p.services || []).join('\n'))
      setFaqText((p.faq || []).join('\n'))
      setTgChatId(p.managerTelegramChatId || '')
      setNotes(p.notes || '')
    } else {
      setDefaultLang('ua')
      setAllowRuOnlyIfAsked(true)
      setTimezone('Europe/Kyiv')
      setNiche('')
      setGeo('')
      setOffer('')
      setServicesText('')
      setFaqText('')
      setTgChatId('')
      setNotes('')
    }
  }

  const login = async () => {
    setLoading(true)
    setError('')
    try {
      await loadTenants()
      await loadProfile(tenantId)
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
      const res = await fetch('/api/tenantProfiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          tenantId,
          defaultLang,
          allowRuOnlyIfAsked,
          timezone,
          niche: niche.trim() || null,
          geo: geo.trim() || null,
          offer: offer.trim() || null,
          services: servicesText
            .split('\n')
            .map((x) => x.trim())
            .filter(Boolean),
          faq: faqText
            .split('\n')
            .map((x) => x.trim())
            .filter(Boolean),
          managerTelegramChatId: tgChatId.trim() || null,
          notes: notes.trim() || null,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as any
      if (!res.ok) throw new Error(json?.error || 'Save failed')
      const p = (json?.profile || null) as Profile | null
      setProfile(p)
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
        await loadProfile(tenantId)
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
          <h1 className="text-2xl font-bold text-white">Профиль клиента • Tenant Profile</h1>
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
              <h1 className="text-2xl font-bold text-white">Tenant Profile</h1>
              <p className="text-slate-400 text-sm mt-1">
                Это “мозг” под нишу клиента: язык, оффер, FAQ, услуги. Позже мы будем подмешивать это в AI-слои вместо хардкода.
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('adminPassword')
                setAuthed(false)
                setPassword('')
                setTenants([])
                setProfile(null)
              }}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium"
            >
              Выйти
            </button>
          </div>

          {error ? <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
            >
              {(tenants.length ? tenants : [{ id: 'temoweb', name: 'TemoWeb' }]).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.id})
                </option>
              ))}
            </select>
            <select
              value={defaultLang}
              onChange={(e) => setDefaultLang(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
              title="Язык по умолчанию"
            >
              <option value="ua">UA</option>
              <option value="ru">RU</option>
            </select>
            <label className="flex items-center gap-2 px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white">
              <input type="checkbox" checked={allowRuOnlyIfAsked} onChange={(e) => setAllowRuOnlyIfAsked(e.target.checked)} />
              RU только если клиент попросил
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Timezone (например Europe/Kyiv)"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
            />
            <input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Ниша (например: детейлинг авто)"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
            />
            <input
              value={geo}
              onChange={(e) => setGeo(e.target.value)}
              placeholder="Гео (например: Praha / Berlin / Kyiv)"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
            />
          </div>

          <div className="mt-3">
            <textarea
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              rows={3}
              placeholder="Оффер/позиционирование (1–5 строк)"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
            />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <textarea
              value={servicesText}
              onChange={(e) => setServicesText(e.target.value)}
              rows={6}
              placeholder="Услуги (по 1 на строку)"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
            />
            <textarea
              value={faqText}
              onChange={(e) => setFaqText(e.target.value)}
              rows={6}
              placeholder="FAQ/возражения (по 1 на строку)"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
            />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              value={tgChatId}
              onChange={(e) => setTgChatId(e.target.value)}
              placeholder="Telegram chat_id менеджера (опционально)"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
            />
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Заметки по клиенту"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              disabled={loading}
            />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={save}
              disabled={loading || !tenantId}
              className="px-5 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold transition-all disabled:opacity-50"
            >
              {loading ? 'Сохраняю…' : 'Сохранить профиль'}
            </button>
            <button
              onClick={() => {
                setLoading(true)
                loadProfile(tenantId)
                  .catch((e: any) => setError(String(e?.message || e)))
                  .finally(() => setLoading(false))
              }}
              disabled={loading}
              className="px-5 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-all disabled:opacity-50"
            >
              Обновить
            </button>
            <div className="text-sm text-slate-400">updated: {fmt(profile?.updatedAt)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

