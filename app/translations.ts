export type Lang = 'en' | 'ru' | 'ua'

type SiteCopy = {
  navServices: string
  navPackages: string
  navCases: string
  navAbout: string
  navContact: string

  heroHeadline: string
  heroSubheadline: string
  heroPrimaryCta: string
  heroSecondaryCta: string
  heroBadge: string
  heroMicro: string
  coreCore: string
  coreEngine: string
  coreLanding: string
  coreAutomation: string
  coreCrm: string
  coreAnalytics: string

  eyebrowProblem: string
  problemTitle: string
  problemLead: string
  problemItems: string[]

  eyebrowSolution: string
  solutionTitle: string
  solutionLead: string
  solutionFlowLabel: string
  solutionFlow: string[]
  solutionFooter: string
  flowCta: string

  dashTitle: string
  dashLive: string
  dashLead: string
  dashReply: string
  dashCrm: string
  dashQualified: string
  dashAwaiting: string

  eyebrowServices: string
  servicesTitle: string
  servicesLead: string
  serviceWebTitle: string
  serviceWebDesc: string
  serviceAutomationTitle: string
  serviceAutomationDesc: string
  serviceInfraTitle: string
  serviceInfraDesc: string
  serviceLayer1: string
  serviceLayer2: string
  serviceLayer3: string

  stat1Val: string
  stat1Label: string
  stat2Val: string
  stat2Label: string
  stat3Val: string
  stat3Label: string
  stat4Val: string
  stat4Label: string

  eyebrowPilot: string
  pilotTitle: string
  pilotDesc: string
  pilotCta: string

  eyebrowPackages: string
  packagesTitle: string
  packagesLead: string
  packagesMicro: string
  packageStarterTitle: string
  packageStarterPrice: string
  packageStarterDesc: string
  packageStarterItems: string[]
  packageGrowthTitle: string
  packageGrowthPrice: string
  packageGrowthDesc: string
  packageGrowthItems: string[]
  packageScaleTitle: string
  packageScalePrice: string
  packageScaleDesc: string
  packageScaleItems: string[]

  eyebrowEstimate: string
  calcTitle: string
  calcLead: string
  demoIndustryLabel: string
  demoIndustryPlaceholder: string
  demoRun: string
  demoReset: string
  demoClientPrefix: string
  demoAiPrefix: string
  demoLoading: string
  demoError: string
  demoScenario: string
  demoOrManual: string
  demoPresets: string[]
  demoBookCta: string
  selectedIndustryLabel: string
  demoMessagePlaceholder: string
  demoSend: string

  eyebrowCases: string
  casesTitle: string
  casesLead: string
  caseMetrics: Array<{ value: number; suffix: string; label: string }>
  caseChallenge: string
  caseSolution: string
  caseImpact: string
  case1Title: string
  case1Challenge: string
  case1Solution: string
  case1Impact: string
  case2Title: string
  case2Challenge: string
  case2Solution: string
  case2Impact: string
  case3Title: string
  case3Challenge: string
  case3Solution: string
  case3Impact: string
  case4Title: string
  case4Challenge: string
  case4Solution: string
  case4Impact: string
  case5Title: string
  case5Challenge: string
  case5Solution: string
  case5Impact: string
  case6Title: string
  case6Challenge: string
  case6Solution: string
  case6Impact: string

  faqTitle: string
  faqItems: Array<{ q: string; a: string }>

  eyebrowAbout: string
  aboutTitle: string
  aboutLead: string
  founderRole: string
  aboutBody: string
  archCaption: string
  archActive: string
  archOperational: string
  archLayer1Title: string
  archLayer1Stack: string
  archLayer2Title: string
  archLayer2Stack: string
  archLayer3Title: string
  archLayer3Stack: string
  archLayer4Title: string
  archLayer4Stack: string
  archLayer5Title: string
  archLayer5Stack: string

  eyebrowContact: string
  finalTitle: string
  finalLead: string
  finalPrimaryCta: string
  contactEmail: string
  contactTelegram: string
  contactWhatsapp: string

  formTitle: string
  formLead: string
  formName: string
  formPhone: string
  formConsent: string
  formSubmit: string
  formSubmitting: string
  formSuccess: string
  formError: string

  footerTagline: string
  footerMicro: string
  legalPrivacy: string
  legalTerms: string
  legalDeletion: string
  topAria: string
  stackBadges: string[]
  rights: string
}

