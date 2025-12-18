import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'TemoWeb — Превращаем бизнес‑задачи в работающие решения',
  description: 'Без лишней сложности и "чёрного ящика". Вы говорите, что должно измениться в бизнесе — мы делаем так, чтобы это произошло.',
  keywords: ['разработка', 'автоматизация бизнеса', 'сайт', 'CRM', 'телеграм-боты', 'AI интеграции', 'TemoWeb'],
  authors: [{ name: 'TemoWeb' }],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    title: 'TemoWeb — Превращаем бизнес‑задачи в работающие решения',
    description: 'Без лишней сложности и "чёрного ящика". Разработка сайтов, автоматизация, боты, AI.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  )
}

