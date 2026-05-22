export type Coach = {
  name: string
  role: string
  bio: string
  specialties: string[]
  style: string
  achievements: string[]
}

export type CourseGroup = {
  title: string
  description: string
  audience: string
  courses: Course[]
}

export type Course = {
  name: string
  weekday: string
  location: string
  period: string
  focus: string
  classTime?: string
  meetingPoint?: string
  beginnerFriendly?: boolean
  trialPolicy?: string
  absencePolicy?: string
  slogan?: string
  level?: string
  trainingItems?: string[]
  benefits?: string[]
  suitableFor?: string[]
  notSuitableFor?: string[]
  faq?: Array<{ question: string; answer: string }>
  instagramUrl?: string
  targetAudience?: string
  trainingGoals?: string[]
  coaches?: Coach[]
}

export const brandIntro = {
  name: '好運跑班',
  tagline: '認識跑步，嘗試跑步，愛上跑步',
  description:
    '面向台灣所有跑者的系統化跑步訓練團隊，陪伴新手小白、業餘跑者、專業跑者與菁英跑者備戰 5000m、10000m、半馬與全馬。',
}

export const recentActivities = [
  {
    title: '2026 好運跑步訓練營',
    description: '4 月至 6 月班級開放報名中，涵蓋台北、新竹、竹北、板橋、三重與竹南。',
    action: '查看班級',
    href: '/courses',
  },
  {
    title: '本週課表同步',
    description: '已報名學員可登入帳戶查看本週訓練安排，完成後提交訓練感受給教練。',
    action: '前往學員中心',
    href: '/profile',
  },
  {
    title: '聯絡好運跑班',
    description: '想了解適合自己的班級，可以先透過 Instagram 與我們聯絡。',
    action: 'Instagram',
    href: 'https://www.instagram.com/nurture.running.team/',
  },
]

export const courseGroups: CourseGroup[] = [
  {
    title: '好運初心補習班',
    description: '從認識跑步開始，建立穩定習慣、基礎體能與正確訓練觀念。',
    audience: '適合新手小白、剛開始規律跑步、想安全建立基礎的跑者。',
    courses: [
      {
        name: '2026 好運跑步訓練營 X 週二竹市初心補習班',
        weekday: '週二',
        location: '新竹市',
        period: '4/14 - 6/30',
        focus: '跑步入門、基礎體能、姿勢與節奏建立',
      },
      {
        name: '2026 好運跑步訓練營 X 週三板橋初心補習班',
        weekday: '週三',
        location: '板橋',
        period: '4/8 - 6/24',
        focus: '跑步入門、規律訓練、初階耐力建立',
      },
      {
        name: '2026 好運跑步訓練營 X 週四三重初心補習班',
        weekday: '週四',
        location: '三重',
        period: '4/9 - 6/25',
        focus: '跑步入門、身體控制、基礎跑力養成',
      },
    ],
  },
  {
    title: '好運跑班課程',
    description: '依照不同地點、時段與目標安排訓練，協助跑者備戰 5000m、10000m、半馬與全馬。',
    audience: '適合業餘跑者、目標賽事備賽者、追求 PB 的進階與菁英跑者。',
    courses: [
      {
        name: '2026 好運跑步訓練營 X 週一竹北夜跑班',
        weekday: '週一',
        location: '竹北',
        period: '4/13 - 6/29',
        focus: '夜間團練、耐力與節奏訓練',
      },
      {
        name: '2026 好運跑步訓練營 X 週三台北夜跑班',
        weekday: '週三',
        location: '台北',
        period: '4/8 - 6/24',
        focus: '夜間團練、基礎跑力與配速控制',
      },
      {
        name: '2026 好運跑步訓練營 X 週二台北 PB 班',
        weekday: '週二',
        location: '台北',
        period: '4/14 - 6/30',
        focus: '速度能力、間歇訓練、賽事 PB 目標',
      },
      {
        name: '2026 好運跑步訓練營 X 週三新竹早鳥班',
        weekday: '週三',
        location: '新竹',
        period: '4/8 - 6/24',
        focus: '晨間訓練、耐力建立、穩定輸出',
      },
      {
        name: '2026 好運跑步訓練營 X 週三竹北夜跑班',
        weekday: '週三',
        location: '竹北',
        period: '4/8 - 6/24',
        focus: '夜間團練、跑姿與肌耐力整合',
      },
      {
        name: '2026 好運跑步訓練營 X 週四竹市夜跑班',
        weekday: '週四',
        location: '新竹市',
        period: '4/9 - 6/25',
        focus: '夜間團練、配速感與有氧能力',
      },
      {
        name: '2026 好運跑步訓練營 X 週四竹南初階班',
        weekday: '週四',
        location: '竹南',
        period: '4/9 - 6/25',
        focus: '初階跑班、基礎體能與穩定訓練',
      },
      {
        name: '2026 好運跑步訓練營 X 週六台北早鳥班',
        weekday: '週六',
        location: '台北',
        period: '4/11 - 6/27',
        focus: '晨間團練、長距離基礎與賽事準備',
      },
    ],
  },
]

