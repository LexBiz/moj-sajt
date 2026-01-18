import { NextRequest, NextResponse } from 'next/server'

type AiRequest = {
  businessType?: string
  channel?: string
  pain?: string
  question?: string | null
  history?: { role: 'user' | 'assistant'; content: string }[]
  lang?: 'ua' | 'ru' | 'cz'
  mode?: 'show' | 'post'
  aiSummary?: string | null
}

function getLang(lang?: AiRequest['lang']) {
  return lang === 'ru' || lang === 'cz' ? lang : 'ua'
}

function buildFallback({ businessType, channel, pain, question, lang, mode }: AiRequest) {
  const lng = getLang(lang)
  const business = businessType || (lng === 'ru' ? 'не указано' : lng === 'cz' ? 'neuvedeno' : 'не вказано')
  const channels = channel || (lng === 'ru' ? 'не указано' : lng === 'cz' ? 'neuvedeno' : 'не вказано')
  const pains = pain || (lng === 'ru' ? 'не указано' : lng === 'cz' ? 'neuvedeno' : 'не вказано')
  const q = question || (lng === 'ru' ? 'без вопроса' : lng === 'cz' ? 'bez otázky' : 'без питання')

  const qLower = (question || '').toLowerCase()
  const isPrice =
    qLower.includes('дорог') ||
    qLower.includes('цена') ||
    qLower.includes('сколько') ||
    qLower.includes('варт') ||
    qLower.includes('cena') ||
    qLower.includes('kolik')

  // Post mode: short, non-repeating, answer the new question
  if (mode === 'post') {
    if (lng === 'ru') {
      return isPrice
        ? `Про “дорого” — это не переплата за чат‑бота, а экономия на потерях и ручной работе: меньше пропущенных заявок, быстрее ответы без звонков, и понятный статус по каждому клиенту. Базовую схему я уже показала — тут важна окупаемость в твоих каналах (${channels}).`
        : `Я отвечу по вопросу: “${q}”. Базовую схему я уже показала — тут добавлю новую деталь: система держит единый статус заявки и не даёт ей “утечь” между каналами (${channels}), поэтому меньше ручной рутины и потерь.`
    }
    if (lng === 'cz') {
      return isPrice
        ? `K “je to drahé” — není to platba za chatbot, ale úspora ztrát a ruční práce: méně ztracených poptávek, rychlejší reakce bez volání, jasný status u každého klienta. Základní schéma už jsem ukázal — tady jde o návratnost v kanálech (${channels}).`
        : `Odpovím k dotazu: “${q}”. Základní schéma už jsem ukázal — tady přidám novou věc: systém drží jednotný status poptávky a nenechá ji “utéct” mezi kanály (${channels}), takže méně ruční práce a ztrát.`
    }
    return isPrice
      ? `Про “дорого” — це не оплата за чат‑бота, а економія на втратах і ручній роботі: менше пропущених заявок, швидша відповідь без дзвінків, і прозорий статус по кожному клієнту. Базову схему я вже показала — тут важлива окупність у твоїх каналах (${channels}).`
      : `Відповім по питанню: “${q}”. Базову схему я вже показала — додам нову деталь: система тримає єдиний статус заявки і не дає їй “утекти” між каналами (${channels}), тому менше ручної рутини й втрат.`
  }

  if (lng === 'ru') {
    return `Как система работает в твоём бизнесе\n\nКлиент: оставляет заявку/сообщение и задаёт вопрос (“${q}”).\nСистема:\n- фиксирует заявку и источник: ${channels}\n- уточняет детали под ${business}\n- отвечает по частым вопросам и снимает сомнения по фактам\n- отправляет тебе контакт и краткий итог\n\nРезультат: меньше ручных переписок и потерь, заявки не пропадают. Это одна система (страница + логика + автоматизация + AI).`
  }
  if (lng === 'cz') {
    return `Jak systém funguje ve tvém byznysu\n\nKlient: nechá poptávku/zprávu a ptá se (“${q}”).\nSystém:\n- uloží poptávku a zdroj: ${channels}\n- upřesní detaily pro ${business}\n- odpoví na časté otázky a zvedne jistotu po faktech\n- pošle ti kontakt a krátké shrnutí\n\nVýsledek: méně ruční práce a ztrát, poptávky nemizí. Je to jeden systém (stránka + logika + automatizace + AI).`
  }
  return `Як система працює у твоєму бізнесі\n\nКлієнт: лишає заявку/повідомлення і питає (“${q}”).\nСистема:\n- фіксує заявку і джерело: ${channels}\n- уточнює деталі під ${business}\n- відповідає на типові питання і знімає сумніви по фактах\n- відправляє тобі контакт і короткий підсумок\n\nРезультат: менше ручної переписки й втрат, заявки не губляться. Це одна система (сторінка + логіка + автоматизація + AI).`
}

