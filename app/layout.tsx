import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { AuthProvider } from './providers'
import { ToastProvider } from './toast-provider'
import { CartProvider } from './cart-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '好運跑班 - 科学训练，跑出好运',
  description: '专业跑步训练平台，提供科学训练方案和个性化指导',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body className={`${inter.className} min-h-screen bg-white text-black`}>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <div className="relative flex min-h-screen flex-col">
                <Navigation />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}