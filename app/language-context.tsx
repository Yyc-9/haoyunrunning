'use client'

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { defaultLanguage, dictionary, type Dictionary, type Language } from '@/lib/dictionary'
import {
  createLocalizationMemory,
  localizeRememberedValue,
  type LocalizationMemory,
} from '@/lib/language-dom'
import { toSimplifiedWebsiteText } from '@/lib/traditional-chinese'

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: Dictionary
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export { LanguageContext }

function convertVisibleText(
  root: ParentNode,
  language: Language,
  memory: LocalizationMemory,
) {
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
    const nextValue = localizeRememberedValue(
      node,
      'text',
      node.nodeValue ?? '',
      language,
      memory,
    )
    if (node.nodeValue !== nextValue) node.nodeValue = nextValue
  })

  const scope = root instanceof Element ? root : document
  const elements = [
    ...(root instanceof HTMLElement && root.matches('[placeholder], [aria-label], [title]')
      ? [root]
      : []),
    ...scope.querySelectorAll<HTMLElement>('[placeholder], [aria-label], [title]'),
  ]
  elements.forEach((element) => {
    ;['placeholder', 'aria-label', 'title'].forEach((attribute) => {
      const value = element.getAttribute(attribute)
      if (!value) return
      const nextValue = localizeRememberedValue(
        element,
        attribute,
        value,
        language,
        memory,
      )
      if (value !== nextValue) element.setAttribute(attribute, nextValue)
    })
  })
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage)
  const localizationMemory = useRef(createLocalizationMemory()).current

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem('language')
    if (storedLanguage === 'zh-TW' || storedLanguage === 'zh-CN' || storedLanguage === 'en') {
      setLanguageState(storedLanguage)
    }
  }, [])

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage)
    window.localStorage.setItem('language', nextLanguage)
  }

  useEffect(() => {
    document.documentElement.lang = language
    let frame = window.requestAnimationFrame(() => {
      convertVisibleText(document.body, language, localizationMemory)
    })

    const observer = new MutationObserver((mutations) => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        mutations.forEach((mutation) => {
          if (mutation.target instanceof Element) {
            convertVisibleText(mutation.target, language, localizationMemory)
          } else if (mutation.target.parentElement) {
            convertVisibleText(mutation.target.parentElement, language, localizationMemory)
          }
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
  }, [language, localizationMemory])

  const localizedDictionary = useMemo(() => {
    const selected = dictionary[language]
    if (language !== 'zh-CN') return selected as Dictionary

    const convertValue = (value: unknown): unknown => {
      if (typeof value === 'string') return toSimplifiedWebsiteText(value)
      if (Array.isArray(value)) return value.map(convertValue)
      if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, convertValue(item)]))
      }
      return value
    }

    return convertValue(selected) as Dictionary
  }, [language])

  const value = useMemo(
    () => ({ language, setLanguage, t: localizedDictionary }),
    [language, localizedDictionary]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) throw new Error('useLanguage must be used within a LanguageProvider')
  return context
}
