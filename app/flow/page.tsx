'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type StepId = 'intro' | 'business' | 'channel' | 'pain' | 'ai' | 'contact' | 'done'
type Lang = 'ua' | 'ru' | 'cz'

const AI_MAX_QUESTIONS = 5
const AI_MAX_HISTORY = AI_MAX_QUESTIONS * 2

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
    aiShowLoading: 'Думаю…',
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
    aiLimit: 'Максимум 5 питань. Якщо готово — продовжуй до контакту.',
    aiSystem: 'Система',
    aiThinking: 'Система аналізує…',
    aiQuestionsCount: 'Питань',
    aiInputPlaceholder: 'Введи питання або натисни "Показати рішення"',
    aiInputPlaceholderLimit: 'Максимум 5 питань. Продовжуй до контакту.',
    next: 'Далі →',
    of: 'з',
    headerSubtitle: 'Системи прийому заявок',
    headerStatus: 'Відповідь особисто, без менеджера',
    fieldBusiness: 'Бізнес',
    fieldChannels: 'Канали',
    fieldPain: 'Біль',
    fieldAi: 'AI',
    fieldContact: 'Контакт',
    debugFallback: '⚠️ AI зараз у резервному режимі (fallback). Якщо відповіді “однакові” — перевір ключ OpenAI на сервері.',
    errFillBusiness: 'Заповніть або впишіть свій бізнес',
    errFillChannel: 'Заповніть або впишіть свій канал',
    errFillPain: 'Заповніть або опишіть, що дратує',
    errNeedBusiness: 'Спочатку вкажіть тип бізнесу',
    errNeedChannels: 'Спочатку вкажіть канали',
    errNeedPains: 'Спочатку вкажіть біль',
    errLimit3: 'Максимум 5 питань. Якщо готово — продовжуй до контакту.',
    aiDefaultFirst: 'Продай мені цю систему по фактах: що зміниться в моєму бізнесі вже з першого дня',
    aiDefaultNext: 'Дай точну відповідь по системі (без води)',
    aiErrorGeneric: 'Не вдалось отримати відповідь. Спробуй ще раз або продовжуй до контакту.',
    contactErrNeed: 'Додайте email або @telegram',
    contactErrFailed: 'Не вдалось надіслати. Перевірте контакт або спробуйте пізніше.',
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
    aiShowLoading: 'Думаю…',
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
    aiLimit: 'Максимум 5 вопросов. Готово — переходи к контакту.',
    aiSystem: 'Система',
    aiThinking: 'Система анализирует…',
    aiQuestionsCount: 'Вопросов',
    aiInputPlaceholder: 'Введи вопрос или нажми "Показать решение"',
    aiInputPlaceholderLimit: 'Максимум 5 вопросов. Переходи к контакту.',
    next: 'Дальше →',
    of: 'из',
    headerSubtitle: 'Системы приёма заявок',
    headerStatus: 'Ответ лично, без менеджера',
    fieldBusiness: 'Бизнес',
    fieldChannels: 'Каналы',
    fieldPain: 'Боль',
    fieldAi: 'AI',
    fieldContact: 'Контакт',
    debugFallback: '⚠️ AI сейчас в резервном режиме (fallback). Если ответы “одинаковые” — проверь ключ OpenAI на сервере.',
    errFillBusiness: 'Заполни или впиши свой бизнес',
    errFillChannel: 'Заполни или впиши свой канал',
    errFillPain: 'Заполни или опиши, что бесит',
    errNeedBusiness: 'Сначала укажи тип бизнеса',
    errNeedChannels: 'Сначала укажи каналы',
    errNeedPains: 'Сначала укажи боль',
    errLimit3: 'Максимум 5 вопросов. Готово — переходи к контакту.',
    aiDefaultFirst: 'Продай мне эту систему по фактам: что изменится в моём бизнесе уже с первого дня',
    aiDefaultNext: 'Дай точный ответ по системе (без воды)',
    aiErrorGeneric: 'Не удалось получить ответ. Попробуй ещё раз или переходи к контакту.',
    contactErrNeed: 'Добавь email или @telegram',
    contactErrFailed: 'Не удалось отправить. Проверь контакт или попробуй позже.',
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
    aiShowLoading: 'Přemýšlím…',
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
    aiLimit: 'Maximálně 5 otázek. Hotovo — pokračuj na kontakt.',
    aiSystem: 'Systém',
    aiThinking: 'Systém analyzuje…',
    aiQuestionsCount: 'Otázek',
    aiInputPlaceholder: 'Napiš otázku nebo klikni “Ukázat řešení”',
    aiInputPlaceholderLimit: 'Max. 5 otázek. Pokračuj na kontakt.',
    next: 'Další →',
    of: 'z',
    headerSubtitle: 'Systémy pro příjem poptávek',
    headerStatus: 'Odpověď osobně, bez manažera',
    fieldBusiness: 'Byznys',
    fieldChannels: 'Kanály',
    fieldPain: 'Bolest',
    fieldAi: 'AI',
    fieldContact: 'Kontakt',
    debugFallback: '⚠️ AI běží v záložním režimu (fallback). Pokud odpovědi vypadají “stejné”, zkontroluj OpenAI klíč na serveru.',
    errFillBusiness: 'Vyplň nebo napiš svůj byznys',
    errFillChannel: 'Vyplň nebo napiš svůj kanál',
    errFillPain: 'Vyplň nebo popiš, co tě štve',
    errNeedBusiness: 'Nejdřív vyber typ byznysu',
    errNeedChannels: 'Nejdřív vyber kanály',
    errNeedPains: 'Nejdřív vyber problém',
    errLimit3: 'Maximálně 5 otázek. Hotovo — pokračuj na kontakt.',
    aiDefaultFirst: 'Prodej mi tenhle systém fakty: co se v mém byznysu změní už od prvního dne',
    aiDefaultNext: 'Dej přesnou odpověď k systému (bez omáčky)',
    aiErrorGeneric: 'Nepodařilo se získat odpověď. Zkus to znovu nebo pokračuj na kontakt.',
    contactErrNeed: 'Přidej email nebo @telegram',
    contactErrFailed: 'Nepodařilo se odeslat. Zkontroluj kontakt nebo zkus později.',
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
  businessType: string // stores option value (e.g. 'salon' | 'service' | 'online' | 'other')
  businessCustom: string
  channels: string[] // stores option values
  channelCustom: string
  pains: string[] // stores option values
  painCustom: string
  question: string
  history: { role: 'user' | 'assistant'; content: string }[]
  aiMode: 'show' | 'post'
  aiRecommendation: string
  aiAnswer: string
  aiSummary: string
  name: string
  contact: string
}

