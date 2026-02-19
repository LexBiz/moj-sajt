import { NextRequest, NextResponse } from 'next/server'

type DemoMessage = {
  role: 'client' | 'assistant'
  content: string
}

type UiLang = 'en' | 'ru' | 'ua' | 'cz'

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

function getIndustrySeed(industry: string, lang: UiLang) {
  const i = industry.toLowerCase()
  const isRu = lang === 'ru'
  const isCz = lang === 'cz'

  if (i.includes('auto') || i.includes('авто') || i.includes('autoservis')) {
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
  if (i.includes('dental') || i.includes('стомат') || i.includes('stomat')) {
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
  if (i.includes('law') || i.includes('юрист') || i.includes('práv')) {
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
  if (i.includes('estate') || i.includes('mortgage') || i.includes('недвиж') || i.includes('hypot')) {
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

function fallbackMessages(industry: string, lang: UiLang): DemoMessage[] {
  const seed = getIndustrySeed(industry, lang)
  return [
    { role: 'client', content: seed.firstClient },
    {
      role: 'assistant',
      content:
        lang === 'ru'
          ? `Спасибо за детали. По направлению "${industry}" обычно начинаем с короткой диагностики (10-15 минут), чтобы подтвердить объем и приоритет. Напишите удобное время и номер телефона — поставлю в ближайшее окно на сегодня.`
          : lang === 'cz'
            ? `Děkujeme za upřesnění. U oboru "${industry}" obvykle začínáme krátkou diagnostikou (10-15 minut), abychom potvrdili rozsah a prioritu. Pošlete vhodný čas a telefon a zařadím vás do nejbližšího volného slotu dnes.`
            : `Thanks for the details. For ${industry}, we usually start with a quick diagnostic step (10-15 minutes) to confirm scope and priority. If you share your preferred time and contact number, I can place you into the nearest available slot today.`,
    },
    { role: 'client', content: seed.secondClient },
    {
      role: 'assistant',
      content:
        lang === 'ru'
          ? 'Понял. Типовой процесс: короткий intake, проверка приоритета, затем подтверждающий звонок с точным временем и следующим шагом. Подтвердите, нужен ли запуск сегодня и в какое окно удобно принять звонок.'
          : lang === 'cz'
            ? 'Rozumím. Typický postup: krátký intake, kontrola priority, potom potvrzovací hovor s přesným časem a dalším krokem. Potvrďte prosím, zda je nutné řešení ještě dnes a kdy vám vyhovuje callback.'
            : 'Understood. Typical workflow is: quick intake, priority check, then confirmation call with exact timing and next action. Please confirm whether same-day handling is required and the best callback window.',
    },
    { role: 'client', content: seed.thirdClient },
    {
      role: 'assistant',
      content:
        lang === 'ru'
          ? 'Отлично, заявку на запись зарегистрировал. Следующий шаг: оставьте номер телефона и удобный интервал времени, менеджер подтвердит слот и пришлет короткий чек-лист.'
          : lang === 'cz'
            ? 'Skvělé, požadavek na rezervaci je zaregistrován. Další krok: pošlete telefon a preferovaný časový interval, manager potvrdí termín a pošle krátký checklist.'
            : 'Great, booking request registered. Next step: leave your phone number and preferred time range, and our manager will confirm the slot and checklist shortly.',
    },
  ]
}

function sanitizeMessages(input: unknown, industry: string, lang: UiLang): DemoMessage[] {
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
    .slice(0, 8)

  if (!normalized.length) return fallbackMessages(industry, lang)

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

  return limited.length ? limited : fallbackMessages(industry, lang)
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
  const industry = industryClean || 'your business'
  const lang = normalizeLang(rawBody?.lang)
  const inputMessages = Array.isArray(rawBody?.messages) ? rawBody.messages : null

  try {
    const key = getOpenAiKey()
    if (!key) {
      // Keep the demo usable even when env/key is temporarily unavailable.
      if (inputMessages?.length) {
        const last = [...inputMessages].reverse().find(
          (m: any) => m && m.role === 'client' && typeof m.content === 'string' && m.content.trim()
        )
        const text =
          lang === 'ru'
            ? 'Принял. Следующий шаг: оставьте номер телефона и удобное время звонка, и менеджер подтвердит запись.'
            : lang === 'cz'
              ? 'Rozumím. Další krok: pošlete telefon a vhodný čas hovoru, manager rezervaci potvrdí.'
              : 'Understood. Next step: share your phone and preferred call time, and the manager will confirm booking.'
        const assistantMessage = last ? text : text
        return NextResponse.json({ assistantMessage }, { status: 200 })
      }
      return NextResponse.json({ messages: fallbackMessages(industry, lang) }, { status: 200 })
    }

    if (!industryClean) {
      return NextResponse.json({ error: 'industry is required' }, { status: 400 })
    }

    const model = String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()
    const modelLower = model.toLowerCase()
    const isGpt5 = modelLower.startsWith('gpt-5') || modelLower.startsWith('gpt5')
    const systemPrompt =
      `You are a professional AI client manager for a ${industry} business.
Your goal: turn an inbound message into a booked appointment or captured contact.
Rules:
- Keep responses short (max 80–120 words).
- Ask up to 2 clarifying questions.
- Provide a clear next step (booking / call / leave phone + preferred time).
- Include practical details (time estimate, first process step, typical workflow).
- Sound like a real business manager (not an AI, no disclaimers, no jargon).
- Be polite, confident, and structured.
${languageInstruction(lang)}`

    const continuationInput: DemoMessage[] = sanitizeMessages(inputMessages, industry, lang).slice(0, 8)
    const isContinuation = continuationInput.length > 0

    const userPrompt = isContinuation
      ? [
          'Continue this business chat with ONE assistant reply only.',
          'Return ONLY valid JSON: {"assistantMessage":"..."}',
          'Your reply must include one practical next step and at most 2 clarifying questions.',
          `Conversation: ${JSON.stringify(continuationInput)}`,
        ].join(' ')
      : [
          'Create a short demo conversation as JSON.',
          'Return ONLY valid JSON with this exact shape: {"messages":[{"role":"client"|"assistant","content":"..."}]}.',
          'Rules: max 6 total messages, exactly 3 assistant replies max, business tone, no emoji,',
          'show qualification questions and booking next step.',
          'Client messages must sound real and specific (problem + context + urgency).',
          'Assistant replies must be concrete and practical, not generic.',
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
      if (isContinuation) {
        const assistantMessage =
          lang === 'ru'
            ? 'Принял. Давайте зафиксируем заявку: пришлите номер телефона и удобный интервал времени для звонка, и менеджер подтвердит следующий шаг.'
            : lang === 'cz'
              ? 'Rozumím. Pojďme rezervaci dokončit: pošlete telefon a vhodný čas hovoru, manager potvrdí další krok.'
              : 'Understood. Let us finalize this request: share your phone and preferred callback window, and the manager will confirm next steps.'
        return NextResponse.json({ assistantMessage }, { status: 200 })
      }
      return NextResponse.json({ messages: fallbackMessages(industry, lang) }, { status: 200 })
    }

    const json = await resp.json()
    const content = String(json?.choices?.[0]?.message?.content || '').trim()
    const parsed = parseJsonObject(content)
    if (isContinuation) {
      const assistantMessageRaw = String(parsed?.assistantMessage || '').trim()
      const assistantMessage =
        assistantMessageRaw ||
        (lang === 'ru'
          ? 'Спасибо. Оставьте номер и удобное время звонка, и мы подтвердим запись.'
          : lang === 'cz'
            ? 'Děkujeme. Pošlete telefon a vhodný čas hovoru, a rezervaci potvrdíme.'
            : 'Thanks. Share your phone and preferred call time, and we will confirm your booking.')
      return NextResponse.json({ assistantMessage }, { status: 200 })
    }
    const safe = sanitizeMessages(parsed?.messages, industry, lang)
    return NextResponse.json({ messages: safe }, { status: 200 })
  } catch {
    if (inputMessages?.length) {
      const assistantMessage =
        lang === 'ru'
          ? 'Понял вас. Оставьте номер и удобное время для звонка, и менеджер свяжется для подтверждения.'
          : lang === 'cz'
            ? 'Rozumím. Pošlete telefon a vhodný čas hovoru, manager vás kontaktuje pro potvrzení.'
            : 'Got it. Share your phone and preferred callback time, and the manager will confirm shortly.'
      return NextResponse.json({ assistantMessage }, { status: 200 })
    }
    return NextResponse.json({ messages: fallbackMessages(industry, lang) }, { status: 200 })
  }
}
