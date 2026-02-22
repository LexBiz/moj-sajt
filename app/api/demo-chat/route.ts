import { NextRequest, NextResponse } from 'next/server'

type DemoMessage = {
  role: 'client' | 'assistant'
  content: string
}

type UiLang = 'en' | 'ru' | 'ua' | 'cz'
type IndustryArchetype = 'auto' | 'dental' | 'law' | 'mortgage' | 'general'
type DealStage = 'qualification' | 'urgency' | 'offer' | 'commitment' | 'conversion'
type PaymentState = 'none' | 'pending' | 'paid'

function getOpenAiKey() {
  const key = String(process.env.OPENAI_API_KEY || '').trim()
  return key || null
}

function normalizeLang(input: unknown): UiLang {
  const raw = String(input || '').trim().toLowerCase()
  if (raw === 'ru') return 'ru'
  if (raw === 'ua' || raw === 'cz') return 'cz'
  return 'en'
}

function languageInstruction(lang: UiLang) {
  if (lang === 'ru') return 'Reply in Russian.'
  if (lang === 'cz') return 'Reply in Czech.'
  return 'Reply in English.'
}

function normalizeStage(input: unknown): DealStage {
  const raw = String(input || '').trim().toLowerCase()
  if (raw === 'urgency' || raw === 'offer' || raw === 'commitment' || raw === 'conversion') return raw
  return 'qualification'
}

function stagePromptHint(stage: DealStage) {
  if (stage === 'qualification') return 'Current stage: Qualification. Identify lead quality quickly and ask only high-signal questions.'
  if (stage === 'urgency') return 'Current stage: Urgency / Need clarity. Confirm urgency and collect 1-2 details needed to proceed.'
  if (stage === 'offer') return 'Current stage: Offer concrete option. Offer 2 concrete options (slots/prices/actions) and push for a decision.'
  if (stage === 'commitment') return 'Current stage: Commitment. Lock intent into a concrete action (slot, documents, payment link).'
  return 'Current stage: Conversion step. Finalize booking/payment/data capture with one clear action.'
}

function industryBehaviorHint(archetype: IndustryArchetype) {
  if (archetype === 'dental')
    return 'Industry behavior: urgency + medical tone, triage risk quickly, push to nearest clinical slot.'
  if (archetype === 'auto')
    return 'Industry behavior: focus on availability, same-day windows, part/service availability, and exact time windows.'
  if (archetype === 'law')
    return 'Industry behavior: push to consultation slot and request documents required for legal assessment.'
  if (archetype === 'mortgage')
    return 'Industry behavior: run eligibility screening and request concise document checklist.'
  return 'Industry behavior: operate like a decisive sales/operations manager for local services.'
}

function normalizePaymentState(input: unknown): PaymentState {
  const raw = String(input || '').trim().toLowerCase()
  if (raw === 'pending' || raw === 'paid') return raw
  return 'none'
}

function normalizeAction(input: unknown): string {
  return String(input || '').trim().toLowerCase().slice(0, 64)
}

function fixedActionReply(params: {
  action: string
  paymentState: PaymentState
  slotLabel: string
  lang: UiLang
}): string | null {
  const { action, paymentState, slotLabel, lang } = params
  const t = (en: string, ru: string, cz: string) => (lang === 'ru' ? ru : lang === 'cz' ? cz : en)
  const slot = slotLabel || t('nearest available slot', 'ближайший доступный слот', 'nejbližší dostupný termín')

  // No stage regression: paid state must never mention sending link.
  if (paymentState === 'paid' || action === 'payment_confirmed') {
    return t(
      `Payment received. Slot ${slot} is locked. Should I send confirmation by SMS or email?`,
      `Оплата получена. Слот ${slot} закреплен. Подтверждение отправить в SMS или email?`,
      `Platba přijata. Termín ${slot} je uzamčen. Poslat potvrzení SMS nebo e‑mailem?`
    )
  }

  if (action === 'payment_requested') {
    return t(
      `Sending a prepayment link for EUR 20 now. After payment, the slot is locked automatically.`,
      `Отправляю ссылку на предоплату 20 EUR. После оплаты слот закрепляется автоматически.`,
      `Posílám odkaz na zálohu 20 EUR. Po platbě se termín uzamkne automaticky.`
    )
  }

  if (action === 'slot_confirmed') {
    return t(
      `Great. Slot ${slot} is reserved. Send your phone and I’ll confirm immediately.`,
      `Отлично. Слот ${slot} забронирован. Напишите номер, и сразу подтвержу.`,
      `Skvěle. Termín ${slot} je rezervován. Pošlete telefon a hned potvrdím.`
    )
  }

  if (action === 'booking_confirmed') {
    return t(
      `Booked. Slot ${slot} is confirmed. Should I send details by SMS or email?`,
      `Запись оформлена. Слот ${slot} подтвержден. Отправить детали в SMS или email?`,
      `Rezervace hotova. Termín ${slot} je potvrzen. Poslat detaily SMS nebo e‑mailem?`
    )
  }

  return null
}

