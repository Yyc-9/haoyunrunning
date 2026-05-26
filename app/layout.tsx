import type { Metadata, Viewport } from 'next'
import './globals.css'
import NavigationWrapper from '@/components/NavigationWrapper'
import Footer from '@/components/Footer'
import { AuthProvider } from './providers'
import { ToastProvider } from './toast-provider'
import { CartProvider } from './cart-provider'
import { LanguageProvider } from './language-context'

export const metadata: Metadata = {
  title: '好運跑班 - 科学训练，跑出好运',
  description: '专业跑步训练平台，提供科学训练方案和个性化指导',
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
      </body>
    </html>
  )
}
