import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { AnalyticsEvents } from './components/Analytics'
import { AiChatWidget } from './components/AiChatWidget'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://temoweb.eu'),
  title: 'TemoWeb | Digital Systems Company for Client Automation',
  description:
    'TemoWeb builds digital systems that generate and process clients automatically: web systems, client automation, CRM integration, and business infrastructure for Europe.',
  keywords: [
    'digital systems',
    'client automation',
    'CRM integration',
    'business automation Europe',
    'web systems company',
    'TemoWeb',
    'temoweb.eu',
  ],
  authors: [{ name: 'TemoWeb' }],
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    title: 'TemoWeb | Digital Systems Company for Client Automation',
    description:
      'Digital systems for lead generation and client processing: high-converting web systems, automation workflows, CRM integration, and scalable infrastructure.',
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
    <html lang="en" className={inter.variable}>
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

        <AiChatWidget />
        <a
          href="https://wa.me/380960494917"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="group fixed bottom-5 right-5 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-[#22C55E] text-white shadow-[0_14px_40px_rgba(34,197,94,0.25)] transition-transform duration-200 hover:scale-[1.04] active:scale-[0.98]"
        >
          <span className="absolute inset-0 rounded-full bg-[#22C55E] opacity-25 blur-xl group-hover:opacity-35 transition-opacity" />
          <span className="absolute -inset-2 rounded-full border border-[#22C55E]/35 animate-pulse" />
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className="relative"
          >
            <path d="M20.52 3.48A11.91 11.91 0 0 0 12.06 0C5.46 0 .12 5.34.12 11.94c0 2.1.54 4.14 1.56 5.94L0 24l6.3-1.62a11.9 11.9 0 0 0 5.76 1.47h.01c6.6 0 11.94-5.34 11.94-11.94 0-3.18-1.23-6.18-3.49-8.43Zm-8.46 18.3h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.74.96.99-3.65-.24-.38a9.86 9.86 0 0 1-1.52-5.18C2.14 6.45 6.63 1.96 12.06 1.96c2.64 0 5.12 1.03 6.98 2.89a9.8 9.8 0 0 1 2.9 6.98c0 5.43-4.49 9.95-9.88 9.95Zm5.43-7.39c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.66.15-.2.3-.76.97-.93 1.17-.17.2-.34.22-.64.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.6-.9-2.19-.24-.58-.48-.5-.66-.5h-.56c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.08 4.48.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.08-.12-.27-.2-.57-.35Z" />
          </svg>
        </a>
      </body>
    </html>
  )
}

