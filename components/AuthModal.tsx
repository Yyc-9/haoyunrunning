'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Mail, Phone, Lock, Calendar, Award, Eye, EyeOff, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'login' | 'register'
}

export default function AuthModal({ isOpen, onClose, mode = 'login' }: AuthModalProps) {
  const [activeMode, setActiveMode] = useState<'login' | 'register'>(mode)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gender: '',
    pb: '',
    email: '',
    password: '',
  })

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
    // TODO: 集成Supabase认证
    onClose()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const genderOptions = [
    { value: '', label: '请选择性别' },
    { value: 'male', label: '男' },
    { value: 'female', label: '女' },
    { value: 'other', label: '其他' },
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
                        {activeMode === 'login' ? '登录账户' : '创建账户'}
                      </h2>
                      <p className="text-sm text-apple-gray-500">
                        {activeMode === 'login'
                          ? '使用您的手机号或邮箱登录'
                          : '加入好運跑班，开始您的跑步之旅'}
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
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveMode(mode)}
                      className={clsx(
                        'flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                        activeMode === mode
                          ? 'bg-white shadow-sm'
                          : 'text-apple-gray-500 hover:text-apple-gray-700'
                      )}
                    >
                      {mode === 'login' ? '登录' : '注册'}
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
                          姓名
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-apple-gray-400" />
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="请输入您的姓名"
                            className="apple-input pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-apple-gray-700 mb-2">
                          手机号
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-apple-gray-400" />
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="请输入您的手机号"
                            className="apple-input pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-apple-gray-700 mb-2">
                          性别
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
                          当前PB成绩
                        </label>
                        <div className="relative">
                          <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-apple-gray-400" />
                          <input
                            type="text"
                            name="pb"
                            value={formData.pb}
                            onChange={handleChange}
                            placeholder="例如：马拉松 3:30:00"
                            className="apple-input pl-10"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Email/Password fields (shown in both modes) */}
                  <div>
                    <label className="block text-sm font-medium text-apple-gray-700 mb-2">
                      邮箱地址
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-apple-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="name@example.com"
                        className="apple-input pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-apple-gray-700 mb-2">
                      密码
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-apple-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="请输入密码"
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

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full apple-button-primary mt-8"
                >
                  {activeMode === 'login' ? '登录账户' : '创建账户'}
                  <ChevronRight className="h-5 w-5 inline-block ml-2" />
                </motion.button>

                {/* Terms */}
                {activeMode === 'register' && (
                  <p className="text-xs text-apple-gray-500 text-center mt-4">
                    点击"创建账户"即表示同意我们的
                    <a href="#" className="text-apple-blue hover:underline ml-1">
                      服务条款
                    </a>
                    和
                    <a href="#" className="text-apple-blue hover:underline ml-1">
                      隐私政策
                    </a>
                  </p>
                )}

                {/* Switch mode */}
                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMode(activeMode === 'login' ? 'register' : 'login')
                    }
                    className="text-apple-blue hover:underline text-sm font-medium"
                  >
                    {activeMode === 'login'
                      ? '还没有账户？立即注册'
                      : '已有账户？立即登录'}
                  </button>
                </div>
              </form>

              {/* Apple ID style footer */}
              <div className="px-6 pb-6">
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 text-apple-gray-500">
                    <div className="h-px w-12 bg-apple-gray-300" />
                    <span className="text-xs">或使用其他方式</span>
                    <div className="h-px w-12 bg-apple-gray-300" />
                  </div>
                  <div className="flex justify-center space-x-3 mt-4">
                    {['微信', 'Apple', 'Google'].map((provider) => (
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