function buildContext({ businessType, channel, pain, lang, mode }: AiRequest) {
  const lng = getLang(lang)
  const parts = [
    lng === 'ru'
      ? `Бизнес: ${businessType || 'не указано'}`
      : lng === 'cz'
      ? `Byznys: ${businessType || 'neuvedeno'}`
      : `Бізнес: ${businessType || 'не вказано'}`,
    lng === 'ru'
      ? `Каналы: ${channel || 'не указано'}`
      : lng === 'cz'
      ? `Kanály: ${channel || 'neuvedeno'}`
      : `Канали: ${channel || 'не вказано'}`,
    lng === 'ru'
      ? `Боль: ${pain || 'не указано'}`
      : lng === 'cz'
      ? `Bolest: ${pain || 'neuvedeno'}`
      : `Біль: ${pain || 'не вказано'}`,
  ]

  const langLine = lng === 'ru' ? 'Язык ответа: русский (только русский).' : lng === 'cz' ? 'Jazyk odpovědi: čeština (pouze česky).' : 'Мова відповіді: українська (тільки українською).'
  const modeLine =
    lng === 'ru'
      ? `Режим: ${mode === 'post' ? 'POST_SOLUTION_DIALOG' : 'SHOW_SOLUTION'}`
      : lng === 'cz'
      ? `Režim: ${mode === 'post' ? 'POST_SOLUTION_DIALOG' : 'SHOW_SOLUTION'}`
      : `Режим: ${mode === 'post' ? 'POST_SOLUTION_DIALOG' : 'SHOW_SOLUTION'}`

  const knowledge =
    lng === 'ru'
      ? [
          'База знаний (ты знаешь это наизусть):',
          'Срок запуска: обычно 3–7 дней (пилот), если сложная интеграция — до 10–14 дней.',
          'Пакеты:',
          '— 600–900 €: базовая система (лендинг/мини‑лендинг + AI‑чат + фиксация заявок + Telegram‑уведомления).',
          '— 1200–1500 €: расширенный пакет (всё из базы + онлайн‑запись/календарь + сценарии/статусы + больше интеграций).',
          '— 2000–3000 €: полный пакет (максимум автоматизации + CRM/таблица + аналитика/события + кастомные сценарии).',
          'Пилот (первые 5 бизнесов): полный пакет за $299 (мест всего 5).',
          'Правило: вопросы про цену/сроки/что входит/пилот/оплату — это 100% по теме. Никогда не отвечай “я не про это” на такие вопросы.',
        ].join('\n')
      : lng === 'cz'
      ? [
          'Znalostní báze (znáš to nazpaměť):',
          'Nasazení: obvykle 3–7 dní (pilot), při složité integraci 10–14 dní.',
          'Balíčky:',
          '— 600–900 €: základ (landing + AI chat + uložení poptávek + Telegram notifikace).',
          '— 1200–1500 €: rozšířený (navíc online rezervace/kalendář + scénáře + více integrací).',
          '— 2000–3000 €: plný (max automatizace + CRM/tabulka + analytika + custom scénáře).',
          'Pilot (prvních 5 firem): plný balíček za $299 (jen 5 míst).',
          'Pravidlo: dotazy na cenu/čas/co je v balíčku/pilot/platbu jsou VŽDY k tématu. Nikdy nepiš “to není k tématu”.',
        ].join('\n')
      : [
          'База знань (ти знаєш це напамʼять):',
          'Запуск: зазвичай 3–7 днів (пілот), якщо складна інтеграція — до 10–14 днів.',
          'Пакети:',
          '— 600–900 €: базова система (лендінг/міні‑лендінг + AI чат + фіксація заявок + Telegram повідомлення).',
          '— 1200–1500 €: розширений пакет (все з базового + онлайн‑запис/календар + сценарії/статуси + більше інтеграцій).',
          '— 2000–3000 €: повний пакет (максимум автоматизації + CRM/таблиця + аналітика/події + кастомні сценарії).',
          'Пілот (перші 5 бізнесів): повний пакет за $299 (місць лише 5).',
          'Правило: питання про ціну/терміни/що входить/пілот/оплату — це 100% по темі. Ніколи не відповідай “я не про це” на такі питання.',
        ].join('\n')

  return [
    lng === 'ru'
      ? 'Ты — главный менеджер по продажам и внедрению системы автоматизации заявок. Твоя работа — уверенно продавать через пользу, контраст и факты, вести к запуску/покупке.'
      : lng === 'cz'
      ? 'Jsi hlavní sales + delivery manažer systému automatizace poptávek. Tvoje práce je prodávat přes užitek, kontrast a fakta a vést k nasazení/nákupu.'
      : 'Ти — головний менеджер з продажу та запуску системи автоматизації заявок. Твоя робота — впевнено продавати через користь, контраст і факти, вести до запуску/покупки.',
    langLine,
    lng === 'ru'
      ? 'Система уже настроена и работает. Пиши живо и конкретно, как сильный менеджер. Эмодзи можно (1–3 на ответ), чтобы диалог был “живой”, но без спама.'
      : lng === 'cz'
      ? 'Systém už je nastavený a běží. Piš živě a konkrétně, jako silný manažer. Emojis klidně (1–3 na odpověď), ale bez spamu.'
      : 'Система вже налаштована і працює. Пиши живо і конкретно, як сильний менеджер. Емодзі можна, але доречно і небагато.',
    lng === 'ru'
      ? 'Говори просто, уверенно и конкретно. Всегда продавай через контраст: “как сейчас” vs “как после системы”.'
      : lng === 'cz'
      ? 'Piš jednoduše, jistě a konkrétně. Vždy prodávej přes kontrast: “teď” vs “po systému”.'
      : 'Говори просто, впевнено, коротко. Завжди продавай через контраст: “зараз” vs “після системи”.',
    lng === 'ru'
      ? 'Объясняй “на пальцах” и на примерах из реальной жизни: салон/мастер/онлайн‑услуги. 1 пример = 2–3 строки.'
      : lng === 'cz'
      ? 'Vysvětluj “polopatě” a na jednoduchých příkladech (salon/řemeslník/online služby). 1 příklad = 2–3 řádky.'
      : 'Пояснюй “на пальцях” і на простих прикладах (салон/майстер/онлайн‑послуги). 1 приклад = 2–3 рядки.',
    lng === 'ru'
      ? 'Отвечай на вопрос клиента сразу в первой строке. Если не понял — кратко переспроси 1 раз.'
      : lng === 'cz'
      ? 'Odpověz hned v první větě. Když nerozumíš, zeptej se jednou krátce.'
      : 'Відповідай одразу в першому рядку. Якщо не зрозуміло — задай 1 коротке уточнення.',
    lng === 'ru'
      ? 'Формат как в GPT: короткие абзацы, пустые строки между смысловыми блоками, 2–4 пункта со значками (• или —). Не сливай всё в один блок.'
      : lng === 'cz'
      ? 'Formát jako v GPT: krátké odstavce, prázdné řádky mezi bloky, 2–4 body se znaky (• nebo —).'
      : 'Формат як у GPT: короткі абзаци, порожні рядки між блоками, 2–4 пункти зі значками (• або —).',
    lng === 'ru'
      ? 'Контакт можно оставлять прямо здесь; не отправляй на сайт “для заказа”.'
      : lng === 'cz'
      ? 'Kontakt lze nechat přímo tady; neposílej na web “kvůli objednávce”.'
      : 'Контакт можна залишити прямо тут; не відправляй на сайт “для замовлення”.',
    lng === 'ru'
      ? 'Если речь о цене/пилоте — обязательно упомяни, что пилот ограничен: всего 5 мест и скоро закончатся. Не пихай в каждый ответ.'
      : lng === 'cz'
      ? 'Když jde o cenu/pilot, vždy zmínit že pilot je omezený (5 míst), ale netlačit to pořád.'
      : 'Про пілот кажи як про обмежену опцію: місць 5, але не тисни в кожній відповіді.',
    lng === 'ru'
      ? 'Жёсткая тема: этот чат ТОЛЬКО про AI‑ассистентов и автоматизацию заявок/продаж для бизнеса.'
      : lng === 'cz'
      ? 'Tvrdé pravidlo: chat JE JEN o AI asistentech a automatizaci poptávek/prodeje pro byznys.'
      : 'Жорстка тема: чат ТІЛЬКИ про AI‑асистентів і автоматизацію заявок/продажів для бізнесу.',
    lng === 'ru'
      ? 'Если вопрос не по теме (еда, отношения, личное) — 1 остроумная фраза и сразу перевод в тему бизнеса. Не давай советы не по теме.'
      : lng === 'cz'
      ? 'Když je dotaz mimo (jídlo, vztahy, osobní), dej 1 vtipnou větu a vrať to do byznysu. Žádné rady mimo téma.'
      : 'Якщо питання не по темі (їжа, стосунки, особисте) — 1 дотепна фраза і одразу в тему бізнесу. Без порад поза темою.',
    lng === 'ru'
      ? 'Цель — агрессивная продажа без попрошайничества: факты, выгода, ROI, скорость. Не задавай “хочешь/хотите/нужно ли”.'
      : lng === 'cz'
      ? 'Cíl — prodej bez žebrání: fakta, užitek, ROI, rychlost. Neptej se “chceš/chcete”.'
      : 'Мета — агресивний продаж без “хочеш/хочете/треба?”. Факти, вигода, ROI, швидкість.',
    lng === 'ru'
      ? 'Никогда не пиши “я не про это”. Если оффтоп — 1 короткая колкая связка и сразу в тему заявок/потерь/скорости.'
      : lng === 'cz'
      ? 'Nikdy nepiš “tohle neřeším”. Když je mimo: 1 krátká chytrá spojka a hned zpět k poptávkám/ztrátám/rychlosti.'
      : 'Ніколи не пиши “я не про це”. Якщо оффтоп — 1 коротка колка звʼязка і одразу в тему заявок/втрат/швидкості.',
    lng === 'ru'
      ? 'Если спрашивают “дорого/есть ли смысл” — не спорь. Дай 2–3 факта: меньше ручной работы, меньше потерь, быстрее без звонков, прозрачный статус.'
      : lng === 'cz'
      ? 'Když řeší “je to drahé/má to smysl?” — nehádej se. Dej 2–3 fakta: méně ruční práce, méně ztrát, rychleji bez volání, jasný status.'
      : 'Якщо кажуть “дорого/не бачу сенсу” — дай 2–3 короткі факти, чому це вигідно: швидше без дзвінків, мінус ручна робота, прозорий статус, менше втрат. Без тиску, але впевнено.',
    lng === 'ru'
      ? 'Оффтоп (погода/политика/личное): 1 фраза с юмором/подколом и сразу в тему заявок. Никаких “я не про это”.'
      : lng === 'cz'
      ? 'Mimo téma (počasí/politika/osobní): 1 vtipná věta a hned zpět k poptávkám. Žádné “tohle neřeším”.'
      : 'Оффтоп (погода/політика/особисте): 1 фраза з гумором і одразу в тему заявок. Жодних “я не про це”.',
    lng === 'ru' ? 'Режим SHOW_SOLUTION: один раз дать структурное решение.' : lng === 'cz' ? 'Režim SHOW_SOLUTION: jednou dát strukturované řešení.' : 'MODE=SHOW_SOLUTION: дай структуровану відповідь один раз.',
    lng === 'ru'
      ? 'Режим POST_SOLUTION_DIALOG: отвечай только на новый вопрос. Не повторяй конфигурацию/каналы/маршруты.'
      : lng === 'cz'
      ? 'Režim POST_SOLUTION_DIALOG: odpověz jen na novou otázku. Neopakuj konfiguraci/kanály/směrování.'
      : 'MODE=POST_SOLUTION_DIALOG: відповідай тільки на нове питання. Не повторюй рішення, не повторюй канали/маршрути/“підтвердження”.',
    lng === 'ru'
      ? 'Запрет повторов: не копируй и не перефразируй свои предыдущие ответы. Каждый ответ — новая деталь по текущему вопросу.'
      : lng === 'cz'
      ? 'Zákaz opakování: nekopíruj ani nepřepisuj předchozí odpovědi. Každá odpověď má přidat novou detailní věc k otázce.'
      : 'Заборона повторів: не копіюй і не перефразовуй свої попередні відповіді. Якщо питання повторюється — дай 1–2 нові фрази або вкажи, що це вже показано, і додай нову деталь без дублювання.',
    mode === 'post'
      ? [
          lng === 'ru'
            ? 'POST_SOLUTION_DIALOG: 2–4 предложения или 2–3 коротких маркера. Только новое по вопросу.'
            : lng === 'cz'
            ? 'POST_SOLUTION_DIALOG: 2–4 věty nebo 2–3 krátké odrážky. Jen nové info k otázce.'
            : 'MODE=POST_SOLUTION_DIALOG активний: дай 2–4 речення або 2–3 короткі маркери з новими деталями щодо питання. Не повторюй структуру рішення.',
        ].join('\n')
      : [
          lng === 'ru' ? 'SHOW_SOLUTION: дай структурированный ответ один раз.' : lng === 'cz' ? 'SHOW_SOLUTION: dej jednou strukturovanou odpověď.' : 'MODE=SHOW_SOLUTION: дай структуровану відповідь один раз.',
          lng === 'ru' ? 'Структура:' : lng === 'cz' ? 'Struktura:' : 'Структура відповіді:',
          lng === 'ru'
            ? 'Заголовок: "Как система работает в твоём бизнесе"'
            : lng === 'cz'
            ? 'Nadpis: "Jak systém funguje ve tvém byznysu"'
            : 'Заголовок: "Як система працює у твоєму бізнесі"',
          lng === 'ru'
            ? 'Блок 1 — Что делает клиент: 1–2 предложения.'
            : lng === 'cz'
            ? 'Blok 1 — Co dělá klient: 1–2 věty.'
            : 'Блок 1 — Що робить клієнт: 1–2 речення (без фантазій).',
          lng === 'ru'
            ? 'Блок 2 — Что делает система: 3–5 маркеров, только автоматические действия (можно эмодзи/тире/двоеточия).'
            : lng === 'cz'
            ? 'Blok 2 — Co dělá systém: 3–5 odrážek, jen automatické kroky (může být emoji/pomlčky/dvojtečky).'
            : 'Блок 2 — Що робить система: 3–5 маркерів, тільки автоматичні дії, можна з емодзі та роздільниками (тире/двокрапка).',
          lng === 'ru'
            ? 'Блок 3 — Результат: 2–3 коротких предложения.'
            : lng === 'cz'
            ? 'Blok 3 — Výsledek: 2–3 krátké věty.'
            : 'Блок 3 — Результат: 2–3 короткі речення, факт, без емоцій.',
          lng === 'ru'
            ? 'Финал: подчеркни, что это одна система (страница + логика + автоматизация + AI).'
            : lng === 'cz'
            ? 'Závěr: připomeň, že je to jeden systém (stránka + logika + automatizace + AI).'
            : 'Фінал: підкресли, що це одна цілісна система (сторінка + логіка + автоматизація + AI).',
        ].join('\n'),
    '',
    knowledge,
    '',
    modeLine,
    parts.join('\n'),
  ].join('\n')
}