export const weeklySchedulePreview = [
  {
    day: '週一',
    workout: 'E 跑 8-10km',
    note: '維持有氧心率，跑後回報體感疲勞度。',
  },
  {
    day: '週三',
    workout: '間歇 800m x 6',
    note: '依教練設定配速完成，注意組間恢復。',
  },
  {
    day: '週六',
    workout: '長距離 16-24km',
    note: '依目標賽事調整距離，補給與配速一併記錄。',
  },
]

export function courseSlug(course: Course) {
  return course.name
    .replace(/^2026\s*好運跑步訓練營\s*X\s*/, '')
    .replaceAll('週', '周')
    .replaceAll('訓練', '训练')
    .replaceAll('補習', '补习')
    .replaceAll('課', '课')
    .replaceAll('階', '阶')
    .replace(/\s+/g, '-')
    .replace(/[，。/]/g, '-')
    .toLowerCase()
}

function getDefaultTrainingItems(course: Course): string[] {
  if (course.name.includes('初心') || course.name.includes('初階')) {
    return [
      '動態熱身與跑姿檢測',
      '基礎有氧訓練',
      '呼吸與節奏控制',
      '肌力與穩定性訓練',
      '跑後放鬆與恢復',
      '訓練回報與調整',
    ]
  }
  if (course.name.includes('PB')) {
    return [
      '動態熱身與技術跑',
      '間歇訓練與配速調控',
      '節奏跑與維持速度',
      '長距離耐力建立',
      '賽事策略與心理調整',
      '恢復與防傷指導',
    ]
  }
  return [
    '動態熱身與技術跑',
    '基礎有氧訓練',
    '跑姿與技術調整',
    '間歇訓練',
    '節奏跑與配速訓練',
    '長距離耐力訓練',
  ]
}

function getDefaultBenefits(course: Course): string[] {
  return [
    '建立穩定規律跑步習慣',
    '理解自己的配速與訓練強度',
    '提升有氧能力與跑步效率',
    '獲得教練個人化回饋',
    '加入固定團練社群',
    '為目標賽事打下堅實基礎',
  ]
}

function getDefaultSuitableFor(course: Course): string[] {
  if (course.name.includes('初心') || course.name.includes('初階')) {
    return [
      '想建立規律跑步習慣',
      '想從零開始學習正確跑步',
      '希望在安全的環境下漸進式訓練',
      '想加入團練社群獲得支持與動力',
    ]
  }
  return [
    '想建立規律跑步習慣',
    '想提升 5K / 10K / 半馬能力',
    '希望在團練中獲得動力與支持',
    '願意按教練安排循序漸進訓練',
  ]
}

function getDefaultNotSuitableFor(): string[] {
  return [
    '完全不想規律訓練',
    '只想偶爾散步而無具體目標',
    '身體不適但未經過評估',
    '無法配合固定團練時間',
  ]
}

function getDefaultFaq(): Array<{ question: string; answer: string }> {
  return [
    {
      question: '新手可以參加嗎？',
      answer: '當然可以！我們有專門為新手設計的初心補習班和初階班，從零開始教起。只要有興趣學習跑步，都歡迎加入。',
    },
    {
      question: '下雨怎麼辦？',
      answer: '小雨時團練照常進行，學員可自行決定是否參加。中大雨時教練會另行通知是否改期或改為線上課程，請關注 Instagram 通知。',
    },
    {
      question: '課程費用是多少？',
      answer: '費用與名額請透過 Instagram 私信咨詢，我們會根據您的情況推薦最適合的班級與定價方案。',
    },
    {
      question: '可以請假嗎？',
      answer: '當然可以。請假與補課規則會在開課時詳細說明。我們支援合理的請假申請，但建議盡量不要缺課以保持訓練連貫性。',
    },
    {
      question: '可以試上嗎？',
      answer: '是否可試上請通過 Instagram 咨詢當期名額。試上可以幫助您了解班級風格與訓練強度是否符合需求。',
    },
  ]
}

