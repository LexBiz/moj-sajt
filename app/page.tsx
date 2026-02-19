'use client'

import { useEffect, useRef, useState } from 'react'
import { translations, type Lang } from './translations'

// ─── Scroll reveal ────────────────────────────────────────────────────────────
function useScrollReveal(dep?: unknown) {
  useEffect(() => {
    const els = document.querySelectorAll<Element>('.reveal')
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [dep])
}

// ─── Language Switcher ────────────────────────────────────────────────────────
function LangSwitcher({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.04] p-1">
      {([['en', 'EN'], ['ua', 'CZ'], ['ru', 'RU']] as [Lang, string][]).map(([id, label]) => (
        <button
          key={id}
          onClick={() => setLang(id)}
          className={`min-w-[34px] rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ${
            lang === id ? 'bg-[#2563EB] text-white' : 'text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── Core Architecture Diagram ────────────────────────────────────────────────
function CoreDiagram({ t }: { t: (typeof translations)[Lang] }) {
  return (
    <div className="relative mx-auto h-[360px] w-[360px] select-none lg:h-[420px] lg:w-[420px]">
      {/* SVG: rings + animated dashes */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 420 420" fill="none">
        {/* Background rings */}
        <circle cx="210" cy="210" r="200" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
        <circle cx="210" cy="210" r="152" stroke="rgba(37,99,235,0.07)" strokeWidth="1" />
        <circle cx="210" cy="210" r="104" stroke="rgba(37,99,235,0.14)" strokeWidth="1" />

        {/* Glow fill behind core */}
        <circle cx="210" cy="210" r="60" fill="rgba(37,99,235,0.09)" />

        {/* Animated connection lines: center (210,210) → each satellite */}
        {/* North → Landing (top center ~y=35) */}
        <line x1="210" y1="162" x2="210" y2="72" stroke="#2563EB" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="4 7" className="svg-dash" />
        {/* East → CRM (right center ~x=385) */}
        <line x1="258" y1="210" x2="348" y2="210" stroke="#2563EB" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="4 7" className="svg-dash-2" />
        {/* South → Analytics (bottom center ~y=385) */}
        <line x1="210" y1="258" x2="210" y2="348" stroke="#2563EB" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="4 7" className="svg-dash-3" />
        {/* West → Automation (left center ~x=35) */}
        <line x1="162" y1="210" x2="72" y2="210" stroke="#2563EB" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="4 7" className="svg-dash-4" />
      </svg>

      {/* Pulse rings (centered on core) */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[110px] w-[110px] -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0 rounded-full border border-[#2563EB]/45 ping-slow" />
        <div className="absolute inset-0 rounded-full border border-[#2563EB]/25 ping-slow-delay" />
      </div>

      {/* Core node */}
      <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="flex h-[110px] w-[110px] flex-col items-center justify-center rounded-full border border-[#2563EB]/50 bg-[#0A0D12] shadow-[0_0_50px_rgba(37,99,235,0.32),inset_0_1px_1px_rgba(37,99,235,0.18)]">
          <span className="text-[8px] font-medium uppercase tracking-[0.22em] text-[#2563EB]/70">{t.coreCore}</span>
          <span className="mt-0.5 text-[14px] font-bold leading-tight text-white">{t.coreEngine}</span>
        </div>
      </div>

      {/* Satellite nodes */}
      {/* Top: Landing */}
      <div className="absolute left-1/2 top-[20px] z-10 -translate-x-1/2">
        <SatNode label={t.coreLanding} />
      </div>
      {/* Right: CRM */}
      <div className="absolute right-[10px] top-1/2 z-10 -translate-y-1/2">
        <SatNode label={t.coreCrm} />
      </div>
      {/* Bottom: Analytics */}
      <div className="absolute bottom-[20px] left-1/2 z-10 -translate-x-1/2">
        <SatNode label={t.coreAnalytics} />
      </div>
      {/* Left: Automation */}
      <div className="absolute left-[10px] top-1/2 z-10 -translate-y-1/2">
        <SatNode label={t.coreAutomation} />
      </div>
    </div>
  )
}

function SatNode({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#0F1318]/95 px-3.5 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-sm">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 glow-green" />
      <span className="whitespace-nowrap text-[13px] font-medium text-[#E2E8F0]">{label}</span>
    </div>
  )
}

// ─── Live Dashboard ───────────────────────────────────────────────────────────
function LiveDashboard({ t }: { t: (typeof translations)[Lang] }) {
  const events = [
    { label: t.dashLead,      ms: '0ms',   color: '#3B82F6' },
    { label: t.dashReply,     ms: '280ms',  color: '#10B981' },
    { label: t.dashCrm,       ms: '390ms',  color: '#8B5CF6' },
    { label: t.dashQualified, ms: '1.2s',   color: '#F59E0B' },
  ]

  const [phase, setPhase] = useState(0)
  const eventsLen = events.length
  const tRef = useRef(t)
  tRef.current = t

  useEffect(() => {
    setPhase(0)
    let p = 0
    const id = setInterval(() => {
      p = p >= eventsLen + 1 ? 0 : p + 1
      setPhase(p)
    }, 900)
    return () => clearInterval(id)
  }, [eventsLen, t.dashTitle])

  const visible = events.slice(0, Math.min(phase, eventsLen))

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0F1318] p-5">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#475569]">
          {t.dashTitle}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 glow-green" />
          <span className="text-[10px] text-[#475569]">{t.dashLive}</span>
        </div>
      </div>

      <div className="min-h-[148px] space-y-2">
        {visible.length === 0 ? (
          <div className="flex items-center gap-2 py-2 opacity-40">
            <span className="h-1 w-1 rounded-full bg-[#334155]" />
            <span className="text-[12px] text-[#334155]">{t.dashAwaiting}</span>
          </div>
        ) : (
          visible.map((ev, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.03] px-3.5 py-2.5 animate-fadeIn"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: ev.color, boxShadow: `0 0 6px ${ev.color}` }}
              />
              <span className="flex-1 text-[13px] text-[#CBD5E1]">{ev.label}</span>
              <span className="font-mono text-[11px] text-[#334155]">{ev.ms}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function CountUp({
  to,
  durationMs = 1300,
  decimals = 0,
}: {
  to: number
  durationMs?: number
  decimals?: number
}) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / durationMs, 1)
      setValue(to * p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, durationMs])

  return <>{value.toFixed(decimals)}</>
}

type DemoMsg = { role: 'client' | 'assistant'; content: string }

function LiveAiDemo({
  t,
  onBook,
  lang,
}: {
  t: (typeof translations)[Lang]
  onBook: (industry: string) => void
  lang: Lang
}) {
  const [industry, setIndustry] = useState('')
  const [messages, setMessages] = useState<DemoMsg[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [started, setStarted] = useState(false)
  const [activePreset, setActivePreset] = useState('')
  const [chatInput, setChatInput] = useState('')
  const demoBoxRef = useRef<HTMLDivElement | null>(null)

  const runDemoByIndustry = async (industryValue: string) => {
    const cleaned = industryValue.trim()
    if (!cleaned || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/demo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: cleaned, lang }),
      })
      if (!res.ok) throw new Error('demo-request-failed')
      const data = await res.json()
      const list = Array.isArray(data?.messages) ? data.messages : []
      const safeMessages: DemoMsg[] = list
        .filter((m: any) => m && (m.role === 'client' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(0, 6)
        .map((m: any) => ({ role: m.role, content: m.content.trim() }))
        .filter((m: DemoMsg) => m.content.length > 0)

      if (safeMessages.length === 0) throw new Error('empty-demo')
      await new Promise((resolve) => setTimeout(resolve, 1200))
      setMessages(safeMessages)
      setStarted(true)
    } catch {
      setError(t.demoError)
    } finally {
      setLoading(false)
    }
  }

  const runDemo = async (e: React.FormEvent) => {
    e.preventDefault()
    await runDemoByIndustry(industry)
  }

  const onPresetClick = async (preset: string) => {
    setIndustry(preset)
    setActivePreset(preset)
    setMessages([])
    setStarted(false)
    setError('')
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      demoBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    await runDemoByIndustry(preset)
  }

  const resetDemo = () => {
    setMessages([])
    setStarted(false)
    setError('')
    setActivePreset('')
    setChatInput('')
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = chatInput.trim()
    if (!text || !industry.trim() || loading || !started) return
    const nextMessages = [...messages, { role: 'client' as const, content: text }]
    setMessages(nextMessages)
    setChatInput('')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/demo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: industry.trim(),
          lang,
          messages: nextMessages,
        }),
      })
      if (!res.ok) throw new Error('demo-send-failed')
      const data = await res.json()
      const assistantMessage =
        typeof data?.assistantMessage === 'string' ? data.assistantMessage.trim() : ''
      if (!assistantMessage) throw new Error('empty-assistant-message')
      await new Promise((resolve) => setTimeout(resolve, 800))
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }])
    } catch {
      setError(t.demoError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0F1318] p-6 shadow-[0_0_40px_rgba(37,99,235,0.08)] sm:p-8">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#475569]">{t.demoScenario}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {t.demoPresets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onPresetClick(preset)}
            className={`rounded-full border px-3 py-1.5 text-[12px] transition-all ${
              activePreset === preset
                ? 'border-[#2563EB]/45 bg-[#2563EB]/[0.14] text-[#DBEAFE]'
                : 'border-white/[0.1] bg-white/[0.03] text-[#94A3B8] hover:border-white/[0.22] hover:text-white'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>
      <p className="mb-3 text-[12px] text-[#475569]">{t.demoOrManual}</p>
      <form onSubmit={runDemo} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="block">
          <span className="mb-2 block text-[12px] text-[#94A3B8]">{t.demoIndustryLabel}</span>
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder={t.demoIndustryPlaceholder}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder-[#334155] transition-all duration-200 focus:border-[#2563EB]/50 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !industry.trim()}
          className="btn-primary h-[46px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t.demoRun}
        </button>
        <button type="button" onClick={resetDemo} className="btn-ghost h-[46px]">
          {t.demoReset}
        </button>
      </form>

      <div ref={demoBoxRef} className="mt-5 min-h-[260px] rounded-xl border border-white/[0.06] bg-[#0A0D12] p-4">
        {!started && !loading ? (
          <p className="text-[13px] text-[#475569]">{t.calcLead}</p>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-[#94A3B8]">
            <span className="h-2 w-2 rounded-full bg-[#2563EB] animate-pulse" />
            <span>{t.demoLoading}</span>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-300">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          {messages.map((m, idx) => (
            <div
              key={`${m.role}-${idx}`}
              className={`animate-fadeIn rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
                m.role === 'assistant'
                  ? 'ml-3 border border-[#2563EB]/25 bg-[#2563EB]/[0.08] text-[#DBEAFE]'
                  : 'mr-3 border border-white/[0.08] bg-white/[0.03] text-[#CBD5E1]'
              }`}
            >
              <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#64748B]">
                {m.role === 'assistant' ? t.demoAiPrefix : t.demoClientPrefix}
              </p>
              <p>{m.content}</p>
            </div>
          ))}
        </div>
        {started ? (
          <form onSubmit={sendMessage} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={t.demoMessagePlaceholder}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white placeholder-[#334155] transition-all duration-200 focus:border-[#2563EB]/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            />
            <button
              type="submit"
              disabled={loading || !chatInput.trim()}
              className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.demoSend}
            </button>
          </form>
        ) : null}
        {started && messages.length > 0 ? (
          <button
            type="button"
            onClick={() => onBook(industry.trim())}
            className="btn-primary mt-5 w-full sm:w-auto"
          >
            {t.demoBookCta}
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ─── Lead Form ────────────────────────────────────────────────────────────────
function LeadForm({
  t,
  lang,
  selectedIndustry,
}: {
  t: (typeof translations)[Lang]
  lang: Lang
  selectedIndustry: string
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 'temoweb',
          name,
          contact: phone,
          phone,
          source: 'flow',
          channel: 'website',
          lang: lang === 'ua' ? 'cz' : lang,
          businessType: selectedIndustry || undefined,
          question: selectedIndustry
            ? `Website strategy request · Industry: ${selectedIndustry}`
            : 'Website strategy request',
          clientMessages: [
            `Website lead: ${name || 'No name'} / ${phone}`,
            ...(selectedIndustry ? [`Selected industry: ${selectedIndustry}`] : []),
          ],
        }),
      })
      if (!res.ok) throw new Error()
      setSuccess(true)
      setName('')
      setPhone('')
      setAgreed(false)
      setTimeout(() => setSuccess(false), 5000)
    } catch {
      setError(t.formError)
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3.5 text-[14px] text-white placeholder-[#334155] transition-all duration-200 focus:border-[#2563EB]/50 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20'

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0F1318] p-8">
      <h3 className="text-xl font-semibold text-white">{t.formTitle}</h3>
      <p className="mt-2 text-[13px] text-[#64748B]">{t.formLead}</p>
      {selectedIndustry ? (
        <p className="mt-2 text-[12px] text-[#94A3B8]">
          {t.selectedIndustryLabel}: <span className="text-white">{selectedIndustry}</span>
        </p>
      ) : null}

      {success ? (
        <div className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-5 py-4 text-[13px] text-emerald-300">
          {t.formSuccess}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-7 space-y-3">
          <input type="text"  value={name}  onChange={(e) => setName(e.target.value)}  placeholder={t.formName}  required className={inputCls} />
          <input type="tel"   value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.formPhone} required className={inputCls} />

          <label className="flex cursor-pointer items-start gap-3 pt-1">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-[#2563EB]"
            />
            <span className="text-[12px] leading-relaxed text-[#475569]">
              {t.formConsent}{' '}
              <a href="/privacy" className="text-[#64748B] underline decoration-[#334155] transition hover:text-[#94A3B8]">
                {t.legalPrivacy}
              </a>
            </span>
          </label>

          {error ? (
            <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-300">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !agreed}
            className="btn-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t.formSubmitting : t.formSubmit}
          </button>
        </form>
      )}
    </div>
  )
}

// ─── Stack badge ──────────────────────────────────────────────────────────────
function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#64748B]">
      {label}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [lang, setLang] = useState<Lang>('en')
  const [scrollY, setScrollY] = useState(0)
  const [showTop, setShowTop] = useState(false)
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const t = translations[lang]

  useScrollReveal(lang)

  useEffect(() => {
    const fn = () => {
      setScrollY(window.scrollY)
      setShowTop(window.scrollY > 800)
    }
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const handleBookFromDemo = (industry: string) => {
    setSelectedIndustry(industry)
    if (typeof window !== 'undefined') {
      const el = document.getElementById('contact')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const packages = [
    { title: t.packageStarterTitle, price: t.packageStarterPrice, desc: t.packageStarterDesc, featured: false },
    { title: t.packageGrowthTitle,  price: t.packageGrowthPrice,  desc: t.packageGrowthDesc,  featured: true  },
    { title: t.packageScaleTitle,   price: t.packageScalePrice,   desc: t.packageScaleDesc,   featured: false },
  ]

  const cases = [
    { num: '01', title: t.case1Title, challenge: t.case1Challenge, solution: t.case1Solution, impact: t.case1Impact, metric: t.caseMetrics[0] },
    { num: '02', title: t.case2Title, challenge: t.case2Challenge, solution: t.case2Solution, impact: t.case2Impact, metric: t.caseMetrics[1] },
    { num: '03', title: t.case3Title, challenge: t.case3Challenge, solution: t.case3Solution, impact: t.case3Impact, metric: t.caseMetrics[2] },
    { num: '04', title: t.case4Title, challenge: t.case4Challenge, solution: t.case4Solution, impact: t.case4Impact, metric: t.caseMetrics[3] },
    { num: '05', title: t.case5Title, challenge: t.case5Challenge, solution: t.case5Solution, impact: t.case5Impact, metric: t.caseMetrics[4] },
    { num: '06', title: t.case6Title, challenge: t.case6Challenge, solution: t.case6Solution, impact: t.case6Impact, metric: t.caseMetrics[5] },
  ]

  const stats = [
    { val: t.stat1Val, label: t.stat1Label },
    { val: t.stat2Val, label: t.stat2Label },
    { val: t.stat3Val, label: t.stat3Label },
    { val: t.stat4Val, label: t.stat4Label },
  ]

  return (
    <div className="min-h-screen">

      {/* ════ HEADER ════════════════════════════════════════════════════════════ */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrollY > 40 ? 'border-b border-white/[0.06] bg-[#0A0D12]/92 backdrop-blur-xl' : ''
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <a href="/" className="text-[15px] font-semibold tracking-tight text-white">TemoWeb</a>

          <nav className="hidden items-center gap-6 text-[13px] text-[#64748B] md:flex">
            {[
              ['#services',  t.navServices],
              ['#packages',  t.navPackages],
              ['#cases',     t.navCases],
              ['#about',     t.navAbout],
              ['#contact',   t.navContact],
            ].map(([href, label]) => (
              <a key={href} href={href} className="transition-colors duration-200 hover:text-white">{label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <LangSwitcher lang={lang} setLang={setLang} />
            <a href="#contact" className="btn-primary hidden text-[13px] sm:inline-flex">{t.heroPrimaryCta}</a>
          </div>
        </div>
      </header>

      {/* ════ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-screen items-center overflow-hidden pt-16">
        {/* Dot grid parallax */}
        <div
          className="pointer-events-none absolute inset-0 dot-grid opacity-60"
          style={{ transform: `translateY(${scrollY * 0.12}px)` }}
        />
        {/* Glow blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[5%] top-[-5%] h-[600px] w-[700px] rounded-full bg-[#2563EB] opacity-[0.055] blur-[160px]" />
          <div className="absolute bottom-[5%] right-[5%] h-[400px] w-[500px] rounded-full bg-[#06B6D4] opacity-[0.04] blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-[1200px] items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
              <span className="text-[11px] font-medium tracking-wide text-[#94A3B8]">{t.heroBadge}</span>
            </div>

            <h1 className="mt-7 text-[40px] font-semibold leading-[1.1] tracking-[-0.022em] text-white sm:text-[52px] lg:text-[60px]">
              {t.heroHeadline}
            </h1>

            <p className="mt-6 max-w-[500px] text-[15px] leading-relaxed text-[#94A3B8]">
              {t.heroSubheadline}
            </p>

            <p className="mt-4 text-[13px] italic text-[#334155]">{t.heroMicro}</p>

            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#contact"      className="btn-primary">{t.heroPrimaryCta}</a>
              <a href="#how-it-works" className="btn-ghost">{t.heroSecondaryCta}</a>
              <a href="/flow" className="btn-ghost">{t.flowCta}</a>
            </div>

            {/* Stack badges */}
            <div className="mt-10 flex flex-wrap gap-2">
              {t.stackBadges.map((s) => (
                <Badge key={s} label={s} />
              ))}
            </div>
          </div>

          {/* Right: Core Diagram */}
          <div className="hidden lg:flex lg:items-center lg:justify-center">
            <CoreDiagram t={t} />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex h-9 w-5 items-start justify-center rounded-full border border-white/[0.14] p-1.5">
            <div className="h-1.5 w-1 scroll-down rounded-full bg-white/40" />
          </div>
        </div>
      </section>

      {/* ════ STATS BAR ═════════════════════════════════════════════════════════ */}
      <section className="border-y border-white/[0.06] bg-[#0C1017] py-14">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="reveal grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.val} className="text-center">
                <p className="text-[42px] font-semibold tracking-tight text-white">{s.val}</p>
                <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#334155]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ PROBLEM ═══════════════════════════════════════════════════════════ */}
      <section id="problem" className="border-b border-white/[0.06] py-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="reveal grid gap-14 lg:grid-cols-[1fr_1.5fr] lg:items-start">
            <div>
              <p className="label">{t.eyebrowProblem}</p>
              <h2 className="section-heading">{t.problemTitle}</h2>
              <p className="mt-5 text-[15px] leading-relaxed text-[#64748B]">{t.problemLead}</p>
            </div>

            <div>
              {t.problemItems.map((item, i) => (
                <div key={i} className="group flex items-start gap-5 border-b border-white/[0.05] py-5 last:border-0">
                  <span className="mono-tag mt-0.5 shrink-0">0{i + 1}</span>
                  <span className="text-[15px] leading-relaxed text-[#CBD5E1] transition-colors group-hover:text-white">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════ SOLUTION ══════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="border-b border-white/[0.06] py-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="reveal grid gap-14 lg:grid-cols-2 lg:items-start">
            {/* Left: text + pipeline */}
            <div>
              <p className="label">{t.eyebrowSolution}</p>
              <h2 className="section-heading">{t.solutionTitle}</h2>
              <p className="mt-5 text-[15px] leading-relaxed text-[#64748B]">{t.solutionLead}</p>

              {/* Horizontal pipeline */}
              <div className="mt-10 flex flex-wrap items-center gap-y-3">
                {t.solutionFlow.map((step, i) => (
                  <div key={step} className="flex items-center">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 transition hover:border-[#2563EB]/40 hover:bg-[#2563EB]/[0.05]">
                      <span className="text-[12px] text-[#CBD5E1]">{step}</span>
                    </div>
                    {i < t.solutionFlow.length - 1 && (
                      <div className="mx-1.5 h-px w-5 bg-gradient-to-r from-white/[0.05] via-[#2563EB]/35 to-white/[0.05]" />
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[12px] text-[#334155]">{t.solutionFooter}</p>
            </div>

            {/* Right: live dashboard */}
            <div>
              <LiveDashboard t={t} />
            </div>
          </div>
        </div>
      </section>

      {/* ════ SERVICES ══════════════════════════════════════════════════════════ */}
      <section id="services" className="border-b border-white/[0.06] py-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="reveal mb-14">
            <p className="label">{t.eyebrowServices}</p>
            <h2 className="section-heading">{t.servicesTitle}</h2>
            <p className="mt-4 max-w-xl text-[15px] text-[#64748B]">{t.servicesLead}</p>
          </div>

          {/* Asymmetric stacked layout */}
          <div className="space-y-4">
              {[
              { tag: t.serviceLayer1, title: t.serviceWebTitle,        desc: t.serviceWebDesc,        offset: ''              },
              { tag: t.serviceLayer2, title: t.serviceAutomationTitle, desc: t.serviceAutomationDesc, offset: 'md:ml-[5%] md:w-[95%]' },
              { tag: t.serviceLayer3, title: t.serviceInfraTitle,      desc: t.serviceInfraDesc,      offset: 'md:ml-[10%] md:w-[90%]' },
            ].map((s, i) => (
              <div
                key={s.tag}
                className={`reveal card flex flex-col gap-4 p-7 sm:flex-row sm:items-center sm:justify-between ${s.offset}`}
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <div className="flex items-center gap-4">
                  <span className="mono-tag shrink-0">{s.tag}</span>
                  <h3 className="text-[17px] font-semibold text-white">{s.title}</h3>
                </div>
                <p className="max-w-sm text-[14px] leading-relaxed text-[#64748B] sm:text-right">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ PILOT BANNER ══════════════════════════════════════════════════════ */}
      <section className="border-b border-white/[0.06] py-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="reveal relative overflow-hidden rounded-2xl border border-[#2563EB]/20 bg-[#0F1318] p-10">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#2563EB]/[0.07] via-transparent to-transparent" />
            <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-[#2563EB]/60 via-[#2563EB]/20 to-transparent" />

            <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="label">{t.eyebrowPilot}</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{t.pilotTitle}</h3>
                <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[#64748B]">{t.pilotDesc}</p>
              </div>
              <a
                href="#contact"
                className="shrink-0 rounded-xl bg-white px-6 py-3 text-[13px] font-semibold text-[#0A0D12] transition-all duration-200 hover:bg-[#E2E8F0] active:scale-[0.97]"
              >
                {t.pilotCta}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ════ PACKAGES ══════════════════════════════════════════════════════════ */}
      <section id="packages" className="border-b border-white/[0.06] py-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="reveal mb-14 text-center">
            <p className="label">{t.eyebrowPackages}</p>
            <h2 className="section-heading">{t.packagesTitle}</h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[#64748B]">{t.packagesLead}</p>
            <p className="mt-2 text-[13px] italic text-[#334155]">{t.packagesMicro}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {packages.map((pkg, i) => (
              <article
                key={pkg.title}
                className={`reveal relative overflow-hidden p-8 ${pkg.featured ? 'card-featured' : 'card'}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                {pkg.featured && (
                  <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[#2563EB]/70 to-transparent" />
                )}
                <p className="text-[12px] text-[#475569]">{pkg.title}</p>
                <p className="mt-3 text-[32px] font-semibold tracking-tight text-white">{pkg.price}</p>
                <p className="mt-4 text-[14px] leading-relaxed text-[#64748B]">{pkg.desc}</p>
                <ul className="mt-4 space-y-2">
                  {(pkg.title === t.packageStarterTitle
                    ? t.packageStarterItems
                    : pkg.title === t.packageGrowthTitle
                    ? t.packageGrowthItems
                    : t.packageScaleItems
                  ).map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[12px] text-[#94A3B8]">
                      <span className="mt-[6px] h-1 w-1 rounded-full bg-[#2563EB]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#contact"
                  className={`mt-8 block rounded-xl px-4 py-3 text-center text-[13px] font-medium transition-all duration-200 active:scale-[0.97] ${
                    pkg.featured
                      ? 'bg-[#2563EB] text-white shadow-[0_4px_20px_-4px_rgba(37,99,235,0.5)] hover:bg-[#1d4ed8]'
                      : 'border border-white/[0.09] text-[#64748B] hover:border-white/[0.2] hover:text-white'
                  }`}
                >
                  {t.heroPrimaryCta}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ════ FAQ ═══════════════════════════════════════════════════════════════ */ }
      <section className="border-b border-white/[0.06] py-24">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="reveal mb-10">
            <p className="label">{t.faqTitle}</p>
            <h2 className="section-heading">{t.faqTitle}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {t.faqItems.map((f) => (
              <article key={f.q} className="reveal card p-6">
                <h3 className="text-[16px] font-semibold text-white">{f.q}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#64748B]">{f.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ════ LIVE AI DEMO ═══════════════════════════════════════════════════════ */}
      <section className="border-b border-white/[0.06] py-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="reveal mb-14">
            <p className="label">{t.eyebrowEstimate}</p>
            <h2 className="section-heading">{t.calcTitle}</h2>
            <p className="mt-4 max-w-xl text-[15px] text-[#64748B]">{t.calcLead}</p>
          </div>
          <div className="reveal">
            <LiveAiDemo t={t} onBook={handleBookFromDemo} lang={lang} />
          </div>
        </div>
      </section>

      {/* ════ CASES — LIGHT SECTION ═════════════════════════════════════════════ */}
      <section id="cases" className="section-light py-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="reveal mb-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#2563EB]">
              {t.eyebrowCases}
            </p>
            <h2 className="mt-4 text-[36px] font-semibold leading-tight tracking-tight text-[#0F172A] sm:text-[44px]">
              {t.casesTitle}
            </h2>
            <p className="mt-4 max-w-xl text-[15px] text-[#64748B]">{t.casesLead}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {cases.map((c, i) => (
              <article
                key={c.num}
                className="reveal rounded-2xl border border-[#DDE3EB] bg-white p-8 transition-all duration-300 hover:border-[#2563EB]/30 hover:shadow-[0_8px_32px_-8px_rgba(37,99,235,0.12)]"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="font-mono text-[11px] text-[#2563EB]">{c.num}</span>
                <h3 className="mt-3 text-[17px] font-semibold text-[#0F172A]">{c.title}</h3>
                <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                  <p className="text-[30px] font-semibold tracking-tight text-[#0F172A]">
                    <CountUp to={c.metric?.value ?? 0} decimals={String(c.metric?.value ?? '').includes('.') ? 1 : 0} />
                    {c.metric?.suffix || ''}
                  </p>
                  <p className="mt-1 text-[12px] text-[#64748B]">{c.metric?.label || ''}</p>
                </div>

                <div className="mt-7 space-y-5">
                  {[
                    [t.caseChallenge, c.challenge, '#64748B'],
                    [t.caseSolution,  c.solution,  '#64748B'],
                    [t.caseImpact,    c.impact,    '#1E40AF'],
                  ].map(([label, text, color]) => (
                    <div key={label}>
                      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#94A3B8]">
                        {label}
                      </p>
                      <p className="text-[13px] leading-relaxed" style={{ color }}>{text}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ════ ABOUT ═════════════════════════════════════════════════════════════ */}
      <section id="about" className="border-t border-white/[0.06] py-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="reveal grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="label">{t.eyebrowAbout}</p>
              <p className="mt-4 text-[13px] text-[#334155]">{t.aboutLead}</p>
              <h2 className="mt-2 text-[36px] font-semibold tracking-tight text-white sm:text-[42px]">
                {t.founderRole}
              </h2>
              <p className="mt-6 text-[15px] leading-relaxed text-[#64748B]">{t.aboutBody}</p>
              <a href="#contact" className="btn-primary mt-10">{t.heroPrimaryCta}</a>
            </div>

            {/* Architecture panel */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0F1318] p-8">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#334155]">
                  {t.archCaption}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 glow-green" />
                  <span className="text-[10px] text-[#334155]">{t.archActive}</span>
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { layer: t.archLayer1Title, stack: t.archLayer1Stack },
                  { layer: t.archLayer2Title, stack: t.archLayer2Stack },
                  { layer: t.archLayer3Title, stack: t.archLayer3Stack },
                  { layer: t.archLayer4Title, stack: t.archLayer4Stack },
                  { layer: t.archLayer5Title, stack: t.archLayer5Stack },
                ].map((row) => (
                  <div
                    key={row.layer}
                    className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3.5 transition hover:border-white/[0.09]"
                  >
                    <span className="text-[13px] font-medium text-[#CBD5E1]">{row.layer}</span>
                    <span className="text-right text-[11px] text-[#334155]">{row.stack}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[11px] text-[#2563EB]/60">{t.archOperational}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════ CONTACT ═══════════════════════════════════════════════════════════ */}
      <section id="contact" className="border-t border-white/[0.06] py-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="reveal grid gap-16 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="label">{t.eyebrowContact}</p>
              <h2 className="section-heading">{t.finalTitle}</h2>
              <p className="mt-5 text-[15px] leading-relaxed text-[#64748B]">{t.finalLead}</p>

              <div className="mt-10 space-y-4">
                {[
                  { abbr: 'TG', href: 'https://t.me/temoweb',         label: t.contactTelegram },
                  { abbr: 'WA', href: 'https://wa.me/380960494917',   label: t.contactWhatsapp },
                  { abbr: 'EM', href: 'mailto:info@temoweb.eu',       label: t.contactEmail },
                ].map((c) => (
                  <a
                    key={c.abbr}
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 text-[14px] text-[#64748B] transition-colors duration-200 hover:text-white"
                  >
                    <span className="w-7 font-mono text-[11px] text-[#2563EB]">{c.abbr}</span>
                    {c.label}
                  </a>
                ))}
              </div>
            </div>

            <LeadForm t={t} lang={lang} selectedIndustry={selectedIndustry} />
          </div>
        </div>
      </section>

      {/* ════ FOOTER ════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.06] py-12">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-semibold text-white">TemoWeb</p>
              <p className="mt-1.5 max-w-xs text-[12px] text-[#334155]">{t.footerTagline}</p>
              <p className="mt-1 text-[12px] italic text-[#1d4ed8]/60">{t.footerMicro}</p>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-[12px] text-[#334155]">
              <a href="/privacy"       className="transition hover:text-[#64748B]">{t.legalPrivacy}</a>
              <a href="/terms"         className="transition hover:text-[#64748B]">{t.legalTerms}</a>
              <a href="/data-deletion" className="transition hover:text-[#64748B]">{t.legalDeletion}</a>
              <span>© {new Date().getFullYear()} TemoWeb. {t.rights}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to top */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.1] bg-[#0F1318] text-[13px] text-[#64748B] transition-all duration-200 hover:border-white/25 hover:text-white"
          aria-label={t.topAria}
        >
          ↑
        </button>
      )}
    </div>
  )
}
