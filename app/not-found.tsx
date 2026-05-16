import Link from 'next/link'
import { ArrowRight, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-apple-blue to-apple-orange">
            404
          </h1>
        </div>

        {/* Message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-apple-gray-900 mb-4">
            页面未找到
          </h2>
          <p className="text-lg text-apple-gray-600 mb-8">
            抱歉，您访问的页面不存在或已被移除。让我们帮您重新回到正轨。
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="apple-button-primary inline-flex items-center justify-center px-8 py-3 hover:scale-105 active:scale-95 transition-transform duration-200">
            <Home className="h-5 w-5 mr-2" />
            返回首页
          </Link>
          <Link href="/" className="apple-button-outline inline-flex items-center justify-center px-8 py-3 hover:scale-105 active:scale-95 transition-transform duration-200">
            <ArrowRight className="h-5 w-5 mr-2 rotate-180" />
            返回上页
          </Link>
        </div>

        {/* Fun Message */}
        <p className="text-sm text-apple-gray-500 mt-12">
          💪 继续加油！让我们一起跑向成功！
        </p>
      </div>
    </div>
  )
}
