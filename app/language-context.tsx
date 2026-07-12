'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { defaultLanguage, dictionary, type Dictionary, type Language } from '@/lib/dictionary'

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: Dictionary
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export { LanguageContext }

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
  ['登入', '登入'],
  ['體', '体'],
  ['週', '周'],
  ['劃', '划'],
  ['計', '计'],
  ['個', '个'],
  ['專', '专'],
  ['業', '业'],
  ['與', '與'],
  ['實', '实'],
  ['現', '现'],
  ['選', '选'],
  ['擇', '择'],
  ['適', '适'],
  ['您', '您'],
  ['團', '团'],
  ['隊', '队'],
  ['資訊', '資訊'],
  ['訊息', '資訊'],
  ['資', '资'],
  ['訊', '讯'],
  ['據', '据'],
  ['標', '標'],
  ['來', '来'],
  ['調', '调'],
  ['畫', '画'],
  ['報', '報'],
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
  ['教練', '教練'],
  ['狀', '状'],
  ['則', '则'],
  ['讓', '讓'],
  ['認', '认'],
  ['嘗', '尝'],
  ['愛', '爱'],
  ['灣', '湾'],
  ['從', '从'],
  ['這', '这'],
  ['裡', '里'],
  ['為', '为'],
  ['會', '會'],
  ['後', '後'],
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
  ['補', '补'],
  ['習', '习'],
  ['階', '阶'],
  ['鳥', '鸟'],
  ['馬', '马'],
  ['半馬', '半馬'],
  ['全馬', '全馬'],
  ['裡', '里'],
  ['寫', '写'],
  ['讀', '讀'],
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
  ['碼', '碼'],
  ['邀請碼', '邀請碼'],
  ['啟', '启'],
  ['權', '权'],
  ['限', '限'],
  ['測', '测'],
  ['試', '試'],
  ['郵', '邮'],
  ['箱', '箱'],
  ['電', '電'],
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
  ['還', '還'],
  ['沒', '没'],
  ['請', '請'],
  ['輸', '输'],
  ['鐘', '钟'],
  ['輕', '轻'],
  ['鬆', '松'],
  ['剛剛好', '刚刚好'],
  ['穩', '稳'],
  ['遠', '远'],
  ['賽', '赛'],
  ['華', '华'],
  ['國', '国'],
  ['級', '級'],
  ['協', '协'],
  ['師', '师'],
  ['碩', '硕'],
  ['賢', '贤'],
  ['陞', '升'],
  ['閔', '闵'],
  ['戰', '战'],
  ['術', '术'],
  ['長', '长'],
  ['們', '们'],
  ['臺', '台'],
  ['壓', '压'],
  ['質', '质'],
  ['幫', '幫'],
  ['傷', '傷'],
  ['訊號', '訊號'],
]

function toSimplified(value: string) {
  return [...simplifiedPairs]
    .sort((a, b) => b[0].length - a[0].length)
    .reduce((text, [from, to]) => text.replaceAll(from, to), value)
}

const traditionalPairs: Array<[string, string]> = [
  ['登入', '登入'],
  ['帳號', '帳號'],
  ['帳戶', '帳戶'],
  ['好運', '好運'],
  ['訓練', '訓練'],
  ['課程', '課程'],
  ['學員', '學員'],
  ['教練', '教練'],
  ['課表', '課表'],
  ['回饋', '回饋'],
  ['綁定', '綁定'],
  ['邀請碼', '邀請碼'],
  ['風險', '風險'],
  ['狀態', '狀態'],
  ['資料', '資料'],
  ['資料库', '資料庫'],
  ['資訊', '資訊'],
  ['諮詢', '諮詢'],
  ['報名', '報名'],
  ['確認', '確認'],
  ['後台', '後台'],
  ['儲存', '儲存'],
  ['储存', '儲存'],
  ['讀取', '讀取'],
  ['失敗', '失敗'],
  ['这一周', '這一週'],
  ['本周', '本週'],
  ['下周', '下週'],
  ['上一周', '上一週'],
  ['下一周', '下一週'],
  ['周', '週'],
  ['後續', '後續'],
  ['之後', '之後'],
  ['目前计划', '目前計畫'],
  ['訓練计划', '訓練計畫'],
  ['訓練感受', '訓練感受'],
  ['訓練回報', '訓練回報'],
  ['訓練回饋', '訓練回饋'],
  ['適合', '適合'],
  ['目標', '目標'],
  ['地點', '地點'],
  ['費用', '費用'],
  ['金額', '金額'],
  ['匯款', '匯款'],
  ['网银', '網銀'],
  ['轉帳', '轉帳'],
  ['备注', '備註'],
  ['請', '請'],
  ['輸入', '輸入'],
  ['填寫', '填寫'],
  ['選擇', '選擇'],
  ['進入', '進入'],
  ['聯絡', '聯絡'],
  ['暫無', '暫無'],
  ['已綁定', '已綁定'],
  ['尚未綁定', '尚未綁定'],
  ['真實', '真實'],
  ['團隊', '團隊'],
  ['團練', '團練'],
  ['台灣', '台灣'],
  ['板桥', '板橋'],
  ['体育场', '體育場'],
  ['田径场', '田徑場'],
  ['运动场', '運動場'],
  ['半馬', '半馬'],
  ['全馬', '全馬'],
  ['馬拉松', '馬拉松'],
  ['節奏', '節奏'],
  ['間歇', '間歇'],
  ['輕鬆', '輕鬆'],
  ['恢復', '恢復'],
  ['长距离', '長距離'],
  ['疲勞', '疲勞'],
  ['上传', '上傳'],
  ['截图', '截圖'],
  ['信箱', '信箱'],
  ['手机', '手機'],
  ['旧生', '舊生'],
  ['推薦', '推薦'],
  ['中国信托', '中國信託'],
  ['銀行', '銀行'],
]

