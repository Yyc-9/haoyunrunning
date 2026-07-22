'use client'

import { useEffect, useState } from 'react'
import { Loader2, LockKeyhole } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ProtectedCoursePaymentInfo({
  courseSlug,
  quoteToken = '',
}: {
  courseSlug: string
  quoteToken?: string
}) {
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let objectUrl = ''
    let active = true

    async function loadImage() {
      setImageUrl('')
      setError('')

      try {
        const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
        if (!session?.access_token) throw new Error('請先登入後再查看匯款資料。')

        const response = await fetch('/api/course-enrollments/payment-info', {
          method: 'POST',
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ courseSlug, quoteToken }),
        })
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error || '匯款資料圖片讀取失敗。')
        }

        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        if (active) setImageUrl(objectUrl)
        else URL.revokeObjectURL(objectUrl)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : '匯款資料圖片讀取失敗。')
      }
    }

    void loadImage()
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [courseSlug, quoteToken])

  if (error) {
    return (
      <div className="flex min-h-36 items-center justify-center gap-2 rounded-md bg-white px-4 text-center text-sm font-bold leading-6 text-red-700">
        <LockKeyhole className="h-4 w-4 shrink-0" />
        {error}
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div className="flex min-h-36 items-center justify-center gap-2 rounded-md bg-white text-sm font-bold text-apple-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />正在安全讀取匯款資料
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl} alt="好運跑班匯款資料" className="h-auto w-full rounded-md" />
  )
}
