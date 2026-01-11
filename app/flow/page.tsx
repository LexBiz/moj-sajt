'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type StepId = 'intro' | 'business' | 'channel' | 'pain' | 'ai' | 'contact' | 'done'
type Lang = 'ua' | 'ru' | 'cz'

const translations: Record<Lang, Record<string, string>> = {
  ua: {
    systemLabel: 'Система прийому клієнтів',
    heroTitle: 'Система за 30 секунд покаже, яке рішення тобі потрібно, без менеджерів і дзвінків',
    heroDesc: 'Вибери кілька варіантів — і відразу побачиш, як це може працювати саме у твоєму бізнесі.',
    start: '🚀 Почати (30 секунд)',
    hurry: 'Я поспішаю',
    businessQuestion: 'У вас який бізнес?',
    otherBusinessPlaceholder: 'Опишіть свій бізнес (наприклад, салон краси)',
    channelQuestion: 'Звідки зараз до тебе приходять клієнти (або мали б приходити)?',
    otherChannelPlaceholder: 'Додайте свій канал (наприклад, Google Maps, офлайн)',
    painQuestion: 'Що найбільше дратує?',
    otherPainPlaceholder: 'Опишіть, що дратує саме у вас',
    aiTitle: 'Система вже зібрала для тебе рішення.',
    aiDesc: 'Ось як це може працювати саме у твоєму бізнесі. Без менеджерів, без дзвінків.',
    aiShow: 'Показати рішення',
    aiContinue: 'Продовжити оформлення',
    aiBlockTitle: 'Рішення для твого бізнесу',
    contactTitle: 'Хочеш реалізувати це рішення у себе — залиш контакт',
    namePlaceholder: 'Імʼя (необовʼязково)',
    contactPlaceholder: 'Telegram @handle або Email',
    send: 'Надіслати заявку',
    sending: 'Відправляю…',
    back: '← Назад',
    contactNote: 'Без дзвінків. Без менеджерів. Ти вже знаєш, що тобі потрібно.',
    doneTitle: 'Заявка зафіксована.',
    doneDesc: 'Якщо рішення підходить — наступний крок — реалізація.',
    another: 'Заповнити ще одну заявку',
    step: 'Крок',
    ctaPrimary: '⚡ Замовити систему',
    ctaSecondary: '👀 Подивитись, як це працює для мого бізнесу',
    askMore: 'Поставити ще питання',
    aiEmpty: 'Ще немає відповідей. Спробуй задати питання або натисни “Показати рішення”.',
    aiLimit: 'Максимум 3 питання. Якщо готово — продовжуй до контакту.',
    aiSystem: 'Система',
    aiThinking: 'Система аналізує…',
    aiQuestionsCount: 'Питань',
    aiInputPlaceholder: 'Введи питання або натисни "Показати рішення"',
    aiInputPlaceholderLimit: 'Максимум 3 питання. Продовжуй до контакту.',
    next: 'Далі →',
  },
  ru: {
    systemLabel: 'Система приёма клиентов',
    heroTitle: 'Система за 30 секунд покажет, какое решение тебе нужно, без менеджеров и звонков',
    heroDesc: 'Выбери несколько вариантов — и сразу увидишь, как это может работать в твоём бизнесе.',
    start: '🚀 Начать (30 секунд)',
    hurry: 'Я спешу',
    businessQuestion: 'Какой у вас бизнес?',
    otherBusinessPlaceholder: 'Опишите бизнес (например, салон красоты)',
    channelQuestion: 'Откуда сейчас к тебе приходят клиенты (или должны приходить)?',
    otherChannelPlaceholder: 'Добавь свой канал (например, Google Maps, офлайн)',
    painQuestion: 'Что больше всего бесит?',
    otherPainPlaceholder: 'Опиши, что бесит именно у тебя',
    aiTitle: 'Система уже собрала для тебя решение.',
    aiDesc: 'Вот как это может работать именно в твоём бизнесе. Без менеджеров, без звонков.',
    aiShow: 'Показать решение',
    aiContinue: 'Продолжить оформление',
    aiBlockTitle: 'Решение для твоего бизнеса',
    contactTitle: 'Хочешь внедрить это решение — оставь контакт',
    namePlaceholder: 'Имя (не обязательно)',
    contactPlaceholder: 'Telegram @handle или Email',
    send: 'Отправить заявку',
    sending: 'Отправляю…',
    back: '← Назад',
    contactNote: 'Без звонков. Без менеджеров. Ты уже знаешь, что тебе нужно.',
    doneTitle: 'Заявка зафиксирована.',
    doneDesc: 'Если решение подходит — следующий шаг — внедрение.',
    another: 'Заполнить ещё одну заявку',
    step: 'Шаг',
    ctaPrimary: '⚡ Заказать систему',
    ctaSecondary: '👀 Посмотреть, как это работает в моём бизнесе',
    askMore: 'Задать ещё вопрос',
    aiEmpty: 'Ответов пока нет. Задай вопрос или нажми “Показать решение”.',
    aiLimit: 'Максимум 3 вопроса. Готово — переходи к контакту.',
    aiSystem: 'Система',
    aiThinking: 'Система анализирует…',
    aiQuestionsCount: 'Вопросов',
    aiInputPlaceholder: 'Введи вопрос или нажми "Показать решение"',
    aiInputPlaceholderLimit: 'Максимум 3 вопроса. Переходи к контакту.',
    next: 'Дальше →',
  },
  cz: {
    systemLabel: 'Systém pro příjem klientů',
    heroTitle: 'Systém za 30 sekund ukáže, jaké řešení potřebujete, bez manažerů a hovorů',
    heroDesc: 'Vyber pár voleb — hned uvidíš, jak to může fungovat ve tvém byznysu.',
    start: '🚀 Začít (30 sekund)',
    hurry: 'Spěchám',
    businessQuestion: 'Jaký máte byznys?',
    otherBusinessPlaceholder: 'Popište svůj byznys (např. kosmetický salon)',
    channelQuestion: 'Odkud ti teď chodí klienti (nebo by měli)?',
    otherChannelPlaceholder: 'Přidej svůj kanál (např. Google Maps, offline)',
    painQuestion: 'Co nejvíc štve?',
    otherPainPlaceholder: 'Popiš, co tě štve nejvíc',
    aiTitle: 'Systém už poskládal řešení pro tebe.',
    aiDesc: 'Takto to může fungovat přímo ve tvém byznysu. Bez manažerů, bez hovorů.',
    aiShow: 'Ukázat řešení',
    aiContinue: 'Pokračovat',
    aiBlockTitle: 'Řešení pro tvůj byznys',
    contactTitle: 'Chceš toto řešení u sebe — nech kontakt',
    namePlaceholder: 'Jméno (volitelně)',
    contactPlaceholder: 'Telegram @handle nebo Email',
    send: 'Odeslat poptávku',
    sending: 'Odesílám…',
    back: '← Zpět',
    contactNote: 'Bez hovorů. Bez manažerů. Už víš, co potřebuješ.',
    doneTitle: 'Poptávka zaznamenána.',
    doneDesc: 'Pokud řešení sedí — další krok je implementace.',
    another: 'Vyplnit další poptávku',
    step: 'Krok',
    ctaPrimary: '⚡ Objednat systém',
    ctaSecondary: '👀 Podívat se, jak to funguje v mém byznysu',
    askMore: 'Položit další otázku',
    aiEmpty: 'Zatím žádné odpovědi. Zkus otázku nebo klikni “Ukázat řešení”.',
    aiLimit: 'Maximálně 3 otázky. Hotovo — pokračuj na kontakt.',
    aiSystem: 'Systém',
    aiThinking: 'Systém analyzuje…',
    aiQuestionsCount: 'Otázek',
    aiInputPlaceholder: 'Napiš otázku nebo klikni “Ukázat řešení”',
    aiInputPlaceholderLimit: 'Max. 3 otázky. Pokračuj na kontakt.',
    next: 'Další →',
  },
}

