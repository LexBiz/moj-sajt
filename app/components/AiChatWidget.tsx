'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type ChatMsg = { role: 'user' | 'assistant'; content: string }

export function AiChatWidget() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<ChatMsg[]>([])
  const listRef = useRef<HTMLDivElement | null>(null)
  const lastUserAtRef = useRef<number>(0)
  const lastAssistantAtRef = useRef<number>(0)
  const followUpShownRef = useRef<boolean>(false)
  const followUpTimerRef = useRef<number | null>(null)

  const lang: 'ru' = 'ru'
  const basePayload = useMemo(
    () => ({
      tenantId: 'temoweb',
      businessType: 'TemoWeb — digital systems for client automation (website + AI manager in 5 channels)',
      channel: 'Website, WhatsApp, Telegram, Instagram, Messenger',
      currentChannel: 'website',
      sourceHint: 'website_widget',
      lang,
    }),
    [lang]
  )
  const chips = useMemo(
    () => [
      'Мне нужен сайт',
      'Хочу AI-менеджера в WhatsApp/Instagram',
      'Сколько стоит и что входит?',
      'Хочу показать, где теряю заявки',
    ],
    []
  )

  const scrollToBottom = () => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }

  const buildFollowUp = (lastUserText: string) => {
    const last = String(lastUserText || '').trim().slice(0, 120)
    return [
      'Вернусь на минуту 🙂',
      last ? `Правильно понял: ${last}?` : 'Правильно понял запрос?',
      'Если удобнее — оставьте номер, я напишу вам в WhatsApp.',
    ].join('\n')
  }

  const maybeScheduleFollowUp = () => {
    if (!open) return
    if (followUpTimerRef.current) {
      window.clearTimeout(followUpTimerRef.current)
      followUpTimerRef.current = null
    }
    if (followUpShownRef.current) return
    const lastUserAt = lastUserAtRef.current
    const lastAssistantAt = lastAssistantAtRef.current
    if (!lastAssistantAt || lastAssistantAt <= lastUserAt) return
    const remaining = 20 * 60 * 1000 - (Date.now() - lastAssistantAt)
    if (remaining <= 0) {
      const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content || ''
      followUpShownRef.current = true
      setHistory((prev) => [...prev, { role: 'assistant', content: buildFollowUp(lastUser) }])
      return
    }
    followUpTimerRef.current = window.setTimeout(() => {
      if (!open) return
      if (followUpShownRef.current) return
      if (lastAssistantAtRef.current <= lastUserAtRef.current) return
      const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content || ''
      followUpShownRef.current = true
      setHistory((prev) => [...prev, { role: 'assistant', content: buildFollowUp(lastUser) }])
    }, remaining)
  }

  const fetchIntroIfNeeded = async () => {
    if (history.length > 0) return
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...basePayload,
          mode: 'show',
          history: [],
          question: null,
        }),
      })
      const data = await res.json()
      const answer = String(data?.answer || '').trim()
      if (answer) {
        lastAssistantAtRef.current = Date.now()
        setHistory([{ role: 'assistant', content: answer }])
      }
      if (String(data?.provider || '') === 'fallback') {
        setNotice('AI сейчас работает в упрощённом режиме (ключ OpenAI не подключён).')
      }
    } catch {
      setError('Не удалось загрузить AI-чат. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    void fetchIntroIfNeeded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    scrollToBottom()
  }, [open, history.length])

  useEffect(() => {
    if (!open) return
    maybeScheduleFollowUp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, history.length])

  useEffect(() => {
    return () => {
      if (followUpTimerRef.current) window.clearTimeout(followUpTimerRef.current)
    }
  }, [])

  const send = async (text: string) => {
    const q = String(text || '').trim()
    if (!q || loading) return
    setError('')
    setNotice('')
    followUpShownRef.current = false
    lastUserAtRef.current = Date.now()
    const nextHistory: ChatMsg[] = [...history, { role: 'user', content: q }]
    setHistory(nextHistory)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...basePayload,
          mode: 'post',
          history: nextHistory,
          question: q,
        }),
      })
      const data = await res.json()
      const answer = String(data?.answer || '').trim()
      if (answer) {
        lastAssistantAtRef.current = Date.now()
        setHistory((prev) => [...prev, { role: 'assistant', content: answer }])
      }
      if (String(data?.provider || '') === 'fallback') {
        setNotice('AI сейчас работает в упрощённом режиме (ключ OpenAI не подключён).')
      }
    } catch {
      setError('Ошибка AI. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group fixed bottom-20 right-5 z-[60] flex h-12 items-center gap-2 rounded-full border border-white/[0.10] bg-[#0F1318]/90 px-3.5 text-[13px] font-medium text-white shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:border-white/[0.18] hover:bg-[#111827]/90 active:scale-[0.98] sm:bottom-5 sm:right-[76px]"
        aria-label="AI chat"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB]/20">
          <span className="absolute inset-0 rounded-full bg-[#2563EB]/20 blur-lg" />
          <span className="relative text-[12px] font-semibold text-[#93C5FD]">AI</span>
        </span>
        <span className="hidden sm:inline">{open ? 'Свернуть' : 'AI‑чат'}</span>
      </button>

      {/* Panel */}
      {open ? (
        <div className="fixed bottom-36 right-5 z-[60] w-[calc(100vw-2.5rem)] max-w-[340px] overflow-hidden rounded-2xl border border-white/[0.10] bg-[#0A0D12]/95 shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:bottom-20">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <div>
              <p className="text-[12px] font-semibold text-white">AI‑менеджер TemoWeb</p>
              <p className="mt-0.5 text-[11px] text-[#64748B]">Спросите про сайт, каналы, цены, запуск</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setHistory([])
                setError('')
                setNotice('')
                followUpShownRef.current = false
                lastUserAtRef.current = 0
                lastAssistantAtRef.current = 0
              }}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-[#94A3B8] transition hover:border-white/[0.16] hover:text-white"
            >
              Reset
            </button>
          </div>

          <div className="px-3 py-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => send(c)}
                  className="rounded-full border border-white/[0.10] bg-white/[0.03] px-3 py-1.5 text-[11px] text-[#CBD5E1] transition hover:border-white/[0.18] hover:bg-white/[0.05]"
                >
                  {c}
                </button>
              ))}
            </div>

            <div
              ref={listRef}
              className="scrollbar-thin max-h-[340px] space-y-2 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
            >
              {history.map((m, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                    m.role === 'assistant'
                      ? 'border border-[#2563EB]/20 bg-[#2563EB]/[0.08] text-[#DBEAFE]'
                      : 'border border-white/[0.08] bg-white/[0.03] text-[#E2E8F0]'
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {loading ? (
                <div className="flex items-center gap-2 text-[12px] text-[#94A3B8]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#2563EB]" />
                  Печатает…
                </div>
              ) : null}
              {error ? (
                <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-[12px] text-red-200">
                  {error}
                </div>
              ) : null}
              {notice ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[12px] text-amber-200">
                  {notice}
                </div>
              ) : null}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                void send(input)
              }}
              className="mt-2 flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Напишите сообщение…"
                className="h-10 flex-1 rounded-xl border border-white/[0.10] bg-white/[0.03] px-3 text-[12px] text-white placeholder-[#475569] outline-none transition focus:border-[#2563EB]/50 focus:ring-2 focus:ring-[#2563EB]/20"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="h-10 rounded-xl bg-[#2563EB] px-3 text-[12px] font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}

