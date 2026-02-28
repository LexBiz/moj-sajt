'use client'

import { useEffect, useMemo, useState } from 'react'

type Template = {
  id: string
  slug: string
  name: string
  description?: string | null
  payload: any
  isActive: boolean
  version: number
  updatedAt?: string
}

type Tenant = { id: string; name: string }

function fmt(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString('ru-RU')
}

export default function AdminTemplatesPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${password}` }), [password])

  const [templates, setTemplates] = useState<Template[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantId, setTenantId] = useState('temoweb')
  const [templateId, setTemplateId] = useState('')
  const [overridesText, setOverridesText] = useState('{\n  "extraRules": []\n}')

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [payloadText, setPayloadText] = useState(
    '{\n  "offer": "",\n  "services": [],\n  "faq": [],\n  "extraRules": [\n    "Всегда держи ответы короткими и практичными."\n  ]\n}',
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadAll = async () => {
    const [tRes, cRes] = await Promise.all([
      fetch('/api/assistantTemplates', { headers: authHeader }),
      fetch('/api/tenants', { headers: authHeader }),
    ])
    const tj = (await tRes.json().catch(() => ({}))) as any
    const cj = (await cRes.json().catch(() => ({}))) as any
    if (!tRes.ok) throw new Error(tj?.error || 'Failed to load templates')
    if (!cRes.ok) throw new Error(cj?.error || 'Failed to load tenants')
    setTemplates(Array.isArray(tj?.templates) ? tj.templates : [])
    setTenants(Array.isArray(cj?.tenants) ? cj.tenants : [])
  }

  const login = async () => {
    setLoading(true)
    setError('')
    try {
      await loadAll()
      setAuthed(true)
      localStorage.setItem('adminPassword', password)
    } catch (e: any) {
      setError(String(e?.message || e || 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  const createTemplate = async () => {
    setLoading(true)
    setError('')
    try {
      let payload: any = {}
      try {
        payload = JSON.parse(payloadText || '{}')
      } catch {
        throw new Error('Template payload JSON invalid')
      }
      const res = await fetch('/api/assistantTemplates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ name, slug, description, payload }),
      })
      const j = (await res.json().catch(() => ({}))) as any
      if (!res.ok) throw new Error(j?.error || 'Template save failed')
      setName('')
      setSlug('')
      setDescription('')
      await loadAll()
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  const applyTemplate = async () => {
    setLoading(true)
    setError('')
    try {
      let overrides: any = {}
      try {
        overrides = JSON.parse(overridesText || '{}')
      } catch {
        throw new Error('Overrides JSON invalid')
      }
      const res = await fetch('/api/tenantAssistantConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ tenantId, templateId, overrides, applyToProfile: true }),
      })
      const j = (await res.json().catch(() => ({}))) as any
      if (!res.ok) throw new Error(j?.error || 'Template apply failed')
    } catch (e: any) {
      setError(String(e?.message || e))
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
        await loadAll()
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
          <h1 className="text-2xl font-bold text-white">Шаблоны AI</h1>
          <p className="text-slate-400 text-sm mt-2">Вход тем же паролем, что и в CRM.</p>
          <div className="mt-4 space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль админа"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
            />
            {error ? <div className="text-sm text-red-300">{error}</div> : null}
            <button onClick={login} disabled={!password || loading} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-lg font-semibold">
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
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <h1 className="text-2xl font-bold text-white">Шаблоны ассистента</h1>
          <p className="text-slate-400 text-sm mt-1">Один master-шаблон + быстрый apply к любому tenant.</p>
          {error ? <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200">{error}</div> : null}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название шаблона" className="px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white" />
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug (например retail-core)" className="px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white" />
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Короткое описание" className="px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white" />
          </div>
          <div className="mt-3">
            <textarea value={payloadText} onChange={(e) => setPayloadText(e.target.value)} rows={8} className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm" />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={createTemplate} disabled={loading || !name.trim()} className="px-5 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold">
              Сохранить шаблон
            </button>
            <button onClick={() => void loadAll()} disabled={loading} className="px-5 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 font-semibold">
              Обновить
            </button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white">Применить шаблон к клиенту</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white">
              {(tenants.length ? tenants : [{ id: 'temoweb', name: 'TemoWeb' }]).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.id})
                </option>
              ))}
            </select>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white">
              <option value="">Выбери шаблон</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug}) v{t.version}
                </option>
              ))}
            </select>
            <button onClick={applyTemplate} disabled={loading || !tenantId || !templateId} className="px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold">
              Применить к tenant
            </button>
          </div>
          <div className="mt-3">
            <textarea value={overridesText} onChange={(e) => setOverridesText(e.target.value)} rows={6} className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 text-white font-semibold">Шаблоны: {templates.length}</div>
          <div className="p-4 space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-white font-semibold">
                    {t.name} <span className="text-slate-400 text-sm">({t.slug})</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    v{t.version} • updated {fmt(t.updatedAt)}
                  </div>
                </div>
                {t.description ? <div className="mt-1 text-sm text-slate-300">{t.description}</div> : null}
              </div>
            ))}
            {templates.length === 0 ? <div className="text-slate-500">Пока нет шаблонов.</div> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

