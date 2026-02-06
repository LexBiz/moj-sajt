'use client'

export default function DataDeletionInstructions() {
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
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">User Data Deletion Instructions</h1>
          <p className="text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString('en-GB')}</p>

          <div className="space-y-8 text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">How to request deletion</h2>
              <p className="mb-3">
                If you interacted with TemoWeb via our website (<strong>temoweb.eu</strong>) or via messaging channels (Instagram /
                Messenger / WhatsApp), you can request deletion of your data.
              </p>
              <p className="mb-3">Please send us a message with:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  The channel you used (Instagram / Messenger / WhatsApp / Website)
                </li>
                <li>
                  Your identifier in that channel (e.g., WhatsApp phone number, Instagram sender ID, Messenger sender ID, or the contact you
                  provided on the website)
                </li>
                <li>Request text: “Delete my data”</li>
              </ul>
              <p className="mt-4">
                Contact us via email:{' '}
                <a href="mailto:lexbizai@gmail.com" className="text-indigo-400 hover:text-indigo-300">
                  lexbizai@gmail.com
                </a>{' '}
                or Telegram:{' '}
                <a href="https://t.me/temoxa_1" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                  @temoxa_1
                </a>
                .
              </p>
              <p className="mt-3 text-slate-400">
                We will complete deletion within 30 days and confirm once done.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">What we delete</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Stored conversation history (if any) for the channel</li>
                <li>Stored lead/contact record (if created)</li>
                <li>Related internal notes associated with that lead</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">What we may retain</h2>
              <p>
                If required by law, we may retain minimal records for compliance, security, or fraud prevention.
              </p>
            </section>

            <hr className="border-white/10" />

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Коротко (RU)</h2>
              <p className="mb-3">
                Чтобы удалить данные, напишите нам на{' '}
                <a href="mailto:lexbizai@gmail.com" className="text-indigo-400 hover:text-indigo-300">
                  lexbizai@gmail.com
                </a>{' '}
                или в Telegram{' '}
                <a href="https://t.me/temoxa_1" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                  @temoxa_1
                </a>
                .
              </p>
              <p className="mb-3">В сообщении укажите:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Канал (Instagram / Messenger / WhatsApp / Website)</li>
                <li>Ваш идентификатор в канале (номер/ID/контакт)</li>
                <li>Текст: «Удалить мои данные»</li>
              </ul>
              <p className="mt-3 text-slate-400">Срок обработки запроса: до 30 дней.</p>
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
            <a className="hover:text-indigo-300" href="/terms">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

