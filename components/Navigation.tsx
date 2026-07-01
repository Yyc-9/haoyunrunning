'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Globe2, Menu, X, User, LogOut, LogIn, ShoppingBag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { useLanguage } from '@/app/language-context'
import { languages } from '@/lib/dictionary'
import AuthModal from '@/components/AuthModal'

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const { isLoggedIn, isLoading, logout } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (searchParams.get('auth') === 'login') {
      setAuthMode('login')
      setIsAuthModalOpen(true)
    }
    if (searchParams.get('auth') === 'register') {
      setAuthMode('register')
      setIsAuthModalOpen(true)
    }
  }, [searchParams])

  const navItems = [
    { key: 'home', name: t.navigation.home, href: '/' },
    { key: 'courses', name: t.navigation.courses, href: '/courses' },
    { key: 'about', name: t.navigation.about, href: '/about' },
    { key: 'testimonials', name: t.navigation.testimonials, href: '/testimonials' },
    { key: 'shop', name: t.navigation.shop, href: '/shop' },
  ]

  const currentLanguage = languages.find((item) => item.code === language) ?? languages[0]
  const canSwitchLanguage = languages.length > 1

  const languageSwitcher = canSwitchLanguage ? (
    <div className="relative">
      <motion.button
        type="button"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setIsLanguageOpen((open) => !open)}
        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/92 px-3 py-2 text-sm font-semibold text-apple-gray-950 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-apple-blue/40 hover:text-apple-blue"
        aria-label={t.common.language}
      >
        <Globe2 className="h-4 w-4" />
        <span>{currentLanguage.label}</span>
        <ChevronDown className={clsx('h-3.5 w-3.5 transition-transform duration-200', isLanguageOpen && 'rotate-180')} />
      </motion.button>

      <AnimatePresence>
        {isLanguageOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 mt-2 w-36 overflow-hidden rounded-2xl border border-apple-gray-200 bg-white shadow-xl"
          >
            {languages.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setLanguage(item.code)
                  setIsLanguageOpen(false)
                }}
                className={clsx(
                  'flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors duration-150',
                  language === item.code
                    ? 'bg-apple-blue/10 text-apple-blue'
                    : 'text-apple-gray-700 hover:bg-apple-gray-100'
                )}
              >
                <span>{item.name}</span>
                <span className="text-xs font-bold">{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  ) : null

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
        className={clsx(
          'fixed left-0 right-0 top-0 z-50 transition-all duration-300',
          isScrolled
            ? 'border-b border-apple-gray-200 bg-white/92 py-2 shadow-sm backdrop-blur-glass sm:py-3'
            : 'py-3 sm:py-4'
        )}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={clsx(
              'relative flex min-w-0 items-center justify-between rounded-full border px-3 text-apple-gray-950 shadow-lg backdrop-blur-2xl transition-all duration-300 sm:px-6',
              isScrolled
                ? 'border-transparent bg-transparent py-0 shadow-none'
                : 'border-black/10 bg-white/94 py-2 shadow-[0_18px_60px_rgba(0,0,0,0.18)] ring-1 ring-white/70 sm:py-3'
            )}
          >
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex min-w-0 items-center space-x-2 justify-self-start"
            >
              <div className="relative h-9 w-9 overflow-hidden rounded-full border border-black/10 bg-white shadow-sm sm:h-10 sm:w-10">
                <Image
                  src="/goodluck-logo-nav.jpg"
                  alt="好運跑班 Logo"
                  fill
                  sizes="40px"
                  className="object-cover"
                  priority
                />
              </div>
              <span className="max-w-[8rem] truncate text-base font-bold tracking-tight text-apple-gray-950 sm:max-w-none sm:text-xl">{t.common.brand}</span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="absolute left-1/2 hidden -translate-x-1/2 items-center justify-center space-x-7 lg:flex">
              {navItems.map((item) => {
                const isExternal = item.href.startsWith('http')
                const isHashLink = item.href.startsWith('#')

                return (
                  <motion.div
                    key={item.key}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    {isExternal || isHashLink ? (
                      <a
                        href={item.href}
                        onClick={(e) => {
                          if (isHashLink) {
                            e.preventDefault()
                            const element = document.querySelector(item.href)
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth' })
                            }
                          }
                        }}
                      className="group text-sm font-semibold text-apple-gray-950 transition-all duration-300 hover:text-apple-blue"
                      >
                        {item.name}
                        {item.key === 'shop' && (
                          <ShoppingBag className="inline-block ml-1 h-3 w-3" />
                        )}
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-apple-blue group-hover:w-full transition-all duration-300" />
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="group text-sm font-semibold text-apple-gray-950 transition-all duration-300 hover:text-apple-blue"
                      >
                        {item.name}
                        {item.key === 'shop' && (
                          <ShoppingBag className="inline-block ml-1 h-3 w-3" />
                        )}
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-apple-blue group-hover:w-full transition-all duration-300" />
                      </Link>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {/* Auth Buttons */}
            <div className="hidden items-center space-x-4 justify-self-end lg:flex">
              {languageSwitcher}
              {isLoading ? (
                <div className="h-9 w-28 animate-pulse rounded-full bg-white/70 ring-1 ring-black/10" />
              ) : isLoggedIn ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/10">
                    <User className="h-4 w-4 text-apple-gray-700" />
                  </div>
                  <Link
                    href="/student"
                    className="text-sm font-semibold text-apple-gray-950 transition-colors duration-200 hover:text-apple-blue"
                  >
                    {t.common.myAccount}
                  </Link>
                   <button
                     onClick={() => logout()}
                     className="apple-button-outline text-sm px-4 py-2 hover:scale-105 active:scale-95 transition-transform duration-200"
                   >
                     <LogOut className="h-4 w-4 inline-block mr-1" />
                     {t.common.logout}
                   </button>
                </motion.div>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setAuthMode('login')
                      setIsAuthModalOpen(true)
                    }}
                    className="apple-button-outline text-sm px-4 py-2"
                  >
                    <LogIn className="h-4 w-4 inline-block mr-1" />
                    {t.common.login}
                  </motion.button>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      href="/?auth=register"
                      onClick={() => {
                        setAuthMode('register')
                        setIsAuthModalOpen(true)
                      }}
                      className="apple-button-primary text-sm px-6 py-2"
                    >
                      {t.common.joinNow}
                    </Link>
                  </motion.div>
                </>
              )}
            </div>

            {/* Compact Auth + Menu */}
            <div className="flex items-center gap-2 justify-self-end lg:hidden">
              {isLoading ? (
                <div className="h-10 w-20 animate-pulse rounded-full bg-apple-gray-100 ring-1 ring-black/10" />
              ) : isLoggedIn ? (
                <Link
                  href="/student"
                  className="inline-flex h-9 items-center justify-center rounded-full border border-black/10 bg-white px-3 text-sm font-bold text-apple-gray-950 shadow-sm transition-colors duration-200 hover:text-apple-blue sm:h-10 sm:px-4"
                >
                  {t.common.myAccount}
                </Link>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setAuthMode('login')
                    setIsAuthModalOpen(true)
                    setIsMenuOpen(false)
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-black/10 bg-white px-3 text-sm font-bold text-apple-gray-950 shadow-sm transition-colors duration-200 hover:text-apple-blue sm:h-10 sm:px-4"
                >
                  <LogIn className="mr-1.5 h-4 w-4" />
                  {t.common.login}
                </motion.button>
              )}
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-apple-gray-700 shadow-sm transition-colors duration-200 hover:bg-apple-gray-100 sm:h-10 sm:w-10"
                aria-label={isMenuOpen ? '關閉選單' : '開啟選單'}
              >
                {isMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-0 top-20 z-40 max-h-[calc(100vh-5rem)] overflow-y-auto border-b border-apple-gray-200 bg-white/95 backdrop-blur-glass lg:hidden"
          >
            <div className="container mx-auto px-4 py-6">
              <div className="space-y-4">
                {navItems.map((item) => {
                  const isHashLink = item.href.startsWith('#')

                  return (
                    <motion.div
                      key={item.key}
                      whileTap={{ scale: 0.95 }}
                    >
                      <a
                        href={item.href}
                        onClick={(e) => {
                          if (isHashLink) {
                            e.preventDefault()
                            const element = document.querySelector(item.href)
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth' })
                            }
                          }
                          setIsMenuOpen(false)
                        }}
                        className="block py-3 text-lg font-semibold text-apple-gray-900 hover:text-apple-blue hover:bg-apple-gray-100 px-4 rounded-xl transition-all duration-200"
                      >
                        {item.name}
                        {item.key === 'shop' && (
                          <ShoppingBag className="inline-block ml-2 h-4 w-4" />
                        )}
                      </a>
                    </motion.div>
                  )
                })}
                <div className="pt-6 border-t border-apple-gray-200 space-y-3">
                  {canSwitchLanguage && (
                    <div className="flex items-center justify-center gap-2 rounded-2xl bg-apple-gray-100 p-1">
                      {languages.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => setLanguage(item.code)}
                          className={clsx(
                            'flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200',
                            language === item.code
                              ? 'bg-white text-apple-blue shadow-sm'
                              : 'text-apple-gray-600 hover:text-apple-gray-900'
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {isLoading ? (
                    <div className="h-11 w-full animate-pulse rounded-full bg-apple-gray-200" />
                  ) : isLoggedIn ? (
                    <>
                      <Link href="/student" className="block">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          className="w-full apple-button-outline"
                        >
                          {t.common.myAccount}
                        </motion.button>
                      </Link>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => logout()}
                        className="w-full apple-button-outline"
                      >
                        {t.common.logoutFull}
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setAuthMode('login')
                          setIsAuthModalOpen(true)
                          setIsMenuOpen(false)
                        }}
                        className="w-full apple-button-outline"
                      >
                        {t.common.login}
                      </motion.button>
                      <motion.div
                        whileTap={{ scale: 0.95 }}
                      >
                        <Link
                          href="/?auth=register"
                          onClick={() => {
                            setAuthMode('register')
                            setIsAuthModalOpen(true)
                            setIsMenuOpen(false)
                          }}
                          className="w-full apple-button-primary"
                        >
                          {t.common.joinNow}
                        </Link>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
      />
    </>
  )
}