function normalizeIndustry(raw: string, lang: UiLang): { display: string; normalized: string; archetype: IndustryArchetype } {
  const display = raw.trim().slice(0, 80) || (lang === 'ru' ? 'ваш бизнес' : lang === 'cz' ? 'váš byznys' : 'your business')
  const i = display.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim()

  const autoRe =
    /(auto|авто|car|garage|mechanic|service station|autoservis|servis|sto|шин|brake|mot|detailing|кузов|тормоз|масл)/i
  const dentalRe = /(dental|dentist|стомат|зуб|clinic|klinika|ortho|ортодонт|implant)/i
  const lawRe = /(law|legal|юрист|адвокат|práv|smlouv|contract|court|суд|notary|нотари)/i
  const mortgageRe =
    /(mortgage|hypot|estate|real estate|недвиж|ипот|realt|broker|property|byt|apartment|квартир|дом)/i

  if (autoRe.test(i)) return { display, normalized: i, archetype: 'auto' }
  if (dentalRe.test(i)) return { display, normalized: i, archetype: 'dental' }
  if (lawRe.test(i)) return { display, normalized: i, archetype: 'law' }
  if (mortgageRe.test(i)) return { display, normalized: i, archetype: 'mortgage' }
  return { display, normalized: i, archetype: 'general' }
}

