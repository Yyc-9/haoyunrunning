'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, CircleUserRound, ClipboardList, Globe2, Menu, X, User, LogOut, LogIn, ShieldCheck, ShoppingBag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useSiteContent } from '@/app/site-content-provider'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { useLanguage } from '@/app/language-context'
import { languages } from '@/lib/dictionary'
import AuthModal from '@/components/AuthModal'

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const { user, isLoggedIn, isLoading, logout } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const { brand } = useSiteContent()
  const searchParams = useSearchParams()
  const pathname = usePathname()

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

  useEffect(() => {
    setIsAccountOpen(false)
    setIsMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const closeAccountMenu = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest('[data-account-menu-root]')) setIsAccountOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAccountOpen(false)
    }

    document.addEventListener('pointerdown', closeAccountMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeAccountMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const navItems = [
    { key: 'home', name: t.navigation.home, href: '/' },
    { key: 'courses', name: t.navigation.courses, href: '/courses' },
    { key: 'about', name: t.navigation.about, href: '/about' },
    { key: 'testimonials', name: t.navigation.testimonials, href: '/testimonials' },
    { key: 'shop', name: t.navigation.shop, href: '/shop' },
  ]

  const currentLanguage = languages.find((item) => item.code === language) ?? languages[0]
  const canSwitchLanguage = languages.length > 1
  const roleLabel = user?.role === 'admin' ? '超級管理員' : user?.role === 'coach' ? '教練' : '個人會員'
  const accountEntries = [
    ...(user?.role === 'admin' ? [{ href: '/admin', label: '超級管理員', description: '管理網站、訂單與內容', icon: ShieldCheck }] : []),
    ...(user?.role === 'admin' || user?.role === 'coach' ? [{ href: '/coach', label: '教練', description: '管理學員與訓練工作', icon: ClipboardList }] : []),
    { href: '/profile', label: '個人', description: '編輯跑者資料與查看勳章', icon: CircleUserRound },
  ]

  const isAccountEntryActive = (href: string) => pathname === href || (href !== '/profile' && pathname.startsWith(`${href}/`))

  const renderAccountMenu = (mobile = false) => (
    <AnimatePresence>
      {isAccountOpen ? (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.16 }}
          className={clsx('absolute right-0 top-full z-50 pt-2', mobile ? 'w-[min(19rem,calc(100vw-2rem))]' : 'w-72')}
        >
          <div className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-2xl">
            <div className="border-b border-black/10 bg-apple-gray-100 px-4 py-4">
              <p className="truncate font-black text-black">{user?.name || '好運會員'}</p>
              <p className="mt-1 truncate text-xs text-apple-gray-500">{user?.email}</p>
              <span className="mt-3 inline-flex rounded-full bg-black px-2.5 py-1 text-[11px] font-bold text-white">{roleLabel}</span>
            </div>
            <div className="p-2">
              {accountEntries.map((entry) => {
                const active = isAccountEntryActive(entry.href)
                const Icon = entry.icon
                return (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    onClick={() => setIsAccountOpen(false)}
                    className={clsx(
                      'flex min-h-14 items-center gap-3 rounded-md px-3 py-2.5 transition-colors',
                      active ? 'bg-black text-white' : 'text-black hover:bg-apple-gray-100'
                    )}
                  >
                    <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', active ? 'bg-white/15' : 'bg-apple-gray-100')}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block text-sm font-black">{entry.label}</span>
                      <span className={clsx('mt-0.5 block truncate text-xs', active ? 'text-white/65' : 'text-apple-gray-500')}>{entry.description}</span>
                    </span>
                  </Link>
                )
              })}
            </div>
            <div className="border-t border-black/10 p-2">
              <button
                type="button"
                onClick={() => {
                  setIsAccountOpen(false)
                  logout()
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-bold text-apple-gray-700 transition-colors hover:bg-apple-gray-100 hover:text-black"
              >
                <LogOut className="h-4 w-4" />
                {t.common.logoutFull}
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

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
                  src={brand.logoUrl}
                  alt={`${brand.brandName} Logo`}
                  fill
                  sizes="40px"
                  className="object-cover"
                  priority
                />
              </div>
              <span className="max-w-[8rem] truncate text-base font-bold tracking-tight text-apple-gray-950 sm:max-w-none sm:text-xl">{brand.brandName}</span>
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
                <div
                  data-account-menu-root
                  onMouseEnter={() => setIsAccountOpen(true)}
                  onMouseLeave={() => setIsAccountOpen(false)}
                  className="relative"
                >
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setIsLanguageOpen(false)
                      setIsAccountOpen((open) => !open)
                    }}
                    aria-expanded={isAccountOpen}
                    aria-haspopup="menu"
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-sm font-bold text-black shadow-sm transition-colors hover:bg-apple-gray-100"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white"><User className="h-3.5 w-3.5" /></span>
                    {t.common.myAccount}
                    <ChevronDown className={clsx('h-4 w-4 transition-transform', isAccountOpen && 'rotate-180')} />
                  </motion.button>
                  {renderAccountMenu()}
                </div>
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
                <div data-account-menu-root className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false)
                      setIsAccountOpen((open) => !open)
                    }}
                    aria-expanded={isAccountOpen}
                    aria-haspopup="menu"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white px-3 text-sm font-bold text-black shadow-sm transition-colors duration-200 hover:bg-apple-gray-100 sm:h-10 sm:px-4"
                  >
                    {t.common.myAccount}
                    <ChevronDown className={clsx('h-3.5 w-3.5 transition-transform', isAccountOpen && 'rotate-180')} />
                  </button>
                  {renderAccountMenu(true)}
                </div>
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
                onClick={() => {
                  setIsAccountOpen(false)
                  setIsMenuOpen(!isMenuOpen)
                }}
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
                      <div className="space-y-2">
                        <p className="px-2 text-xs font-bold uppercase text-apple-gray-500">切換工作空間</p>
                        {accountEntries.map((entry) => {
                          const Icon = entry.icon
                          return (
                            <Link
                              key={entry.href}
                              href={entry.href}
                              onClick={() => setIsMenuOpen(false)}
                              className="flex min-h-12 items-center gap-3 rounded-lg border border-black/10 bg-white px-4 font-bold text-black shadow-sm"
                            >
                              <Icon className="h-4 w-4" />
                              {entry.label}
                            </Link>
                          )
                        })}
                      </div>
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
