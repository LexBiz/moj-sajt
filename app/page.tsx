'use client'

import { useEffect, useRef, useState } from 'react'
import { translations, type Lang } from './translations'
import { PortfolioCarousel } from './components/PortfolioCarousel'

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
  durationMs = 1800,
  decimals = 0,
}: {
  to: number
  durationMs?: number
  decimals?: number
}) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return
        started.current = true
        let raf = 0
        const start = performance.now()
        const tick = (now: number) => {
          const raw = Math.min((now - start) / durationMs, 1)
          const ease = 1 - Math.pow(1 - raw, 3)
          setValue(to * ease)
          if (raw < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
      },
      { threshold: 0.25 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [to, durationMs])

  return <span ref={ref}>{value.toFixed(decimals)}</span>
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
  type IndustryKey = 'auto' | 'dental' | 'law' | 'mortgage'
  type Priority = 'Low' | 'Medium' | 'High'
  type PaymentState = 'none' | 'pending' | 'paid'
  type DealStage = 'qualification' | 'urgency' | 'offer' | 'commitment' | 'conversion'
  type Scenario = {
    id: string
    label: string
    client: string
    intent: string
    priority: Priority
    nextStep: string
    bookingConfirmed?: boolean
    bookingTime?: string
    crmProduct?: string
    paymentState?: PaymentState
  }
  type LogItem = { id: string; text: string; time: string }

  const tx = (en: string, ru: string, cz: string) => (lang === 'ru' ? ru : lang === 'ua' ? cz : en)
  const copy = {
    demoLabel: tx(
      'Demo: New lead inquiry -> automated processing',
      'Демо: новая заявка -> автоматическая обработка',
      'Demo: nová poptávka -> automatické zpracování'
    ),
    conversation: tx('Conversation', 'Диалог', 'Konverzace'),
    dashboard: tx('System Dashboard', 'Панель системы', 'Systémový dashboard'),
    timeline: [
      tx('Lead captured', 'Лид получен', 'Lead zachycen'),
      tx('Qualified', 'Квалифицирован', 'Kvalifikováno'),
      tx('Offer made', 'Офер отправлен', 'Nabídka odeslána'),
      tx('Time proposed', 'Время предложено', 'Čas nabídnut'),
      tx('Time confirmed', 'Время подтверждено', 'Čas potvrzen'),
      tx('Payment requested', 'Запрос оплаты', 'Vyžádána platba'),
      tx('Payment received', 'Оплата получена', 'Platba přijata'),
      tx('Confirmed', 'Подтверждено', 'Potvrzeno'),
      tx('Manager notified', 'Менеджер уведомлен', 'Manager upozorněn'),
    ],
    bookingConfirmed: tx('Confirmed', 'Подтверждено', 'Potvrzeno'),
    industryLabel: tx('Industry', 'Ниша', 'Obor'),
    leadIntent: tx('Lead intent', 'Интент лида', 'Záměr leadu'),
    priority: tx('Priority', 'Приоритет', 'Priorita'),
    nextStep: tx('Next step', 'Следующий шаг', 'Další krok'),
    responseTime: tx('Response time', 'Время ответа', 'Doba odezvy'),
    bookingTime: tx('Time / delivery', 'Время / доставка', 'Čas / doručení'),
    crmProduct: tx('Offer item', 'Позиция офера', 'Položka nabídky'),
    payment: tx('Payment', 'Оплата', 'Platba'),
    paymentNone: tx('Not started', 'Не начата', 'Nezahájeno'),
    paymentPending: tx('Payment link sent', 'Ссылка на оплату отправлена', 'Platební odkaz odeslán'),
    paymentPaid: tx('Paid', 'Оплачено', 'Zaplaceno'),
    paymentProcessing: tx('Processing...', 'Обработка...', 'Zpracování...'),
    responseTypical: tx('10-35s typical', '10-35с обычно', '10-35s obvykle'),
    statusTimeline: tx('Status timeline', 'Таймлайн статуса', 'Časová osa statusu'),
    systemLog: tx('System log', 'Лог системы', 'Systémový log'),
    scenarioTitle: tx('Choose client path', 'Выберите путь клиента', 'Vyberte scénář klienta'),
    scenarioTitleAdvanced: tx('Continue the deal flow', 'Продолжить путь сделки', 'Pokračovat v průběhu obchodu'),
    tryAnother: tx('Try another scenario', 'Попробовать другой сценарий', 'Zkusit jiný scénář'),
    callback: tx('Callback', 'Обратный звонок', 'Zpětný hovor'),
    bookingLink: tx('Booking link', 'Ссылка на запись', 'Odkaz na rezervaci'),
    quoteRequired: tx('Quote required', 'Нужен расчет', 'Potřeba cenové nabídky'),
    interactionLocked: '',
    initialIntent: tx('Inbound inquiry', 'Входящая заявка', 'Příchozí poptávka'),
    logWebhook: tx('Webhook received', 'Webhook получен', 'Webhook přijat'),
    logCaptured: tx('Lead captured', 'Лид захвачен', 'Lead zachycen'),
    logIntentDetected: tx('Intent detected: inbound inquiry', 'Интент определен: входящая заявка', 'Záměr detekován: příchozí poptávka'),
    logPrioritySet: tx('Priority set: Medium', 'Приоритет установлен: Средний', 'Priorita nastavena: Střední'),
    logSaved: tx('Saved to CRM', 'Сохранено в CRM', 'Uloženo do CRM'),
    logFollowup: tx('Follow-up scheduled', 'Follow-up запланирован', 'Follow-up naplánován'),
    logBooking: tx('Booking step created', 'Шаг записи создан', 'Krok rezervace vytvořen'),
    logNotif: tx('Notification sent', 'Уведомление отправлено', 'Notifikace odeslána'),
    logCrmShown: tx('CRM item shown', 'Товар показан из CRM', 'Položka zobrazena z CRM'),
    logPaymentLink: tx('Payment link generated', 'Ссылка на оплату сформирована', 'Platební odkaz vytvořen'),
    logPaymentDone: tx('Payment confirmed', 'Оплата подтверждена', 'Platba potvrzena'),
    logBookingSlot: tx('Time locked', 'Время зафиксировано', 'Čas zafixován'),
    logClientDetailsPrefix: tx('Client provided details', 'Клиент уточнил детали', 'Klient doplnil detaily'),
    eventCrm: tx('Offer prepared', 'Офер подготовлен', 'Nabídka připravena'),
    eventPaymentPending: tx('Payment link sent', 'Ссылка на оплату отправлена', 'Platební odkaz odeslán'),
    eventPaymentPaid: tx('Payment received', 'Оплата получена', 'Platba přijata'),
    eventBookingLocked: tx('Booking locked in calendar', 'Запись зафиксирована в календаре', 'Rezervace zafixována v kalendáři'),
    eventManagerHandoff: tx('Manager handoff created', 'Создана передача менеджеру', 'Předání managerovi vytvořeno'),
    outcomeTitle: tx('Simulation outcome', 'Результат симуляции', 'Výsledek simulace'),
    outcomeBooking: tx('Booking status', 'Статус записи', 'Stav rezervace'),
    outcomeCrm: tx('CRM status', 'Статус CRM', 'Stav CRM'),
    outcomePayment: tx('Payment status', 'Статус оплаты', 'Stav platby'),
    outcomeDone: tx('Completed', 'Завершено', 'Dokončeno'),
    outcomeInProgress: tx('In progress', 'В процессе', 'Probíhá'),
    outcomeNotStarted: tx('Not started', 'Не начато', 'Nezahájeno'),
    systemEvent: tx('Update', 'Обновление', 'Aktualizace'),
  }

  type DemoNiche = 'auto' | 'beauty' | 'fashion' | 'dental'
  const inferDemoNiche = (v: string): DemoNiche => {
    const s = String(v || '').toLowerCase()
    if (/(auto|авто|autoservis|sto\b|сервис|шиномонтаж|тормоз|масл|oil|brake|garage)/.test(s)) return 'auto'
    if (/(salon|beauty|салон|маник|педик|парикмах|barber|косметолог|бров|ресниц)/.test(s)) return 'beauty'
    if (/(shop|store|ecom|e-commerce|boutique|магазин|одежд|плать|куртк|size|размер|достав|delivery)/.test(s)) return 'fashion'
    if (/(dental|стомат|stomat|зуб|clinic|клиник|врач|доктор|гинеколог|дерматолог|терапевт)/.test(s)) return 'dental'
    // Unknown niche: default to Beauty (most universal booking flow).
    return 'beauty'
  }

  const scenarioMap: Record<IndustryKey, { round1: Scenario[]; round2: Scenario[]; round3: Scenario[]; round4: Scenario[] }> = {
    auto: {
      round1: [
        { id: 'auto-price', label: tx('Client asks price', 'Клиент спрашивает цену', 'Klient se ptá na cenu'), client: tx('How much for brake pads + labor?', 'Сколько за тормозные колодки + работа?', 'Kolik stojí brzdové destičky + práce?'), intent: tx('Price check', 'Проверка цены', 'Kontrola ceny'), priority: 'Medium', nextStep: copy.quoteRequired },
        { id: 'auto-urgent', label: tx('Client urgent', 'Срочный клиент', 'Urgentní klient'), client: tx('Car is not safe, need today.', 'Машина небезопасна, нужно сегодня.', 'Auto není bezpečné, potřebuji dnes.'), intent: tx('Urgent repair', 'Срочный ремонт', 'Urgentní oprava'), priority: 'High', nextStep: copy.callback },
        { id: 'auto-call', label: tx('Client wants call', 'Клиент просит звонок', 'Klient chce hovor'), client: tx('Call me, I am driving now.', 'Позвоните мне, я сейчас за рулем.', 'Zavolejte mi, právě řídím.'), intent: tx('Call request', 'Запрос звонка', 'Požadavek na hovor'), priority: 'High', nextStep: copy.callback },
        { id: 'auto-crm-products', label: tx('Asks available parts', 'Спрашивает наличие деталей', 'Ptá se na dostupné díly'), client: tx('Do you have ATE brake pads for Passat 2018?', 'Есть ли колодки ATE для Passat 2018?', 'Máte destičky ATE pro Passat 2018?'), intent: tx('Parts availability', 'Наличие запчастей', 'Dostupnost dílů'), priority: 'Medium', nextStep: copy.quoteRequired, crmProduct: tx('ATE Brake Pads (in stock)', 'Колодки ATE (в наличии)', 'Destičky ATE (skladem)') },
        { id: 'auto-pay-link', label: tx('Wants to prepay', 'Хочет предоплату', 'Chce zálohovou platbu'), client: tx('Send payment link, I will confirm now.', 'Пришлите ссылку на оплату, подтвержу сейчас.', 'Pošlete platební odkaz, potvrdím hned.'), intent: tx('Prepayment request', 'Запрос предоплаты', 'Požadavek na zálohu'), priority: 'Medium', nextStep: copy.bookingLink, paymentState: 'pending' },
      ],
      round2: [
        { id: 'auto-time', label: tx('Confirms time window', 'Подтверждает время', 'Potvrzuje čas'), client: tx('I can arrive at 17:30. Is that okay?', 'Смогу подъехать в 17:30, подходит?', 'Mohu přijet v 17:30, vyhovuje to?'), intent: tx('Booking confirmation', 'Подтверждение записи', 'Potvrzení rezervace'), priority: 'High', nextStep: copy.bookingLink, bookingConfirmed: true },
        { id: 'auto-docs', label: tx('Asks what to prepare', 'Спрашивает что подготовить', 'Ptá se co připravit'), client: tx('What details should I send before visit?', 'Что нужно отправить до визита?', 'Jaké informace mám poslat před návštěvou?'), intent: tx('Pre-visit prep', 'Подготовка к визиту', 'Příprava před návštěvou'), priority: 'Medium', nextStep: copy.quoteRequired },
        { id: 'auto-quote', label: tx('Requests estimate', 'Просит расчет', 'Žádá odhad'), client: tx('Send me rough estimate before I come.', 'Отправьте примерный расчет до визита.', 'Pošlete mi orientační odhad před návštěvou.'), intent: tx('Estimate request', 'Запрос расчета', 'Požadavek na odhad'), priority: 'Medium', nextStep: copy.quoteRequired },
        { id: 'auto-book-time', label: tx('Chooses exact slot', 'Выбирает точный слот', 'Volí přesný termín'), client: tx('Book me today at 18:10 exactly.', 'Запишите меня сегодня ровно на 18:10.', 'Rezervujte mě dnes přesně na 18:10.'), intent: tx('Exact slot booking', 'Точное время записи', 'Přesná rezervace času'), priority: 'High', nextStep: copy.bookingLink, bookingConfirmed: true, bookingTime: '18:10' },
        { id: 'auto-pay-done', label: tx('Confirms payment sent', 'Подтверждает оплату', 'Potvrzuje platbu'), client: tx('I paid, please confirm appointment.', 'Оплатил, подтвердите запись.', 'Zaplatil jsem, potvrďte rezervaci.'), intent: tx('Payment confirmation', 'Подтверждение оплаты', 'Potvrzení platby'), priority: 'High', nextStep: copy.bookingLink, paymentState: 'paid', bookingConfirmed: true },
      ],
      round3: [
        { id: 'auto-option', label: tx('Wants best option', 'Хочет лучший вариант', 'Chce nejlepší variantu'), client: tx('Show me best option by price/quality.', 'Покажите лучший вариант по цене/качеству.', 'Ukažte nejlepší variantu cena/výkon.'), intent: tx('Option comparison', 'Сравнение вариантов', 'Porovnání variant'), priority: 'Medium', nextStep: copy.quoteRequired, crmProduct: tx('Service bundle: Diagnostics + pads + labor', 'Пакет: диагностика + колодки + работа', 'Balíček: diagnostika + destičky + práce') },
        { id: 'auto-pay-now', label: tx('Ready to pay now', 'Готов оплатить сейчас', 'Připraven zaplatit hned'), client: tx('Okay, send payment link right now.', 'Ок, отправьте ссылку на оплату прямо сейчас.', 'Ok, pošlete odkaz k platbě hned.'), intent: tx('Payment in flow', 'Оплата в диалоге', 'Platba v konverzaci'), priority: 'High', nextStep: copy.bookingLink, paymentState: 'pending' },
        { id: 'auto-checklist', label: tx('Needs checklist', 'Нужен чек-лист', 'Potřebuje checklist'), client: tx('What should I prepare before arrival?', 'Что подготовить перед приездом?', 'Co mám připravit před příjezdem?'), intent: tx('Preparation checklist', 'Чек-лист подготовки', 'Přípravný checklist'), priority: 'Low', nextStep: copy.callback },
      ],
      round4: [
        { id: 'auto-final-slot', label: tx('Fixes final time', 'Фиксирует финальное время', 'Fixuje finální čas'), client: tx('Set final booking to 18:40, confirmed.', 'Фиксируем запись на 18:40, подтверждаю.', 'Potvrzuji rezervaci na 18:40.'), intent: tx('Final booking lock', 'Финальная фиксация записи', 'Finální potvrzení rezervace'), priority: 'High', nextStep: copy.bookingLink, bookingConfirmed: true, bookingTime: '18:40' },
        { id: 'auto-final-paid', label: tx('Payment completed', 'Оплата завершена', 'Platba dokončena'), client: tx('Payment completed, waiting confirmation.', 'Оплата завершена, жду подтверждение.', 'Platba dokončena, čekám na potvrzení.'), intent: tx('Final payment confirmation', 'Финальное подтверждение оплаты', 'Finální potvrzení platby'), priority: 'High', nextStep: copy.bookingLink, paymentState: 'paid', bookingConfirmed: true },
        { id: 'auto-manager', label: tx('Requests manager handoff', 'Просит менеджера', 'Žádá předání managerovi'), client: tx('Connect me with service manager for details.', 'Соедините с сервис-менеджером для деталей.', 'Propojte mě se servisním managerem kvůli detailům.'), intent: tx('Human handoff', 'Передача менеджеру', 'Předání managerovi'), priority: 'Medium', nextStep: copy.callback },
      ],
    },
    dental: {
      round1: [
        { id: 'd-pain', label: tx('Pain scale high', 'Высокая боль', 'Silná bolest'), client: tx('Pain is 8/10, swelling started.', 'Боль 8/10, начался отек.', 'Bolest 8/10, začal otok.'), intent: tx('Emergency dental pain', 'Экстренная боль', 'Akutní bolest'), priority: 'High', nextStep: copy.callback },
        { id: 'd-price', label: tx('Asks insurance/price', 'Спрашивает страховку/цену', 'Ptá se na pojištění/cenu'), client: tx('Do you accept insurance and what is first visit price?', 'Принимаете страховку и сколько стоит первый визит?', 'Přijímáte pojištění a kolik stojí první návštěva?'), intent: tx('Insurance + pricing', 'Страховка и цена', 'Pojištění a cena'), priority: 'Medium', nextStep: copy.quoteRequired },
        { id: 'd-slot', label: tx('Needs earliest slot', 'Нужен ближайший слот', 'Potřebuje nejbližší termín'), client: tx('I need earliest slot today.', 'Нужен самый ранний слот сегодня.', 'Potřebuji nejbližší termín dnes.'), intent: tx('Urgent booking', 'Срочная запись', 'Urgentní rezervace'), priority: 'High', nextStep: copy.bookingLink },
        { id: 'd-crm-service', label: tx('Asks treatment options', 'Спрашивает варианты лечения', 'Ptá se na možnosti léčby'), client: tx('What treatment options do you have for this pain?', 'Какие у вас варианты лечения для такой боли?', 'Jaké máte možnosti ošetření pro tuto bolest?'), intent: tx('Treatment options', 'Варианты лечения', 'Možnosti ošetření'), priority: 'Medium', nextStep: copy.quoteRequired, crmProduct: tx('Urgent exam + X-ray package', 'Пакет: экстренный осмотр + снимок', 'Balíček: urgentní vyšetření + RTG') },
        { id: 'd-pay-link', label: tx('Requests deposit link', 'Просит ссылку на депозит', 'Žádá odkaz na zálohu'), client: tx('Can I pay deposit now to secure slot?', 'Можно сразу внести депозит, чтобы зафиксировать слот?', 'Mohu zaplatit zálohu hned pro potvrzení termínu?'), intent: tx('Deposit request', 'Запрос депозита', 'Požadavek na zálohu'), priority: 'Medium', nextStep: copy.bookingLink, paymentState: 'pending' },
      ],
      round2: [
        { id: 'd-book', label: tx('Confirms booking today', 'Подтверждает запись сегодня', 'Potvrzuje rezervaci dnes'), client: tx('Book me today after 18:00.', 'Запишите меня сегодня после 18:00.', 'Rezervujte mě dnes po 18:00.'), intent: tx('Slot confirmation', 'Подтверждение слота', 'Potvrzení termínu'), priority: 'High', nextStep: copy.bookingLink, bookingConfirmed: true },
        { id: 'd-docs', label: tx('Shares medical context', 'Дает мед. контекст', 'Sdílí zdravotní kontext'), client: tx('I have X-ray and medication list ready.', 'У меня готов снимок и список лекарств.', 'Mám připravený snímek a seznam léků.'), intent: tx('Medical context', 'Медицинский контекст', 'Zdravotní kontext'), priority: 'Medium', nextStep: copy.callback },
        { id: 'd-call', label: tx('Requests call first', 'Просит сначала звонок', 'Žádá nejdřív hovor'), client: tx('Please call me before booking.', 'Сначала позвоните, потом запись.', 'Nejdřív mi zavolejte, pak rezervace.'), intent: tx('Pre-booking call', 'Звонок до записи', 'Hovor před rezervací'), priority: 'Medium', nextStep: copy.callback },
        { id: 'd-time', label: tx('Locks exact time', 'Фиксирует точное время', 'Fixuje přesný čas'), client: tx('Set me for 19:20 today.', 'Поставьте меня на 19:20 сегодня.', 'Dejte mě dnes na 19:20.'), intent: tx('Exact booking time', 'Точное время записи', 'Přesný čas rezervace'), priority: 'High', nextStep: copy.bookingLink, bookingConfirmed: true, bookingTime: '19:20' },
        { id: 'd-paid', label: tx('Confirms payment done', 'Подтверждает оплату', 'Potvrzuje úhradu'), client: tx('Deposit paid, waiting confirmation.', 'Депозит оплачен, жду подтверждение.', 'Záloha zaplacena, čekám na potvrzení.'), intent: tx('Payment confirmation', 'Подтверждение оплаты', 'Potvrzení platby'), priority: 'High', nextStep: copy.bookingLink, paymentState: 'paid', bookingConfirmed: true },
      ],
      round3: [
        { id: 'd-plan', label: tx('Asks treatment plan', 'Просит план лечения', 'Žádá plán ošetření'), client: tx('Can you give me options and full plan?', 'Можете дать варианты и полный план?', 'Můžete dát varianty a celý plán?'), intent: tx('Treatment plan request', 'Запрос плана лечения', 'Požadavek na plán ošetření'), priority: 'Medium', nextStep: copy.quoteRequired, crmProduct: tx('Plan: exam + imaging + treatment phases', 'План: осмотр + диагностика + этапы лечения', 'Plán: vyšetření + diagnostika + fáze léčby') },
        { id: 'd-pay-link-2', label: tx('Wants secure payment', 'Хочет безопасную оплату', 'Chce bezpečnou platbu'), client: tx('Send secure payment link for reservation.', 'Пришлите безопасную ссылку для оплаты брони.', 'Pošlete bezpečný odkaz pro platbu rezervace.'), intent: tx('Secure payment request', 'Запрос безопасной оплаты', 'Požadavek na bezpečnou platbu'), priority: 'High', nextStep: copy.bookingLink, paymentState: 'pending' },
        { id: 'd-support', label: tx('Needs reassurance', 'Нужна поддержка', 'Potřebuje ujištění'), client: tx('I am anxious, explain what happens step by step.', 'Я переживаю, объясните по шагам, что будет.', 'Mám obavy, vysvětlete prosím postup krok za krokem.'), intent: tx('Patient reassurance', 'Поддержка пациента', 'Podpora pacienta'), priority: 'Medium', nextStep: copy.callback },
      ],
      round4: [
        { id: 'd-final-time', label: tx('Finalizes appointment', 'Финализирует запись', 'Finalizuje termín'), client: tx('Confirm slot today at 19:40.', 'Подтвердите слот сегодня на 19:40.', 'Potvrďte termín dnes v 19:40.'), intent: tx('Final slot confirmation', 'Финальное подтверждение слота', 'Finální potvrzení termínu'), priority: 'High', nextStep: copy.bookingLink, bookingConfirmed: true, bookingTime: '19:40' },
        { id: 'd-final-paid', label: tx('Sends payment proof', 'Отправляет оплату', 'Posílá potvrzení platby'), client: tx('Payment done, attached proof.', 'Оплата сделана, приложил подтверждение.', 'Platba hotová, posílám potvrzení.'), intent: tx('Payment proof received', 'Получено подтверждение оплаты', 'Potvrzení platby přijato'), priority: 'High', nextStep: copy.bookingLink, paymentState: 'paid', bookingConfirmed: true },
        { id: 'd-handoff', label: tx('Asks clinic coordinator', 'Просит координатора', 'Žádá koordinátora'), client: tx('Please connect me with clinic coordinator.', 'Соедините меня с координатором клиники.', 'Prosím propojte mě s koordinátorem kliniky.'), intent: tx('Coordinator handoff', 'Передача координатору', 'Předání koordinátorovi'), priority: 'Medium', nextStep: copy.callback },
      ],
    },
    law: {
      round1: [
        { id: 'l-price', label: tx('Asks cost', 'Спрашивает стоимость', 'Ptá se na cenu'), client: tx('How do you price contract dispute support?', 'Как у вас формируется цена по договорному спору?', 'Jak účtujete podporu při smluvním sporu?'), intent: tx('Legal pricing', 'Юр. ценообразование', 'Právní nacenění'), priority: 'Medium', nextStep: copy.quoteRequired },
        { id: 'l-urgent', label: tx('Needs urgent today', 'Нужно срочно сегодня', 'Potřebuje urgentně dnes'), client: tx('Court deadline is close, need support today.', 'Суд скоро, нужна помощь уже сегодня.', 'Termín soudu se blíží, potřebuji pomoc dnes.'), intent: tx('Urgent legal support', 'Срочная юр. помощь', 'Urgentní právní podpora'), priority: 'High', nextStep: copy.callback },
        { id: 'l-online', label: tx('Wants online consultation', 'Хочет онлайн консультацию', 'Chce online konzultaci'), client: tx('Can we do online consultation tomorrow?', 'Можно онлайн консультацию на завтра?', 'Můžeme online konzultaci zítra?'), intent: tx('Online consult request', 'Запрос онлайн консультации', 'Požadavek na online konzultaci'), priority: 'Medium', nextStep: copy.bookingLink },
        { id: 'l-crm-offer', label: tx('Asks service package', 'Спрашивает пакет услуг', 'Ptá se na balíček služeb'), client: tx('Which package covers contract review + court prep?', 'Какой пакет включает проверку договора и подготовку к суду?', 'Který balíček pokrývá revizi smlouvy a přípravu k soudu?'), intent: tx('Service package match', 'Подбор юр. пакета', 'Výběr balíčku služeb'), priority: 'Medium', nextStep: copy.quoteRequired, crmProduct: tx('Legal package: Review + Hearing prep', 'Пакет: проверка + подготовка к заседанию', 'Balíček: revize + příprava na jednání') },
        { id: 'l-pay-link', label: tx('Requests invoice link', 'Просит ссылку на оплату', 'Žádá odkaz k úhradě'), client: tx('Send payment link for first consultation.', 'Пришлите ссылку на оплату первой консультации.', 'Pošlete odkaz k platbě první konzultace.'), intent: tx('Consultation payment', 'Оплата консультации', 'Platba konzultace'), priority: 'Medium', nextStep: copy.bookingLink, paymentState: 'pending' },
      ],
      round2: [
        { id: 'l-docs', label: tx('Shares docs ready', 'Говорит что документы готовы', 'Říká, že dokumenty jsou připravené'), client: tx('I can send contract and invoices now.', 'Могу сразу отправить договор и счета.', 'Mohu hned poslat smlouvu a faktury.'), intent: tx('Document review', 'Проверка документов', 'Kontrola dokumentů'), priority: 'High', nextStep: copy.callback },
        { id: 'l-book', label: tx('Confirms consult slot', 'Подтверждает слот консультации', 'Potvrzuje konzultační termín'), client: tx('Book me for 11:00 tomorrow.', 'Запишите меня на завтра в 11:00.', 'Rezervujte mě na zítra 11:00.'), intent: tx('Consult slot confirmation', 'Подтверждение консультации', 'Potvrzení konzultace'), priority: 'Medium', nextStep: copy.bookingLink, bookingConfirmed: true },
        { id: 'l-quote', label: tx('Requests fixed quote', 'Просит фиксированную смету', 'Žádá fixní nabídku'), client: tx('Send fixed quote for phase one.', 'Отправьте фикс по первому этапу.', 'Pošlete fixní nabídku pro první fázi.'), intent: tx('Fixed quote request', 'Запрос фиксированной сметы', 'Požadavek na fixní nabídku'), priority: 'Medium', nextStep: copy.quoteRequired },
        { id: 'l-time', label: tx('Sets consult time', 'Назначает время консультации', 'Nastavuje čas konzultace'), client: tx('Book tomorrow 10:30 online.', 'Назначьте завтра 10:30 онлайн.', 'Rezervujte zítra 10:30 online.'), intent: tx('Consult time booking', 'Назначение времени консультации', 'Rezervace času konzultace'), priority: 'High', nextStep: copy.bookingLink, bookingConfirmed: true, bookingTime: '10:30' },
        { id: 'l-paid', label: tx('Confirms retainer paid', 'Подтверждает оплату', 'Potvrzuje úhradu'), client: tx('Retainer paid. Please confirm start.', 'Оплата внесена. Подтвердите старт.', 'Retainer zaplacen. Potvrďte start.'), intent: tx('Retainer confirmation', 'Подтверждение оплаты', 'Potvrzení platby'), priority: 'High', nextStep: copy.bookingLink, paymentState: 'paid', bookingConfirmed: true },
      ],
      round3: [
        { id: 'l-strategy', label: tx('Asks strategy options', 'Просит варианты стратегии', 'Žádá strategické varianty'), client: tx('Give me 2 strategy options with risks.', 'Дайте 2 варианта стратегии с рисками.', 'Dejte mi 2 strategie s riziky.'), intent: tx('Strategy comparison', 'Сравнение стратегии', 'Porovnání strategie'), priority: 'High', nextStep: copy.quoteRequired, crmProduct: tx('Legal strategy plan: defensive vs aggressive', 'План стратегии: защитная vs активная', 'Právní plán: defenzivní vs aktivní') },
        { id: 'l-pay-secure', label: tx('Wants secure payment link', 'Нужна защищенная оплата', 'Potřebuje bezpečnou platbu'), client: tx('Send secure payment link for phase one.', 'Пришлите защищенную ссылку на оплату первого этапа.', 'Pošlete bezpečný odkaz k úhradě první fáze.'), intent: tx('Phase payment request', 'Запрос оплаты этапа', 'Požadavek na platbu fáze'), priority: 'High', nextStep: copy.bookingLink, paymentState: 'pending' },
        { id: 'l-plain', label: tx('Needs plain explanation', 'Нужно объяснить простыми словами', 'Potřebuje jednoduché vysvětlení'), client: tx('Explain next legal step in plain language.', 'Объясните следующий шаг простыми словами.', 'Vysvětlete další právní krok jednoduše.'), intent: tx('Plain-language support', 'Поддержка простым языком', 'Podpora jednoduchým jazykem'), priority: 'Medium', nextStep: copy.callback },
      ],
      round4: [
        { id: 'l-final-time', label: tx('Locks consultation time', 'Фиксирует время консультации', 'Fixuje čas konzultace'), client: tx('Confirm consultation at 10:50 tomorrow.', 'Подтвердите консультацию завтра в 10:50.', 'Potvrďte konzultaci zítra v 10:50.'), intent: tx('Final consultation booking', 'Финальная запись на консультацию', 'Finální rezervace konzultace'), priority: 'High', nextStep: copy.bookingLink, bookingConfirmed: true, bookingTime: '10:50' },
        { id: 'l-final-paid', label: tx('Payment completed', 'Оплата завершена', 'Platba dokončena'), client: tx('Payment completed, waiting start confirmation.', 'Оплата завершена, жду подтверждение старта.', 'Platba dokončena, čekám na potvrzení startu.'), intent: tx('Start payment confirmation', 'Подтверждение оплаты старта', 'Potvrzení startovní platby'), priority: 'High', nextStep: copy.bookingLink, paymentState: 'paid', bookingConfirmed: true },
        { id: 'l-final-handoff', label: tx('Asks senior lawyer', 'Просит старшего юриста', 'Žádá seniorního právníka'), client: tx('Please handoff to senior lawyer for final review.', 'Передайте старшему юристу на финальную проверку.', 'Předejte prosím seniornímu právníkovi k finální revizi.'), intent: tx('Senior handoff', 'Передача старшему юристу', 'Předání seniornímu právníkovi'), priority: 'Medium', nextStep: copy.callback },
      ],
    },
    mortgage: {
      round1: [
        { id: 'm-docs', label: tx('Foreigner documents', 'Документы для иностранца', 'Dokumenty pro cizince'), client: tx('I am a foreigner, what documents are required?', 'Я иностранец, какие документы нужны?', 'Jsem cizinec, jaké dokumenty jsou potřeba?'), intent: tx('Document requirements', 'Требования к документам', 'Požadavky na dokumenty'), priority: 'Medium', nextStep: copy.callback },
        { id: 'm-rate', label: tx('Rate and payment', 'Ставка и платеж', 'Sazba a splátka'), client: tx('What monthly payment with 20% down payment?', 'Какой ежемесячный платеж при 20% первом взносе?', 'Jaká měsíční splátka při 20% akontaci?'), intent: tx('Rate/payment estimate', 'Оценка ставки/платежа', 'Odhad sazby/splátky'), priority: 'Medium', nextStep: copy.quoteRequired },
        { id: 'm-call', label: tx('Wants callback', 'Просит звонок', 'Chce zpětný hovor'), client: tx('Please call me after 17:00.', 'Позвоните после 17:00.', 'Zavolejte mi po 17:00.'), intent: tx('Callback request', 'Запрос звонка', 'Požadavek na hovor'), priority: 'Medium', nextStep: copy.callback },
        { id: 'm-crm-product', label: tx('Asks loan product', 'Спрашивает ипотечный продукт', 'Ptá se na hypoteční produkt'), client: tx('Show me products for foreigners with 20% down payment.', 'Покажите продукты для иностранцев с 20% взносом.', 'Ukažte produkty pro cizince s 20% akontací.'), intent: tx('Loan product lookup', 'Подбор ипотечного продукта', 'Vyhledání hypotečního produktu'), priority: 'Medium', nextStep: copy.quoteRequired, crmProduct: tx('Mortgage product: Flex EU 20%', 'Ипотека: Flex EU 20%', 'Hypotéka: Flex EU 20%') },
        { id: 'm-fee-pay', label: tx('Requests booking fee link', 'Просит ссылку на бронь', 'Žádá odkaz na rezervační poplatek'), client: tx('Can I pay booking fee now?', 'Можно сейчас оплатить бронь?', 'Mohu zaplatit rezervační poplatek hned?'), intent: tx('Booking fee payment', 'Оплата брони', 'Platba rezervace'), priority: 'Medium', nextStep: copy.bookingLink, paymentState: 'pending' },
      ],
      round2: [
        { id: 'm-book', label: tx('Confirms consult', 'Подтверждает консультацию', 'Potvrzuje konzultaci'), client: tx('Book consultation this week.', 'Запишите меня на консультацию на этой неделе.', 'Rezervujte konzultaci tento týden.'), intent: tx('Consult booking', 'Запись на консультацию', 'Rezervace konzultace'), priority: 'Medium', nextStep: copy.bookingLink, bookingConfirmed: true },
        { id: 'm-budget', label: tx('Shares budget', 'Озвучивает бюджет', 'Sdílí rozpočet'), client: tx('Budget is 280k EUR, estimate options please.', 'Бюджет 280k EUR, оцените варианты.', 'Rozpočet je 280k EUR, odhadněte možnosti.'), intent: tx('Budget qualification', 'Квалификация по бюджету', 'Kvalifikace rozpočtu'), priority: 'Medium', nextStep: copy.quoteRequired },
        { id: 'm-time', label: tx('Asks timeline', 'Спрашивает сроки', 'Ptá se na termín'), client: tx('How fast can we complete approval?', 'Как быстро можно пройти одобрение?', 'Jak rychle lze dokončit schválení?'), intent: tx('Timeline qualification', 'Квалификация по срокам', 'Kvalifikace termínu'), priority: 'Low', nextStep: copy.callback },
        { id: 'm-slot', label: tx('Locks callback slot', 'Фиксирует слот звонка', 'Fixuje slot hovoru'), client: tx('Set callback for tomorrow at 12:40.', 'Поставьте звонок на завтра 12:40.', 'Nastavte hovor na zítra 12:40.'), intent: tx('Callback slot booking', 'Бронирование времени звонка', 'Rezervace času hovoru'), priority: 'Medium', nextStep: copy.callback, bookingTime: '12:40', bookingConfirmed: true },
        { id: 'm-paid', label: tx('Confirms fee paid', 'Подтверждает оплату', 'Potvrzuje úhradu'), client: tx('Fee paid, waiting final confirmation.', 'Оплата внесена, жду подтверждение.', 'Poplatek zaplacen, čekám na potvrzení.'), intent: tx('Payment confirmation', 'Подтверждение оплаты', 'Potvrzení platby'), priority: 'Medium', nextStep: copy.bookingLink, paymentState: 'paid', bookingConfirmed: true },
      ],
      round3: [
        { id: 'm-options', label: tx('Asks loan options', 'Просит варианты ипотеки', 'Žádá varianty hypotéky'), client: tx('Show me 2 loan options with monthly payment.', 'Покажите 2 варианта ипотеки с платежом.', 'Ukažte 2 varianty hypotéky s měsíční splátkou.'), intent: tx('Loan options comparison', 'Сравнение ипотечных опций', 'Porovnání hypotečních variant'), priority: 'Medium', nextStep: copy.quoteRequired, crmProduct: tx('Options: Fix 3Y vs Fix 5Y', 'Опции: Fix 3Y vs Fix 5Y', 'Varianty: Fix 3Y vs Fix 5Y') },
        { id: 'm-pay-link-2', label: tx('Wants payment link', 'Хочет ссылку на оплату', 'Chce platební odkaz'), client: tx('Send booking fee payment link now.', 'Пришлите ссылку на оплату брони сейчас.', 'Pošlete odkaz na platbu rezervace hned.'), intent: tx('Booking payment flow', 'Оплата брони в потоке', 'Platba rezervace v průběhu'), priority: 'High', nextStep: copy.bookingLink, paymentState: 'pending' },
        { id: 'm-explain', label: tx('Needs simple explanation', 'Нужно простое объяснение', 'Potřebuje jednoduché vysvětlení'), client: tx('Explain process in simple steps, please.', 'Объясните процесс простыми шагами, пожалуйста.', 'Vysvětlete proces jednoduše, prosím.'), intent: tx('Guided explanation', 'Пошаговое объяснение', 'Vysvětlení krok za krokem'), priority: 'Low', nextStep: copy.callback },
      ],
      round4: [
        { id: 'm-final-time', label: tx('Finalizes consult slot', 'Финализирует слот консультации', 'Finalizuje termín konzultace'), client: tx('Confirm consultation tomorrow at 12:55.', 'Подтвердите консультацию завтра в 12:55.', 'Potvrďte konzultaci zítra ve 12:55.'), intent: tx('Final consult slot', 'Финальный слот консультации', 'Finální termín konzultace'), priority: 'Medium', nextStep: copy.callback, bookingConfirmed: true, bookingTime: '12:55' },
        { id: 'm-final-paid', label: tx('Payment completed', 'Оплата завершена', 'Platba dokončena'), client: tx('Fee paid, confirm with advisor please.', 'Оплатил, подтвердите с консультантом.', 'Poplatek zaplacen, potvrďte s poradcem prosím.'), intent: tx('Advisor payment confirmation', 'Подтверждение оплаты консультантом', 'Potvrzení platby poradcem'), priority: 'Medium', nextStep: copy.bookingLink, paymentState: 'paid', bookingConfirmed: true },
        { id: 'm-handoff', label: tx('Asks advisor handoff', 'Просит передачу консультанту', 'Žádá předání poradci'), client: tx('Please handoff to mortgage advisor now.', 'Передайте ипотечному консультанту сейчас.', 'Předejte mě hypotečnímu poradci hned.'), intent: tx('Advisor handoff', 'Передача консультанту', 'Předání poradci'), priority: 'Medium', nextStep: copy.callback },
      ],
    },
  }

  void scenarioMap
  const [industry, setIndustry] = useState('')
  const [messages, setMessages] = useState<DemoMsg[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [started, setStarted] = useState(false)
  const [activePreset, setActivePreset] = useState('')
  const MAX_AI_REPLIES = 8
  const [aiReplies, setAiReplies] = useState(0)
  const [conversationStage, setConversationStage] = useState<DealStage>('qualification')
  const [statusIndex, setStatusIndex] = useState(0)
  const [leadIntent, setLeadIntent] = useState(copy.initialIntent)
  const [priority, setPriority] = useState<Priority>('Medium')
  const [nextStep, setNextStep] = useState(copy.callback)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [bookingTime, setBookingTime] = useState('-')
  const [crmProduct, setCrmProduct] = useState('-')
  const [paymentState, setPaymentState] = useState<PaymentState>('none')
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [responseTimeValue, setResponseTimeValue] = useState(copy.responseTypical)
  const [logItems, setLogItems] = useState<LogItem[]>([])
  const [demoNiche, setDemoNiche] = useState<DemoNiche>('auto')
  const demoBoxRef = useRef<HTMLDivElement | null>(null)
  const logTimings = [0.2, 0.5, 0.8, 1.1, 1.5, 1.9, 2.3, 2.8]

  const appendLog = (text: string) => {
    setLogItems((prev) => {
      const tIdx = Math.min(prev.length, logTimings.length - 1)
      return [...prev, { id: `${Date.now()}-${prev.length}`, text, time: `+${logTimings[tIdx].toFixed(1)}s` }]
    })
  }
  const resetStateOnly = () => {
    setMessages([])
    setStarted(false)
    setError('')
    setAiReplies(0)
    setConversationStage('qualification')
    setStatusIndex(0)
    setLeadIntent(copy.initialIntent)
    setPriority('Medium')
    setNextStep(copy.callback)
    setBookingConfirmed(false)
    setBookingTime('-')
    setCrmProduct('-')
    setPaymentState('none')
    setPaymentProcessing(false)
    setPlaying(false)
    setResponseTimeValue(copy.responseTypical)
    setLogItems([])
  }

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const transitionDelay = () => 800 + Math.round(Math.random() * 400)
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
  const channels2 = () => {
    const ch = [
      tx('WhatsApp or email', 'WhatsApp или email', 'WhatsApp nebo e‑mail'),
      tx('Telegram or email', 'Telegram или email', 'Telegram nebo e‑mail'),
      tx('WhatsApp or SMS', 'WhatsApp или SMS', 'WhatsApp nebo SMS'),
    ]
    return pick(ch)
  }
  const slotsFor = (niche: DemoNiche): [string, string] => {
    if (niche === 'fashion')
      return [
        tx('Courier delivery (1–2 days)', 'Курьер (1–2 дня)', 'Kurýr (1–2 dny)'),
        tx('Pickup point (2–4 days)', 'Пункт выдачи (2–4 дня)', 'Výdejní místo (2–4 dny)'),
      ]
    if (niche === 'auto') return ['16:30', '17:10']
    if (niche === 'dental') return ['17:40', '18:20']
    return ['12:40', '17:20'] // beauty
  }

  const playNicheFlow = async (cleaned: string, niche: DemoNiche) => {
    if (playing) return
    setPlaying(true)
    setDemoNiche(niche)
    resetStateOnly()
    setStarted(true)

    const [a, b] = slotsFor(niche)
    const ack = () =>
      pick([
        tx('Got it.', 'Понял.', 'Rozumím.'),
        tx('Understood.', 'Принял.', 'Chápu.'),
        tx('Sure.', 'Ок.', 'Jasně.'),
      ])

    const offerItem =
      niche === 'fashion'
        ? tx('Offer: delivery + payment', 'Офер: доставка + оплата', 'Nabídka: doprava + platba')
        : niche === 'auto'
          ? tx('Offer: diagnostics + booking', 'Офер: диагностика + запись', 'Nabídka: diagnostika + rezervace')
          : niche === 'dental'
            ? tx('Offer: urgent visit + confirmation', 'Офер: срочный приём + подтверждение', 'Nabídka: urgentní návštěva + potvrzení')
            : tx('Offer: booking + reminder', 'Офер: запись + напоминание', 'Nabídka: rezervace + připomínka')
    setCrmProduct(offerItem)

    const variantsByNiche: Record<DemoNiche, Array<'default' | 'alt'>> = {
      auto: ['default', 'alt'],
      beauty: ['default', 'alt'],
      fashion: ['default', 'alt'],
      dental: ['default', 'alt'],
    }
    const variant = pick(variantsByNiche[niche])

    const seedClientByNiche: Record<DemoNiche, Record<'default' | 'alt', string[]>> = {
      auto: {
        default: [
          tx('My brakes squeak. Can I come today?', 'Скрипят тормоза. Можно сегодня?', 'Pískají brzdy. Můžu dnes přijet?'),
          tx('Need quick diagnostics today if possible.', 'Нужна быстрая диагностика сегодня, если можно.', 'Potřebuji rychlou diagnostiku dnes, pokud to jde.'),
        ],
        alt: [
          tx('Do you have ATE brake pads for Passat 2018?', 'Есть ли колодки ATE для Passat 2018?', 'Máte destičky ATE pro Passat 2018?'),
          tx('Check availability and book me if you can.', 'Проверьте наличие и запишите, если можно.', 'Prověřte dostupnost a objednejte mě, pokud to jde.'),
        ],
      },
      beauty: {
        default: [
          tx('I want manicure + gel. Do you have a slot today?', 'Хочу маникюр с покрытием. Есть время сегодня?', 'Chci manikúru s gelem. Máte dnes termín?'),
          tx('I need hair styling this week. When can I come?', 'Нужна укладка на этой неделе. Когда можно?', 'Potřebuji styling tento týden. Kdy můžu přijít?'),
        ],
        alt: [
          tx('Need manicure + brows this week. Can you fit me in?', 'Нужен маникюр + брови на неделе. Есть окна?', 'Potřebuji manikúru + obočí tento týden. Máte termíny?'),
          tx('I want a specific master if possible.', 'Хочу к конкретному мастеру, если можно.', 'Chci ideálně konkrétního mistra.'),
        ],
      },
      fashion: {
        default: [
          tx('I want to order with delivery.', 'Хочу оформить заказ с доставкой.', 'Chci objednat s doručením.'),
          tx('Do you have this item in size M? I want delivery.', 'Есть в размере M? Хочу доставку.', 'Máte to ve velikosti M? Chci doručení.'),
        ],
        alt: [
          tx('I want a return/exchange-safe order. Delivery please.', 'Хочу заказ с возможностью обмена/возврата. Доставка.', 'Chci objednávku s možností výměny/vrácení. Doručení.'),
          tx('Is size S available? If not, suggest an alternative.', 'Есть размер S? Если нет — предложите альтернативу.', 'Je velikost S? Když ne, navrhněte alternativu.'),
        ],
      },
      dental: {
        default: [
          tx('Tooth pain. Can I get the earliest slot today?', 'Болит зуб. Нужен ближайший слот сегодня.', 'Bolí mě zub. Potřebuji nejbližší termín dnes.'),
          tx('My gum is swollen, need urgent visit.', 'Отёк десны, нужен срочный приём.', 'Mám otok dásně, potřebuji urgentně.'),
        ],
        alt: [
          tx('Do you accept insurance? I need a consultation.', 'Вы работаете со страховкой? Нужна консультация.', 'Berete pojištění? Potřebuji konzultaci.'),
          tx('I need price range and the earliest time.', 'Нужна вилка по цене и ближайшее время.', 'Chci cenové rozpětí a nejbližší termín.'),
        ],
      },
    }

    setMessages([{ role: 'client', content: pick(seedClientByNiche[niche][variant]) }])
    appendLog(copy.logWebhook)
    appendLog(copy.logCaptured)
    setStatusIndex(0)
    setLeadIntent(
      niche === 'fashion'
        ? tx('Order + delivery', 'Заказ + доставка', 'Objednávka + doručení')
        : niche === 'auto'
          ? tx('Diagnostics booking', 'Запись на диагностику', 'Rezervace diagnostiky')
          : niche === 'dental'
            ? tx('Urgent appointment', 'Срочный приём', 'Urgentní termín')
            : tx('Service booking', 'Запись на услугу', 'Rezervace služby')
    )
    setPriority(niche === 'dental' ? 'High' : 'Medium')
    setNextStep(copy.quoteRequired)

    await wait(700)
    const ack1 = ack()
    const assistant1 =
      niche === 'fashion'
        ? tx(
            variant === 'alt'
              ? `${ack1} I can handle the order and delivery. Delivery: ${a} or ${b} — which one do you prefer? One detail: item link or name + size?`
              : `${ack1} I can check stock and arrange delivery. Delivery: ${a} or ${b} — which one do you prefer? One detail: what item/size?`,
            variant === 'alt'
              ? `${ack1} Оформлю заказ и доставку. Доставка: ${a} или ${b} — какой вариант выбираете? Один вопрос: ссылка/название товара + размер?`
              : `${ack1} Проверю наличие и оформлю доставку. Доставка: ${a} или ${b} — какой вариант выбираете? Один вопрос: какой товар/размер?`,
            variant === 'alt'
              ? `${ack1} Zařídím objednávku i doručení. Doručení: ${a} nebo ${b} — co preferujete? Jedna věc: odkaz/název + velikost?`
              : `${ack1} Zkontroluji sklad a zařídím doručení. Doručení: ${a} nebo ${b} — co preferujete? Jedna věc: jaký produkt/velikost?`
          )
        : niche === 'auto'
          ? tx(
              variant === 'alt'
                ? `${ack1} I can check parts and book you. Time: ${a} or ${b} — which one fits? One detail: engine (petrol/diesel) and VIN last 6 if you have it.`
                : `${ack1} I can book diagnostics today. Slots: ${a} or ${b} — which one should I lock? One detail: car model/year?`,
              variant === 'alt'
                ? `${ack1} Проверю запчасти и запишу. Время: ${a} или ${b} — какое удобно? Один вопрос: мотор (бенз/диз) и последние 6 VIN, если есть.`
                : `${ack1} Запишу на диагностику сегодня. Время: ${a} или ${b} — какое фиксируем? Один вопрос: модель/год авто?`,
              variant === 'alt'
                ? `${ack1} Prověřím díly a objednám vás. Čas: ${a} nebo ${b} — co sedí? Jedna věc: motor (benzín/nafta) a posledních 6 VIN, pokud máte.`
                : `${ack1} Zarezervuji diagnostiku dnes. Čas: ${a} nebo ${b} — který zamknu? Jedna věc: model/rok auta?`
            )
          : niche === 'dental'
            ? tx(
                variant === 'alt'
                  ? `${ack1} We can do the earliest today: ${a} or ${b}. Which one should I lock? After that: insurance name or self-pay?`
                  : `${ack1} I can offer urgent slots: ${a} or ${b}. Which one should I lock? After that: swelling or fever?`,
                variant === 'alt'
                  ? `${ack1} Могу принять сегодня: ${a} или ${b}. Какое время фиксируем? После — один вопрос: страховка (какая) или самоплатёж?`
                  : `${ack1} Могу предложить срочно: ${a} или ${b}. Какое время фиксируем? После — один вопрос: есть отёк/температура?`,
                variant === 'alt'
                  ? `${ack1} Můžeme dnes nejdřív: ${a} nebo ${b}. Který čas zamknu? Pak jedna věc: pojišťovna nebo samoplátce?`
                  : `${ack1} Nabízím urgentně: ${a} nebo ${b}. Který čas zamknu? Pak jedna věc: otok/teplota?`
              )
            : tx(
                variant === 'alt'
                  ? `${ack1} I can book you. Time: ${a} or ${b}. Which one is better? One detail: preferred master or no preference?`
                  : `${ack1} I can book you today. Time: ${a} or ${b}. Which one is better? One detail: what service exactly?`,
                variant === 'alt'
                  ? `${ack1} Запишу вас. Время: ${a} или ${b}. Какое удобнее? Один вопрос: мастер важен или без разницы?`
                  : `${ack1} Запишу вас сегодня. Время: ${a} или ${b}. Какое удобнее? Один вопрос: какая услуга?`,
                variant === 'alt'
                  ? `${ack1} Objednám vás. Čas: ${a} nebo ${b}. Co je lepší? Jedna věc: chcete konkrétního mistra, nebo je to jedno?`
                  : `${ack1} Zarezervuji vás dnes. Čas: ${a} nebo ${b}. Který je lepší? Jedna věc: jaká služba?`
              )
    setMessages((prev) => [...prev, { role: 'assistant', content: assistant1 }])
    setAiReplies(1)
    setConversationStage('offer')
    await applyStatusFlow('offer_request')

    await wait(650)
    const client2 =
      niche === 'fashion'
        ? pick([
            variant === 'alt'
              ? tx(`Dress, size S. Delivery ${a}.`, `Платье, размер S. Доставка ${a}.`, `Šaty, velikost S. Doručení ${a}.`)
              : tx(`Jacket, size M. Delivery ${a}.`, `Куртка, размер M. Доставка ${a}.`, `Bunda, velikost M. Doručení ${a}.`),
            variant === 'alt'
              ? tx(`If S is not available — offer size M. Delivery ${b}.`, `Если S нет — предложите M. Доставка ${b}.`, `Když S není — nabídněte M. Doručení ${b}.`)
              : tx(`Dress, size S. Delivery ${b}.`, `Платье, размер S. Доставка ${b}.`, `Šaty, velikost S. Doručení ${b}.`),
          ])
        : niche === 'auto'
          ? pick([
              variant === 'alt'
                ? tx(`Passat 2018, diesel. ${a} works.`, `Passat 2018, дизель. Подойдёт ${a}.`, `Passat 2018, nafta. Vyhovuje ${a}.`)
                : tx('Skoda Octavia 2016. I take 16:30.', `Skoda Octavia 2016. Беру ${a}.`, `Škoda Octavia 2016. Beru ${a}.`),
              variant === 'alt'
                ? tx(`Last VIN is 482913. ${b} works.`, `VIN последние 6: 482913. Подойдёт ${b}.`, `Posledních 6 VIN: 482913. Vyhovuje ${b}.`)
                : tx(`VW Passat 2018. ${b} works.`, `VW Passat 2018. Подойдёт ${b}.`, `VW Passat 2018. Vyhovuje ${b}.`),
            ])
          : niche === 'dental'
            ? pick([
                variant === 'alt'
                  ? tx(`I take ${a}. I have VZP.`, `Беру ${a}. Страховка VZP.`, `Beru ${a}. Pojištění VZP.`)
                  : tx(`I can do ${a}. No fever.`, `Могу ${a}. Температуры нет.`, `Můžu ${a}. Bez teploty.`),
                variant === 'alt'
                  ? tx(`Take ${b}. Self-pay if needed.`, `Беру ${b}. Если надо — самоплатёж.`, `Beru ${b}. Když tak samoplátce.`)
                  : tx(`Take ${b}. Slight swelling.`, `Беру ${b}. Есть небольшой отёк.`, `Beru ${b}. Mírný otok.`),
              ])
            : pick([
                variant === 'alt'
                  ? tx(`Manicure + brows. ${a} please.`, `Маникюр + брови. Давайте ${a}.`, `Manikúra + obočí. ${a} prosím.`)
                  : tx(`Manicure + gel. I take ${a}.`, `Маникюр с покрытием. Беру ${a}.`, `Manikúra s gelem. Beru ${a}.`),
                variant === 'alt'
                  ? tx(`Any master is fine. ${b} works too.`, `Мастер не важен. ${b} тоже подходит.`, `Mistr je jedno. ${b} taky sedí.`)
                  : tx(`Hair styling. ${b} please.`, `Укладка. Давайте ${b}.`, `Styling vlasů. ${b} prosím.`),
              ])
    setMessages((prev) => [...prev, { role: 'client', content: client2 }])

    // Lock chosen slot/window
    const chosen = client2.includes(String(a)) ? a : b
    setBookingTime(chosen)
    await applyStatusFlow('slot_confirmed')
    setNextStep(copy.bookingLink)

    await wait(650)
    const ack2 = ack()
    const assistant2 =
      niche === 'fashion'
        ? tx(
            variant === 'alt'
              ? `${ack2} If size S is out — I can reserve size M or similar model. Total EUR 64 + delivery EUR 4. Want payment link now or reserve for 2 hours?`
              : `${ack2} I see it in stock. Total is EUR 64, delivery EUR 4. Want payment link now or reserve for 2 hours?`,
            variant === 'alt'
              ? `${ack2} Если размера S нет — могу держать M или похожую модель. Итого 64 EUR + доставка 4 EUR. Сразу дать ссылку на оплату или резерв на 2 часа?`
              : `${ack2} Есть в наличии. Итого 64 EUR, доставка 4 EUR. Сразу дать ссылку на оплату или зарезервировать на 2 часа?`,
            variant === 'alt'
              ? `${ack2} Když S není — můžu držet M nebo podobný model. Celkem 64 EUR + doručení 4 EUR. Poslat platební odkaz hned, nebo rezervace na 2 hodiny?`
              : `${ack2} Je skladem. Celkem 64 EUR, doručení 4 EUR. Poslat platební odkaz hned, nebo rezervovat na 2 hodiny?`
          )
        : niche === 'auto'
          ? tx(
            `${ack2} Time ${chosen} reserved. Diagnostics takes ~15 min. Want a EUR 20 deposit link or pay on-site?`,
            `${ack2} Время ${chosen} держу. Диагностика ~15 минут. Скинуть ссылку на депозит 20 EUR или оплата на месте?`,
            `${ack2} Čas ${chosen} držím. Diagnostika ~15 minut. Poslat odkaz na zálohu 20 EUR, nebo platba na místě?`
            )
          : niche === 'dental'
            ? tx(
            `${ack2} Time ${chosen} reserved. First visit is EUR 49–79 depending on X‑ray. Deposit EUR 20 to lock or without deposit?`,
            `${ack2} Время ${chosen} держу. Первый приём 49–79 EUR (по снимку). Депозит 20 EUR фиксируем или без депозита?`,
            `${ack2} Čas ${chosen} držím. První návštěva 49–79 EUR podle RTG. Záloha 20 EUR pro potvrzení, nebo bez zálohy?`
              )
            : tx(
          `${ack2} Time ${chosen} reserved. Service time ~60 min. Want deposit link EUR 10 or confirm without deposit?`,
          `${ack2} Время ${chosen} держу. По времени ~60 минут. Ссылка на депозит 10 EUR или подтверждаем без депозита?`,
          `${ack2} Čas ${chosen} držím. Služba ~60 minut. Odkaz na zálohu 10 EUR, nebo potvrdit bez zálohy?`
              )
    setMessages((prev) => [...prev, { role: 'assistant', content: assistant2 }])
    setAiReplies(2)
    setConversationStage('commitment')

    await wait(650)
    const clientPrice =
      niche === 'fashion'
        ? tx('What about return/exchange?', 'А по обмену/возврату как?', 'A jak je to s výměnou/vrácením?')
        : niche === 'auto'
          ? tx('Rough total price?', 'Сколько примерно выйдет по цене?', 'Kolik to vyjde orientačně?')
          : niche === 'dental'
            ? tx('What is the price range?', 'По цене сориентируйте, пожалуйста.', 'Jaký je cenový rozsah?')
            : tx('How much will it be?', 'Сколько будет по цене?', 'Kolik to bude stát?')
    setMessages((prev) => [...prev, { role: 'client', content: clientPrice }])

    await wait(650)
    const ackPrice = ack()
    const assistantPrice =
      niche === 'fashion'
        ? tx(
            `${ackPrice} Exchange within 14 days, tags intact. Want payment link now or reserve for 2 hours?`,
            `${ackPrice} Обмен/возврат 14 дней, бирки сохранены. Сразу дать ссылку на оплату или резерв на 2 часа?`,
            `${ackPrice} Výměna/vrácení 14 dní, s visačkami. Poslat odkaz k platbě hned, nebo rezervace na 2 hodiny?`
          )
        : niche === 'auto'
          ? tx(
              `${ackPrice} Typical range EUR 120–220 depending on parts. Want deposit link EUR 20 or pay on-site?`,
              `${ackPrice} Обычно 120–220 EUR (зависит от деталей). Ссылка на депозит 20 EUR или оплата на месте?`,
              `${ackPrice} Obvykle 120–220 EUR (dle dílů). Odkaz na zálohu 20 EUR, nebo platba na místě?`
            )
          : niche === 'dental'
            ? tx(
                `${ackPrice} Usually EUR 49–79 for exam, treatment plan after X‑ray. Deposit link EUR 20 to lock?`,
                `${ackPrice} Обычно 49–79 EUR за осмотр, план после снимка. Скинуть ссылку на депозит 20 EUR, чтобы закрепить?`,
                `${ackPrice} Obvykle 49–79 EUR za vyšetření, plán po RTG. Poslat odkaz na zálohu 20 EUR pro potvrzení?`
              )
            : tx(
                `${ackPrice} Manicure + gel is EUR 35–45 depending on design. Deposit link EUR 10 to lock?`,
                `${ackPrice} Маникюр с покрытием 35–45 EUR (по дизайну). Скинуть ссылку на депозит 10 EUR, чтобы закрепить?`,
                `${ackPrice} Manikúra s gelem 35–45 EUR podle designu. Poslat odkaz na zálohu 10 EUR pro potvrzení?`
              )
    setMessages((prev) => [...prev, { role: 'assistant', content: assistantPrice }])
    setAiReplies(3)
    await applyStatusFlow('price_request')

    await wait(650)
    const client3 = pick([
      tx('Send payment link.', 'Скиньте ссылку на оплату.', 'Pošlete platební odkaz.'),
      tx('Payment link please.', 'Давайте ссылку.', 'Odkaz prosím.'),
    ])
    setMessages((prev) => [...prev, { role: 'client', content: client3 }])
    await applyStatusFlow('payment_requested')

    await wait(650)
    const ack3 = ack()
    const assistant3 = tx(
      `${ack3} Sent. It takes ~10–20 sec to process. Reply “paid” here when done.`,
      `${ack3} Отправил. Обработка обычно 10–20 сек. Напишите сюда «оплатил», когда будет готово.`,
      `${ack3} Odesláno. Zpracování trvá obvykle 10–20 s. Napište sem „zaplaceno“, až to projde.`
    )
    setMessages((prev) => [...prev, { role: 'assistant', content: assistant3 }])
    setAiReplies(4)

    await wait(650)
    const clientPaid = pick([
      tx('Paid.', 'Оплатил.', 'Zaplaceno.'),
      tx('Done, paid.', 'Готово, оплатил.', 'Hotovo, zaplaceno.'),
    ])
    setMessages((prev) => [...prev, { role: 'client', content: clientPaid }])
    await applyStatusFlow('payment_confirmed')

    await wait(650)
    const ack4 = ack()
    const ch = channels2()
    const assistant4 =
      niche === 'fashion'
        ? tx(
            `${ack4} Payment received. Delivery method “${chosen}” confirmed. Confirmation ${ch}?`,
            `${ack4} Оплата получена. Способ доставки «${chosen}» подтверждён. Подтверждение в ${ch}?`,
            `${ack4} Platba přijata. Doručení „${chosen}“ potvrzeno. Potvrzení přes ${ch}?`
          )
        : tx(
            `${ack4} Payment received. Slot ${chosen} is locked. Confirmation ${ch}?`,
            `${ack4} Оплата получена. Слот ${chosen} закреплён. Подтверждение в ${ch}?`,
            `${ack4} Platba přijata. Termín ${chosen} je zamčený. Potvrzení přes ${ch}?`
          )
    setMessages((prev) => [...prev, { role: 'assistant', content: assistant4 }])
    setAiReplies(5)
    setConversationStage('conversion')
    setBookingConfirmed(true)
    appendLog(copy.logNotif)
    setPlaying(false)
  }

  const resolveScenarioAction = (scenario: Scenario) => {
    if (scenario.paymentState === 'paid' || /pay-done|final-paid|paid|оплат|platb/i.test(scenario.id)) return 'payment_confirmed'
    if (scenario.paymentState === 'pending' || /pay-link|payment|invoice|fee-pay|депозит/i.test(scenario.id)) return 'payment_requested'
    if (scenario.bookingConfirmed && !scenario.paymentState) return 'booking_confirmed'
    if (scenario.bookingTime || /book|slot|time|запис|резерв/i.test(scenario.id)) return 'slot_confirmed'
    if (/price|quote|rate|cost|budget|цен/i.test(scenario.id)) return 'price_request'
    if (/plan|treatment|strategy|options|variant|вариант|план/i.test(scenario.id)) return 'plan_request'
    if (/call|callback|consult/i.test(scenario.id)) return 'call_request'
    if (/doc|documents|smlouv|документ/i.test(scenario.id)) return 'docs_request'
    return 'offer_request'
  }

  const statusMap: Record<string, number[]> = {
    offer_request: [2, 3],
    price_request: [2, 3],
    call_request: [2, 3],
    docs_request: [2, 3],
    slot_confirmed: [2, 3, 4],
    booking_confirmed: [2, 3, 4, 7, 8],
    payment_requested: [2, 3, 5],
    payment_confirmed: [2, 3, 5, 6, 7, 8],
  }

  const applyStatusFlow = async (action: string) => {
    const steps = statusMap[action] || statusMap.offer_request
    for (const idx of steps) {
      if (idx === 5 && (action === 'payment_requested' || action === 'payment_confirmed')) {
        setPaymentState((prev) => {
          if (prev === 'pending' || prev === 'paid') return prev
          appendLog(copy.logPaymentLink)
          return 'pending'
        })
      }
      if (idx === 6 && action === 'payment_confirmed') {
        setPaymentProcessing(true)
        appendLog(copy.paymentProcessing)
        await wait(transitionDelay())
        setPaymentProcessing(false)
        appendLog(copy.logPaymentDone)
        setPaymentState('paid')
      }
      setStatusIndex((prev) => Math.max(prev, idx))
      await wait(transitionDelay())
    }
  }

  const runDemoByIndustry = async (industryValue: string) => {
    const cleaned = industryValue.trim()
    if (!cleaned || loading) return
    setError('')
    const niche = inferDemoNiche(cleaned)
    await playNicheFlow(cleaned, niche)
  }

  const runDemo = async (e: React.FormEvent) => {
    e.preventDefault()
    await runDemoByIndustry(industry)
  }

  const onPresetClick = async (preset: string) => {
    setIndustry(preset)
    setActivePreset(preset)
    resetStateOnly()
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      demoBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    await runDemoByIndustry(preset)
  }

  const resetDemo = () => {
    resetStateOnly()
    setActivePreset('')
  }

  // Scenario clicking removed: demo auto-plays a full flow.

  // Scenario buttons removed.
  const timeline = [...copy.timeline]
  if (demoNiche === 'fashion') {
    timeline[3] = tx('Delivery proposed', 'Доставка предложена', 'Doručení nabídnuto')
    timeline[4] = tx('Delivery confirmed', 'Доставка подтверждена', 'Doručení potvrzeno')
  }
  if (bookingConfirmed) timeline[7] = copy.bookingConfirmed
  const isLocked = aiReplies >= MAX_AI_REPLIES
  const priorityCls =
    priority === 'High'
      ? 'bg-red-500/15 text-red-300 border-red-400/30'
      : priority === 'Medium'
      ? 'bg-amber-500/15 text-amber-300 border-amber-400/30'
      : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
  const paymentLabel =
    paymentProcessing
      ? copy.paymentProcessing
      : paymentState === 'paid'
      ? copy.paymentPaid
      : paymentState === 'pending'
      ? copy.paymentPending
      : copy.paymentNone

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0F1318] p-6 shadow-[0_0_40px_rgba(37,99,235,0.08)] sm:p-8">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#475569]">{copy.demoLabel}</p>
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

      <div ref={demoBoxRef} className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="min-h-[360px] rounded-xl border border-white/[0.06] bg-[#0A0D12] p-4 transition-all duration-300 hover:border-white/[0.12]">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#64748B]">{copy.conversation}</p>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#94A3B8]">
              {copy.industryLabel}: {industry || '-'}
            </span>
          </div>

          {!started && !loading ? <p className="text-[13px] text-[#475569]">{t.calcLead}</p> : null}
          {loading ? (
            <div className="mb-3 flex items-center gap-2 text-[13px] text-[#94A3B8]">
              <span className="h-2 w-2 rounded-full bg-[#2563EB] animate-pulse" />
              <span>{t.demoLoading}</span>
            </div>
          ) : null}
          {error ? (
            <div className="mb-3 rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-300">
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

          {null}

          {null}
        </div>

        <div className="min-h-[360px] rounded-xl border border-white/[0.06] bg-[#0A0D12] p-4 transition-all duration-300 hover:border-[#2563EB]/25">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#64748B]">{copy.dashboard}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${priorityCls}`}>{copy.priority}: {priority}</span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2">
              <p className="text-[#64748B]">{copy.industryLabel}</p>
              <p className="mt-1 text-[#E2E8F0]">{industry || '-'}</p>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2">
              <p className="text-[#64748B]">{copy.responseTime}</p>
              <p className="mt-1 text-[#E2E8F0]">{responseTimeValue}</p>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2">
              <p className="text-[#64748B]">{copy.leadIntent}</p>
              <p className="mt-1 text-[#E2E8F0]">{leadIntent}</p>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2">
              <p className="text-[#64748B]">{copy.nextStep}</p>
              <p className="mt-1 text-[#E2E8F0]">{nextStep}</p>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2">
              <p className="text-[#64748B]">{copy.bookingTime}</p>
              <p className="mt-1 text-[#E2E8F0]">{bookingTime}</p>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2">
              <p className="text-[#64748B]">{copy.payment}</p>
              <p className={`mt-1 text-[#E2E8F0] ${paymentProcessing ? 'animate-pulse' : ''}`}>{paymentLabel}</p>
            </div>
            <div className="col-span-2 rounded-lg border border-white/[0.07] bg-white/[0.03] p-2">
              <p className="text-[#64748B]">{copy.crmProduct}</p>
              <p className="mt-1 text-[#E2E8F0]">{crmProduct}</p>
            </div>
          </div>

          <div className="mb-3 h-1.5 rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] transition-all duration-500"
              style={{ width: `${Math.max(10, ((statusIndex + 1) / timeline.length) * 100)}%` }}
            />
          </div>

          <div className="mb-4">
            <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[#64748B]">{copy.statusTimeline}</p>
            <div className="space-y-1.5">
              {timeline.map((step, idx) => (
                <div key={step} className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full transition-all duration-300 ${
                      idx < statusIndex
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                        : idx === statusIndex
                        ? 'bg-[#2563EB] shadow-[0_0_8px_rgba(37,99,235,0.8)] animate-pulse'
                        : 'bg-[#334155]'
                    }`}
                  />
                  <span className={`text-[12px] transition-colors duration-300 ${idx <= statusIndex ? 'text-[#E2E8F0]' : 'text-[#475569]'}`}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[#64748B]">{copy.systemLog}</p>
            <div className="max-h-[150px] space-y-1.5 overflow-y-auto pr-1">
              {logItems.map((l, idx) => (
                <div
                  key={l.id}
                  className="animate-fadeIn rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-[11px] transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#CBD5E1]">{l.text}</span>
                    <span className="font-mono text-[#475569]">{l.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isLocked ? (
            <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[#64748B]">{copy.outcomeTitle}</p>
              <div className="grid gap-2 text-[12px]">
                <div className="flex items-center justify-between rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                  <span className="text-[#94A3B8]">{copy.outcomeBooking}</span>
                  <span className="text-[#E2E8F0]">{bookingConfirmed ? copy.outcomeDone : copy.outcomeInProgress}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                  <span className="text-[#94A3B8]">{copy.outcomeCrm}</span>
                  <span className="text-[#E2E8F0]">{crmProduct !== '-' ? copy.outcomeDone : copy.outcomeInProgress}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                  <span className="text-[#94A3B8]">{copy.outcomePayment}</span>
                  <span className="text-[#E2E8F0]">
                    {paymentState === 'paid'
                      ? copy.outcomeDone
                      : paymentState === 'pending'
                      ? copy.outcomeInProgress
                      : copy.outcomeNotStarted}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className="mr-2 text-[12px] text-[#64748B]">{copy.tryAnother}</p>
        {t.demoPresets.map((preset) => (
          <button
            key={`bottom-${preset}`}
            type="button"
            onClick={() => onPresetClick(preset)}
            className="rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-[12px] text-[#94A3B8] transition hover:border-white/[0.22] hover:text-white"
          >
            {preset}
          </button>
        ))}
      </div>

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
    { title: t.packageStarterTitle, price: t.packageStarterPrice, desc: t.packageStarterDesc, tier: 'start' as const },
    { title: t.packageGrowthTitle,  price: t.packageGrowthPrice,  desc: t.packageGrowthDesc,  tier: 'business' as const },
    { title: t.packageScaleTitle,   price: t.packageScalePrice,   desc: t.packageScaleDesc,   tier: 'pro' as const },
  ]
  const tierConfig = {
    start: {
      card:    'card-tier-start',
      topLine: '',
      badge:   'bg-white/[0.05] text-[#64748B] border border-white/[0.08]',
      price:   'text-white',
      dot:     'bg-[#475569]',
      btn:     'border border-white/[0.1] text-[#94A3B8] hover:border-white/[0.22] hover:text-white',
      label:   '',
    },
    business: {
      card:    'card-tier-business',
      topLine: 'from-transparent via-[#2563EB]/80 to-transparent',
      badge:   'bg-[#2563EB]/10 text-[#93C5FD] border border-[#2563EB]/25',
      price:   'num-blue',
      dot:     'bg-[#2563EB]',
      btn:     'bg-[#2563EB] text-white shadow-[0_4px_20px_-4px_rgba(37,99,235,0.5)] hover:bg-[#1d4ed8]',
      label:   lang === 'ru' ? 'Популярный' : lang === 'ua' ? 'Populární' : 'Popular',
    },
    pro: {
      card:    'card-tier-pro',
      topLine: 'from-transparent via-emerald-400/70 to-transparent',
      badge:   'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25',
      price:   'num-emerald',
      dot:     'bg-emerald-400',
      btn:     'border border-emerald-500/35 text-emerald-300 hover:border-emerald-400/60 hover:bg-emerald-500/[0.07]',
      label:   '',
    },
  }

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

      {/* ════ PACKAGES ══════════════════════════════════════════════════════════ */}
      <section id="packages" className="border-b border-white/[0.06] py-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="reveal mb-14 text-center">
            <p className="label">{t.eyebrowPackages}</p>
            <h2 className="section-heading">{t.packagesTitle}</h2>

            {/* 5 channels: explanation + badges */}
            <div className="mx-auto mt-7 max-w-[860px] rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-5">
              <p className="text-[13px] leading-relaxed text-[#94A3B8]">
                {lang === 'ru'
                  ? 'Один AI‑агент ведёт диалоги там, где пишут ваши клиенты — и везде работает одинаково: по правилам бизнеса, с фиксацией заявки и передачей в CRM.'
                  : lang === 'ua'
                    ? 'Jeden AI‑agent komunikuje tam, kde píší vaši klienti — a všude funguje stejně: podle pravidel byznysu, se zachycením leadu a předáním do CRM.'
                    : 'One AI agent works where your clients message you — consistently across channels, with lead capture and CRM handoff.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {[
                {
                  name: lang === 'ru' ? 'Сайт' : lang === 'ua' ? 'Web' : 'Website',
                  color: 'border-white/[0.12] bg-white/[0.04] text-[#CBD5E1]',
                  dot: 'bg-[#2563EB]',
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  ),
                },
                {
                  name: 'WhatsApp',
                  color: 'border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-300',
                  dot: 'bg-emerald-400',
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                    </svg>
                  ),
                },
                {
                  name: 'Telegram',
                  color: 'border-sky-500/30 bg-sky-500/[0.07] text-sky-300',
                  dot: 'bg-sky-400',
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                  ),
                },
                {
                  name: 'Instagram',
                  color: 'border-pink-500/30 bg-pink-500/[0.07] text-pink-300',
                  dot: 'bg-pink-400',
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                    </svg>
                  ),
                },
                {
                  name: 'Messenger',
                  color: 'border-indigo-500/30 bg-indigo-500/[0.07] text-indigo-300',
                  dot: 'bg-indigo-400',
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8.1l3.131 3.26 5.887-3.26-6.559 6.863z" />
                    </svg>
                  ),
                },
              ].map((ch) => (
                <div
                  key={ch.name}
                  className={`flex items-center gap-2.5 rounded-full border px-4 py-2 text-[13px] font-medium ${ch.color}`}
                >
                  <span className="shrink-0 opacity-90">{ch.icon}</span>
                  {ch.name}
                </div>
              ))}
            </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {[
                  {
                    t: lang === 'ru' ? 'Единые правила' : lang === 'ua' ? 'Jedna pravidla' : 'One ruleset',
                    d:
                      lang === 'ru'
                        ? 'Тон и логика одинаковы в каждом канале.'
                        : lang === 'ua'
                          ? 'Tón a logika jsou stejné v každém kanálu.'
                          : 'Same tone and logic everywhere.',
                  },
                  {
                    t: lang === 'ru' ? 'Заявка не теряется' : lang === 'ua' ? 'Lead se neztratí' : 'No lead loss',
                    d:
                      lang === 'ru'
                        ? 'Контакт фиксируется и уходит в систему.'
                        : lang === 'ua'
                          ? 'Kontakt se uloží a jde do systému.'
                          : 'Contact is captured and saved.',
                  },
                  {
                    t: lang === 'ru' ? 'Передача в CRM' : lang === 'ua' ? 'Předání do CRM' : 'CRM handoff',
                    d:
                      lang === 'ru'
                        ? 'Статусы, заметки, следующий шаг — в одном месте.'
                        : lang === 'ua'
                          ? 'Statusy, poznámky, další krok — na jednom místě.'
                          : 'Statuses, notes, next step — in one place.',
                  },
                ].map((b) => (
                  <div key={b.t} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <p className="text-[12px] font-semibold text-white">{b.t}</p>
                    <p className="mt-1 text-[12px] text-[#64748B]">{b.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {packages.map((pkg, i) => {
              const tc = tierConfig[pkg.tier]
              const items = pkg.tier === 'start' ? t.packageStarterItems : pkg.tier === 'business' ? t.packageGrowthItems : t.packageScaleItems
              return (
                <article
                  key={pkg.title}
                  className={`reveal relative flex flex-col overflow-hidden p-8 ${tc.card}`}
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  {/* Top accent line */}
                  {tc.topLine && (
                    <div className={`pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r ${tc.topLine}`} />
                  )}
                  {/* Popular badge */}
                  {tc.label && (
                    <div className="absolute right-5 top-5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide ${tc.badge}`}>
                        {tc.label}
                      </span>
                    </div>
                  )}

                  {/* Header */}
                  <p className={`text-[11px] font-medium uppercase tracking-[0.18em] ${tc.badge.includes('emerald') ? 'text-emerald-400' : tc.badge.includes('2563') ? 'text-[#60A5FA]' : 'text-[#64748B]'}`}>
                    {pkg.tier === 'start' ? 'START' : pkg.tier === 'business' ? 'BUSINESS' : 'PRO'}
                  </p>
                  <p className="mt-2 text-[15px] font-medium text-[#CBD5E1]">{pkg.title.replace(/^(START|BUSINESS|PRO)\s*—\s*/, '')}</p>

                  {/* Price */}
                  <p className={`mt-5 text-[28px] font-semibold leading-tight tracking-tight ${tc.price}`}>
                    {pkg.price}
                  </p>

                  {/* Description */}
                  <p className="mt-4 text-[13px] leading-relaxed text-[#64748B]">{pkg.desc}</p>

                  {/* Divider */}
                  <div className={`my-5 h-px w-full ${tc.topLine ? `bg-gradient-to-r ${tc.topLine}` : 'bg-white/[0.05]'}`} />

                  {/* Features */}
                  <ul className="flex-1 space-y-3">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[13px] text-[#94A3B8]">
                        <span className={`mt-[4px] h-1.5 w-1.5 shrink-0 rounded-full ${tc.dot}`} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <a
                    href="#contact"
                    className={`mt-8 block rounded-xl px-4 py-3.5 text-center text-[13px] font-semibold transition-all duration-200 active:scale-[0.97] ${tc.btn}`}
                  >
                    {t.heroPrimaryCta}
                  </a>
                </article>
              )
            })}
          </div>

          {/* ── Website / Ads services extra block ─────────────────────── */}
          <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#475569]">
              {lang === 'ru' ? 'Дополнительные услуги' : lang === 'ua' ? 'Doplňkové služby' : 'Additional services'}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: lang === 'ru' ? 'Создание сайта' : lang === 'ua' ? 'Tvorba webu' : 'Website build',
                  price: '€500 – €1 500',
                  note:  lang === 'ru' ? 'Разово, под ключ' : lang === 'ua' ? 'Jednorázově, na klíč' : 'One-time, turnkey',
                  dot: 'bg-[#2563EB]',
                },
                {
                  title: lang === 'ru' ? 'Ведение сайта' : lang === 'ua' ? 'Správa webu' : 'Website maintenance',
                  price: lang === 'ru' ? 'от €500/мес' : lang === 'ua' ? 'od €500/měs' : 'from €500/mo',
                  note:  lang === 'ru' ? 'Обновления, поддержка, правки' : lang === 'ua' ? 'Aktualizace, podpora, úpravy' : 'Updates, support, fixes',
                  dot: 'bg-[#2563EB]',
                },
                {
                  title: lang === 'ru' ? 'Реклама + сайт' : lang === 'ua' ? 'Reklama + web' : 'Ads + website',
                  price: '€700/мес',
                  note:  lang === 'ru' ? 'Ведение рекламы — только с нашим сайтом' : lang === 'ua' ? 'Správa reklamy jen s naším webem' : 'Ads management only with our website',
                  dot: 'bg-emerald-400',
                },
                {
                  title: lang === 'ru' ? 'Разовая настройка рекламы' : lang === 'ua' ? 'Jednorázové nastavení reklam' : 'One-time ads setup',
                  price: lang === 'ru' ? 'по запросу' : lang === 'ua' ? 'na dotaz' : 'on request',
                  note:  lang === 'ru' ? 'Настройка + передача инструкций' : lang === 'ua' ? 'Nastavení + předání instrukcí' : 'Setup + handoff guide',
                  dot: 'bg-[#64748B]',
                },
              ].map((s) => (
                <div key={s.title} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4 transition hover:border-white/[0.12]">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                    <p className="text-[12px] font-medium text-[#CBD5E1]">{s.title}</p>
                  </div>
                  <p className="mt-2 text-[20px] font-semibold tracking-tight text-white">{s.price}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#475569]">{s.note}</p>
                </div>
              ))}
            </div>
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

          <PortfolioCarousel lang={lang} />
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

              <div className="mt-10 space-y-3">
                {[
                  { abbr: 'TG', href: 'https://t.me/temoweb',         label: t.contactTelegram,   color: 'text-[#38BDF8]', bg: 'bg-[#38BDF8]/[0.08] border-[#38BDF8]/20' },
                  { abbr: 'WA', href: 'https://wa.me/380960494917',   label: t.contactWhatsapp,   color: 'text-emerald-400', bg: 'bg-emerald-400/[0.08] border-emerald-400/20' },
                  { abbr: 'EM', href: 'mailto:info@temoweb.eu',       label: t.contactEmail,      color: 'text-[#60A5FA]', bg: 'bg-[#2563EB]/[0.07] border-[#2563EB]/20' },
                ].map((c) => (
                  <a
                    key={c.abbr}
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 text-[14px] text-[#94A3B8] transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-white"
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-mono text-[11px] font-semibold ${c.bg} ${c.color}`}>
                      {c.abbr}
                    </span>
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