function getIndustrySeed(industry: string, archetype: IndustryArchetype, lang: UiLang) {
  const isRu = lang === 'ru'
  const isCz = lang === 'cz'

  if (archetype === 'auto') {
    if (isRu) {
      return {
        firstClient:
          'Здравствуйте, у меня Volkswagen Passat 2018. Скрипят задние тормоза и педаль стала мягче со вчерашнего дня. Можно сегодня после 16:00?',
        secondClient:
          'Машина нужна завтра утром, поэтому важно сделать диагностику сегодня. Если можно, перезвоните в течение 15 минут.',
        thirdClient: 'Да, запишите меня на сегодня. Подъеду примерно к 17:30.',
      }
    }
    if (isCz) {
      return {
        firstClient:
          'Dobrý den, mám Volkswagen Passat 2018. Zadní brzdy pískají a pedál je od včerejška měkčí. Můžete mě vzít dnes po 16:00?',
        secondClient:
          'Auto potřebuji zítra ráno, takže je důležitá kontrola ještě dnes. Pokud lze, zavolejte mi do 15 minut.',
        thirdClient: 'Ano, prosím rezervujte mě na dnešek. Dorazím kolem 17:30.',
      }
    }
    return {
      firstClient:
        'Hi, I have a 2018 Volkswagen Passat. Rear brakes are squeaking and the pedal feels soft since yesterday. Can you take it today after 16:00?',
      secondClient:
        'I need the car tomorrow morning, so same-day check is important. If possible, please call me in 15 minutes.',
      thirdClient: 'Yes, please book me for today. I can arrive around 17:30.',
    }
  }
  if (archetype === 'dental') {
    if (isRu) {
      return {
        firstClient:
          'Здравствуйте, с ночи сильная боль в нижнем правом зубе и небольшой отек. Есть срочное окно сегодня?',
        secondClient:
          'Боль примерно 8 из 10, обезболивающее помогает слабо. Смогу приехать после работы около 18:00.',
        thirdClient: 'Запишите, пожалуйста, на самое раннее доступное время сегодня.',
      }
    }
    if (isCz) {
      return {
        firstClient:
          'Dobrý den, od noci mám silnou bolest dolního pravého zubu a mírný otok. Máte dnes urgentní termín?',
        secondClient:
          'Bolest je asi 8 z 10, léky moc nepomáhají. Mohu přijet po práci kolem 18:00.',
        thirdClient: 'Prosím, rezervujte mě na nejbližší dostupný termín dnes.',
      }
    }
    return {
      firstClient:
        'Hello, I have strong tooth pain on the lower right side since last night and slight swelling. Do you have an urgent slot today?',
      secondClient:
        'Pain is 8/10 and painkillers do not help much. I can come after work around 18:00.',
      thirdClient: 'Please book the earliest available appointment today.',
    }
  }
  if (archetype === 'law') {
    if (isRu) {
      return {
        firstClient:
          'Здравствуйте, нужен юрист по спору с поставщиком на сумму около 24 000 EUR. Суд через 9 дней. Можете посмотреть документы на этой неделе?',
        secondClient:
          'У меня готовы договор, счета и переписка. Нужен понятный план действий и сроки.',
        thirdClient: 'Да, давайте назначим консультацию завтра утром.',
      }
    }
    if (isCz) {
      return {
        firstClient:
          'Dobrý den, potřebuji právní pomoc se sporem s dodavatelem cca 24 000 EUR. Soud je za 9 dní. Můžete dokumenty projít tento týden?',
        secondClient:
          'Mám připravenou smlouvu, faktury i e-mailovou komunikaci. Potřebuji jasný postup a časový plán.',
        thirdClient: 'Ano, prosím naplánujme konzultaci zítra ráno.',
      }
    }
    return {
      firstClient:
        'Hi, I need legal help with a supplier contract dispute for about EUR 24,000. Court hearing is in 9 days. Can you review documents this week?',
      secondClient:
        'I have the contract, invoices, and email history ready. I need a clear action plan and likely timeline.',
      thirdClient: 'Yes, please schedule a consultation call tomorrow morning.',
    }
  }
  if (archetype === 'mortgage') {
    if (isRu) {
      return {
        firstClient:
          'Здравствуйте, хочу купить 2-комнатную квартиру в Праге, бюджет около 280 000 EUR, по ипотеке предварительное одобрение в процессе. Можете проконсультировать на этой неделе?',
        secondClient:
          'Нужен реалистичный расчет ежемесячного платежа и подбор районов рядом с метро.',
        thirdClient: 'Да, запишите на консультацию и пришлите свободные слоты.',
      }
    }
    if (isCz) {
      return {
        firstClient:
          'Dobrý den, chci koupit 2+kk v Praze, rozpočet kolem 280 000 EUR, hypotéka je v předschválení. Můžete poradit tento týden?',
        secondClient:
          'Potřebuji realistický odhad měsíční splátky a výběr vhodných lokalit u metra.',
        thirdClient: 'Ano, prosím rezervujte konzultaci a pošlete volné termíny.',
      }
    }
    return {
      firstClient:
        'Hello, I want to buy a 2-bedroom apartment in Prague, budget around EUR 280k, with mortgage pre-approval in progress. Can someone advise this week?',
      secondClient:
        'I need a realistic monthly payment estimate and a shortlist of suitable areas close to metro.',
      thirdClient: 'Yes, please book a consultation and send available time slots.',
    }
  }
  if (isRu) {
    return {
      firstClient: `Здравствуйте, нужна помощь по направлению "${industry}". Есть срочные входящие заявки, нужен быстрый и понятный процесс обработки. Можете помочь сегодня?`,
      secondClient: 'Нужен понятный следующий шаг, сроки и кто будет вести первый контакт.',
      thirdClient: 'Да, назначьте короткий созвон и подскажите, что подготовить заранее.',
    }
  }
  if (isCz) {
    return {
      firstClient: `Dobrý den, potřebuji pomoc v oboru "${industry}". Máme urgentní poptávky a potřebujeme rychlý proces zpracování. Můžete pomoci ještě dnes?`,
      secondClient: 'Potřebuji jasný další krok, časový rámec a kdo převezme první kontakt.',
      thirdClient: 'Ano, prosím domluvme krátký call a napište, co mám připravit.',
    }
  }
  return {
    firstClient: `Hi, I need help with ${industry}. We have urgent incoming requests and need a fast response process. Can you advise today?`,
    secondClient: 'We need a clear next step, expected timeline, and who will handle the first contact.',
    thirdClient: 'Yes, please book a quick call and tell me what information to prepare.',
  }
}

