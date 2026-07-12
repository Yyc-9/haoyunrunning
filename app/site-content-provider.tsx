'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { defaultSiteContent, type SiteContent } from '@/lib/site-content'
import { applyCourseOverrides, type ManagedCourse } from '@/lib/managed-courses'

type SiteContentContextValue = SiteContent & {
  courses: ManagedCourse[]
  isLoading: boolean
}

const SiteContentContext = createContext<SiteContentContextValue | null>(null)

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent>(defaultSiteContent)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    fetch('/api/site-content', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('網站內容暫時無法更新。')
        return response.json() as Promise<{ content?: SiteContent }>
      })
      .then((payload) => {
        if (active && payload.content) setContent(payload.content)
      })
      .catch((error) => console.error('Load site content failed:', error))
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const value = useMemo(
    () => ({ ...content, courses: applyCourseOverrides(content.courseOverrides), isLoading }),
    [content, isLoading]
  )

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>
}

export function useSiteContent() {
  const context = useContext(SiteContentContext)
  if (!context) throw new Error('useSiteContent must be used within SiteContentProvider')
  return context
}
