'use client'

import { useEffect, useState } from 'react'
import { Check, LayoutGrid, List } from 'lucide-react'
import { useLanguage } from '@/app/language-context'

export type StudentDisplay = 'compact' | 'comfortable'
const preferenceKey = 'coach-student-display'

export function useStudentDisplay() {
  const [display, setDisplay] = useState<StudentDisplay>('comfortable')
  useEffect(() => {
    try {
      const saved = localStorage.getItem(preferenceKey)
      if (saved === 'compact' || saved === 'comfortable') setDisplay(saved)
    } catch { /* Display controls also work when storage is unavailable. */ }
  }, [])
  function changeDisplay(value: StudentDisplay) {
    setDisplay(value)
    try { localStorage.setItem(preferenceKey, value) } catch { /* Keep the in-memory preference. */ }
  }
  return [display, changeDisplay] as const
}

export default function StudentDisplayToggle({ value, onChange }: { value: StudentDisplay; onChange: (value: StudentDisplay) => void }) {
  const { language } = useLanguage()
  const english = language === 'en'
  return (
    <div role="group" aria-label={english ? 'Student display size' : '學員資訊顯示大小'} className="inline-flex shrink-0 overflow-hidden rounded-full border border-slate-400 bg-white">
      {([
        { id: 'compact', label: english ? 'Compact' : '緊湊', Icon: List },
        { id: 'comfortable', label: english ? 'Comfortable' : '舒適', Icon: LayoutGrid },
      ] as const).map(({ id, label, Icon }) => (
        <button key={id} type="button" aria-label={label} aria-pressed={value === id} onClick={() => onChange(id)} title={label}
          className={`inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold outline-none motion-safe:transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${id === 'comfortable' ? 'border-l border-slate-400' : ''} ${value === id ? 'bg-sky-100 text-sky-950' : 'text-slate-600 hover:bg-slate-50'}`}>
          <Check aria-hidden="true" className={`h-4 w-4 ${value === id ? 'opacity-100' : 'opacity-0'}`} />
          <Icon aria-hidden="true" className="h-5 w-5" />
        </button>
      ))}
    </div>
  )
}
