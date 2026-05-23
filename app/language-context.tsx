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
  ['補', '补'],
  ['習', '习'],
  ['階', '阶'],
  ['鳥', '鸟'],
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
  ['穩', '稳'],
  ['遠', '远'],
  ['賽', '赛'],
  ['華', '华'],
  ['國', '国'],
  ['級', '级'],
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
  ['幫', '帮'],
  ['傷', '伤'],
  ['訊號', '信号'],
]

function toSimplified(value: string) {
  return [...simplifiedPairs]
    .sort((a, b) => b[0].length - a[0].length)
    .reduce((text, [from, to]) => text.replaceAll(from, to), value)
}

const traditionalPairs: Array<[string, string]> = [
  ['登录', '登入'],
  ['账号', '帳號'],
  ['账户', '帳戶'],
  ['好运', '好運'],
  ['训练', '訓練'],
  ['课程', '課程'],
  ['学员', '學員'],
  ['教练', '教練'],
  ['课表', '課表'],
  ['回馈', '回饋'],
  ['绑定', '綁定'],
  ['邀请码', '邀請碼'],
  ['风险', '風險'],
  ['状态', '狀態'],
  ['数据', '資料'],
  ['数据库', '資料庫'],
  ['信息', '資訊'],
  ['咨询', '諮詢'],
  ['报名', '報名'],
  ['确认', '確認'],
  ['后台', '後台'],
  ['保存', '儲存'],
  ['储存', '儲存'],
  ['读取', '讀取'],
  ['失败', '失敗'],
  ['这一周', '這一週'],
  ['本周', '本週'],
  ['下周', '下週'],
  ['上一周', '上一週'],
  ['下一周', '下一週'],
  ['周', '週'],
  ['后续', '後續'],
  ['之后', '之後'],
  ['目前计划', '目前計畫'],
  ['训练计划', '訓練計畫'],
  ['训练感受', '訓練感受'],
  ['训练回报', '訓練回報'],
  ['训练回馈', '訓練回饋'],
  ['适合', '適合'],
  ['目标', '目標'],
  ['地点', '地點'],
  ['费用', '費用'],
  ['金额', '金額'],
  ['汇款', '匯款'],
  ['网银', '網銀'],
  ['转账', '轉帳'],
  ['备注', '備註'],
  ['请', '請'],
  ['输入', '輸入'],
  ['填写', '填寫'],
  ['选择', '選擇'],
  ['进入', '進入'],
  ['联系', '聯絡'],
  ['暂无', '暫無'],
  ['已绑定', '已綁定'],
  ['尚未绑定', '尚未綁定'],
  ['真实', '真實'],
  ['团队', '團隊'],
  ['团练', '團練'],
  ['台湾', '台灣'],
  ['板桥', '板橋'],
  ['半马', '半馬'],
  ['全马', '全馬'],
  ['马拉松', '馬拉松'],
  ['节奏', '節奏'],
  ['间歇', '間歇'],
  ['轻松', '輕鬆'],
  ['恢复', '恢復'],
  ['长距离', '長距離'],
  ['疲劳', '疲勞'],
  ['上传', '上傳'],
  ['截图', '截圖'],
  ['邮箱', '信箱'],
  ['手机', '手機'],
  ['旧生', '舊生'],
  ['推荐', '推薦'],
  ['中国信托', '中國信託'],
  ['银行', '銀行'],
]

function toTraditional(value: string) {
  return [...traditionalPairs]
    .sort((a, b) => b[0].length - a[0].length)
    .reduce((text, [from, to]) => text.replaceAll(from, to), value)
}

const englishPairs: Array<[string, string]> = [
  ['我要报名 / 咨询课程', 'I want to join / ask about classes'],
  ['我要報名 / 諮詢課程', 'I want to join / ask about classes'],
  ['我是已报名学员', 'I am a registered student'],
  ['我是已報名學員', 'I am a registered student'],
  ['我是教练', 'I am a coach'],
  ['我是教練', 'I am a coach'],
  ['训练日程表', 'Training Schedule'],
  ['訓練日程表', 'Training Schedule'],
  ['费用与名额请通过 Instagram 咨询', 'Please contact us on Instagram for pricing and availability'],
  ['費用與名額請透過 Instagram 諮詢', 'Please contact us on Instagram for pricing and availability'],
  ['学员中心', 'Student Center'],
  ['學員中心', 'Student Center'],
  ['教练后台', 'Coach Workspace'],
  ['教練後台', 'Coach Workspace'],
  ['学员看板', 'Student Dashboard'],
  ['學員看板', 'Student Dashboard'],
  ['教练入口', 'Coach Entry'],
  ['教練入口', 'Coach Entry'],
  ['训练回馈', 'Training Feedback'],
  ['訓練回饋', 'Training Feedback'],
  ['训练回报', 'Training Feedback'],
  ['訓練回報', 'Training Feedback'],
  ['课表面板', 'Training Plan Board'],
  ['課表面板', 'Training Plan Board'],
  ['教练权限', 'Coach Access'],
  ['教練權限', 'Coach Access'],
  ['绑定学员', 'Bind Student'],
  ['綁定學員', 'Bind Student'],
  ['风险免责声明', 'Risk Disclaimer'],
  ['風險免責聲明', 'Risk Disclaimer'],
  ['课程付款', 'Course Payment'],
  ['課程付款', 'Course Payment'],
  ['上课时间', 'Class Time'],
  ['上課時間', 'Class Time'],
  ['集合地点', 'Meeting Point'],
  ['集合地點', 'Meeting Point'],
  ['适合对象', 'Audience'],
  ['適合對象', 'Audience'],
  ['训练目标', 'Training Goal'],
  ['訓練目標', 'Training Goal'],
  ['课程周期', 'Course Period'],
  ['課程週期', 'Course Period'],
  ['课程强度', 'Intensity'],
  ['課程強度', 'Intensity'],
  ['是否适合新手', 'Beginner Friendly'],
  ['是否適合新手', 'Beginner Friendly'],
  ['报名方式', 'Signup Method'],
  ['報名方式', 'Signup Method'],
  ['训练', 'Training'],
  ['訓練', 'Training'],
  ['课程', 'Course'],
  ['課程', 'Course'],
  ['学员', 'Student'],
  ['學員', 'Student'],
  ['教练', 'Coach'],
  ['教練', 'Coach'],
  ['报名', 'Signup'],
  ['報名', 'Signup'],
  ['咨询', 'Ask'],
  ['諮詢', 'Ask'],
  ['查看', 'View'],
  ['进入', 'Enter'],
  ['進入', 'Enter'],
  ['保存', 'Save'],
  ['儲存', 'Save'],
  ['同步', 'Sync'],
  ['暂无', 'No data yet'],
  ['暫無', 'No data yet'],
  ['请输入', 'Enter '],
  ['請輸入', 'Enter '],
  ['选择', 'Select'],
  ['選擇', 'Select'],
  ['首页', 'Home'],
  ['首頁', 'Home'],
  ['关于我们', 'About'],
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

    const converter = language === 'en' ? toEnglish : toSimplified

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