function fallbackMessages(industry: string, archetype: IndustryArchetype, lang: UiLang): DemoMessage[] {
  const seed = getIndustrySeed(industry, archetype, lang)
  return [
    { role: 'client', content: seed.firstClient },
    {
      role: 'assistant',
      content:
        lang === 'ru'
          ? `Принял запрос по "${industry}". Для быстрого старта нужны: удобное время и контакт. После этого сразу предложу ближайший слот на сегодня.`
          : lang === 'cz'
            ? `Rozumím požadavku pro "${industry}". Pro rychlý start potřebuji vhodný čas a kontakt. Poté hned nabídnu nejbližší termín ještě dnes.`
            : `Request received for "${industry}". To move fast, share preferred time and contact; I will immediately offer the nearest slot today.`,
    },
    { role: 'client', content: seed.secondClient },
    {
      role: 'assistant',
      content:
        lang === 'ru'
          ? 'Ок, беру в приоритет. Подтвердите: запуск нужен сегодня? Если да, даю два окна на выбор и закрепляю одно сразу.'
          : lang === 'cz'
            ? 'Rozumím, beru to prioritně. Potvrďte: potřebujete řešení dnes? Pokud ano, pošlu dva termíny a jeden hned zamknu.'
            : 'Understood, I am setting this as priority. Confirm if same-day handling is required; if yes, I will send two slot options and lock one immediately.',
    },
    { role: 'client', content: seed.thirdClient },
    {
      role: 'assistant',
      content:
        lang === 'ru'
          ? 'Отлично, фиксируем. Пришлите номер и удобный интервал — подтвержу слот и отправлю короткий чек-лист перед визитом.'
          : lang === 'cz'
            ? 'Skvělé, jdeme na potvrzení. Pošlete telefon a preferovaný interval, termín potvrdím a pošlu krátký checklist před návštěvou.'
            : 'Great, let us finalize. Share your phone and preferred time range; I will confirm the slot and send a short pre-visit checklist.',
    },
  ]
}

