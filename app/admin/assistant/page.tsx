'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

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
  const [tab, setTab] = useState<'inbox' | 'open' | 'all' | 'done'>('inbox')
  const [recording, setRecording] = useState(false)
  const [gptMode, setGptMode] = useState(true)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<BlobPart[]>([])
  const chatScrollRef = useRef<HTMLDivElement | null>(null)

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
      const m = localStorage.getItem('assistantMode') || ''
      if (m) setGptMode(m !== 'exec')
    } catch {}
  }, [])

  async function loadAll(pw?: string) {
    const hdrs: Record<string, string> = {}
    const p = String(pw || '').trim()
    if (p) hdrs.Authorization = `Bearer ${p}`
    else if (authHeader.Authorization) hdrs.Authorization = authHeader.Authorization
    setError('')
    try {
      const statusParam = tab === 'all' ? '' : `&status=${encodeURIComponent(tab)}`
      const [mRes, iRes] = await Promise.all([
        fetch(`/api/admin/assistant/messages?tenantId=${encodeURIComponent(tenantId)}&limit=80`, { headers: hdrs }),
        fetch(`/api/admin/assistant/items?tenantId=${encodeURIComponent(tenantId)}${statusParam}&limit=120`, { headers: hdrs }),
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
  }, [isAuthenticated, tenantId, tab])

  // Auto-scroll chat to bottom on new messages.
  useEffect(() => {
    const el = chatScrollRef.current
    if (!el) return
    try {
      el.scrollTop = el.scrollHeight
    } catch {}
  }, [messages.length])

  async function markDone(id: number) {
    if (!authHeader.Authorization) return
    try {
      await fetch('/api/admin/assistant/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader.Authorization },
        body: JSON.stringify({ id, patch: { status: 'done' } }),
      })
      await loadAll()
    } catch {
      // ignore
    }
  }

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
    const userId = Date.now()
    const assistantId = userId + 1
    setMessages((prev) => [...prev, { id: userId, role: 'user', content: msg } as any, { id: assistantId, role: 'assistant', content: '' } as any])
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authHeader.Authorization) headers.Authorization = authHeader.Authorization
      const mode = gptMode ? 'gpt' : 'exec'
      const url = gptMode ? '/api/admin/assistant/chat?stream=1' : '/api/admin/assistant/chat'
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tenantId, message: msg, mode }),
      })
      if (!res.ok) throw new Error('chat_failed')
      const ct = String(res.headers.get('content-type') || '').toLowerCase()
      if (ct.includes('application/json')) {
        const j = await res.json()
        const reply = String(j?.reply || '').trim()
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? ({ ...m, content: reply || '(нет ответа)' } as any) : m)))
      } else {
        const reader = res.body?.getReader()
        if (!reader) throw new Error('no_stream')
        const decoder = new TextDecoder('utf-8')
        let acc = ''
        // Stream chunks and "type" them into the last assistant bubble.
        while (true) {
          const r = await reader.read()
          if (r.done) break
          acc += decoder.decode(r.value, { stream: true })
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? ({ ...m, content: acc } as any) : m)))
        }
      }
      await loadAll()
    } catch {
      setError('Помилка чату. Перевір ключ OpenAI / пароль ADMIN.')
    } finally {
      setLoading(false)
    }
  }

  async function toggleVoice() {
    if (loading) return
    if (recording) {
      try {
        recorderRef.current?.stop()
      } catch {}
      setRecording(false)
      return
    }
    setError('')
    recordedChunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      recorderRef.current = rec
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      rec.onstop = async () => {
        try {
          stream.getTracks().forEach((t) => t.stop())
        } catch {}
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' })
        if (!blob || blob.size < 800) return
        setLoading(true)
        try {
          const fd = new FormData()
          fd.append('tenantId', tenantId)
          fd.append('mode', gptMode ? 'gpt' : 'exec')
          fd.append('audio', blob, 'voice.webm')
          const headers: Record<string, string> = {}
          if (authHeader.Authorization) headers.Authorization = authHeader.Authorization
          const res = await fetch('/api/admin/assistant/chat', { method: 'POST', headers, body: fd })
          if (!res.ok) throw new Error('voice_failed')
          const j = await res.json()
          const reply = String(j?.reply || '').trim()
          // Optimistic UI: append assistant reply (user message is stored server-side as voice transcript)
          if (reply) setMessages((prev) => [...prev, { id: Date.now() + 2, role: 'assistant', content: reply } as any])
          await loadAll()
        } catch {
          setError('Не получилось отправить голосовое. Проверь доступ к микрофону/пароль.')
        } finally {
          setLoading(false)
        }
      }
      rec.start()
      setRecording(true)
    } catch {
      setError('Нет доступа к микрофону в браузере.')
      setRecording(false)
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
          <div className="text-slate-300 text-sm">
            {gptMode ? 'Режим GPT: просто общайся как в ChatGPT. Всё сохраняю в память.' : 'Режим Executive: структурирую в план/задачи/напоминания.'}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            className={[
              'text-xs px-3 py-2 rounded-lg border transition-colors',
              gptMode ? 'bg-emerald-600/20 border-emerald-400/30 text-emerald-50' : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10',
            ].join(' ')}
            onClick={() => {
              const next = !gptMode
              setGptMode(next)
              try {
                localStorage.setItem('assistantMode', next ? 'gpt' : 'exec')
              } catch {}
            }}
            title="GPT mode"
          >
            GPT‑5.2
          </button>
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
          <div ref={chatScrollRef} className="p-4 space-y-3 max-h-[62vh] overflow-auto">
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
              />
              <button
                className={[
                  'rounded-xl px-3 py-2 font-semibold border',
                  recording
                    ? 'bg-rose-600/30 border-rose-400/30 text-rose-100 hover:bg-rose-600/40'
                    : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10',
                ].join(' ')}
                onClick={toggleVoice}
                disabled={loading}
                title={recording ? 'Stop' : 'Voice'}
              >
                {recording ? 'Stop' : 'Voice'}
              </button>
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
          <div className="border-b border-white/10 px-4 py-3">
            <div className="font-semibold">Память</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {(
                [
                  { k: 'inbox', label: 'Inbox' },
                  { k: 'open', label: 'Open' },
                  { k: 'done', label: 'Done' },
                  { k: 'all', label: 'All' },
                ] as const
              ).map((x) => (
                <button
                  key={x.k}
                  onClick={() => setTab(x.k)}
                  className={[
                    'px-3 py-1 rounded-lg border transition-colors',
                    tab === x.k ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10',
                  ].join(' ')}
                >
                  {x.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 space-y-3 max-h-[72vh] overflow-auto">
            {items.length === 0 ? <div className="text-slate-400 text-sm">Пока пусто. Напиши в чат — и появятся заметки/задачи/напоминания.</div> : null}
            {items.map((it) => {
              const when = it.remindAt || it.dueAt || it.createdAt || null
              return (
                <div key={it.id} className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-400">
                      #{it.id} • {it.kind} • {it.status}
                    </div>
                    {when ? <div className="text-xs text-slate-400">{fmt(when)}</div> : null}
                  </div>
                  <div className="mt-1 font-semibold text-sm text-white">{it.title || '(без назви)'}</div>
                  {it.body ? <div className="mt-1 text-sm text-slate-200 whitespace-pre-wrap">{clip(it.body, 360)}</div> : null}
                  {it.status !== 'done' ? (
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        className="text-xs px-3 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
                        onClick={() => markDone(it.id)}
                      >
                        Done
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

