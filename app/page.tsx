'use client'

import { useState, useEffect, useRef } from 'react'

type Lang = 'ua' | 'ru' | 'cz'

type Dict = {
  badge: string
  headerSubtitle: string
  heroTitle: string
  heroSubtitle: string
  ctaPrimary: string
  ctaSecondary: string
  note: string
  howTitle: string
  howSteps: { title: string; text: string }[]
  howCta: string
  whoTitle: string
  whoList: string[]
  whoText: string
  whoCta: string
  resultTitle: string
  resultBullets: string[]
  resultCta: string
  formTitle: string
  formSubtitle: string
  name: string
  contact: string
  comment: string
  formCta: string
  formSuccess: string
  formError: string
  fieldRequired: string
  footerAbout: string
}

const dict: Record<Lang, Dict> = {
  ua: {
    badge: 'Система прийому клієнтів',
    headerSubtitle: 'Система прийому клієнтів',
    heroTitle: 'Клієнт або записався — або пішов до конкурента',
    heroSubtitle:
      'Я будую системи, які автоматично приймають заявки, відповідають клієнтам і фіксують їх без менеджерів і дзвінків',
    ctaPrimary: 'Показати, як це працює (30 секунд)',
    ctaSecondary: 'Демо: як це працює',
    note: 'Це не консультація. Це жива система.',
    howTitle: 'Що відбувається насправді',
    howSteps: [
      { title: 'Клієнт пише або натискає', text: 'Instagram, сайт, реклама — байдуже' },
      { title: 'Система одразу реагує', text: 'Задає питання, фільтрує і формує заявку' },
      { title: 'Ви отримуєте готового клієнта', text: 'Telegram / таблиця / CRM — без хаосу' },
    ],
    howCta: 'Подивитись рішення для мого бізнесу',
    whoTitle: 'Кому це потрібно',
    whoList: ['Барбершопи і салони', 'Автосервіси', 'Курси і школи', 'Сервісні бізнеси', 'Малий та середній бізнес'],
    whoText: 'Якщо клієнти пишуть, дзвонять і губляться — це для вас',
    whoCta: 'Перевірити під свій бізнес',
    resultTitle: 'Що змінюється після впровадження',
    resultBullets: [
      'Клієнти не губляться',
      'Немає дзвінків і ручної переписки',
      'Ви бачите всі заявки',
      'Система працює 24/7',
      'Менше хаосу — більше продажів',
    ],
    resultCta: 'Побачити це в дії',
    formTitle: 'Не хочете розбиратись — напишіть',
    formSubtitle: 'Я покажу, як це може працювати у вас',
    name: 'Імʼя',
    contact: 'Контакт (email або Telegram)',
    comment: 'Короткий коментар (необовʼязково)',
    formCta: 'Отримати рішення',
    formSuccess: 'Запит прийнято. Якщо система підходить — наступний крок реалізація.',
    formError: 'Перевірте контакт і спробуйте ще раз',
    fieldRequired: 'Заповніть поле',
    footerAbout: 'Про мене',
  },
  ru: {
    badge: 'Система приёма клиентов',
    headerSubtitle: 'Система приёма клиентов',
    heroTitle: 'Клиент либо записался — либо ушёл к конкуренту',
    heroSubtitle:
      'Я строю системы, которые автоматически принимают заявки, отвечают клиентам и фиксируют их без менеджеров и звонков',
    ctaPrimary: 'Показать, как это работает (30 секунд)',
    ctaSecondary: 'Демо: как это работает',
    note: 'Это не консультация. Это живая система.',
    howTitle: 'Что происходит на самом деле',
    howSteps: [
      { title: 'Клиент пишет или нажимает', text: 'Instagram, сайт, реклама — не важно' },
      { title: 'Система сразу реагирует', text: 'Задает вопросы, фильтрует и формирует заявку' },
      { title: 'Вы получаете готового клиента', text: 'Telegram / таблица / CRM — без хаоса' },
    ],
    howCta: 'Посмотреть решение для моего бизнеса',
    whoTitle: 'Кому это нужно',
    whoList: ['Барбершопы и салоны', 'Автосервисы', 'Курсы и школы', 'Сервисные бизнесы', 'Малый и средний бизнес'],
    whoText: 'Если клиенты пишут, звонят и теряются — это для вас',
    whoCta: 'Проверить под свой бизнес',
    resultTitle: 'Что меняется после внедрения',
    resultBullets: [
      'Клиенты не теряются',
      'Нет звонков и ручной переписки',
      'Вы видите все заявки',
      'Система работает 24/7',
      'Меньше хаоса — больше продаж',
    ],
    resultCta: 'Увидеть это в действии',
    formTitle: 'Не хотите разбираться — напишите',
    formSubtitle: 'Я покажу, как это может работать у вас',
    name: 'Имя',
    contact: 'Контакт (email или Telegram)',
    comment: 'Короткий комментарий (необязательно)',
    formCta: 'Получить решение',
    formSuccess: 'Запрос принят. Если система подходит — следующий шаг внедрение.',
    formError: 'Проверьте контакт и попробуйте снова',
    fieldRequired: 'Заполните поле',
    footerAbout: 'Обо мне',
  },
  cz: {
    badge: 'Systém pro příjem klientů',
    headerSubtitle: 'Systém pro příjem klientů',
    heroTitle: 'Klient se buď objednal — nebo odešel ke konkurenci',
    heroSubtitle:
      'Stavím systémy, které automaticky přijímají poptávky, odpovídají klientům a ukládají je bez manažerů a hovorů',
    ctaPrimary: 'Ukázat, jak to funguje (30 sekund)',
    ctaSecondary: 'Demo: jak to funguje',
    note: 'Toto není konzultace. Je to hotový systém.',
    howTitle: 'Co se děje ve skutečnosti',
    howSteps: [
      { title: 'Klient píše nebo kliká', text: 'Instagram, web, reklama — je to jedno' },
      { title: 'Systém hned reaguje', text: 'Ptá se, filtruje a vytváří poptávku' },
      { title: 'Dostanete připraveného klienta', text: 'Telegram / tabulka / CRM — bez chaosu' },
    ],
    howCta: 'Podívat se na řešení pro můj byznys',
    whoTitle: 'Komu se to hodí',
    whoList: ['Barbershopy a salony', 'Autoservisy', 'Kurzy a školy', 'Servisní byznysy', 'Malý a střední byznys'],
    whoText: 'Když klienti píšou, volají a ztrácí se — je to pro vás',
    whoCta: 'Prověřit pro můj byznys',
    resultTitle: 'Co se změní po nasazení',
    resultBullets: [
      'Klienti se neztrácí',
      'Bez hovorů a ruční komunikace',
      'Vidíte všechny poptávky',
      'Systém běží 24/7',
      'Méně chaosu — více prodejů',
    ],
    resultCta: 'Uvidět to v akci',
    formTitle: 'Nechceš to řešit? Napiš',
    formSubtitle: 'Ukážu, jak to může fungovat u tebe',
    name: 'Jméno',
    contact: 'Kontakt (email nebo Telegram)',
    comment: 'Krátký komentář (nepovinné)',
    formCta: 'Získat řešení',
    formSuccess: 'Poptávka přijata. Pokud systém sedí — další krok je implementace.',
    formError: 'Zkontroluj kontakt a zkus znovu',
    fieldRequired: 'Vyplň toto pole',
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
          name: name.trim(),
          contact: contact.trim(),
          question: comment.trim(),
          aiRecommendation: 'site-form',
        }),
      })
      if (!res.ok) throw new Error('submit')
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
          25% { transform: translate(10%, 10%) scale(1.1); }
          50% { transform: translate(-5%, 15%) scale(0.95); }
          75% { transform: translate(-10%, -10%) scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3), 0 0 40px rgba(139, 92, 246, 0.2); }
          50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.6), 0 0 60px rgba(139, 92, 246, 0.4); }
        }
        .animate-gradient { animation: gradient-shift 20s ease-in-out infinite; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 200% 100%;
          animation: shimmer 3s infinite;
        }
        .animate-glow { animation: glow-pulse 3s ease-in-out infinite; }
      `}</style>

      <main className="relative min-h-screen bg-slate-950 text-white overflow-x-hidden">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950" />
          <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-gradient" />
          <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl animate-gradient" style={{ animationDelay: '-10s' }} />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-float" />
        </div>

        <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <img src="/logo.png" alt="TemoWeb" className="h-10 w-10 rounded-xl border border-white/10 shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3" />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-200 font-bold">TemoWeb</p>
                <p className="text-[11px] text-slate-400">{t.headerSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(['ua', 'ru', 'cz'] as Lang[]).map((lng) => (
                <button
                  key={lng}
                  onClick={() => setLang(lng)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 ${
                    lang === lng
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 border-transparent text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-105'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:scale-105'
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
            <div className="relative bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-900/40 border border-white/10 rounded-[32px] p-8 sm:p-12 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.5)] overflow-hidden group hover:border-white/20 transition-all duration-500">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl" />
              
              <div className="relative space-y-6">
                <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 px-4 py-2 text-xs text-indigo-100 uppercase tracking-[0.2em] font-bold backdrop-blur-sm shadow-lg">
                  ⚡ {t.badge}
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] bg-gradient-to-br from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  {t.heroTitle}
                </h1>
                <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-3xl">
                  {t.heroSubtitle}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <a
                    href={ctaHref}
                    className="group/btn relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-8 py-4 text-base font-bold text-white shadow-[0_10px_40px_rgba(99,102,241,0.4)] transition-all duration-300 hover:shadow-[0_15px_50px_rgba(99,102,241,0.6)] hover:scale-105 overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                    <span className="relative">{t.ctaPrimary}</span>
                  </a>
                  <a
                    href={ctaHref}
                    className="inline-flex items-center justify-center rounded-2xl px-8 py-4 text-base font-bold text-white bg-white/10 border border-white/10 backdrop-blur-sm hover:bg-white/15 hover:border-white/20 transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    {t.ctaSecondary}
                  </a>
                </div>
                <p className="text-xs text-slate-400 italic pt-2">{t.note}</p>
              </div>
            </div>
          </div>

          {/* HOW */}
          <div
            ref={(el) => { sectionsRef.current[1] = el }}
            className={`transition-all duration-1000 delay-150 ${visibleSections.has(1) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-white/10 rounded-[32px] p-8 sm:p-12 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.4)] overflow-hidden hover:border-white/20 transition-all duration-500">
              <div className="space-y-8">
                <h2 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  {t.howTitle}
                </h2>
                <div className="grid gap-6 sm:grid-cols-3">
                  {t.howSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-sm transition-all duration-500 hover:border-indigo-400/40 hover:shadow-[0_10px_40px_rgba(99,102,241,0.2)] hover:-translate-y-1 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm font-black shadow-lg">
                            {idx + 1}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white leading-snug">{step.title}</h3>
                        <p className="text-sm text-slate-300 leading-relaxed">{step.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <a
                  href={ctaHref}
                  className="inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-sm font-bold text-white bg-white/10 border border-white/10 backdrop-blur-sm hover:bg-white/15 hover:border-white/20 transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  {t.howCta}
                </a>
              </div>
            </div>
          </div>

          {/* WHO */}
          <div
            ref={(el) => { sectionsRef.current[2] = el }}
            className={`transition-all duration-1000 delay-300 ${visibleSections.has(2) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-white/10 rounded-[32px] p-8 sm:p-12 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.4)] overflow-hidden hover:border-white/20 transition-all duration-500">
              <div className="space-y-8">
                <h2 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  {t.whoTitle}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {t.whoList.map((item, idx) => (
                    <div
                      key={idx}
                      className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl px-5 py-4 text-sm font-semibold text-slate-200 backdrop-blur-sm transition-all duration-300 hover:border-indigo-400/40 hover:bg-white/10 hover:text-white hover:shadow-[0_5px_20px_rgba(99,102,241,0.15)] hover:-translate-y-0.5 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="relative flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:animate-pulse" />
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-base text-slate-300 leading-relaxed italic">{t.whoText}</p>
                <a
                  href={ctaHref}
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-4 text-base font-bold text-white shadow-[0_10px_40px_rgba(99,102,241,0.4)] transition-all duration-300 hover:shadow-[0_15px_50px_rgba(99,102,241,0.6)] hover:scale-105"
                >
                  {t.whoCta}
                </a>
              </div>
            </div>
          </div>

          {/* RESULT */}
          <div
            ref={(el) => { sectionsRef.current[3] = el }}
            className={`transition-all duration-1000 delay-[450ms] ${visibleSections.has(3) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-white/10 rounded-[32px] p-8 sm:p-12 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.4)] overflow-hidden hover:border-white/20 transition-all duration-500">
              <div className="space-y-8">
                <h2 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  {t.resultTitle}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {t.resultBullets.map((item, idx) => (
                    <div
                      key={idx}
                      className="group relative bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-400/20 rounded-xl px-5 py-4 text-sm font-semibold text-slate-200 backdrop-blur-sm transition-all duration-300 hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-white hover:shadow-[0_5px_25px_rgba(16,185,129,0.2)] hover:-translate-y-0.5"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white text-xs font-black shadow-lg">
                          ✓
                        </span>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
                <a
                  href={ctaHref}
                  className="inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-sm font-bold text-white bg-white/10 border border-white/10 backdrop-blur-sm hover:bg-white/15 hover:border-white/20 transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  {t.resultCta}
                </a>
              </div>
            </div>
          </div>

          {/* FORM */}
          <div
            ref={(el) => { sectionsRef.current[4] = el }}
            className={`transition-all duration-1000 delay-[600ms] ${visibleSections.has(4) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-white/10 rounded-[32px] p-8 sm:p-12 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.5)] overflow-hidden hover:border-white/20 transition-all duration-500">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl" />
              
              <div className="relative space-y-8">
                <div className="space-y-3">
                  <h2 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    {t.formTitle}
                  </h2>
                  <p className="text-base text-slate-300 leading-relaxed">{t.formSubtitle}</p>
                </div>
                <form className="space-y-6" onSubmit={onSubmit}>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm text-slate-300 font-semibold">{t.name}</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-5 py-3.5 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 focus:bg-slate-900/80 transition-all backdrop-blur-sm shadow-inner"
                        placeholder={t.name}
                        type="text"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-300 font-semibold">{t.contact}</label>
                      <input
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-5 py-3.5 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 focus:bg-slate-900/80 transition-all backdrop-blur-sm shadow-inner"
                        placeholder={t.contact}
                        type="text"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300 font-semibold">{t.comment}</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-5 py-3.5 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 focus:bg-slate-900/80 transition-all backdrop-blur-sm shadow-inner resize-none"
                      placeholder={t.comment}
                    />
                  </div>

                  {error && <p className="text-sm text-amber-300 font-semibold flex items-center gap-2">⚠️ {error}</p>}
                  {success && <p className="text-sm text-emerald-300 font-semibold flex items-center gap-2">✓ {success}</p>}

                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="group/btn relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-8 py-4 text-base font-bold text-white shadow-[0_10px_40px_rgba(99,102,241,0.4)] transition-all duration-300 hover:shadow-[0_15px_50px_rgba(99,102,241,0.6)] hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                      <span className="relative">{loading ? '...' : t.formCta}</span>
                    </button>
                    <span className="text-xs text-slate-400 italic">{t.note}</span>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <footer className="py-12 text-center">
            <a
              href={aboutHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-all duration-300 group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:animate-pulse" />
              {t.footerAbout}
            </a>
          </footer>
        </div>
      </main>
    </>
  )
}
