'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Zap, CheckCircle2, Users, Calendar, TrendingUp, Scissors, Car, GraduationCap, Wrench, Briefcase, Shield, Sparkles, Plus } from 'lucide-react'
import { TEMOWEB_PROFILE } from './api/temowebProfile'

type Lang = 'ua' | 'ru' | 'cz'

type Dict = {
  badge: string
  headerSubtitle: string
  heroTitle: string
  heroSubtitle: string
  pilotBadge: string
  pilotTitle: string
  pilotSubtitle: string
  pilotPriceLine: string
  pilotCta: string
  pilotIncludesTitle: string
  pilotNotIncludesTitle: string
  ctaPrimary: string
  ctaSecondary: string
  ctaNote: string
  howTitle: string
  howSteps: { title: string; text: string; icon: string }[]
  howCta: string
  whoTitle: string
  whoList: string[]
  whoText: string
  whoCta: string
  resultTitle: string
  resultBullets: { text: string; stat?: string }[]
  resultCta: string
  pricingTitle: string
  pricingSubtitle: string
  addonsTitle: string
  faqTitle: string
  formTitle: string
  formSubtitle: string
  name: string
  contact: string
  comment: string
  formCta: string
  formSuccess: string
  formError: string
  fieldRequired: string
  trustBadge: string
  footerAbout: string
}