const stepLabels: Record<Lang, { id: StepId; label: string }[]> = {
  ua: [
    { id: 'intro', label: 'Вступ' },
    { id: 'business', label: 'Бізнес' },
    { id: 'channel', label: 'Канали' },
    { id: 'pain', label: 'Біль' },
    { id: 'ai', label: 'AI' },
    { id: 'contact', label: 'Контакт' },
    { id: 'done', label: 'Готово' },
  ],
  ru: [
    { id: 'intro', label: 'Вступление' },
    { id: 'business', label: 'Бизнес' },
    { id: 'channel', label: 'Каналы' },
    { id: 'pain', label: 'Боль' },
    { id: 'ai', label: 'AI' },
    { id: 'contact', label: 'Контакт' },
    { id: 'done', label: 'Готово' },
  ],
  cz: [
    { id: 'intro', label: 'Úvod' },
    { id: 'business', label: 'Byznys' },
    { id: 'channel', label: 'Kanály' },
    { id: 'pain', label: 'Bolest' },
    { id: 'ai', label: 'AI' },
    { id: 'contact', label: 'Kontakt' },
    { id: 'done', label: 'Hotovo' },
  ],
}

const businessOptions = {
  ua: [
    { value: 'salon', label: 'Салон / барбершоп' },
    { value: 'service', label: 'Сервіс / майстер' },
    { value: 'online', label: 'Онлайн / послуги' },
    { value: 'other', label: 'Інше' },
  ],
  ru: [
    { value: 'salon', label: 'Салон / барбершоп' },
    { value: 'service', label: 'Сервис / мастер' },
    { value: 'online', label: 'Онлайн / услуги' },
    { value: 'other', label: 'Другое' },
  ],
  cz: [
    { value: 'salon', label: 'Salon / barbershop' },
    { value: 'service', label: 'Servis / řemeslník' },
    { value: 'online', label: 'Online / služby' },
    { value: 'other', label: 'Jiné' },
  ],
}

