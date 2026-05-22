'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FAQItemProps {
  question: string
  answer: string
  isOpen?: boolean
  onToggle?: () => void
}

export default function FAQItem({ question, answer, isOpen = false, onToggle }: FAQItemProps) {
  const [open, setOpen] = useState(isOpen)

  const handleToggle = () => {
    setOpen(!open)
    onToggle?.()
  }

  return (
    <div className="border-b border-black/10 last:border-b-0">
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between py-4 px-0 text-left hover:text-apple-blue transition-colors"
      >
        <h4 className="font-bold text-apple-gray-900">{question}</h4>
        <ChevronDown
          className="h-5 w-5 text-apple-gray-500 transition-transform duration-300 flex-shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      {open && (
        <div className="pb-4">
          <p className="text-sm leading-7 text-apple-gray-600">{answer}</p>
        </div>
      )}
    </div>
  )
}