function getDefaultCoach(course: Course): Coach {
  if (course.name.includes('PB')) {
    return {
      name: '張育豪 教練',
      role: '本課程教練',
      bio: '熟悉跑步與肌力訓練，擅長協助跑者建立穩定訓練節奏，依照不同程度調整訓練內容。',
      specialties: ['耐力訓練', '跑姿調整', '馬拉松備賽'],
      style: '穩定陪跑、重視回饋、循序漸進',
      achievements: ['全馬 PB 3:02:15', '長期帶領跑者完成半馬與全馬目標'],
    }
  }

  if (course.name.includes('初心') || course.name.includes('初階')) {
    return {
      name: '好運基礎教練組',
      role: '新手跑姿與基礎體能專項',
      bio: '專注幫助新手建立安全跑步習慣，從跑姿、肌力、呼吸節奏到訓練負荷逐步打底。',
      specialties: ['跑姿矯正', '基礎體能建立', '新手引導'],
      style: '耐心教學、安全第一、循序漸進',
      achievements: ['100+ 新手成功建立跑步習慣', '幫助新手完成首個半馬'],
    }
  }

  return {
    name: '好運跑班教練組',
    role: '耐力訓練與賽事備賽專項',
    bio: '以週期化訓練安排團練課表，結合課後回饋調整強度，讓跑者穩定累積跑量並減少傷痛風險。',
    specialties: ['週期化訓練', '團練管理', '賽事備賽'],
    style: '穩定陪跑、重視回饋、科學調整',
    achievements: ['帶領 50+ 學員完成馬拉松', '平均 PB 突破率 92%'],
  }
}

export const allCourses = courseGroups.flatMap((group) =>
  group.courses.map((course) => {
    const slug = courseSlug(course)
    return {
      ...course,
      groupTitle: group.title,
      groupAudience: group.audience,
      trainingGoal: course.focus,
      classTime:
        course.classTime ||
        (course.name.includes('早鳥') || course.name.includes('早鸟')
          ? '早晨团练，实际集合时间请以开课通知为准'
          : course.name.includes('夜跑')
            ? '晚间团练，实际集合时间请以开课通知为准'
            : '固定每周团练，实际集合时间请以开课通知为准'),
      meetingPoint: course.meetingPoint || `${course.location} 指定集合点，报名后通知`,
      beginnerFriendly:
        typeof course.beginnerFriendly === 'boolean'
          ? course.beginnerFriendly
          : course.name.includes('初心') || course.name.includes('初階') || course.name.includes('初阶'),
      feeNote: '新生 NT$500 / 堂；旧生 NT$450 / 堂；旧生推荐新生享旧生价 NT$450 / 堂',
      signupMethod: '请通过 Instagram 私信报名或咨询名额',
      trialPolicy: course.trialPolicy || '是否可试上请通过 Instagram 咨询当期名额',
      absencePolicy: course.absencePolicy || '请假与补课规则以当期课程通知为准',
      slogan: course.slogan || '一起穩定累積，一起跑得更遠',
      level: course.level || (course.name.includes('PB') ? '進階' : course.name.includes('初心') ? '入門' : '中級'),
      trainingItems: course.trainingItems || getDefaultTrainingItems(course),
      benefits: course.benefits || getDefaultBenefits(course),
      suitableFor: course.suitableFor || getDefaultSuitableFor(course),
      notSuitableFor: course.notSuitableFor || getDefaultNotSuitableFor(),
      faq: course.faq || getDefaultFaq(),
      instagramUrl: course.instagramUrl || 'https://www.instagram.com/nurture.running.team/',
      coaches: course.coaches || [getDefaultCoach(course)],
      slug,
    }
  })
)

export function getCourseBySlug(slug: string) {
  return allCourses.find((course) => course.slug === slug)
}