const channelOptions = {
  ua: [
    { value: 'social', label: 'Instagram / Facebook' },
    { value: 'phone', label: 'Телефон' },
    { value: 'site', label: 'Сайт' },
    { value: 'chaos', label: 'Все підряд і хаос' },
    { value: 'other', label: 'Інше' },
  ],
  ru: [
    { value: 'social', label: 'Instagram / Facebook' },
    { value: 'phone', label: 'Телефон' },
    { value: 'site', label: 'Сайт' },
    { value: 'chaos', label: 'Всё подряд и хаос' },
    { value: 'other', label: 'Другое' },
  ],
  cz: [
    { value: 'social', label: 'Instagram / Facebook' },
    { value: 'phone', label: 'Telefon' },
    { value: 'site', label: 'Web' },
    { value: 'chaos', label: 'Všechno dohromady a chaos' },
    { value: 'other', label: 'Jiné' },
  ],
}

const painOptions = {
  ua: [
    { value: 'vanish', label: 'Пишуть і пропадають' },
    { value: 'call', label: 'Дзвонять у незручний час' },
    { value: 'repeat', label: 'Питають одне й те саме' },
    { value: 'solo', label: 'Я сам відповідаю — дістало' },
    { value: 'lost', label: 'Клієнти губляться' },
    { value: 'other', label: 'Інше' },
  ],
  ru: [
    { value: 'vanish', label: 'Пишут и пропадают' },
    { value: 'call', label: 'Звонят в неудобное время' },
    { value: 'repeat', label: 'Спрашивают одно и то же' },
    { value: 'solo', label: 'Отвечаю сам — достало' },
    { value: 'lost', label: 'Клиенты теряются' },
    { value: 'other', label: 'Другое' },
  ],
  cz: [
    { value: 'vanish', label: 'Píšou a mizí' },
    { value: 'call', label: 'Volají v nevhodný čas' },
    { value: 'repeat', label: 'Ptají se pořád na to samé' },
    { value: 'solo', label: 'Odpovídám sám — už toho mám dost' },
    { value: 'lost', label: 'Klienti se ztrácí' },
    { value: 'other', label: 'Jiné' },
  ],
}