function buildAssistantFallback(params: {
  industry: string
  archetype: IndustryArchetype
  stage: DealStage
  scenarioType: string
  lang: UiLang
}) {
  const { industry, archetype, stage, scenarioType, lang } = params
  const t = (en: string, ru: string, cz: string) => (lang === 'ru' ? ru : lang === 'cz' ? cz : en)

  const slots =
    archetype === 'dental'
      ? ['17:40', '18:20']
      : archetype === 'auto'
        ? ['16:30', '17:10']
        : archetype === 'law'
          ? ['10:30', '13:10']
          : archetype === 'mortgage'
            ? ['12:40', '17:20']
            : ['16:20', '18:00']

  const priceRange =
    archetype === 'dental'
      ? t('EUR 50–120', 'EUR 50–120', 'EUR 50–120')
      : archetype === 'auto'
        ? t('EUR 40–90', 'EUR 40–90', 'EUR 40–90')
        : archetype === 'law'
          ? t('EUR 90–180', 'EUR 90–180', 'EUR 90–180')
          : archetype === 'mortgage'
            ? t('EUR 0–60', 'EUR 0–60', 'EUR 0–60')
            : t('EUR 50–150', 'EUR 50–150', 'EUR 50–150')

  if (scenarioType === 'payment_requested') {
    return t(
      `Sending a prepayment link for EUR 20 now. After payment, the slot is locked automatically. Should I send confirmation by SMS or email?`,
      `Отправляю ссылку на предоплату 20 EUR. После оплаты слот закрепляется автоматически. Подтверждение отправить в SMS или на email?`,
      `Posílám odkaz na zálohu 20 EUR. Po platbě se termín uzamkne automaticky. Potvrzení poslat SMS nebo e‑mailem?`
    )
  }
  if (scenarioType === 'payment_confirmed') {
    return t(
      `Payment received. Slot is locked. Should I send confirmation by SMS or email?`,
      `Оплата получена. Слот закреплен. Подтверждение отправить в SMS или email?`,
      `Platba přijata. Termín je uzamčen. Poslat potvrzení SMS nebo e‑mailem?`
    )
  }

  // Stage-specific, no narration, decisive.
  if (stage === 'qualification') {
    if (archetype === 'dental') {
      return t(
        `Understood. I can offer 17:40 or 18:20 today. Which slot should I lock?`,
        `Понял. Могу дать 17:40 или 18:20 сегодня. Какой слот зафиксировать?`,
        `Rozumím. Mohu nabídnout 17:40 nebo 18:20 dnes. Který termín mám uzamknout?`
      )
    }
    if (archetype === 'auto') {
      return t(
        `Ok. Make/model + symptom + when you can arrive today. I will confirm the nearest window.`,
        `Ок. Марка/модель + симптом + когда можете подъехать сегодня. Подтвержу ближайшее окно.`,
        `Ok. Značka/model + symptom + kdy můžete dnes dorazit. Potvrdím nejbližší okno.`
      )
    }
    if (archetype === 'law') {
      return t(
        `Understood. Deadline date + what documents you have. Then I will lock a consult slot.`,
        `Принял. Дата дедлайна + какие документы уже есть. После этого закреплю слот консультации.`,
        `Rozumím. Termín (deadline) + jaké dokumenty už máte. Pak zamknu termín konzultace.`
      )
    }
    if (archetype === 'mortgage') {
      return t(
        `Quick check: income type, residency status, down payment. Then I will book a call.`,
        `Быстрая проверка: тип дохода, резидентство, первый взнос. Дальше бронирую звонок.`,
        `Rychlá kontrola: typ příjmu, rezidence, akontace. Pak zarezervuji call.`
      )
    }
    return t(
      `Ok. What’s the main request + how urgent + best contact time today?`,
      `Ок. Что именно нужно + насколько срочно + когда удобно для связи сегодня?`,
      `Ok. Co přesně potřebujete + jak je to urgentní + kdy se vám dnes hodí kontakt?`
    )
  }

  if (stage === 'urgency') {
    if (archetype === 'dental') {
      return t(
        `Understood. I can offer ${slots[0]} or ${slots[1]} today. Quick intake takes about 10 minutes. Which slot do you take?`,
        `Понял. Есть окно сегодня в ${slots[0]} или ${slots[1]}. Быстрый приём займет около 10 минут. Какой слот берём?`,
        `Rozumím. Mám dnes termín ${slots[0]} nebo ${slots[1]}. Rychlý intake trvá asi 10 minut. Který berete?`
      )
    }
    return t(
      `Got it. I can offer ${slots[0]} or ${slots[1]} today. Which one should I hold?`,
      `Понял. Есть окно сегодня в ${slots[0]} или ${slots[1]}. Какое держу за вами?`,
      `Rozumím. Mám dnes okno v ${slots[0]} nebo ${slots[1]}. Které vám mám podržet?`
    )
  }

  if (stage === 'offer') {
    if (scenarioType === 'price') {
      return t(
        `Range is ${priceRange}. I can hold ${slots[0]} or ${slots[1]} today — which slot do you take?`,
        `По цене ориентир ${priceRange}. Могу удержать ${slots[0]} или ${slots[1]} сегодня — какой слот берём?`,
        `Cena orientačně ${priceRange}. Mohu podržet ${slots[0]} nebo ${slots[1]} dnes — který termín berete?`
      )
    }
    if (scenarioType === 'docs' && (archetype === 'law' || archetype === 'mortgage')) {
      return t(
        `Send the key docs and I’ll confirm the slot: contract + invoices (law) / income + ID (mortgage).`,
        `Пришлите ключевые документы — и подтверждаю слот: договор+счета (юристы) / доход+ID (ипотека).`,
        `Pošlete klíčové dokumenty a potvrdím termín: smlouva+faktury (právo) / příjem+ID (hypo).`
      )
    }
    if (archetype === 'auto') {
      return t(
        `I can take you at ${slots[0]} or ${slots[1]} today. Inspection is ~15 minutes. Which slot do you take?`,
        `Могу принять в ${slots[0]} или ${slots[1]} сегодня. Осмотр ~15 минут. Какой слот берём?`,
        `Mohu vás vzít v ${slots[0]} nebo ${slots[1]} dnes. Kontrola ~15 minut. Který termín berete?`
      )
    }
    if (archetype === 'law') {
      return t(
        `I can book a consult at ${slots[0]} or ${slots[1]}. Send the contract + key emails before the call.`,
        `Могу поставить консультацию на ${slots[0]} или ${slots[1]}. До звонка пришлите договор и ключевую переписку.`,
        `Mohu domluvit konzultaci v ${slots[0]} nebo ${slots[1]}. Před callem pošlete smlouvu a klíčové e-maily.`
      )
    }
    if (archetype === 'mortgage') {
      return t(
        `I can schedule a call at ${slots[0]} or ${slots[1]}. Bring: income proof + ID + down payment amount.`,
        `Могу поставить звонок на ${slots[0]} или ${slots[1]}. Подготовьте: доход + ID + размер первого взноса.`,
        `Mohu naplánovat call v ${slots[0]} nebo ${slots[1]}. Připravte: příjem + ID + výši akontace.`
      )
    }
    return t(
      `Option A: ${slots[0]} today. Option B: ${slots[1]} today. Pick one and I’ll confirm.`,
      `Вариант A: ${slots[0]} сегодня. Вариант B: ${slots[1]} сегодня. Выберите — подтвержу.`,
      `Varianta A: ${slots[0]} dnes. Varianta B: ${slots[1]} dnes. Vyberte — potvrdím.`
    )
  }

  if (stage === 'commitment') {
    if (scenarioType === 'call') {
      return t(
        `Send your phone + a 30‑minute window. I’ll confirm the call time.`,
        `Напишите номер + окно 30 минут. Подтвержу время звонка.`,
        `Pošlete telefon + 30min okno. Potvrdím čas hovoru.`
      )
    }
    if (scenarioType === 'payment') {
      return t(
        `I can send a payment link now to lock the slot. Card payment ok?`,
        `Могу отправить ссылку на оплату, чтобы закрепить слот. Карта подходит?`,
        `Mohu poslat platební odkaz pro zajištění termínu. Platba kartou ok?`
      )
    }
    return t(
      `Confirm ${slots[0]} or ${slots[1]} and share contact — I’ll lock it.`,
      `Подтвердите ${slots[0]} или ${slots[1]} и оставьте контакт — закреплю.`,
      `Potvrďte ${slots[0]} nebo ${slots[1]} a kontakt — zamknu to.`
    )
  }

  // conversion
  if (scenarioType === 'payment') {
    return t(
      `Payment received. Booking confirmed. Want the confirmation by SMS or email?`,
      `Оплата прошла. Запись подтверждена. Подтверждение прислать SMS или на email?`,
      `Platba přijata. Rezervace potvrzena. Poslat potvrzení SMS nebo e‑mailem?`
    )
  }
  return t(
    `Booked. Send your name + phone, and I’ll send confirmation.`,
    `Записал. Имя + номер — и отправляю подтверждение.`,
    `Zarezervováno. Jméno + telefon a pošlu potvrzení.`
  )
}

