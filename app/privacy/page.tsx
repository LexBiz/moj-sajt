'use client'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-slate-900/80 border-b border-slate-700/50 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group">
            <img 
              src="/logo.png" 
              alt="TemoWeb" 
              className="h-8 w-auto object-contain group-hover:scale-110 transition-transform duration-300"
            />
            <span className="text-lg font-bold tracking-tight gradient-text">
              TemoWeb
            </span>
          </a>
          <a
            href="/"
            className="text-sm font-medium text-slate-300 hover:text-indigo-400 transition-colors"
          >
            ← Назад на главную
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 sm:p-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Политика конфиденциальности
          </h1>
          <p className="text-slate-400 mb-8">
            Дата последнего обновления: {new Date().toLocaleDateString('ru-RU')}
          </p>

          <div className="space-y-8 text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Общие положения</h2>
              <p>
                Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей сайта <strong>temoweb.eu</strong> (далее — «Сайт»).
              </p>
              <p className="mt-3">
                Используя Сайт и оставляя свои персональные данные, вы соглашаетесь с условиями настоящей Политики.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Какие данные мы собираем</h2>
              <p className="mb-3">При заполнении формы обратной связи мы собираем:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Имя</strong> — для персонализированного обращения</li>
                <li><strong>Телефон</strong> — для связи с вами по вашему запросу</li>
                <li><strong>Дата и время заявки</strong> — для учета обращений</li>
              </ul>
              <p className="mt-3">
                Мы <strong>не собираем</strong> данные платежных карт, паспортные данные или иную конфиденциальную информацию.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Цели обработки данных</h2>
              <p className="mb-3">Ваши данные используются исключительно для:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Связи с вами для обсуждения вашего запроса</li>
                <li>Предоставления консультации</li>
                <li>Подготовки коммерческого предложения</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Правовые основания обработки</h2>
              <p>
                Обработка персональных данных осуществляется на основании <strong>вашего согласия</strong>, которое вы предоставляете при отправке формы, а также в соответствии с:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>GDPR (General Data Protection Regulation) — для пользователей из ЕС</li>
                <li>Законом Чехии о защите персональных данных</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Хранение данных</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Данные хранятся на защищенном сервере в Германии (Hetzner)</li>
                <li>Доступ к данным имеет только владелец сайта</li>
                <li>Срок хранения: <strong>до выполнения заявки + 1 год</strong> для архива</li>
                <li>После истечения срока данные удаляются безвозвратно</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Передача данных третьим лицам</h2>
              <p>
                Мы <strong>не продаем, не передаем и не раскрываем</strong> ваши персональные данные третьим лицам, за исключением случаев, предусмотренных законом.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Ваши права</h2>
              <p className="mb-3">В соответствии с GDPR вы имеете право:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>На доступ</strong> — получить копию ваших данных</li>
                <li><strong>На исправление</strong> — исправить неточные данные</li>
                <li><strong>На удаление</strong> — запросить удаление ваших данных</li>
                <li><strong>На отзыв согласия</strong> — в любой момент</li>
              </ul>
              <p className="mt-3">
                Для реализации этих прав свяжитесь с нами: <a href="tel:+420723995896" className="text-indigo-400 hover:text-indigo-300">+420 723 995 896</a> или <a href="https://t.me/temoxa_1" className="text-indigo-400 hover:text-indigo-300">Telegram</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Cookies и аналитика</h2>
              <p>
                Мы используем <strong>Microsoft Clarity</strong> для анализа поведения пользователей на сайте (анонимные данные о кликах и скролле). Это помогает улучшать удобство сайта.
              </p>
              <p className="mt-3">
                Вы можете отключить cookies в настройках браузера.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Безопасность</h2>
              <p>
                Мы применяем технические и организационные меры для защиты данных:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>SSL-шифрование (HTTPS)</li>
                <li>Защита от несанкционированного доступа</li>
                <li>Резервное копирование</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Изменения в Политике</h2>
              <p>
                Мы можем обновлять настоящую Политику. Актуальная версия всегда доступна по адресу: <strong>temoweb.eu/privacy</strong>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Контакты</h2>
              <p className="mb-3">По вопросам обработки персональных данных:</p>
              <ul className="space-y-2">
                <li>📞 Телефон: <a href="tel:+420723995896" className="text-indigo-400 hover:text-indigo-300">+420 723 995 896</a></li>
                <li>✈️ Telegram: <a href="https://t.me/temoxa_1" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">@temoxa_1</a></li>
                <li>📱 WhatsApp: <a href="https://wa.me/380960494917" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">+380 96 049 49 17</a></li>
              </ul>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-center text-sm text-slate-400">
            © {new Date().getFullYear()} TemoWeb — Все права защищены
          </p>
        </div>
      </footer>
    </div>
  )
}


