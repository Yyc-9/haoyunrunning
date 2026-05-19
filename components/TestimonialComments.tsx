'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Send, Star } from 'lucide-react'

type Comment = {
  id: string
  name: string
  isAnonymous: boolean
  rating: number
  content: string
  createdAt: string
}

const storageKey = 'goodluck-testimonial-comments'

const initialComments: Comment[] = [
  {
    id: 'seed-1',
    name: '匿名跑者',
    isAnonymous: true,
    rating: 5,
    content: '在好運跑班最有感的是，每一次訓練都知道自己為什麼要這樣跑。不是盲目加量，而是慢慢把身體和信心都建立起來。',
    createdAt: '2026-05-01',
  },
  {
    id: 'seed-2',
    name: '半馬備賽學員',
    isAnonymous: false,
    rating: 5,
    content: '以前跑步很容易三分鐘熱度，加入團練後，有課表、有教練、有同伴，訓練突然變成一件會期待的事。',
    createdAt: '2026-05-08',
  },
]

export default function TestimonialComments() {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [name, setName] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey)
    if (saved) {
      setComments(JSON.parse(saved) as Comment[])
    }
  }, [])

  const visibleName = useMemo(() => {
    if (isAnonymous) return '匿名跑者'
    return name.trim() || '好運跑者'
  }, [isAnonymous, name])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedContent = content.trim()
    if (!trimmedContent) return

    const nextComments = [
      {
        id: crypto.randomUUID(),
        name: visibleName,
        isAnonymous,
        rating,
        content: trimmedContent,
        createdAt: new Date().toISOString(),
      },
      ...comments,
    ]

    setComments(nextComments)
    window.localStorage.setItem(storageKey, JSON.stringify(nextComments))
    setName('')
    setIsAnonymous(false)
    setRating(5)
    setContent('')
  }

  return (
    <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
              Leave a note
            </p>
            <h2 className="mb-5 text-3xl font-bold text-apple-gray-900 md:text-4xl">
              把你的好運時刻留下來。
            </h2>
            <p className="mb-8 text-lg leading-8 text-apple-gray-600">
              你可以寫下課程感受、訓練突破、第一次完成目標的瞬間，也可以選擇匿名。這裡先讓留言保存在你的瀏覽器，之後接上資料庫後，就能成為公開的學員牆。
            </p>

            <form onSubmit={handleSubmit} className="rounded-3xl border border-black/10 bg-apple-gray-50 p-6 md:p-8">
              <div className="mb-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-apple-gray-800">
                    顯示名稱
                  </label>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={isAnonymous}
                    placeholder="例如：台北夜跑班學員"
                    className="apple-input disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-apple-gray-800">
                    推薦程度
                  </label>
                  <div className="flex h-[50px] items-center gap-2 rounded-2xl border border-black/10 bg-white/85 px-4 shadow-sm">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className="text-amber-400 transition-transform duration-200 hover:scale-110"
                        aria-label={`${value} 星`}
                      >
                        <Star className={`h-6 w-6 ${value <= rating ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <label className="mb-5 flex items-center gap-3 rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-sm font-semibold text-apple-gray-800">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(event) => setIsAnonymous(event.target.checked)}
                  className="h-4 w-4 rounded border-black/20"
                />
                匿名留言
              </label>

              <div className="mb-6">
                <label className="mb-2 block text-sm font-semibold text-apple-gray-800">
                  想對好運說的話
                </label>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={6}
                  placeholder="寫下你的訓練感受、突破、或想推薦給下一位跑者的理由..."
                  className="apple-input resize-none"
                />
              </div>

              <button type="submit" className="apple-button-primary w-full gap-2">
                <Send className="h-4 w-4" />
                送出評論
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {comments.map((comment, index) => (
              <motion.article
                key={comment.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
                className="apple-card p-6"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-apple-gray-900">{comment.name}</h3>
                      <p className="text-xs text-apple-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                  </div>
                  <div className="flex text-amber-400">
                    {Array.from({ length: comment.rating }).map((_, starIndex) => (
                      <Star key={starIndex} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="leading-7 text-apple-gray-700">{comment.content}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
