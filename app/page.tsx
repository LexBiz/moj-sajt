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

  const pricing = (() => {
    const p = TEMOWEB_PROFILE.packages
    const fmt = (n: number) => `${n.toLocaleString('ru-RU')} €`
    const pack = (key: 'start' | 'business' | 'pro') => {
      const x = p[key]
      return {
        key,
        name: key.toUpperCase(),
        title: profileLang === 'ua' ? x.titleUa : x.titleRu,
        setup: fmt(x.setupEur),
        support: `${fmt(x.supportEurPerMonth)}/${profileLang === 'ua' ? 'міс' : 'мес'}`,
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
    const fmt = (n: number) => `${n.toLocaleString('ru-RU')} €`
    const title = profileLang === 'ua' ? a.titleUa : a.titleRu
    const includes = profileLang === 'ua' ? a.includesUa : a.includesRu
    const setup = a.setupEur > 0 ? `+${fmt(a.setupEur)}` : '—'
    const monthly = a.supportEurPerMonth > 0 ? `+${fmt(a.supportEurPerMonth)}/${profileLang === 'ua' ? 'міс' : 'мес'}` : '—'
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
      // DEMO MODE: keep the form for video/visuals, but do NOT send anything anywhere.
      await new Promise((r) => setTimeout(r, 350))

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

      <main className="relative min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white overflow-x-hidden">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          {/* Hex grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 52px'
          }} />
          {/* Subtle glow */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-3xl" />
          </div>

        <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0f172a]/80 border-b border-white/5 shadow-lg shadow-black/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <img src="/logo.png" alt="TemoWeb" className="h-10 w-10 rounded-xl border border-white/10 shadow-lg transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white font-bold">TemoWeb</p>
                <p className="text-[11px] text-white/60">{t.headerSubtitle}</p>
            </div>
            </div>
            <div className="flex items-center gap-2">
              {(['ua', 'ru', 'cz'] as Lang[]).map((lng) => (
            <button
                  key={lng}
                  onClick={() => setLang(lng)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 ${
                    lang === lng
                      ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 hover:scale-105'
                  }`}
                >
                  {lng.toUpperCase()}
            </button>
              ))}
          </div>
        </div>
      </header>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-16 sm:space-y-24">
          {/* HERO */}
          <div
            ref={(el) => { sectionsRef.current[0] = el }}
            className={`relative transition-all duration-1000 ${visibleSections.has(0) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 sm:p-12 lg:p-16 shadow-[0_20px_80px_rgba(0,0,0,0.3)] overflow-hidden group hover:border-white/20 hover:shadow-[0_25px_100px_rgba(0,0,0,0.4)] transition-all duration-500">
              {/* TWO-COLUMN LAYOUT: text left, image right */}
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                {/* LEFT: TEXT CONTENT */}
                <div className="space-y-6 lg:pr-8">
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/30 px-4 py-2 text-xs text-blue-400 uppercase tracking-[0.2em] font-bold">
                    ⚡ {t.badge}
                </span>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-[1.05] text-white" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
                {t.heroTitle}
              </h1>
                  <p className="text-base sm:text-lg lg:text-xl text-white/70 leading-relaxed">
                    {t.heroSubtitle}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <a
                      href={ctaHref}
                      className="group/btn relative inline-flex items-center justify-center rounded-2xl bg-blue-500 px-8 py-4 text-base sm:text-lg font-bold text-white shadow-[0_20px_50px_rgba(59,130,246,0.3)] transition-all duration-300 hover:bg-blue-400 hover:shadow-[0_25px_60px_rgba(59,130,246,0.4)] hover:scale-105 overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-blue-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                      <span className="relative flex items-center gap-2">
                        <span>{t.ctaPrimary}</span>
                        <span className="text-xl">→</span>
                      </span>
                </a>
                <a
                      href={ctaHref}
                      className="inline-flex items-center justify-center rounded-2xl px-6 py-4 text-base sm:text-lg font-bold text-white bg-white/5 border-2 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
                >
                      {t.ctaSecondary}
                </a>
              </div>
                  <p className="text-xs sm:text-sm text-white/50 font-medium">{t.ctaNote}</p>
            </div>
            
                {/* RIGHT: SORA IMAGE */}
                <div className="relative aspect-[4/3] lg:aspect-square rounded-3xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.4)] group-hover:shadow-[0_30px_80px_rgba(59,130,246,0.3)] transition-all order-first lg:order-last">
                  <img 
                    src="/hero-ai.jpg" 
                    alt="AI automation system" 
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/60 to-transparent" />
                  {/* Glow behind image */}
                  <div className="absolute -inset-4 bg-blue-500/20 blur-2xl opacity-50 -z-10" />
                    </div>
                      </div>
                    </div>
                  </div>
                  
          {/* HOW */}
          <div
            ref={(el) => { sectionsRef.current[1] = el }}
            className={`transition-all duration-1000 delay-150 ${visibleSections.has(1) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 sm:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.08)] overflow-hidden hover:shadow-[0_25px_100px_rgba(0,0,0,0.12)] transition-all duration-500">
              {/* ИЗОБРАЖЕНИЕ №2 (21:9) — Sora flow background */}
              <div className="absolute inset-0 opacity-20">
                <img src="/flow-bg.jpg" alt="" className="w-full h-full object-cover" />
                        </div>
              <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/60 via-[#1e293b]/80 to-[#0f172a]/90" />
              
              <div className="relative space-y-10">
                <h2 className="text-3xl sm:text-5xl font-black text-white text-center">
                  {t.howTitle}
            </h2>
                <div className="grid gap-8 sm:grid-cols-3">
                  {t.howSteps.map((step, idx) => {
                    const icons = [MessageSquare, Zap, CheckCircle2]
                    const Icon = icons[idx]
                    return (
                      <div
                        key={idx}
                        className="group relative bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-8 shadow-md transition-all duration-500 hover:border-white/20 hover:shadow-[0_20px_60px_rgba(59,130,246,0.2)] hover:-translate-y-2 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative space-y-4 text-center">
                          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon className="w-8 h-8 text-white/80" strokeWidth={1.5} />
          </div>
                          <div className="w-12 mx-auto h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                          <h3 className="text-xl font-black text-white leading-snug">{step.title}</h3>
                          <p className="text-sm text-white/70 leading-relaxed">{step.text}</p>
                </div>
              </div>
                    )
                  })}
            </div>
                <div className="text-center pt-4">
                  <a
                    href={ctaHref}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-blue-500 px-10 py-5 text-lg font-black text-white shadow-[0_15px_50px_rgba(99,102,241,0.4)] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)] hover:scale-110"
                  >
                    {t.howCta}
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
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 sm:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.3)] overflow-hidden hover:border-white/20 hover:shadow-[0_25px_100px_rgba(0,0,0,0.4)] transition-all duration-500">
              <div className="space-y-10">
                <h2 className="text-3xl sm:text-5xl font-black text-white text-center">
                  {t.whoTitle}
            </h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  {t.whoList.map((item, idx) => {
                    const whoIcons = [Scissors, Car, GraduationCap, Wrench, Briefcase]
                    const Icon = whoIcons[idx] || Briefcase
                    return (
                      <div
                        key={idx}
                        className="group relative bg-white/5 backdrop-blur border border-white/10 rounded-2xl px-6 py-5 shadow-sm transition-all duration-300 hover:border-white/20 hover:bg-blue-500/10 hover:shadow-md hover:-translate-y-1 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="relative flex items-center gap-4">
                          <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon className="w-5 h-5 text-white/80" strokeWidth={1.5} />
                          </span>
                          <span className="text-base font-bold text-white/80 group-hover:text-white transition-colors">{item}</span>
                        </span>
              </div>
                    )
                  })}
              </div>
                <p className="text-lg text-white/70 leading-relaxed text-center italic">{t.whoText}</p>
                <div className="text-center pt-4">
                  <a
                    href={ctaHref}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-blue-500 px-10 py-5 text-lg font-black text-white shadow-[0_15px_50px_rgba(99,102,241,0.4)] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)] hover:scale-110"
                  >
                    {t.whoCta}
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
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 sm:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.08)] overflow-hidden hover:shadow-[0_25px_100px_rgba(0,0,0,0.12)] transition-all duration-500">
              <div className="space-y-10">
                <h2 className="text-3xl sm:text-5xl font-black text-white text-center">
                  {t.resultTitle}
            </h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  {t.resultBullets.map((item, idx) => (
                    <div
                      key={idx}
                      className="group relative bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-400/30 rounded-2xl p-6 shadow-sm transition-all duration-300 hover:border-emerald-400/50 hover:bg-emerald-500/15 hover:shadow-md hover:-translate-y-1"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-base font-black shadow-md">
                            ✓
                          </span>
                          <div className="space-y-1">
                            <p className="text-base font-bold text-white">{item.text}</p>
                            {item.stat && (
                              <p className="text-sm text-emerald-300 font-semibold">{item.stat}</p>
                            )}
          </div>
              </div>
              </div>
              </div>
                  ))}
              </div>
                <div className="text-center pt-6">
                  <a
                    href={ctaHref}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-blue-500 px-10 py-5 text-lg font-black text-white shadow-[0_15px_50px_rgba(99,102,241,0.4)] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)] hover:scale-110"
                  >
                    {t.resultCta}
                  </a>
              </div>

                {/* PRICING */}
                <div className="pt-10 border-t border-white/10 space-y-10">
                  <div className="space-y-3 text-center">
                    <h3 className="text-2xl sm:text-4xl font-black text-white">{t.pricingTitle}</h3>
                    <p className="text-sm sm:text-base text-white/70 max-w-3xl mx-auto">{t.pricingSubtitle}</p>
                  </div>

                  {/* Packages (premium cards) */}
                  <div className="md:grid md:gap-6 md:grid-cols-3 flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory scroll-px-4">
                    {pricing.map((p) => {
                      const isPopular = p.key === 'business'
                      return (
                        <div
                          key={p.key}
                          className={`relative rounded-[28px] border p-7 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_35px_110px_rgba(0,0,0,0.45)] snap-start flex-shrink-0 w-[88%] sm:w-[70%] md:w-auto ${
                            isPopular
                              ? 'border-blue-400/60 bg-gradient-to-b from-blue-500/10 to-white/5'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className="space-y-5">
                            {isPopular && (
                              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-xs font-black text-white shadow-lg shadow-blue-500/30">
                                <Sparkles className="w-4 h-4" /> {profileLang === 'ua' ? 'Найпопулярніший' : 'Самый популярный'}
                              </div>
                            )}
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold text-white/60 uppercase tracking-[0.2em]">{p.name}</p>
                                <p className="text-lg font-black text-white leading-snug pt-1">{p.title}</p>
                              </div>
                              <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-white/70" />
                              </div>
                            </div>

                            <div className="rounded-2xl bg-black/20 border border-white/10 p-4 space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">{profileLang === 'ua' ? 'Впровадження' : 'Внедрение'}</span>
                                <span className="text-white font-black text-lg sm:text-xl drop-shadow-[0_10px_30px_rgba(255,255,255,0.25)]">
                                  {p.setup}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">{profileLang === 'ua' ? 'Підтримка' : 'Поддержка'}</span>
                                <span className="text-white font-black text-lg sm:text-xl drop-shadow-[0_10px_30px_rgba(255,255,255,0.25)]">
                                  {p.support}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">{profileLang === 'ua' ? 'Мін. строк' : 'Мин. срок'}</span>
                                <span className="text-white font-black">
                                  {p.minMonths} {profileLang === 'ua' ? 'міс' : 'мес'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">{profileLang === 'ua' ? 'Канали' : 'Каналы'}</span>
                                <span className="text-white font-black">≤ {p.channels}</span>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <p className="text-xs font-bold text-white/60 uppercase tracking-[0.18em]">{profileLang === 'ua' ? 'Що ви отримуєте' : 'Что вы получаете'}</p>
                              <ul className="space-y-2">
                                {p.what.slice(0, 6).map((x) => (
                                  <li key={x} className="flex items-start gap-2 text-sm text-white/80 leading-relaxed">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5 flex-shrink-0" />
                                    <span>{x}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="space-y-3 pt-1">
                              <p className="text-xs font-bold text-white/60 uppercase tracking-[0.18em]">{profileLang === 'ua' ? 'Підтримка включає' : 'Поддержка включает'}</p>
                              <ul className="space-y-2">
                                {p.supportInc.slice(0, 4).map((x) => (
                                  <li key={x} className="flex items-start gap-2 text-sm text-white/75 leading-relaxed">
                                    <Users className="w-4 h-4 text-white/50 mt-0.5 flex-shrink-0" />
                                    <span>{x}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <p className="text-sm text-white/70 leading-relaxed border-t border-white/10 pt-4">{p.fits}</p>

                            <a
                              href={ctaHref}
                              className={`inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-base font-black text-white transition-all ${
                                isPopular
                                  ? 'bg-blue-500 hover:bg-blue-400 shadow-[0_18px_50px_rgba(59,130,246,0.35)]'
                                  : 'bg-white/10 border border-white/10 hover:bg-white/15 hover:border-white/20'
                              }`}
                            >
                              {profileLang === 'ua' ? 'Обговорити під мій бізнес' : 'Обсудить под мой бизнес'}
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Add-ons */}
                  <div className="space-y-6">
                    <h4 className="text-xl sm:text-3xl font-black text-white text-center">{t.addonsTitle}</h4>
                    <div className="lg:grid lg:gap-5 lg:grid-cols-2 flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory scroll-px-4">
                      {addons.map((a) => (
                        <div
                          key={a.key}
                          className="rounded-[26px] bg-white/5 border border-white/10 p-6 hover:border-white/20 transition-all snap-start flex-shrink-0 w-[88%] sm:w-[70%] lg:w-auto"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                              <p className="text-base font-black text-white">{a.title}</p>
                              <div className="flex flex-wrap gap-2 text-xs font-bold">
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-white/80">
                                  <Plus className="w-3.5 h-3.5" /> {a.setup} {profileLang === 'ua' ? 'підключення' : 'подключение'}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-white/80">
                                  <Calendar className="w-3.5 h-3.5" /> {a.monthly}
                                </span>
                              </div>
                            </div>
                            <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                              <Zap className="w-5 h-5 text-white/70" />
                            </div>
                          </div>
                          <ul className="pt-4 space-y-2">
                            {a.includes.slice(0, 4).map((x) => (
                              <li key={x} className="flex items-start gap-2 text-sm text-white/75 leading-relaxed">
                                <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5 flex-shrink-0" />
                                <span>{x}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FAQ (accordion) */}
                  <div className="space-y-6">
                    <h4 className="text-xl sm:text-3xl font-black text-white text-center">{t.faqTitle}</h4>
                    <div className="grid gap-3">
                      {faq.map((x, idx) => {
                        const open = faqOpen === idx
                        return (
                          <button
                            key={x.q}
                            type="button"
                            onClick={() => setFaqOpen((p) => (p === idx ? null : idx))}
                            className="text-left rounded-[22px] bg-white/5 border border-white/10 px-6 py-5 hover:border-white/20 transition-all"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <p className="text-base font-black text-white">{x.q}</p>
                                {open && <p className="text-sm text-white/70 leading-relaxed pt-2">{x.a}</p>}
                              </div>
                              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                <Plus className={`w-4 h-4 text-white/70 transition-transform ${open ? 'rotate-45' : ''}`} />
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
            <div className="relative bg-white/5 backdrop-blur-xl border-2 border-white/10 rounded-[32px] p-10 sm:p-14 shadow-[0_30px_100px_rgba(99,102,241,0.12)] overflow-hidden hover:border-white/20 hover:shadow-[0_35px_120px_rgba(99,102,241,0.18)] transition-all duration-500">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-blue-400/10 rounded-full blur-3xl" />
              
              <div className="relative space-y-10">
                <div className="space-y-4 text-center">
                  <h2 className="text-3xl sm:text-5xl font-black text-white">
                    {t.formTitle}
                  </h2>
                  <p className="text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">{t.formSubtitle}</p>
          </div>
                <form className="space-y-6 max-w-2xl mx-auto" onSubmit={onSubmit}>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm text-white/80 font-bold">{t.name}</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl bg-white/5 backdrop-blur border border-white/20 px-5 py-4 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm text-base"
                        placeholder={t.name}
                        type="text"
                      />
            </div>
                    <div className="space-y-2">
                      <label className="text-sm text-white/80 font-bold">{t.contact}</label>
                      <input
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="w-full rounded-xl bg-white/5 backdrop-blur border border-white/20 px-5 py-4 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm text-base"
                        placeholder={t.contact}
                        type="text"
                        required
                      />
            </div>
            </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/80 font-bold">{t.comment}</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl bg-white/5 backdrop-blur border border-white/20 px-5 py-4 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm resize-none text-base"
                      placeholder={t.comment}
                    />
            </div>

                  {error && <p className="text-sm text-red-300 font-bold flex items-center justify-center gap-2">⚠️ {error}</p>}
                  {success && <p className="text-sm text-emerald-300 font-bold flex items-center justify-center gap-2">✓ {success}</p>}

                  <div className="text-center pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="group/btn relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-12 py-6 text-xl font-black text-white shadow-[0_20px_60px_rgba(99,102,241,0.5)] transition-all duration-300 hover:shadow-[0_25px_70px_rgba(99,102,241,0.7)] hover:scale-110 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                      <span className="relative">{loading ? '...' : t.formCta}</span>
                    </button>
                      </div>
                </form>
                
                <div className="flex items-center justify-center gap-3 pt-6 text-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.6)]" />
                  <p className="text-sm text-white/70 italic max-w-2xl">{t.trustBadge}</p>
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
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-all duration-300 group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:animate-pulse" />
              {t.footerAbout}
            </a>
          </footer>
      </div>
    </main>
    </>
  )
}
