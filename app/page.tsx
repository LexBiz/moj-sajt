'use client'
import { useEffect, useState } from 'react'
import { translations, type Lang } from './translations'

export default function Home() {
  const [lang, setLang] = useState<Lang>('ru')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const t = translations[lang]
  
  // Show scroll to top button after scrolling
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  // Reset carousel when filter changes
  useEffect(() => {
    setCurrentProjectIndex(0)
  }, [projectFilter])
  
  // Swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50
    
    if (isLeftSwipe) {
      setCurrentProjectIndex((prev) => (prev + 1) % filteredProjects.length)
    }
    if (isRightSwipe) {
      setCurrentProjectIndex((prev) => (prev - 1 + filteredProjects.length) % filteredProjects.length)
    }
    
    setTouchStart(0)
    setTouchEnd(0)
  }
  
  const projects = [
    {
      id: 1,
      name: 'Sphynx Dubai',
      desc: lang === 'ru' ? 'Премиальный сайт под международную аудиторию с акцентом на доверие, бренд и конверсию заявок для клиентов из Дубая и Европы' : lang === 'ua' ? 'Преміальний сайт під міжнародну аудиторію з акцентом на довіру, бренд та конверсію заявок для клієнтів з Дубая та Європи' : 'Premium website for international audience with focus on trust, brand and lead conversion for clients from Dubai and Europe',
      url: 'https://sphynxdubai.ae/',
      category: 'landing',
      gradient: 'from-amber-900 via-orange-900 to-yellow-900',
      icon: '🐱',
      tech: ['Next.js', 'React', 'Tailwind'],
      color: 'amber',
      screenshot: 'sphynxdubai.jpg'
    },
    {
      id: 2,
      name: 'Boss Detaling Bot',
      desc: lang === 'ru' ? 'Telegram-бот для автоматизации заявок и общения с клиентами, который экономит время бизнесу и увеличивает количество заказов' : lang === 'ua' ? 'Telegram-бот для автоматизації заявок та спілкування з клієнтами, який економить час бізнесу та збільшує кількість замовлень' : 'Telegram bot for request automation and client communication that saves business time and increases orders',
      url: 'https://t.me/BOSS_DETALING_BOT',
      category: 'bots',
      gradient: 'from-blue-900 via-cyan-900 to-teal-900',
      icon: '🤖',
      tech: ['Telegram API', 'Node.js', 'MongoDB'],
      color: 'blue',
      screenshot: 'bossdetaling-bot.jpg'
    },
    {
      id: 3,
      name: 'Boss Detaling',
      desc: lang === 'ru' ? 'Продающий сайт для сервисного бизнеса в Европе с удобной структурой услуг, понятной навигацией и фокусом на записи клиентов' : lang === 'ua' ? 'Продаючий сайт для сервісного бізнесу в Європі з зручною структурою послуг, зрозумілою навігацією та фокусом на записі клієнтів' : 'Selling website for service business in Europe with convenient service structure, clear navigation and focus on client bookings',
      url: 'https://bossdetaling.eu/',
      category: 'ecommerce',
      gradient: 'from-slate-900 via-gray-900 to-zinc-900',
      icon: '🚗',
      tech: ['Next.js', 'Tailwind', 'CSS'],
      color: 'slate',
      screenshot: 'bossdetaling.jpg'
    },
    {
      id: 4,
      name: 'TikTok Boost Lana',
      desc: lang === 'ru' ? 'Лендинг под онлайн-курс с чёткой подачей ценности, логикой продаж и фокусом на конверсию без перегруженного дизайна' : lang === 'ua' ? 'Лендінг під онлайн-курс з чіткою подачею цінності, логікою продажів та фокусом на конверсію без перевантаженого дизайну' : 'Landing page for online course with clear value proposition, sales logic and conversion focus without cluttered design',
      url: 'https://tiktokboostlana.netlify.app/',
      category: 'landing',
      gradient: 'from-pink-900 via-rose-900 to-red-900',
      icon: '📱',
      tech: ['React', 'Tailwind', 'CSS'],
      color: 'pink',
      screenshot: 'tiktokboost.jpg'
    },
    {
      id: 5,
      name: 'Mila Style',
      desc: lang === 'ru' ? 'Стильный сайт для онлайн-магазина одежды, который подчёркивает бренд и упрощает путь клиента от просмотра до покупки' : lang === 'ua' ? 'Стильний сайт для онлайн-магазину одягу, який підкреслює бренд та спрощує шлях клієнта від перегляду до покупки' : 'Stylish website for online clothing store that emphasizes brand and simplifies customer journey from browsing to purchase',
      url: 'https://milastyle.netlify.app/',
      category: 'portfolio',
      gradient: 'from-purple-900 via-fuchsia-900 to-pink-900',
      icon: '👗',
      tech: ['React', 'Tailwind', 'CSS'],
      color: 'purple',
      screenshot: 'milastyle.jpg'
    },
    {
      id: 6,
      name: 'Dmitry Rieltor UA',
      desc: lang === 'ru' ? 'Персональный сайт-визитка для риелтора с упором на доверие, экспертность и быстрый контакт с клиентом' : lang === 'ua' ? 'Персональний сайт-візитка для рієлтора з акцентом на довіру, експертність та швидкий контакт з клієнтом' : 'Personal business card website for realtor with focus on trust, expertise and quick client contact',
      url: 'https://dmitryrieltorua.netlify.app/',
      category: 'landing',
      gradient: 'from-emerald-900 via-teal-900 to-cyan-900',
      icon: '🏠',
      tech: ['React', 'Tailwind', 'CSS'],
      color: 'emerald',
      screenshot: 'dmitryrieltor.jpg'
    },
    {
      id: 7,
      name: 'Eco Remont',
      desc: lang === 'ru' ? 'Простой и понятный сайт для ремонтных услуг, который объясняет ценность сервиса и приводит заявки без лишнего маркетингового шума' : lang === 'ua' ? 'Простий та зрозумілий сайт для ремонтних послуг, який пояснює цінність сервісу та приводить заявки без зайвого маркетингового шуму' : 'Simple and clear website for renovation services that explains service value and generates leads without excessive marketing noise',
      url: 'https://ecoremont.netlify.app/',
      category: 'landing',
      gradient: 'from-green-900 via-lime-900 to-emerald-900',
      icon: '🌱',
      tech: ['React', 'Tailwind', 'CSS'],
      color: 'green',
      screenshot: 'ecoremont.jpg'
    },
    {
      id: 8,
      name: 'Anika Brand Lux',
      desc: lang === 'ru' ? 'Имиджевый сайт под fashion-бренд с премиальной подачей, аккуратной типографикой и акцентом на визуал' : lang === 'ua' ? 'Іміджевий сайт під fashion-бренд з преміальною подачею, акуратною типографікою та акцентом на візуал' : 'Image website for fashion brand with premium presentation, neat typography and focus on visuals',
      url: 'https://anikabrandlux.netlify.app/',
      category: 'ecommerce',
      gradient: 'from-yellow-900 via-amber-900 to-orange-900',
      icon: '💎',
      tech: ['React', 'Tailwind', 'CSS'],
      color: 'yellow',
      screenshot: 'anikabrand.jpg'
    },
    {
      id: 9,
      name: 'Lakerta',
      desc: lang === 'ru' ? 'Сайт для бренда одежды, ориентированный на женскую аудиторию, с фокусом на эстетику, простоту и узнаваемость бренда' : lang === 'ua' ? 'Сайт для бренду одягу, орієнтований на жіночу аудиторію, з фокусом на естетику, простоту та впізнаваність бренду' : 'Website for clothing brand targeted at female audience with focus on aesthetics, simplicity and brand recognition',
      url: 'https://lakerta.netlify.app/',
      category: 'landing',
      gradient: 'from-indigo-900 via-blue-900 to-cyan-900',
      icon: '⚡',
      tech: ['React', 'Tailwind', 'CSS'],
      color: 'indigo',
      screenshot: 'lakerta.jpg'
    },
    {
      id: 10,
      name: 'TemoWeb',
      desc: lang === 'ru' ? 'Сайт разработчика, который показывает подход: быстрые сайты, чистый код, продуманная логика и современный дизайн' : lang === 'ua' ? 'Сайт розробника, який показує підхід: швидкі сайти, чистий код, продумана логіка та сучасний дизайн' : 'Developer website that showcases approach: fast websites, clean code, thoughtful logic and modern design',
      url: 'https://temoweb.netlify.app/',
      category: 'portfolio',
      gradient: 'from-violet-900 via-purple-900 to-fuchsia-900',
      icon: '🚀',
      tech: ['Next.js', 'TypeScript', 'Tailwind'],
      color: 'violet',
      screenshot: 'temoweb.jpg'
    }
  ]
  
  const filteredProjects = projectFilter === 'all' 
    ? projects 
    : projects.filter(p => p.category === projectFilter)
  
  return (
    <main className="min-h-screen">
      {/* HEADER with glassmorphism */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-slate-900/80 border-b border-slate-700/50 shadow-sm">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <a href="#top" className="flex items-center gap-2 group">
            <div className="flex items-center gap-2">
              <img 
                src="/logo.png" 
                alt="TemoWeb" 
                className="h-7 sm:h-8 w-auto object-contain group-hover:scale-110 transition-transform duration-300"
              />
              <span className="text-base sm:text-lg font-bold tracking-tight gradient-text">
                TemoWeb
              </span>
            </div>
          </a>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#services" className="text-sm font-medium text-slate-300 hover:text-indigo-400 transition-colors">{t.services}</a>
            <a href="#cases" className="text-sm font-medium text-slate-300 hover:text-indigo-400 transition-colors">{t.cases}</a>
            <a href="#reviews" className="text-sm font-medium text-slate-300 hover:text-indigo-400 transition-colors">{t.reviews}</a>
            <a href="#faq" className="text-sm font-medium text-slate-300 hover:text-indigo-400 transition-colors">{t.faq}</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-800/50 rounded-full p-0.5 sm:p-1">
              <button onClick={() => setLang('ru')} className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-all ${lang === 'ru' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>RU</button>
              <button onClick={() => setLang('ua')} className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-all ${lang === 'ua' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>UA</button>
              <button onClick={() => setLang('en')} className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-all ${lang === 'en' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>EN</button>
            </div>
            <a
              href="#contact"
              className="hidden sm:inline-flex shine items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-2.5 text-sm font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
            >
              🚀 {t.discuss}
            </a>
          </div>
        </div>
      </header>

      {/* HERO - Premium version */}
      <section id="top" className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
        
        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-slate-300 shadow-lg ring-1 ring-slate-200 mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                {t.openForProjects}
              </div>
              
              <h1 className="text-balance text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                {t.heroTitle}
              </h1>
              <p className="mt-6 text-xl leading-relaxed text-slate-300">
                {t.heroDesc}
              </p>
              
              {/* Stats */}
              <div className="mt-10 grid grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold text-white">50+</div>
                  <div className="text-sm text-slate-400 mt-1">{t.projects}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">98%</div>
                  <div className="text-sm text-slate-400 mt-1">{t.satisfied}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">5+</div>
                  <div className="text-sm text-slate-400 mt-1">{t.yearsExp}</div>
                </div>
              </div>
              
              <div className="mt-10 flex flex-wrap gap-4">
                <a
                  href="#contact"
                  className="shine inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-4 text-base font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  🚀 {t.startProject}
                </a>
                <a
                  href="#cases"
                  className="inline-flex items-center justify-center rounded-full border-2 border-slate-300 bg-slate-900 px-8 py-4 text-base font-semibold text-white hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
                >
                  📁 {t.viewCases}
                </a>
              </div>
            </div>
            
            {/* Right side - Website mockup */}
            <div className="hidden lg:block relative">
              <div className="relative">
                {/* Browser window mockup */}
                <div className="relative rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
                  {/* Browser header */}
                  <div className="bg-slate-100 px-4 py-3 flex items-center gap-2 border-b border-slate-700">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="bg-slate-900 rounded-md px-3 py-1 text-xs text-slate-400 border border-slate-700">
                        temoweb.com
                      </div>
                    </div>
                  </div>
                  
                  {/* Website content mockup with realistic content scroll */}
                  <div className="relative h-80 overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950">
                    <div className="animate-scroll-slow">
                      <div className="space-y-4 p-4">
                      {/* Mini Header */}
                      <div className="flex items-center justify-between bg-slate-900/50 backdrop-blur-sm p-2 rounded-lg">
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[6px] font-bold">T</div>
                          <span className="text-[8px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">TemoWeb</span>
                        </div>
                        <div className="h-3 bg-indigo-500 rounded-full w-12 text-[6px] text-white flex items-center justify-center">🚀</div>
                      </div>
                      
                      {/* Mini Hero */}
                      <div className="space-y-2 bg-slate-900/30 p-3 rounded-lg">
                        <div className="inline-flex items-center gap-1 bg-slate-900/50 rounded-full px-2 py-0.5">
                          <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse"></div>
                          <span className="text-[6px] text-slate-300">{t.openForProjects.slice(0, 20)}...</span>
                        </div>
                        <h2 className="text-[10px] font-bold text-white leading-tight">{t.heroTitle.slice(0, 40)}...</h2>
                        <p className="text-[6px] text-slate-400 leading-relaxed">{t.heroDesc.slice(0, 60)}...</p>
                        
                        {/* Mini Stats */}
                        <div className="grid grid-cols-3 gap-1.5 mt-2">
                          <div className="text-center">
                            <div className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">50+</div>
                            <div className="text-[5px] text-slate-400">{t.projects}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">98%</div>
                            <div className="text-[5px] text-slate-400">{t.satisfied}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">5+</div>
                            <div className="text-[5px] text-slate-400">{t.yearsExp}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Services Section */}
                      <div className="space-y-2">
                        <h3 className="text-[8px] font-bold text-center">
                          <span className="text-white">{t.servicesTitle.split(' ')[0]}</span>{' '}
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{t.servicesTitle.split(' ').slice(1).join(' ')}</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="bg-slate-700/50 border border-indigo-500/30 rounded-lg p-2">
                            <div className="text-[6px] font-bold text-white mb-0.5">{t.simpleWebsite}</div>
                            <div className="text-[5px] text-slate-400">350-500 €</div>
                          </div>
                          <div className="bg-slate-700/50 border border-purple-500/30 rounded-lg p-2">
                            <div className="text-[6px] font-bold text-white mb-0.5">{t.landingPage}</div>
                            <div className="text-[5px] text-slate-400">500-800 €</div>
                          </div>
                          <div className="bg-slate-700/50 border border-pink-500/30 rounded-lg p-2">
                            <div className="text-[6px] font-bold text-white mb-0.5">{t.telegramBots}</div>
                            <div className="text-[5px] text-slate-400">600-1000 €</div>
                          </div>
                          <div className="bg-slate-700/50 border border-green-500/30 rounded-lg p-2">
                            <div className="text-[6px] font-bold text-white mb-0.5">{t.crmAuto}</div>
                            <div className="text-[5px] text-slate-400">800-1500 €</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Cases Section */}
                      <div className="space-y-2">
                        <h3 className="text-[8px] font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                          {t.casesTitle}
                        </h3>
                        <div className="space-y-1.5">
                          <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-indigo-300/30 rounded-lg p-2">
                            <div className="text-[6px] font-bold text-white mb-1">🏢 {t.businessConsultant}</div>
                            <div className="text-[5px] text-slate-400">{t.businessConsultantDesc.slice(0, 50)}...</div>
                            <div className="flex justify-between mt-1">
                              <span className="text-[6px] text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 font-bold">+340%</span>
                              <span className="text-[5px] text-slate-400">{t.conversionRate}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Reviews Section */}
                      <div className="bg-slate-800/50 rounded-lg p-2 space-y-1.5">
                        <h3 className="text-[8px] font-bold text-center text-white">{t.reviewsTitle}</h3>
                        <div className="space-y-1">
                          <div className="bg-slate-900/50 rounded-lg p-1.5">
                            <div className="flex gap-0.5 mb-1">
                              <span className="text-yellow-400 text-[6px]">⭐</span>
                              <span className="text-yellow-400 text-[6px]">⭐</span>
                              <span className="text-yellow-400 text-[6px]">⭐</span>
                              <span className="text-yellow-400 text-[6px]">⭐</span>
                              <span className="text-yellow-400 text-[6px]">⭐</span>
                            </div>
                            <p className="text-[5px] text-slate-300 italic">«{t.review1.slice(0, 60)}...»</p>
                            <div className="mt-1 text-[5px] text-slate-400">{t.review1Name}</div>
                          </div>
                        </div>
                      </div>
                      
                        {/* CTA with WhatsApp button - animated click + code typing */}
                        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-lg p-3 text-center space-y-2">
                          <h3 className="text-[8px] font-bold text-white">{t.readyTitle}</h3>
                          <div className="space-y-1">
                            <div className="bg-indigo-500 hover:bg-indigo-600 rounded-full py-1 px-2 text-[6px] text-white font-semibold inline-block">
                              🚀 {t.startProject}
                            </div>
                            <div className="relative inline-block">
                              <div className="bg-green-500 hover:bg-green-600 rounded-full py-1 px-2 text-[6px] text-white font-semibold click-animation">
                                📱 {t.writeWhatsapp}
                              </div>
                              {/* Animated cursor/click indicator - enhanced */}
                              <div className="absolute -right-1 -top-1">
                                <div className="w-2 h-2 bg-white rounded-full animate-ping opacity-75"></div>
                                <div className="absolute top-0 left-0 w-2 h-2 bg-white rounded-full opacity-50"></div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Code typing animation after "click" */}
                          <div className="bg-slate-950/80 rounded p-2 mt-2 text-left font-mono space-y-0.5">
                            <div className="code-line text-[5px] text-green-400">
                              <span className="text-purple-400">const</span> <span className="text-blue-400">message</span> = <span className="text-yellow-300">{'"Привіт! 👋"'}</span>
                            </div>
                            <div className="code-line text-[5px] text-green-400">
                              <span className="text-purple-400">await</span> <span className="text-blue-400">sendWhatsApp</span>()
                            </div>
                            <div className="code-line text-[5px] text-green-400">
                              <span className="text-slate-500">{'// Підключення...'}</span>
                            </div>
                            <div className="code-line text-[5px] text-green-400">
                              ✅ <span className="text-green-300">Готово!</span>
                            </div>
                          </div>
                        </div>
                      
                      </div>
                      
                      {/* Duplicate for seamless loop */}
                      <div className="space-y-4 p-4">
                        <div className="flex items-center justify-between bg-slate-900/50 backdrop-blur-sm p-2 rounded-lg">
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[6px] font-bold">T</div>
                            <span className="text-[8px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">TemoWeb</span>
                          </div>
                          <div className="h-3 bg-indigo-500 rounded-full w-12 text-[6px] text-white flex items-center justify-center">🚀</div>
                        </div>
                        <div className="space-y-2 bg-slate-900/30 p-3 rounded-lg">
                          <h2 className="text-[10px] font-bold text-white leading-tight">{t.heroTitle.slice(0, 40)}...</h2>
                          <p className="text-[6px] text-slate-400 leading-relaxed">{t.heroDesc.slice(0, 60)}...</p>
                          <div className="grid grid-cols-3 gap-1.5 mt-2">
                            <div className="text-center">
                              <div className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">50+</div>
                              <div className="text-[5px] text-slate-400">{t.projects}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">98%</div>
                              <div className="text-[5px] text-slate-400">{t.satisfied}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">5+</div>
                              <div className="text-[5px] text-slate-400">{t.yearsExp}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-200 rounded-2xl rotate-12 shadow-lg animate-bounce" style={{animationDuration: '3s'}}></div>
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-pink-200 rounded-full shadow-lg animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM - Enhanced */}
      <section className="border-t border-slate-700 bg-slate-800">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t.problemsTitle.split('—')[0]}— <span className="gradient-text">{t.problemsTitle.split('—')[1]}</span>
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              {t.problemsDesc}
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-900 p-8">
              <div className="text-4xl mb-4">❌</div>
              <h3 className="text-lg font-bold text-white">{t.problem1}</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-300">
                {t.problem1Desc}
              </p>
              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="flex items-start gap-2 text-sm text-green-400">
                  <span className="text-xl">✅</span>
                  <span className="font-medium">{t.solution}</span>
                </div>
              </div>
            </div>
            
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-900 p-8">
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="text-lg font-bold text-white">{t.problem2}</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-300">
                {t.problem2Desc}
              </p>
              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="flex items-start gap-2 text-sm text-green-400">
                  <span className="text-xl">✅</span>
                  <span className="font-medium">{t.solution2}</span>
                </div>
              </div>
            </div>
            
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-900 p-8">
              <div className="text-4xl mb-4">💸</div>
              <h3 className="text-lg font-bold text-white">{t.problem3}</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-300">
                {t.problem3Desc}
              </p>
              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="flex items-start gap-2 text-sm text-green-400">
                  <span className="text-xl">✅</span>
                  <span className="font-medium">{t.solution3}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* APPROACH - Enhanced */}
      <section className="border-t border-slate-700 bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t.approachTitle.split(lang === 'ru' ? 'бизнеса' : lang === 'ua' ? 'бізнесу' : 'business')[0]}<span className="gradient-text">{lang === 'ru' ? 'бизнеса' : lang === 'ua' ? 'бізнесу' : 'business'}</span>{t.approachTitle.split(lang === 'ru' ? 'бизнеса' : lang === 'ua' ? 'бізнесу' : 'business')[1]}
            </h2>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-800 p-8 shadow-lg">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-2xl mb-6 shadow-lg">
                🎯
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{t.goal}</h3>
              <p className="text-base leading-relaxed text-slate-300">
                {t.goalDesc}
              </p>
            </div>
            
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-800 p-8 shadow-lg">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-2xl mb-6 shadow-lg">
                💡
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{t.clearLang}</h3>
              <p className="text-base leading-relaxed text-slate-300">
                {t.clearLangDesc}
              </p>
            </div>
            
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-800 p-8 shadow-lg">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center text-white text-2xl mb-6 shadow-lg">
                📈
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{t.result}</h3>
              <p className="text-base leading-relaxed text-slate-300">
                {t.resultDesc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES - Premium cards */}
      <section id="services" className="border-t border-slate-700 bg-slate-800">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t.servicesTitle.split(lang === 'ru' ? 'прозрачные цены' : lang === 'ua' ? 'прозорі ціни' : 'transparent prices')[0]}<span className="gradient-text">{lang === 'ru' ? 'прозрачные цены' : lang === 'ua' ? 'прозорі ціни' : 'transparent prices'}</span>
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              {t.servicesDesc}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Individual Services */}
            <article className="card-hover rounded-3xl bg-slate-900 border-2 border-slate-700 p-8 shadow-lg">
              <div className="text-4xl mb-4">🌐</div>
              <h3 className="text-xl font-bold tracking-tight text-white">{t.simpleWebsite}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold gradient-text">{lang === 'ru' ? 'от 50 €' : lang === 'ua' ? 'від 50 €' : 'from 50 €'}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">2 000 ₴ / 1 250 CZK</p>
              <p className="mt-6 text-base leading-relaxed text-slate-300">
                {t.simpleWebsiteDesc}
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">✓</span>
                  <span>{t.adaptiveDesign}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">✓</span>
                  <span>{t.contactForm}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">✓</span>
                  <span>{t.ready57days}</span>
                </li>
              </ul>
            </article>

            <article className="card-hover rounded-3xl bg-slate-900 border-2 border-slate-700 p-8 shadow-lg">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-bold tracking-tight text-white">{t.landingPage}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold gradient-text">{lang === 'ru' ? 'от 300 €' : lang === 'ua' ? 'від 300 €' : 'from 300 €'}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">12 000 ₴ / 7 500 CZK</p>
              <p className="mt-6 text-base leading-relaxed text-slate-300">
                {t.landingPageDesc}
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">✓</span>
                  <span>{t.sellingDesign}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">✓</span>
                  <span>{t.seoOptimization}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">✓</span>
                  <span>{t.analyticsMetrics}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">✓</span>
                  <span>{t.ready710days}</span>
                </li>
              </ul>
            </article>

            <article className="card-hover rounded-3xl bg-slate-900 border-2 border-slate-700 p-8 shadow-lg">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-bold tracking-tight text-white">{t.telegramBots}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold gradient-text">{lang === 'ru' ? 'от 500 €' : lang === 'ua' ? 'від 500 €' : 'from 500 €'}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">20 000 ₴ / 12 500 CZK</p>
              <p className="mt-6 text-base leading-relaxed text-slate-300">
                {t.telegramBotsDesc}
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Автоответчик 24/7</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Сбор заявок</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Интеграции</span>
                </li>
              </ul>
            </article>

            <article className="card-hover rounded-3xl bg-slate-900 border-2 border-slate-700 p-8 shadow-lg">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-xl font-bold tracking-tight text-white">{t.crmAuto}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold gradient-text">{lang === 'ru' ? 'от 800 €' : lang === 'ua' ? 'від 800 €' : 'from 800 €'}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">32 000 ₴ / 20 000 CZK</p>
              <p className="mt-6 text-base leading-relaxed text-slate-300">
                {t.crmAutoDesc}
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Учёт клиентов</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Автоматизация рутины</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Отчётность</span>
                </li>
              </ul>
            </article>

            
            {/* Packages Section - NEW */}
            <div className="md:col-span-3 mt-12">
              <h3 className="text-2xl font-bold text-center text-white mb-2">{lang === 'ru' ? '🎁 Готовые пакеты' : lang === 'ua' ? '🎁 Готові пакети' : '🎁 Ready packages'}</h3>
              <p className="text-center text-slate-400 mb-8">{lang === 'ru' ? 'Экономия до 30% при выборе пакета' : lang === 'ua' ? 'Економія до 30% при виборі пакету' : 'Save up to 30% with package'}</p>
            </div>

            {/* Standard Package */}
            <article className="card-hover rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-green-600 p-8 shadow-xl">
              <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                💚 {lang === 'ru' ? 'Старт' : lang === 'ua' ? 'Старт' : 'Start'}
              </div>
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-2xl font-bold tracking-tight text-white">{t.packageStandard}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold gradient-text">{lang === 'ru' ? 'от 1200 €' : lang === 'ua' ? 'від 1200 €' : 'from 1200 €'}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">48K ₴ / 30K CZK</p>
              <p className="mt-6 text-base leading-relaxed text-slate-300">
                {t.packageStandardDesc}
              </p>
            </article>

            {/* Pro Package */}
            <article className="card-hover rounded-3xl bg-gradient-to-br from-indigo-900 to-purple-900 border-2 border-indigo-500 p-8 shadow-2xl scale-105 relative">
              <div className="absolute top-4 right-4 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                ⭐ {lang === 'ru' ? 'Хит' : lang === 'ua' ? 'Хіт' : 'Popular'}
              </div>
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold tracking-tight text-white">{t.packagePro}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold gradient-text">{lang === 'ru' ? 'от 2000 €' : lang === 'ua' ? 'від 2000 €' : 'from 2000 €'}</span>
              </div>
              <p className="mt-1 text-sm text-slate-400">80K ₴ / 50K CZK</p>
              <p className="mt-6 text-base leading-relaxed text-slate-300">
                {t.packageProDesc}
              </p>
            </article>

            {/* Premium Package */}
            <article className="card-hover rounded-3xl bg-gradient-to-br from-purple-900 to-pink-900 border-2 border-purple-600 p-8 shadow-xl">
              <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                👑 Premium
              </div>
              <div className="text-4xl mb-4">💎</div>
              <h3 className="text-2xl font-bold tracking-tight text-white">{t.packagePremium}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold gradient-text">{lang === 'ru' ? 'от 3000 €' : lang === 'ua' ? 'від 3000 €' : 'from 3000 €'}</span>
              </div>
              <p className="mt-1 text-sm text-slate-400">120K ₴ / 75K CZK</p>
              <p className="mt-6 text-base leading-relaxed text-slate-300">
                {t.packagePremiumDesc}
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* CASES / PORTFOLIO */}
      <section id="cases" className="border-t border-slate-700 bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t.casesTitle.split(lang === 'ru' ? 'кейсы' : lang === 'ua' ? 'кейси' : 'cases')[0]}<span className="gradient-text">{lang === 'ru' ? 'кейсы' : lang === 'ua' ? 'кейси' : 'cases'}</span>{t.casesTitle.split(lang === 'ru' ? 'кейсы' : lang === 'ua' ? 'кейси' : 'cases')[1]}
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              {t.casesDesc}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Case 1 */}
            <article className="card-hover rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-indigo-100 p-8 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">🚗</div>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">{lang === 'ru' ? 'Сайт + Бот' : lang === 'ua' ? 'Сайт + Бот' : 'Website + Bot'}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {t.businessConsultant}
              </h3>
              <p className="text-slate-300 mb-6">
                {t.businessConsultantDesc}
              </p>
              <div className="bg-slate-900 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t.conversionRate}</span>
                  <span className="text-2xl font-bold gradient-text">{lang === 'ru' ? 'Работает' : lang === 'ua' ? 'Працює' : 'Works'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t.requestsPerMonth}</span>
                  <span className="text-2xl font-bold gradient-text">50+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t.devTime}</span>
                  <span className="text-lg font-semibold text-white">14 {t.days}</span>
                </div>
              </div>
            </article>

            {/* Case 2 */}
            <article className="card-hover rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-purple-100 p-8 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">🐱</div>
                <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">Landing Page</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {t.eduPlatform}
              </h3>
              <p className="text-slate-300 mb-6">
                {t.eduPlatformDesc}
              </p>
              <div className="bg-slate-900 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t.timeSaved}</span>
                  <span className="text-2xl font-bold gradient-text">0.8{lang === 'ru' ? 'с' : lang === 'ua' ? 'с' : 's'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t.autoReplies}</span>
                  <span className="text-2xl font-bold gradient-text">1000+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t.happyClients}</span>
                  <span className="text-lg font-semibold text-white">15%</span>
                </div>
              </div>
            </article>

            {/* Case 3 */}
            <article className="card-hover rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-green-100 p-8 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">📱</div>
                <span className="text-xs font-semibold text-green-400 bg-green-100 px-3 py-1 rounded-full">{lang === 'ru' ? 'SMM Сервис' : lang === 'ua' ? 'SMM Сервіс' : 'SMM Service'}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {t.onlineStore}
              </h3>
              <p className="text-slate-300 mb-6">
                {t.onlineStoreDesc}
              </p>
              <div className="bg-slate-900 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t.processingSpeed}</span>
                  <span className="text-2xl font-bold gradient-text">+200%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t.errors}</span>
                  <span className="text-2xl font-bold gradient-text">30+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t.roi}</span>
                  <span className="text-lg font-semibold text-white">{lang === 'ru' ? '1 месяц' : lang === 'ua' ? '1 місяць' : '1 month'}</span>
                </div>
              </div>
            </article>

            {/* Case 4 */}
            <article className="card-hover rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-pink-100 p-8 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">💎</div>
                <span className="text-xs font-semibold text-pink-600 bg-pink-100 px-3 py-1 rounded-full">E-commerce</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {t.legalCompany}
              </h3>
              <p className="text-slate-300 mb-6">
                {t.legalCompanyDesc}
              </p>
              <div className="bg-slate-900 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t.requestsProcessed}</span>
                  <span className="text-2xl font-bold gradient-text">100+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t.leadQuality}</span>
                  <span className="text-2xl font-bold gradient-text">150€</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t.works247}</span>
                  <span className="text-lg font-semibold text-white">4.2%</span>
                </div>
              </div>
            </article>

            {/* Case 5 */}
            <article className="card-hover rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-cyan-100 p-8 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">💰</div>
                <span className="text-xs font-semibold text-cyan-600 bg-cyan-100 px-3 py-1 rounded-full">Fintech</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {t.karenFinance}
              </h3>
              <p className="text-slate-300 mb-6">
                {t.karenFinanceDesc}
              </p>
              <div className="bg-slate-900 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t.approvedRequests}</span>
                  <span className="text-2xl font-bold gradient-text">500+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t.averageTime}</span>
                  <span className="text-2xl font-bold gradient-text">24{lang === 'ru' ? 'ч' : lang === 'ua' ? 'г' : 'h'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t.clientRating}</span>
                  <span className="text-lg font-semibold text-white">5/5</span>
                </div>
              </div>
            </article>
          </div>

          <div className="mt-12 text-center">
            <a
                  href="#contact"
                  className="shine inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-4 text-base font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition-all shadow-xl hover:shadow-2xl"
                >
                  💬 {t.discussYourProject}
                </a>
          </div>
        </div>
      </section>

      {/* LIVE PROJECTS - Interactive WOW Section */}
      <section className="border-t border-slate-700 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-24">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-indigo-300 shadow-lg ring-1 ring-indigo-500/20 mb-6">
              <span className="text-2xl animate-bounce">🚀</span>
              <span>{filteredProjects.length} {lang === 'ru' ? 'проектов в продакшене' : lang === 'ua' ? 'проектів у продакшені' : 'projects in production'}</span>
            </div>
            <h2 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl mb-4">
              {t.liveProjectsTitle.split(' ')[0]} <span className="gradient-text">{t.liveProjectsTitle.split(' ')[1]}</span>
            </h2>
            <p className="text-lg text-slate-300">
              {t.liveProjectsDesc}
            </p>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <button
              onClick={() => setProjectFilter('all')}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                projectFilter === 'all'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg scale-105'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              ✨ {t.allProjects}
            </button>
            <button
              onClick={() => setProjectFilter('ecommerce')}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                projectFilter === 'ecommerce'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              🛍️ {t.ecommerce}
            </button>
            <button
              onClick={() => setProjectFilter('bots')}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                projectFilter === 'bots'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              🤖 {t.bots}
            </button>
            <button
              onClick={() => setProjectFilter('landing')}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                projectFilter === 'landing'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg scale-105'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              🌐 {t.landing}
            </button>
            <button
              onClick={() => setProjectFilter('portfolio')}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                projectFilter === 'portfolio'
                  ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-lg scale-105'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              💼 {t.portfolio}
            </button>
          </div>

          {/* 3D Carousel Controls */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <button
              onClick={() => setCurrentProjectIndex((currentProjectIndex - 1 + filteredProjects.length) % filteredProjects.length)}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white text-xl font-bold shadow-xl hover:scale-110 transition-all"
            >
              ←
            </button>
            <div className="text-slate-400 text-sm font-medium">
              {currentProjectIndex + 1} / {filteredProjects.length}
            </div>
            <button
              onClick={() => setCurrentProjectIndex((currentProjectIndex + 1) % filteredProjects.length)}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white text-xl font-bold shadow-xl hover:scale-110 transition-all"
            >
              →
            </button>
          </div>

          {/* 3D Carousel Container */}
          <div 
            className="relative h-[600px] sm:h-[700px] perspective-1000"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {filteredProjects.map((project, index) => {
                const offset = index - currentProjectIndex
                const absOffset = Math.abs(offset)
                const isActive = offset === 0
                
                return (
                <div 
                  key={project.id}
                  className="group absolute rounded-3xl bg-slate-900 border-2 border-slate-700 overflow-hidden shadow-2xl"
                  style={{
                    width: isActive ? '90%' : '70%',
                    maxWidth: isActive ? '500px' : '350px',
                    transform: `
                      translateX(${offset * 120}%) 
                      rotateY(${offset * 45}deg) 
                      scale(${isActive ? 1 : 0.85})
                      translateZ(${isActive ? '0px' : '-200px'})
                    `,
                    opacity: absOffset > 2 ? 0 : isActive ? 1 : 0.6,
                    zIndex: isActive ? 10 : 10 - absOffset,
                    pointerEvents: isActive ? 'auto' : 'none',
                    transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    willChange: 'transform, opacity'
                  }}
                >
              {/* Project Preview - Live Preview */}
              <div className="relative h-40 sm:h-48 lg:h-56 overflow-hidden bg-slate-800">
                {/* Live website iframe */}
                {project.category !== 'bots' ? (
                  <iframe 
                    src={project.url}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{
                      transform: 'scale(0.5)',
                      transformOrigin: 'top left',
                      width: '200%',
                      height: '200%'
                    }}
                    loading="lazy"
                    title={`${project.name} preview`}
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${project.gradient} flex items-center justify-center`}>
                    <div className="text-7xl opacity-40">{project.icon}</div>
                  </div>
                )}
                
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/10 transition-colors"></div>
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                
                {/* Hover Overlay - minimal and clean */}
                <div className="absolute inset-0 bg-slate-900/95 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center">
                  {/* Project name on hover */}
                  <div className="text-white text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 text-center px-4">
                    {project.name}
                  </div>
                  
                  {/* Action text */}
                  <div className="text-white text-sm sm:text-base lg:text-lg font-semibold mb-1 sm:mb-2">{t.viewLive}</div>
                  <div className="text-slate-300 text-xs sm:text-sm flex items-center gap-2">
                    <span>{lang === 'ru' ? 'Нажми чтобы открыть' : lang === 'ua' ? 'Натисни щоб відкрити' : 'Click to open'}</span>
                  </div>
                </div>
                
                {/* Category Badge */}
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
                  <div className="relative">
                    <div className="bg-slate-900/95 px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs font-bold text-white shadow-2xl border border-white/30 group-hover:border-white/50 transition-all">
                      {project.category === 'ecommerce' && (lang === 'ru' ? 'Магазин' : lang === 'ua' ? 'Магазин' : 'Store')}
                      {project.category === 'bots' && (lang === 'ru' ? 'Бот' : lang === 'ua' ? 'Бот' : 'Bot')}
                      {project.category === 'landing' && (lang === 'ru' ? 'Сайт' : lang === 'ua' ? 'Сайт' : 'Website')}
                      {project.category === 'portfolio' && (lang === 'ru' ? 'Портфолио' : lang === 'ua' ? 'Портфоліо' : 'Portfolio')}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Project Info */}
              <div className="p-3 sm:p-4 lg:p-6 space-y-2 sm:space-y-3 lg:space-y-4">
                <div>
                  <h3 className="text-sm sm:text-base lg:text-xl font-bold text-white mb-1 sm:mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-purple-400 transition-all">
                    {project.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed line-clamp-2 lg:line-clamp-none">{project.desc}</p>
                </div>
                
                {/* Tech Stack */}
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-slate-500 mb-2">{t.techStack}:</div>
                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((tech, i) => (
                      <span 
                        key={i} 
                        className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-md text-xs font-medium border border-indigo-500/30"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Action Button */}
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shine inline-flex items-center justify-center gap-1 sm:gap-2 w-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm font-bold text-white hover:shadow-2xl hover:scale-105 transition-all duration-300 hover:from-indigo-600 hover:to-purple-600"
                >
                  <span className="text-sm sm:text-base lg:text-lg">{project.category === 'bots' ? '📱' : '🔗'}</span>
                  <span className="hidden sm:inline">{project.category === 'bots' ? t.openBot : t.viewSite}</span>
                  <span className="sm:hidden">{lang === 'ru' ? 'Открыть' : lang === 'ua' ? 'Відкрити' : 'Open'}</span>
                </a>
              </div>
                </div>
              )
              })}
            </div>
          </div>

          {/* Indicator Dots */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {filteredProjects.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentProjectIndex(index)}
                className={`transition-all ${
                  index === currentProjectIndex
                    ? 'w-8 h-2 bg-gradient-to-r from-indigo-500 to-purple-500'
                    : 'w-2 h-2 bg-slate-600 hover:bg-slate-500'
                } rounded-full`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS / TESTIMONIALS */}
      <section id="reviews" className="border-t border-slate-700 bg-slate-800">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t.reviewsTitle.split(lang === 'ru' ? 'клиенты' : lang === 'ua' ? 'клієнти' : 'clients')[0]}<span className="gradient-text">{lang === 'ru' ? 'клиенты' : lang === 'ua' ? 'клієнти' : 'clients'}</span>
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              {t.reviewsDesc}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="card-hover rounded-3xl bg-slate-900 border-2 border-slate-700 p-8 shadow-lg">
              <div className="flex gap-1 mb-4">
                <span className="text-yellow-400">⭐</span>
                <span className="text-yellow-400">⭐</span>
                <span className="text-yellow-400">⭐</span>
                <span className="text-yellow-400">⭐</span>
                <span className="text-yellow-400">⭐</span>
              </div>
              <p className="text-slate-300 italic mb-6">
                «{t.review1}»
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold">
                  {t.review1Name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-white">{t.review1Name}</div>
                  <div className="text-sm text-slate-300">{t.review1Role}</div>
                </div>
              </div>
            </div>

            <div className="card-hover rounded-3xl bg-slate-900 border-2 border-slate-700 p-8 shadow-lg">
              <div className="flex gap-1 mb-4">
                <span className="text-yellow-400">⭐</span>
                <span className="text-yellow-400">⭐</span>
                <span className="text-yellow-400">⭐</span>
                <span className="text-yellow-400">⭐</span>
                <span className="text-yellow-400">⭐</span>
              </div>
              <p className="text-slate-300 italic mb-6">
                «{t.review2}»
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-400 flex items-center justify-center text-white font-bold">
                  {t.review2Name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-white">{t.review2Name}</div>
                  <div className="text-sm text-slate-300">{t.review2Role}</div>
                </div>
              </div>
            </div>

            <div className="card-hover rounded-3xl bg-slate-900 border-2 border-slate-700 p-8 shadow-lg">
              <div className="flex gap-1 mb-4">
                <span className="text-yellow-400">⭐</span>
                <span className="text-yellow-400">⭐</span>
                <span className="text-yellow-400">⭐</span>
                <span className="text-yellow-400">⭐</span>
                <span className="text-yellow-400">⭐</span>
              </div>
              <p className="text-slate-300 italic mb-6">
                «{t.review3}»
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-bold">
                  {t.review3Name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-white">{t.review3Name}</div>
                  <div className="text-sm text-slate-300">{t.review3Role}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST - Enhanced */}
      <section className="border-t border-slate-700 bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t.trustTitle.split(lang === 'ru' ? 'спокойно' : lang === 'ua' ? 'спокійно' : 'calm')[0]}<span className="gradient-text">{lang === 'ru' ? 'спокойно' : lang === 'ua' ? 'спокійно' : 'calm'}</span>
            </h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-900 p-8 text-center">
              <div className="text-5xl mb-4">💭</div>
              <h3 className="text-lg font-bold text-white mb-3">{t.howIThink}</h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {t.howIThinkDesc}
              </p>
            </div>
            
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-900 p-8 text-center">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-lg font-bold text-white mb-3">{t.howICommunicate}</h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {t.howICommunicateDesc}
              </p>
            </div>
            
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-900 p-8 text-center">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-lg font-bold text-white mb-3">{t.howIWork}</h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {t.howIWorkDesc}
              </p>
            </div>
            
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-900 p-8 text-center">
              <div className="text-5xl mb-4">✋</div>
              <h3 className="text-lg font-bold text-white mb-3">{t.honesty}</h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {t.honestyDesc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS - Enhanced */}
      <section className="border-t border-slate-700 bg-gradient-to-br from-slate-50 to-white">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="text-white">{t.processTitle.split(':')[0]}:</span> <span className="gradient-text">{t.processTitle.split(':')[1]}</span>
            </h2>
          </div>
          
          <div className="relative">
            {/* Connection line */}
            <div className="hidden lg:block absolute top-24 left-1/2 w-0.5 h-3/4 bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200 -translate-x-1/2"></div>
            
            <ol className="space-y-12">
              <li className="relative">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="lg:w-1/2 lg:text-right lg:pr-12">
                    <div className="card-hover rounded-3xl bg-slate-900 border-2 border-indigo-200 p-8 shadow-lg inline-block w-full max-w-md">
                      <div className="flex items-center gap-4 lg:justify-end mb-4">
                        <div className="text-4xl">📞</div>
                        <h3 className="text-xl font-bold text-white">{t.step1Title}</h3>
                      </div>
                      <p className="text-base leading-relaxed text-slate-300">
                        {t.step1Desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-xl z-10">
                    1
                  </div>
                  <div className="lg:w-1/2 lg:pl-12"></div>
                </div>
              </li>

              <li className="relative">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="lg:w-1/2"></div>
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold shadow-xl z-10">
                    2
                  </div>
                  <div className="lg:w-1/2 lg:pl-12">
                    <div className="card-hover rounded-3xl bg-slate-900 border-2 border-purple-200 p-8 shadow-lg inline-block w-full max-w-md">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-4xl">📋</div>
                        <h3 className="text-xl font-bold text-white">{t.step2Title}</h3>
                      </div>
                      <p className="text-base leading-relaxed text-slate-300">
                        {t.step2Desc}
                      </p>
                    </div>
                  </div>
                </div>
              </li>

              <li className="relative">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="lg:w-1/2 lg:text-right lg:pr-12">
                    <div className="card-hover rounded-3xl bg-slate-900 border-2 border-pink-200 p-8 shadow-lg inline-block w-full max-w-md">
                      <div className="flex items-center gap-4 lg:justify-end mb-4">
                        <div className="text-4xl">⚙️</div>
                        <h3 className="text-xl font-bold text-white">{t.step3Title}</h3>
                      </div>
                      <p className="text-base leading-relaxed text-slate-300">
                        {t.step3Desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center text-white text-2xl font-bold shadow-xl z-10">
                    3
                  </div>
                  <div className="lg:w-1/2 lg:pl-12"></div>
                </div>
              </li>

              <li className="relative">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="lg:w-1/2"></div>
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white text-2xl font-bold shadow-xl z-10">
                    4
                  </div>
                  <div className="lg:w-1/2 lg:pl-12">
                    <div className="card-hover rounded-3xl bg-slate-900 border-2 border-green-200 p-8 shadow-lg inline-block w-full max-w-md">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-4xl">🚀</div>
                        <h3 className="text-xl font-bold text-white">{t.step4Title}</h3>
                      </div>
                      <p className="text-base leading-relaxed text-slate-300">
                        {t.step4Desc}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-slate-700 bg-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-20 sm:py-24">
          <div className="text-center mb-16">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              <span className="gradient-text">{t.faqTitle}</span>
            </h2>
          </div>

          <div className="space-y-6">
            <details className="group rounded-3xl border-2 border-slate-700 bg-slate-900 p-6 shadow-lg hover:shadow-xl transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h3 className="text-lg font-bold text-white">{t.faq1Q}</h3>
                <span className="text-2xl text-slate-400 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-base text-slate-300 leading-relaxed">
                {t.faq1A}
              </p>
            </details>

            <details className="group rounded-3xl border-2 border-slate-700 bg-slate-900 p-6 shadow-lg hover:shadow-xl transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h3 className="text-lg font-bold text-white">{t.faq2Q}</h3>
                <span className="text-2xl text-slate-400 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-base text-slate-300 leading-relaxed">
                {t.faq2A}
              </p>
            </details>

            <details className="group rounded-3xl border-2 border-slate-700 bg-slate-900 p-6 shadow-lg hover:shadow-xl transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h3 className="text-lg font-bold text-white">{t.faq3Q}</h3>
                <span className="text-2xl text-slate-400 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-base text-slate-300 leading-relaxed">
                {t.faq3A}
              </p>
            </details>

            <details className="group rounded-3xl border-2 border-slate-700 bg-slate-900 p-6 shadow-lg hover:shadow-xl transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h3 className="text-lg font-bold text-white">{t.faq4Q}</h3>
                <span className="text-2xl text-slate-400 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-base text-slate-300 leading-relaxed">
                {t.faq4A}
              </p>
            </details>

            <details className="group rounded-3xl border-2 border-slate-700 bg-slate-900 p-6 shadow-lg hover:shadow-xl transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h3 className="text-lg font-bold text-white">{t.faq5Q}</h3>
                <span className="text-2xl text-slate-400 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-base text-slate-300 leading-relaxed">
                {t.faq5A}
              </p>
            </details>

            <details className="group rounded-3xl border-2 border-slate-700 bg-slate-900 p-6 shadow-lg hover:shadow-xl transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h3 className="text-lg font-bold text-white">{t.faq6Q}</h3>
                <span className="text-2xl text-slate-400 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-base text-slate-300 leading-relaxed">
                {t.faq6A}
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* FINAL CTA - Premium version */}
      <section id="contact" className="relative border-t border-slate-700 bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
        
        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white shadow-lg ring-1 ring-white/20 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
              </span>
              Свободен для новых проектов
            </div>
            
            <h2 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {t.readyTitle} 🚀
            </h2>
            <p className="mt-6 text-xl leading-relaxed text-slate-200">
              {t.readyDesc}
            </p>
            
            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="tel:+420723995896"
                className="shine inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-lg font-bold text-white hover:bg-slate-800 transition-all shadow-2xl hover:shadow-3xl hover:scale-105"
              >
                <span className="text-2xl">📞</span>
                +420 723 995 896
              </a>
              <a
                href="https://wa.me/380960494917"
                target="_blank"
                rel="noopener noreferrer"
                className="shine inline-flex items-center justify-center gap-2 rounded-full bg-green-500 px-8 py-4 text-lg font-bold text-white hover:bg-green-600 transition-all shadow-2xl hover:shadow-3xl hover:scale-105"
              >
                <span className="text-2xl">📱</span>
                {t.writeWhatsapp}
              </a>
              <a
                href="https://t.me/temoxa_1"
                target="_blank"
                rel="noopener noreferrer"
                className="shine inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-4 text-lg font-bold text-white hover:from-indigo-600 hover:to-purple-600 transition-all shadow-2xl hover:shadow-3xl hover:scale-105"
              >
                <span className="text-2xl">✈️</span>
                {t.writeTelegram}
              </a>
            </div>
            
            <div className="mt-12 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">24{lang === 'en' ? 'h' : 'ч'}</div>
                <div className="text-sm text-slate-300 mt-1">{t.respondFast}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{lang === 'en' ? 'Free' : lang === 'ua' ? 'Безкоштовно' : 'Бесплатно'}</div>
                <div className="text-sm text-slate-300 mt-1">{t.freeConsult}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">0€</div>
                <div className="text-sm text-slate-300 mt-1">{t.untilAgree}</div>
              </div>
            </div>
          </div>
          
          <div className="mt-20 pt-12 border-t border-white/10">
            {/* Footer with Logo */}
            <div className="flex flex-col items-center gap-8 mb-8">
              <a href="#top" className="flex items-center gap-3 group">
                <img 
                  src="/logo.png" 
                  alt="TemoWeb" 
                  className="h-10 w-auto object-contain opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
                />
                <span className="text-xl font-bold tracking-tight gradient-text">
                  TemoWeb
                </span>
              </a>
              <p className="text-center text-slate-400 max-w-md">
                {lang === 'ru' ? 'Превращаю бизнес-задачи в работающие решения' : lang === 'ua' ? 'Перетворюю бізнес-задачі у працюючі рішення' : 'Turn business tasks into working solutions'}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <p className="text-sm text-slate-400">© {new Date().getFullYear()} TemoWeb — {t.rights}</p>
              <div className="flex items-center gap-6">
                <a href="#services" className="text-sm text-slate-400 hover:text-white transition-colors">{t.services}</a>
                <a href="#cases" className="text-sm text-slate-400 hover:text-white transition-colors">{t.cases}</a>
                <a href="#faq" className="text-sm text-slate-400 hover:text-white transition-colors">{t.faq}</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <a
          href="#top"
          className="fixed bottom-6 right-6 z-50 shine inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-2xl hover:shadow-3xl hover:scale-110 transition-all"
          onClick={(e) => {
            e.preventDefault()
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          <span className="text-2xl">↑</span>
        </a>
      )}

      {/* Quick Navigation - Mobile */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 md:hidden">
        <a href="#services" className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800/90 backdrop-blur-sm text-white shadow-xl hover:scale-110 transition-all border border-slate-700">
          <span className="text-lg">📋</span>
        </a>
        <a href="#cases" className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800/90 backdrop-blur-sm text-white shadow-xl hover:scale-110 transition-all border border-slate-700">
          <span className="text-lg">💼</span>
        </a>
        <a href="#contact" className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-xl hover:scale-110 transition-all">
          <span className="text-lg">✉️</span>
        </a>
      </div>
    </main>
  )
}
