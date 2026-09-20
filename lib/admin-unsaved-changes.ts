'use client'

import { useEffect } from 'react'

const navigationEvent = 'admin-before-workspace-change'
export function confirmAdminWorkspaceChange() {
  return window.dispatchEvent(new Event(navigationEvent, { cancelable: true }))
}

export function useAdminUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const navigate = (event: Event) => {
      if (!event.defaultPrevented && !window.confirm('有尚未儲存的修改，確定放棄並離開工作區？')) event.preventDefault()
    }
    window.addEventListener('beforeunload', unload)
    window.addEventListener(navigationEvent, navigate)
    return () => { window.removeEventListener('beforeunload', unload); window.removeEventListener(navigationEvent, navigate) }
  }, [dirty])
}
