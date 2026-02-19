'use client'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-900">
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-slate-900/80 border-b border-slate-700/50 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group">
            <img
              src="/logo.png"
              alt="TemoWeb"
              className="h-8 w-auto object-contain group-hover:scale-110 transition-transform duration-300"
            />
            <span className="text-lg font-bold tracking-tight gradient-text">TemoWeb</span>
          </a>
          <a href="/" className="text-sm font-medium text-slate-300 hover:text-indigo-400 transition-colors">
            ← Back
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 sm:p-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Terms of Service</h1>
          <p className="text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString('en-GB')}</p>

          <div className="space-y-8 text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Overview</h2>
              <p>
                These Terms of Service govern your use of the website <strong>temoweb.eu</strong> and our messaging experiences
                (Instagram / Messenger / WhatsApp) provided by TemoWeb.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. What we provide</h2>
              <p className="mb-3">We provide:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Automation consulting and implementation</li>
                <li>Lead intake via website and supported messaging channels</li>
                <li>Internal CRM-style interface for managing inquiries</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Acceptable use</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Do not send unlawful, abusive, or harmful content</li>
                <li>Do not attempt to access systems or data without authorization</li>
                <li>Do not misuse our messaging endpoints to spam or harass</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Privacy</h2>
              <p>
                Our Privacy Policy describes how we handle personal data. Please read it at <strong>/privacy</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Disclaimer</h2>
              <p>
                Our replies may include automated suggestions. They are provided “as is” and may not be complete or error-free. You are
                responsible for decisions you make based on the information provided.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Contact</h2>
              <p className="mb-3">For questions about these terms:</p>
              <ul className="space-y-2">
                <li>
                  Email:{' '}
                  <a href="mailto:info@temoweb.eu" className="text-indigo-400 hover:text-indigo-300">
                    info@temoweb.eu
                  </a>
                </li>
                <li>
                  Telegram:{' '}
                  <a href="https://t.me/temoweb" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                    @temoweb
                  </a>
                </li>
              </ul>
            </section>

            <hr className="border-white/10" />

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Кратко (RU)</h2>
              <p>
                Используя сайт <strong>temoweb.eu</strong> и наши каналы (Instagram / Messenger / WhatsApp), вы соглашаетесь, что сервис
                может отвечать автоматически, а вы не используете его для спама/вреда. Политика: <strong>/privacy</strong>.
              </p>
            </section>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-700 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400">
            <span>© {new Date().getFullYear()} TemoWeb</span>
            <a className="hover:text-indigo-300" href="/privacy">
              Privacy
            </a>
            <a className="hover:text-indigo-300" href="/data-deletion">
              Data deletion
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

