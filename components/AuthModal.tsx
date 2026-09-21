'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, User, Mail, Phone, Lock, Eye, EyeOff, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/app/providers'
import { useLanguage } from '@/app/language-context'
import { enabledSocialProviders, socialProviders, type SocialProvider } from '@/lib/auth-providers'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'login' | 'register'
}

function getAuthErrorMessage(error: unknown, fallbackMessage: string, emailNotConfirmedMessage: string) {
  const rawMessage = error instanceof Error ? error.message : String(error ?? '')
  const message = rawMessage.toLowerCase()

  if (message.includes('email not confirmed')) {
    return emailNotConfirmedMessage
  }

  if (message.includes('invalid login credentials')) {
    return '信箱或密碼不正確。'
  }

  if (message.includes('user already registered') || message.includes('already registered')) {
    return '這個信箱已經註冊，請直接登入。'
  }

  if (message.includes('password should be') || message.includes('weak password')) {
    return '密碼強度不足，請使用至少 10 個字元。'
  }

  if (
    message.includes('load failed') ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('networkerror') ||
    message.includes('authretryablefetcherror') ||
    message.includes('err_connection')
  ) {
    return '目前無法連線到登入服務。請先重新整理頁面再試一次；如果仍失敗，可能是目前網路或瀏覽器阻擋 Supabase 認證服務。'
  }

  return rawMessage || fallbackMessage
}

