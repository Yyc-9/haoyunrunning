'use client'

import { Suspense } from 'react'
import Navigation from './Navigation'

export default function NavigationWrapper() {
  return (
    <Suspense fallback={
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-glass border-b border-apple-gray-200 py-3">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-apple-blue to-apple-orange animate-pulse" />
          </div>
        </div>
      </nav>
    }>
      <Navigation />
    </Suspense>
  )
}
