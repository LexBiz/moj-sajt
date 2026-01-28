'use client'

import Link from 'next/link'
import { ReactNode, useEffect, useState } from 'react'

function NavLink({ href, label }: { href: string; label: string }) {
  const [pathname, setPathname] = useState('')
  useEffect(() => {
    try {
      setPathname(window.location.pathname || '')
    } catch {
      setPathname('')
    }
  }, [])
  const active = pathname === href || (href !== '/admin' && pathname.startsWith(href + '/')) || (href !== '/admin' && pathname === href)
  return (
    <Link
      href={href}
      className={[
        'px-3 py-2 rounded-lg text-sm font-semibold border transition-colors',
        active ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-bold">Temoweb • Админка</div>
            <div className="hidden sm:block text-xs text-slate-400">всё в одном месте</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <NavLink href="/admin" label="CRM" />
            <NavLink href="/admin/tenants" label="Клиенты" />
            <NavLink href="/admin/profiles" label="Профили" />
            <NavLink href="/admin/connections" label="Подключения" />
            <NavLink href="/admin/integrations" label="Интеграции" />
            <NavLink href="/admin/netlify" label="Мой нетифай" />
          </div>
        </div>
      </div>

      <div>{children}</div>
    </div>
  )
}


