'use client'

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { defaultLanguage, dictionary, type Dictionary, type Language } from '@/lib/dictionary'
import {
  createLocalizationMemory,
  localizeRememberedValue,
  type LazyLanguageConverter,
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
  converter?: LazyLanguageConverter,
) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(parent.tagName) || parent.closest('[translate="no"], [data-no-localize]')) {
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
      converter,
    )
    if (node.nodeValue !== nextValue) node.nodeValue = nextValue
  })

  const scope = root instanceof Element ? root : document
  const elements = [
    ...(root instanceof HTMLElement && root.matches('[placeholder], [aria-label], [title], [alt]')
      ? [root]
      : []),
    ...scope.querySelectorAll<HTMLElement>('[placeholder], [aria-label], [title], [alt]'),
  ]
  elements.forEach((element) => {
    if (element.closest('[translate="no"], [data-no-localize]')) return
    ;['placeholder', 'aria-label', 'title', 'alt'].forEach((attribute) => {
      const value = element.getAttribute(attribute)
      if (!value) return
      const nextValue = localizeRememberedValue(
        element,
        attribute,
        value,
        language,
        memory,
        converter,
      )
      if (value !== nextValue) element.setAttribute(attribute, nextValue)
    })
  })
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage)
  const localizationMemory = useRef(createLocalizationMemory()).current
  const converterRef = useRef<LazyLanguageConverter | undefined>(undefined)

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
    let cancelled = false
    converterRef.current = undefined
    if (language !== 'zh-TW') {
      void import('@/lib/traditional-opencc').then((module) => {
        if (cancelled) return
        converterRef.current = {
          toTraditional: module.toTraditionalWithOpenCC,
          toSimplified: module.toSimplifiedWithOpenCC,
        }
        convertVisibleText(document.body, language, localizationMemory, converterRef.current)
      })
    }
    // Keep every pending subtree. Cancelling a frame for each mutation used to
    // discard earlier batches and could even cancel the initial body translation.
    const pending = new Set<Element>([document.body])
    let frame: number | undefined
    const schedule = () => {
      if (frame !== undefined) return
      frame = window.requestAnimationFrame(() => {
        frame = undefined
        const roots = [...pending]
        pending.clear()
        for (const root of roots) {
          if (root.isConnected && !roots.some(other => other !== root && other.contains(root))) {
            convertVisibleText(root, language, localizationMemory, converterRef.current)
          }
        }
        const nextTitle = localizeRememberedValue(document, 'title', document.title, language, localizationMemory, converterRef.current)
        if (document.title !== nextTitle) document.title = nextTitle
      })
    }
    schedule()
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        const element = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement
        if (element) pending.add(element)
      }
      schedule()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'aria-label', 'title', 'alt'],
    })
    // Next.js may replace the title element during navigation.
    const titleObserver = new MutationObserver(mutations => {
      if (mutations.some(mutation =>
        (mutation.target instanceof Element ? mutation.target : mutation.target.parentElement)?.closest('title') ||
        [...mutation.addedNodes].some(node => node instanceof Element && (node.matches('title') || node.querySelector('title')))
      )) schedule()
    })
    titleObserver.observe(document.head, { childList: true, characterData: true, subtree: true })

    return () => {
      cancelled = true
      if (frame !== undefined) window.cancelAnimationFrame(frame)
      observer.disconnect()
      titleObserver.disconnect()
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
