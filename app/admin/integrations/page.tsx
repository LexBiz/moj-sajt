'use client'

import { useEffect, useMemo, useState } from 'react'

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
  env?: { hasAccessToken: boolean; hasIgUserId: boolean; apiHost: string; apiVersion: string }
  error?: string
}

function clip(s: string, max = 140) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

export default function IntegrationsPage() {
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
          <h1 className="text-xl font-bold">Integrations • Instagram Review Demo</h1>
          <p className="text-slate-300 text-sm mt-2">
            Log in with the same admin password as <span className="font-semibold">/admin</span>.
          </p>
          <div className="mt-4 space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full px-4 py-3 rounded-xl bg-slate-900/70 border border-white/10 text-white placeholder:text-slate-500"
              disabled={busy}
            />
            {error ? <div className="text-sm text-red-300">{error}</div> : null}
            <button
              onClick={login}
              disabled={!password || busy}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 font-semibold disabled:opacity-60"
            >
              {busy ? 'Loading…' : 'Login'}
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
            <h1 className="text-2xl font-bold">Instagram • App Review Demo</h1>
            <p className="text-slate-300 text-sm mt-1">
              Goal: show end-to-end flow (Meta Login → select IG asset → send message from UI → see delivery in Instagram app).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin"
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold"
            >
              Back to CRM
            </a>
            <button
              onClick={() => {
                localStorage.removeItem('adminPassword')
                setAuthed(false)
                setPassword('')
              }}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        </div>

        {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-bold">1) Meta Login (OAuth)</h2>
            <p className="text-slate-300 text-sm mt-2">
              Click the button and complete the Meta login flow. Use an Instagram professional account connected to a Facebook Page.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <a href={connectUrl} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold">
                Start Meta Login
              </a>
              <span className="text-xs text-slate-400">
                Token: {token?.exists ? `saved (${token?.meta?.prefix}…${token?.meta?.suffix})` : 'not saved'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Tip for recording: keep UI language in English.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-bold">2) Webhook (incoming DM)</h2>
            <p className="text-slate-300 text-sm mt-2">
              In Instagram app, send a DM to the business account. This page will show the last sender ID & message preview (polled every 3s).
            </p>
            <div className="mt-3 text-sm space-y-1">
              <div className="text-slate-200">
                Total events: <span className="font-semibold">{webhook?.totalReceived ?? '—'}</span>
              </div>
              <div className="text-slate-200">
                Last sender ID: <span className="font-semibold">{webhook?.lastSenderId ?? '—'}</span>
              </div>
              <div className="text-slate-200">
                Last text: <span className="font-semibold">{webhook?.lastTextPreview ? clip(webhook.lastTextPreview, 120) : '—'}</span>
              </div>
              <div className="text-xs text-slate-500">Last received: {webhook?.lastReceivedAt ?? '—'}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-bold">3) Select Asset (Page → Instagram account)</h2>
          <p className="text-slate-300 text-sm mt-2">
            Meta reviewers require showing “resource selection”. Load pages and pick the one with a connected Instagram business account.
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
              {busy ? 'Loading…' : 'Load Pages'}
            </button>
            <button
              onClick={saveSelection}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold disabled:opacity-60"
              disabled={busy || !selectedPageId || !selectedIgUserId}
            >
              Save Selection
            </button>
            {status?.selected?.updatedAt ? <span className="text-xs text-slate-500">Saved: {status.selected.updatedAt}</span> : null}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-slate-400">Facebook Page</label>
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
                <option value="">Select a Page…</option>
                {assets.map((a) => (
                  <option key={a.pageId} value={a.pageId}>
                    {(a.pageName || 'Untitled Page') + (a.igBusinessAccountId ? '' : ' (no IG)')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Instagram Business Account (ig-user-id)</label>
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
          <h2 className="font-bold">4) Send Message (from App UI)</h2>
          <p className="text-slate-300 text-sm mt-2">
            For Instagram Messaging API you can only message a user who already messaged you. If recipientId is empty, we use the last sender ID
            captured by webhook.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-slate-400">Recipient ID (optional)</label>
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
                Use last sender
              </button>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-slate-400">Message text</label>
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
              {busy ? 'Sending…' : 'Send from App'}
            </button>
            <span className="text-xs text-slate-500">
              Using: {status?.env?.apiHost}/{status?.env?.apiVersion}
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



