import type { Metadata, Viewport } from 'next'
import './globals.css'
import NavigationWrapper from '@/components/NavigationWrapper'
import Footer from '@/components/Footer'
import { AuthProvider } from './providers'
import { ToastProvider } from './toast-provider'
import { CartProvider } from './cart-provider'
import { LanguageProvider } from './language-context'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { SiteContentProvider } from './site-content-provider'

export const metadata: Metadata = {
  metadataBase: new URL('https://nurturerunningteam.com'),
  title: '好運跑班 - 科學訓練，跑出好運',
  description: '好運跑班提供系統化跑步訓練、團體課程與教練指導，陪伴跑者穩定累積、備戰目標賽事。',
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    siteName: '好運跑班',
    title: '好運跑班 - 科學訓練，跑出好運',
    description: '系統化跑步訓練、團體課程與教練指導，陪伴跑者穩定累積、備戰目標賽事。',
    images: [{ url: '/goodluck-anniversary-7089.jpg', alt: '好運跑班團隊與學員' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '好運跑班 - 科學訓練，跑出好運',
    description: '系統化跑步訓練、團體課程與教練指導。',
    images: ['/goodluck-anniversary-7089.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: '/goodluck-logo-nav.jpg', type: 'image/jpeg' }],
    apple: '/goodluck-logo-nav.jpg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-TW" className="scroll-smooth">
      <body className="min-h-screen bg-white text-black">
        <LanguageProvider>
          <SiteContentProvider>
            <AuthProvider>
              <CartProvider>
                <ToastProvider>
                  <div className="relative flex min-h-screen flex-col">
                    <NavigationWrapper />
                    <main className="flex-1">{children}</main>
                    <Footer />
                  </div>
                </ToastProvider>
              </CartProvider>
            </AuthProvider>
          </SiteContentProvider>
        </LanguageProvider>
        {process.env.VERCEL ? <SpeedInsights /> : null}
      </body>
    </html>
  )
}
