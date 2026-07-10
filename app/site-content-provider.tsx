'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { allCourses } from '@/lib/goodluck-data'
import { defaultSiteContent, type SiteContent } from '@/lib/site-content'

type ManagedCourse = (typeof allCourses)[number]

type SiteContentContextValue = SiteContent & {
  courses: ManagedCourse[]
  isLoading: boolean
}

const SiteContentContext = createContext<SiteContentContextValue | null>(null)

function applyCourseOverrides(content: SiteContent) {
  return allCourses
    .map((course) => {
      const override = content.courseOverrides[course.slug]
      if (!override) return course

      const name = override.name || course.name
      const location = override.location || course.location
      const classTime = override.classTime || course.classTime
      const focus = override.focus || course.focus
      const feeNote = override.feeNote || course.feeNote

      return {
        ...course,
        ...override,
        name,
        title: override.name || course.title,
        location,
        city: location,
        classTime,
        time: classTime,
        focus,
        trainingGoal: focus,
        trainingGoals: focus ? [focus] : course.trainingGoals,
        feeNote,
        priceNote: feeNote,
        targetAudience: override.targetAudience || course.targetAudience,
      }
    })
    .filter((course) => content.courseOverrides[course.slug]?.active !== false)
}

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
    () => ({ ...content, courses: applyCourseOverrides(content), isLoading }),
    [content, isLoading]
  )

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>
}

export function useSiteContent() {
  const context = useContext(SiteContentContext)
  if (!context) throw new Error('useSiteContent must be used within SiteContentProvider')
  return context
}
