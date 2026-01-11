import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { AnalyticsEvents } from './components/Analytics'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://temoweb.eu'),
  title: 'Автоматичний прийом клієнтів без дзвінків | temoweb',
  description: 'Система, яка автоматично приймає заявки, відповідає клієнтам і фіксує їх без менеджерів.',
  keywords: ['автоматичний прийом клієнтів', 'автоматизація заявок', 'telegram бот', 'збір заявок', 'CRM', 'TemoWeb', 'temoweb'],
  authors: [{ name: 'TemoWeb' }],
  openGraph: {
    type: 'website',
    locale: 'uk_UA',
    title: 'Автоматичний прийом клієнтів без дзвінків | temoweb',
    description: 'Система, яка автоматично приймає заявки, відповідає клієнтам і фіксує їх без менеджерів.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
      { url: '/logo.png', type: 'image/png', sizes: '32x32' },
      { url: '/logo.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/logo.png',
    apple: [{ url: '/logo.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
  const plausibleSrc = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js'
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID
  const cfToken = process.env.NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN

  return (
    <html lang="uk" className={inter.variable}>
      <head>
        {/* Preconnect для ускорения загрузки */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://sphynxdubai.ae" />
        <link rel="dns-prefetch" href="https://bossdetaling.eu" />
        <link rel="dns-prefetch" href="https://t.me" />
      </head>
      <body className="font-sans">
        {/* Pageview analytics + conversion events (no cookies by default) */}
        {plausibleDomain ? (
          <Script strategy="afterInteractive" defer data-domain={plausibleDomain} src={plausibleSrc} />
        ) : null}

        {/* Session recordings + heatmaps (free) */}
        {clarityId ? (
          <Script id="ms-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${clarityId}");`}
          </Script>
        ) : null}

        {/* Optional: Cloudflare Web Analytics (pageviews only) */}
        {cfToken ? (
          <Script
            strategy="afterInteractive"
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: cfToken })}
          />
        ) : null}

        {/* Google Ads Conversion Tracking */}
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=AW-17819376047"
        />
        <Script id="google-ads-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17819376047');
          `}
        </Script>

        <AnalyticsEvents plausibleEnabled={Boolean(plausibleDomain)} />
        {children}
      </body>
    </html>
  )
}

