'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Mail, Phone, Lock, Award, Eye, EyeOff, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/app/providers'
import { useLanguage } from '@/app/language-context'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'login' | 'register'
}

export default function AuthModal({ isOpen, onClose, mode = 'login' }: AuthModalProps) {
  const [activeMode, setActiveMode] = useState<'login' | 'register'>(mode)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gender: '',
    pb: '',
    email: '',
    password: '',
  })
  const router = useRouter()
  const { login, register } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    if (isOpen) {
      setActiveMode(mode)
      setErrorMessage('')
      setSuccessMessage('')
      setIsSubmitting(false)
    }
  }, [isOpen, mode])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
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

      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender as 'male' | 'female' | 'other',
        pb: formData.pb,
        password: formData.password,
      })

      setSuccessMessage('帳戶已建立，正在前往學員看板。')
      router.push('/student')
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失敗，請稍後再試。'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const genderOptions = [
    { value: '', label: t.auth.genderOptions[0] },
    { value: 'male', label: t.auth.genderOptions[1] },
    { value: 'female', label: t.auth.genderOptions[2] },
    { value: 'other', label: t.auth.genderOptions[3] },
  ]

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
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-apple-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-apple-blue to-apple-orange flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
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
                    className="rounded-full p-2 hover:bg-apple-gray-100 transition-colors duration-200"
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
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  {activeMode === 'register' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-apple-gray-700 mb-2">
                          {t.auth.name}
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-apple-gray-400" />
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder={t.auth.namePlaceholder}
                            className="apple-input pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-apple-gray-700 mb-2">
                          {t.auth.phone}
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-apple-gray-400" />
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder={t.auth.phonePlaceholder}
                            className="apple-input pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-apple-gray-700 mb-2">
                          {t.auth.gender}
                        </label>
                        <div className="relative">
                          <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="apple-input"
                            required
                          >
                            {genderOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-apple-gray-700 mb-2">
                          {t.auth.pb}
                        </label>
                        <div className="relative">
                          <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-apple-gray-400" />
                          <input
                            type="text"
                            name="pb"
                            value={formData.pb}
                            onChange={handleChange}
                            placeholder={t.auth.pbPlaceholder}
                            className="apple-input pl-10"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Email/Password fields (shown in both modes) */}
                  <div>
                    <label className="block text-sm font-medium text-apple-gray-700 mb-2">
                      {t.auth.email}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-apple-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder={t.auth.email}
                        className="apple-input pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-apple-gray-700 mb-2">
                      {t.auth.password}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-apple-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder={t.auth.passwordPlaceholder}
                        minLength={6}
                        className="apple-input pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
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
                  <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                    {errorMessage}
                  </div>
                )}

                {successMessage && (
                  <div className="mt-5 rounded-2xl bg-green-50 px-4 py-3 text-sm leading-6 text-green-700">
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
                    {t.auth.termsPrefix}
                    <a href="#" className="text-apple-blue hover:underline ml-1">
                      {t.auth.terms}
                    </a>
                    <span className="mx-1">{t.auth.and}</span>
                    <a href="#" className="text-apple-blue hover:underline ml-1">
                      {t.auth.privacy}
                    </a>
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

              {/* Apple ID style footer */}
              <div className="px-6 pb-6">
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 text-apple-gray-500">
                    <div className="h-px w-12 bg-apple-gray-300" />
                    <span className="text-xs">{t.auth.otherMethods}</span>
                    <div className="h-px w-12 bg-apple-gray-300" />
                  </div>
                  <div className="flex justify-center space-x-3 mt-4">
                    {t.auth.providers.map((provider) => (
                      <motion.button
                        key={provider}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="apple-button-outline text-sm px-4 py-2"
                      >
                        {provider}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