export default function Home() {
  const [lang, setLang] = useState<Lang>('ua')
  const [sourceHint, setSourceHint] = useState<string>('')
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
    aiSummary: '',
    name: '',
    contact: '',
  })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiProvider, setAiProvider] = useState<'openai' | 'fallback' | ''>('')
  const [fastMode, setFastMode] = useState(true)
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

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const src = (sp.get('src') || '').trim().toLowerCase()
      setSourceHint(src)
    } catch {}
  }, [])

  const setField = (key: keyof FormState, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value as any }))
  }

  const isOther = (value: string) => value === 'other'

  const optionLabel = (options: { value: string; label: string }[], value: string) =>
    options.find((o) => o.value === value)?.label || ''

  const validateStep = (): boolean => {
    const businessResolved = (form.businessCustom || optionLabel(businessOptions[lang], form.businessType) || '').trim()
    const channelResolved = (
      form.channelCustom ||
      form.channels
        .map((v) => optionLabel(channelOptions[lang], v))
        .filter(Boolean)
        .join(', ') ||
      ''
    ).trim()
    const painResolved = (
      form.painCustom ||
      form.pains
        .map((v) => optionLabel(painOptions[lang], v))
        .filter(Boolean)
        .join(', ') ||
      ''
    ).trim()
    if (step === 'business') {
      if (!businessResolved) {
        setStepError((prev) => ({ ...prev, business: t.errFillBusiness }))
        return false
      }
      setStepError((prev) => ({ ...prev, business: undefined }))
    }
    if (step === 'channel') {
      if (!channelResolved) {
        setStepError((prev) => ({ ...prev, channel: t.errFillChannel }))
        return false
      }
      setStepError((prev) => ({ ...prev, channel: undefined }))
    }
    if (step === 'pain') {
      if (!painResolved) {
        setStepError((prev) => ({ ...prev, pain: t.errFillPain }))
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
    const businessResolved = (form.businessCustom || optionLabel(businessOptions[lang], form.businessType) || '').trim()
    const channelsResolved = form.channelCustom
      ? [form.channelCustom]
      : form.channels
          .map((v) => optionLabel(channelOptions[lang], v))
          .filter(Boolean)
    const painsResolved = form.painCustom
      ? [form.painCustom]
      : form.pains
          .map((v) => optionLabel(painOptions[lang], v))
          .filter(Boolean)

    if (!businessResolved) {
      setAiError(t.errNeedBusiness)
      setStepError((prev) => ({ ...prev, business: t.errFillBusiness }))
      return
    }
    if (!channelsResolved.length) {
      setAiError(t.errNeedChannels)
      setStepError((prev) => ({ ...prev, channel: t.errFillChannel }))
      return
    }
    if (!painsResolved.length) {
      setAiError(t.errNeedPains)
      setStepError((prev) => ({ ...prev, pain: t.errFillPain }))
      return
    }
    if (form.history.length >= AI_MAX_HISTORY) {
      setAiError(t.errLimit3)
      return
    }

    setAiError('')
    setAiProvider('')
    setAiLoading(true)

    try {
      const userMessage =
        form.question.trim() ||
        (form.history.length === 0
          ? t.aiDefaultFirst
          : t.aiDefaultNext)

      const newHistory = [...form.history, { role: 'user' as const, content: userMessage }]
      const nextMode: 'show' | 'post' = form.history.length === 0 ? 'show' : 'post'

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 'temoweb',
          businessType: businessResolved,
          channel: channelsResolved.join(', '),
          pain: painsResolved.join(', '),
          question: userMessage,
          history: newHistory,
          lang,
          mode: nextMode,
          currentChannel: 'website',
          sourceHint: sourceHint || undefined,
          fast: fastMode,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error('AI error')
      setAiProvider(data.provider || '')

      const updatedHistory = [
        ...newHistory,
        { role: 'assistant' as const, content: data.answer || 'Помилка отримання відповіді' },
      ].slice(-AI_MAX_HISTORY)

      setForm((prev) => ({
        ...prev,
        history: updatedHistory,
        aiAnswer: data.answer || '',
        aiRecommendation: data.recommendation || data.answer || '',
        aiSummary: data.summary || prev.aiSummary || '',
        question: '',
        aiMode: 'post',
      }))
    } catch (error) {
      setAiError(t.aiErrorGeneric)
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
    const businessResolved = (form.businessCustom || optionLabel(businessOptions[lang], form.businessType) || '').trim()
    const channelResolved = (
      form.channelCustom ||
      form.channels
        .map((v) => optionLabel(channelOptions[lang], v))
        .filter(Boolean)
        .join(', ') ||
      ''
    ).trim()
    const painResolved = (
      form.painCustom ||
      form.pains
        .map((v) => optionLabel(painOptions[lang], v))
        .filter(Boolean)
        .join(', ') ||
      ''
    ).trim()

    if (!validateContact()) {
      setSubmitError(t.contactErrNeed)
      return
    }
    const extraQuestion = form.question.trim()
    const clientMessages = [
      ...form.history.filter((m) => m.role === 'user').map((m) => m.content),
      ...(extraQuestion ? [extraQuestion] : []),
    ].filter(Boolean)
    setSubmitError('')
    setSubmitLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Default internal tenant (later we’ll drive this via widget key / connection).
          tenantId: 'temoweb',
          name: form.name,
          contact: form.contact,
          businessType: businessResolved,
          channel: channelResolved,
          pain: painResolved,
          question: extraQuestion,
          clientMessages,
          aiRecommendation: form.aiRecommendation || form.aiAnswer,
          aiSummary: form.aiSummary || null,
          source: 'flow',
          lang,
        }),
      })
      if (!res.ok) throw new Error('Submit error')
      setStep('done')
    } catch (error) {
      setSubmitError(t.contactErrFailed)
    } finally {
      setSubmitLoading(false)
    }
  }

  const renderStepContent = () => {
    const businessResolved = (form.businessCustom || optionLabel(businessOptions[lang], form.businessType) || '').trim()
    const channelResolved = (
      form.channelCustom ||
      form.channels
        .map((v) => optionLabel(channelOptions[lang], v))
        .filter(Boolean)
        .join(', ') ||
      ''
    ).trim()
    const painResolved = (
      form.painCustom ||
      form.pains
        .map((v) => optionLabel(painOptions[lang], v))
        .filter(Boolean)
        .join(', ') ||
      ''
    ).trim()

    switch (step) {
      case 'intro':
        return (
          <div className="space-y-8 text-center sm:text-left">
            <div className="inline-block px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-400/30">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-300 font-black">
                {t.systemLabel}
              </p>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight">
              {t.heroTitle}
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl">
              {t.heroDesc}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                onClick={next}
                className="group inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 px-8 py-4 text-lg font-black text-white shadow-[0_12px_32px_rgba(99,102,241,0.4)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.6)] hover:scale-105 active:scale-95 transition-all duration-300"
              >
                <span className="flex items-center gap-2">
                  {t.start}
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </button>
              <button
                onClick={() => setStep('contact')}
                className="inline-flex items-center justify-center rounded-2xl px-8 py-4 text-lg font-bold text-white bg-white/10 border-2 border-white/15 hover:bg-white/15 hover:border-indigo-400/50 hover:scale-105 active:scale-95 transition-all duration-300 backdrop-blur-md"
              >
                {t.hurry}
              </button>
            </div>
          </div>
        )
      case 'business':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">{t.businessQuestion}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {(businessOptions[lang] || []).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    // IMPORTANT: do not call next() immediately after setField(),
                    // otherwise validateStep() can run on stale state and show an incorrect red error.
                    setForm((prev) => ({
                      ...prev,
                      businessType: opt.value,
                      businessCustom: opt.value === 'other' ? prev.businessCustom : '',
                    }))
                    setStepError((prev) => ({ ...prev, business: undefined }))
                    if (opt.value !== 'other') setStep('channel')
                  }}
                  className={`w-full text-left px-6 py-5 rounded-2xl min-h-[68px] border-2 transition-all duration-300 group ${
                    form.businessType === opt.value
                      ? 'border-indigo-400/70 bg-gradient-to-r from-indigo-500/15 to-purple-500/10 shadow-[0_8px_24px_rgba(99,102,241,0.3)] scale-[1.02]'
                      : 'border-white/10 bg-white/5 hover:border-indigo-300/60 hover:bg-indigo-500/10 hover:scale-[1.02] hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{opt.label}</span>
                    {form.businessType === opt.value ? '✅' : '→'}
                  </div>
                </button>
              ))}
            </div>
            {form.businessType === 'other' ? (
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
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">{t.channelQuestion}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {(channelOptions[lang] || []).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setForm((prev) => {
                      const exists = prev.channels.includes(opt.value)
                      const nextList = exists
                        ? prev.channels.filter((c) => c !== opt.value)
                        : [...prev.channels, opt.value]
                      return {
                        ...prev,
                        channels: nextList,
                        channelCustom: isOther(opt.value) ? prev.channelCustom : '',
                      }
                    })
                    setStepError((prev) => ({ ...prev, channel: undefined }))
                  }}
                  className={`w-full text-left px-6 py-5 rounded-2xl min-h-[68px] border-2 transition-all duration-300 group ${
                    form.channels.includes(opt.value)
                      ? 'border-indigo-400/70 bg-gradient-to-r from-indigo-500/15 to-purple-500/10 shadow-[0_8px_24px_rgba(99,102,241,0.3)] scale-[1.02]'
                      : 'border-white/10 bg-white/5 hover:border-indigo-300/60 hover:bg-indigo-500/10 hover:scale-[1.02] hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{opt.label}</span>
                    {form.channels.includes(opt.value) ? '✅' : '→'}
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
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">{t.painQuestion}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {(painOptions[lang] || []).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setForm((prev) => {
                      const exists = prev.pains.includes(opt.value)
                      const nextList = exists
                        ? prev.pains.filter((p) => p !== opt.value)
                        : [...prev.pains, opt.value]
                      return {
                        ...prev,
                        pains: nextList,
                        painCustom: isOther(opt.value) ? prev.painCustom : '',
                      }
                    })
                    setStepError((prev) => ({ ...prev, pain: undefined }))
                  }}
                  className={`w-full text-left px-6 py-5 rounded-2xl min-h-[68px] border-2 transition-all duration-300 group ${
                    form.pains.includes(opt.value)
                      ? 'border-indigo-400/70 bg-gradient-to-r from-indigo-500/15 to-purple-500/10 shadow-[0_8px_24px_rgba(99,102,241,0.3)] scale-[1.02]'
                      : 'border-white/10 bg-white/5 hover:border-indigo-300/60 hover:bg-indigo-500/10 hover:scale-[1.02] hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{opt.label}</span>
                    {form.pains.includes(opt.value) ? '✅' : '→'}
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
          <div className="flex flex-col h-[85vh] sm:h-[600px] space-y-0">
            <div className="flex-shrink-0 pb-5 border-b-2 border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-3xl font-black text-white leading-tight">{t.aiTitle}</h2>
                  <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">{t.aiDesc}</p>
                </div>
                <label className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 select-none hover:bg-white/10 transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fastMode}
                    onChange={(e) => setFastMode(e.target.checked)}
                    className="h-4 w-4 accent-indigo-500 cursor-pointer"
                  />
                  <span className="font-semibold">Швидкий режим ⚡</span>
                </label>
              </div>
            </div>

            {form.history.length === 0 && (
              <div className="flex-shrink-0 w-full py-4 overflow-x-auto sm:overflow-visible scrollbar-none">
                <div className="flex gap-2 flex-nowrap sm:flex-wrap min-w-min sm:min-w-0">
                  {aiSuggestions[lang].map((s) => (
                    <button
                      key={s}
                      onClick={() => setField('question', s)}
                      className="px-4 py-2.5 rounded-full bg-gradient-to-r from-white/10 to-white/5 border border-white/20 text-sm font-semibold text-slate-200 hover:border-indigo-400/60 hover:bg-gradient-to-r hover:from-indigo-500/20 hover:to-purple-500/20 hover:text-white hover:scale-105 active:scale-95 transition-all whitespace-nowrap flex-shrink-0 shadow-lg"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto space-y-4 py-3 px-2 scrollbar-thin scrollbar-thumb-indigo-500/30 scrollbar-track-transparent hover:scrollbar-thumb-indigo-500/50"
            >
              {form.history.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-2 px-6">
                    <div className="text-4xl">💬</div>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">{t.aiEmpty}</p>
                  </div>
                </div>
              ) : (
                form.history.map((msg, idx) => (
                  <div key={idx} className={`flex animate-in fade-in slide-in-from-bottom-3 duration-500 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[90%] sm:max-w-[75%] md:max-w-[70%] rounded-3xl px-5 py-3.5 shadow-xl transition-all hover:shadow-2xl ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white shadow-indigo-500/30'
                          : 'bg-gradient-to-br from-slate-800/90 to-slate-700/80 border border-white/10 text-slate-50 backdrop-blur-md shadow-slate-950/50'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-white/10">
                          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                          <span className="text-[10px] uppercase text-indigo-300 font-black tracking-[0.15em]">{t.aiSystem}</span>
                        </div>
                      )}
                      <p className="text-[15px] leading-[1.6] whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}

              {aiLoading && (
                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-3 duration-400">
                  <div className="max-w-[85%] rounded-3xl px-6 py-4 bg-gradient-to-br from-slate-800/90 to-slate-700/80 border border-white/10 backdrop-blur-md shadow-2xl shadow-slate-950/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" style={{ animationDelay: '0.4s' }}></div>
                      <span className="text-slate-200 text-sm font-semibold ml-1">{t.aiThinking}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {form.history.length > 0 && form.history.length < AI_MAX_HISTORY ? (
              <div className="flex-shrink-0 flex items-center justify-center gap-3 py-3">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: AI_MAX_QUESTIONS }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-full transition-all duration-300 ${
                        i < Math.floor(form.history.length / 2)
                          ? 'w-2.5 h-2.5 bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.8)]'
                          : 'w-2 h-2 bg-white/20'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-400 font-bold tracking-wider">
                  {Math.floor(form.history.length / 2)}/{AI_MAX_QUESTIONS}
                </span>
              </div>
            ) : null}

            {aiError ? (
              <div className="flex-shrink-0 px-4 py-2 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 text-sm font-medium">
                {aiError}
              </div>
            ) : null}
            
            {aiProvider === 'fallback' ? (
              <div className="flex-shrink-0 text-[11px] text-amber-200/90 py-1">{t.debugFallback}</div>
            ) : null}

            <div className="flex-shrink-0 pt-5 space-y-3.5 border-t border-white/5">
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
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
                      form.history.length >= AI_MAX_HISTORY
                        ? t.aiInputPlaceholderLimit
                        : t.aiInputPlaceholder
                    }
                    disabled={form.history.length >= AI_MAX_HISTORY || aiLoading}
                    rows={1}
                    className="w-full resize-none rounded-2xl bg-slate-900/80 border-2 border-white/15 pl-5 pr-14 py-4 text-white text-[16px] placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all backdrop-blur-md shadow-lg shadow-slate-950/50 caret-indigo-300"
                  />
                </div>
                <button
                  onClick={handleAskAI}
                  disabled={aiLoading || form.history.length >= AI_MAX_HISTORY || !form.question.trim()}
                  className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white font-black text-2xl flex items-center justify-center hover:from-indigo-600 hover:to-purple-700 hover:scale-110 hover:rotate-3 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:rotate-0 shadow-[0_10px_30px_rgba(99,102,241,0.5)] hover:shadow-[0_15px_40px_rgba(99,102,241,0.7)] transition-all duration-300"
                >
                  {aiLoading ? '…' : '→'}
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                {form.history.length === 0 && (
                  <button
                    onClick={handleAskAI}
                    disabled={aiLoading}
                    className="group inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 px-7 py-4 text-base font-black text-white hover:from-indigo-600 hover:to-purple-700 hover:scale-105 hover:shadow-[0_15px_40px_rgba(99,102,241,0.6)] active:scale-95 transition-all shadow-[0_10px_30px_rgba(99,102,241,0.5)] disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <span className="flex items-center gap-2">
                      {aiLoading ? t.aiShowLoading : t.aiShow}
                      {!aiLoading && <span className="text-lg group-hover:translate-x-1 transition-transform">✨</span>}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => setStep('contact')}
                  className="inline-flex items-center justify-center rounded-2xl px-7 py-4 text-base font-bold text-white bg-white/10 border-2 border-white/20 hover:bg-white/15 hover:border-indigo-400/50 hover:scale-105 active:scale-95 transition-all backdrop-blur-md shadow-lg hover:shadow-xl"
                >
                  {t.aiContinue} →
                </button>
              </div>
            </div>
          </div>
        )
      case 'contact':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">{t.contactTitle}</h2>
            <div className="rounded-2xl border-2 border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 space-y-3 text-sm text-slate-200 backdrop-blur-sm shadow-inner">
              <div className="flex justify-between">
                <span className="text-slate-400">{t.fieldBusiness}</span>
                <span>{businessResolved || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t.fieldChannels}</span>
                <span>{channelResolved || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t.fieldPain}</span>
                <span>{painResolved || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t.fieldAi}</span>
                <span className="text-right">{form.aiRecommendation || form.aiAnswer || '—'}</span>
              </div>
            </div>
            <div className="grid gap-5">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder={t.namePlaceholder}
                className="w-full px-5 py-4 rounded-2xl bg-slate-900/60 border-2 border-white/15 text-white text-[16px] placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all backdrop-blur-sm shadow-lg"
              />
              <input
                type="text"
                value={form.contact}
                onChange={(e) => setField('contact', e.target.value)}
                placeholder={t.contactPlaceholder}
                className="w-full px-5 py-4 rounded-2xl bg-slate-900/60 border-2 border-white/15 text-white text-[16px] placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all backdrop-blur-sm shadow-lg"
              />
            </div>
            {submitError ? <p className="text-red-300 text-sm font-semibold">{submitError}</p> : null}
            <div className="flex flex-wrap gap-4 items-center pt-2">
              <button
                onClick={handleSubmit}
                disabled={submitLoading}
                className="group inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 px-8 py-4 text-base font-black text-white hover:from-emerald-600 hover:to-teal-700 hover:scale-105 active:scale-95 transition-all shadow-[0_12px_32px_rgba(16,185,129,0.4)] hover:shadow-[0_16px_48px_rgba(16,185,129,0.6)] disabled:opacity-50 disabled:hover:scale-100"
              >
                <span className="flex items-center gap-2">
                  {submitLoading ? t.sending : t.send}
                  {!submitLoading && <span className="group-hover:translate-x-1 transition-transform">✓</span>}
                </span>
              </button>
              <button onClick={prev} className="text-slate-400 hover:text-white text-sm font-semibold transition-colors">
                {t.back}
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{t.contactNote}</p>
          </div>
        )
      case 'done':
        return (
          <div className="space-y-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/40 shadow-[0_0_32px_rgba(16,185,129,0.4)] mx-auto">
              <div className="text-5xl">✅</div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">{t.doneTitle}</h2>
            <p className="text-lg text-slate-300 leading-relaxed max-w-md mx-auto">{t.doneDesc}</p>
            <div className="rounded-2xl border-2 border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 text-left space-y-3.5 text-sm text-slate-200 backdrop-blur-sm shadow-inner">
              <div className="flex justify-between">
                <span className="text-slate-400">{t.fieldBusiness}</span>
                <span>{businessResolved || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t.fieldChannels}</span>
                <span>{channelResolved || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t.fieldPain}</span>
                <span>{painResolved || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t.fieldAi}</span>
                <span className="text-right">{form.aiRecommendation || form.aiAnswer || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t.fieldContact}</span>
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
                  aiSummary: '',
                  name: '',
                  contact: '',
                })
                setStep('intro')
              }}
              className="inline-flex items-center justify-center rounded-2xl px-7 py-3.5 text-base font-bold text-white bg-white/10 border-2 border-white/15 hover:bg-white/15 hover:border-indigo-400/50 hover:scale-105 active:scale-95 transition-all backdrop-blur-md shadow-lg"
            >
              {t.another}
            </button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <main className="relative min-h-screen bg-slate-950 text-white overflow-x-hidden overscroll-x-none">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-slate-950 to-purple-900/30"></div>
        <div className="absolute -top-10 -right-10 w-80 h-80 bg-purple-500/20 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-indigo-500/20 blur-3xl rounded-full"></div>
      </div>

      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-slate-950/90 border-b-2 border-white/10 shadow-xl shadow-slate-950/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <img src="/logo.png" alt="TemoWeb" className="h-10 w-10 rounded-xl border-2 border-white/15 shadow-lg group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute inset-0 bg-indigo-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.15em] text-indigo-200 font-black">TemoWeb</p>
              <p className="text-[11px] text-slate-400 font-medium">{t.headerSubtitle}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-sm text-emerald-200 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            {t.headerStatus}
          </div>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="flex flex-wrap gap-3">
          {(['ua', 'ru', 'cz'] as Lang[]).map((lng) => (
            <button
              key={lng}
              onClick={() => setLang(lng)}
              className={`rounded-full px-5 py-2.5 text-sm font-black border-2 transition-all duration-300 ${
                lang === lng
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-indigo-400/60 shadow-[0_8px_24px_rgba(99,102,241,0.5)] scale-110'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:scale-105'
              }`}
            >
              {lng.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="mb-8 flex items-center gap-4">
          <div className="flex-1 h-2.5 rounded-full bg-slate-800/60 overflow-hidden border border-white/10 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-purple-500 shadow-[0_0_16px_rgba(99,102,241,0.6)] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="text-sm text-slate-300 font-semibold tabular-nums">
            {currentIndex + 1}/{steps.length}
          </span>
        </div>

        <div className="flex gap-2.5 flex-wrap mb-8">
          {steps.map((s, idx) => {
            const isActive = idx === currentIndex
            const isDone = idx < currentIndex
            return (
              <div
                key={s.id}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-bold border-2 transition-all duration-300 ${
                  isActive
                    ? 'border-indigo-400/70 bg-gradient-to-r from-indigo-500/15 to-purple-500/15 text-indigo-50 shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-105'
                    : isDone
                    ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-50 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                    : 'border-white/10 bg-white/5 text-slate-500'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black transition-all ${
                    isActive
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.6)]'
                      : isDone
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                      : 'bg-slate-800/60 text-slate-500 border border-white/10'
                  }`}
                >
                  {isDone ? '✓' : idx + 1}
                </span>
                <span className="tracking-wide">{s.label}</span>
              </div>
            )
          })}
        </div>

        <div className="relative overflow-hidden rounded-3xl border-2 border-white/10 bg-gradient-to-br from-slate-800/50 via-slate-800/40 to-slate-900/50 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.5)] hover:border-white/15 transition-all duration-300">
          <div className="absolute -top-16 -left-16 w-56 h-56 bg-indigo-500/15 blur-[80px]"></div>
          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-purple-500/15 blur-[80px]"></div>
          <div className={`relative ${step === 'ai' ? 'p-5 sm:p-8' : 'p-7 sm:p-10'}`}>
            <div className={`mb-4 text-sm text-slate-300 ${step === 'ai' ? 'hidden sm:block' : ''}`}>
              {t.step} {currentIndex + 1} {t.of} {steps.length}
            </div>
            {renderStepContent()}
            {step !== 'intro' && step !== 'contact' && step !== 'done' ? (
              <div className="mt-8 flex justify-between items-center">
                <button onClick={prev} className="text-slate-300 hover:text-white text-sm">
                  {t.back}
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