function sanitizeMessages(input: unknown, industry: string, archetype: IndustryArchetype, lang: UiLang): DemoMessage[] {
  const rows = Array.isArray(input) ? input : []
  const normalized: DemoMessage[] = rows
    .map((row) => {
      const role = row && typeof row === 'object' ? (row as any).role : ''
      const content = row && typeof row === 'object' ? (row as any).content : ''
      if ((role !== 'client' && role !== 'assistant') || typeof content !== 'string') return null
      const c = content.trim().replace(/\s+/g, ' ')
      if (!c) return null
      return { role, content: c } as DemoMessage
    })
    .filter((x): x is DemoMessage => Boolean(x))
    .slice(0, 10)

  if (!normalized.length) return []

  let aiCount = 0
  const limited: DemoMessage[] = []
  for (const msg of normalized) {
    if (msg.role === 'assistant') {
      if (aiCount >= 3) continue
      aiCount += 1
    }
    limited.push(msg)
    if (limited.length >= 6) break
  }

  return limited
}

function parseJsonObject(raw: string) {
  const direct = raw.trim()
  try {
    return JSON.parse(direct)
  } catch {}

  const start = direct.indexOf('{')
  const end = direct.lastIndexOf('}')
  if (start >= 0 && end > start) {
    const chunk = direct.slice(start, end + 1)
    try {
      return JSON.parse(chunk)
    } catch {}
  }
  return null
}