export default function AuthModal({ isOpen, onClose, mode = 'login' }: AuthModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const reducedMotion = useReducedMotion()
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  const [activeMode, setActiveMode] = useState<'login' | 'register'>(mode)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [oauthSubmitting, setOauthSubmitting] = useState<SocialProvider | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    coachId: '',
  })
  const router = useRouter()
  const { login, loginWithOAuth, register } = useAuth()
  const { t, language } = useLanguage()
  const [oauthProviders, setOauthProviders] = useState(() => enabledSocialProviders({
    google: process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true',
    apple: process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED === 'true',
  }))

  useEffect(() => {
    if (!isOpen) return
    const controller = new AbortController()
    fetch('/api/auth/providers', { signal: controller.signal }).then(async response => {
      if (!response.ok) return
      const payload = await response.json()
      if (Array.isArray(payload.providers)) {
        setOauthProviders(socialProviders.filter(provider => payload.providers.some((enabled: { id?: string }) => enabled?.id === provider.id)))
      }
    }).catch(() => { /* Keep configured fallback; email registration remains available. */ })
    return () => controller.abort()
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setActiveMode(mode)
      setErrorMessage('')
      setSuccessMessage('')
      setIsSubmitting(false)
      setOauthSubmitting(null)
    }
  }, [isOpen, mode])

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus())
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return }
      if (event.key !== 'Tab') return
      const dialog = dialogRef.current
      const controls = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]')).filter((element) => element.getClientRects().length > 0) : []
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (!first) { event.preventDefault(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [isOpen])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      if (activeMode === 'login') {
        await login(formData.email, formData.password)
        onClose()
        return
      }

      const result = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        gender: '',
        pb: '',
        coachId: formData.coachId,
        password: formData.password,
      })

      if (result.needsEmailConfirmation) {
        setSuccessMessage(t.auth.emailConfirmationRequired)
        setFormData((current) => ({ ...current, password: '' }))
        return
      }

      setSuccessMessage(t.auth.registerSuccess)
      router.push('/profile')
      onClose()
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, t.auth.actionFailed, t.auth.emailNotConfirmed))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOAuthLogin = async (provider: SocialProvider) => {
    setErrorMessage('')
    setSuccessMessage('')
    setOauthSubmitting(provider)

    try {
      await loginWithOAuth(provider)
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, t.auth.actionFailed, t.auth.emailNotConfirmed))
      setOauthSubmitting(null)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto p-3 sm:p-4" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="auth-dialog-title"
              tabIndex={-1}
              initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.97 }}
              transition={{ duration: reducedMotion ? 0 : 0.18 }}
              className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl bg-white shadow-2xl outline-none"
            >
              {/* Header */}
              <div className="border-b border-apple-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-apple-blue to-apple-orange flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 id="auth-dialog-title" className="text-xl font-bold">
                        {activeMode === 'login' ? t.auth.loginTitle : t.auth.registerTitle}
                      </h2>
                      <p className="text-sm text-apple-gray-500">
                        {activeMode === 'login'
                          ? t.auth.loginSubtitle
                          : t.auth.registerSubtitle}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    type="button"
                    aria-label="關閉登入視窗"
                    className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-apple-gray-100 transition-colors duration-200"
                  >
                    <X className="h-5 w-5 text-apple-gray-500" />
                  </motion.button>
                </div>

                {/* Mode Toggle */}
                <div className="flex mt-6 bg-apple-gray-100 rounded-2xl p-1">
                  {(['login', 'register'] as const).map((mode) => (
                    <motion.button
                      key={mode}
                      type="button"
                      aria-pressed={activeMode === mode}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setActiveMode(mode)
                        setErrorMessage('')
                        setSuccessMessage('')
                      }}
                      className={clsx(
                        'flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                        activeMode === mode
                          ? 'bg-white shadow-sm'
                          : 'text-apple-gray-500 hover:text-apple-gray-700'
                      )}
                    >
                      {mode === 'login' ? t.auth.loginTab : t.auth.registerTab}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Form */}
              {oauthProviders.length > 0 && <div className="px-4 pt-5 sm:px-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {oauthProviders.map(provider => <button key={provider.id} type="button" onClick={() => handleOAuthLogin(provider.id)}
                    disabled={oauthSubmitting !== null || isSubmitting}
                    className={clsx('flex min-h-12 items-center justify-center rounded-xl border px-4 py-3 text-sm font-bold transition-colors disabled:opacity-50', provider.id === 'google' ? 'border-apple-gray-300 bg-white text-black hover:bg-apple-gray-50' : 'border-apple-gray-200 bg-apple-gray-50 text-black hover:bg-apple-gray-100', oauthProviders.length === 1 && 'sm:col-span-2')}>
                    {oauthSubmitting === provider.id ? (language === 'en' ? 'Connecting...' : '連線中...') : language === 'en' ? `Continue with ${provider.label}` : `使用 ${provider.label} 繼續`}
                  </button>)}
                </div>
                <div className="mt-5 flex items-center gap-3 text-xs text-apple-gray-500"><span className="h-px flex-1 bg-apple-gray-200" /><span>{t.auth.email}</span><span className="h-px flex-1 bg-apple-gray-200" /></div>
              </div>}
              <form onSubmit={handleSubmit} className="p-4 sm:p-6">
                <div className="space-y-4">
                  {activeMode === 'register' && (
                    <>
                      <div>
                        <label htmlFor="auth-name" className="block text-sm font-medium text-apple-gray-700 mb-2">
                          {t.auth.name}
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-apple-gray-400" />
                          <input
                            type="text"
                            name="name"
                            id="auth-name"
                            autoComplete="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder={t.auth.namePlaceholder}
                            className="apple-input pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="auth-phone" className="block text-sm font-medium text-apple-gray-700 mb-2">
                          {t.auth.phone}
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-apple-gray-400" />
                          <input
                            type="tel"
                            name="phone"
                            id="auth-phone"
                            autoComplete="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder={t.auth.phonePlaceholder}
                            className="apple-input pl-10"
                            required
                          />
                        </div>
                      </div>

                      <p className="text-sm text-apple-gray-600">性別與 PB 可在註冊後，至「修改跑者資料」補填。</p>
                    </>
                  )}

                  {/* Email/Password fields (shown in both modes) */}
                  <div>
                    <label htmlFor="auth-email" className="block text-sm font-medium text-apple-gray-700 mb-2">
                      {t.auth.email}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-apple-gray-400" />
                      <input
                        type="email"
                        name="email"
                        id="auth-email"
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder={t.auth.email}
                        className="apple-input !pl-11"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="auth-password" className="block text-sm font-medium text-apple-gray-700 mb-2">
                      {t.auth.password}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-apple-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        id="auth-password"
                        autoComplete={activeMode === 'login' ? 'current-password' : 'new-password'}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder={t.auth.passwordPlaceholder}
                        minLength={activeMode === 'register' ? 10 : 1}
                        className="apple-input !pl-11 !pr-11"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                        aria-pressed={showPassword}
                        className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-apple-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-apple-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {errorMessage && (
                  <div role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                    {errorMessage}
                  </div>
                )}

                {successMessage && (
                  <div role="status" className="mt-5 rounded-2xl bg-green-50 px-4 py-3 text-sm leading-6 text-green-700">
                    {successMessage}
                  </div>
                )}

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isSubmitting}
                  className="w-full apple-button-primary mt-8 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? activeMode === 'login'
                      ? '登入中...'
                      : '建立中...'
                    : activeMode === 'login'
                      ? t.auth.submitLogin
                      : t.auth.submitRegister}
                  <ChevronRight className="h-5 w-5 inline-block ml-2" />
                </motion.button>

                {/* Terms */}
                {activeMode === 'register' && (
                  <p className="text-xs text-apple-gray-500 text-center mt-4">
                    註冊即表示你同意本站在帳戶與服務所需範圍內處理所填資料。
                  </p>
                )}

                {/* Switch mode */}
                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode(activeMode === 'login' ? 'register' : 'login')
                      setErrorMessage('')
                      setSuccessMessage('')
                    }}
                    className="text-apple-blue hover:underline text-sm font-medium"
                  >
                    {activeMode === 'login'
                      ? t.auth.switchToRegister
                      : t.auth.switchToLogin}
                  </button>
                </div>
              </form>

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
