'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { defaultLanguage, dictionary, type Dictionary, type Language } from '@/lib/dictionary'

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: Dictionary
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const simplifiedPairs: Array<[string, string]> = [
  ['運', '运'],
  ['訓', '训'],
  ['練', '练'],
  ['課', '课'],
  ['學', '学'],
  ['員', '员'],
  ['見', '见'],
  ['證', '证'],
  ['關', '关'],
  ['於', '于'],
  ['頁', '页'],
  ['帳', '账'],
  ['戶', '户'],
  ['登', '登'],
  ['錄', '录'],
  ['登入', '登录'],
  ['體', '体'],
  ['週', '周'],
  ['劃', '划'],
  ['計', '计'],
  ['個', '个'],
  ['專', '专'],
  ['業', '业'],
  ['與', '与'],
  ['實', '实'],
  ['現', '现'],
  ['選', '选'],
  ['擇', '择'],
  ['適', '适'],
  ['您', '您'],
  ['團', '团'],
  ['隊', '队'],
  ['資訊', '信息'],
  ['訊息', '信息'],
  ['資', '资'],
  ['訊', '讯'],
  ['據', '据'],
  ['標', '标'],
  ['來', '来'],
  ['調', '调'],
  ['畫', '画'],
  ['報', '报'],
  ['該', '该'],
  ['負', '负'],
  ['責', '责'],
  ['數', '数'],
  ['視', '视'],
  ['檢', '检'],
  ['筆', '笔'],
  ['諮', '咨'],
  ['詢', '询'],
  ['過', '过'],
  ['顯', '显'],
  ['態', '态'],
  ['綁', '绑'],
  ['饋', '馈'],
  ['處', '处'],
  ['風', '风'],
  ['險', '险'],
  ['庫', '库'],
  ['備', '备'],
  ['註', '注'],
  ['節', '节'],
  ['奏', '奏'],
  ['長', '长'],
  ['離', '离'],
  ['恢', '恢'],
  ['復', '复'],
  ['輯', '辑'],
  ['輯', '辑'],
  ['進', '进'],
  ['入', '入'],
  ['教練', '教练'],
  ['狀', '状'],
  ['則', '则'],
  ['讓', '让'],
  ['認', '认'],
  ['嘗', '尝'],
  ['愛', '爱'],
  ['灣', '湾'],
  ['從', '从'],
  ['這', '这'],
  ['裡', '里'],
  ['為', '为'],
  ['會', '会'],
  ['後', '后'],
  ['時', '时'],
  ['間', '间'],
  ['開', '开'],
  ['點', '点'],
  ['張', '张'],
  ['趙', '赵'],
  ['剛', '刚'],
  ['彈', '弹'],
  ['導', '导'],
  ['營', '营'],
  ['馬', '马'],
  ['半馬', '半马'],
  ['全馬', '全马'],
  ['裡', '里'],
  ['寫', '写'],
  ['讀', '读'],
  ['聲', '声'],
  ['語', '语'],
  ['暫', '暂'],
  ['儲', '储'],
  ['複', '复'],
  ['製', '制'],
  ['貼', '贴'],
  ['單', '单'],
  ['欄', '栏'],
  ['號', '号'],
  ['碼', '码'],
  ['邀請碼', '邀请码'],
  ['啟', '启'],
  ['權', '权'],
  ['限', '限'],
  ['測', '测'],
  ['試', '试'],
  ['郵', '邮'],
  ['箱', '箱'],
  ['電', '电'],
  ['話', '话'],
  ['聯', '联'],
  ['絡', '络'],
  ['購', '购'],
  ['買', '买'],
  ['結', '结'],
  ['帳', '账'],
  ['價', '价'],
  ['錢', '钱'],
  ['無', '无'],
  ['還', '还'],
  ['沒', '没'],
  ['請', '请'],
  ['輸', '输'],
  ['鐘', '钟'],
  ['輕', '轻'],
  ['鬆', '松'],
  ['剛剛好', '刚刚好'],
]

function toSimplified(value: string) {
  return [...simplifiedPairs]
    .sort((a, b) => b[0].length - a[0].length)
    .reduce((text, [from, to]) => text.replaceAll(from, to), value)
}

function simplifyVisibleText(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT

      if (['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT
      }

      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const textNodes: Text[] = []
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text)
  }

  textNodes.forEach((node) => {
    const nextValue = toSimplified(node.nodeValue ?? '')
    if (node.nodeValue !== nextValue) {
      node.nodeValue = nextValue
    }
  })

  document.querySelectorAll<HTMLElement>('[placeholder], [aria-label], [title]').forEach((element) => {
    ;['placeholder', 'aria-label', 'title'].forEach((attribute) => {
      const value = element.getAttribute(attribute)
      if (!value) return

      const nextValue = toSimplified(value)
      if (value !== nextValue) element.setAttribute(attribute, nextValue)
    })
  })
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage)

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem('language') as Language | null
    if (savedLanguage && savedLanguage in dictionary) {
      setLanguageState(savedLanguage)
    }
  }, [])

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage)
    window.localStorage.setItem('language', nextLanguage)
  }

  useEffect(() => {
    document.documentElement.lang = language

    if (language !== 'zh-CN') return

    let frame = window.requestAnimationFrame(() => {
      simplifyVisibleText(document.body)
    })

    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        simplifyVisibleText(document.body)
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
  }, [language])

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: dictionary[language],
    }),
    [language]
  )

  return <LanguageContext.Provider value={value}><React.Fragment key={language}>{children}</React.Fragment></LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