export const translations: Record<Lang, SiteCopy> = {
  en: {
    navServices: 'How It Works',
    navPackages: 'Packages',
    navCases: 'Cases',
    navAbout: 'About',
    navContact: 'Contact',

    heroHeadline: 'Turn visitors into paying clients on autopilot.',
    heroSubheadline:
      'This gives your business one clear path: client comes in, gets a fast reply, and moves to booking without getting lost.',
    heroPrimaryCta: 'Get My Client System',
    heroSecondaryCta: 'See It In 2 Minutes',
    heroBadge: 'TemoWeb · Digital Systems Company',
    heroMicro: 'Why this matters: every missed reply is lost revenue.',
    coreCore: 'Core',
    coreEngine: 'Engine',
    coreLanding: 'Landing',
    coreAutomation: 'Automation',
    coreCrm: 'CRM',
    coreAnalytics: 'Analytics',

    eyebrowProblem: 'What Is Broken',
    problemTitle: 'Why businesses lose clients every day',
    problemLead: 'Most leads are not lost because of ads. They are lost because of process.',
    problemItems: [
      'Client writes, but nobody answers quickly',
      'Leads are spread across WhatsApp, Instagram, and forms',
      'The same questions are answered manually every day',
      'Managers forget follow-ups and warm leads go cold',
      'You cannot clearly see where money is leaking',
    ],

    eyebrowSolution: 'The Fix',
    solutionTitle: 'One simple client system',
    solutionLead:
      'Not just a website. A practical system that collects leads, replies quickly, and sends everything to one place.',
    solutionFlowLabel: 'How it works',
    solutionFlow: ['Traffic', 'Landing', 'Automation', 'CRM', 'Analytics', 'Scale'],
    solutionFooter: 'You always know what happens with every lead.',
    flowCta: 'Try Live Demo Flow',

    dashTitle: 'Live Example',
    dashLive: 'Live',
    dashLead: 'Lead received',
    dashReply: 'Auto-reply sent',
    dashCrm: 'CRM entry created',
    dashQualified: 'Lead marked as ready',
    dashAwaiting: 'Waiting for next lead...',

    eyebrowServices: 'What You Get',
    servicesTitle: 'Three parts that make sales easier',
    servicesLead: 'Everything is built around one goal: no lost clients.',
    serviceWebTitle: 'Website That Converts',
    serviceWebDesc: 'A clear page where people understand your offer and leave contacts.',
    serviceAutomationTitle: 'Auto Replies and CRM',
    serviceAutomationDesc: 'Instant replies, lead sorting, and all requests saved in one system.',
    serviceInfraTitle: 'Control and Growth',
    serviceInfraDesc: 'Simple analytics, clear reports, and next-step improvements every month.',
    serviceLayer1: 'Layer 01',
    serviceLayer2: 'Layer 02',
    serviceLayer3: 'Layer 03',

    stat1Val: '24/7',
    stat1Label: 'Leads accepted',
    stat2Val: '< 5s',
    stat2Label: 'First response',
    stat3Val: '1 flow',
    stat3Label: 'For all channels',
    stat4Val: '14 days',
    stat4Label: 'First launch',

    eyebrowPilot: 'Start Fast',
    pilotTitle: 'Pilot launch in 14 days',
    pilotDesc:
      'We launch one working flow first, show real result, then expand step by step.',
    pilotCta: 'Start Pilot',

    eyebrowPackages: 'Packages',
    packagesTitle: 'Packages',
    packagesLead: 'Choose the package that matches your current stage.',
    packagesMicro: 'No overpaying. Start from what you really need.',
    packageStarterTitle: 'Starter — Get Order',
    packageStarterPrice: 'EUR 1,900 + EUR 290/mo · min 2 months',
    packageStarterDesc: 'For businesses that need to stop losing leads and respond faster.',
    packageStarterItems: [
      'Simple website offer + contact form',
      'New leads sent straight to Telegram',
      'Basic lead tracking by source',
      'Launch plan and setup support',
    ],
    packageGrowthTitle: 'Growth — Sales Flow',
    packageGrowthPrice: 'EUR 3,900 + EUR 490/mo · min 2 months',
    packageGrowthDesc: 'For teams with traffic who need faster handling and better conversion.',
    packageGrowthItems: [
      'Everything from Starter',
      'Automatic first replies and lead qualification',
      'CRM pipeline with statuses and notes',
      'Manager dashboard and response control',
    ],
    packageScaleTitle: 'Scale — Full System',
    packageScalePrice: 'EUR 6,900 + EUR 790/mo · min 2 months',
    packageScaleDesc: 'For growing companies that need one system across all channels.',
    packageScaleItems: [
      'Everything from Growth',
      'One flow for site, WhatsApp, Telegram, and Instagram',
      'Advanced conversion analytics',
      'Monthly optimization and growth roadmap',
    ],

    eyebrowEstimate: 'Live Demo',
    calcTitle: 'Test the System',
    calcLead: 'See how the AI manager would respond to your clients.',
    demoIndustryLabel: 'What industry are you in?',
    demoIndustryPlaceholder: 'For example: Auto service',
    demoRun: 'Run Live Demo',
    demoReset: 'Reset Demo',
    demoClientPrefix: 'Client',
    demoAiPrefix: 'AI Manager',
    demoLoading: 'AI manager is typing...',
    demoError: 'Could not load demo response. Please try again.',
    demoScenario: 'Demo scenario: New lead inquiry',
    demoOrManual: 'Or enter your industry manually',
    demoPresets: ['Auto service', 'Dental clinic', 'Law firm', 'Real estate and mortgage'],
    demoBookCta: 'Get this for my business',
    selectedIndustryLabel: 'Selected industry',
    demoMessagePlaceholder: 'Type a client message...',
    demoSend: 'Send',

    eyebrowCases: 'Real Results',
    casesTitle: 'What changed for real businesses',
    casesLead: 'Every case shows the same path: problem → solution → result.',
    caseMetrics: [
      { value: 37, suffix: '%', label: 'more booked calls in 8 weeks' },
      { value: 52, suffix: '%', label: 'fewer missed incoming requests' },
      { value: 31, suffix: '%', label: 'higher lead-to-sale conversion' },
      { value: 43, suffix: '%', label: 'faster callback speed' },
      { value: 2.4, suffix: 'x', label: 'cleaner CRM pipeline quality' },
      { value: 46, suffix: '%', label: 'faster first manager response' },
    ],
    caseChallenge: 'Challenge',
    caseSolution: 'Solution',
    caseImpact: 'Impact',
    case1Title: 'Automotive Service, Prague',
    case1Challenge: 'Leads were lost outside working hours and follow-up was inconsistent.',
    case1Solution: 'Implemented a conversion landing flow with automated qualification and CRM routing.',
    case1Impact: 'Faster response cycle and consistent lead processing across all daily inquiries.',
    case2Title: 'Education Business, EU',
    case2Challenge: 'Requests arrived from multiple channels with no operational visibility.',
    case2Solution: 'Built a single intake architecture with automation rules and manager workflows.',
    case2Impact: 'Clear pipeline control, fewer missed requests, and smoother handoff to sales.',
    case3Title: 'Retail Brand, Central Europe',
    case3Challenge: 'Traffic was growing but conversion and tracking were fragmented.',
    case3Solution: 'Rebuilt web front-end, connected analytics events, and standardized CRM attribution.',
    case3Impact: 'Improved conversion clarity and a more reliable base for paid acquisition scaling.',
    case4Title: 'Dental Clinic, Brno',
    case4Challenge: 'High ad spend but slow callback speed and many missed consultations.',
    case4Solution: 'Introduced structured intake flow with auto-prioritization of urgent requests.',
    case4Impact: 'Faster processing and higher booking consistency across working hours.',
    case5Title: 'Legal Services, Prague',
    case5Challenge: 'Leads from web and messengers were duplicated and manually sorted.',
    case5Solution: 'Unified capture pipeline and CRM deduplication rules with status automation.',
    case5Impact: 'Cleaner pipeline and better visibility over lead-to-consultation conversion.',
    case6Title: 'E-commerce Support Team, EU',
    case6Challenge: 'Support and sales conversations mixed in one inbox with no ownership logic.',
    case6Solution: 'Built channel routing, intent tagging, and queue-based assignment workflow.',
    case6Impact: 'Reduced response chaos and improved handling quality at scale.',

    faqTitle: 'Common Questions',
    faqItems: [
      { q: 'I am not technical. Is this for me?', a: 'Yes. We explain everything in plain business language and build the system for you end to end.' },
      { q: 'How fast can we start?', a: 'Pilot starts in about 14 days. You get the first working flow fast, then we scale it.' },
      { q: 'Will website leads go to Telegram?', a: 'Yes. New requests can go directly to Telegram and also to CRM if needed.' },
      { q: 'Can we keep our current tools?', a: 'Usually yes. We connect your current tools first and replace only when necessary.' },
      { q: 'What happens after launch?', a: 'We support the launch, check how it works, and improve weak points.' },
    ],

    eyebrowAbout: 'About',
    aboutTitle: 'About',
    aboutLead: 'Founder',
    founderRole: 'Novikov',
    aboutBody:
      'I help business owners build a clear lead system: clients come in, get a quick reply, and move to sale without chaos.',
    archCaption: 'System Architecture',
    archActive: 'Active',
    archOperational: 'All systems operational',
    archLayer1Title: 'Web Layer',
    archLayer1Stack: 'Next.js · TypeScript · Tailwind',
    archLayer2Title: 'Automation',
    archLayer2Stack: 'Webhooks · OpenAI · Scheduler',
    archLayer3Title: 'CRM and Data',
    archLayer3Stack: 'PostgreSQL · REST API · Pipelines',
    archLayer4Title: 'Channels',
    archLayer4Stack: 'WhatsApp · Telegram · Instagram',
    archLayer5Title: 'Analytics',
    archLayer5Stack: 'Plausible · Clarity · Events',

    eyebrowContact: 'Contact',
    finalTitle: 'Want this system in your business?',
    finalLead: 'Leave your contact and we will show exactly what to launch first for your case.',
    finalPrimaryCta: 'Get My Plan',
    contactEmail: 'info@temoweb.eu',
    contactTelegram: '@temoweb',
    contactWhatsapp: '+380 96 049 49 17',

    formTitle: 'Leave contact and get a clear plan',
    formLead: 'No complicated briefing. We contact you and show the next practical step.',
    formName: 'Your name',
    formPhone: 'Phone number',
    formConsent: 'I agree to the privacy policy and consent to personal data processing.',
    formSubmit: 'Send and Get Plan',
    formSubmitting: 'Sending...',
    formSuccess: 'Request sent. We will contact you shortly.',
    formError: 'Could not send. Please try again.',

    footerTagline: 'Simple client systems for real businesses.',
    footerMicro: 'Infrastructure before growth.',
    legalPrivacy: 'Privacy',
    legalTerms: 'Terms',
    legalDeletion: 'Data Deletion',
    topAria: 'Top',
    stackBadges: ['Next.js', 'TypeScript', 'OpenAI', 'PostgreSQL', 'WhatsApp API', 'Telegram Bot'],
    rights: 'All rights reserved',
  },

  ru: {
    navServices: 'Как это работает',
    navPackages: 'Пакеты',
    navCases: 'Кейсы',
    navAbout: 'О нас',
    navContact: 'Контакты',

    heroHeadline: 'Превращайте входящие обращения в оплативших клиентов на автопилоте.',
    heroSubheadline:
      'На сайте это нужно, чтобы у вас был один понятный путь: заявка пришла, быстрый ответ ушел, клиент дошел до записи и оплаты.',
    heroPrimaryCta: 'Получить систему для моего бизнеса',
    heroSecondaryCta: 'Показать за 2 минуты',
    heroBadge: 'TemoWeb · Digital Systems Company',
    heroMicro: 'Почему это важно: каждый пропущенный ответ — это потерянные деньги.',
    coreCore: 'Ядро',
    coreEngine: 'Движок',
    coreLanding: 'Лендинг',
    coreAutomation: 'Автоматизация',
    coreCrm: 'CRM',
    coreAnalytics: 'Аналитика',

    eyebrowProblem: 'Проблема',
    problemTitle: 'Почему бизнес теряет заявки каждый день',
    problemLead: 'Чаще всего проблема не в рекламе, а в том, что внутри нет порядка.',
    problemItems: [
      'Клиент пишет, а ответа долго нет',
      'Заявки разбросаны по WhatsApp, Instagram и формам',
      'Одни и те же вопросы отвечаются вручную',
      'Теплые лиды теряются, потому что нет follow-up',
      'Непонятно, где реально теряются деньги',
    ],

    eyebrowSolution: 'Что мы делаем',
    solutionTitle: 'Одна понятная система заявок',
    solutionLead:
      'Это не просто сайт. Это рабочий процесс: заявка пришла, ответ ушел, клиент не потерялся.',
    solutionFlowLabel: 'Как это работает',
    solutionFlow: ['Traffic', 'Landing', 'Automation', 'CRM', 'Analytics', 'Scale'],
    solutionFooter: 'Вы видите путь каждой заявки от первого касания до сделки.',
    flowCta: 'Открыть живой flow',

    dashTitle: 'Пример в реальном времени',
    dashLive: 'Live',
    dashLead: 'Заявка получена',
    dashReply: 'Автоответ отправлен',
    dashCrm: 'Запись создана в CRM',
    dashQualified: 'Лид отмечен как готовый',
    dashAwaiting: 'Ожидание следующей заявки...',

    eyebrowServices: 'Что вы получаете',
    servicesTitle: 'Три части, которые упрощают продажи',
    servicesLead: 'Всё строится вокруг одной цели — не терять клиентов.',
    serviceWebTitle: 'Сайт, который приводит заявки',
    serviceWebDesc: 'Простая и понятная страница, где человек быстро понимает офер и оставляет контакт.',
    serviceAutomationTitle: 'Автоответы и CRM',
    serviceAutomationDesc: 'Быстрый первый ответ, сортировка заявок и хранение всех данных в одном месте.',
    serviceInfraTitle: 'Контроль и рост',
    serviceInfraDesc: 'Понятная аналитика и регулярные улучшения, чтобы продажи росли стабильно.',
    serviceLayer1: 'Слой 01',
    serviceLayer2: 'Слой 02',
    serviceLayer3: 'Слой 03',

    stat1Val: '24/7',
    stat1Label: 'Приём заявок',
    stat2Val: '< 5s',
    stat2Label: 'Первый ответ',
    stat3Val: '1 поток',
    stat3Label: 'Для всех каналов',
    stat4Val: '14 дней',
    stat4Label: 'Первый запуск',

    eyebrowPilot: 'Пилотная программа',
    pilotTitle: 'Пилот за 14 дней',
    pilotDesc:
      'Сначала запускаем один рабочий поток заявок, показываем результат и только потом масштабируем.',
    pilotCta: 'Запустить пилот',

    eyebrowPackages: 'Пакеты',
    packagesTitle: 'Пакеты',
    packagesLead: 'Выберите пакет под текущий этап вашего бизнеса.',
    packagesMicro: 'Без лишних услуг. Только то, что реально нужно сейчас.',
    packageStarterTitle: 'Starter — Навести порядок',
    packageStarterPrice: '1 900 EUR + 290 EUR/мес · минимум 2 месяца',
    packageStarterDesc: 'Для бизнеса, которому нужно перестать терять заявки и отвечать быстрее.',
    packageStarterItems: [
      'Понятный сайт с офером и формой',
      'Заявки сразу уходят в Telegram',
      'Базовый учет источников заявок',
      'План запуска и поддержка на старте',
    ],
    packageGrowthTitle: 'Growth — Система продаж',
    packageGrowthPrice: '3 900 EUR + 490 EUR/мес · минимум 2 месяца',
    packageGrowthDesc: 'Для тех, у кого уже есть трафик, но теряются лиды и не хватает скорости обработки.',
    packageGrowthItems: [
      'Все из Starter',
      'Автоответы и первичная квалификация',
      'CRM-воронка со статусами',
      'Панель контроля работы менеджеров',
    ],
    packageScaleTitle: 'Scale — Полная система',
    packageScalePrice: '6 900 EUR + 790 EUR/мес · минимум 2 месяца',
    packageScaleDesc: 'Для растущих компаний, где нужен единый процесс во всех каналах.',
    packageScaleItems: [
      'Все из Growth',
      'Единый поток для сайта, WhatsApp, Telegram и Instagram',
      'Глубокая аналитика конверсии',
      'Ежемесячные улучшения под рост',
    ],

    eyebrowEstimate: 'Оценка стоимости',
    calcTitle: 'Проверьте систему',
    calcLead: 'Посмотрите, как AI-менеджер отвечает вашим клиентам.',
    demoIndustryLabel: 'В какой вы нише?',
    demoIndustryPlaceholder: 'Например: Автосервис',
    demoRun: 'Запустить live demo',
    demoReset: 'Сбросить demo',
    demoClientPrefix: 'Клиент',
    demoAiPrefix: 'AI-менеджер',
    demoLoading: 'AI-менеджер печатает...',
    demoError: 'Не удалось получить ответ demo. Попробуйте еще раз.',
    demoScenario: 'Сценарий demo: новый входящий лид',
    demoOrManual: 'Или введи свою нишу вручную',
    demoPresets: ['Автосервис', 'Стоматология', 'Юристы', 'Недвижимость и ипотека'],
    demoBookCta: 'Хочу это в свой бизнес',
    selectedIndustryLabel: 'Выбранная ниша',
    demoMessagePlaceholder: 'Введите сообщение клиента...',
    demoSend: 'Отправить',

    eyebrowCases: 'Кейсы',
    casesTitle: 'Реальные результаты бизнеса',
    casesLead: 'Во всех кейсах один путь: проблема → решение → результат.',
    caseMetrics: [
      { value: 37, suffix: '%', label: 'роста записей за 8 недель' },
      { value: 52, suffix: '%', label: 'меньше потерянных обращений' },
      { value: 31, suffix: '%', label: 'рост конверсии лида в продажу' },
      { value: 43, suffix: '%', label: 'быстрее обратный звонок' },
      { value: 2.4, suffix: 'x', label: 'чище воронка в CRM' },
      { value: 46, suffix: '%', label: 'быстрее первый ответ менеджера' },
    ],
    caseChallenge: 'Задача',
    caseSolution: 'Решение',
    caseImpact: 'Эффект',
    case1Title: 'Автосервис, Прага',
    case1Challenge: 'Заявки терялись в нерабочее время, менеджеры отвечали несистемно.',
    case1Solution: 'Внедрили конверсионный лендинг, автоматическую квалификацию и маршрутизацию в CRM.',
    case1Impact: 'Сократился цикл ответа и стабилизировалась обработка входящих обращений.',
    case2Title: 'Образовательный бизнес, ЕС',
    case2Challenge: 'Обращения приходили из разных каналов без управляемого процесса.',
    case2Solution: 'Построили единый intake-поток, правила автоматизации и сценарии работы менеджеров.',
    case2Impact: 'Появился контроль воронки, снизились потери лидов, улучшилась передача в продажи.',
    case3Title: 'Retail-бренд, Центральная Европа',
    case3Challenge: 'Трафик рос, но конверсия и атрибуция были фрагментированы.',
    case3Solution: 'Перестроили web-фронт, связали события аналитики и стандартизировали CRM-атрибуцию.',
    case3Impact: 'Улучшилась прозрачность конверсии и база для масштабирования рекламы.',
    case4Title: 'Стоматология, Брно',
    case4Challenge: 'Высокие расходы на рекламу и медленный обратный контакт по заявкам.',
    case4Solution: 'Внедрили структурированный intake-поток и приоритизацию срочных обращений.',
    case4Impact: 'Скорость обработки выросла, запись на консультации стала стабильнее.',
    case5Title: 'Юридические услуги, Прага',
    case5Challenge: 'Лиды из сайта и мессенджеров дублировались и сортировались вручную.',
    case5Solution: 'Собрали единый поток, добавили дедупликацию и автостатусы в CRM.',
    case5Impact: 'Воронка стала чище, контроль конверсии до консультации — прозрачнее.',
    case6Title: 'E-commerce support, ЕС',
    case6Challenge: 'Поддержка и продажи смешивались в одном inbox без маршрутизации.',
    case6Solution: 'Построили routing по каналам, intent-теги и очередь назначения.',
    case6Impact: 'Снизился хаос в коммуникации и улучшилось качество обработки на масштабе.',

    faqTitle: 'FAQ',
    faqItems: [
      { q: 'Я не технарь. Мне подойдет?', a: 'Да. Мы объясняем всё простым языком и делаем систему под ключ.' },
      { q: 'Как быстро можно стартовать?', a: 'Пилот обычно запускаем за 14 дней. Потом масштабируем по шагам.' },
      { q: 'Заявки с сайта точно идут в Telegram?', a: 'Да. Новые заявки уходят в Telegram и при необходимости в CRM.' },
      { q: 'Можно оставить текущие сервисы?', a: 'Да, чаще всего. Сначала подключаем то, что уже есть, и только потом меняем, если это реально нужно.' },
      { q: 'Что после запуска?', a: 'После запуска сопровождаем, смотрим цифры и улучшаем слабые места.' },
    ],

    eyebrowAbout: 'О компании',
    aboutTitle: 'О нас',
    aboutLead: 'Основатель',
    founderRole: 'Новиков',
    aboutBody:
      'Я помогаю владельцам бизнеса выстроить понятную систему заявок: клиент пишет, получает быстрый ответ и доходит до сделки.',
    archCaption: 'Архитектура системы',
    archActive: 'Активна',
    archOperational: 'Все модули работают',
    archLayer1Title: 'Web-слой',
    archLayer1Stack: 'Next.js · TypeScript · Tailwind',
    archLayer2Title: 'Автоматизация',
    archLayer2Stack: 'Webhooks · OpenAI · Scheduler',
    archLayer3Title: 'CRM и данные',
    archLayer3Stack: 'PostgreSQL · REST API · Pipelines',
    archLayer4Title: 'Каналы',
    archLayer4Stack: 'WhatsApp · Telegram · Instagram',
    archLayer5Title: 'Аналитика',
    archLayer5Stack: 'Plausible · Clarity · Events',

    eyebrowContact: 'Контакты',
    finalTitle: 'Хотите такую систему в своем бизнесе?',
    finalLead: 'Оставьте контакт — покажем, что нужно запустить в первую очередь именно вам.',
    finalPrimaryCta: 'Получить план запуска',
    contactEmail: 'info@temoweb.eu',
    contactTelegram: '@temoweb',
    contactWhatsapp: '+380 96 049 49 17',

    formTitle: 'Оставьте контакт и получите понятный план',
    formLead: 'Без сложных брифов и лишних слов. Свяжемся и покажем следующий практический шаг.',
    formName: 'Ваше имя',
    formPhone: 'Телефон',
    formConsent: 'Я согласен с политикой конфиденциальности и обработкой персональных данных.',
    formSubmit: 'Отправить и получить план',
    formSubmitting: 'Отправка...',
    formSuccess: 'Заявка отправлена. Мы скоро свяжемся с вами.',
    formError: 'Не удалось отправить. Попробуйте ещё раз.',

    footerTagline: 'Понятные системы заявок для реального бизнеса.',
    footerMicro: 'Инфраструктура — до роста.',
    legalPrivacy: 'Конфиденциальность',
    legalTerms: 'Условия',
    legalDeletion: 'Удаление данных',
    topAria: 'Наверх',
    stackBadges: ['Next.js', 'TypeScript', 'OpenAI', 'PostgreSQL', 'WhatsApp API', 'Telegram Bot'],
    rights: 'Все права защищены',
  },

  ua: {
    navServices: 'Jak to funguje',
    navPackages: 'Balíčky',
    navCases: 'Případy',
    navAbout: 'O nás',
    navContact: 'Kontakt',

    heroHeadline: 'Proměňte poptávky v platící klienty na autopilotu.',
    heroSubheadline:
      'Na webu to dává smysl proto, že máte jeden jasný proces: poptávka přijde, rychlá odpověď odejde, klient jde k rezervaci a platbě.',
    heroPrimaryCta: 'Chci systém pro byznys',
    heroSecondaryCta: 'Ukázat za 2 minuty',
    heroBadge: 'TemoWeb · Digital Systems Company',
    heroMicro: 'Proč je to důležité: každá zmeškaná odpověď znamená ztracené tržby.',
    coreCore: 'Jádro',
    coreEngine: 'Engine',
    coreLanding: 'Landing',
    coreAutomation: 'Automatizace',
    coreCrm: 'CRM',
    coreAnalytics: 'Analytika',

    eyebrowProblem: 'Problém',
    problemTitle: 'Proč firmy každý den ztrácejí poptávky',
    problemLead: 'Nejčastěji není problém v reklamě, ale v chaosu uvnitř procesu.',
    problemItems: [
      'Klient napíše, ale odpověď přijde pozdě',
      'Poptávky jsou rozhozené mezi WhatsApp, Instagram a formuláře',
      'Stejné otázky se řeší ručně každý den',
      'Teplé leady se ztrácí bez follow-upu',
      'Není jasné, kde reálně utíkají peníze',
    ],

    eyebrowSolution: 'Řešení',
    solutionTitle: 'Jeden jednoduchý systém poptávek',
    solutionLead:
      'Ne jen web. Fungující proces: poptávka přijde, odpověď odejde, klient se neztratí.',
    solutionFlowLabel: 'Jak to funguje',
    solutionFlow: ['Traffic', 'Landing', 'Automation', 'CRM', 'Analytics', 'Scale'],
    solutionFooter: 'Vidíte cestu každé poptávky od prvního kontaktu až po obchod.',
    flowCta: 'Otevřít živý flow',

    dashTitle: 'Živý systém',
    dashLive: 'Live',
    dashLead: 'Lead přijat',
    dashReply: 'Automatická odpověď odeslána',
    dashCrm: 'Záznam vytvořen v CRM',
    dashQualified: 'Lead kvalifikován · WARM',
    dashAwaiting: 'Čeká na další lead...',

    eyebrowServices: 'Systémové moduly',
    servicesTitle: 'Tři části, které zjednoduší prodej',
    servicesLead: 'Vše je postavené na jednom cíli: neztrácet klienty.',
    serviceWebTitle: 'Web, který sbírá poptávky',
    serviceWebDesc: 'Jasná stránka, kde klient rychle pochopí nabídku a nechá kontakt.',
    serviceAutomationTitle: 'Automatické odpovědi a CRM',
    serviceAutomationDesc: 'Rychlá první odpověď, třídění leadů a vše na jednom místě.',
    serviceInfraTitle: 'Kontrola a růst',
    serviceInfraDesc: 'Přehledná analytika a pravidelné zlepšování, aby výsledky rostly.',
    serviceLayer1: 'Vrstva 01',
    serviceLayer2: 'Vrstva 02',
    serviceLayer3: 'Vrstva 03',

    stat1Val: '24/7',
    stat1Label: 'Provoz systému',
    stat2Val: '< 5s',
    stat2Label: 'Doba odezvy',
    stat3Val: '3-vrstvá',
    stat3Label: 'Architektura',
    stat4Val: '14 dní',
    stat4Label: 'Pilotní spuštění',

    eyebrowPilot: 'Pilotní program',
    pilotTitle: 'Pilotní implementační program',
    pilotDesc:
      'Spustíme jeden klíčový klientský tok během 14 dní, ověříme dopad na konverze a systém rozšiřitelně nasadíme.',
    pilotCta: 'Požádat o pilot',

    eyebrowPackages: 'Balíčky',
    packagesTitle: 'Balíčky',
    packagesLead: 'Vyberte balíček podle aktuální fáze vašeho podnikání.',
    packagesMicro: 'Bez zbytečností. Jen to, co teď opravdu potřebujete.',
    packageStarterTitle: 'Starter — Digitální základ',
    packageStarterPrice: '1 900 EUR + 290 EUR/měs. · minimum 2 měsíce',
    packageStarterDesc: 'Základní webový systém, lead capture flow a výchozí analytika.',
    packageStarterItems: [
      'Struktura konverzního webu',
      'Směrování poptávek do Telegramu a CRM-ready formát',
      'Základní tracking událostí a zdrojů',
      'Plán spuštění a kontrolní checklist',
    ],
    packageGrowthTitle: 'Growth — Klientský systém',
    packageGrowthPrice: '3 900 EUR + 490 EUR/měs. · minimum 2 měsíce',
    packageGrowthDesc: 'Webový systém, automatizace, CRM integrace a reportovací workflow.',
    packageGrowthItems: [
      'Vše ze Starter',
      'Scénáře automatických odpovědí a kvalifikace leadů',
      'CRM integrace se status pipeline',
      'Operační dashboard a SLA logika odpovědi',
    ],
    packageScaleTitle: 'Scale — Plná infrastruktura',
    packageScalePrice: '6 900 EUR + 790 EUR/měs. · minimum 2 měsíce',
    packageScaleDesc: 'Multikanálová architektura, pokročilá automatizace a infrastruktura pro růst.',
    packageScaleItems: [
      'Vše z Growth',
      'Multikanálová orchestrace (web, WhatsApp, Telegram, Instagram)',
      'Pokročilá analytika a diagnostika konverzí',
      'Škálovatelná architektura a měsíční optimalizační cyklus',
    ],

    eyebrowEstimate: 'Odhad ceny',
    calcTitle: 'Otestujte systém',
    calcLead: 'Podívejte se, jak by AI manager odpovídal vašim klientům.',
    demoIndustryLabel: 'V jakém oboru podnikáte?',
    demoIndustryPlaceholder: 'Například: Autoservis',
    demoRun: 'Spustit live demo',
    demoReset: 'Resetovat demo',
    demoClientPrefix: 'Klient',
    demoAiPrefix: 'AI manager',
    demoLoading: 'AI manager píše...',
    demoError: 'Demo odpověď se nepodařilo načíst. Zkuste to prosím znovu.',
    demoScenario: 'Demo scénář: nový příchozí lead',
    demoOrManual: 'Nebo zadejte svůj obor ručně',
    demoPresets: ['Autoservis', 'Stomatologie', 'Právní služby', 'Reality a hypotéky'],
    demoBookCta: 'Chci to i pro svůj byznys',
    selectedIndustryLabel: 'Vybraný obor',
    demoMessagePlaceholder: 'Napište zprávu klienta...',
    demoSend: 'Odeslat',

    eyebrowCases: 'Případové studie',
    casesTitle: 'Reálné výsledky firem',
    casesLead: 'V každém případu stejná logika: problém → řešení → výsledek.',
    caseMetrics: [
      { value: 37, suffix: '%', label: 'více rezervací za 8 týdnů' },
      { value: 52, suffix: '%', label: 'méně ztracených poptávek' },
      { value: 31, suffix: '%', label: 'vyšší konverze leadu na prodej' },
      { value: 43, suffix: '%', label: 'rychlejší callback' },
      { value: 2.4, suffix: 'x', label: 'čistší CRM pipeline' },
      { value: 46, suffix: '%', label: 'rychlejší první odpověď' },
    ],
    caseChallenge: 'Výzva',
    caseSolution: 'Řešení',
    caseImpact: 'Dopad',
    case1Title: 'Autoservis, Praha',
    case1Challenge: 'Leady se ztrácely mimo pracovní dobu a follow-up nebyl konzistentní.',
    case1Solution: 'Nasadili jsme konverzní landing flow, automatickou kvalifikaci a CRM routing.',
    case1Impact: 'Rychlejší reakce a stabilní proces zpracování poptávek.',
    case2Title: 'Vzdělávací firma, EU',
    case2Challenge: 'Poptávky chodily z více kanálů bez provozního systému.',
    case2Solution: 'Vytvořili jsme jednotný intake systém s automatizacemi a prací managerů.',
    case2Impact: 'Lepší kontrola pipeline a menší ztráty leadů.',
    case3Title: 'Retail značka, střední Evropa',
    case3Challenge: 'Růst návštěvnosti bez jasné konverze a sledování.',
    case3Solution: 'Přestavba web front-endu, analytických událostí a CRM atribuce.',
    case3Impact: 'Vyšší přehled o výkonu a stabilní základ pro škálování kampaní.',
    case4Title: 'Stomatologická klinika, Brno',
    case4Challenge: 'Vysoké náklady na reklamu a pomalý callback k poptávkám.',
    case4Solution: 'Nasadili jsme intake flow s prioritizací urgentních leadů.',
    case4Impact: 'Rychlejší zpracování poptávek a stabilnější booking konzultací.',
    case5Title: 'Právní služby, Praha',
    case5Challenge: 'Leady z webu a messengerů se duplikovaly a třídily ručně.',
    case5Solution: 'Sjednotili jsme capture pipeline, deduplikaci a auto-statusy v CRM.',
    case5Impact: 'Čistší pipeline a lepší kontrola konverze na konzultaci.',
    case6Title: 'E-commerce support, EU',
    case6Challenge: 'Support a sales chaty byly v jednom inboxu bez routing logiky.',
    case6Solution: 'Postavili jsme channel routing, intent tagy a queue assignment.',
    case6Impact: 'Méně chaosu v komunikaci a vyšší kvalita zpracování na škále.',

    faqTitle: 'FAQ',
    faqItems: [
      { q: 'Nejsem technický člověk. Je to pro mě?', a: 'Ano. Vše vysvětlujeme jednoduchým jazykem a systém postavíme za vás.' },
      { q: 'Jak rychle se dá začít?', a: 'Pilot spouštíme obvykle do 14 dní. Pak systém rozšiřujeme po krocích.' },
      { q: 'Půjdou poptávky z webu do Telegramu?', a: 'Ano. Nové poptávky jdou přímo do Telegramu a podle potřeby i do CRM.' },
      { q: 'Můžeme nechat současné nástroje?', a: 'Ve většině případů ano. Nejprve napojíme to, co už používáte.' },
      { q: 'Co po spuštění?', a: 'Po startu systém stabilizujeme a průběžně zlepšujeme podle výsledků.' },
    ],

    eyebrowAbout: 'O nás',
    aboutTitle: 'O nás',
    aboutLead: 'Zakladatel',
    founderRole: 'Novikov',
    aboutBody:
      'Pomáhám majitelům firem postavit jasný systém poptávek: klient napíše, dostane rychlou odpověď a jde dál k objednávce.',
    archCaption: 'Architektura systému',
    archActive: 'Aktivní',
    archOperational: 'Všechny moduly běží',
    archLayer1Title: 'Web vrstva',
    archLayer1Stack: 'Next.js · TypeScript · Tailwind',
    archLayer2Title: 'Automatizace',
    archLayer2Stack: 'Webhooks · OpenAI · Scheduler',
    archLayer3Title: 'CRM a data',
    archLayer3Stack: 'PostgreSQL · REST API · Pipelines',
    archLayer4Title: 'Kanály',
    archLayer4Stack: 'WhatsApp · Telegram · Instagram',
    archLayer5Title: 'Analytika',
    archLayer5Stack: 'Plausible · Clarity · Events',

    eyebrowContact: 'Kontakt',
    finalTitle: 'Chcete takový systém i ve své firmě?',
    finalLead: 'Nechte kontakt a ukážeme vám, co spustit jako první krok.',
    finalPrimaryCta: 'Získat plán spuštění',
    contactEmail: 'info@temoweb.eu',
    contactTelegram: '@temoweb',
    contactWhatsapp: '+380 96 049 49 17',

    formTitle: 'Nechte kontakt a dostanete jasný plán',
    formLead: 'Bez složitých briefingů. Ozveme se a ukážeme první praktický krok.',
    formName: 'Vaše jméno',
    formPhone: 'Telefon',
    formConsent: 'Souhlasím se zpracováním osobních údajů a podmínkami ochrany soukromí.',
    formSubmit: 'Odeslat a získat plán',
    formSubmitting: 'Odesílání...',
    formSuccess: 'Poptávka odeslána. Brzy se ozveme.',
    formError: 'Odeslání se nezdařilo. Zkuste to prosím znovu.',

    footerTagline: 'Srozumitelné systémy poptávek pro reálný byznys.',
    footerMicro: 'Infrastruktura před růstem.',
    legalPrivacy: 'Soukromí',
    legalTerms: 'Podmínky',
    legalDeletion: 'Smazání dat',
    topAria: 'Nahoru',
    stackBadges: ['Next.js', 'TypeScript', 'OpenAI', 'PostgreSQL', 'WhatsApp API', 'Telegram Bot'],
    rights: 'Všechna práva vyhrazena',
  },
}
