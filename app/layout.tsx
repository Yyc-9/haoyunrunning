import type { Metadata, Viewport } from 'next'
import './globals.css'
import NavigationWrapper from '@/components/NavigationWrapper'
import Footer from '@/components/Footer'
import { AuthProvider } from './providers'
import { ToastProvider } from './toast-provider'
import { CartProvider } from './cart-provider'
import { LanguageProvider } from './language-context'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: '好運跑班 - 科學訓練，跑出好運',
  description: '專業跑步訓練平台，提供科學訓練方案與個人化指導',
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
        </LanguageProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}
