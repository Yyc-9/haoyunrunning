'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { defaultLanguage, dictionary, type Dictionary, type Language } from '@/lib/dictionary'
import { toTraditionalWebsiteText } from '@/lib/traditional-chinese'

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: Dictionary
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export { LanguageContext }

function convertVisibleText(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT
      }
      return node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    },
  })

  const textNodes: Text[] = []
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)

  textNodes.forEach((node) => {
    const nextValue = toTraditionalWebsiteText(node.nodeValue ?? '')
    if (node.nodeValue !== nextValue) node.nodeValue = nextValue
  })

  const scope = root instanceof Element ? root : document
  scope.querySelectorAll<HTMLElement>('[placeholder], [aria-label], [title]').forEach((element) => {
    ;['placeholder', 'aria-label', 'title'].forEach((attribute) => {
      const value = element.getAttribute(attribute)
      if (!value) return
      const nextValue = toTraditionalWebsiteText(value)
      if (value !== nextValue) element.setAttribute(attribute, nextValue)
    })
  })
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage)

  useEffect(() => {
    window.localStorage.setItem('language', defaultLanguage)
    setLanguageState(defaultLanguage)
  }, [])

  const setLanguage = (nextLanguage: Language) => {
    void nextLanguage
    setLanguageState(defaultLanguage)
    window.localStorage.setItem('language', defaultLanguage)
  }

  useEffect(() => {
    document.documentElement.lang = 'zh-TW'
    let frame = window.requestAnimationFrame(() => convertVisibleText(document.body))

    const observer = new MutationObserver((mutations) => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        mutations.forEach((mutation) => {
          if (mutation.target instanceof Element) convertVisibleText(mutation.target)
          else if (mutation.target.parentElement) convertVisibleText(mutation.target.parentElement)
        })
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'aria-label', 'title'],
    })

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  const value = useMemo(
    () => ({ language, setLanguage, t: dictionary[language] }),
    [language]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) throw new Error('useLanguage must be used within a LanguageProvider')
  return context
}
