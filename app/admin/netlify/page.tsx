'use client'

import { useEffect, useState } from 'react'

export default function AdminNetlifyPage() {
  const [src, setSrc] = useState('/mynetlify/admin/')
  const [canEmbed, setCanEmbed] = useState(true)

  useEffect(() => {
    // If the reverse-proxy isn't configured yet, iframe will fail. We keep a clear fallback link.
    setSrc('/mynetlify/admin/')
  }, [])

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Мой нетифай</h1>
            <p className="text-sm text-slate-300 mt-1">
              Если тут пусто — надо добавить правило в Caddy для прокси <code className="text-slate-200">/mynetlify/*</code>.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold"
            >
              Открыть в новой вкладке
            </a>
            {!canEmbed ? (
              <a
                href={src}
                className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-400/30 hover:bg-amber-500/30 text-sm font-semibold"
              >
                Встроить не получилось — открыть
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-6">
        <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
          <iframe
            title="moy-netlify"
            src={src}
            className="w-full"
            style={{ height: 'calc(100vh - 56px - 120px)' }}
            onError={() => setCanEmbed(false)}
          />
        </div>
      </div>
    </div>
  )
}


