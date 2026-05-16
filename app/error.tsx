'use client'

import { useState } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Error Icon */}
        <div className="mb-8 flex justify-center">
          <div className="p-6 bg-red-100 rounded-full">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        {/* Message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-apple-gray-900 mb-4">
            出现了一点问题
          </h2>
          <p className="text-lg text-apple-gray-600 mb-8">
            我们遇到了一个意外错误。请稍后重试，或者返回首页。
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
            onClick={reset}
            className="apple-button-primary inline-flex items-center justify-center px-8 py-3 hover:scale-105 active:scale-95 transition-transform duration-200"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            重新尝试
          </button>
          <Link href="/" className="apple-button-outline inline-flex items-center justify-center px-8 py-3 hover:scale-105 active:scale-95 transition-transform duration-200">
            <Home className="h-5 w-5 mr-2" />
            返回首页
          </Link>
        </div>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-apple-blue hover:underline mb-4"
            >
              {showDetails ? '隐藏' : '显示'}详细信息
            </button>
            {showDetails && (
              <div className="bg-apple-gray-100 p-4 rounded-xl text-left">
                <p className="text-xs font-mono text-apple-gray-700 break-words whitespace-pre-wrap">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs text-apple-gray-500 mt-2">
                    错误 ID: {error.digest}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Support Message */}
        <p className="text-sm text-apple-gray-500 mt-12">
          需要帮助？请<a href="mailto:support@example.com" className="text-apple-blue hover:underline">联系客服</a>
        </p>
      </div>
    </div>
  )
}