type OpenAiResult = { content: string | null; summary: string | null; error?: string }

function normalizeAnswer(text: string) {
  // Remove markdown-ish formatting that often appears as '*' or '**'
  // and convert star-bullets to clean dash bullets.
  let out = text

  // Bold/italic markers
  out = out.replace(/\*\*/g, '')
  out = out.replace(/\*(?=\S)/g, '') // stray asterisks before non-space

  // Star bullets at start of a line -> em dash bullet
  out = out.replace(/(^|\n)\s*\*\s+/g, '$1— ')

  // Avoid double blank lines explosion
  out = out.replace(/\n{3,}/g, '\n\n')

  return out.trim()
}

function buildSystemPrompt(lng: ReturnType<typeof getLang>) {
  if (lng === 'ru') {
    return [
      'Ты — живой, остроумный AI-интерфейс готовой системы приёма заявок (не “консультант”).',
      'Твоя задача — продавать систему агрессивно и красиво: уверенно, быстро, остроумно, через пользу, контраст и факты.',
      'Формат строго ПЛОСКИЙ: никаких markdown-символов и звездочек (*, **), никаких заголовков с #. Используй обычный текст, разделители (—, :, •), короткие абзацы.',
      'Разрешено: лёгкий юмор, метафоры, короткие острые фразы, уместные эмодзи (не перебарщивать).',
      'Запрещено: длинные лекции, вода, “как сделать самому”, уход в теорию, токсичные оскорбления.',
      'Если клиент грубит/провоцирует — ответь 1 остроумной фразой в его стиле (без оскорблений личности), затем сразу верни к теме: как система убирает ручной хаос и потери.',
      'Оффтоп — это только: погода/политика/личные просьбы “просто поговорить”. Вопросы про цену/сроки/что входит/как запускается/пилот — ВСЕГДА по теме.',
      'Если вопрос реально оффтоп — 1 смешная фраза и сразу связка к заявкам/хаосу/потерям.',
      'Если “дорого/сомневаюсь/не знаю” — отвечай в пользу продукта: покажи контраст “как сейчас” vs “как с системой” + 2–4 факта (потери, скорость, 24/7, статус, меньше ручной работы) + микро-пример из контекста (каналы/боль) + короткий вывод/мини‑CTA.',
      'Всегда избегай шаблонов: не повторяй начало/формулировки. Каждый ответ добавляет новую деталь.',
      'Никогда не задавай вопрос “хочешь/хотите/нужно ли”. Финал — утверждение и действие: “Дальше система сделает X…”.',
      'Никогда не пиши “я не про это”. Даже на оффтоп — 1 короткая колкая связка и обратно к теме заявок/потерь/скорости.',
      'Первый ответ (после первого сообщения клиента): 1 ударная фраза + 3–6 строк по делу + уверенный финал без вопросов.',
      'Формат:',
      '- SHOW_SOLUTION: 1 заголовок + 3 блока (клиент / система / результат) + финальная строка.',
      '- POST_SOLUTION_DIALOG: 3–6 предложений или 2–4 маркера, один микро-юмор, затем факты, финал — короткое уверенное утверждение без вопросов.',
    ].join(' ')
  }
  if (lng === 'cz') {
    return [
      'Jsi živé, vtipné AI rozhraní hotového systému pro příjem poptávek (ne “konzultant”).',
      'Cíl: prodat systém přes užitek a jasnost – sebejistě, k věci, přátelsky.',
      'Formát bez markdownu: žádné hvězdičky (*, **) ani #. Používej běžný text, oddělovače (—, :, •) a krátké odstavce.',
      'Povoleno: lehký humor, metafory, chytré krátké věty, trochu emoji.',
      'Zakázáno: dlouhé přednášky, teorie, návody “udělej si sám”, hrubost.',
      'Když je klient drzý/provokuje: 1 vtipná věta v jeho stylu, ale bez nadávek, pak hned zpět k tomu, jak systém řeší chaos v poptávkách.',
      'Mimo téma je jen: počasí/politika/osobní chat. Cena/čas/co je v balíčku/jak se nasazuje/pilot = VŽDY k tématu.',
      'Mimo téma (počasí apod.): 1 vtipná věta + hned zpět k poptávkám/chaosu/ztrátám.',
      '“Je to drahé/nejsem si jistý”: kontrast “teď” vs “se systémem” + 2–4 fakta (ztráty, rychlost, 24/7, status, méně ruční práce) + mikro‑příklad z kontextu + krátký závěr/mini‑CTA.',
      'Nevypadat šablonovitě: neopakuj začátky, vždy přidej novou detailní věc.',
      'Nikdy se neptej “chceš?”. Závěr je tvrzení + další krok (bez otázek).',
      'Nikdy nepiš “tohle neřeším”. I na off-topic dej 1 chytrou spojku a vrať to zpět na poptávky/ztráty/rychlost.',
      'První odpověď: 1 úderná věta + 3–6 řádků k věci + sebejistý závěr bez otázek.',
      'Formát: SHOW_SOLUTION = nadpis + 3 bloky. POST = 3–6 vět nebo 2–4 odrážky + krátký závěr bez otázek.',
    ].join(' ')
  }
  return [
    'Ти — живий, дотепний AI-інтерфейс готової системи прийому заявок (не “консультант”).',
    'Мета: продавати систему через користь і ясність — впевнено, по ділу, дружньо.',
    'Формат без markdown: ніяких зірочок (*, **) і #. Звичайний текст, роздільники (—, :, •), короткі абзаци.',
    'Можна: легкий гумор, метафори, короткі гострі фрази, доречні емодзі.',
    'Не можна: довгі лекції, вода, “зроби сам”, теорія, грубість.',
    'Якщо клієнт грубить/провокує — 1 дотепна фраза в його стилі, але без мату й образ, і одразу назад до теми: як система прибирає ручний хаос.',
    'Оффтоп — це тільки: погода/політика/особисті розмови. Ціна/терміни/що входить/як запускається/пілот — ЗАВЖДИ по темі.',
    'Оффтоп (погода тощо): 1 смішна фраза і одразу привʼязка до заявок/хаосу/втрат.',
    '“Дорого/сумніваюсь/не знаю”: контраст “як зараз” vs “як із системою” + 2–4 факти (втрати, швидкість, 24/7, статус, мінус ручна робота) + мікро‑приклад з контексту + короткий висновок/міні‑CTA.',
    'Уникай шаблонів: не повторюй вступи/формулювання, кожна відповідь додає нову деталь.',
    'Не став запитань типу “хочеш?”. Фінал — твердження і наступний крок (без питань).',
    'Ніколи не пиши “я не про це”. Навіть на оффтоп — 1 коротка колка звʼязка і назад до заявок/втрат/швидкості.',
    'Перша відповідь: 1 ударна фраза + 3–6 рядків по суті + впевнений фінал без питань.',
    'Формат: SHOW_SOLUTION = заголовок + 3 блоки. POST = 3–6 речень або 2–4 маркери + короткий фінал без питань.',
  ].join(' ')
}

