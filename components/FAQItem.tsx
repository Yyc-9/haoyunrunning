'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FAQItemProps {
  question: string
  answer: string
  isOpen?: boolean
  onToggle?: () => void
}

export default function FAQItem({ question, answer, isOpen = false, onToggle }: FAQItemProps) {
  const [open, setOpen] = useState(isOpen)
  const answerId = useId()

  const handleToggle = () => {
    setOpen(!open)
    onToggle?.()
  }

  return (
    <div className="border-b border-black/10 last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={answerId}
        onClick={handleToggle}
        className="flex w-full items-center justify-between py-4 px-0 text-left hover:text-apple-blue transition-colors"
      >
        <h4 className="font-bold text-apple-gray-900">{question}</h4>
        <ChevronDown
          aria-hidden="true"
          className="h-5 w-5 text-apple-gray-500 transition-transform duration-200 motion-reduce:transition-none flex-shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <div id={answerId} aria-hidden={!open} className={`grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <p className="pb-4 text-sm leading-7 text-apple-gray-600">{answer}</p>
        </div>
      </div>
    </div>
  )
}
