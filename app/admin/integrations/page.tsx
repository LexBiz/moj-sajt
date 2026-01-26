'use client'

import { useEffect, useMemo, useState } from 'react'

type Lang = 'en' | 'ru' | 'ua'

type PageAsset = {
  pageId: string
  pageName: string | null
  igBusinessAccountId: string | null
}

type StatusPayload = {
  ok: boolean
  token?: { exists: boolean; meta?: { len: number; prefix: string; suffix: string }; obtainedAt?: string }
  selected?: { selectedPageId: string | null; selectedIgUserId: string | null; updatedAt: string | null }
  webhook?: { totalReceived: number; lastReceivedAt: string | null; lastObject: string | null; lastSenderId: string | null; lastTextPreview: string | null }
  env?: {
    hasAccessToken: boolean
    hasIgUserId: boolean
    apiHost: string
    apiVersion: string
    openai?: { hasKey: boolean; model: string; keyMeta: { len: number; prefix: string; suffix: string } | null }
  }
  error?: string
}

function clip(s: string, max = 140) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

const I18N: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Instagram • Integrations Console',
    goal: 'Internal console: monitor IG webhooks and send test replies. For App Review, switch UI to English and record end-to-end flow.',
    backToCrm: 'Back to CRM',
    logout: 'Logout',
    loginTitle: 'Integrations • Instagram Review Demo',
    loginHint: 'Log in with the same admin password as /admin.',
    adminPassword: 'Admin password',
    login: 'Login',
    loading: 'Loading…',
    metaLoginTitle: '1) Meta Login (OAuth)',
    metaLoginDesc:
      'Click the button and complete the Meta login flow. Use an Instagram professional account connected to a Facebook Page.',
    startMetaLogin: 'Start Meta Login',
    tokenSaved: 'Token: saved',
    tokenNotSaved: 'Token: not saved',
    tipEnglish: 'Tip for recording: keep UI language in English.',
    webhookTitle: '2) Webhook (incoming DM)',
    webhookDesc:
      'In Instagram app, send a DM to the business account. This page will show the last sender ID & message preview (polled every 3s).',
    totalEvents: 'Total events',
    lastSenderId: 'Last sender ID',
    lastText: 'Last text',
    lastReceived: 'Last received',
    selectTitle: '3) Select Asset (Page → Instagram account)',
    selectDesc:
      'Meta reviewers require showing “resource selection”. Load pages and pick the one with a connected Instagram business account.',
    loadPages: 'Load Pages',
    saveSelection: 'Save Selection',
    savedAt: 'Saved',
    fbPage: 'Facebook Page',
    selectPage: 'Select a Page…',
    igAccount: 'Instagram Business Account (ig-user-id)',
    sendTitle: '4) Send Message (from App UI)',
    sendDesc:
      'For Instagram Messaging API you can only message a user who already messaged you. If recipientId is empty, we use the last sender ID captured by webhook.',
    recipientOptional: 'Recipient ID (optional)',
    useLastSender: 'Use last sender',
    messageText: 'Message text',
    sendFromApp: 'Send from App',
    sending: 'Sending…',
    usingApi: 'Using',
  },
  ru: {
    title: 'Instagram • Консоль интеграций',
    goal: 'Внутренняя консоль: мониторинг вебхуков и тестовые ответы. Для App Review включи EN и запиши end‑to‑end.',
    backToCrm: 'Назад в CRM',
    logout: 'Выйти',
    loginTitle: 'Интеграции • Instagram демо',
    loginHint: 'Вход тем же паролем, что и в /admin.',
    adminPassword: 'Пароль админа',
    login: 'Войти',
    loading: 'Загрузка…',
    metaLoginTitle: '1) Вход Meta (OAuth)',
    metaLoginDesc:
      'Нажми кнопку и пройди Meta login. Используй Instagram профессиональный аккаунт, привязанный к Facebook Page.',
    startMetaLogin: 'Запустить Meta Login',
    tokenSaved: 'Токен: сохранён',
    tokenNotSaved: 'Токен: не сохранён',
    tipEnglish: 'Совет для записи видео: язык интерфейса — English (Meta просит).',
    webhookTitle: '2) Webhook (входящий DM)',
    webhookDesc:
      'В Instagram на телефоне отправь DM в бизнес‑аккаунт. Тут появится last sender id и превью сообщения (обновление каждые 3 сек).',
    totalEvents: 'Всего событий',
    lastSenderId: 'Последний sender ID',
    lastText: 'Последний текст',
    lastReceived: 'Последнее получение',
    selectTitle: '3) Выбор ресурса (Page → Instagram аккаунт)',
    selectDesc:
      'Ревьюверы Meta требуют показать “выбор ресурса”. Загрузи страницы и выбери ту, где есть подключенный Instagram business account.',
    loadPages: 'Загрузить Pages',
    saveSelection: 'Сохранить выбор',
    savedAt: 'Сохранено',
    fbPage: 'Facebook Page',
    selectPage: 'Выбери страницу…',
    igAccount: 'Instagram Business Account (ig-user-id)',
    sendTitle: '4) Отправка сообщения (из интерфейса)',
    sendDesc:
      'Через API можно писать только тем, кто уже написал вам. Если recipientId пустой — используем last sender id из вебхука.',
    recipientOptional: 'Recipient ID (необязательно)',
    useLastSender: 'Взять last sender',
    messageText: 'Текст сообщения',
    sendFromApp: 'Отправить из приложения',
    sending: 'Отправляю…',
    usingApi: 'API',
  },
  ua: {
    title: 'Instagram • Консоль інтеграцій',
    goal: 'Внутрішня консоль: моніторинг вебхуків і тестові відповіді. Для App Review увімкни EN і запиши end‑to‑end.',
    backToCrm: 'Назад у CRM',
    logout: 'Вийти',
    loginTitle: 'Інтеграції • Instagram демо',
    loginHint: 'Вхід тим самим паролем, що й у /admin.',
    adminPassword: 'Пароль адміна',
    login: 'Увійти',
    loading: 'Завантаження…',
    metaLoginTitle: '1) Вхід Meta (OAuth)',
    metaLoginDesc:
      'Натисни кнопку і пройди Meta login. Використовуй Instagram професійний акаунт, привʼязаний до Facebook Page.',
    startMetaLogin: 'Запустити Meta Login',
    tokenSaved: 'Токен: збережено',
    tokenNotSaved: 'Токен: не збережено',
    tipEnglish: 'Порада для запису відео: мова інтерфейсу — English (Meta просить).',
    webhookTitle: '2) Webhook (вхідний DM)',
    webhookDesc:
      'В Instagram на телефоні відправ DM у бізнес‑акаунт. Тут зʼявиться last sender id і превʼю повідомлення (оновлення кожні 3 сек).',
    totalEvents: 'Усього подій',
    lastSenderId: 'Останній sender ID',
    lastText: 'Останній текст',
    lastReceived: 'Останнє отримання',
    selectTitle: '3) Вибір ресурсу (Page → Instagram акаунт)',
    selectDesc:
      'Ревʼювери Meta вимагають показати “вибір ресурсу”. Завантаж Pages і вибери ту, де є підключений Instagram business account.',
    loadPages: 'Завантажити Pages',
    saveSelection: 'Зберегти вибір',
    savedAt: 'Збережено',
    fbPage: 'Facebook Page',
    selectPage: 'Обери сторінку…',
    igAccount: 'Instagram Business Account (ig-user-id)',
    sendTitle: '4) Відправка повідомлення (з інтерфейсу)',
    sendDesc:
      'Через API можна писати лише тим, хто вже написав вам. Якщо recipientId порожній — використовуємо last sender id з вебхука.',
    recipientOptional: 'Recipient ID (необовʼязково)',
    useLastSender: 'Взяти last sender',
    messageText: 'Текст повідомлення',
    sendFromApp: 'Відправити з додатку',
    sending: 'Відправляю…',
    usingApi: 'API',
  },
}

