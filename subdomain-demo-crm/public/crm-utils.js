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
        #_crmConfirmOverlay{display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);align-items:center;justify-content:center}
        #_crmConfirmOverlay.open{display:flex}
        #_crmConfirmBox{background:linear-gradient(160deg,#071626,#0C1E38);border:1px solid rgba(61,135,248,.25);border-radius:20px;padding:32px 32px 28px;width:100%;max-width:400px;box-shadow:0 32px 80px rgba(0,0,0,.7);text-align:center;animation:_crmIn .18s ease}
        @keyframes _crmIn{from{opacity:0;transform:scale(.94) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
        #_crmConfirmLogo{width:52px;height:52px;border-radius:14px;object-fit:cover;margin:0 auto 16px;display:block;box-shadow:0 4px 18px rgba(0,0,0,.4)}
        #_crmConfirmTitle{font-size:17px;font-weight:800;color:#E6F0FF;margin-bottom:10px;line-height:1.3}
        #_crmConfirmBody{font-size:13px;color:rgba(122,162,196,.9);line-height:1.6;margin-bottom:26px;white-space:pre-line}
        #_crmConfirmBtns{display:flex;gap:10px;justify-content:center}
        #_crmConfirmCancel{flex:1;padding:11px 0;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:rgba(122,162,196,.9);font:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:all .15s}
        #_crmConfirmCancel:hover{background:rgba(255,255,255,.1);color:#E6F0FF}
        #_crmConfirmOk{flex:1;padding:11px 0;border-radius:10px;border:none;background:linear-gradient(135deg,#1A6AE8,#3D87F8);color:#fff;font:inherit;font-size:14px;font-weight:800;cursor:pointer;transition:all .15s;box-shadow:0 4px 16px rgba(26,106,232,.4)}
        #_crmConfirmOk:hover{background:linear-gradient(135deg,#2070F0,#4A95FF);transform:translateY(-1px)}
        #_crmConfirmOk.danger{background:linear-gradient(135deg,#C0392B,#E74C3C);box-shadow:0 4px 16px rgba(192,57,43,.4)}
        #_crmConfirmOk.danger:hover{background:linear-gradient(135deg,#D0443A,#F05050)}
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
