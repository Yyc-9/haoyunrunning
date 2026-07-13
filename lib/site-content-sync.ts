import type { SiteContent } from '@/lib/site-content'

export const SITE_CONTENT_UPDATED_EVENT = 'goodluck:site-content-updated'
export const SITE_CONTENT_UPDATED_STORAGE_KEY = 'goodluck:site-content-updated-at'

export type SiteContentUpdatedDetail = {
  content?: SiteContent
}

export function announceSiteContentUpdated(content?: SiteContent) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent<SiteContentUpdatedDetail>(SITE_CONTENT_UPDATED_EVENT, {
      detail: { content },
    })
  )
  window.localStorage.setItem(SITE_CONTENT_UPDATED_STORAGE_KEY, String(Date.now()))
}