export async function POST(req: NextRequest) {
  const rawBody = await req.json().catch(() => ({}))
  const industryRaw = typeof rawBody?.industry === 'string' ? rawBody.industry : ''
  const industryClean = industryRaw.trim().slice(0, 80)
  const lang = normalizeLang(rawBody?.lang)
  const normalizedIndustry = normalizeIndustry(industryClean, lang)
  const industry = normalizedIndustry.display
  const archetype = normalizedIndustry.archetype
  const stage = normalizeStage(rawBody?.stage)
  const scenarioType = typeof rawBody?.scenarioType === 'string' ? rawBody.scenarioType.trim().slice(0, 40) : ''
  const action = normalizeAction(rawBody?.action)
  const paymentState = normalizePaymentState(rawBody?.paymentState)
  const slotLabel = typeof rawBody?.slotLabel === 'string' ? rawBody.slotLabel.trim().slice(0, 20) : ''
  const inputMessages = Array.isArray(rawBody?.messages) ? rawBody.messages : null

  const criticalText = fixedActionReply({ action, paymentState, slotLabel, lang })
  if (criticalText) return NextResponse.json({ messages: [{ role: 'assistant', content: criticalText }] }, { status: 200 })

  try {
    const key = getOpenAiKey()
    if (!key) {
      // Keep the demo usable even when env/key is temporarily unavailable.
      const content = buildAssistantFallback({ industry, archetype, stage, scenarioType, lang })
      return NextResponse.json({ messages: [{ role: 'assistant', content }] }, { status: 200 })
    }

    if (!industryClean) {
      return NextResponse.json({ error: 'industry is required' }, { status: 400 })
    }

    const model = String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()
    const modelLower = model.toLowerCase()
    const isGpt5 = modelLower.startsWith('gpt-5') || modelLower.startsWith('gpt5')
    const systemPrompt =
      `You are a high-performing client manager in ${industry}.
Your goal is to push the client to a concrete next step immediately.
Each reply must:
- Move conversation forward.
- Offer specific options (time slots, price range, document action, or payment).
- Avoid explanations and theory.
- Avoid checklist-style questioning.
- First offer a concrete slot/option, then ask at most 1 clarification if needed.
- Sound like a decisive business operator.
- Keep reply to 2-4 short sentences.
- Do not narrate workflow or internal systems.
- Avoid repeating previous wording.
${stagePromptHint(stage)}
${industryBehaviorHint(archetype)}
${languageInstruction(lang)}`

    const continuationInput: DemoMessage[] = sanitizeMessages(inputMessages, industry, archetype, lang).slice(0, 6)
    const userPrompt = [
      'Return ONLY valid JSON with this exact shape: {"messages":[{"role":"assistant","content":"..."}]}.',
      'Generate ONE assistant reply only.',
      `Stage: ${stage}.`,
      `Scenario type: ${scenarioType || 'generic'}.`,
      `Resolved action: ${action || 'none'}.`,
      `Payment state: ${paymentState}.`,
      `Slot label: ${slotLabel || '-'}.`,
      'Do not reuse wording patterns from prior assistant replies in this chat.',
      'Each reply must move the deal forward with a concrete next step.',
      'Offer specific options (time slots / price range / required document list / payment).',
      'No internal process narration. No CRM/system mentions.',
      `Conversation: ${JSON.stringify(continuationInput)}`,
    ].join(' ')

    const payload: Record<string, unknown> = {
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }
    if (!isGpt5) payload.temperature = 0.4
    payload[isGpt5 ? 'max_completion_tokens' : 'max_tokens'] = 500

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    })

    if (!resp.ok) {
      const content = buildAssistantFallback({ industry, archetype, stage, scenarioType, lang })
      return NextResponse.json({ messages: [{ role: 'assistant', content }] }, { status: 200 })
    }

    const json = await resp.json()
    const content = String(json?.choices?.[0]?.message?.content || '').trim()
    const parsed = parseJsonObject(content)
    const safe = sanitizeMessages(parsed?.messages, industry, archetype, lang)
    const assistantOnly = safe.filter((m) => m.role === 'assistant').slice(0, 1)
    if (!assistantOnly.length) {
      const fallback = buildAssistantFallback({ industry, archetype, stage, scenarioType, lang })
      return NextResponse.json({ messages: [{ role: 'assistant', content: fallback }] }, { status: 200 })
    }
    return NextResponse.json({ messages: assistantOnly }, { status: 200 })
  } catch {
    const content = buildAssistantFallback({ industry, archetype, stage, scenarioType, lang })
    return NextResponse.json({ messages: [{ role: 'assistant', content }] }, { status: 200 })
  }
}
