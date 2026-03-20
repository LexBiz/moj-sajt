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

  /* ══════════════════════════════════════════════════════════
     BEAUTIFUL CRM UI: Toasts + Modals
     ══════════════════════════════════════════════════════════ */
  const _CRM_STYLES = `
    /* ── TOAST ─────────────────────────────────────────────── */
    #_crmToastWrap{position:fixed;top:22px;right:22px;z-index:2147483646;display:flex;flex-direction:column;gap:10px;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif}
    .crm-toast{pointer-events:all;position:relative;display:flex;align-items:flex-start;gap:13px;min-width:300px;max-width:400px;padding:0;border-radius:18px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35),0 4px 20px rgba(0,0,0,.2),0 0 0 1px rgba(255,255,255,.1) inset;animation:_crmTstIn .4s cubic-bezier(.34,1.56,.64,1) both}
    .crm-toast.out{animation:_crmTstOut .3s cubic-bezier(.4,0,1,1) both}
    @keyframes _crmTstIn{from{opacity:0;transform:translateX(110%) scale(.85)}to{opacity:1;transform:translateX(0) scale(1)}}
    @keyframes _crmTstOut{to{opacity:0;transform:translateX(80%) scale(.88)}}
    .crm-t-inner{display:flex;align-items:flex-start;gap:13px;padding:15px 14px 13px 15px;width:100%;position:relative;z-index:1}
    .crm-t-stripe{position:absolute;left:0;top:0;bottom:0;width:4px;z-index:2}
    .crm-t-icowrap{width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;position:relative}
    .crm-t-content{flex:1;min-width:0}
    .crm-t-title{font-size:13px;font-weight:800;line-height:1.25;margin-bottom:3px;letter-spacing:-.1px}
    .crm-t-msg{font-size:12.5px;line-height:1.5;word-break:break-word;opacity:.88}
    .crm-t-close{width:24px;height:24px;border-radius:8px;border:none;font-size:12px;line-height:1;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .15s;margin-top:-1px;padding:0}
    .crm-t-bar{position:absolute;bottom:0;left:0;height:3px;border-radius:0 2px 0 0;animation:_crmBar linear both}
    @keyframes _crmBar{from{width:100%}to{width:0%}}
    .crm-toast.success .crm-t-stripe,.crm-toast.success .crm-t-bar{background:linear-gradient(to bottom,#10B981,#059669)}
    .crm-toast.success .crm-t-icowrap{background:rgba(16,185,129,.15)}
    .crm-toast.success .crm-t-title{color:#064e3b}
    .crm-toast.success .crm-t-msg{color:#065f46}
    .crm-toast.success .crm-t-close{background:rgba(16,185,129,.12);color:#059669}
    .crm-toast.success .crm-t-close:hover{background:rgba(16,185,129,.25)}
    .crm-toast.success{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid rgba(16,185,129,.25)}
    .crm-toast.error .crm-t-stripe,.crm-toast.error .crm-t-bar{background:linear-gradient(to bottom,#EF4444,#DC2626)}
    .crm-toast.error .crm-t-icowrap{background:rgba(239,68,68,.12)}
    .crm-toast.error .crm-t-title{color:#7f1d1d}
    .crm-toast.error .crm-t-msg{color:#991b1b}
    .crm-toast.error .crm-t-close{background:rgba(239,68,68,.1);color:#DC2626}
    .crm-toast.error .crm-t-close:hover{background:rgba(239,68,68,.22)}
    .crm-toast.error{background:linear-gradient(135deg,#fff5f5,#fee2e2);border:1px solid rgba(239,68,68,.22)}
    .crm-toast.warn .crm-t-stripe,.crm-toast.warn .crm-t-bar{background:linear-gradient(to bottom,#F59E0B,#D97706)}
    .crm-toast.warn .crm-t-icowrap{background:rgba(245,158,11,.12)}
    .crm-toast.warn .crm-t-title{color:#78350f}
    .crm-toast.warn .crm-t-msg{color:#92400e}
    .crm-toast.warn .crm-t-close{background:rgba(245,158,11,.1);color:#D97706}
    .crm-toast.warn .crm-t-close:hover{background:rgba(245,158,11,.22)}
    .crm-toast.warn{background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid rgba(245,158,11,.22)}
    .crm-toast.info .crm-t-stripe,.crm-toast.info .crm-t-bar{background:linear-gradient(to bottom,#3B82F6,#2563EB)}
    .crm-toast.info .crm-t-icowrap{background:rgba(59,130,246,.12)}
    .crm-toast.info .crm-t-title{color:#1e3a8a}
    .crm-toast.info .crm-t-msg{color:#1d4ed8}
    .crm-toast.info .crm-t-close{background:rgba(59,130,246,.1);color:#2563EB}
    .crm-toast.info .crm-t-close:hover{background:rgba(59,130,246,.22)}
    .crm-toast.info{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid rgba(59,130,246,.22)}

    /* ── MODAL OVERLAY ──────────────────────────────────────── */
    #_crmMdlOverlay{display:none;position:fixed;inset:0;z-index:2147483645;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif}
    #_crmMdlOverlay.open{display:flex}
    #_crmMdlOverlay::before{content:'';position:absolute;inset:0;background:rgba(8,15,30,.72);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
    #_crmMdlBox{position:relative;width:100%;max-width:420px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 40px 100px rgba(0,0,0,.45),0 8px 32px rgba(0,0,0,.2),0 0 0 1px rgba(255,255,255,.9);animation:_crmMdlIn .38s cubic-bezier(.34,1.46,.64,1)}
    #_crmMdlBox.out{animation:_crmMdlOut .22s ease-in both}
    @keyframes _crmMdlIn{from{opacity:0;transform:scale(.82) translateY(24px)}to{opacity:1;transform:scale(1) translateY(0)}}
    @keyframes _crmMdlOut{to{opacity:0;transform:scale(.88) translateY(12px)}}
    #_crmMdlTop{padding:32px 28px 0;text-align:center}
    #_crmMdlIconRing{width:68px;height:68px;border-radius:20px;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;font-size:30px;position:relative}
    #_crmMdlIconRing::after{content:'';position:absolute;inset:-4px;border-radius:24px;opacity:.18;z-index:-1}
    #_crmMdlIconRing.t-confirm{background:linear-gradient(145deg,#EEF4FF,#DBEAFE)}
    #_crmMdlIconRing.t-confirm::after{background:#3B82F6}
    #_crmMdlIconRing.t-danger{background:linear-gradient(145deg,#FFF5F5,#FEE2E2)}
    #_crmMdlIconRing.t-danger::after{background:#EF4444}
    #_crmMdlIconRing.t-success{background:linear-gradient(145deg,#F0FDF4,#DCFCE7)}
    #_crmMdlIconRing.t-success::after{background:#10B981}
    #_crmMdlIconRing.t-warn{background:linear-gradient(145deg,#FFFBEB,#FEF3C7)}
    #_crmMdlIconRing.t-warn::after{background:#F59E0B}
    #_crmMdlIconRing.t-info{background:linear-gradient(145deg,#EFF6FF,#DBEAFE)}
    #_crmMdlIconRing.t-info::after{background:#3B82F6}
    #_crmMdlTitle{font-size:19px;font-weight:900;color:#0F172A;letter-spacing:-.3px;margin-bottom:8px;line-height:1.25}
    #_crmMdlBody{font-size:14px;color:#475569;line-height:1.65;white-space:pre-line;padding-bottom:4px}
    #_crmMdlBodyWrap{padding:14px 28px 0}
    #_crmMdlPromptInput{width:100%;box-sizing:border-box;margin-top:14px;background:#F8FAFF;border:1.5px solid #CBD5E1;border-radius:12px;color:#0F172A;font:inherit;font-size:15px;font-weight:600;padding:11px 15px;outline:none;transition:border-color .15s,box-shadow .15s}
    #_crmMdlPromptInput:focus{border-color:#3B82F6;box-shadow:0 0 0 4px rgba(59,130,246,.12)}
    #_crmMdlFoot{padding:22px 24px 24px;display:flex;gap:10px}
    #_crmMdlCancel{flex:1;padding:13px 0;border-radius:13px;border:1.5px solid #E2E8F0;background:#F8FAFC;color:#64748B;font:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:all .18s;letter-spacing:-.1px}
    #_crmMdlCancel:hover{background:#F1F5F9;border-color:#CBD5E1;color:#334155;transform:translateY(-1px)}
    #_crmMdlCancel:active{transform:translateY(0)}
    #_crmMdlOk{flex:1.4;padding:13px 0;border-radius:13px;border:none;color:#fff;font:inherit;font-size:14px;font-weight:800;cursor:pointer;transition:all .18s;letter-spacing:-.1px;position:relative;overflow:hidden}
    #_crmMdlOk::after{content:'';position:absolute;inset:0;background:rgba(255,255,255,0);transition:background .15s}
    #_crmMdlOk:hover::after{background:rgba(255,255,255,.12)}
    #_crmMdlOk:active::after{background:rgba(0,0,0,.08)}
    #_crmMdlOk:hover{transform:translateY(-1px);box-shadow:0 8px 28px var(--_mdlok-shadow,rgba(37,99,235,.5))!important}
    #_crmMdlOk.t-confirm,#_crmMdlOk.t-info{background:linear-gradient(135deg,#2563EB,#3B82F6);box-shadow:0 4px 16px rgba(37,99,235,.38);--_mdlok-shadow:rgba(37,99,235,.55)}
    #_crmMdlOk.t-danger{background:linear-gradient(135deg,#DC2626,#EF4444);box-shadow:0 4px 16px rgba(220,38,38,.38);--_mdlok-shadow:rgba(220,38,38,.55)}
    #_crmMdlOk.t-success{background:linear-gradient(135deg,#059669,#10B981);box-shadow:0 4px 16px rgba(5,150,105,.38);--_mdlok-shadow:rgba(5,150,105,.55)}
    #_crmMdlOk.t-warn{background:linear-gradient(135deg,#D97706,#F59E0B);box-shadow:0 4px 16px rgba(217,119,6,.38);--_mdlok-shadow:rgba(217,119,6,.55)}
    #_crmMdlDivider{height:1px;background:linear-gradient(to right,transparent,#E2E8F0 20%,#E2E8F0 80%,transparent);margin:0 24px}
  `

  const _TOAST_META = {
    success: { icon: '✓',  emoji: '✅', title: 'Úspěch',      ring: 't-success' },
    error:   { icon: '✕',  emoji: '❌', title: 'Chyba',       ring: 't-danger'  },
    warn:    { icon: '!',  emoji: '⚠️', title: 'Upozornění',  ring: 't-warn'    },
    info:    { icon: 'i',  emoji: 'ℹ️', title: 'Info',        ring: 't-info'    },
    confirm: { icon: '?',  emoji: '❓', title: 'Potvrdit',    ring: 't-confirm' },
  }

  let _stylesInjected = false
  function _injectStyles() {
    if (_stylesInjected) return
    _stylesInjected = true
    const s = document.createElement('style')
    s.textContent = _CRM_STYLES
    document.head.appendChild(s)
  }

  /* ── TOAST ──────────────────────────────────────────────── */
  let _toastWrap = null
  function _ensureToastWrap() {
    _injectStyles()
    if (_toastWrap && document.body.contains(_toastWrap)) return _toastWrap
    const w = document.createElement('div')
    w.id = '_crmToastWrap'
    document.body.appendChild(w)
    return (_toastWrap = w)
  }

  window.crmToast = function(message, type = 'info', duration = 5000) {
    const wrap = _ensureToastWrap()
    const meta = _TOAST_META[type] || _TOAST_META.info
    const t = document.createElement('div')
    t.className = `crm-toast ${type}`
    const barStyle = duration > 0 ? `style="animation-duration:${duration}ms"` : ''
    t.innerHTML = `
      <div class="crm-t-stripe"></div>
      <div class="crm-t-inner">
        <div class="crm-t-icowrap">${meta.emoji}</div>
        <div class="crm-t-content">
          <div class="crm-t-title">${meta.title}</div>
          <div class="crm-t-msg">${String(message || '').replaceAll('<','&lt;').replaceAll('\n','<br>')}</div>
        </div>
        <button class="crm-t-close" title="Zavřít">✕</button>
      </div>
      ${duration > 0 ? `<div class="crm-t-bar" ${barStyle}></div>` : ''}`
    wrap.appendChild(t)
    const dismiss = () => {
      if (!document.body.contains(t)) return
      t.classList.add('out')
      setTimeout(() => t.remove(), 320)
    }
    t.querySelector('.crm-t-close').addEventListener('click', dismiss)
    if (duration > 0) setTimeout(dismiss, duration)
    return dismiss
  }

  /* ── MODAL ──────────────────────────────────────────────── */
  function _ensureModal() {
    _injectStyles()
    if (document.getElementById('_crmMdlOverlay')) return
    const el = document.createElement('div')
    el.id = '_crmMdlOverlay'
    el.innerHTML = `
      <div id="_crmMdlBox">
        <div id="_crmMdlTop">
          <div id="_crmMdlIconRing" class="t-confirm">❓</div>
          <div id="_crmMdlTitle">Potvrdit akci</div>
        </div>
        <div id="_crmMdlBodyWrap">
          <div id="_crmMdlBody"></div>
        </div>
        <div id="_crmMdlDivider" style="margin-top:20px"></div>
        <div id="_crmMdlFoot">
          <button id="_crmMdlCancel">Zrušit</button>
          <button id="_crmMdlOk" class="t-confirm">Potvrdit</button>
        </div>
      </div>`
    document.body.appendChild(el)
  }

  function _openModal({ title, body, bodyHtml, icon, ringClass, okLabel, okClass, cancelLabel, showCancel, onOk, onCancel }) {
    _ensureModal()
    const overlay  = document.getElementById('_crmMdlOverlay')
    const box      = document.getElementById('_crmMdlBox')
    const iconEl   = document.getElementById('_crmMdlIconRing')
    const titleEl  = document.getElementById('_crmMdlTitle')
    const bodyEl   = document.getElementById('_crmMdlBody')
    const okBtn    = document.getElementById('_crmMdlOk')
    const canBtn   = document.getElementById('_crmMdlCancel')

    box.classList.remove('out')
    iconEl.className = `t-${ringClass}`
    iconEl.textContent = icon
    titleEl.textContent = title
    if (bodyHtml != null) bodyEl.innerHTML = bodyHtml
    else bodyEl.textContent = body || ''
    okBtn.textContent = okLabel || 'OK'
    okBtn.className = `t-${okClass || ringClass}`
    canBtn.textContent = cancelLabel || 'Zrušit'
    canBtn.style.display = showCancel ? '' : 'none'
    okBtn.style.flex = showCancel ? '1.4' : '1'
    overlay.classList.add('open')

    const close = (result) => {
      box.classList.add('out')
      setTimeout(() => { overlay.classList.remove('open'); box.classList.remove('out') }, 200)
      okBtn.removeEventListener('click', _onOk)
      canBtn.removeEventListener('click', _onCancel)
      overlay.removeEventListener('click', _onOut)
      if (result) onOk?.(); else onCancel?.()
    }
    const _onOk     = () => close(true)
    const _onCancel = () => close(false)
    const _onOut    = (e) => { if (e.target === overlay) close(false) }

    okBtn.addEventListener('click', _onOk)
    canBtn.addEventListener('click', _onCancel)
    overlay.addEventListener('click', _onOut)
  }

  window.crmConfirm = function(message, opts = {}) {
    return new Promise((resolve) => {
      _openModal({
        title: opts.title || 'Potvrdit akci',
        body: message,
        icon: opts.danger ? '⚠️' : '❓',
        ringClass: opts.danger ? 'danger' : 'confirm',
        okLabel: opts.okLabel || 'Potvrdit',
        okClass: opts.danger ? 'danger' : 'confirm',
        cancelLabel: opts.cancelLabel || 'Zrušit',
        showCancel: true,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })
  }

  window.crmAlert = function(message, opts = {}) {
    const type = opts.type || (opts.danger ? 'error' : 'info')
    const meta = _TOAST_META[type] || _TOAST_META.info
    return new Promise((resolve) => {
      _openModal({
        title: opts.title || meta.title,
        body: message,
        icon: meta.emoji,
        ringClass: meta.ring.replace('t-', ''),
        okLabel: opts.okLabel || 'OK',
        showCancel: false,
        onOk: () => resolve(),
        onCancel: () => resolve(),
      })
    })
  }

  window.crmPrompt = function(message, opts = {}) {
    return new Promise((resolve) => {
      const ph = String(opts.placeholder || '').replaceAll('"', '&quot;')
      const defVal = String(opts.defaultValue || '')
      _openModal({
        title: opts.title || 'Zadejte hodnotu',
        bodyHtml: `<div style="margin-bottom:0;white-space:pre-line;color:#475569;font-size:14px">${String(message||'').replaceAll('<','&lt;')}</div><input id="_crmMdlPromptInput" placeholder="${ph}" value="${defVal.replaceAll('"','&quot;')}" />`,
        icon: '✏️',
        ringClass: 'info',
        okLabel: opts.okLabel || 'OK',
        cancelLabel: opts.cancelLabel || 'Zrušit',
        showCancel: true,
        onOk:     () => resolve(document.getElementById('_crmMdlPromptInput')?.value ?? ''),
        onCancel: () => resolve(null),
      })
      setTimeout(() => {
        const inp = document.getElementById('_crmMdlPromptInput')
        if (inp) {
          inp.focus()
          inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('_crmMdlOk')?.click()
            if (e.key === 'Escape') document.getElementById('_crmMdlCancel')?.click()
          })
        }
      }, 80)
    })
  }

  /* backward compat — keep old IDs pointing to new elements */
  function _ensureConfirmModal() { _ensureModal() }
})()