export default function IntegrationsPage() {
  const [lang, setLang] = useState<Lang>('ru')
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${password}` }), [password])

  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [assets, setAssets] = useState<PageAsset[]>([])
  const [selectedPageId, setSelectedPageId] = useState('')
  const [selectedIgUserId, setSelectedIgUserId] = useState('')
  const [sendText, setSendText] = useState('Hello! This is a test message sent from our app UI.')
  const [recipientId, setRecipientId] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lastSendResult, setLastSendResult] = useState<any>(null)

  const t = I18N[lang]

  const loadStatus = async () => {
    setError('')
    const res = await fetch('/api/instagram/admin/status', { headers: authHeader })
    const json = (await res.json().catch(() => ({}))) as any
    if (!res.ok) throw new Error(json?.error || 'Status failed')
    setStatus(json)
    const sel = json?.selected
    if (sel?.selectedPageId) setSelectedPageId(sel.selectedPageId)
    if (sel?.selectedIgUserId) setSelectedIgUserId(sel.selectedIgUserId)
  }

  const loadAssets = async () => {
    setError('')
    const res = await fetch('/api/instagram/admin/assets', { headers: authHeader })
    const json = (await res.json().catch(() => ({}))) as any
    if (!res.ok) throw new Error(json?.error || 'Assets failed')
    setAssets(Array.isArray(json?.pages) ? json.pages : [])
  }

  const login = async () => {
    setBusy(true)
    setError('')
    try {
      await loadStatus()
      setAuthed(true)
      localStorage.setItem('adminPassword', password)
    } catch (e: any) {
      setError(String(e?.message || e || 'Login failed'))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('adminPassword')
    if (saved) setPassword(saved)
  }, [])

  useEffect(() => {
    try {
      const savedLang = (localStorage.getItem('integrations_lang') || '').trim().toLowerCase()
      if (savedLang === 'en' || savedLang === 'ru' || savedLang === 'ua') setLang(savedLang)
      else {
        const nav = (navigator.language || '').toLowerCase()
        if (nav.startsWith('uk')) setLang('ua')
        else if (nav.startsWith('ru')) setLang('ru')
        else setLang('en')
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('integrations_lang', lang)
    } catch {
      // ignore
    }
  }, [lang])

  useEffect(() => {
    if (!password) return
    // best-effort auto-login
    ;(async () => {
      try {
        await loadStatus()
        setAuthed(true)
      } catch {
        // ignore
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password])

  // Poll webhook status while authed (helps for screen recording)
  useEffect(() => {
    if (!authed) return
    const t = window.setInterval(() => {
      loadStatus().catch(() => {})
    }, 3000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed])

  const connectUrl = useMemo(() => {
    const returnTo = encodeURIComponent('/admin/integrations')
    return `/api/instagram/oauth/start?returnTo=${returnTo}`
  }, [])


  const saveSelection = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/instagram/admin/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ pageId: selectedPageId, igUserId: selectedIgUserId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Select failed')
      await loadStatus()
    } catch (e: any) {
      setError(String(e?.message || e || 'Select failed'))
    } finally {
      setBusy(false)
    }
  }

  const send = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/instagram/admin/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          recipientId: recipientId.trim() || undefined,
          text: sendText,
          igUserId: selectedIgUserId.trim() || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      setLastSendResult(json)
      if (!res.ok) throw new Error(json?.error || 'Send failed')
      await loadStatus()
    } catch (e: any) {
      setError(String(e?.message || e || 'Send failed'))
    } finally {
      setBusy(false)
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold">{t.loginTitle}</h1>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="px-2 py-1 rounded-lg bg-slate-900/70 border border-white/10 text-sm"
            >
              <option value="ru">RU</option>
              <option value="ua">UA</option>
              <option value="en">EN</option>
            </select>
          </div>
          <p className="text-slate-300 text-sm mt-2">{t.loginHint}</p>
          <div className="mt-4 space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.adminPassword}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/70 border border-white/10 text-white placeholder:text-slate-500"
              disabled={busy}
            />
            {error ? <div className="text-sm text-red-300">{error}</div> : null}
            <button
              onClick={login}
              disabled={!password || busy}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 font-semibold disabled:opacity-60"
            >
              {busy ? t.loading : t.login}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const webhook = status?.webhook
  const token = status?.token

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{t.title}</h1>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className="px-2 py-1 rounded-lg bg-slate-900/70 border border-white/10 text-sm"
              >
                <option value="ru">RU</option>
                <option value="ua">UA</option>
                <option value="en">EN</option>
              </select>
            </div>
            <p className="text-slate-300 text-sm mt-1">
              {t.goal}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                localStorage.removeItem('adminPassword')
                setAuthed(false)
                setPassword('')
              }}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold"
            >
              {t.logout}
            </button>
          </div>
        </div>

        {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-bold">{t.metaLoginTitle}</h2>
            <p className="text-slate-300 text-sm mt-2">
              {t.metaLoginDesc}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <a href={connectUrl} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold">
                {t.startMetaLogin}
              </a>
              <span className="text-xs text-slate-400">
                {token?.exists
                  ? `${t.tokenSaved} (${token?.meta?.prefix}…${token?.meta?.suffix})`
                  : t.tokenNotSaved}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">{t.tipEnglish}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-bold">{t.webhookTitle}</h2>
            <p className="text-slate-300 text-sm mt-2">
              {t.webhookDesc}
            </p>
            <div className="mt-3 text-sm space-y-1">
              <div className="text-slate-200">
                {t.totalEvents}: <span className="font-semibold">{webhook?.totalReceived ?? '—'}</span>
              </div>
              <div className="text-slate-200">
                {t.lastSenderId}: <span className="font-semibold">{webhook?.lastSenderId ?? '—'}</span>
              </div>
              <div className="text-slate-200">
                {t.lastText}:{' '}
                <span className="font-semibold">{webhook?.lastTextPreview ? clip(webhook.lastTextPreview, 120) : '—'}</span>
              </div>
              <div className="text-xs text-slate-500">
                {t.lastReceived}: {webhook?.lastReceivedAt ?? '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-bold">{t.selectTitle}</h2>
          <p className="text-slate-300 text-sm mt-2">
            {t.selectDesc}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setBusy(true)
                setError('')
                loadAssets()
                  .catch((e) => setError(String((e as any)?.message || e)))
                  .finally(() => setBusy(false))
              }}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold"
              disabled={busy}
            >
              {busy ? t.loading : t.loadPages}
            </button>
            <button
              onClick={saveSelection}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold disabled:opacity-60"
              disabled={busy || !selectedPageId || !selectedIgUserId}
            >
              {t.saveSelection}
            </button>
            {status?.selected?.updatedAt ? <span className="text-xs text-slate-500">{t.savedAt}: {status.selected.updatedAt}</span> : null}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-slate-400">{t.fbPage}</label>
              <select
                value={selectedPageId}
                onChange={(e) => {
                  const next = e.target.value
                  setSelectedPageId(next)
                  const found = assets.find((a) => a.pageId === next)
                  if (found?.igBusinessAccountId) setSelectedIgUserId(found.igBusinessAccountId)
                }}
                className="mt-1 w-full px-3 py-3 rounded-xl bg-slate-900/70 border border-white/10"
              >
                <option value="">{t.selectPage}</option>
                {assets.map((a) => (
                  <option key={a.pageId} value={a.pageId}>
                    {(a.pageName || 'Untitled Page') + (a.igBusinessAccountId ? '' : ' (no IG)')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">{t.igAccount}</label>
              <input
                value={selectedIgUserId}
                onChange={(e) => setSelectedIgUserId(e.target.value)}
                placeholder="e.g. 1784…"
                className="mt-1 w-full px-3 py-3 rounded-xl bg-slate-900/70 border border-white/10"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-bold">{t.sendTitle}</h2>
          <p className="text-slate-300 text-sm mt-2">
            {t.sendDesc}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-slate-400">{t.recipientOptional}</label>
              <input
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                placeholder={webhook?.lastSenderId ? `Use last sender: ${webhook.lastSenderId}` : 'Send a DM first to capture sender id'}
                className="mt-1 w-full px-3 py-3 rounded-xl bg-slate-900/70 border border-white/10"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  if (webhook?.lastSenderId) setRecipientId(webhook.lastSenderId)
                }}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold disabled:opacity-60"
                disabled={!webhook?.lastSenderId}
              >
                {t.useLastSender}
              </button>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-slate-400">{t.messageText}</label>
            <textarea
              value={sendText}
              onChange={(e) => setSendText(e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-3 rounded-xl bg-slate-900/70 border border-white/10"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={send}
              disabled={busy || !sendText.trim() || !selectedIgUserId.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 font-semibold disabled:opacity-60"
            >
              {busy ? t.sending : t.sendFromApp}
            </button>
            <span className="text-xs text-slate-500">
              {t.usingApi}: {status?.env?.apiHost}/{status?.env?.apiVersion}
            </span>
            <span className="text-xs text-slate-500">
              • OpenAI: {status?.env?.openai?.hasKey ? `${status?.env?.openai?.model} (${status?.env?.openai?.keyMeta?.prefix}…${status?.env?.openai?.keyMeta?.suffix})` : 'NO KEY'}
            </span>
          </div>

          {lastSendResult ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-200 overflow-auto">
              <pre>{JSON.stringify(lastSendResult, null, 2)}</pre>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}



