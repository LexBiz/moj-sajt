/**
 * crm-utils.js — shared CRM utilities
 * Include in <head> of every CRM page (except login.html).
 * Provides: base, api, crmToken, apiFetch, uploadFile, esc, fmt, fmtFull, fmtMoney, j
 * Also runs auth check immediately and redirects to login.html if not authenticated.
 */
;(function () {
  /* ── Auth guard ───────────────────────────────────────────── */
  const tok = localStorage.getItem('crmToken')
  if (!tok) {
    location.replace('./login.html?next=' + encodeURIComponent(location.href))
    return
  }
  try {
    const parts = tok.split('.')
    if (parts.length === 3) {
      const p = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      if (p.exp && Date.now() / 1000 > p.exp) {
        localStorage.removeItem('crmToken')
        location.replace('./login.html?next=' + encodeURIComponent(location.href))
        return
      }
    }
  } catch {
    localStorage.removeItem('crmToken')
    location.replace('./login.html')
    return
  }

  /* ── Base URL & API helper ────────────────────────────────── */
  window.base = location.pathname.startsWith('/demo-crm') ? '/demo-crm' : ''
  window.api = (p) => `${window.base}${p}`

  /* ── Auth token ───────────────────────────────────────────── */
  window.crmToken = () => localStorage.getItem('crmToken') || ''

  /* ── Authenticated fetch (JSON) ───────────────────────────── */
  window.apiFetch = async (url, opts = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + window.crmToken(),
      ...(opts.headers || {}),
    }
    const resp = await fetch(url, { ...opts, headers })
    if (resp.status === 401) {
      localStorage.removeItem('crmToken')
      localStorage.removeItem('crmUser')
      location.href = `${window.base}/login.html`
    }
    return resp
  }

  /**
   * Upload a single File to the CRM documents endpoint.
   * Returns { ok, url, filename } or { ok: false, error }.
   *
   * Usage:
   *   const result = await uploadFile(jobId, file)
   *   if (result.ok) console.log(result.url, result.filename)
   */
  window.uploadFile = async (jobId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    try {
      const resp = await fetch(window.api(`/api/crm/jobs/${jobId}/documents/upload`), {
        method: 'POST',
        // No Content-Type header — browser sets multipart/form-data with boundary automatically
        headers: { 'Authorization': 'Bearer ' + window.crmToken() },
        body: fd,
      })
      const data = await resp.json().catch(() => null)
      if (!resp.ok || !data?.ok) return { ok: false, error: data?.error || 'Upload failed' }
      return { ok: true, url: data.url, filename: data.filename || file.name }
    } catch (e) {
      return { ok: false, error: String(e?.message || e) }
    }
  }

  /* ── HTML escape ──────────────────────────────────────────── */
  window.esc = (s) =>
    String(s || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')

  /* ── Date / money formatters ──────────────────────────────── */
  window.fmt = (iso) => {
    try { return new Date(iso).toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
    catch { return '—' }
  }
  window.fmtFull = (iso) => {
    try { return new Date(iso).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    catch { return '—' }
  }
  window.fmtMoney = (n) =>
    `${Number(n || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`

  /* ── Safe JSON helper ─────────────────────────────────────── */
  window.j = async (r) => { try { return await r.json() } catch { return null } }

  /* ── Custom confirm modal ─────────────────────────────────── */
  // Injects modal HTML into body on first call
  function _ensureConfirmModal() {
    if (document.getElementById('_crmConfirmOverlay')) return
    const el = document.createElement('div')
    el.id = '_crmConfirmOverlay'
    el.innerHTML = `
      <style>
        #_crmConfirmOverlay{display:none;position:fixed;inset:0;z-index:99999;background:rgba(6,14,26,.78);backdrop-filter:blur(12px);align-items:center;justify-content:center}
        #_crmConfirmOverlay.open{display:flex}
        #_crmConfirmBox{background:linear-gradient(160deg,#112338,#1A3254);border:1px solid rgba(74,150,250,.32);border-radius:22px;padding:32px 32px 28px;width:100%;max-width:400px;box-shadow:0 32px 80px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.05) inset;text-align:center;animation:_crmIn .2s cubic-bezier(.34,1.56,.64,1)}
        @keyframes _crmIn{from{opacity:0;transform:scale(.9) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        #_crmConfirmLogo{width:56px;height:56px;border-radius:14px;object-fit:cover;margin:0 auto 18px;display:block;box-shadow:0 4px 20px rgba(36,120,242,.35),0 0 0 3px rgba(74,150,250,.2)}
        #_crmConfirmTitle{font-size:18px;font-weight:800;color:#F2F8FF;margin-bottom:10px;line-height:1.3}
        #_crmConfirmBody{font-size:13.5px;color:#AACCE8;line-height:1.65;margin-bottom:26px;white-space:pre-line}
        #_crmConfirmBtns{display:flex;gap:10px;justify-content:center}
        #_crmConfirmCancel{flex:1;padding:12px 0;border-radius:11px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);color:#AACCE8;font:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:all .18s}
        #_crmConfirmCancel:hover{background:rgba(255,255,255,.13);color:#F2F8FF;border-color:rgba(255,255,255,.25)}
        #_crmConfirmOk{flex:1;padding:12px 0;border-radius:11px;border:none;background:linear-gradient(135deg,#2070F0,#4A96FA);color:#fff;font:inherit;font-size:14px;font-weight:800;cursor:pointer;transition:all .18s;box-shadow:0 4px 18px rgba(36,120,242,.5)}
        #_crmConfirmOk:hover{background:linear-gradient(135deg,#2878F8,#58A4FF);transform:translateY(-1px);box-shadow:0 6px 24px rgba(36,120,242,.65)}
        #_crmConfirmOk.danger{background:linear-gradient(135deg,#C8352A,#F04444);box-shadow:0 4px 18px rgba(200,53,42,.45)}
        #_crmConfirmOk.danger:hover{background:linear-gradient(135deg,#D84040,#FF5555);box-shadow:0 6px 24px rgba(200,53,42,.6)}
      </style>
      <div id="_crmConfirmBox">
        <img id="_crmConfirmLogo" src="./logo1.jpg" onerror="this.style.display='none'" />
        <div id="_crmConfirmTitle">Potvrdit akci</div>
        <div id="_crmConfirmBody"></div>
        <div id="_crmConfirmBtns">
          <button id="_crmConfirmCancel">Zrušit</button>
          <button id="_crmConfirmOk">Potvrdit</button>
        </div>
      </div>`
    document.body.appendChild(el)
  }

  /* ── Toast notifications ──────────────────────────────────── */
  let _toastWrap = null
  function _ensureToastWrap() {
    if (_toastWrap) return _toastWrap
    const s = document.createElement('style')
    s.textContent = `
      #_crmToastWrap{position:fixed;top:20px;right:20px;z-index:999999;display:flex;flex-direction:column;gap:10px;pointer-events:none}
      .crm-toast{pointer-events:all;display:flex;align-items:flex-start;gap:12px;min-width:280px;max-width:380px;padding:14px 16px 14px 14px;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.22),0 1px 0 rgba(255,255,255,.08) inset;backdrop-filter:blur(14px);animation:_toastIn .32s cubic-bezier(.34,1.56,.64,1) both;border:1px solid rgba(255,255,255,.12);font-family:inherit}
      .crm-toast.out{animation:_toastOut .28s ease-in both}
      @keyframes _toastIn{from{opacity:0;transform:translateX(60px) scale(.9)}to{opacity:1;transform:translateX(0) scale(1)}}
      @keyframes _toastOut{to{opacity:0;transform:translateX(60px) scale(.85)}}
      .crm-toast.success{background:linear-gradient(135deg,rgba(8,130,82,.95),rgba(14,180,110,.92))}
      .crm-toast.error{background:linear-gradient(135deg,rgba(170,28,28,.95),rgba(220,50,50,.92))}
      .crm-toast.warn{background:linear-gradient(135deg,rgba(160,90,0,.95),rgba(220,130,0,.92))}
      .crm-toast.info{background:linear-gradient(135deg,rgba(20,70,180,.95),rgba(40,110,240,.92))}
      .crm-toast-icon{font-size:20px;flex-shrink:0;line-height:1;margin-top:1px}
      .crm-toast-body{flex:1;min-width:0}
      .crm-toast-title{font-size:13px;font-weight:800;color:#fff;line-height:1.3;margin-bottom:2px}
      .crm-toast-msg{font-size:12px;color:rgba(255,255,255,.82);line-height:1.45;white-space:pre-line;word-break:break-word}
      .crm-toast-close{width:20px;height:20px;border-radius:6px;border:none;background:rgba(255,255,255,.16);color:#fff;font-size:13px;line-height:1;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background .15s;margin-top:0;padding:0}
      .crm-toast-close:hover{background:rgba(255,255,255,.3)}
    `
    document.head.appendChild(s)
    const w = document.createElement('div')
    w.id = '_crmToastWrap'
    document.body.appendChild(w)
    return (_toastWrap = w)
  }
  const TOAST_META = {
    success: { icon: '✅', title: 'Úspěch' },
    error:   { icon: '❌', title: 'Chyba' },
    warn:    { icon: '⚠️', title: 'Upozornění' },
    info:    { icon: 'ℹ️', title: 'Info' },
  }
  window.crmToast = function(message, type = 'info', duration = 4500) {
    const wrap = _ensureToastWrap()
    const meta = TOAST_META[type] || TOAST_META.info
    const t = document.createElement('div')
    t.className = `crm-toast ${type}`
    t.innerHTML = `
      <div class="crm-toast-icon">${meta.icon}</div>
      <div class="crm-toast-body">
        <div class="crm-toast-title">${meta.title}</div>
        <div class="crm-toast-msg">${String(message || '').replaceAll('<','&lt;')}</div>
      </div>
      <button class="crm-toast-close" title="Zavřít">✕</button>`
    wrap.appendChild(t)
    const dismiss = () => {
      t.classList.add('out')
      setTimeout(() => t.remove(), 300)
    }
    t.querySelector('.crm-toast-close').addEventListener('click', dismiss)
    if (duration > 0) setTimeout(dismiss, duration)
    return dismiss
  }

  /**
   * crmPrompt(message, opts?) → Promise<string|null>
   * opts: { title, placeholder, defaultValue, okLabel, cancelLabel }
   */
  window.crmPrompt = function(message, opts = {}) {
    return new Promise((resolve) => {
      _ensureConfirmModal()
      const overlay = document.getElementById('_crmConfirmOverlay')
      document.getElementById('_crmConfirmTitle').textContent = opts.title || 'Zadejte hodnotu'
      const bodyEl = document.getElementById('_crmConfirmBody')
      bodyEl.innerHTML = `<div style="margin-bottom:12px;white-space:pre-line">${String(message || '').replaceAll('<','&lt;')}</div><input id="_crmPromptInput" placeholder="${String(opts.placeholder||'').replaceAll('"','&quot;')}" style="width:100%;box-sizing:border-box;background:rgba(255,255,255,.08);border:1px solid rgba(74,150,250,.35);border-radius:9px;color:#F2F8FF;font:inherit;font-size:14px;padding:9px 12px;outline:none;transition:border-color .15s" />`
      const input = document.getElementById('_crmPromptInput')
      if (opts.defaultValue != null) input.value = opts.defaultValue
      const okBtn  = document.getElementById('_crmConfirmOk')
      const canBtn = document.getElementById('_crmConfirmCancel')
      okBtn.textContent  = opts.okLabel     || 'OK'
      canBtn.textContent = opts.cancelLabel || 'Zrušit'
      canBtn.style.display = ''
      okBtn.className = ''
      overlay.classList.add('open')
      setTimeout(() => input.focus(), 80)
      const close = (val) => {
        overlay.classList.remove('open')
        bodyEl.textContent = ''
        okBtn.removeEventListener('click', onOk)
        canBtn.removeEventListener('click', onCancel)
        overlay.removeEventListener('click', onOut)
        input.removeEventListener('keydown', onKey)
        resolve(val)
      }
      const onOk     = () => close(input.value)
      const onCancel = () => close(null)
      const onOut    = (e) => { if (e.target === overlay) close(null) }
      const onKey    = (e) => { if (e.key === 'Enter') close(input.value); if (e.key === 'Escape') close(null) }
      okBtn.addEventListener('click', onOk)
      canBtn.addEventListener('click', onCancel)
      overlay.addEventListener('click', onOut)
      input.addEventListener('keydown', onKey)
    })
  }

  /**
   * crmAlert(message, opts?) → Promise<void>
   * opts: { title, type ('success'|'error'|'warn'|'info') }
   */
  window.crmAlert = function(message, opts = {}) {
    const type = opts.type || (opts.danger ? 'error' : 'info')
    const meta = TOAST_META[type] || TOAST_META.info
    return new Promise((resolve) => {
      _ensureConfirmModal()
      const overlay = document.getElementById('_crmConfirmOverlay')
      document.getElementById('_crmConfirmTitle').textContent = opts.title || meta.title
      document.getElementById('_crmConfirmBody').textContent = message || ''
      const okBtn  = document.getElementById('_crmConfirmOk')
      const canBtn = document.getElementById('_crmConfirmCancel')
      okBtn.textContent  = opts.okLabel || 'OK'
      canBtn.style.display = 'none'
      okBtn.className = opts.danger ? 'danger' : ''
      overlay.classList.add('open')
      const close = () => {
        overlay.classList.remove('open')
        canBtn.style.display = ''
        okBtn.removeEventListener('click', close)
        overlay.removeEventListener('click', onOut)
        resolve()
      }
      const onOut = (e) => { if (e.target === overlay) close() }
      okBtn.addEventListener('click', close)
      overlay.addEventListener('click', onOut)
    })
  }

  /**
   * crmConfirm(message, options?) → Promise<boolean>
   * options: { title, okLabel, cancelLabel, danger }
   */
  window.crmConfirm = function(message, opts = {}) {
    return new Promise((resolve) => {
      _ensureConfirmModal()
      const overlay = document.getElementById('_crmConfirmOverlay')
      const box     = document.getElementById('_crmConfirmBox')
      document.getElementById('_crmConfirmTitle').textContent  = opts.title || 'Potvrdit akci'
      document.getElementById('_crmConfirmBody').textContent   = message || ''
      const okBtn   = document.getElementById('_crmConfirmOk')
      const canBtn  = document.getElementById('_crmConfirmCancel')
      okBtn.textContent  = opts.okLabel     || 'Potvrdit'
      canBtn.textContent = opts.cancelLabel || 'Zrušit'
      okBtn.className    = opts.danger ? 'danger' : ''

      overlay.classList.add('open')

      function close(result) {
        overlay.classList.remove('open')
        okBtn.removeEventListener('click', onOk)
        canBtn.removeEventListener('click', onCancel)
        overlay.removeEventListener('click', onOutside)
        resolve(result)
      }
      const onOk      = () => close(true)
      const onCancel  = () => close(false)
      const onOutside = (e) => { if (e.target === overlay) close(false) }

      okBtn.addEventListener('click', onOk)
      canBtn.addEventListener('click', onCancel)
      overlay.addEventListener('click', onOutside)
    })
  }
})()