const dict: Record<Lang, Dict> = {
  ua: {
    badge: 'Система прийому клієнтів',
    headerSubtitle: 'Система прийому клієнтів',
    heroTitle: 'Клієнт або записався — або пішов до конкурента',
    heroSubtitle:
      'Я будую системи, які автоматично приймають заявки, відповідають клієнтам і фіксують їх без менеджерів і дзвінків',
    pilotBadge: 'PILOT PROGRAM • 2 місяці',
    pilotTitle: 'Тестовий запуск системи на 2 місяці (без великого ризику)',
    pilotSubtitle: 'Запускаємо за 48–72 години, підключаємо 1–2 канали, ведемо заявки в CRM + сповіщення в Telegram.',
    pilotPriceLine: '490€ разово + 99€/міс (2 місяці). Канали: Instagram / Messenger / Telegram / сайт.',
    pilotCta: 'Взяти PILOT (2 місяці)',
    pilotIncludesTitle: 'Що входить у пілот',
    pilotNotIncludesTitle: 'Що НЕ входить (щоб було швидко і стабільно)',
    ctaPrimary: 'Показати, як це працює',
    ctaSecondary: 'Демо для мого бізнесу',
    ctaNote: 'Просто подивись. Ніяких дзвінків. 30 секунд.',
    howTitle: 'Що відбувається насправді',
    howSteps: [
      { title: 'Клієнт пише або натискає', text: 'Instagram, сайт, реклама — байдуже', icon: '💬' },
      { title: 'Система одразу реагує', text: 'Задає питання, фільтрує і формує заявку', icon: '⚡' },
      { title: 'Ви отримуєте готового клієнта', text: 'Telegram / таблиця / CRM — без хаосу', icon: '✓' },
    ],
    howCta: 'Подивитись рішення для мого бізнесу',
    whoTitle: 'Кому це потрібно',
    whoList: ['Барбершопи і салони', 'Автосервіси', 'Курси і школи', 'Сервісні бізнеси', 'Малий та середній бізнес'],
    whoText: 'Якщо клієнти пишуть, дзвонять і губляться — це для вас',
    whoCta: 'Перевірити під свій бізнес',
    resultTitle: 'Що змінюється після впровадження',
    resultBullets: [
      { text: 'Клієнти не губляться', stat: '+70% заявок без ручної відповіді' },
      { text: 'Немає дзвінків і ручної переписки', stat: '24/7 прийом без людини' },
      { text: 'Ви бачите всі заявки', stat: 'Прозорий статус кожної заявки' },
      { text: 'Система працює 24/7', stat: 'Навіть вночі та у вихідні' },
      { text: 'Менше хаосу — більше продажів', stat: 'Мінус ручна робота' },
    ],
    resultCta: 'Побачити це в дії',
    pricingTitle: 'Пакети та модулі',
    pricingSubtitle: 'Фіксовані умови. Прозорий обсяг. Підтримка, щоб інтеграції не “падали”.',
    addonsTitle: 'Додаткові модулі',
    faqTitle: 'Часті питання',
    formTitle: 'Хочеш рішення прямо зараз?',
    formSubtitle: 'Я покажу, як це може працювати у вашому бізнесі',
    name: 'Імʼя',
    contact: 'Контакт (email або Telegram)',
    comment: 'Короткий коментар (необовʼязково)',
    formCta: 'Отримати рішення',
    formSuccess: 'Запит прийнято. Якщо система підходить — наступний крок реалізація.',
    formError: 'Перевірте контакт і спробуйте ще раз',
    fieldRequired: 'Заповніть поле',
    trustBadge: 'Система працює 24/7, автоматично звʼязує заявки і веде їх у Telegram / CRM',
    footerAbout: 'Про мене',
  },
  ru: {
    badge: 'Система приёма клиентов',
    headerSubtitle: 'Система приёма клиентов',
    heroTitle: 'Клиент либо записался — либо ушёл к конкуренту',
    heroSubtitle:
      'Я строю системы, которые автоматически принимают заявки, отвечают клиентам и фиксируют их без менеджеров и звонков',
    pilotBadge: 'PILOT PROGRAM • 2 месяца',
    pilotTitle: 'Тестовый запуск системы на 2 месяца (без большого риска)',
    pilotSubtitle: 'Запускаем за 48–72 часа, подключаем 1–2 канала, ведём заявки в CRM + уведомления в Telegram.',
    pilotPriceLine: '490€ разово + 99€/мес (2 месяца). Каналы: Instagram / Messenger / Telegram / сайт.',
    pilotCta: 'Взять PILOT (2 месяца)',
    pilotIncludesTitle: 'Что входит в пилот',
    pilotNotIncludesTitle: 'Что НЕ входит (чтобы было быстро и стабильно)',
    ctaPrimary: 'Показать, как это работает',
    ctaSecondary: 'Демо для моего бизнеса',
    ctaNote: 'Просто посмотри. Без звонков. 30 секунд.',
    howTitle: 'Что происходит на самом деле',
    howSteps: [
      { title: 'Клиент пишет или нажимает', text: 'Instagram, сайт, реклама — не важно', icon: '💬' },
      { title: 'Система сразу реагирует', text: 'Задает вопросы, фильтрует и формирует заявку', icon: '⚡' },
      { title: 'Вы получаете готового клиента', text: 'Telegram / таблица / CRM — без хаоса', icon: '✓' },
    ],
    howCta: 'Посмотреть решение для моего бизнеса',
    whoTitle: 'Кому это нужно',
    whoList: ['Барбершопы и салоны', 'Автосервисы', 'Курсы и школы', 'Сервисные бизнесы', 'Малый и средний бизнес'],
    whoText: 'Если клиенты пишут, звонят и теряются — это для вас',
    whoCta: 'Проверить под свой бизнес',
    resultTitle: 'Что меняется после внедрения',
    resultBullets: [
      { text: 'Клиенты не теряются', stat: '+70% заявок без ручной работы' },
      { text: 'Нет звонков и ручной переписки', stat: '24/7 приём без человека' },
      { text: 'Вы видите все заявки', stat: 'Прозрачный статус каждой заявки' },
      { text: 'Система работает 24/7', stat: 'Даже ночью и в выходные' },
      { text: 'Меньше хаоса — больше продаж', stat: 'Минус ручная работа' },
    ],
    resultCta: 'Увидеть это в действии',
    pricingTitle: 'Пакеты и модули',
    pricingSubtitle: 'Фиксированные условия. Прозрачный объём. Поддержка, чтобы интеграции не “падали”.',
    addonsTitle: 'Дополнительные модули',
    faqTitle: 'Частые вопросы',
    formTitle: 'Хочешь решение прямо сейчас?',
    formSubtitle: 'Я покажу, как это может работать в вашем бизнесе',
    name: 'Имя',
    contact: 'Контакт (email или Telegram)',
    comment: 'Короткий комментарий (необязательно)',
    formCta: 'Получить решение',
    formSuccess: 'Запрос принят. Если система подходит — следующий шаг внедрение.',
    formError: 'Проверьте контакт и попробуйте снова',
    fieldRequired: 'Заполните поле',
    trustBadge: 'Система работает 24/7, автоматически связывает заявки и ведёт их в Telegram / CRM',
    footerAbout: 'Обо мне',
  },
  cz: {
    badge: 'Systém pro příjem klientů',
    headerSubtitle: 'Systém pro příjem klientů',
    heroTitle: 'Klient se buď objednal — nebo odešel ke konkurenci',
    heroSubtitle:
      'Stavím systémy, které automaticky přijímají poptávky, odpovídají klientům a ukládají je bez manažerů a hovorů',
    pilotBadge: 'PILOT PROGRAM • 2 months',
    pilotTitle: 'Pilot launch for 2 months (low risk)',
    pilotSubtitle: 'We launch in 48–72 hours, connect 1–2 channels, and push leads to CRM + Telegram alerts.',
    pilotPriceLine: '490€ setup + 99€/month (2 months). Channels: Instagram / Messenger / Telegram / website.',
    pilotCta: 'Start PILOT (2 months)',
    pilotIncludesTitle: 'What’s included',
    pilotNotIncludesTitle: 'Not included (fast & stable)',
    ctaPrimary: 'Ukázat, jak to funguje',
    ctaSecondary: 'Demo pro můj byznys',
    ctaNote: 'Jen se podívej. Bez hovorů. 30 sekund.',
    howTitle: 'Co se děje ve skutečnosti',
    howSteps: [
      { title: 'Klient píše nebo kliká', text: 'Instagram, web, reklama — je to jedno', icon: '💬' },
      { title: 'Systém hned reaguje', text: 'Ptá se, filtruje a vytváří poptávku', icon: '⚡' },
      { title: 'Dostanete připraveného klienta', text: 'Telegram / tabulka / CRM — bez chaosu', icon: '✓' },
    ],
    howCta: 'Podívat se na řešení pro můj byznys',
    whoTitle: 'Komu se to hodí',
    whoList: ['Barbershopy a salony', 'Autoservisy', 'Kurzy a školy', 'Servisní byznysy', 'Malý a střední byznys'],
    whoText: 'Když klienti píšou, volají a ztrácí se — je to pro vás',
    whoCta: 'Prověřit pro můj byznys',
    resultTitle: 'Co se změní po nasazení',
    resultBullets: [
      { text: 'Klienti se neztrácí', stat: '+70% poptávek bez ruční práce' },
      { text: 'Bez hovorů a ruční komunikace', stat: '24/7 příjem bez člověka' },
      { text: 'Vidíte všechny poptávky', stat: 'Transparentní status každé poptávky' },
      { text: 'Systém běží 24/7', stat: 'I v noci a o víkendech' },
      { text: 'Méně chaosu — více prodejů', stat: 'Minus ruční práce' },
    ],
    resultCta: 'Uvidět to v akci',
    pricingTitle: 'Packages and modules',
    pricingSubtitle: 'Fixed terms. Clear scope. Support so integrations stay stable.',
    addonsTitle: 'Extra modules',
    faqTitle: 'FAQ',
    formTitle: 'Chceš řešení hned teď?',
    formSubtitle: 'Ukážu, jak to může fungovat ve tvém byznysu',
    name: 'Jméno',
    contact: 'Kontakt (email nebo Telegram)',
    comment: 'Krátký komentář (nepovinné)',
    formCta: 'Získat řešení',
    formSuccess: 'Poptávka přijata. Pokud systém sedí — další krok je implementace.',
    formError: 'Zkontroluj kontakt a zkus znovu',
    fieldRequired: 'Vyplň toto pole',
    trustBadge: 'Systém běží 24/7, automaticky propojuje poptávky a vede je v Telegram / CRM',
    footerAbout: 'O mně',
  },
}

