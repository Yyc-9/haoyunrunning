'use client'
import { useEffect, useRef, type ReactNode } from 'react'

export default function AttendanceEditorPanel({ open, busy, onClose, children }: { open: boolean; busy: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (open) dialog?.showModal()
    return () => dialog?.close()
  }, [open])
  if (!open) return <>{children}</>
  return <dialog ref={ref} aria-label="編輯學員出勤" onCancel={e => { e.preventDefault(); if (!busy) onClose() }} className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-2xl bg-white p-4 pb-10 shadow-xl backdrop:bg-black/30 md:inset-y-0 md:left-auto md:right-0 md:ml-auto md:h-dvh md:max-h-screen md:max-w-xl md:rounded-none">{children}</dialog>
}