const aiSuggestions: Record<Lang, string[]> = {
  ua: ['Що мені дасть ця система?', 'Як це інтегрується з Instagram і Telegram?', 'Скільки часу займає запуск?'],
  ru: ['Что мне даст эта система?', 'Как это интегрируется с Instagram и Telegram?', 'Сколько времени занимает запуск?'],
  cz: ['Co mi tahle věc dá?', 'Jak se to napojí na Instagram a Telegram?', 'Jak dlouho trvá spuštění?'],
}

type FormState = {
  businessType: string
  businessCustom: string
  channels: string[]
  channelCustom: string
  pains: string[]
  painCustom: string
  question: string
  history: { role: 'user' | 'assistant'; content: string }[]
  aiMode: 'show' | 'post'
  aiRecommendation: string
  aiAnswer: string
  name: string
  contact: string
}

export default function Home() {
  const [lang, setLang] = useState<Lang>('ua')
  const t = translations[lang]
  const steps = useMemo(() => stepLabels[lang], [lang])
  const [step, setStep] = useState<StepId>('intro')
  const [form, setForm] = useState<FormState>({
    businessType: '',
    businessCustom: '',
    channels: [],
    channelCustom: '',
    pains: [],
    painCustom: '',
    question: '',
    history: [],
    aiMode: 'show',
    aiRecommendation: '',
    aiAnswer: '',
    name: '',
    contact: '',
  })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [stepError, setStepError] = useState<{ business?: string; channel?: string; pain?: string }>({})
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const currentIndex = steps.findIndex((s) => s.id === step)
  const progress = useMemo(() => Math.round(((currentIndex + 1) / steps.length) * 100), [currentIndex])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [form.history.length])

  const setField = (key: keyof FormState, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value as any }))
  }

  const isOther = (label: string) => ['Інше', 'Другое', 'Jiné'].includes(label)

  const validateStep = (): boolean => {
    const businessResolved = (form.businessCustom || form.businessType || '').trim()
    const channelResolved = (form.channelCustom || form.channels.join(', ') || '').trim()
    const painResolved = (form.painCustom || form.pains.join(', ') || '').trim()
    if (step === 'business') {
      if (!businessResolved) {
        setStepError((prev) => ({ ...prev, business: 'Заповніть або впишіть свій бізнес' }))
        return false
      }
      setStepError((prev) => ({ ...prev, business: undefined }))
    }
    if (step === 'channel') {
      if (!channelResolved) {
        setStepError((prev) => ({ ...prev, channel: 'Заповніть або впишіть свій канал' }))
        return false
      }
      setStepError((prev) => ({ ...prev, channel: undefined }))
    }
    if (step === 'pain') {
      if (!painResolved) {
        setStepError((prev) => ({ ...prev, pain: 'Заповніть або опишіть, що дратує' }))
        return false
      }
      setStepError((prev) => ({ ...prev, pain: undefined }))
    }
    return true
  }

  const next = () => {
    if (!validateStep()) return
    setStep(steps[Math.min(currentIndex + 1, steps.length - 1)].id)
  }
  const prev = () => setStep(steps[Math.max(currentIndex - 1, 0)].id)

  const handleAskAI = async () => {
    const businessResolved = (form.businessCustom || form.businessType || '').trim()
    const channelsResolved = form.channelCustom ? [form.channelCustom] : form.channels.filter(Boolean)
    const painsResolved = form.painCustom ? [form.painCustom] : form.pains.filter(Boolean)

    if (!businessResolved) {
      setAiError('Спочатку вкажіть тип бізнесу')
      setStepError((prev) => ({ ...prev, business: 'Заповніть бізнес' }))
      return
    }
    if (!channelsResolved.length) {
      setAiError('Спочатку вкажіть канали')
      setStepError((prev) => ({ ...prev, channel: 'Заповніть канал' }))
      return
    }
    if (!painsResolved.length) {
      setAiError('Спочатку вкажіть біль')
      setStepError((prev) => ({ ...prev, pain: 'Заповніть біль' }))
      return
    }
    if (form.history.length >= 6) {
      setAiError('Максимум 3 питання. Якщо готово — продовжуй до контакту.')
      return
    }

    setAiError('')
    setAiLoading(true)

    try {
      const userMessage =
        form.question.trim() ||
        (form.history.length === 0
          ? 'Покажи, як система вже працює саме в моєму бізнесі'
          : 'Уточни по системі')

      const newHistory = [...form.history, { role: 'user' as const, content: userMessage }]
      const nextMode: 'show' | 'post' = form.history.length === 0 ? 'show' : 'post'

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType: businessResolved,
          channel: channelsResolved.join(', '),
          pain: painsResolved.join(', '),
          question: userMessage,
          history: newHistory,
          lang,
          mode: nextMode,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error('AI error')

      const updatedHistory = [
        ...newHistory,
        { role: 'assistant' as const, content: data.answer || 'Помилка отримання відповіді' },
      ].slice(-6)

      setForm((prev) => ({
        ...prev,
        history: updatedHistory,
        aiAnswer: data.answer || '',
        aiRecommendation: data.recommendation || data.answer || '',
        question: '',
        aiMode: 'post',
      }))
    } catch (error) {
      setAiError('Не вдалось отримати відповідь. Спробуй ще раз або продовжуй до контакту.')
    } finally {
      setAiLoading(false)
    }
  }

  const validateContact = () => {
    if (!form.contact) return false
    const isEmail = /\S+@\S+\.\S+/.test(form.contact)
    const isTelegram = form.contact.startsWith('@') && form.contact.length > 3
    return isEmail || isTelegram
  }

  const handleSubmit = async () => {
    const businessResolved = (form.businessCustom || form.businessType || '').trim()
    const channelResolved = (form.channelCustom || form.channels.join(', ') || '').trim()
    const painResolved = (form.painCustom || form.pains.join(', ') || '').trim()

    if (!validateContact()) {
      setSubmitError('Додайте email або @telegram')
      return
    }
    setSubmitError('')
    setSubmitLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          contact: form.contact,
          businessType: businessResolved,
          channel: channelResolved,
          pain: painResolved,
          question: form.question,
          aiRecommendation: form.aiRecommendation || form.aiAnswer,
        }),
      })
      if (!res.ok) throw new Error('Submit error')
      setStep('done')
    } catch (error) {
      setSubmitError('Не вдалось надіслати. Перевірте контакт або спробуйте пізніше.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const renderStepContent = () => {
    const businessResolved = (form.businessCustom || form.businessType || '').trim()
    const channelResolved = (form.channelCustom || form.channels.join(', ') || '').trim()
    const painResolved = (form.painCustom || form.pains.join(', ') || '').trim()

    switch (step) {
      case 'intro':
        return (
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-wide text-indigo-300/80 font-semibold">
              {t.systemLabel}
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              {t.heroTitle}
            </h1>
            <p className="text-lg text-slate-200/90">
              {t.heroDesc}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={next}
                className="inline-flex items-center justify-center rounded-[12px] bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-base font-semibold text-white shadow-[0_8px_24px_rgba(99,102,241,0.25)] hover:from-indigo-600 hover:to-purple-600 hover:shadow-[0_12px_32px_rgba(99,102,241,0.35)] transition-all duration-200"
              >
                {t.start}
              </button>
              <button
                onClick={() => setStep('contact')}
                className="inline-flex items-center justify-center rounded-[12px] px-6 py-3 text-base font-semibold text-white bg-white/10 border border-white/10 hover:bg-white/15 transition-all duration-200"
              >
                {t.hurry}
              </button>
            </div>
          </div>
        )
      case 'business':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">{t.businessQuestion}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {(businessOptions[lang] || []).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setField('businessType', opt.label)
                    setField('businessCustom', '')
                    setStepError((prev) => ({ ...prev, business: undefined }))
                    next()
                  }}
                  className={`w-full text-left px-5 py-4 rounded-2xl min-h-[64px] border transition-all ${
                    form.businessType === opt.label
                      ? 'border-indigo-400/60 bg-indigo-500/10 shadow-[0_4px_16px_rgba(99,102,241,0.2)]'
                      : 'border-white/10 bg-white/5 hover:border-indigo-300/50 hover:bg-indigo-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{opt.label}</span>
                    {form.businessType === opt.label ? '✅' : '→'}
                  </div>
                </button>
              ))}
            </div>
            {form.businessType === 'Інше' || form.businessType === 'Другое' || form.businessType === 'Jiné' ? (
              <input
                type="text"
                value={form.businessCustom}
                onChange={(e) => setField('businessCustom', e.target.value)}
                placeholder={t.otherBusinessPlaceholder}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              />
            ) : null}
            {stepError.business ? <p className="text-sm text-red-300">{stepError.business}</p> : null}
          </div>
        )
      case 'channel':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">{t.channelQuestion}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {(channelOptions[lang] || []).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setForm((prev) => {
                      const exists = prev.channels.includes(opt.label)
                      const nextList = exists
                        ? prev.channels.filter((c) => c !== opt.label)
                        : [...prev.channels, opt.label]
                      return {
                        ...prev,
                        channels: nextList,
                        channelCustom: isOther(opt.label) ? prev.channelCustom : '',
                      }
                    })
                    setStepError((prev) => ({ ...prev, channel: undefined }))
                  }}
                  className={`w-full text-left px-5 py-4 rounded-2xl min-h-[64px] border transition-all ${
                    form.channels.includes(opt.label)
                      ? 'border-indigo-400/60 bg-indigo-500/10 shadow-[0_4px_16px_rgba(99,102,241,0.2)]'
                      : 'border-white/10 bg-white/5 hover:border-indigo-300/50 hover:bg-indigo-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{opt.label}</span>
                    {form.channels.includes(opt.label) ? '✅' : '→'}
                  </div>
                </button>
              ))}
            </div>
            {form.channels.some((c) => isOther(c)) ? (
              <input
                type="text"
                value={form.channelCustom}
                onChange={(e) => setField('channelCustom', e.target.value)}
                placeholder={t.otherChannelPlaceholder}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              />
            ) : null}
            {stepError.channel ? <p className="text-sm text-red-300">{stepError.channel}</p> : null}
          </div>
        )
      case 'pain':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">{t.painQuestion}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {(painOptions[lang] || []).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setForm((prev) => {
                      const exists = prev.pains.includes(opt.label)
                      const nextList = exists
                        ? prev.pains.filter((p) => p !== opt.label)
                        : [...prev.pains, opt.label]
                      return {
                        ...prev,
                        pains: nextList,
                        painCustom: isOther(opt.label) ? prev.painCustom : '',
                      }
                    })
                    setStepError((prev) => ({ ...prev, pain: undefined }))
                  }}
                  className={`w-full text-left px-5 py-4 rounded-2xl min-h-[64px] border transition-all ${
                    form.pains.includes(opt.label)
                      ? 'border-indigo-400/60 bg-indigo-500/10 shadow-[0_4px_16px_rgba(99,102,241,0.2)]'
                      : 'border-white/10 bg-white/5 hover:border-indigo-300/50 hover:bg-indigo-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{opt.label}</span>
                    {form.pains.includes(opt.label) ? '✅' : '→'}
                  </div>
                </button>
              ))}
            </div>
            {form.pains.some((p) => isOther(p)) ? (
              <input
                type="text"
                value={form.painCustom}
                onChange={(e) => setField('painCustom', e.target.value)}
                placeholder={t.otherPainPlaceholder}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              />
            ) : null}
            {stepError.pain ? <p className="text-sm text-red-300">{stepError.pain}</p> : null}
          </div>
        )
      case 'ai':
        return (
          <div className="flex flex-col h-[78vh] sm:h-[600px] space-y-0">
            <div className="flex-shrink-0 pb-3 sm:pb-4 border-b border-white/10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white">{t.aiTitle}</h2>
              <p className="text-slate-300 text-xs sm:text-sm">{t.aiDesc}</p>
            </div>

            {form.history.length === 0 && (
              <div className="flex-shrink-0 flex gap-2 flex-nowrap sm:flex-wrap py-3 overflow-x-auto sm:overflow-visible pr-2 -mr-2">
                {aiSuggestions[lang].map((s) => (
                  <button
                    key={s}
                    onClick={() => setField('question', s)}
                    className="px-3 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-slate-200 hover:border-indigo-300/60 hover:bg-indigo-500/10 transition-all whitespace-nowrap"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto space-y-4 py-3 sm:py-4 pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
              {form.history.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  {t.aiEmpty}
                </div>
              ) : (
                form.history.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                          : 'bg-white/5 border border-white/10 text-slate-100'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="text-xs uppercase text-indigo-200 font-semibold mb-1">{t.aiSystem}</div>
                      )}
                      <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}

              {aiLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      <span className="text-slate-300 text-sm ml-2">{t.aiThinking}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {form.history.length > 0 && form.history.length < 6 ? (
              <div className="flex-shrink-0 text-xs text-slate-400 py-2">
                {t.aiQuestionsCount}: {Math.floor(form.history.length / 2)} / 3
              </div>
            ) : null}

            {aiError ? <div className="flex-shrink-0 text-red-300 text-sm py-2">{aiError}</div> : null}

            <div className="flex-shrink-0 pt-3 border-t border-white/10">
              <div className="flex gap-2 items-end">
                <textarea
                  value={form.question}
                  onChange={(e) => setField('question', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAskAI()
                    }
                  }}
                  placeholder={
                    form.history.length >= 6
                      ? t.aiInputPlaceholderLimit
                      : t.aiInputPlaceholder
                  }
                  disabled={form.history.length >= 6 || aiLoading}
                  rows={2}
                  className="flex-1 resize-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                />
                <button
                  onClick={handleAskAI}
                  disabled={aiLoading || form.history.length >= 6 || !form.question.trim()}
                  className="px-4 sm:px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-sm hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
                >
                  {aiLoading ? '...' : '→'}
                </button>
              </div>

              <div className="flex flex-wrap gap-3 items-center mt-3">
                {form.history.length === 0 && (
                  <button
                    onClick={handleAskAI}
                    disabled={aiLoading}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-base font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg disabled:opacity-60"
                  >
                    {aiLoading ? 'Думаю…' : t.aiShow}
                  </button>
                )}
                <button
                  onClick={() => setStep('contact')}
                  className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold text-white bg-white/10 border border-white/10 hover:bg-white/15 transition-all"
                >
                  {t.aiContinue}
                </button>
              </div>
            </div>
          </div>
        )
      case 'contact':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white">Хочеш реалізувати це рішення у себе — залиш контакт</h2>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2 text-sm text-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-400">Бізнес</span>
                <span>{businessResolved || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Канали</span>
                <span>{channelResolved || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Біль</span>
                <span>{painResolved || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AI</span>
                <span className="text-right">{form.aiRecommendation || form.aiAnswer || '—'}</span>
              </div>
            </div>
            <div className="grid gap-4">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Імʼя (необовʼязково)"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              />
              <input
                type="text"
                value={form.contact}
                onChange={(e) => setField('contact', e.target.value)}
                placeholder="Telegram @handle або Email"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            {submitError ? <p className="text-red-300 text-sm">{submitError}</p> : null}
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={handleSubmit}
                disabled={submitLoading}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-base font-semibold text-white hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg disabled:opacity-60"
              >
                {submitLoading ? 'Відправляю…' : 'Надіслати заявку'}
              </button>
              <button onClick={prev} className="text-slate-300 hover:text-white text-sm">
                ← Назад
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Без дзвінків. Без менеджерів. Ти вже знаєш, що тобі потрібно.
            </p>
          </div>
        )
      case 'done':
        return (
          <div className="space-y-4 text-center">
            <div className="text-5xl">✅</div>
            <h2 className="text-2xl font-semibold text-white">Заявка зафіксована.</h2>
            <p className="text-slate-200">
              Якщо рішення підходить — наступний крок — реалізація.
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left space-y-2 text-sm text-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-400">Бізнес</span>
                  <span>{businessResolved || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Канали</span>
                  <span>{channelResolved || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Біль</span>
                  <span>{painResolved || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AI</span>
                <span className="text-right">{form.aiRecommendation || form.aiAnswer || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Контакт</span>
                <span>{form.contact || '—'}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setForm({
                  businessType: '',
                  businessCustom: '',
                  channels: [],
                  channelCustom: '',
                  pains: [],
                  painCustom: '',
                  question: '',
                  history: [],
                  aiMode: 'show',
                  aiRecommendation: '',
                  aiAnswer: '',
                  name: '',
                  contact: '',
                })
                setStep('intro')
              }}
              className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white bg-white/10 border border-white/10 hover:bg-white/15 transition-all"
            >
              Заповнити ще одну заявку
            </button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-slate-950 to-purple-900/30"></div>
        <div className="absolute -top-10 -right-10 w-80 h-80 bg-purple-500/20 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-indigo-500/20 blur-3xl rounded-full"></div>
      </div>

      <header className="sticky top-0 z-40 backdrop-blur-lg bg-slate-950/80 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="TemoWeb" className="h-8 w-8 rounded-lg border border-white/10" />
            <div>
              <p className="text-sm uppercase tracking-wide text-indigo-200 font-semibold">TemoWeb</p>
              <p className="text-xs text-slate-400">Системи прийому заявок</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-300">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Відповідь особисто, без менеджера
          </div>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="flex flex-wrap gap-2">
          {(['ua', 'ru', 'cz'] as Lang[]).map((lng) => (
            <button
              key={lng}
              onClick={() => setLang(lng)}
              className={`rounded-full px-4 py-2 text-sm font-semibold border transition-all ${
                lang === lng
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-indigo-400 shadow-[0_6px_18px_rgba(99,102,241,0.35)]'
                  : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
              }`}
            >
              {lng.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_12px_rgba(99,102,241,0.4)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="text-sm text-slate-300">Крок {currentIndex + 1} з {steps.length}</span>
        </div>

        <div className="flex gap-2 flex-wrap mb-6">
          {steps.map((s, idx) => {
            const isActive = idx === currentIndex
            const isDone = idx < currentIndex
            return (
              <div
                key={s.id}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  isActive
                    ? 'border-indigo-400/60 bg-indigo-500/10 text-indigo-100 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                    : isDone
                    ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100'
                    : 'border-white/10 bg-white/5 text-slate-400'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                    isActive
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
                      : isDone
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/5 text-slate-400 border border-white/10'
                  }`}
                >
                  {isDone ? '✓' : idx + 1}
                </span>
                <span>{s.label}</span>
              </div>
            )
          })}
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-800/40 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-indigo-500/10 blur-3xl"></div>
          <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-purple-500/10 blur-3xl"></div>
          <div className={`relative ${step === 'ai' ? 'p-4 sm:p-8' : 'p-6 sm:p-8'}`}>
            <div className={`mb-4 text-sm text-slate-300 ${step === 'ai' ? 'hidden sm:block' : ''}`}>
              Крок {currentIndex + 1} з {steps.length}
            </div>
            {renderStepContent()}
            {step !== 'intro' && step !== 'contact' && step !== 'done' ? (
              <div className="mt-8 flex justify-between items-center">
                <button onClick={prev} className="text-slate-300 hover:text-white text-sm">
                  ← Назад
                </button>
                {step !== 'ai' && (
                  <button
                    onClick={next}
                    className="inline-flex items-center justify-center rounded-full bg-white/10 border border-white/15 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition-all"
                  >
                    {t.next}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}