export default function Home() {
  const [lang, setLang] = useState<Lang>('ua')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set())
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([])

  const t = dict[lang]
  const ctaHref = '/flow?src=site'
  const aboutHref = 'https://t.me/temoxa_1'

  const profileLang = lang === 'ru' ? ('ru' as const) : lang === 'ua' ? ('ua' as const) : ('ru' as const)
  const fmtEur = (n: number) => `${n.toLocaleString('ru-RU')} €`
  const pilot = TEMOWEB_PROFILE.pilot
  const pilotChannels = profileLang === 'ua' ? pilot.channelsUa : pilot.channelsRu
  const pilotIncluded = profileLang === 'ua' ? pilot.includedUa : pilot.includedRu
  const pilotNotIncluded = profileLang === 'ua' ? pilot.notIncludedUa : pilot.notIncludedRu
  const pilotLaunch =
    lang === 'ua' ? '48–72 години' : lang === 'ru' ? '48–72 часа' : pilot.launchTime || '48–72 hours'

  const pricing = (() => {
    const p = TEMOWEB_PROFILE.packages
    const pack = (key: 'start' | 'business' | 'pro') => {
      const x = p[key]
      return {
        key,
        name: key.toUpperCase(),
        title: profileLang === 'ua' ? x.titleUa : x.titleRu,
        setup: fmtEur(x.setupEur),
        support: `${fmtEur(x.supportEurPerMonth)}/${profileLang === 'ua' ? 'міс' : 'мес'}`,
        minMonths: x.supportMinMonths,
        channels: x.channelsUpTo,
        what: (profileLang === 'ua' ? x.whatYouGetUa : x.whatYouGetRu) as string[],
        supportInc: (profileLang === 'ua' ? x.supportIncludesUa : x.supportIncludesRu) as string[],
        fits: profileLang === 'ua' ? x.fitsUa : x.fitsRu,
      }
    }
    return [pack('start'), pack('business'), pack('pro')]
  })()

  const addons = TEMOWEB_PROFILE.addons.map((a) => {
    const title = profileLang === 'ua' ? a.titleUa : a.titleRu
    const includes = profileLang === 'ua' ? a.includesUa : a.includesRu
    const setup = a.setupEur > 0 ? `+${fmtEur(a.setupEur)}` : '—'
    const monthly = a.supportEurPerMonth > 0 ? `+${fmtEur(a.supportEurPerMonth)}/${profileLang === 'ua' ? 'міс' : 'мес'}` : '—'
    return { key: a.key, title, setup, monthly, includes }
  })

  const faq = TEMOWEB_PROFILE.faq.map((x) => ({ q: profileLang === 'ua' ? x.qUa : x.qRu, a: profileLang === 'ua' ? x.aUa : x.aRu }))
  const [faqOpen, setFaqOpen] = useState<number | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = sectionsRef.current.indexOf(entry.target as HTMLDivElement)
          if (entry.isIntersecting && idx >= 0) {
            setVisibleSections((prev) => new Set(prev).add(idx))
          }
        })
      },
      { threshold: 0.1 }
    )

    sectionsRef.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess('')
    setError('')
    if (!contact.trim()) {
      setError(t.fieldRequired)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 'temoweb',
          name: name.trim() || null,
          contact: contact.trim(),
          businessType: null,
          channel: 'Website',
          pain: null,
          question: comment.trim() || null,
          clientMessages: comment.trim() ? [comment.trim()] : [],
          aiRecommendation: null,
          aiSummary: null,
          source: 'site',
          lang,
          notes: 'PILOT landing form',
        }),
      })
      const json = (await res.json().catch(() => ({}))) as any
      if (!res.ok) throw new Error(json?.error || 'Submit error')

      setName('')
      setContact('')
      setComment('')
      setSuccess(t.formSuccess)
    } catch (err) {
      setError(t.formError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(10%, 10%) scale(1.05); }
          66% { transform: translate(-8%, 12%) scale(0.98); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-25px); }
        }
        .animate-gradient { animation: gradient-shift 25s ease-in-out infinite; }
        .animate-float { animation: float 8s ease-in-out infinite; }
      `}</style>

      <main className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-slate-900 overflow-x-hidden">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 opacity-[0.4]" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(148 163 184 / 0.15) 1px, transparent 0)`,
            backgroundSize: '48px 48px'
          }} />
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-indigo-200/40 via-purple-200/30 to-pink-200/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-gradient-to-tr from-blue-200/30 via-cyan-200/20 to-transparent rounded-full blur-3xl" />
          </div>

        <header className="sticky top-0 z-50 backdrop-blur-2xl bg-white/80 border-b border-slate-200/60 shadow-lg shadow-slate-900/5">
          <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 lg:px-12 2xl:px-16 py-5 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="relative">
                <img src="/logo.png" alt="TemoWeb" className="h-12 w-12 rounded-2xl border border-slate-200 shadow-lg shadow-indigo-500/10 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-indigo-500/20 transition-all duration-300" />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div>
                <p className="text-sm uppercase tracking-[0.25em] text-slate-900 font-black">TemoWeb</p>
                <p className="text-[11px] text-slate-600 font-semibold">{t.headerSubtitle}</p>
            </div>
            </div>
            <div className="flex items-center gap-2.5">
              {(['ua', 'ru', 'cz'] as Lang[]).map((lng) => (
            <button
                  key={lng}
                  onClick={() => setLang(lng)}
                  className={`px-5 py-2.5 rounded-full text-xs font-black border transition-all duration-300 ${
                    lang === lng
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 border-transparent text-white shadow-lg shadow-indigo-500/40 scale-110'
                      : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white hover:border-indigo-300 hover:scale-105 shadow-sm'
                  }`}
                >
                  {lng.toUpperCase()}
            </button>
              ))}
          </div>
        </div>
      </header>

        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 lg:px-12 2xl:px-16 py-10 sm:py-16 lg:py-20 space-y-16 sm:space-y-24">
          {/* HERO */}
          <div
            ref={(el) => { sectionsRef.current[0] = el }}
            className={`relative transition-all duration-1000 ${visibleSections.has(0) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-white/70 backdrop-blur-3xl border border-white/40 rounded-[40px] p-10 sm:p-14 lg:p-20 shadow-[0_32px_120px_rgba(0,0,0,0.08)] overflow-hidden group hover:shadow-[0_40px_160px_rgba(99,102,241,0.12)] transition-all duration-700">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-white/40 to-purple-50/50 -z-10" />
              
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div className="space-y-8 lg:pr-10">
                  <span className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-300/40 px-5 py-2.5 text-xs text-indigo-700 uppercase tracking-[0.25em] font-black shadow-sm">
                    ⚡ {t.badge}
                </span>
                  <div className="rounded-3xl border border-amber-300/50 bg-gradient-to-br from-amber-50/90 via-yellow-50/80 to-orange-50/70 backdrop-blur-xl p-7 sm:p-9 shadow-[0_24px_80px_rgba(245,158,11,0.15)] hover:shadow-[0_32px_120px_rgba(245,158,11,0.25)] transition-all duration-500 hover:border-amber-400/60">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                      <div className="flex-1 min-w-0 space-y-5">
                        <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 border border-amber-400/50 shadow-sm">
                          <div className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-800">⚡ {t.pilotBadge}</div>
                        </div>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 leading-[1.15] tracking-tight">{t.pilotTitle}</div>
                        <div className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium">{t.pilotSubtitle}</div>
                        <div className="inline-block px-5 py-3 rounded-2xl bg-white/80 border border-amber-300/50 shadow-lg shadow-amber-500/10 backdrop-blur-sm">
                          <div className="text-sm sm:text-base font-black text-amber-900">{t.pilotPriceLine}</div>
                        </div>
                      </div>
                      <a
                        href="/flow?src=pilot"
                        className="group inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 text-slate-900 px-9 py-5 font-black text-base hover:from-amber-300 hover:via-yellow-300 hover:to-orange-300 hover:scale-110 active:scale-95 transition-all duration-300 shadow-[0_16px_48px_rgba(245,158,11,0.35)] hover:shadow-[0_24px_64px_rgba(245,158,11,0.5)] whitespace-nowrap"
                      >
                        <span className="flex items-center gap-2.5">
                          {t.pilotCta}
                          <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                        </span>
                      </a>
                    </div>
                  </div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.05] text-slate-900 tracking-tight">
                {t.heroTitle}
              </h1>
                  <p className="text-lg sm:text-xl lg:text-2xl text-slate-700 leading-relaxed font-medium">
                    {t.heroSubtitle}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-5 pt-8">
                    <a
                      href={ctaHref}
                      className="group/btn relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-11 py-6 text-lg font-black text-white shadow-[0_24px_64px_rgba(99,102,241,0.35)] transition-all duration-300 hover:shadow-[0_32px_96px_rgba(99,102,241,0.5)] hover:scale-110 active:scale-95 overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                      <span className="relative flex items-center gap-3">
                        <span>{t.ctaPrimary}</span>
                        <span className="text-2xl group-hover/btn:translate-x-1 transition-transform">→</span>
                      </span>
                </a>
                <a
                      href={ctaHref}
                      className="inline-flex items-center justify-center rounded-2xl px-9 py-6 text-lg font-bold text-slate-900 bg-white/80 border border-slate-300/60 hover:bg-white hover:border-indigo-400 transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-xl shadow-lg shadow-slate-900/5"
                >
                      {t.ctaSecondary}
                </a>
              </div>
                  <p className="text-sm text-slate-600 font-semibold leading-relaxed">{t.ctaNote}</p>
            </div>
            
                <div className="relative aspect-[4/3] lg:aspect-square rounded-[32px] overflow-hidden border border-slate-200/60 shadow-[0_32px_120px_rgba(0,0,0,0.12)] group-hover:shadow-[0_48px_160px_rgba(99,102,241,0.2)] transition-all duration-700 order-first lg:order-last">
                  <img 
                    src="/hero-ai.jpg" 
                    alt="AI automation system" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/40 via-purple-900/10 to-transparent" />
                  <div className="absolute -inset-8 bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-pink-500/10 blur-3xl opacity-60 -z-10" />
                    </div>
                      </div>
                    </div>
                  </div>
                  
          {/* HOW */}
          <div
            ref={(el) => { sectionsRef.current[1] = el }}
            className={`transition-all duration-1000 delay-150 ${visibleSections.has(1) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-white/60 backdrop-blur-3xl border border-white/40 rounded-[40px] p-10 sm:p-14 shadow-[0_32px_120px_rgba(0,0,0,0.08)] overflow-hidden hover:shadow-[0_48px_160px_rgba(99,102,241,0.15)] transition-all duration-700">
              <div className="absolute inset-0 opacity-30">
                <img src="/flow-bg.jpg" alt="" className="w-full h-full object-cover" />
                        </div>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-white/70 to-purple-50/80" />
              
              <div className="relative space-y-12">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 text-center tracking-tight">
                  {t.howTitle}
            </h2>
                <div className="grid gap-8 sm:grid-cols-3">
                  {t.howSteps.map((step, idx) => {
                    const icons = [MessageSquare, Zap, CheckCircle2]
                    const Icon = icons[idx]
                    return (
                      <div
                        key={idx}
                        className="group relative bg-white/70 backdrop-blur-2xl border border-slate-200/60 rounded-[32px] p-9 shadow-[0_16px_48px_rgba(0,0,0,0.06)] transition-all duration-500 hover:border-indigo-300/60 hover:shadow-[0_24px_80px_rgba(99,102,241,0.15)] hover:-translate-y-3 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-pink-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative space-y-5 text-center">
                          <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-300/40 flex items-center justify-center group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-indigo-500/20 transition-all duration-300">
                            <Icon className="w-9 h-9 text-indigo-600" strokeWidth={2} />
          </div>
                          <div className="w-16 mx-auto h-1 rounded-full bg-gradient-to-r from-transparent via-indigo-300/50 to-transparent" />
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight tracking-tight">{step.title}</h3>
                          <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium">{step.text}</p>
                </div>
              </div>
                    )
                  })}
            </div>
                <div className="text-center pt-10">
                  <a
                    href={ctaHref}
                    className="group inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-11 py-6 text-lg font-black text-white shadow-[0_24px_64px_rgba(99,102,241,0.35)] transition-all duration-300 hover:shadow-[0_32px_96px_rgba(99,102,241,0.5)] hover:scale-110 active:scale-95"
                  >
                    <span className="flex items-center gap-3">
                      {t.howCta}
                      <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  </a>
                </div>
              </div>
            </div>
                </div>

          {/* WHO */}
          <div
            ref={(el) => { sectionsRef.current[2] = el }}
            className={`transition-all duration-1000 delay-300 ${visibleSections.has(2) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-white/60 backdrop-blur-3xl border border-white/40 rounded-[40px] p-10 sm:p-14 shadow-[0_32px_120px_rgba(0,0,0,0.08)] overflow-hidden hover:shadow-[0_48px_160px_rgba(99,102,241,0.12)] transition-all duration-700">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/60 via-white/40 to-pink-50/50 -z-10" />
              
              <div className="space-y-12">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 text-center tracking-tight">
                  {t.whoTitle}
            </h2>
                <div className="grid sm:grid-cols-2 gap-6">
                  {t.whoList.map((item, idx) => {
                    const whoIcons = [Scissors, Car, GraduationCap, Wrench, Briefcase]
                    const Icon = whoIcons[idx] || Briefcase
                    return (
                      <div
                        key={idx}
                        className="group relative bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-3xl px-7 py-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-300 hover:border-indigo-300/60 hover:bg-white/90 hover:shadow-[0_20px_64px_rgba(99,102,241,0.12)] hover:-translate-y-2 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 to-purple-50/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="relative flex items-center gap-5">
                          <span className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-300/40 flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-indigo-500/20 transition-all duration-300">
                            <Icon className="w-7 h-7 text-indigo-600" strokeWidth={2} />
                          </span>
                          <span className="text-base sm:text-lg font-black text-slate-900 group-hover:text-indigo-900 transition-colors">{item}</span>
                        </span>
              </div>
                    )
                  })}
              </div>
                <p className="text-lg sm:text-xl text-slate-700 leading-relaxed text-center italic font-medium max-w-2xl mx-auto">{t.whoText}</p>
                <div className="text-center pt-10">
                  <a
                    href={ctaHref}
                    className="group inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-11 py-6 text-lg font-black text-white shadow-[0_24px_64px_rgba(99,102,241,0.35)] transition-all duration-300 hover:shadow-[0_32px_96px_rgba(99,102,241,0.5)] hover:scale-110 active:scale-95"
                  >
                    <span className="flex items-center gap-3">
                      {t.whoCta}
                      <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  </a>
              </div>
            </div>
              </div>
              </div>

          {/* RESULT */}
          <div
            ref={(el) => { sectionsRef.current[3] = el }}
            className={`transition-all duration-1000 delay-[450ms] ${visibleSections.has(3) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-white/60 backdrop-blur-3xl border border-white/40 rounded-[40px] p-10 sm:p-14 shadow-[0_32px_120px_rgba(0,0,0,0.08)] overflow-hidden hover:shadow-[0_48px_160px_rgba(16,185,129,0.12)] transition-all duration-700">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 via-white/40 to-teal-50/50 -z-10" />
              
              <div className="space-y-12">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 text-center tracking-tight">
                  {t.resultTitle}
            </h2>
                <div className="grid sm:grid-cols-2 gap-7">
                  {t.resultBullets.map((item, idx) => (
                    <div
                      key={idx}
                      className="group relative bg-white/70 backdrop-blur-xl border border-emerald-300/40 rounded-[28px] p-8 shadow-[0_16px_48px_rgba(0,0,0,0.06)] transition-all duration-300 hover:border-emerald-400/60 hover:bg-white/90 hover:shadow-[0_24px_80px_rgba(16,185,129,0.15)] hover:-translate-y-3"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-teal-50/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[28px]" />
                      <div className="relative flex items-start gap-5">
                        <span className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-emerald-500/30 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-emerald-500/40 transition-all duration-300">
                          ✓
                        </span>
                        <div className="flex-1 space-y-2.5">
                          <p className="text-base sm:text-lg font-black text-slate-900 leading-tight tracking-tight">{item.text}</p>
                          {item.stat && (
                            <p className="text-sm sm:text-base text-emerald-700 font-bold">{item.stat}</p>
                          )}
          </div>
              </div>
              </div>
                  ))}
              </div>
                <div className="text-center pt-10">
                  <a
                    href={ctaHref}
                    className="group inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-11 py-6 text-lg font-black text-white shadow-[0_24px_64px_rgba(99,102,241,0.35)] transition-all duration-300 hover:shadow-[0_32px_96px_rgba(99,102,241,0.5)] hover:scale-110 active:scale-95"
                  >
                    <span className="flex items-center gap-3">
                      {t.resultCta}
                      <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  </a>
              </div>

                {/* PILOT (2 months) */}
                <div className="pt-12 border-t border-slate-200/60">
                  <div className="relative rounded-[40px] border border-amber-300/50 bg-gradient-to-br from-amber-50/90 via-yellow-50/80 to-orange-50/70 backdrop-blur-2xl p-10 sm:p-12 shadow-[0_32px_120px_rgba(245,158,11,0.12)] overflow-hidden hover:shadow-[0_48px_160px_rgba(245,158,11,0.2)] transition-all duration-700">
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-amber-200/30 to-orange-200/20 blur-3xl rounded-full" />
                    <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-yellow-200/25 to-transparent blur-3xl rounded-full" />
                    <div className="relative space-y-8">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                        <div className="flex-1 space-y-5 max-w-3xl">
                          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 border border-amber-400/50 shadow-sm">
                            <div className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-800">🚀 {t.pilotBadge}</div>
                          </div>
                          <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight">{t.pilotTitle}</h3>
                          <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-medium">{t.pilotSubtitle}</p>
                          <div className="flex flex-wrap gap-3 pt-2 text-xs font-black">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-amber-300/50 px-4 py-2 text-slate-800 shadow-sm">
                              ⚡ {lang === 'ua' ? 'Запуск' : lang === 'ru' ? 'Запуск' : 'Launch'}: {pilotLaunch}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-amber-300/50 px-4 py-2 text-slate-800 shadow-sm">
                              💶 {fmtEur(pilot.setupEur)} + {fmtEur(pilot.supportEurPerMonth)}/{profileLang === 'ua' ? 'міс' : 'мес'} × {pilot.durationMonths}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-amber-300/50 px-4 py-2 text-slate-800 shadow-sm">
                              📡 {lang === 'ua' ? 'Канали' : lang === 'ru' ? 'Каналы' : 'Channels'}: 1–{pilot.includedChannelsUpTo}
                            </span>
                          </div>
                        </div>
                        <a
                          href="/flow?src=pilot"
                          className="group inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 text-slate-900 px-9 py-5 text-lg font-black hover:from-amber-300 hover:via-yellow-300 hover:to-orange-300 hover:scale-110 active:scale-95 transition-all duration-300 shadow-[0_20px_64px_rgba(245,158,11,0.4)] hover:shadow-[0_28px_88px_rgba(245,158,11,0.6)] whitespace-nowrap"
                        >
                          <span className="flex items-center gap-2.5">
                            {t.pilotCta}
                            <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                          </span>
                        </a>
                      </div>

                      <div className="grid lg:grid-cols-2 gap-7">
                        <div className="rounded-[28px] bg-white/70 backdrop-blur-xl border border-emerald-300/40 p-7 shadow-lg">
                          <p className="text-xs font-black text-emerald-900 uppercase tracking-[0.25em]">{t.pilotIncludesTitle}</p>
                          <ul className="mt-5 space-y-3">
                            {pilotIncluded.slice(0, 7).map((x) => (
                              <li key={x} className="flex items-start gap-3 text-sm text-slate-800 leading-relaxed font-medium">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                                <span>{x}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="pt-5 text-xs text-slate-700 font-semibold border-t border-slate-200/60 mt-5">
                            {lang === 'ua' ? 'Канали на вибір:' : lang === 'ru' ? 'Каналы на выбор:' : 'Choose channels:'} {pilotChannels.join(' / ')}
                          </div>
                        </div>
                        <div className="rounded-[28px] bg-white/70 backdrop-blur-xl border border-slate-300/40 p-7 shadow-lg">
                          <p className="text-xs font-black text-slate-700 uppercase tracking-[0.25em]">{t.pilotNotIncludesTitle}</p>
                          <ul className="mt-5 space-y-3">
                            {pilotNotIncluded.slice(0, 6).map((x) => (
                              <li key={x} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed font-medium">
                                <span className="mt-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-slate-200/60 border border-slate-300/50 text-[11px] font-black text-slate-600 flex-shrink-0">
                                  !
                                </span>
                                <span>{x}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PRICING */}
                <div className="pt-12 border-t border-slate-200/60 space-y-12">
                  <div className="space-y-4 text-center">
                    <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">{t.pricingTitle}</h3>
                    <p className="text-base sm:text-lg text-slate-700 max-w-3xl mx-auto font-medium leading-relaxed">{t.pricingSubtitle}</p>
                  </div>

                  {/* Packages (premium cards) */}
                  <div className="md:grid md:gap-6 md:grid-cols-3 flex gap-4 overflow-x-auto pb-3 -mx-4 sm:-mx-8 lg:-mx-12 2xl:-mx-16 px-4 sm:px-8 lg:px-12 2xl:px-16 snap-x snap-mandatory scroll-px-4">
                    {pricing.map((p) => {
                      const isPopular = p.key === 'business'
                      return (
                        <div
                          key={p.key}
                          className={`relative rounded-[36px] border p-9 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_36px_120px_rgba(99,102,241,0.15)] snap-start flex-shrink-0 w-[88%] sm:w-[70%] md:w-auto ${
                            isPopular
                              ? 'border-indigo-400/60 bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-white/70 scale-110 shadow-[0_32px_120px_rgba(99,102,241,0.2)]'
                              : 'border-slate-200/60 bg-white/70 hover:border-indigo-300/50 hover:scale-105'
                          }`}
                        >
                          <div className="space-y-6">
                            {isPopular && (
                              <div className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-5 py-2 text-xs font-black text-white shadow-lg shadow-indigo-500/30">
                                <Sparkles className="w-4 h-4" /> {profileLang === 'ua' ? 'Найпопулярніший' : 'Самый популярный'}
                              </div>
                            )}
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-xs font-black text-slate-600 uppercase tracking-[0.25em]">{p.name}</p>
                                <p className="text-xl font-black text-slate-900 leading-tight pt-2">{p.title}</p>
                              </div>
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-300/40 flex items-center justify-center shadow-sm">
                                <Shield className="w-7 h-7 text-indigo-600" strokeWidth={2} />
                              </div>
                            </div>

                            <div className="rounded-[24px] bg-white/80 backdrop-blur-xl border border-slate-200/60 p-6 space-y-3 shadow-lg">
                              <div className="flex items-center justify-between text-sm sm:text-base">
                                <span className="text-slate-600 font-semibold">{profileLang === 'ua' ? 'Впровадження' : 'Внедрение'}</span>
                                <span className="text-slate-900 font-black text-xl sm:text-2xl">
                                  {p.setup}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm sm:text-base">
                                <span className="text-slate-600 font-semibold">{profileLang === 'ua' ? 'Підтримка' : 'Поддержка'}</span>
                                <span className="text-slate-900 font-black text-xl sm:text-2xl">
                                  {p.support}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600 font-semibold">{profileLang === 'ua' ? 'Мін. строк' : 'Мин. срок'}</span>
                                <span className="text-slate-900 font-black">
                                  {p.minMonths} {profileLang === 'ua' ? 'міс' : 'мес'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600 font-semibold">{profileLang === 'ua' ? 'Канали' : 'Каналы'}</span>
                                <span className="text-slate-900 font-black">≤ {p.channels}</span>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <p className="text-xs font-black text-slate-600 uppercase tracking-[0.25em]">{profileLang === 'ua' ? 'Що ви отримуєте' : 'Что вы получаете'}</p>
                              <ul className="space-y-3">
                                {p.what.slice(0, 6).map((x) => (
                                  <li key={x} className="flex items-start gap-3 text-sm text-slate-800 leading-relaxed font-medium">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                                    <span>{x}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="space-y-4 pt-2">
                              <p className="text-xs font-black text-slate-600 uppercase tracking-[0.25em]">{profileLang === 'ua' ? 'Підтримка включає' : 'Поддержка включает'}</p>
                              <ul className="space-y-3">
                                {p.supportInc.slice(0, 4).map((x) => (
                                  <li key={x} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed font-medium">
                                    <Users className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
                                    <span>{x}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <p className="text-sm text-slate-700 leading-relaxed border-t border-slate-200/60 pt-5 font-medium">{p.fits}</p>

                            <a
                              href={ctaHref}
                              className={`group inline-flex w-full items-center justify-center rounded-2xl px-6 py-5 text-base font-black transition-all duration-300 hover:scale-105 active:scale-95 ${
                                isPopular
                                  ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-[0_24px_64px_rgba(99,102,241,0.4)] hover:shadow-[0_32px_96px_rgba(99,102,241,0.6)]'
                                  : 'bg-white/90 border-2 border-slate-300/60 text-slate-900 hover:bg-white hover:border-indigo-400/60 shadow-lg hover:shadow-xl hover:shadow-indigo-500/10'
                              }`}
                            >
                              <span className="flex items-center gap-2.5">
                                {profileLang === 'ua' ? 'Обговорити під мій бізнес' : 'Обсудить под мой бизнес'}
                                <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                              </span>
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Add-ons */}
                  <div className="space-y-6">
                    <h4 className="text-xl sm:text-3xl font-black text-slate-900 text-center">{t.addonsTitle}</h4>
                    <div className="lg:grid lg:gap-7 lg:grid-cols-2 flex gap-6 overflow-x-auto pb-4 -mx-4 sm:-mx-8 lg:-mx-12 2xl:-mx-16 px-4 sm:px-8 lg:px-12 2xl:px-16 snap-x snap-mandatory scroll-px-4">
                      {addons.map((a) => (
                        <div
                          key={a.key}
                          className="rounded-[32px] bg-white/70 backdrop-blur-xl border border-slate-200/60 p-8 hover:border-indigo-300/50 hover:bg-white/90 hover:scale-105 hover:shadow-[0_24px_80px_rgba(99,102,241,0.12)] transition-all duration-300 snap-start flex-shrink-0 w-[88%] sm:w-[70%] lg:w-auto"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-3">
                              <p className="text-lg font-black text-slate-900">{a.title}</p>
                              <div className="flex flex-wrap gap-2.5 text-xs font-bold">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100/80 border border-indigo-300/40 px-4 py-1.5 text-indigo-800">
                                  <Plus className="w-3.5 h-3.5" /> {a.setup} {profileLang === 'ua' ? 'підключення' : 'подключение'}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100/80 border border-purple-300/40 px-4 py-1.5 text-purple-800">
                                  <Calendar className="w-3.5 h-3.5" /> {a.monthly}
                                </span>
                              </div>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-300/40 flex items-center justify-center shadow-sm">
                              <Zap className="w-7 h-7 text-indigo-600" strokeWidth={2} />
                            </div>
                          </div>
                          <ul className="pt-5 space-y-3">
                            {a.includes.slice(0, 4).map((x) => (
                              <li key={x} className="flex items-start gap-3 text-sm text-slate-800 leading-relaxed font-medium">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                                <span>{x}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FAQ (accordion) */}
                  <div className="space-y-10">
                    <h4 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 text-center tracking-tight">{t.faqTitle}</h4>
                    <div className="grid gap-5">
                      {faq.map((x, idx) => {
                        const open = faqOpen === idx
                        return (
                          <button
                            key={x.q}
                            type="button"
                            onClick={() => setFaqOpen((p) => (p === idx ? null : idx))}
                            className={`text-left rounded-[32px] bg-white/70 backdrop-blur-xl border px-8 py-7 hover:bg-white/90 hover:shadow-2xl transition-all duration-300 ${open ? 'border-indigo-400/60 bg-white/90 shadow-[0_24px_80px_rgba(99,102,241,0.2)]' : 'border-slate-200/60 shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:border-indigo-300/50'}`}
                          >
                            <div className="flex items-start justify-between gap-6">
                              <div className="flex-1 space-y-1">
                                <p className="text-lg sm:text-xl font-black text-slate-900 leading-tight">{x.q}</p>
                                {open && <p className="text-sm sm:text-base text-slate-700 leading-relaxed pt-4 font-medium">{x.a}</p>}
                              </div>
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${open ? 'bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-pink-500/10 border border-indigo-400/50 shadow-lg shadow-indigo-500/20' : 'bg-slate-100/80 border border-slate-300/60'}`}>
                                <Plus className={`w-6 h-6 transition-all duration-300 ${open ? 'rotate-45 text-indigo-600' : 'text-slate-600'}`} strokeWidth={2.5} />
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>

          {/* FORM */}
          <div
            ref={(el) => { sectionsRef.current[4] = el }}
            className={`transition-all duration-1000 delay-[600ms] ${visibleSections.has(4) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-white/60 backdrop-blur-3xl border border-white/40 rounded-[40px] p-12 sm:p-16 shadow-[0_32px_120px_rgba(99,102,241,0.12)] overflow-hidden hover:shadow-[0_48px_160px_rgba(99,102,241,0.18)] transition-all duration-700">
              <div className="absolute -top-28 -right-28 w-80 h-80 bg-gradient-to-br from-indigo-200/40 via-purple-200/30 to-pink-200/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-gradient-to-tr from-blue-200/30 to-transparent rounded-full blur-3xl" />
              
              <div className="relative space-y-12">
                <div className="space-y-5 text-center">
                  <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight">
                    {t.formTitle}
                  </h2>
                  <p className="text-lg sm:text-xl text-slate-700 leading-relaxed max-w-2xl mx-auto font-medium">{t.formSubtitle}</p>
          </div>
                <form className="space-y-8 max-w-2xl mx-auto" onSubmit={onSubmit}>
                  <div className="grid sm:grid-cols-2 gap-7">
                    <div className="space-y-3">
                      <label className="text-sm text-slate-700 font-bold">{t.name}</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-300/60 px-6 py-5 text-slate-900 text-base placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-lg"
                        placeholder={t.name}
                        type="text"
                      />
            </div>
                    <div className="space-y-3">
                      <label className="text-sm text-slate-700 font-bold">{t.contact}</label>
                      <input
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="w-full rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-300/60 px-6 py-5 text-slate-900 text-base placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-lg"
                        placeholder={t.contact}
                        type="text"
                        required
                      />
            </div>
            </div>
                  <div className="space-y-3">
                    <label className="text-sm text-slate-700 font-bold">{t.comment}</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-300/60 px-6 py-5 text-slate-900 text-base placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-lg resize-none"
                      placeholder={t.comment}
                    />
            </div>

                  {error && <p className="text-sm text-red-600 font-bold flex items-center justify-center gap-2 py-2">⚠️ {error}</p>}
                  {success && <p className="text-sm text-emerald-700 font-bold flex items-center justify-center gap-2 py-2">✓ {success}</p>}

                  <div className="text-center pt-8">
                    <button
                      type="submit"
                      disabled={loading}
                      className="group/btn relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-14 py-7 text-xl font-black text-white shadow-[0_28px_88px_rgba(99,102,241,0.5)] transition-all duration-300 hover:shadow-[0_36px_120px_rgba(99,102,241,0.7)] hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                      <span className="relative flex items-center gap-3">
                        {loading ? '⏳' : t.formCta}
                        {!loading && <span className="text-2xl group-hover/btn:translate-x-1 transition-transform">✨</span>}
                      </span>
                    </button>
                      </div>
                </form>
                
                <div className="flex items-center justify-center gap-3 pt-8 text-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_16px_rgba(16,185,129,0.6)]" />
                  <p className="text-sm text-slate-700 italic max-w-2xl font-medium">{t.trustBadge}</p>
                  </div>
                      </div>
                    </div>
                  </div>

          {/* ОПЦИОНАЛЬНО: ИЗОБРАЖЕНИЕ №3 (1:1) — брендовый акцент */}
          {/* 
          <div className="flex justify-center py-16">
            <div className="relative w-48 h-48 rounded-3xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              <img src="/brand-square.jpg" alt="" className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                      </div>
                    </div>
          */}

          <footer className="py-12 text-center">
            <a
              href={aboutHref}
                target="_blank"
                rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-all duration-300 group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:animate-pulse" />
              {t.footerAbout}
            </a>
          </footer>
      </div>
    </main>
    </>
  )
}
