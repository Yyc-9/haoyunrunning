'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useEffect } from 'react'

interface ToastProps {
  isVisible: boolean
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  onClose?: () => void
}

export default function Toast({
  isVisible,
  message,
  type = 'success',
  duration = 3000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose?.()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

  const typeConfig = {
    success: {
      icon: CheckCircle,
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      iconColor: 'text-green-500',
      text: 'text-green-900',
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      iconColor: 'text-red-500',
      text: 'text-red-900',
    },
    info: {
      icon: Info,
      bg: 'bg-apple-blue/10',
      border: 'border-apple-blue/20',
      iconColor: 'text-apple-blue',
      text: 'text-apple-gray-900',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      iconColor: 'text-yellow-500',
      text: 'text-yellow-900',
    },
  }

  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-5 left-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 sm:bottom-8 sm:w-auto"
        >
          <div
            className={`${config.bg} ${config.border} backdrop-blur-glass flex w-full items-center gap-3 rounded-3xl border px-4 py-4 shadow-lg sm:min-w-[300px] sm:max-w-md sm:px-6`}
          >
            <div className={`${config.iconColor}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className={`${config.text} font-medium flex-1`}>{message}</div>
            {onClose && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-apple-gray-400 hover:text-apple-gray-600"
              >
                <X className="h-5 w-5" />
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
