'use client'

import { useEffect, useMemo, useState } from 'react'

type AssistantItem = {
  id: number
  kind: string
  title?: string | null
  body?: string | null
  status: string
  dueAt?: string | null
  remindAt?: string | null
  createdAt?: string | null
}

type AssistantMessage = {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: string | null
}

function fmt(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function clip(s: any, max = 220) {
  const t = String(s ?? '')
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export default function AdminAssistantPage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [tenantId, setTenantId] = useState('temoweb')
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [items, setItems] = useState<AssistantItem[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const authHeader = useMemo(() => {
    const h: Record<string, string> = {}
    const pw = String(password || '').trim()
    if (pw) h.Authorization = `Bearer ${pw}`
    return h
  }, [password])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('adminPassword') || ''
      if (saved) {
        setPassword(saved)
        setIsAuthenticated(true)
      }
    } catch {}
  }, [])

  async function loadAll(pw?: string) {
    const hdrs: Record<string, string> = {}
    const p = String(pw || '').trim()
    if (p) hdrs.Authorization = `Bearer ${p}`
    else if (authHeader.Authorization) hdrs.Authorization = authHeader.Authorization
    setError('')
    try {
      const [mRes, iRes] = await Promise.all([
        fetch(`/api/admin/assistant/messages?tenantId=${encodeURIComponent(tenantId)}&limit=80`, { headers: hdrs }),
        fetch(`/api/admin/assistant/items?tenantId=${encodeURIComponent(tenantId)}&status=open&limit=80`, { headers: hdrs }),
      ])
      if (!mRes.ok) throw new Error('auth_or_messages_failed')
      if (!iRes.ok) throw new Error('items_failed')
      const mj = await mRes.json()
      const ij = await iRes.json()
      const ms = Array.isArray(mj?.messages) ? mj.messages : []
      const its = Array.isArray(ij?.items) ? ij.items : []
      // backend returns newest-first; UI shows oldest-first
      setMessages(ms.slice().reverse())
      setItems(its)
    } catch {
      setError('Не авторизовано або помилка завантаження. Перевір пароль ADMIN.')
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, tenantId])

  async function login() {
    setLoading(true)
    setError('')
    try {
      await loadAll(password)
      setIsAuthenticated(true)
      try {
        localStorage.setItem('adminPassword', password)
      } catch {}
    } finally {
      setLoading(false)
    }
  }

  async function send() {
    const msg = text.trim()
    if (!msg) return
    setLoading(true)
    setError('')
    setText('')
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: msg } as any])
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authHeader.Authorization) headers.Authorization = authHeader.Authorization
      const res = await fetch('/api/admin/assistant/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ tenantId, message: msg }),
      })
      if (!res.ok) throw new Error('chat_failed')
      const j = await res.json()
      const reply = String(j?.reply || '').trim()
      if (reply) setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', content: reply } as any])
      await loadAll()
    } catch {
      setError('Помилка чату. Перевір ключ OpenAI / пароль ADMIN.')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <div className="text-2xl font-bold mb-2">Ассистент</div>
        <div className="text-slate-300 mb-6">Личный executive‑assistant внутри CRM (память, задачи, напоминания).</div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-slate-300 mb-2">ADMIN пароль</div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ADMIN_PASSWORD"
              type="password"
            />
            <button
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 font-semibold disabled:opacity-60"
              onClick={login}
              disabled={!password.trim() || loading}
            >
              Войти
            </button>
          </div>
          {error ? <div className="text-rose-300 text-sm mt-3">{error}</div> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-2xl font-bold">Ассистент</div>
          <div className="text-slate-300 text-sm">Пиши всё, что у тебя в голове. Я сохраню и превращу в план/задачи/напоминания.</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-400">tenant</div>
          <input
            className="w-40 rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-white text-sm"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3 font-semibold">Чат</div>
          <div className="p-4 space-y-3 max-h-[62vh] overflow-auto">
            {messages.length === 0 ? (
              <div className="text-slate-400 text-sm">
                Напиши, например: «Запомни: в понедельник созвон с Петром в 16:00», или «Сделай список задач на неделю».
              </div>
            ) : null}
            {messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <div
                  className={[
                    'inline-block max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed border',
                    m.role === 'user'
                      ? 'bg-emerald-600/20 border-emerald-400/30 text-emerald-50'
                      : 'bg-white/5 border-white/10 text-slate-100',
                  ].join(' ')}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.createdAt ? <div className="mt-2 text-[11px] text-slate-400">{fmt(m.createdAt)}</div> : null}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <textarea
                className="flex-1 rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white text-sm min-h-[44px] max-h-[160px]"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Напиши задачу/идею/дату/план…"
              />
              <button
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 font-semibold disabled:opacity-60"
                onClick={send}
                disabled={loading || !text.trim()}
              >
                Отправить
              </button>
            </div>
            {error ? <div className="text-rose-300 text-sm mt-2">{error}</div> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3 font-semibold">Открытое (память)</div>
          <div className="p-4 space-y-3 max-h-[72vh] overflow-auto">
            {items.length === 0 ? <div className="text-slate-400 text-sm">Пока пусто. Напиши в чат — и появятся заметки/задачи/напоминания.</div> : null}
            {items.map((it) => {
              const when = it.remindAt || it.dueAt || it.createdAt || null
              return (
                <div key={it.id} className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-400">{it.kind}</div>
                    {when ? <div className="text-xs text-slate-400">{fmt(when)}</div> : null}
                  </div>
                  <div className="mt-1 font-semibold text-sm text-white">{it.title || '(без назви)'}</div>
                  {it.body ? <div className="mt-1 text-sm text-slate-200 whitespace-pre-wrap">{clip(it.body, 360)}</div> : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