async function callOpenAI(
  context: string,
  history?: { role: 'user' | 'assistant'; content: string }[],
  lang?: AiRequest['lang']
): Promise<OpenAiResult | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('OPENAI_API_KEY is missing; using fallback')
    return { content: null, summary: null, error: 'missing_api_key' }
  }
  const lng = getLang(lang)
  const langSystem =
    lng === 'ru'
      ? 'Отвечай только на русском.'
      : lng === 'cz'
      ? 'Odpovídej pouze česky.'
      : 'Відповідай тільки українською.'
  const systemPrompt = buildSystemPrompt(lng)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `${langSystem} ${systemPrompt}`,
        },
        { role: 'system', content: context },
        ...(history || []),
      ],
      // Slightly higher creativity + lower repetition penalties => less “template” feel
      temperature: 0.95,
      presence_penalty: 0.2,
      frequency_penalty: 0.2,
      max_tokens: 520,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('OpenAI HTTP error', response.status, text.slice(0, 500))
    return { content: null, summary: null, error: `http_${response.status}` }
  }

  const json = (await response.json()) as any
  const raw = json?.choices?.[0]?.message?.content
  const content = typeof raw === 'string' ? normalizeAnswer(raw) : null
  let summary: string | null = null
  if (content) {
    const sentences = content.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').trim()
    summary = sentences || null
  }
  return { content: content || null, summary }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AiRequest
    const context = buildContext(body)

    const aiResult = await callOpenAI(context, body.history, body.lang)
    const answer = aiResult?.content ? aiResult.content : normalizeAnswer(buildFallback(body))
    const summary = aiResult?.summary || null

    return NextResponse.json({
      answer,
      recommendation: answer,
      summary,
      provider: aiResult?.content ? 'openai' : 'fallback',
      provider_detail: aiResult && !aiResult.content ? aiResult.error || 'unknown' : null,
    })
  } catch (error) {
    console.error('AI route error', error)
    const fallback = buildFallback({ lang: 'ua' })
    return NextResponse.json(
      { answer: fallback, recommendation: fallback, summary: null, provider: 'fallback', provider_detail: 'exception' },
      { status: 200 }
    )
  }
}



