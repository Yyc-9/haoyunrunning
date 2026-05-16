'use client'

import { useState, useEffect } from 'react'
import { Menu, X, User, LogOut, LogIn, ShoppingBag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/providers'
import AuthModal from '@/components/AuthModal'

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const { isLoggedIn, user, logout } = useAuth()
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
      setIsAuthModalOpen(true)
    }
  }, [searchParams])

  const navItems = [
    { name: '首页', href: '/' },
    { name: '训练课程', href: '/courses' },
    { name: '关于我们', href: '/#about' },
    { name: '商店', href: '/shop' },
  ]

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
        className={clsx(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-white/90 backdrop-blur-glass border-b border-apple-gray-200 py-3'
            : 'bg-transparent py-5'
        )}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-apple-blue to-apple-orange" />
              <span className="text-xl font-bold tracking-tight">好運跑班</span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => {
                const isExternal = item.href.startsWith('http')
                const isHashLink = item.href.startsWith('#')

                return (
                  <motion.div
                    key={item.name}
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
                        className="text-sm font-semibold text-apple-gray-800 hover:text-apple-blue transition-all duration-300 group"
                      >
                        {item.name}
                        {item.name === '商店' && (
                          <ShoppingBag className="inline-block ml-1 h-3 w-3" />
                        )}
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-apple-blue group-hover:w-full transition-all duration-300" />
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="text-sm font-semibold text-apple-gray-800 hover:text-apple-blue transition-all duration-300 group"
                      >
                        {item.name}
                        {item.name === '商店' && (
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
            <div className="hidden md:flex items-center space-x-4">
              {isLoggedIn ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-3"
                >
                  <div className="h-8 w-8 rounded-full bg-apple-gray-200 flex items-center justify-center">
                    <User className="h-4 w-4 text-apple-gray-600" />
                  </div>
                  <Link
                    href="/profile"
                    className="text-sm font-medium text-apple-gray-700 hover:text-apple-blue transition-colors duration-200"
                  >
                    我的账户
                  </Link>
                   <button
                     onClick={() => logout()}
                     className="apple-button-outline text-sm px-4 py-2 hover:scale-105 active:scale-95 transition-transform duration-200"
                   >
                     <LogOut className="h-4 w-4 inline-block mr-1" />
                     退出
                   </button>
                </motion.div>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsAuthModalOpen(true)}
                    className="apple-button-outline text-sm px-4 py-2"
                  >
                    <LogIn className="h-4 w-4 inline-block mr-1" />
                    登录
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="apple-button-primary text-sm px-6 py-2"
                  >
                    立即加入
                  </motion.button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden rounded-full p-2 hover:bg-apple-gray-100 transition-colors duration-200"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-apple-gray-700" />
              ) : (
                <Menu className="h-6 w-6 text-apple-gray-700" />
              )}
            </motion.button>
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
            className="fixed inset-x-0 top-16 z-40 md:hidden bg-white/95 backdrop-blur-glass border-b border-apple-gray-200"
          >
            <div className="container mx-auto px-4 py-6">
              <div className="space-y-4">
                {navItems.map((item) => {
                  const isHashLink = item.href.startsWith('#')

                  return (
                    <motion.div
                      key={item.name}
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
                        {item.name === '商店' && (
                          <ShoppingBag className="inline-block ml-2 h-4 w-4" />
                        )}
                      </a>
                    </motion.div>
                  )
                })}
                <div className="pt-6 border-t border-apple-gray-200 space-y-3">
                  {isLoggedIn ? (
                    <>
                      <Link href="/profile" className="block">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          className="w-full apple-button-outline"
                        >
                          我的账户
                        </motion.button>
                      </Link>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => logout()}
                        className="w-full apple-button-outline"
                      >
                        退出登录
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setIsAuthModalOpen(true)
                          setIsMenuOpen(false)
                        }}
                        className="w-full apple-button-outline"
                      >
                        登录
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        className="w-full apple-button-primary"
                      >
                        立即加入
                      </motion.button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  )
}