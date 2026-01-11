'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Zap, CheckCircle2, Users, Calendar, TrendingUp, Scissors, Car, GraduationCap, Wrench, Briefcase } from 'lucide-react'

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
  packagesTitle: string
  packages: { name: string; price: string; desc: string; cta: string }[]
  pilotTitle: string
  pilotDesc: string
  pilotList: string[]
  pilotCta: string
  pilotNote: string
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
    packagesTitle: 'Пакети',
    packages: [
      { name: 'Пакет 1', price: '600–900 €', desc: 'База: сайт + AI чат + заявки + Telegram.', cta: '⚡️ Замовити' },
      { name: 'Пакет 2', price: '1200–1500 €', desc: 'Більше автоматики: онлайн‑запис, сценарії, статуси.', cta: '⚡️ Замовити' },
      { name: 'Пакет 3', price: '2000–3000 €', desc: 'Максимум: інтеграції, CRM/таблиця, аналітика, кастом.', cta: '⚡️ Замовити' },
    ],
    pilotTitle: '🏎 Пілотні проекти — перші 5 бізнесів отримують систему за $299!',
    pilotDesc: 'Тестуєш систему, бачиш як вона працює. Отримуєш повний пакет — за $299. Місць лише 5.',
    pilotList: ['Сайт + AI чат для клієнтів', 'Автоматичне приймання заявок', 'Онлайн‑запис і Telegram повідомлення'],
    pilotCta: '⚡️ Стати пілотом зараз',
    pilotNote: 'Після 5 бізнесів — повертаємося до стандартних пакетів.',
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
    packagesTitle: 'Пакеты',
    packages: [
      { name: 'Пакет 1', price: '600–900 €', desc: 'База: сайт + AI чат + заявки + Telegram.', cta: '⚡️ Заказать' },
      { name: 'Пакет 2', price: '1200–1500 €', desc: 'Больше автоматики: онлайн‑запись, сценарии, статусы.', cta: '⚡️ Заказать' },
      { name: 'Пакет 3', price: '2000–3000 €', desc: 'Максимум: интеграции, CRM/таблица, аналитика, кастом.', cta: '⚡️ Заказать' },
    ],
    pilotTitle: '🏎 Пилотные проекты — первые 5 бизнесов получают систему за $299!',
    pilotDesc: 'Тестируешь систему, видишь как она работает. Получаешь полный пакет — за $299. Мест всего 5.',
    pilotList: ['Сайт + AI чат для клиентов', 'Автоматический приём заявок', 'Онлайн‑запись и Telegram уведомления'],
    pilotCta: '⚡️ Стать пилотом сейчас',
    pilotNote: 'После 5 бизнесов — возвращаемся к стандартным пакетам.',
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
    packagesTitle: 'Balíčky',
    packages: [
      { name: 'Balíček 1', price: '600–900 €', desc: 'Základ: web + AI chat + poptávky + Telegram.', cta: '⚡️ Objednat' },
      { name: 'Balíček 2', price: '1200–1500 €', desc: 'Více automatiky: online rezervace, scénáře, statusy.', cta: '⚡️ Objednat' },
      { name: 'Balíček 3', price: '2000–3000 €', desc: 'Maximum: integrace, CRM/tabulka, analytika, custom.', cta: '⚡️ Objednat' },
    ],
    pilotTitle: '🏎 Pilotní projekty — prvních 5 firem má systém za $299!',
    pilotDesc: 'Otestuješ systém, uvidíš jak běží. Dostaneš plný balíček — za $299. Jen 5 míst.',
    pilotList: ['Web + AI chat pro klienty', 'Automatický příjem poptávek', 'Online rezervace + Telegram notifikace'],
    pilotCta: '⚡️ Být pilot teď',
    pilotNote: 'Po 5 firmách se vracíme ke standardním balíčkům.',
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

      <main className="relative min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-slate-100 text-slate-900 overflow-x-hidden">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          {/* Subtle dot pattern for premium tech feel */}
          <div className="absolute inset-0 opacity-[0.15]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(100 116 139) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
          {/* Soft mesh gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-200/30 via-transparent to-transparent" />
          {/* Minimal glow accents */}
          <div className="absolute top-0 -left-20 w-96 h-96 bg-slate-300/15 rounded-full blur-3xl animate-gradient" />
          <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] bg-slate-300/15 rounded-full blur-3xl animate-gradient" style={{ animationDelay: '-12s' }} />
        </div>

        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-slate-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <img src="/logo.png" alt="TemoWeb" className="h-10 w-10 rounded-xl border border-gray-200 shadow-md transition-transform group-hover:scale-110 group-hover:rotate-3" />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-300/10 to-slate-400/10 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-700 font-bold">TemoWeb</p>
                <p className="text-[11px] text-slate-600">{t.headerSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(['ua', 'ru', 'cz'] as Lang[]).map((lng) => (
                <button
                  key={lng}
                  onClick={() => setLang(lng)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 ${
                    lang === lng
                      ? 'bg-gradient-to-r from-slate-800 to-slate-700 border-transparent text-white shadow-lg scale-105'
                      : 'bg-white border-gray-200 text-slate-700 hover:bg-gray-50 hover:border-gray-300 hover:scale-105 shadow-sm'
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
            <div className="relative bg-white border border-gray-200 rounded-[32px] p-8 sm:p-12 lg:p-16 shadow-[0_20px_80px_rgba(0,0,0,0.08)] overflow-hidden group hover:shadow-[0_25px_100px_rgba(0,0,0,0.12)] transition-all duration-500">
              {/* TWO-COLUMN LAYOUT: text left, image right */}
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                {/* LEFT: TEXT CONTENT */}
                <div className="space-y-6 lg:pr-8">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-300 px-4 py-2 text-xs text-slate-700 uppercase tracking-[0.2em] font-bold shadow-sm">
                    ⚡ {t.badge}
                  </span>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-[1.1] bg-gradient-to-br from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">
                    {t.heroTitle}
                  </h1>
                  <p className="text-base sm:text-lg lg:text-xl text-slate-700 leading-relaxed">
                    {t.heroSubtitle}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <a
                      href={ctaHref}
                      className="group/btn relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-8 py-4 text-base sm:text-lg font-black text-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] transition-all duration-300 hover:shadow-[0_25px_70px_rgba(0,0,0,0.25)] hover:scale-105 overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                      <span className="relative flex items-center gap-2">
                        <span>{t.ctaPrimary}</span>
                        <span className="text-xl">→</span>
                      </span>
                    </a>
                    <a
                      href={ctaHref}
                      className="inline-flex items-center justify-center rounded-2xl px-6 py-4 text-base sm:text-lg font-bold text-slate-700 bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 hover:scale-105 shadow-md"
                    >
                      {t.ctaSecondary}
                    </a>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold">{t.ctaNote}</p>
                </div>

                {/* RIGHT: SORA IMAGE */}
                <div className="relative aspect-[4/3] lg:aspect-square rounded-3xl overflow-hidden border-2 border-gray-200 shadow-[0_20px_60px_rgba(0,0,0,0.12)] group-hover:shadow-[0_25px_80px_rgba(0,0,0,0.16)] transition-shadow order-first lg:order-last">
                  <img 
                    src="/hero-ai.jpg" 
                    alt="AI automation system" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />
                </div>
              </div>
            </div>
          </div>

          {/* HOW */}
          <div
            ref={(el) => { sectionsRef.current[1] = el }}
            className={`transition-all duration-1000 delay-150 ${visibleSections.has(1) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-white border border-gray-200 rounded-[32px] p-8 sm:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.08)] overflow-hidden hover:shadow-[0_25px_100px_rgba(0,0,0,0.12)] transition-all duration-500">
              {/* ИЗОБРАЖЕНИЕ №2 (21:9) — Sora flow background */}
              <div className="absolute inset-0 opacity-20">
                <img src="/flow-bg.jpg" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-white/90 to-white/95" />
              
              <div className="relative space-y-10">
                <h2 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent text-center">
                  {t.howTitle}
                </h2>
                <div className="grid gap-8 sm:grid-cols-3">
                  {t.howSteps.map((step, idx) => {
                    const icons = [MessageSquare, Zap, CheckCircle2]
                    const Icon = icons[idx]
                    return (
                      <div
                        key={idx}
                        className="group relative bg-white border border-slate-200 rounded-3xl p-8 shadow-md transition-all duration-500 hover:border-slate-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)] hover:-translate-y-2 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative space-y-4 text-center">
                          <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon className="w-8 h-8 text-slate-700" strokeWidth={1.5} />
                          </div>
                          <div className="w-12 mx-auto h-0.5 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                          <h3 className="text-xl font-black text-slate-900 leading-snug">{step.title}</h3>
                          <p className="text-sm text-slate-600 leading-relaxed">{step.text}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="text-center pt-4">
                  <a
                    href={ctaHref}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 px-10 py-5 text-lg font-black text-white shadow-[0_15px_50px_rgba(0,0,0,0.15)] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)] hover:scale-110"
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
            <div className="relative bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-[32px] p-8 sm:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.06)] overflow-hidden hover:shadow-[0_25px_100px_rgba(0,0,0,0.10)] transition-all duration-500">
              <div className="space-y-10">
                <h2 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent text-center">
                  {t.whoTitle}
                </h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  {t.whoList.map((item, idx) => {
                    const whoIcons = [Scissors, Car, GraduationCap, Wrench, Briefcase]
                    const Icon = whoIcons[idx] || Briefcase
                    return (
                      <div
                        key={idx}
                        className="group relative bg-white border border-gray-200 rounded-2xl px-6 py-5 shadow-sm transition-all duration-300 hover:border-slate-300 hover:bg-slate-50/30 hover:shadow-md hover:-translate-y-1 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="relative flex items-center gap-4">
                          <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon className="w-5 h-5 text-slate-700" strokeWidth={1.5} />
                          </span>
                          <span className="text-base font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{item}</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-lg text-slate-600 leading-relaxed text-center italic">{t.whoText}</p>
                <div className="text-center pt-4">
                  <a
                    href={ctaHref}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 px-10 py-5 text-lg font-black text-white shadow-[0_15px_50px_rgba(0,0,0,0.15)] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)] hover:scale-110"
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
            <div className="relative bg-white border border-gray-200 rounded-[32px] p-8 sm:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.08)] overflow-hidden hover:shadow-[0_25px_100px_rgba(0,0,0,0.12)] transition-all duration-500">
              <div className="space-y-10">
                <h2 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent text-center">
                  {t.resultTitle}
                </h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  {t.resultBullets.map((item, idx) => (
                    <div
                      key={idx}
                      className="group relative bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 shadow-sm transition-all duration-300 hover:border-emerald-300 hover:bg-emerald-100/50 hover:shadow-md hover:-translate-y-1"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-base font-black shadow-md">
                            ✓
                          </span>
                          <div className="space-y-1">
                            <p className="text-base font-bold text-slate-900">{item.text}</p>
                            {item.stat && (
                              <p className="text-sm text-emerald-700 font-semibold">{item.stat}</p>
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
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 px-10 py-5 text-lg font-black text-white shadow-[0_15px_50px_rgba(0,0,0,0.15)] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)] hover:scale-110"
                  >
                    {t.resultCta}
                  </a>
                </div>

                {/* PILOT + PACKAGES (inside the same block to keep the page structure clean) */}
                <div className="pt-10 border-t border-gray-200 space-y-10">
                  {/* PILOT (main focus) */}
                  <div className="relative overflow-hidden rounded-[36px] border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-8 sm:p-12 shadow-[0_35px_120px_rgba(245,158,11,0.18)]">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.4),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(251,146,60,0.3),transparent_60%)]" />
                    <div className="absolute -top-20 -right-20 w-72 h-72 bg-amber-200/30 blur-3xl rounded-full" />
                    <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-orange-200/30 blur-3xl rounded-full" />

                    <div className="relative space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                            {t.pilotTitle}
                          </h3>
                          <p className="text-slate-700 text-sm sm:text-base leading-relaxed max-w-3xl">
                            {t.pilotDesc}
                          </p>
                        </div>
                        <div className="inline-flex items-center justify-center rounded-3xl bg-white border border-amber-300 px-5 py-3 text-xs sm:text-sm font-black text-amber-700 shadow-sm">
                          5 місць / 5 місць / 5 míst
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        {t.pilotList.map((x) => (
                          <div
                            key={x}
                            className="rounded-2xl bg-white border border-amber-200 px-4 py-3 text-sm text-slate-700 shadow-sm"
                          >
                            — {x}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 sm:items-center pt-1">
                        <a
                          href={ctaHref}
                          className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-10 py-5 text-base sm:text-lg font-black text-white hover:from-amber-500 hover:via-orange-600 hover:to-rose-600 hover:scale-105 active:scale-95 transition-all shadow-[0_22px_70px_rgba(251,191,36,0.35)]"
                        >
                          {t.pilotCta} →
                        </a>
                        <p className="text-xs text-slate-600 italic">{t.pilotNote}</p>
                      </div>
                    </div>
                  </div>

                  {/* PACKAGES (background / secondary) */}
                  <div className="space-y-6">
                    <h4 className="text-xl sm:text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent text-center">
                      {t.packagesTitle}
                    </h4>

                    <div className="grid gap-5 lg:grid-cols-3">
                      {t.packages.map((p) => (
                        <div
                          key={p.name}
                          className="group relative bg-white border border-gray-200 rounded-3xl p-7 shadow-sm transition-all duration-300 hover:border-gray-300 hover:shadow-md hover:-translate-y-1"
                        >
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-[0.18em]">{p.name}</p>
                                <p className="text-3xl font-black text-slate-900 leading-tight">{p.price}</p>
                              </div>
                              <div className="w-10 h-10 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-slate-600 shadow-inner">
                                ⚡
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">{p.desc}</p>
                            <a
                              href={ctaHref}
                              className="inline-flex w-full items-center justify-center rounded-2xl bg-gray-100 border border-gray-200 px-6 py-4 text-base font-black text-slate-700 hover:bg-gray-200 hover:border-gray-300 transition-all"
                            >
                              {p.cta}
                            </a>
                          </div>
                        </div>
                      ))}
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
            <div className="relative bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 border-2 border-slate-200 rounded-[32px] p-10 sm:p-14 shadow-[0_30px_100px_rgba(99,102,241,0.12)] overflow-hidden hover:border-slate-300 hover:shadow-[0_35px_120px_rgba(99,102,241,0.18)] transition-all duration-500">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-slate-200/30 rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-slate-200/30 rounded-full blur-3xl" />
              
              <div className="relative space-y-10">
                <div className="space-y-4 text-center">
                  <h2 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">
                    {t.formTitle}
                  </h2>
                  <p className="text-lg text-slate-700 leading-relaxed max-w-2xl mx-auto">{t.formSubtitle}</p>
                </div>
                <form className="space-y-6 max-w-2xl mx-auto" onSubmit={onSubmit}>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm text-slate-700 font-bold">{t.name}</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl bg-white border border-gray-300 px-5 py-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all shadow-sm text-base"
                        placeholder={t.name}
                        type="text"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-700 font-bold">{t.contact}</label>
                      <input
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="w-full rounded-xl bg-white border border-gray-300 px-5 py-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all shadow-sm text-base"
                        placeholder={t.contact}
                        type="text"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-700 font-bold">{t.comment}</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl bg-white border border-gray-300 px-5 py-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all shadow-sm resize-none text-base"
                      placeholder={t.comment}
                    />
                  </div>

                  {error && <p className="text-sm text-red-700 font-bold flex items-center justify-center gap-2">⚠️ {error}</p>}
                  {success && <p className="text-sm text-emerald-700 font-bold flex items-center justify-center gap-2">✓ {success}</p>}

                  <div className="text-center pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="group/btn relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-12 py-6 text-xl font-black text-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] transition-all duration-300 hover:shadow-[0_25px_70px_rgba(0,0,0,0.25)] hover:scale-110 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                      <span className="relative">{loading ? '...' : t.formCta}</span>
                    </button>
                  </div>
                </form>
                
                <div className="flex items-center justify-center gap-3 pt-6 text-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.6)]" />
                  <p className="text-sm text-slate-600 italic max-w-2xl">{t.trustBadge}</p>
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
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:animate-pulse" />
              {t.footerAbout}
            </a>
          </footer>
        </div>
      </main>
    </>
  )
}
