'use client'

import { useEffect } from 'react'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Admin route error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-xl font-bold">Админка временно упала</div>
        <div className="text-slate-300 text-sm mt-2">
          Это клиентская ошибка (JS). Обычно помогает <span className="font-semibold">Ctrl+F5</span> или “Очистить кэш”.
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 p-3 text-xs text-slate-200 overflow-auto">
          <pre>{String(error?.message || error)}</pre>
        </div>
        <div className="mt-4 flex gap-2 flex-wrap">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold"
          >
            Перезагрузить
          </button>
          <button
            onClick={() => {
              try {
                localStorage.removeItem('adminPassword')
              } catch {
                // ignore
              }
              reset()
            }}
            className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-400/30 hover:bg-amber-500/30 text-sm font-semibold"
          >
            Сбросить вход
          </button>
        </div>
      </div>
    </div>
  )
}