function toTraditional(value: string) {
  return [...traditionalPairs]
    .sort((a, b) => b[0].length - a[0].length)
    .reduce((text, [from, to]) => text.replaceAll(from, to), value)
}

const englishPairs: Array<[string, string]> = [
  ['我要報名 / 諮詢課程', 'I want to join / ask about classes'],
  ['我要報名 / 諮詢課程', 'I want to join / ask about classes'],
  ['我是已報名學員', 'I am a registered student'],
  ['我是已報名學員', 'I am a registered student'],
  ['我是教練', 'I am a coach'],
  ['我是教練', 'I am a coach'],
  ['訓練日程表', 'Training Schedule'],
  ['訓練日程表', 'Training Schedule'],
  ['費用與名额請透過 Instagram 諮詢', 'Please contact us on Instagram for pricing and availability'],
  ['費用與名額請透過 Instagram 諮詢', 'Please contact us on Instagram for pricing and availability'],
  ['學員中心', 'Student Center'],
  ['學員中心', 'Student Center'],
  ['教練後台', 'Coach Workspace'],
  ['教練後台', 'Coach Workspace'],
  ['學員看板', 'Student Dashboard'],
  ['學員看板', 'Student Dashboard'],
  ['教練入口', 'Coach Entry'],
  ['教練入口', 'Coach Entry'],
  ['訓練回饋', 'Training Feedback'],
  ['訓練回饋', 'Training Feedback'],
  ['訓練回報', 'Training Feedback'],
  ['訓練回報', 'Training Feedback'],
  ['課表面板', 'Training Plan Board'],
  ['課表面板', 'Training Plan Board'],
  ['教練權限', 'Coach Access'],
  ['教練權限', 'Coach Access'],
  ['綁定學員', 'Bind Student'],
  ['綁定學員', 'Bind Student'],
  ['風險免责声明', 'Risk Disclaimer'],
  ['風險免責聲明', 'Risk Disclaimer'],
  ['課程付款', 'Course Payment'],
  ['課程付款', 'Course Payment'],
  ['上课时间', 'Class Time'],
  ['上課時間', 'Class Time'],
  ['集合地點', 'Meeting Point'],
  ['集合地點', 'Meeting Point'],
  ['適合对象', 'Audience'],
  ['適合對象', 'Audience'],
  ['訓練目標', 'Training Goal'],
  ['訓練目標', 'Training Goal'],
  ['課程週期', 'Course Period'],
  ['課程週期', 'Course Period'],
  ['課程強度', 'Intensity'],
  ['課程強度', 'Intensity'],
  ['是否適合新手', 'Beginner Friendly'],
  ['是否適合新手', 'Beginner Friendly'],
  ['報名方式', 'Signup Method'],
  ['報名方式', 'Signup Method'],
  ['訓練', 'Training'],
  ['訓練', 'Training'],
  ['課程', 'Course'],
  ['課程', 'Course'],
  ['學員', 'Student'],
  ['學員', 'Student'],
  ['教練', 'Coach'],
  ['教練', 'Coach'],
  ['報名', 'Signup'],
  ['報名', 'Signup'],
  ['諮詢', 'Ask'],
  ['諮詢', 'Ask'],
  ['查看', 'View'],
  ['進入', 'Enter'],
  ['進入', 'Enter'],
  ['儲存', 'Save'],
  ['儲存', 'Save'],
  ['同步', 'Sync'],
  ['暫無', 'No data yet'],
  ['暫無', 'No data yet'],
  ['請輸入', 'Enter '],
  ['請輸入', 'Enter '],
  ['選擇', 'Select'],
  ['選擇', 'Select'],
  ['首页', 'Home'],
  ['首頁', 'Home'],
  ['关于我們', 'About'],
  ['關於我們', 'About'],
  ['商店', 'Shop'],
]

function toEnglish(value: string) {
  return [...englishPairs]
    .sort((a, b) => b[0].length - a[0].length)
    .reduce((text, [from, to]) => text.replaceAll(from, to), value)
}

function convertVisibleText(root: ParentNode, converter: (value: string) => string) {
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
    const nextValue = converter(node.nodeValue ?? '')
    if (node.nodeValue !== nextValue) {
      node.nodeValue = nextValue
    }
  })

  document.querySelectorAll<HTMLElement>('[placeholder], [aria-label], [title]').forEach((element) => {
    ;['placeholder', 'aria-label', 'title'].forEach((attribute) => {
      const value = element.getAttribute(attribute)
      if (!value) return

      const nextValue = converter(value)
      if (value !== nextValue) element.setAttribute(attribute, nextValue)
    })
  })
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage)

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem('language') as Language | null
    if (savedLanguage === defaultLanguage) {
      setLanguageState(savedLanguage)
    } else if (savedLanguage) {
      window.localStorage.setItem('language', defaultLanguage)
    }
  }, [])

  const setLanguage = (nextLanguage: Language) => {
    const normalizedLanguage = nextLanguage === defaultLanguage ? nextLanguage : defaultLanguage
    setLanguageState(normalizedLanguage)
    window.localStorage.setItem('language', normalizedLanguage)
  }

  useEffect(() => {
    document.documentElement.lang = language

    const converter = language === 'en' ? toEnglish : language === 'zh-TW' ? toTraditional : toSimplified

    let frame = window.requestAnimationFrame(() => {
      convertVisibleText(document.body, converter)
    })

    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        convertVisibleText(document.body, converter)
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
