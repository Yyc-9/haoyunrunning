'use client'

import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { defaultSiteContent, type SiteContent } from '@/lib/site-content'
import { applyCourseOverrides, type ManagedCourse } from '@/lib/managed-courses'
import {
  SITE_CONTENT_UPDATED_EVENT,
  SITE_CONTENT_UPDATED_STORAGE_KEY,
  type SiteContentUpdatedDetail,
} from '@/lib/site-content-sync'

type SiteContentContextValue = SiteContent & {
  courses: ManagedCourse[]
  isLoading: boolean
  hasSyncedContent: boolean
}

const SiteContentContext = createContext<SiteContentContextValue | null>(null)

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [content, setContent] = useState<SiteContent>(defaultSiteContent)
  const [isLoading, setIsLoading] = useState(true)
  const [hasSyncedContent, setHasSyncedContent] = useState(false)
  const requestIdRef = useRef(0)
  const previousPathnameRef = useRef(pathname)

  const loadContent = useCallback(async (showLoading = false) => {
    const requestId = ++requestIdRef.current
    if (showLoading) setIsLoading(true)

    try {
      const response = await fetch('/api/site-content', { cache: 'no-store' })
      if (!response.ok) throw new Error('網站內容暫時無法更新。')
      const payload = (await response.json()) as { content?: SiteContent; source?: string }
      if (requestId === requestIdRef.current && payload.content) {
        setContent(payload.content)
        setHasSyncedContent(payload.source === 'database')
      }
    } catch (error) {
      console.error('Load site content failed:', error)
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadContent(true)
  }, [loadContent])

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return
    previousPathnameRef.current = pathname
    void loadContent()
  }, [loadContent, pathname])

  useEffect(() => {
    function handleContentUpdate(event: Event) {
      const detail = (event as CustomEvent<SiteContentUpdatedDetail>).detail
      if (detail?.content) {
        requestIdRef.current += 1
        setContent(detail.content)
        setHasSyncedContent(true)
        setIsLoading(false)
        return
      }
      void loadContent()
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === SITE_CONTENT_UPDATED_STORAGE_KEY) void loadContent()
    }

    window.addEventListener(SITE_CONTENT_UPDATED_EVENT, handleContentUpdate)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(SITE_CONTENT_UPDATED_EVENT, handleContentUpdate)
      window.removeEventListener('storage', handleStorage)
    }
  }, [loadContent])

  const value = useMemo(
    () => ({
      ...content,
      courses: applyCourseOverrides(content.courseOverrides, {
        coachProfiles: content.coachProfiles,
        onlyConfigured: Object.keys(content.courseOverrides).length > 0,
      }),
      isLoading,
      hasSyncedContent,
    }),
    [content, hasSyncedContent, isLoading]
  )

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>
}

export function useSiteContent() {
  const context = useContext(SiteContentContext)
  if (!context) throw new Error('useSiteContent must be used within SiteContentProvider')
  return context
}
