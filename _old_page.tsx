'use client'
import { useEffect, useState } from 'react'
import { translations, type Lang } from './translations'
import Calculator from './components/Calculator'

// Lead Form Component
function LeadForm({ lang }: { lang: Lang }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!agreed) {
      setError(lang === 'ru' ? '╨Э╨╡╨╛╨▒╤Е╨╛╨┤╨╕╨╝╨╛ ╤Б╨╛╨│╨╗╨░╤Б╨╕╨╡ ╨╜╨░ ╨╛╨▒╤А╨░╨▒╨╛╤В╨║╤Г ╨┤╨░╨╜╨╜╤Л╤Е' : lang === 'ua' ? '╨Э╨╡╨╛╨▒╤Е╤Ц╨┤╨╜╨░ ╨╖╨│╨╛╨┤╨░ ╨╜╨░ ╨╛╨▒╤А╨╛╨▒╨║╤Г ╨┤╨░╨╜╨╕╤Е' : 'Data processing consent required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone })
      })

      if (response.ok) {
        const data = await response.json().catch(() => null)
        setSuccess(true)
        setName('')
        setPhone('')
        setAgreed(false)
        
        // Google Ads Conversion Event
        if (typeof window !== 'undefined' && (window as any).gtag) {
          const txId = data?.lead?.id ? String(data.lead.id) : null
          const payload: Record<string, string> = {
            // IMPORTANT: this must match the Conversion label from Google Ads UI
            send_to: 'AW-17819376047/bCp9CKrjx9QbEk-z-LBC',
          }
          if (txId) payload.transaction_id = txId
          ;(window as any).gtag('event', 'conversion', payload)
        }
        
        setTimeout(() => setSuccess(false), 5000)
      } else {
        setError(lang === 'ru' ? '╨Ю╤И╨╕╨▒╨║╨░ ╨╛╤В╨┐╤А╨░╨▓╨║╨╕' : lang === 'ua' ? '╨Я╨╛╨╝╨╕╨╗╨║╨░ ╨▓╤Ц╨┤╨┐╤А╨░╨▓╨║╨╕' : 'Submit error')
      }
    } catch (err) {
      setError(lang === 'ru' ? '╨Ю╤И╨╕╨▒╨║╨░ ╨╛╤В╨┐╤А╨░╨▓╨║╨╕' : lang === 'ua' ? '╨Я╨╛╨╝╨╕╨╗╨║╨░ ╨▓╤Ц╨┤╨┐╤А╨░╨▓╨║╨╕' : 'Submit error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-16 max-w-md mx-auto">
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-2xl">
        <h3 className="text-2xl font-bold text-white text-center mb-2">
          {lang === 'ru' ? '╨Ю╤Б╤В╨░╨▓╨╕╤В╤М ╨╖╨░╤П╨▓╨║╤Г' : lang === 'ua' ? '╨Ч╨░╨╗╨╕╤И╨╕╤В╨╕ ╨╖╨░╤П╨▓╨║╤Г' : 'Leave a request'}
        </h3>
        <p className="text-slate-300 text-center mb-6 text-sm">
          {lang === 'ru' 
            ? 'тЬЕ ╨С╨╡╤Б╨┐╨╗╨░╤В╨╜╨░╤П ╨║╨╛╨╜╤Б╤Г╨╗╤М╤В╨░╤Ж╨╕╤П тАв тЪб ╨Ю╤В╨▓╨╡╤В ╨╖╨░ 24 ╤З╨░╤Б╨░'
            : lang === 'ua'
            ? 'тЬЕ ╨С╨╡╨╖╨║╨╛╤И╤В╨╛╨▓╨╜╨░ ╨║╨╛╨╜╤Б╤Г╨╗╤М╤В╨░╤Ж╤Ц╤П тАв тЪб ╨Т╤Ц╨┤╨┐╨╛╨▓╤Ц╨┤╤М ╨╖╨░ 24 ╨│╨╛╨┤╨╕╨╜╨╕'
            : 'тЬЕ Free consultation тАв тЪб Reply in 24 hours'}
        </p>

        {success ? (
          <div className="bg-green-500/10 border border-green-500/50 rounded-lg px-6 py-4 text-center">
            <div className="text-4xl mb-2">тЬЕ</div>
            <p className="text-green-400 font-semibold">
              {lang === 'ru' ? '╨Ч╨░╤П╨▓╨║╨░ ╨╛╤В╨┐╤А╨░╨▓╨╗╨╡╨╜╨░!' : lang === 'ua' ? '╨Ч╨░╤П╨▓╨║╤Г ╨▓╤Ц╨┤╨┐╤А╨░╨▓╨╗╨╡╨╜╨╛!' : 'Request sent!'}
            </p>
            <p className="text-green-300 text-sm mt-1">
              {lang === 'ru' ? '╨б╨▓╤П╨╢╤Г╤Б╤М ╤Б ╨▓╨░╨╝╨╕ ╨▓ ╤В╨╡╤З╨╡╨╜╨╕╨╡ 24 ╤З╨░╤Б╨╛╨▓' : lang === 'ua' ? '╨Ч╨▓\'╤П╨╢╤Г╤Б╤П ╨╖ ╨▓╨░╨╝╨╕ ╨┐╤А╨╛╤В╤П╨│╨╛╨╝ 24 ╨│╨╛╨┤╨╕╨╜' : 'I\'ll contact you within 24 hours'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === 'ru' ? '╨Т╨░╤И╨╡ ╨╕╨╝╤П' : lang === 'ua' ? '╨Т╨░╤И╨╡ ╤Ц╨╝\'╤П' : 'Your name'}
                required
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={lang === 'ru' ? '╨в╨╡╨╗╨╡╤Д╨╛╨╜' : lang === 'ua' ? '╨в╨╡╨╗╨╡╤Д╨╛╨╜' : 'Phone'}
                required
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="privacy-consent"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="privacy-consent" className="text-xs text-slate-400 cursor-pointer">
                {lang === 'ru' ? (
                  <>╨п ╤Б╨╛╨│╨╗╨░╤Б╨╡╨╜ ╤Б <a href="/privacy" target="_blank" className="text-indigo-400 hover:text-indigo-300 underline">╨┐╨╛╨╗╨╕╤В╨╕╨║╨╛╨╣ ╨║╨╛╨╜╤Д╨╕╨┤╨╡╨╜╤Ж╨╕╨░╨╗╤М╨╜╨╛╤Б╤В╨╕</a> ╨╕ ╨┤╨░╤О ╤Б╨╛╨│╨╗╨░╤Б╨╕╨╡ ╨╜╨░ ╨╛╨▒╤А╨░╨▒╨╛╤В╨║╤Г ╨┐╨╡╤А╤Б╨╛╨╜╨░╨╗╤М╨╜╤Л╤Е ╨┤╨░╨╜╨╜╤Л╤Е</>
                ) : lang === 'ua' ? (
                  <>╨п ╨╖╨│╨╛╨┤╨╡╨╜ ╨╖ <a href="/privacy" target="_blank" className="text-indigo-400 hover:text-indigo-300 underline">╨┐╨╛╨╗╤Ц╤В╨╕╨║╨╛╤О ╨║╨╛╨╜╤Д╤Ц╨┤╨╡╨╜╤Ж╤Ц╨╣╨╜╨╛╤Б╤В╤Ц</a> ╤В╨░ ╨┤╨░╤О ╨╖╨│╨╛╨┤╤Г ╨╜╨░ ╨╛╨▒╤А╨╛╨▒╨║╤Г ╨┐╨╡╤А╤Б╨╛╨╜╨░╨╗╤М╨╜╨╕╤Е ╨┤╨░╨╜╨╕╤Е</>
                ) : (
                  <>I agree to the <a href="/privacy" target="_blank" className="text-indigo-400 hover:text-indigo-300 underline">privacy policy</a> and consent to personal data processing</>
                )}
              </label>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg px-4 py-2 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !agreed}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:scale-105"
            >
              {loading 
                ? (lang === 'ru' ? '╨Ю╤В╨┐╤А╨░╨▓╨║╨░...' : lang === 'ua' ? '╨Т╤Ц╨┤╨┐╤А╨░╨▓╨║╨░...' : 'Sending...')
                : (lang === 'ru' ? '╨Ю╤В╨┐╤А╨░╨▓╨╕╤В╤М ╨╖╨░╤П╨▓╨║╤Г' : lang === 'ua' ? '╨Т╤Ц╨┤╨┐╤А╨░╨▓╨╕╤В╨╕ ╨╖╨░╤П╨▓╨║╤Г' : 'Send request')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

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
  
  // Swipe handlers with debounce
  const [isAnimating, setIsAnimating] = useState(false)
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return
    setTouchStart(e.targetTouches[0].clientX)
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isAnimating) return
    setTouchEnd(e.targetTouches[0].clientX)
  }
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || isAnimating) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50
    
    if (isLeftSwipe || isRightSwipe) {
      setIsAnimating(true)
      
      if (isLeftSwipe) {
        setCurrentProjectIndex((prev) => (prev + 1) % filteredProjects.length)
      }
      if (isRightSwipe) {
        setCurrentProjectIndex((prev) => (prev - 1 + filteredProjects.length) % filteredProjects.length)
      }
      
      setTimeout(() => setIsAnimating(false), 600)
    }
    
    setTouchStart(0)
    setTouchEnd(0)
  }
  
  const projects = [
    {
      id: 1,
      name: 'Sphynx Dubai',
      desc: lang === 'ru' ? '╨Я╤А╨╡╨╝╨╕╨░╨╗╤М╨╜╤Л╨╣ ╤Б╨░╨╣╤В ╨┐╨╛╨┤ ╨╝╨╡╨╢╨┤╤Г╨╜╨░╤А╨╛╨┤╨╜╤Г╤О ╨░╤Г╨┤╨╕╤В╨╛╤А╨╕╤О ╤Б ╨░╨║╤Ж╨╡╨╜╤В╨╛╨╝ ╨╜╨░ ╨┤╨╛╨▓╨╡╤А╨╕╨╡, ╨▒╤А╨╡╨╜╨┤ ╨╕ ╨║╨╛╨╜╨▓╨╡╤А╤Б╨╕╤О ╨╖╨░╤П╨▓╨╛╨║ ╨┤╨╗╤П ╨║╨╗╨╕╨╡╨╜╤В╨╛╨▓ ╨╕╨╖ ╨Ф╤Г╨▒╨░╤П ╨╕ ╨Х╨▓╤А╨╛╨┐╤Л' : lang === 'ua' ? '╨Я╤А╨╡╨╝╤Ц╨░╨╗╤М╨╜╨╕╨╣ ╤Б╨░╨╣╤В ╨┐╤Ц╨┤ ╨╝╤Ц╨╢╨╜╨░╤А╨╛╨┤╨╜╤Г ╨░╤Г╨┤╨╕╤В╨╛╤А╤Ц╤О ╨╖ ╨░╨║╤Ж╨╡╨╜╤В╨╛╨╝ ╨╜╨░ ╨┤╨╛╨▓╤Ц╤А╤Г, ╨▒╤А╨╡╨╜╨┤ ╤В╨░ ╨║╨╛╨╜╨▓╨╡╤А╤Б╤Ц╤О ╨╖╨░╤П╨▓╨╛╨║ ╨┤╨╗╤П ╨║╨╗╤Ц╤Ф╨╜╤В╤Ц╨▓ ╨╖ ╨Ф╤Г╨▒╨░╤П ╤В╨░ ╨Д╨▓╤А╨╛╨┐╨╕' : 'Premium website for international audience with focus on trust, brand and lead conversion for clients from Dubai and Europe',
      url: 'https://sphynxdubai.ae/',
      category: 'landing',
      gradient: 'from-amber-900 via-orange-900 to-yellow-900',
      icon: 'ЁЯР▒',
      tech: ['Next.js', 'React', 'Tailwind'],
      color: 'amber',
      screenshot: 'sphynxdubai.jpg'
    },
    {
      id: 2,
      name: 'Boss Detaling Bot',
      desc: lang === 'ru' ? 'Telegram-╨▒╨╛╤В ╨┤╨╗╤П ╨░╨▓╤В╨╛╨╝╨░╤В╨╕╨╖╨░╤Ж╨╕╨╕ ╨╖╨░╤П╨▓╨╛╨║ ╨╕ ╨╛╨▒╤Й╨╡╨╜╨╕╤П ╤Б ╨║╨╗╨╕╨╡╨╜╤В╨░╨╝╨╕, ╨║╨╛╤В╨╛╤А╤Л╨╣ ╤Н╨║╨╛╨╜╨╛╨╝╨╕╤В ╨▓╤А╨╡╨╝╤П ╨▒╨╕╨╖╨╜╨╡╤Б╤Г ╨╕ ╤Г╨▓╨╡╨╗╨╕╤З╨╕╨▓╨░╨╡╤В ╨║╨╛╨╗╨╕╤З╨╡╤Б╤В╨▓╨╛ ╨╖╨░╨║╨░╨╖╨╛╨▓' : lang === 'ua' ? 'Telegram-╨▒╨╛╤В ╨┤╨╗╤П ╨░╨▓╤В╨╛╨╝╨░╤В╨╕╨╖╨░╤Ж╤Ц╤Ч ╨╖╨░╤П╨▓╨╛╨║ ╤В╨░ ╤Б╨┐╤Ц╨╗╨║╤Г╨▓╨░╨╜╨╜╤П ╨╖ ╨║╨╗╤Ц╤Ф╨╜╤В╨░╨╝╨╕, ╤П╨║╨╕╨╣ ╨╡╨║╨╛╨╜╨╛╨╝╨╕╤В╤М ╤З╨░╤Б ╨▒╤Ц╨╖╨╜╨╡╤Б╤Г ╤В╨░ ╨╖╨▒╤Ц╨╗╤М╤И╤Г╤Ф ╨║╤Ц╨╗╤М╨║╤Ц╤Б╤В╤М ╨╖╨░╨╝╨╛╨▓╨╗╨╡╨╜╤М' : 'Telegram bot for request automation and client communication that saves business time and increases orders',
      url: 'https://t.me/BOSS_DETALING_BOT',
      category: 'bots',
      gradient: 'from-blue-900 via-cyan-900 to-teal-900',
      icon: 'ЁЯдЦ',
      tech: ['Telegram API', 'Node.js', 'MongoDB'],
      color: 'blue',
      screenshot: 'bossdetaling-bot.jpg'
    },
    {
      id: 3,
      name: 'Boss Detaling',
      desc: lang === 'ru' ? '╨Я╤А╨╛╨┤╨░╤О╤Й╨╕╨╣ ╤Б╨░╨╣╤В ╨┤╨╗╤П ╤Б╨╡╤А╨▓╨╕╤Б╨╜╨╛╨│╨╛ ╨▒╨╕╨╖╨╜╨╡╤Б╨░ ╨▓ ╨Х╨▓╤А╨╛╨┐╨╡ ╤Б ╤Г╨┤╨╛╨▒╨╜╨╛╨╣ ╤Б╤В╤А╤Г╨║╤В╤Г╤А╨╛╨╣ ╤Г╤Б╨╗╤Г╨│, ╨┐╨╛╨╜╤П╤В╨╜╨╛╨╣ ╨╜╨░╨▓╨╕╨│╨░╤Ж╨╕╨╡╨╣ ╨╕ ╤Д╨╛╨║╤Г╤Б╨╛╨╝ ╨╜╨░ ╨╖╨░╨┐╨╕╤Б╨╕ ╨║╨╗╨╕╨╡╨╜╤В╨╛╨▓' : lang === 'ua' ? '╨Я╤А╨╛╨┤╨░╤О╤З╨╕╨╣ ╤Б╨░╨╣╤В ╨┤╨╗╤П ╤Б╨╡╤А╨▓╤Ц╤Б╨╜╨╛╨│╨╛ ╨▒╤Ц╨╖╨╜╨╡╤Б╤Г ╨▓ ╨Д╨▓╤А╨╛╨┐╤Ц ╨╖ ╨╖╤А╤Г╤З╨╜╨╛╤О ╤Б╤В╤А╤Г╨║╤В╤Г╤А╨╛╤О ╨┐╨╛╤Б╨╗╤Г╨│, ╨╖╤А╨╛╨╖╤Г╨╝╤Ц╨╗╨╛╤О ╨╜╨░╨▓╤Ц╨│╨░╤Ж╤Ц╤Ф╤О ╤В╨░ ╤Д╨╛╨║╤Г╤Б╨╛╨╝ ╨╜╨░ ╨╖╨░╨┐╨╕╤Б╤Ц ╨║╨╗╤Ц╤Ф╨╜╤В╤Ц╨▓' : 'Selling website for service business in Europe with convenient service structure, clear navigation and focus on client bookings',
      url: 'https://bossdetaling.eu/',
      category: 'ecommerce',
      gradient: 'from-slate-900 via-gray-900 to-zinc-900',
      icon: 'ЁЯЪЧ',
      tech: ['Next.js', 'Tailwind', 'CSS'],
      color: 'slate',
      screenshot: 'bossdetaling.jpg'
    },
    {
      id: 4,
      name: 'TikTok Boost Lana',
      desc: lang === 'ru' ? '╨Ы╨╡╨╜╨┤╨╕╨╜╨│ ╨┐╨╛╨┤ ╨╛╨╜╨╗╨░╨╣╨╜-╨║╤Г╤А╤Б ╤Б ╤З╤С╤В╨║╨╛╨╣ ╨┐╨╛╨┤╨░╤З╨╡╨╣ ╤Ж╨╡╨╜╨╜╨╛╤Б╤В╨╕, ╨╗╨╛╨│╨╕╨║╨╛╨╣ ╨┐╤А╨╛╨┤╨░╨╢ ╨╕ ╤Д╨╛╨║╤Г╤Б╨╛╨╝ ╨╜╨░ ╨║╨╛╨╜╨▓╨╡╤А╤Б╨╕╤О ╨▒╨╡╨╖ ╨┐╨╡╤А╨╡╨│╤А╤Г╨╢╨╡╨╜╨╜╨╛╨│╨╛ ╨┤╨╕╨╖╨░╨╣╨╜╨░' : lang === 'ua' ? '╨Ы╨╡╨╜╨┤╤Ц╨╜╨│ ╨┐╤Ц╨┤ ╨╛╨╜╨╗╨░╨╣╨╜-╨║╤Г╤А╤Б ╨╖ ╤З╤Ц╤В╨║╨╛╤О ╨┐╨╛╨┤╨░╤З╨╡╤О ╤Ж╤Ц╨╜╨╜╨╛╤Б╤В╤Ц, ╨╗╨╛╨│╤Ц╨║╨╛╤О ╨┐╤А╨╛╨┤╨░╨╢╤Ц╨▓ ╤В╨░ ╤Д╨╛╨║╤Г╤Б╨╛╨╝ ╨╜╨░ ╨║╨╛╨╜╨▓╨╡╤А╤Б╤Ц╤О ╨▒╨╡╨╖ ╨┐╨╡╤А╨╡╨▓╨░╨╜╤В╨░╨╢╨╡╨╜╨╛╨│╨╛ ╨┤╨╕╨╖╨░╨╣╨╜╤Г' : 'Landing page for online course with clear value proposition, sales logic and conversion focus without cluttered design',
      url: 'https://tiktokboostlana.netlify.app/',
      category: 'landing',
      gradient: 'from-pink-900 via-rose-900 to-red-900',
      icon: 'ЁЯУ▒',
      tech: ['React', 'Tailwind', 'CSS'],
      color: 'pink',
      screenshot: 'tiktokboost.jpg'
    },
    {
      id: 5,
      name: 'Mila Style',
      desc: lang === 'ru' ? '╨б╤В╨╕╨╗╤М╨╜╤Л╨╣ ╤Б╨░╨╣╤В ╨┤╨╗╤П ╨╛╨╜╨╗╨░╨╣╨╜-╨╝╨░╨│╨░╨╖╨╕╨╜╨░ ╨╛╨┤╨╡╨╢╨┤╤Л, ╨║╨╛╤В╨╛╤А╤Л╨╣ ╨┐╨╛╨┤╤З╤С╤А╨║╨╕╨▓╨░╨╡╤В ╨▒╤А╨╡╨╜╨┤ ╨╕ ╤Г╨┐╤А╨╛╤Й╨░╨╡╤В ╨┐╤Г╤В╤М ╨║╨╗╨╕╨╡╨╜╤В╨░ ╨╛╤В ╨┐╤А╨╛╤Б╨╝╨╛╤В╤А╨░ ╨┤╨╛ ╨┐╨╛╨║╤Г╨┐╨║╨╕' : lang === 'ua' ? '╨б╤В╨╕╨╗╤М╨╜╨╕╨╣ ╤Б╨░╨╣╤В ╨┤╨╗╤П ╨╛╨╜╨╗╨░╨╣╨╜-╨╝╨░╨│╨░╨╖╨╕╨╜╤Г ╨╛╨┤╤П╨│╤Г, ╤П╨║╨╕╨╣ ╨┐╤Ц╨┤╨║╤А╨╡╤Б╨╗╤О╤Ф ╨▒╤А╨╡╨╜╨┤ ╤В╨░ ╤Б╨┐╤А╨╛╤Й╤Г╤Ф ╤И╨╗╤П╤Е ╨║╨╗╤Ц╤Ф╨╜╤В╨░ ╨▓╤Ц╨┤ ╨┐╨╡╤А╨╡╨│╨╗╤П╨┤╤Г ╨┤╨╛ ╨┐╨╛╨║╤Г╨┐╨║╨╕' : 'Stylish website for online clothing store that emphasizes brand and simplifies customer journey from browsing to purchase',
      url: 'https://milastyle.netlify.app/',
      category: 'portfolio',
      gradient: 'from-purple-900 via-fuchsia-900 to-pink-900',
      icon: 'ЁЯСЧ',
      tech: ['React', 'Tailwind', 'CSS'],
      color: 'purple',
      screenshot: 'milastyle.jpg'
    },
    {
      id: 6,
      name: 'Dmitry Rieltor UA',
      desc: lang === 'ru' ? '╨Я╨╡╤А╤Б╨╛╨╜╨░╨╗╤М╨╜╤Л╨╣ ╤Б╨░╨╣╤В-╨▓╨╕╨╖╨╕╤В╨║╨░ ╨┤╨╗╤П ╤А╨╕╨╡╨╗╤В╨╛╤А╨░ ╤Б ╤Г╨┐╨╛╤А╨╛╨╝ ╨╜╨░ ╨┤╨╛╨▓╨╡╤А╨╕╨╡, ╤Н╨║╤Б╨┐╨╡╤А╤В╨╜╨╛╤Б╤В╤М ╨╕ ╨▒╤Л╤Б╤В╤А╤Л╨╣ ╨║╨╛╨╜╤В╨░╨║╤В ╤Б ╨║╨╗╨╕╨╡╨╜╤В╨╛╨╝' : lang === 'ua' ? '╨Я╨╡╤А╤Б╨╛╨╜╨░╨╗╤М╨╜╨╕╨╣ ╤Б╨░╨╣╤В-╨▓╤Ц╨╖╨╕╤В╨║╨░ ╨┤╨╗╤П ╤А╤Ц╤Ф╨╗╤В╨╛╤А╨░ ╨╖ ╨░╨║╤Ж╨╡╨╜╤В╨╛╨╝ ╨╜╨░ ╨┤╨╛╨▓╤Ц╤А╤Г, ╨╡╨║╤Б╨┐╨╡╤А╤В╨╜╤Ц╤Б╤В╤М ╤В╨░ ╤И╨▓╨╕╨┤╨║╨╕╨╣ ╨║╨╛╨╜╤В╨░╨║╤В ╨╖ ╨║╨╗╤Ц╤Ф╨╜╤В╨╛╨╝' : 'Personal business card website for realtor with focus on trust, expertise and quick client contact',
      url: 'https://dmitryrieltorua.netlify.app/',
      category: 'landing',
      gradient: 'from-emerald-900 via-teal-900 to-cyan-900',
      icon: 'ЁЯПа',
      tech: ['React', 'Tailwind', 'CSS'],
      color: 'emerald',
      screenshot: 'dmitryrieltor.jpg'
    },
    {
      id: 7,
      name: 'Eco Remont',
      desc: lang === 'ru' ? '╨Я╤А╨╛╤Б╤В╨╛╨╣ ╨╕ ╨┐╨╛╨╜╤П╤В╨╜╤Л╨╣ ╤Б╨░╨╣╤В ╨┤╨╗╤П ╤А╨╡╨╝╨╛╨╜╤В╨╜╤Л╤Е ╤Г╤Б╨╗╤Г╨│, ╨║╨╛╤В╨╛╤А╤Л╨╣ ╨╛╨▒╤К╤П╤Б╨╜╤П╨╡╤В ╤Ж╨╡╨╜╨╜╨╛╤Б╤В╤М ╤Б╨╡╤А╨▓╨╕╤Б╨░ ╨╕ ╨┐╤А╨╕╨▓╨╛╨┤╨╕╤В ╨╖╨░╤П╨▓╨║╨╕ ╨▒╨╡╨╖ ╨╗╨╕╤И╨╜╨╡╨│╨╛ ╨╝╨░╤А╨║╨╡╤В╨╕╨╜╨│╨╛╨▓╨╛╨│╨╛ ╤И╤Г╨╝╨░' : lang === 'ua' ? '╨Я╤А╨╛╤Б╤В╨╕╨╣ ╤В╨░ ╨╖╤А╨╛╨╖╤Г╨╝╤Ц╨╗╨╕╨╣ ╤Б╨░╨╣╤В ╨┤╨╗╤П ╤А╨╡╨╝╨╛╨╜╤В╨╜╨╕╤Е ╨┐╨╛╤Б╨╗╤Г╨│, ╤П╨║╨╕╨╣ ╨┐╨╛╤П╤Б╨╜╤О╤Ф ╤Ж╤Ц╨╜╨╜╤Ц╤Б╤В╤М ╤Б╨╡╤А╨▓╤Ц╤Б╤Г ╤В╨░ ╨┐╤А╨╕╨▓╨╛╨┤╨╕╤В╤М ╨╖╨░╤П╨▓╨║╨╕ ╨▒╨╡╨╖ ╨╖╨░╨╣╨▓╨╛╨│╨╛ ╨╝╨░╤А╨║╨╡╤В╨╕╨╜╨│╨╛╨▓╨╛╨│╨╛ ╤И╤Г╨╝╤Г' : 'Simple and clear website for renovation services that explains service value and generates leads without excessive marketing noise',
      url: 'https://ecoremont.netlify.app/',
      category: 'landing',
      gradient: 'from-green-900 via-lime-900 to-emerald-900',
      icon: 'ЁЯМ▒',
      tech: ['React', 'Tailwind', 'CSS'],
      color: 'green',
      screenshot: 'ecoremont.jpg'
    },
    {
      id: 8,
      name: 'Anika Brand Lux',
      desc: lang === 'ru' ? '╨Ш╨╝╨╕╨┤╨╢╨╡╨▓╤Л╨╣ ╤Б╨░╨╣╤В ╨┐╨╛╨┤ fashion-╨▒╤А╨╡╨╜╨┤ ╤Б ╨┐╤А╨╡╨╝╨╕╨░╨╗╤М╨╜╨╛╨╣ ╨┐╨╛╨┤╨░╤З╨╡╨╣, ╨░╨║╨║╤Г╤А╨░╤В╨╜╨╛╨╣ ╤В╨╕╨┐╨╛╨│╤А╨░╤Д╨╕╨║╨╛╨╣ ╨╕ ╨░╨║╤Ж╨╡╨╜╤В╨╛╨╝ ╨╜╨░ ╨▓╨╕╨╖╤Г╨░╨╗' : lang === 'ua' ? '╨Ж╨╝╤Ц╨┤╨╢╨╡╨▓╨╕╨╣ ╤Б╨░╨╣╤В ╨┐╤Ц╨┤ fashion-╨▒╤А╨╡╨╜╨┤ ╨╖ ╨┐╤А╨╡╨╝╤Ц╨░╨╗╤М╨╜╨╛╤О ╨┐╨╛╨┤╨░╤З╨╡╤О, ╨░╨║╤Г╤А╨░╤В╨╜╨╛╤О ╤В╨╕╨┐╨╛╨│╤А╨░╤Д╤Ц╨║╨╛╤О ╤В╨░ ╨░╨║╤Ж╨╡╨╜╤В╨╛╨╝ ╨╜╨░ ╨▓╤Ц╨╖╤Г╨░╨╗' : 'Image website for fashion brand with premium presentation, neat typography and focus on visuals',
      url: 'https://anikabrandlux.netlify.app/',
      category: 'ecommerce',
      gradient: 'from-yellow-900 via-amber-900 to-orange-900',
      icon: 'ЁЯТО',
      tech: ['React', 'Tailwind', 'CSS'],
      color: 'yellow',
      screenshot: 'anikabrand.jpg'
    },
    {
      id: 9,
      name: 'Lakerta',
      desc: lang === 'ru' ? '╨б╨░╨╣╤В ╨┤╨╗╤П ╨▒╤А╨╡╨╜╨┤╨░ ╨╛╨┤╨╡╨╢╨┤╤Л, ╨╛╤А╨╕╨╡╨╜╤В╨╕╤А╨╛╨▓╨░╨╜╨╜╤Л╨╣ ╨╜╨░ ╨╢╨╡╨╜╤Б╨║╤Г╤О ╨░╤Г╨┤╨╕╤В╨╛╤А╨╕╤О, ╤Б ╤Д╨╛╨║╤Г╤Б╨╛╨╝ ╨╜╨░ ╤Н╤Б╤В╨╡╤В╨╕╨║╤Г, ╨┐╤А╨╛╤Б╤В╨╛╤В╤Г ╨╕ ╤Г╨╖╨╜╨░╨▓╨░╨╡╨╝╨╛╤Б╤В╤М ╨▒╤А╨╡╨╜╨┤╨░' : lang === 'ua' ? '╨б╨░╨╣╤В ╨┤╨╗╤П ╨▒╤А╨╡╨╜╨┤╤Г ╨╛╨┤╤П╨│╤Г, ╨╛╤А╤Ц╤Ф╨╜╤В╨╛╨▓╨░╨╜╨╕╨╣ ╨╜╨░ ╨╢╤Ц╨╜╨╛╤З╤Г ╨░╤Г╨┤╨╕╤В╨╛╤А╤Ц╤О, ╨╖ ╤Д╨╛╨║╤Г╤Б╨╛╨╝ ╨╜╨░ ╨╡╤Б╤В╨╡╤В╨╕╨║╤Г, ╨┐╤А╨╛╤Б╤В╨╛╤В╤Г ╤В╨░ ╨▓╨┐╤Ц╨╖╨╜╨░╨▓╨░╨╜╤Ц╤Б╤В╤М ╨▒╤А╨╡╨╜╨┤╤Г' : 'Website for clothing brand targeted at female audience with focus on aesthetics, simplicity and brand recognition',
      url: 'https://lakerta.netlify.app/',
      category: 'landing',
      gradient: 'from-indigo-900 via-blue-900 to-cyan-900',
      icon: 'тЪб',
      tech: ['React', 'Tailwind', 'CSS'],
      color: 'indigo',
      screenshot: 'lakerta.jpg'
    },
    {
      id: 10,
      name: 'TemoWeb',
      desc: lang === 'ru' ? '╨б╨░╨╣╤В ╤А╨░╨╖╤А╨░╨▒╨╛╤В╤З╨╕╨║╨░, ╨║╨╛╤В╨╛╤А╤Л╨╣ ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╨╡╤В ╨┐╨╛╨┤╤Е╨╛╨┤: ╨▒╤Л╤Б╤В╤А╤Л╨╡ ╤Б╨░╨╣╤В╤Л, ╤З╨╕╤Б╤В╤Л╨╣ ╨║╨╛╨┤, ╨┐╤А╨╛╨┤╤Г╨╝╨░╨╜╨╜╨░╤П ╨╗╨╛╨│╨╕╨║╨░ ╨╕ ╤Б╨╛╨▓╤А╨╡╨╝╨╡╨╜╨╜╤Л╨╣ ╨┤╨╕╨╖╨░╨╣╨╜' : lang === 'ua' ? '╨б╨░╨╣╤В ╤А╨╛╨╖╤А╨╛╨▒╨╜╨╕╨║╨░, ╤П╨║╨╕╨╣ ╨┐╨╛╨║╨░╨╖╤Г╤Ф ╨┐╤Ц╨┤╤Е╤Ц╨┤: ╤И╨▓╨╕╨┤╨║╤Ц ╤Б╨░╨╣╤В╨╕, ╤З╨╕╤Б╤В╨╕╨╣ ╨║╨╛╨┤, ╨┐╤А╨╛╨┤╤Г╨╝╨░╨╜╨░ ╨╗╨╛╨│╤Ц╨║╨░ ╤В╨░ ╤Б╤Г╤З╨░╤Б╨╜╨╕╨╣ ╨┤╨╕╨╖╨░╨╣╨╜' : 'Developer website that showcases approach: fast websites, clean code, thoughtful logic and modern design',
      url: 'https://temoweb.netlify.app/',
      category: 'portfolio',
      gradient: 'from-violet-900 via-purple-900 to-fuchsia-900',
      icon: 'ЁЯЪА',
      tech: ['Next.js', 'TypeScript', 'Tailwind'],
      color: 'violet',
      screenshot: 'temoweb.jpg'
    },
    {
      id: 11,
      name: 'KAREN Finance',
      desc: lang === 'ru' ? '╨д╨╕╨╜╤В╨╡╤Е-╨┐╨╗╨░╤В╤Д╨╛╤А╨╝╨░ ╨┤╨╗╤П ╤Г╨┐╤А╨░╨▓╨╗╨╡╨╜╨╕╤П ╤Д╨╕╨╜╨░╨╜╤Б╨░╨╝╨╕ ╤Б ╤Б╨╛╨▓╤А╨╡╨╝╨╡╨╜╨╜╤Л╨╝ ╨╕╨╜╤В╨╡╤А╤Д╨╡╨╣╤Б╨╛╨╝, ╨░╨╜╨░╨╗╨╕╤В╨╕╨║╨╛╨╣ ╨╕ ╤Д╨╛╨║╤Г╤Б╨╛╨╝ ╨╜╨░ ╨▒╨╡╨╖╨╛╨┐╨░╤Б╨╜╨╛╤Б╤В╤М ╨┤╨░╨╜╨╜╤Л╤Е' : lang === 'ua' ? '╨д╤Ц╨╜╤В╨╡╤Е-╨┐╨╗╨░╤В╤Д╨╛╤А╨╝╨░ ╨┤╨╗╤П ╤Г╨┐╤А╨░╨▓╨╗╤Ц╨╜╨╜╤П ╤Д╤Ц╨╜╨░╨╜╤Б╨░╨╝╨╕ ╨╖ ╤Б╤Г╤З╨░╤Б╨╜╨╕╨╝ ╤Ц╨╜╤В╨╡╤А╤Д╨╡╨╣╤Б╨╛╨╝, ╨░╨╜╨░╨╗╤Ц╤В╨╕╨║╨╛╤О ╤В╨░ ╤Д╨╛╨║╤Г╤Б╨╛╨╝ ╨╜╨░ ╨▒╨╡╨╖╨┐╨╡╨║╤Г ╨┤╨░╨╜╨╕╤Е' : 'Fintech platform for financial management with modern interface, analytics and focus on data security',
      url: 'https://karenfinance.cz/',
      category: 'ecommerce',
      gradient: 'from-blue-900 via-indigo-900 to-purple-900',
      icon: 'ЁЯТ░',
      tech: ['React', 'TypeScript', 'Tailwind'],
      color: 'blue',
      screenshot: 'karen.jpg'
    }
  ]
  
  const filteredProjects = projectFilter === 'all' 
    ? projects 
    : projects.filter(p => p.category === projectFilter)
  
  return (
    <main className="min-h-screen">
      {/* HEADER with glassmorphism */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-slate-900/80 border-b border-slate-700/50 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-4">
          <a href="#top" className="flex items-center gap-2 group shrink-0">
            <div className="flex items-center gap-2">
              <img 
                src="/logo.png" 
                alt="TemoWeb" 
                className="h-7 sm:h-8 w-auto object-contain group-hover:scale-110 transition-transform duration-300"
              />
              <span className="text-sm sm:text-base lg:text-lg font-bold tracking-tight gradient-text whitespace-nowrap">
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
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="flex items-center gap-0.5 bg-slate-800/50 rounded-full p-0.5">
              <button onClick={() => setLang('ru')} className={`px-1.5 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap ${lang === 'ru' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>RU</button>
              <button onClick={() => setLang('ua')} className={`px-1.5 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap ${lang === 'ua' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>UA</button>
              <button onClick={() => setLang('en')} className={`px-1.5 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap ${lang === 'en' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>EN</button>
            </div>
            <a
              href="#contact"
              className="hidden sm:inline-flex shine items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-2.5 text-sm font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
            >
              ЁЯЪА {t.discuss}
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
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <a 
                href="#contact"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-300 shadow-lg ring-1 ring-slate-200 mb-6 sm:mb-8 max-w-full hover:bg-slate-800/90 hover:ring-2 hover:ring-green-400/50 hover:scale-105 transition-all cursor-pointer"
                title={lang === 'ru' ? '╨б╨▓╤П╨╖╨░╤В╤М╤Б╤П ╤Б╨╛ ╨╝╨╜╨╛╨╣' : lang === 'ua' ? '╨Ч╨▓\'╤П╨╖╨░╤В╨╕╤Б╤П ╨╖╤Ц ╨╝╨╜╨╛╤О' : 'Contact me'}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="truncate">{t.openForProjects}</span>
              </a>
              
              <h1 className="text-balance text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-slate-300 leading-tight">
                {t.heroTitle}
              </h1>
              <h2 className="mt-3 sm:mt-4 text-balance text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight gradient-text leading-tight">
                {(t as any).heroSubtitle || t.heroTitle}
              </h2>
              <p className="mt-4 sm:mt-6 text-base sm:text-lg lg:text-xl leading-relaxed text-slate-300">
                {t.heroDesc}
              </p>
              
              {/* Key Offer */}
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-sm px-5 py-3 text-sm font-semibold border-2 border-indigo-500/30 shadow-lg">
                <span className="text-2xl">ЁЯдЦ</span>
                <span className="text-white">{t.heroOffer}</span>
              </div>
              
              {/* Stats */}
              <div className="mt-8 sm:mt-10 grid grid-cols-3 gap-3 sm:gap-6">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">50+</div>
                  <div className="text-xs sm:text-sm text-slate-400 mt-1">{t.projects}</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">98%</div>
                  <div className="text-xs sm:text-sm text-slate-400 mt-1">{t.satisfied}</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold gradient-text">+30%</div>
                  <div className="text-xs sm:text-sm text-slate-400 mt-1">{t.yearsExp}</div>
                </div>
              </div>
              
              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <a
                  href="#contact"
                  className="shine inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  ЁЯЪА {t.startProject}
                </a>
                <a
                  href="#cases"
                  className="inline-flex items-center justify-center rounded-full border-2 border-slate-300 bg-slate-900 px-5 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
                >
                  ЁЯУБ {t.viewCases}
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
                        <div className="h-3 bg-indigo-500 rounded-full w-12 text-[6px] text-white flex items-center justify-center">ЁЯЪА</div>
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
                            <div className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">+30%</div>
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
                            <div className="text-[5px] text-slate-400">350-500 тВм</div>
                          </div>
                          <div className="bg-slate-700/50 border border-purple-500/30 rounded-lg p-2">
                            <div className="text-[6px] font-bold text-white mb-0.5">{t.landingPage}</div>
                            <div className="text-[5px] text-slate-400">500-800 тВм</div>
                          </div>
                          <div className="bg-slate-700/50 border border-pink-500/30 rounded-lg p-2">
                            <div className="text-[6px] font-bold text-white mb-0.5">{t.chatBotExpress}</div>
                            <div className="text-[5px] text-slate-400">500 тВм</div>
                          </div>
                          <div className="bg-slate-700/50 border border-green-500/30 rounded-lg p-2">
                            <div className="text-[6px] font-bold text-white mb-0.5">{t.crmAuto}</div>
                            <div className="text-[5px] text-slate-400">800-1500 тВм</div>
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
                            <div className="text-[6px] font-bold text-white mb-1">ЁЯПв {t.businessConsultant}</div>
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
                              <span className="text-yellow-400 text-[6px]">тнР</span>
                              <span className="text-yellow-400 text-[6px]">тнР</span>
                              <span className="text-yellow-400 text-[6px]">тнР</span>
                              <span className="text-yellow-400 text-[6px]">тнР</span>
                              <span className="text-yellow-400 text-[6px]">тнР</span>
                            </div>
                            <p className="text-[5px] text-slate-300 italic">┬л{t.review1.slice(0, 60)}...┬╗</p>
                            <div className="mt-1 text-[5px] text-slate-400">{t.review1Name}</div>
                          </div>
                        </div>
                      </div>
                      
                        {/* CTA with WhatsApp button - animated click + code typing */}
                        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-lg p-3 text-center space-y-2">
                          <h3 className="text-[8px] font-bold text-white">{t.readyTitle}</h3>
                          <div className="space-y-1">
                            <div className="bg-indigo-500 hover:bg-indigo-600 rounded-full py-1 px-2 text-[6px] text-white font-semibold inline-block">
                              ЁЯЪА {t.startProject}
                            </div>
                            <div className="relative inline-block">
                              <div className="bg-green-500 hover:bg-green-600 rounded-full py-1 px-2 text-[6px] text-white font-semibold click-animation">
                                ЁЯУ▒ {t.writeWhatsapp}
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
                              <span className="text-purple-400">const</span> <span className="text-blue-400">message</span> = <span className="text-yellow-300">{'"╨Я╤А╨╕╨▓╤Ц╤В! ЁЯСЛ"'}</span>
                            </div>
                            <div className="code-line text-[5px] text-green-400">
                              <span className="text-purple-400">await</span> <span className="text-blue-400">sendWhatsApp</span>()
                            </div>
                            <div className="code-line text-[5px] text-green-400">
                              <span className="text-slate-500">{'// ╨Я╤Ц╨┤╨║╨╗╤О╤З╨╡╨╜╨╜╤П...'}</span>
                            </div>
                            <div className="code-line text-[5px] text-green-400">
                              тЬЕ <span className="text-green-300">╨У╨╛╤В╨╛╨▓╨╛!</span>
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
                          <div className="h-3 bg-indigo-500 rounded-full w-12 text-[6px] text-white flex items-center justify-center">ЁЯЪА</div>
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
                              <div className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">+30%</div>
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
              {t.problemsTitle.split('тАФ')[0]}тАФ <span className="gradient-text">{t.problemsTitle.split('тАФ')[1]}</span>
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              {t.problemsDesc}
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-900 p-8">
              <div className="text-4xl mb-4">тЭМ</div>
              <h3 className="text-lg font-bold text-white">{t.problem1}</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-300">
                {t.problem1Desc}
              </p>
              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="flex items-start gap-2 text-sm text-green-400">
                  <span className="text-xl">тЬЕ</span>
                  <span className="font-medium">{t.solution}</span>
                </div>
              </div>
            </div>
            
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-900 p-8">
              <div className="text-4xl mb-4">тП░</div>
              <h3 className="text-lg font-bold text-white">{t.problem2}</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-300">
                {t.problem2Desc}
              </p>
              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="flex items-start gap-2 text-sm text-green-400">
                  <span className="text-xl">тЬЕ</span>
                  <span className="font-medium">{t.solution2}</span>
                </div>
              </div>
            </div>
            
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-900 p-8">
              <div className="text-4xl mb-4">ЁЯТ╕</div>
              <h3 className="text-lg font-bold text-white">{t.problem3}</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-300">
                {t.problem3Desc}
              </p>
              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="flex items-start gap-2 text-sm text-green-400">
                  <span className="text-xl">тЬЕ</span>
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
              {t.approachTitle.split(lang === 'ru' ? '╨▒╨╕╨╖╨╜╨╡╤Б╨░' : lang === 'ua' ? '╨▒╤Ц╨╖╨╜╨╡╤Б╤Г' : 'business')[0]}<span className="gradient-text">{lang === 'ru' ? '╨▒╨╕╨╖╨╜╨╡╤Б╨░' : lang === 'ua' ? '╨▒╤Ц╨╖╨╜╨╡╤Б╤Г' : 'business'}</span>{t.approachTitle.split(lang === 'ru' ? '╨▒╨╕╨╖╨╜╨╡╤Б╨░' : lang === 'ua' ? '╨▒╤Ц╨╖╨╜╨╡╤Б╤Г' : 'business')[1]}
            </h2>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-800 p-8 shadow-lg">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-2xl mb-6 shadow-lg">
                ЁЯОп
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{t.goal}</h3>
              <p className="text-base leading-relaxed text-slate-300">
                {t.goalDesc}
              </p>
            </div>
            
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-800 p-8 shadow-lg">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-2xl mb-6 shadow-lg">
                ЁЯТб
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{t.clearLang}</h3>
              <p className="text-base leading-relaxed text-slate-300">
                {t.clearLangDesc}
              </p>
            </div>
            
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-800 p-8 shadow-lg">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center text-white text-2xl mb-6 shadow-lg">
                ЁЯУИ
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
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t.servicesTitle}
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              {t.servicesDesc}
            </p>
          </div>
          
          {/* Dual positioning grid */}
          <div className="max-w-6xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="font-bold text-white text-lg">{(t as any).servicesClassic || '╨Ъ╨╗╨░╤Б╤Б╨╕╤З╨╡╤Б╨║╨╕╨╡ ╤А╨╡╤И╨╡╨╜╨╕╤П'}</h3>
              <p className="text-sm text-slate-400 mt-1">{lang === 'ru' ? '╨Ю╤В 500тВм' : lang === 'ua' ? '╨Т╤Ц╨┤ 500тВм' : 'From 500тВм'}</p>
            </div>
            <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-xl p-4 border-2 border-indigo-500/50">
              <h3 className="font-bold gradient-text text-lg">{(t as any).servicesAI || 'AI-╨▓╨╛╨╖╨╝╨╛╨╢╨╜╨╛╤Б╤В╨╕ 2026+'}</h3>
              <p className="text-sm text-indigo-300 mt-1">{lang === 'ru' ? '╨Ю╤В 1500тВм' : lang === 'ua' ? '╨Т╤Ц╨┤ 1500тВм' : 'From 1500тВм'}</p>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* NEW: Chat-bot Express тАФ FIRST and HIGHLIGHTED */}
            <article className="card-hover rounded-3xl bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-2 border-indigo-500 p-8 shadow-2xl relative scale-105">
              <div className="absolute top-4 right-4 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                ЁЯФе {lang === 'ru' ? '╨б╤В╨░╤А╤В ╨╖╨░ 3 ╨┤╨╜╤П' : lang === 'ua' ? '╨б╤В╨░╤А╤В ╨╖╨░ 3 ╨┤╨╜╤Ц' : 'Start in 3 days'}
              </div>
              <div className="text-4xl mb-4">ЁЯдЦ</div>
              <h3 className="text-xl font-bold tracking-tight text-white">{t.chatBotExpress}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold gradient-text">{lang === 'ru' ? '╨╛╤В 500 тВм' : lang === 'ua' ? '╨▓╤Ц╨┤ 500 тВм' : 'from 500 тВм'}</span>
              </div>
              <p className="mt-6 text-base leading-relaxed text-slate-300">
                {t.chatBotExpressDesc}
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">тЬУ</span>
                  <span>{lang === 'ru' ? '╨У╨╛╤В╨╛╨▓ ╨╖╨░ 3 ╨┤╨╜╤П' : lang === 'ua' ? '╨У╨╛╤В╨╛╨▓╨╕╨╣ ╨╖╨░ 3 ╨┤╨╜╤Ц' : 'Ready in 3 days'}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">тЬУ</span>
                  <span>{lang === 'ru' ? '╨а╨░╨▒╨╛╤В╨░╨╡╤В 24/7' : lang === 'ua' ? '╨Я╤А╨░╤Ж╤О╤Ф 24/7' : 'Works 24/7'}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">тЬУ</span>
                  <span>{lang === 'ru' ? '╨Ш╨╜╤В╨╡╨│╤А╨░╤Ж╨╕╤П ╤Б Google Sheets' : lang === 'ua' ? '╨Ж╨╜╤В╨╡╨│╤А╨░╤Ж╤Ц╤П ╨╖ Google Sheets' : 'Google Sheets integration'}</span>
                </li>
              </ul>
              <a
                href="#contact"
                className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                {lang === 'ru' ? '╨Ч╨░╨║╨░╨╖╨░╤В╤М' : lang === 'ua' ? '╨Ч╨░╨╝╨╛╨▓╨╕╤В╨╕' : 'Order'}
              </a>
            </article>

            {/* Landing Page */}
            <article className="card-hover rounded-3xl bg-slate-900 border-2 border-slate-700 p-8 shadow-lg">
              <div className="text-4xl mb-4">ЁЯЪА</div>
              <h3 className="text-xl font-bold tracking-tight text-white">{t.landingPage}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold gradient-text">{lang === 'ru' ? '╨╛╤В 400 тВм' : lang === 'ua' ? '╨▓╤Ц╨┤ 400 тВм' : 'from 400 тВм'}</span>
              </div>
              <p className="mt-6 text-base leading-relaxed text-slate-300">
                {t.landingPageDesc}
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">тЬУ</span>
                  <span>{t.sellingDesign}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">тЬУ</span>
                  <span>{t.seoOptimization}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">тЬУ</span>
                  <span>{t.analyticsMetrics}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">тЬУ</span>
                  <span>{t.ready710days}</span>
                </li>
              </ul>
              <a
                href="#contact"
                className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                {lang === 'ru' ? '╨Ч╨░╨║╨░╨╖╨░╤В╤М' : lang === 'ua' ? '╨Ч╨░╨╝╨╛╨▓╨╕╤В╨╕' : 'Order'}
              </a>
            </article>

            {/* Business Card Site */}
            <article className="card-hover rounded-3xl bg-slate-900 border-2 border-slate-700 p-8 shadow-lg">
              <div className="text-4xl mb-4">ЁЯМР</div>
              <h3 className="text-xl font-bold tracking-tight text-white">{t.simpleWebsite}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold gradient-text">{lang === 'ru' ? '╨╛╤В 50 тВм' : lang === 'ua' ? '╨▓╤Ц╨┤ 50 тВм' : 'from 50 тВм'}</span>
              </div>
              <p className="mt-6 text-base leading-relaxed text-slate-300">
                {t.simpleWebsiteDesc}
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">тЬУ</span>
                  <span>{t.adaptiveDesign}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">тЬУ</span>
                  <span>{t.contactForm}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">тЬУ</span>
                  <span>{t.ready57days}</span>
                </li>
              </ul>
              <a
                href="#contact"
                className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                {lang === 'ru' ? '╨Ч╨░╨║╨░╨╖╨░╤В╤М' : lang === 'ua' ? '╨Ч╨░╨╝╨╛╨▓╨╕╤В╨╕' : 'Order'}
              </a>
            </article>

            {/* CRM */}
            <article className="card-hover rounded-3xl bg-slate-900 border-2 border-slate-700 p-8 shadow-lg">
              <div className="text-4xl mb-4">тЪЩя╕П</div>
              <h3 className="text-xl font-bold tracking-tight text-white">{t.crmAuto}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold gradient-text">{lang === 'ru' ? '╨╛╤В 800 тВм' : lang === 'ua' ? '╨▓╤Ц╨┤ 800 тВм' : 'from 800 тВм'}</span>
              </div>
              <p className="mt-6 text-base leading-relaxed text-slate-300">
                {t.crmAutoDesc}
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">тЬУ</span>
                  <span>{lang === 'ru' ? '╨г╤З╤С╤В ╨║╨╗╨╕╨╡╨╜╤В╨╛╨▓' : lang === 'ua' ? '╨Ю╨▒╨╗╤Ц╨║ ╨║╨╗╤Ц╤Ф╨╜╤В╤Ц╨▓' : 'Client accounting'}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">тЬУ</span>
                  <span>{lang === 'ru' ? '╨Р╨▓╤В╨╛╨╝╨░╤В╨╕╨╖╨░╤Ж╨╕╤П ╤А╤Г╤В╨╕╨╜╤Л' : lang === 'ua' ? '╨Р╨▓╤В╨╛╨╝╨░╤В╨╕╨╖╨░╤Ж╤Ц╤П ╤А╤Г╤В╨╕╨╜╨╕' : 'Routine automation'}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400">тЬУ</span>
                  <span>{lang === 'ru' ? '╨Ю╤В╤З╤С╤В╨╜╨╛╤Б╤В╤М' : lang === 'ua' ? '╨Ч╨▓╤Ц╤В╨╜╤Ц╤Б╤В╤М' : 'Reporting'}</span>
                </li>
              </ul>
              <a
                href="#contact"
                className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                {lang === 'ru' ? '╨Ч╨░╨║╨░╨╖╨░╤В╤М' : lang === 'ua' ? '╨Ч╨░╨╝╨╛╨▓╨╕╤В╨╕' : 'Order'}
              </a>
            </article>

            
            {/* Packages Section - NEW */}
            <div className="md:col-span-3 mt-12">
              <h3 className="text-2xl font-bold text-center text-white mb-2">{lang === 'ru' ? 'ЁЯОБ ╨У╨╛╤В╨╛╨▓╤Л╨╡ ╨┐╨░╨║╨╡╤В╤Л' : lang === 'ua' ? 'ЁЯОБ ╨У╨╛╤В╨╛╨▓╤Ц ╨┐╨░╨║╨╡╤В╨╕' : 'ЁЯОБ Ready packages'}</h3>
              <p className="text-center text-slate-400 mb-8">{lang === 'ru' ? '╨н╨║╨╛╨╜╨╛╨╝╨╕╤П ╨┤╨╛ 30% ╨┐╤А╨╕ ╨▓╤Л╨▒╨╛╤А╨╡ ╨┐╨░╨║╨╡╤В╨░' : lang === 'ua' ? '╨Х╨║╨╛╨╜╨╛╨╝╤Ц╤П ╨┤╨╛ 30% ╨┐╤А╨╕ ╨▓╨╕╨▒╨╛╤А╤Ц ╨┐╨░╨║╨╡╤В╤Г' : 'Save up to 30% with package'}</p>
            </div>

            {/* Starter Package */}
            <article className="card-hover rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-green-600 p-8 shadow-xl">
              <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                ЁЯТЪ {lang === 'ru' ? '╨б╤В╨░╤А╤В' : lang === 'ua' ? '╨б╤В╨░╤А╤В' : 'Start'}
              </div>
              <div className="text-4xl mb-4">ЁЯУж</div>
              <h3 className="text-2xl font-bold tracking-tight text-white">{t.packageStarter}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold gradient-text">{lang === 'ru' ? '╨╛╤В 500 тВм' : lang === 'ua' ? '╨▓╤Ц╨┤ 500 тВм' : 'from 500 тВм'}</span>
              </div>
              <p className="mt-6 text-base leading-relaxed text-slate-300">
                {t.packageStarterDesc}
              </p>
            </article>

            {/* Pro Package */}
            <article className="card-hover rounded-3xl bg-gradient-to-br from-indigo-900 to-purple-900 border-2 border-indigo-500 p-8 shadow-2xl scale-105 relative">
              <div className="absolute top-4 right-4 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                тнР {lang === 'ru' ? '╨е╨╕╤В' : lang === 'ua' ? '╨е╤Ц╤В' : 'Popular'}
              </div>
              <div className="text-4xl mb-4">ЁЯЪА</div>
              <h3 className="text-2xl font-bold tracking-tight text-white">{t.packagePro}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold gradient-text">{lang === 'ru' ? '╨╛╤В 1400 тВм' : lang === 'ua' ? '╨▓╤Ц╨┤ 1400 тВм' : 'from 1400 тВм'}</span>
              </div>
              <p className="mt-6 text-base leading-relaxed text-slate-300">
                {t.packageProDesc}
              </p>
            </article>

            {/* Premium Package */}
            <article className="card-hover rounded-3xl bg-gradient-to-br from-purple-900 to-pink-900 border-2 border-purple-600 p-8 shadow-xl">
              <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                ЁЯСС Premium
              </div>
              <div className="text-4xl mb-4">ЁЯТО</div>
              <h3 className="text-2xl font-bold tracking-tight text-white">{t.packagePremium}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold gradient-text">{lang === 'ru' ? '╨╛╤В 2500 тВм' : lang === 'ua' ? '╨▓╤Ц╨┤ 2500 тВм' : 'from 2500 тВм'}</span>
              </div>
              <p className="mt-6 text-base leading-relaxed text-slate-300">
                {t.packagePremiumDesc}
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* EVOLUTION SECTION - ╨н╨▓╨╛╨╗╤О╤Ж╨╕╤П ╨▒╨╕╨╖╨╜╨╡╤Б╨░ */}
      <section className="border-t border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl mb-4">
              {(t as any).evolutionTitle || (lang === 'ru' ? '╨н╨▓╨╛╨╗╤О╤Ж╨╕╤П ╨▓╨░╤И╨╡╨│╨╛ ╨▒╨╕╨╖╨╜╨╡╤Б╨░' : lang === 'ua' ? '╨Х╨▓╨╛╨╗╤О╤Ж╤Ц╤П ╨▓╨░╤И╨╛╨│╨╛ ╨▒╤Ц╨╖╨╜╨╡╤Б╤Г' : 'Your business evolution')}
            </h2>
            <p className="text-lg text-slate-300">
              {(t as any).evolutionDesc || (lang === 'ru' ? '╨Э╨░╤З╨╜╨╕╤В╨╡ ╤Б ╨▒╨░╨╖╨╛╨▓╨╛╨│╨╛, ╤А╨░╤Б╤В╨╕╤В╨╡ ╨▓╨╝╨╡╤Б╤В╨╡ ╤Б ╤В╨╡╤Е╨╜╨╛╨╗╨╛╨│╨╕╤П╨╝╨╕' : lang === 'ua' ? '╨Я╨╛╤З╨╜╤Ц╤В╤М ╨╖ ╨▒╨░╨╖╨╛╨▓╨╛╨│╨╛, ╤А╨╛╤Б╤В╤Ц╤В╤М ╤А╨░╨╖╨╛╨╝ ╨╖ ╤В╨╡╤Е╨╜╨╛╨╗╨╛╨│╤Ц╤П╨╝╨╕' : 'Start basic, grow with technology')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Stage 1 */}
            <article className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-8 relative">
              <div className="text-center">
                <div className="text-5xl mb-4">ЁЯУ▒</div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {(t as any).evolutionStage1 || (lang === 'ru' ? '╨н╤В╨░╨┐ 1: ╨С╨░╨╖╨╛╨▓╤Л╨╣' : lang === 'ua' ? '╨Х╤В╨░╨┐ 1: ╨С╨░╨╖╨╛╨▓╨╕╨╣' : 'Stage 1: Basic')}
                </h3>
                <p className="text-sm text-slate-400 mb-4">{lang === 'ru' ? '╨б╨╡╨╣╤З╨░╤Б' : lang === 'ua' ? '╨Ч╨░╤А╨░╨╖' : 'Now'}</p>
                <ul className="text-left space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500">тАв</span>
                    <span>{lang === 'ru' ? '╨Я╤А╨╛╤Б╤В╨╛╨╣ ╤Б╨░╨╣╤В' : lang === 'ua' ? '╨Я╤А╨╛╤Б╤В╨╕╨╣ ╤Б╨░╨╣╤В' : 'Simple website'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500">тАв</span>
                    <span>{lang === 'ru' ? '╨д╨╛╤А╨╝╨░ ╨╖╨░╤П╨▓╨║╨╕' : lang === 'ua' ? '╨д╨╛╤А╨╝╨░ ╨╖╨░╤П╨▓╨║╨╕' : 'Contact form'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500">тАв</span>
                    <span>{lang === 'ru' ? '╨а╤Г╤З╨╜╨░╤П ╤А╨░╨▒╨╛╤В╨░' : lang === 'ua' ? '╨а╤Г╤З╨╜╨░ ╤А╨╛╨▒╨╛╤В╨░' : 'Manual work'}</span>
                  </li>
                </ul>
              </div>
            </article>

            {/* Stage 2 */}
            <article className="rounded-2xl bg-slate-800 border-2 border-indigo-700 p-8 relative transform scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 px-3 py-1 rounded-full text-xs font-bold text-white">
                {lang === 'ru' ? '╨Я╨╛╨┐╤Г╨╗╤П╤А╨╜╨╛' : lang === 'ua' ? '╨Я╨╛╨┐╤Г╨╗╤П╤А╨╜╨╛' : 'Popular'}
              </div>
              <div className="text-center">
                <div className="text-5xl mb-4">тЪб</div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {(t as any).evolutionStage2 || (lang === 'ru' ? '╨н╤В╨░╨┐ 2: ╨Р╨▓╤В╨╛╨╝╨░╤В╨╕╨╖╨╕╤А╨╛╨▓╨░╨╜╨╜╤Л╨╣' : lang === 'ua' ? '╨Х╤В╨░╨┐ 2: ╨Р╨▓╤В╨╛╨╝╨░╤В╨╕╨╖╨╛╨▓╨░╨╜╨╕╨╣' : 'Stage 2: Automated')}
                </h3>
                <p className="text-sm text-indigo-300 mb-4">{lang === 'ru' ? '3-6 ╨╝╨╡╤Б╤П╤Ж╨╡╨▓' : lang === 'ua' ? '3-6 ╨╝╤Ц╤Б╤П╤Ж╤Ц╨▓' : '3-6 months'}</p>
                <ul className="text-left space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400">тЬУ</span>
                    <span>{lang === 'ru' ? '╨б╨░╨╣╤В + ╨▒╨╛╤В' : lang === 'ua' ? '╨б╨░╨╣╤В + ╨▒╨╛╤В' : 'Website + bot'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400">тЬУ</span>
                    <span>{lang === 'ru' ? '╨Р╨▓╤В╨╛╨╛╤В╨▓╨╡╤В╤Л' : lang === 'ua' ? '╨Р╨▓╤В╨╛╨▓╤Ц╨┤╨┐╨╛╨▓╤Ц╨┤╤Ц' : 'Auto-replies'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400">тЬУ</span>
                    <span>{lang === 'ru' ? 'CRM-╨╕╨╜╤В╨╡╨│╤А╨░╤Ж╨╕╤П' : lang === 'ua' ? 'CRM-╤Ц╨╜╤В╨╡╨│╤А╨░╤Ж╤Ц╤П' : 'CRM integration'}</span>
                  </li>
                </ul>
              </div>
            </article>

            {/* Stage 3 */}
            <article className="rounded-2xl bg-gradient-to-br from-indigo-900 to-purple-900 border-2 border-purple-500 p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 rounded-full text-xs font-bold text-white">
                2026+
              </div>
              <div className="text-center">
                <div className="text-5xl mb-4">ЁЯза</div>
                <h3 className="text-xl font-bold gradient-text mb-3">
                  {(t as any).evolutionStage3 || (lang === 'ru' ? '╨н╤В╨░╨┐ 3: AI-╤Г╨┐╤А╨░╨▓╨╗╤П╨╡╨╝╤Л╨╣' : lang === 'ua' ? '╨Х╤В╨░╨┐ 3: AI-╨║╨╡╤А╨╛╨▓╨░╨╜╨╕╨╣' : 'Stage 3: AI-powered')}
                </h3>
                <p className="text-sm text-purple-300 mb-4">{lang === 'ru' ? '╨С╤Г╨┤╤Г╤Й╨╡╨╡' : lang === 'ua' ? '╨Ь╨░╨╣╨▒╤Г╤В╨╜╤Ф' : 'Future'}</p>
                <ul className="text-left space-y-2 text-sm text-indigo-200">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">тШЕ</span>
                    <span>{lang === 'ru' ? '╨б╨╕╤Б╤В╨╡╨╝╨░ ╤Б ╨┐╨░╨╝╤П╤В╤М╤О' : lang === 'ua' ? '╨б╨╕╤Б╤В╨╡╨╝╨░ ╨╖ ╨┐╨░╨╝\'╤П╤В╤В╤О' : 'System with memory'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">тШЕ</span>
                    <span>{lang === 'ru' ? '╨У╨╛╨╗╨╛╤Б/╤Д╨╛╤В╨╛ ╨▓ ╨╖╨░╤П╨▓╨║╨░╤Е' : lang === 'ua' ? '╨У╨╛╨╗╨╛╤Б/╤Д╨╛╤В╨╛ ╨▓ ╨╖╨░╤П╨▓╨║╨░╤Е' : 'Voice/photo in requests'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">тШЕ</span>
                    <span>{lang === 'ru' ? 'A/B ╤В╨╡╤Б╤В╤Л ╨┤╨╕╨░╨╗╨╛╨│╨╛╨▓' : lang === 'ua' ? 'A/B ╤В╨╡╤Б╤В╨╕ ╨┤╤Ц╨░╨╗╨╛╨│╤Ц╨▓' : 'A/B testing dialogues'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">тШЕ</span>
                    <span>{lang === 'ru' ? 'AI-╨│╨╡╨╜╨╡╤А╨░╤Ж╨╕╤П ╨║╨╛╨╜╤В╨╡╨╜╤В╨░' : lang === 'ua' ? 'AI-╨│╨╡╨╜╨╡╤А╨░╤Ж╤Ц╤П ╨║╨╛╨╜╤В╨╡╨╜╤В╤Г' : 'AI content generation'}</span>
                  </li>
                </ul>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* TECH STACK 2026 */}
      <section className="border-t border-slate-700 bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-indigo-300 shadow-lg ring-1 ring-indigo-500/20 mb-6">
              <span className="text-2xl">тЪЩя╕П</span>
              <span>2026+</span>
            </div>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl mb-4">
              {(t as any).techStackTitle || 'Tech Stack 2026'}
            </h2>
            <p className="text-lg text-slate-300">
              {(t as any).techStackDesc || (lang === 'ru' ? '╨в╨╡╤Е╨╜╨╛╨╗╨╛╨│╨╕╨╕, ╨║╨╛╤В╨╛╤А╤Л╨╡ ╤П ╨╕╤Б╨┐╨╛╨╗╤М╨╖╤Г╤О ╨┤╨╗╤П AI-╤Б╨╕╤Б╤В╨╡╨╝' : lang === 'ua' ? '╨в╨╡╤Е╨╜╨╛╨╗╨╛╨│╤Ц╤Ч, ╤П╨║╤Ц ╤П ╨▓╨╕╨║╨╛╤А╨╕╤Б╤В╨╛╨▓╤Г╤О ╨┤╨╗╤П AI-╤Б╨╕╤Б╤В╨╡╨╝' : 'Technologies I use for AI systems')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <article className="rounded-2xl bg-slate-800 border border-slate-700 p-6 hover:border-indigo-500/50 transition-all">
              <div className="text-3xl mb-3">ЁЯза</div>
              <h3 className="text-lg font-bold text-white mb-2">{(t as any).techStackAI || 'AI-╤П╨┤╤А╨╛'}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {(t as any).techStackAIDesc || 'DeepSeek API ╤Б ╨┤╨╛╨╗╨│╨╛╤Б╤А╨╛╤З╨╜╨╛╨╣ ╨┐╨░╨╝╤П╤В╤М╤О (PostgreSQL + ╨▓╨╡╨║╤В╨╛╤А╨╜╨░╤П ╨С╨Ф)'}
              </p>
            </article>

            <article className="rounded-2xl bg-slate-800 border border-slate-700 p-6 hover:border-indigo-500/50 transition-all">
              <div className="text-3xl mb-3">ЁЯОдЁЯУ╕</div>
              <h3 className="text-lg font-bold text-white mb-2">{(t as any).techStackMulti || (lang === 'ru' ? '╨Ь╤Г╨╗╤М╤В╨╕╨╝╨╛╨┤╨░╨╗╤М╨╜╨╛╤Б╤В╤М' : 'Multimodal')}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {(t as any).techStackMultiDesc || 'Whisper (╨│╨╛╨╗╨╛╤Б), Vision API (╤Д╨╛╤В╨╛), Claude 3.5 (╨┤╨╛╨║╤Г╨╝╨╡╨╜╤В╤Л)'}
              </p>
            </article>

            <article className="rounded-2xl bg-slate-800 border border-slate-700 p-6 hover:border-indigo-500/50 transition-all">
              <div className="text-3xl mb-3">ЁЯФЧ</div>
              <h3 className="text-lg font-bold text-white mb-2">{(t as any).techStackIntegrations || (lang === 'ru' ? '╨Ш╨╜╤В╨╡╨│╤А╨░╤Ж╨╕╨╕' : 'Integrations')}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {(t as any).techStackIntegrationsDesc || 'Stripe/Fondy (╨╛╨┐╨╗╨░╤В╨░), Telegram/WhatsApp API, Airtable ╨║╨░╨║ CRM'}
              </p>
            </article>

            <article className="rounded-2xl bg-slate-800 border border-slate-700 p-6 hover:border-indigo-500/50 transition-all">
              <div className="text-3xl mb-3">тЪб</div>
              <h3 className="text-lg font-bold text-white mb-2">{(t as any).techStackAuto || (lang === 'ru' ? '╨Р╨▓╤В╨╛╨╝╨░╤В╨╕╨╖╨░╤Ж╨╕╤П' : 'Automation')}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {(t as any).techStackAutoDesc || 'A/B ╤В╨╡╤Б╤В╤Л ╨┤╨╕╨░╨╗╨╛╨│╨╛╨▓, ╨│╨╡╨╜╨╡╤А╨░╤Ж╨╕╤П ╨║╨╛╨╜╤В╨╡╨╜╤В╨░ GPT-4, ╨░╨▓╤В╨╛╨╜╨░╨┐╨╛╨╝╨╕╨╜╨░╨╜╨╕╤П'}
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* TRUST SECTION - ╨Я╨╛╤З╨╡╨╝╤Г ╤Б╨╛ ╨╝╨╜╨╛╨╣ ╨┐╤А╨╛╤Б╤В╨╛ ╨╕ ╨┐╨╛╨╜╤П╤В╨╜╨╛ */}
      <section className="border-t border-slate-700 bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl mb-6">
              {t.trustTitle}
            </h2>
            <p className="text-lg leading-relaxed text-slate-300">
              {(t as any).trustDesc || ''}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mt-16">
            <article className="rounded-2xl bg-slate-800 border border-slate-700 p-6 hover:border-indigo-500/50 transition-all">
              <div className="text-3xl mb-4">ЁЯОп</div>
              <h3 className="text-lg font-bold text-white mb-3">{t.howIThink}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{t.howIThinkDesc}</p>
            </article>

            <article className="rounded-2xl bg-slate-800 border border-slate-700 p-6 hover:border-indigo-500/50 transition-all">
              <div className="text-3xl mb-4">ЁЯТм</div>
              <h3 className="text-lg font-bold text-white mb-3">{t.howICommunicate}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{t.howICommunicateDesc}</p>
            </article>

            <article className="rounded-2xl bg-slate-800 border border-slate-700 p-6 hover:border-indigo-500/50 transition-all">
              <div className="text-3xl mb-4">тЪб</div>
              <h3 className="text-lg font-bold text-white mb-3">{t.howIWork}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{t.howIWorkDesc}</p>
            </article>

            <article className="rounded-2xl bg-slate-800 border border-slate-700 p-6 hover:border-indigo-500/50 transition-all">
              <div className="text-3xl mb-4">тЬЛ</div>
              <h3 className="text-lg font-bold text-white mb-3">{t.honesty}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{t.honestyDesc}</p>
            </article>
          </div>
        </div>
      </section>

      {/* CALCULATOR */}
      <section className="border-t border-slate-700 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-indigo-300 shadow-lg ring-1 ring-indigo-500/20 mb-6">
              <span className="text-2xl">ЁЯТ░</span>
              <span>{lang === 'ru' ? '╨Ш╨╜╤В╨╡╤А╨░╨║╤В╨╕╨▓╨╜╤Л╨╣ ╤А╨░╤Б╤З╤С╤В' : lang === 'ua' ? '╨Ж╨╜╤В╨╡╤А╨░╨║╤В╨╕╨▓╨╜╨╕╨╣ ╤А╨╛╨╖╤А╨░╤Е╤Г╨╜╨╛╨║' : 'Interactive calculator'}</span>
            </div>
            <h2 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl mb-4">
              {lang === 'ru' ? '╨а╨░╤Б╤Б╤З╨╕╤В╨░╨╣╤В╨╡ ╤Б╤В╨╛╨╕╨╝╨╛╤Б╤В╤М ' : lang === 'ua' ? '╨а╨╛╨╖╤А╨░╤Е╤Г╨╣╤В╨╡ ╨▓╨░╤А╤В╤Ц╤Б╤В╤М ' : 'Calculate cost of '}
              <span className="gradient-text">{lang === 'ru' ? '╨▓╨░╤И╨╡╨│╨╛ ╨┐╤А╨╛╨╡╨║╤В╨░' : lang === 'ua' ? '╨▓╨░╤И╨╛╨│╨╛ ╨┐╤А╨╛╨╡╨║╤В╤Г' : 'your project'}</span>
            </h2>
            <p className="text-lg text-slate-300">
              {lang === 'ru' 
                ? '╨Ю╤В╨▓╨╡╤В╤М╤В╨╡ ╨╜╨░ ╨╜╨╡╤Б╨║╨╛╨╗╤М╨║╨╛ ╨▓╨╛╨┐╤А╨╛╤Б╨╛╨▓ ╨╕ ╨┐╨╛╨╗╤Г╤З╨╕╤В╨╡ ╨╛╤А╨╕╨╡╨╜╤В╨╕╤А╨╛╨▓╨╛╤З╨╜╤Г╤О ╤Б╤В╨╛╨╕╨╝╨╛╤Б╤В╤М ╨╖╨░ 2 ╨╝╨╕╨╜╤Г╤В╤Л'
                : lang === 'ua'
                ? '╨Ф╨░╨╣╤В╨╡ ╨▓╤Ц╨┤╨┐╨╛╨▓╤Ц╨┤╤М ╨╜╨░ ╨║╤Ц╨╗╤М╨║╨░ ╨┐╨╕╤В╨░╨╜╤М ╤Ц ╨╛╤В╤А╨╕╨╝╨░╨╣╤В╨╡ ╨╛╤А╤Ц╤Ф╨╜╤В╨╛╨▓╨╜╤Г ╨▓╨░╤А╤В╤Ц╤Б╤В╤М ╨╖╨░ 2 ╤Е╨▓╨╕╨╗╨╕╨╜╨╕'
                : 'Answer a few questions and get an estimated cost in 2 minutes'}
            </p>
          </div>

          <Calculator lang={lang} />
        </div>
      </section>

      {/* CASES / PORTFOLIO */}
      <section id="cases" className="border-t border-slate-700 bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t.casesTitle.split(lang === 'ru' ? '╨║╨╡╨╣╤Б╤Л' : lang === 'ua' ? '╨║╨╡╨╣╤Б╨╕' : 'cases')[0]}<span className="gradient-text">{lang === 'ru' ? '╨║╨╡╨╣╤Б╤Л' : lang === 'ua' ? '╨║╨╡╨╣╤Б╨╕' : 'cases'}</span>{t.casesTitle.split(lang === 'ru' ? '╨║╨╡╨╣╤Б╤Л' : lang === 'ua' ? '╨║╨╡╨╣╤Б╨╕' : 'cases')[1]}
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              {t.casesDesc}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Case 1 */}
            <article className="card-hover rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-indigo-100 p-8 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">ЁЯЪЧ</div>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">{lang === 'ru' ? '╨б╨░╨╣╤В + ╨С╨╛╤В' : lang === 'ua' ? '╨б╨░╨╣╤В + ╨С╨╛╤В' : 'Website + Bot'}</span>
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
                  <span className="text-2xl font-bold gradient-text">{lang === 'ru' ? '╨а╨░╨▒╨╛╤В╨░╨╡╤В' : lang === 'ua' ? '╨Я╤А╨░╤Ж╤О╤Ф' : 'Works'}</span>
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
                <div className="text-4xl">ЁЯР▒</div>
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
                  <span className="text-2xl font-bold gradient-text">0.8{lang === 'ru' ? '╤Б' : lang === 'ua' ? '╤Б' : 's'}</span>
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
                <div className="text-4xl">ЁЯУ▒</div>
                <span className="text-xs font-semibold text-green-400 bg-green-100 px-3 py-1 rounded-full">{lang === 'ru' ? 'SMM ╨б╨╡╤А╨▓╨╕╤Б' : lang === 'ua' ? 'SMM ╨б╨╡╤А╨▓╤Ц╤Б' : 'SMM Service'}</span>
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
                  <span className="text-lg font-semibold text-white">{lang === 'ru' ? '1 ╨╝╨╡╤Б╤П╤Ж' : lang === 'ua' ? '1 ╨╝╤Ц╤Б╤П╤Ж╤М' : '1 month'}</span>
                </div>
              </div>
            </article>

            {/* Case 4 */}
            <article className="card-hover rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-pink-100 p-8 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">ЁЯТО</div>
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
                  <span className="text-2xl font-bold gradient-text">150тВм</span>
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
                <div className="text-4xl">ЁЯТ░</div>
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
                  <span className="text-2xl font-bold gradient-text">24{lang === 'ru' ? '╤З' : lang === 'ua' ? '╨│' : 'h'}</span>
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
                  ЁЯТм {t.discussYourProject}
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
              <span className="text-2xl animate-bounce">ЁЯЪА</span>
              <span>{filteredProjects.length} {lang === 'ru' ? '╨┐╤А╨╛╨╡╨║╤В╨╛╨▓ ╨▓ ╨┐╤А╨╛╨┤╨░╨║╤И╨╡╨╜╨╡' : lang === 'ua' ? '╨┐╤А╨╛╨╡╨║╤В╤Ц╨▓ ╤Г ╨┐╤А╨╛╨┤╨░╨║╤И╨╡╨╜╤Ц' : 'projects in production'}</span>
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
              тЬи {t.allProjects}
            </button>
            <button
              onClick={() => setProjectFilter('ecommerce')}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                projectFilter === 'ecommerce'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              ЁЯЫНя╕П {t.ecommerce}
            </button>
            <button
              onClick={() => setProjectFilter('bots')}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                projectFilter === 'bots'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              ЁЯдЦ {t.bots}
            </button>
            <button
              onClick={() => setProjectFilter('landing')}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                projectFilter === 'landing'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg scale-105'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              ЁЯМР {t.landing}
            </button>
            <button
              onClick={() => setProjectFilter('portfolio')}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                projectFilter === 'portfolio'
                  ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-lg scale-105'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              ЁЯТ╝ {t.portfolio}
            </button>
          </div>

          {/* 3D Carousel Controls */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <button
              onClick={() => {
                if (!isAnimating) {
                  setIsAnimating(true)
                  setCurrentProjectIndex((currentProjectIndex - 1 + filteredProjects.length) % filteredProjects.length)
                  setTimeout(() => setIsAnimating(false), 600)
                }
              }}
              disabled={isAnimating}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white text-xl font-bold shadow-xl hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              тЖР
            </button>
            <div className="text-slate-400 text-sm font-medium">
              {currentProjectIndex + 1} / {filteredProjects.length}
            </div>
            <button
              onClick={() => {
                if (!isAnimating) {
                  setIsAnimating(true)
                  setCurrentProjectIndex((currentProjectIndex + 1) % filteredProjects.length)
                  setTimeout(() => setIsAnimating(false), 600)
                }
              }}
              disabled={isAnimating}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white text-xl font-bold shadow-xl hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              тЖТ
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
                    transform: `translate3d(${offset * 120}%, 0, ${isActive ? '0px' : '-200px'}) rotateY(${offset * 45}deg) scale(${isActive ? 1 : 0.85})`,
                    opacity: absOffset > 2 ? 0 : isActive ? 1 : 0.6,
                    zIndex: isActive ? 10 : 10 - absOffset,
                    pointerEvents: isActive ? 'auto' : 'none',
                    transition: 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.5s ease',
                    backfaceVisibility: 'hidden',
                    transformStyle: 'preserve-3d',
                    display: absOffset > 2 ? 'none' : 'block'
                  }}
                >
              {/* Project Preview - Live Preview */}
              <div className="relative h-40 sm:h-48 lg:h-56 overflow-hidden bg-slate-800">
                {/* Live website iframe - ╨╖╨░╨│╤А╤Г╨╢╨░╨╡╤В╤Б╤П ╨в╨Ю╨Ы╨м╨Ъ╨Ю ╨┤╨╗╤П ╨░╨║╤В╨╕╨▓╨╜╨╛╨╣ ╨║╨░╤А╤В╨╛╤З╨║╨╕ */}
                {project.category !== 'bots' ? (
                  isActive ? (
                    <iframe 
                      src={project.url}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{
                        transform: 'scale(0.5)',
                        transformOrigin: 'top left',
                        width: '200%',
                        height: '200%'
                      }}
                      title={`${project.name} preview`}
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${project.gradient} flex items-center justify-center`}>
                      <div className="text-5xl opacity-30">{project.icon}</div>
                        </div>
                  )
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
                    <span>{lang === 'ru' ? '╨Э╨░╨╢╨╝╨╕ ╤З╤В╨╛╨▒╤Л ╨╛╤В╨║╤А╤Л╤В╤М' : lang === 'ua' ? '╨Э╨░╤В╨╕╤Б╨╜╨╕ ╤Й╨╛╨▒ ╨▓╤Ц╨┤╨║╤А╨╕╤В╨╕' : 'Click to open'}</span>
                  </div>
                </div>
                
                {/* Category Badge */}
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
                  <div className="relative">
                    <div className="bg-slate-900/95 px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs font-bold text-white shadow-2xl border border-white/30 group-hover:border-white/50 transition-all">
                      {project.category === 'ecommerce' && (lang === 'ru' ? '╨Ь╨░╨│╨░╨╖╨╕╨╜' : lang === 'ua' ? '╨Ь╨░╨│╨░╨╖╨╕╨╜' : 'Store')}
                      {project.category === 'bots' && (lang === 'ru' ? '╨С╨╛╤В' : lang === 'ua' ? '╨С╨╛╤В' : 'Bot')}
                      {project.category === 'landing' && (lang === 'ru' ? '╨б╨░╨╣╤В' : lang === 'ua' ? '╨б╨░╨╣╤В' : 'Website')}
                      {project.category === 'portfolio' && (lang === 'ru' ? '╨Я╨╛╤А╤В╤Д╨╛╨╗╨╕╨╛' : lang === 'ua' ? '╨Я╨╛╤А╤В╤Д╨╛╨╗╤Ц╨╛' : 'Portfolio')}
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
                  <span className="text-sm sm:text-base lg:text-lg">{project.category === 'bots' ? 'ЁЯУ▒' : 'ЁЯФЧ'}</span>
                  <span className="hidden sm:inline">{project.category === 'bots' ? t.openBot : t.viewSite}</span>
                  <span className="sm:hidden">{lang === 'ru' ? '╨Ю╤В╨║╤А╤Л╤В╤М' : lang === 'ua' ? '╨Т╤Ц╨┤╨║╤А╨╕╤В╨╕' : 'Open'}</span>
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
              {t.reviewsTitle.split(lang === 'ru' ? '╨║╨╗╨╕╨╡╨╜╤В╤Л' : lang === 'ua' ? '╨║╨╗╤Ц╤Ф╨╜╤В╨╕' : 'clients')[0]}<span className="gradient-text">{lang === 'ru' ? '╨║╨╗╨╕╨╡╨╜╤В╤Л' : lang === 'ua' ? '╨║╨╗╤Ц╤Ф╨╜╤В╨╕' : 'clients'}</span>
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              {t.reviewsDesc}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="card-hover rounded-3xl bg-slate-900 border-2 border-slate-700 p-8 shadow-lg">
              <div className="flex gap-1 mb-4">
                <span className="text-yellow-400">тнР</span>
                <span className="text-yellow-400">тнР</span>
                <span className="text-yellow-400">тнР</span>
                <span className="text-yellow-400">тнР</span>
                <span className="text-yellow-400">тнР</span>
              </div>
              <p className="text-slate-300 italic mb-6">
                ┬л{t.review1}┬╗
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
                <span className="text-yellow-400">тнР</span>
                <span className="text-yellow-400">тнР</span>
                <span className="text-yellow-400">тнР</span>
                <span className="text-yellow-400">тнР</span>
                <span className="text-yellow-400">тнР</span>
              </div>
              <p className="text-slate-300 italic mb-6">
                ┬л{t.review2}┬╗
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
                <span className="text-yellow-400">тнР</span>
                <span className="text-yellow-400">тнР</span>
                <span className="text-yellow-400">тнР</span>
                <span className="text-yellow-400">тнР</span>
                <span className="text-yellow-400">тнР</span>
              </div>
              <p className="text-slate-300 italic mb-6">
                ┬л{t.review3}┬╗
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
              {t.trustTitle.split(lang === 'ru' ? '╤Б╨┐╨╛╨║╨╛╨╣╨╜╨╛' : lang === 'ua' ? '╤Б╨┐╨╛╨║╤Ц╨╣╨╜╨╛' : 'calm')[0]}<span className="gradient-text">{lang === 'ru' ? '╤Б╨┐╨╛╨║╨╛╨╣╨╜╨╛' : lang === 'ua' ? '╤Б╨┐╨╛╨║╤Ц╨╣╨╜╨╛' : 'calm'}</span>
            </h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-900 p-8 text-center">
              <div className="text-5xl mb-4">ЁЯТн</div>
              <h3 className="text-lg font-bold text-white mb-3">{t.howIThink}</h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {t.howIThinkDesc}
              </p>
            </div>
            
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-900 p-8 text-center">
              <div className="text-5xl mb-4">ЁЯТм</div>
              <h3 className="text-lg font-bold text-white mb-3">{t.howICommunicate}</h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {t.howICommunicateDesc}
              </p>
            </div>
            
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-900 p-8 text-center">
              <div className="text-5xl mb-4">тЪб</div>
              <h3 className="text-lg font-bold text-white mb-3">{t.howIWork}</h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {t.howIWorkDesc}
              </p>
            </div>
            
            <div className="card-hover rounded-3xl border-2 border-slate-700 bg-slate-900 p-8 text-center">
              <div className="text-5xl mb-4">тЬЛ</div>
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
                        <div className="text-4xl">ЁЯУЮ</div>
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
                        <div className="text-4xl">ЁЯУЛ</div>
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
                        <div className="text-4xl">тЪЩя╕П</div>
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
                        <div className="text-4xl">ЁЯЪА</div>
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
              ╨б╨▓╨╛╨▒╨╛╨┤╨╡╨╜ ╨┤╨╗╤П ╨╜╨╛╨▓╤Л╤Е ╨┐╤А╨╛╨╡╨║╤В╨╛╨▓
            </div>
            
            <h2 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {t.readyTitle} ЁЯЪА
            </h2>
            <p className="mt-6 text-xl leading-relaxed text-slate-200">
              {t.readyDesc}
            </p>
            
            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="tel:+420723995896"
                className="shine inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-lg font-bold text-white hover:bg-slate-800 transition-all shadow-2xl hover:shadow-3xl hover:scale-105"
              >
                <span className="text-2xl">ЁЯУЮ</span>
                +420 723 995 896
              </a>
              <a
                href="https://wa.me/380960494917"
                target="_blank"
                rel="noopener noreferrer"
                className="shine inline-flex items-center justify-center gap-2 rounded-full bg-green-500 px-8 py-4 text-lg font-bold text-white hover:bg-green-600 transition-all shadow-2xl hover:shadow-3xl hover:scale-105"
              >
                <span className="text-2xl">ЁЯУ▒</span>
                {t.writeWhatsapp}
              </a>
              <a
                href="https://t.me/temoxa_1"
                target="_blank"
                rel="noopener noreferrer"
                className="shine inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-4 text-lg font-bold text-white hover:from-indigo-600 hover:to-purple-600 transition-all shadow-2xl hover:shadow-3xl hover:scale-105"
              >
                <span className="text-2xl">тЬИя╕П</span>
                {t.writeTelegram}
              </a>
            </div>
            
            {/* Lead Form */}
            <LeadForm lang={lang} />
            
            <div className="mt-8 sm:mt-12 grid grid-cols-3 gap-3 sm:gap-6 lg:gap-8 max-w-2xl mx-auto px-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">24{lang === 'en' ? 'h' : '╤З'}</div>
                <div className="text-[10px] sm:text-xs lg:text-sm text-slate-300 mt-1 leading-tight">{t.respondFast}</div>
              </div>
              <div className="text-center">
                <div className="text-base sm:text-2xl lg:text-3xl font-bold text-white leading-tight">
                  {lang === 'en' ? 'Free' : lang === 'ua' ? '╨С╨╡╨╖╨║╨╛╤И╤В╨╛╨▓╨╜╨╛' : '╨С╨╡╤Б╨┐╨╗╨░╤В╨╜╨╛'}
                </div>
                <div className="text-[10px] sm:text-xs lg:text-sm text-slate-300 mt-1 leading-tight">{t.freeConsult}</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">0тВм</div>
                <div className="text-[10px] sm:text-xs lg:text-sm text-slate-300 mt-1 leading-tight">{t.untilAgree}</div>
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
                {lang === 'ru' ? '╨Я╤А╨╡╨▓╤А╨░╤Й╨░╤О ╨▒╨╕╨╖╨╜╨╡╤Б-╨╖╨░╨┤╨░╤З╨╕ ╨▓ ╤А╨░╨▒╨╛╤В╨░╤О╤Й╨╕╨╡ ╤А╨╡╤И╨╡╨╜╨╕╤П' : lang === 'ua' ? '╨Я╨╡╤А╨╡╤В╨▓╨╛╤А╤О╤О ╨▒╤Ц╨╖╨╜╨╡╤Б-╨╖╨░╨┤╨░╤З╤Ц ╤Г ╨┐╤А╨░╤Ж╤О╤О╤З╤Ц ╤А╤Ц╤И╨╡╨╜╨╜╤П' : 'Turn business tasks into working solutions'}
              </p>
            </div>
            
            <div className="text-center mb-8">
              <p className="text-sm text-indigo-300/80 italic">
                {(t as any).footerTagline || (lang === 'ru' ? '╨а╨░╨▒╨╛╤В╨░╨╡╨╝ ╨╜╨░ ╤Б╤В╤Л╨║╨╡ ╤В╨╡╤Е╨╜╨╛╨╗╨╛╨│╨╕╨╣ 2024-2026: ╨║╨╗╨░╤Б╤Б╨╕╤З╨╡╤Б╨║╨░╤П ╤А╨░╨╖╤А╨░╨▒╨╛╤В╨║╨░ ├Ч AI-╨░╨▓╤В╨╛╨╝╨░╤В╨╕╨╖╨░╤Ж╨╕╤П' : lang === 'ua' ? '╨Я╤А╨░╤Ж╤О╤Ф╨╝╨╛ ╨╜╨░ ╤Б╤В╨╕╨║╤Г ╤В╨╡╤Е╨╜╨╛╨╗╨╛╨│╤Ц╨╣ 2024-2026: ╨║╨╗╨░╤Б╨╕╤З╨╜╨░ ╤А╨╛╨╖╤А╨╛╨▒╨║╨░ ├Ч AI-╨░╨▓╤В╨╛╨╝╨░╤В╨╕╨╖╨░╤Ж╤Ц╤П' : 'Working at the intersection of 2024-2026 technologies: classical development ├Ч AI automation')}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <p className="text-sm text-slate-400">┬й {new Date().getFullYear()} TemoWeb тАФ {t.rights}</p>
              <div className="flex items-center gap-6">
                <a href="#services" className="text-sm text-slate-400 hover:text-white transition-colors">{t.services}</a>
                <a href="#cases" className="text-sm text-slate-400 hover:text-white transition-colors">{t.cases}</a>
                <a href="#faq" className="text-sm text-slate-400 hover:text-white transition-colors">{t.faq}</a>
                <a href="/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">
                  {lang === 'ru' ? '╨Ъ╨╛╨╜╤Д╨╕╨┤╨╡╨╜╤Ж╨╕╨░╨╗╤М╨╜╨╛╤Б╤В╤М' : lang === 'ua' ? '╨Ъ╨╛╨╜╤Д╤Ц╨┤╨╡╨╜╤Ж╤Ц╨╣╨╜╤Ц╤Б╤В╤М' : 'Privacy'}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <a
          href="#top"
          className="fixed bottom-6 right-4 sm:right-6 z-50 shine inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-2xl hover:shadow-3xl hover:scale-110 transition-all"
          onClick={(e) => {
            e.preventDefault()
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          <span className="text-2xl">тЖС</span>
        </a>
      )}

      {/* Quick Navigation - Mobile */}
      <div className="fixed bottom-6 left-4 z-50 flex flex-col gap-2 md:hidden">
        <a href="#services" className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800/90 backdrop-blur-sm text-white shadow-xl hover:scale-110 transition-all border border-slate-700">
          <span className="text-lg">ЁЯУЛ</span>
        </a>
        <a href="#cases" className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800/90 backdrop-blur-sm text-white shadow-xl hover:scale-110 transition-all border border-slate-700">
          <span className="text-lg">ЁЯТ╝</span>
        </a>
        <a href="#contact" className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-xl hover:scale-110 transition-all">
          <span className="text-lg">тЬЙя╕П</span>
        </a>
      </div>
    </main>
  )
}
