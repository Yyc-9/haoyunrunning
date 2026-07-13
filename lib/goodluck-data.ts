export type Coach = {
  name: string
  nickname?: string
  role: string
  bio: string
  imageUrl?: string
  fullBodyImageUrl?: string
  avatarFocusX?: number
  avatarFocusY?: number
  fullBodyFocusX?: number
  fullBodyFocusY?: number
  specialties: string[]
  style: string
  achievements: string[]
  certifications?: string[]
}

export type CourseGroup = {
  title: string
  description: string
  audience: string
  courses: Course[]
}

export type Course = {
  slug: string
  name: string
  title?: string
  weekday: string
  location: string
  city?: string
  period: string
  focus: string
  classTime?: string
  time?: string
  meetingPoint?: string
  feeNote?: string
  priceNote?: string
  isBeginnerFriendly?: boolean
  beginnerFriendly?: boolean
  trialPolicy?: string
  absencePolicy?: string
  slogan?: string
  level?: string
  trainingGoal?: string
  trainingGoals?: string[]
  trainingItems?: string[]
  benefits?: string[]
  suitableFor?: string[]
  notSuitableFor?: string[]
  faq?: Array<{ question: string; answer: string }>
  signupUrl?: string
  instagramUrl?: string
  targetAudience?: string
  coach?: Coach
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
    title: '好運跑班 4 週年活動',
    description: '留下 4 週年活動參加意向，方便我們掌握現場人數與後續聯絡。',
    action: '活動報名',
    href: '/anniversary',
  },
  {
    title: '團練報名',
    description: '每週六開放式團練意向登記，方便教練掌握現場人數。',
    action: '填寫團練意向',
    href: '/group-signup',
  },
]

export const courseGroups: CourseGroup[] = [
  {
    title: '好運初心補習班',
    description: '專為零基礎跑者設計，從走跑交替、呼吸節奏、熱身收操與基礎肌力開始，循序建立第一個穩定跑步週期。',
    audience: '適合沒有跑步經驗、久未運動，或擔心跟不上一般跑班的跑者；不需要配速門檻。',
    courses: [
      {
        slug: 'hsinchu-beginner-tuesday',
        name: '2026 好運跑步訓練營 X 週二竹市初心補習班',
        weekday: '週二',
        location: '新竹市',
        period: '7/14 - 9/29',
        focus: '零基礎走跑入門、呼吸節奏、跑姿觀念與運動習慣建立',
        signupUrl: 'https://forms.gle/nFGgHrLcQmKdYZoN9',
      },
    ],
  },
  {
    title: '好運跑班課程',
    description: '依照不同地點、時段與目標安排訓練，協助跑者備戰 5000m、10000m、半馬與全馬。',
    audience: '適合業餘跑者、目標賽事備賽者、追求 PB 的進階與菁英跑者。',
    courses: [
      {
        slug: 'zhubei-night-run-monday',
        name: '2026 好運跑步訓練營 X 週一竹北夜跑班',
        weekday: '週一',
        location: '竹北',
        period: '7/13 - 9/21',
        focus: '夜間團練、耐力與節奏訓練',
        signupUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSe_6ORIFzEAIEkZ8C3Psr29vcdpGFuJsqh1yuAmEPuKYWrFHw/viewform?pli=1',
      },
      {
        slug: 'taipei-night-run-wednesday',
        name: '2026 好運跑步訓練營 X 週三台北夜跑班',
        weekday: '週三',
        location: '台北',
        period: '7/15 - 9/30',
        focus: '夜間團練、基礎跑力與配速控制',
        signupUrl: 'https://forms.gle/1CtsF16FF1Q1CSwa9',
      },
      {
        slug: 'taipei-pb-tuesday',
        name: '2026 好運跑步訓練營 X 週二台北 PB 班',
        weekday: '週二',
        location: '台北',
        period: '7/14 - 9/29',
        focus: '速度能力、間歇訓練、賽事 PB 目標',
        signupUrl: 'https://forms.gle/eFuNCUoB7AgXYuNK6',
      },
      {
        slug: 'hsinchu-morning-run-wednesday',
        name: '2026 好運跑步訓練營 X 週三新竹早鳥班',
        weekday: '週三',
        location: '新竹',
        period: '7/8 - 9/30',
        focus: '晨間訓練、耐力建立、穩定輸出',
        signupUrl: 'https://forms.gle/8KdmTRMhdKKoVfPq7',
      },
      {
        slug: 'zhubei-night-run-wednesday',
        name: '2026 好運跑步訓練營 X 週三竹北夜跑班',
        weekday: '週三',
        location: '竹北',
        period: '7/15 - 9/30',
        focus: '夜間團練、跑姿與肌耐力整合',
        signupUrl: 'https://forms.gle/8eNwbYgNZZhRTfJB6',
      },
      {
        slug: 'hsinchu-night-run-thursday',
        name: '2026 好運跑步訓練營 X 週四竹市夜跑班',
        weekday: '週四',
        location: '新竹市',
        period: '7/9 - 9/24',
        focus: '夜間團練、配速感與有氧能力',
        signupUrl: 'https://forms.gle/ASZgZa8vYJiwM9FFA',
      },
      {
        slug: 'zhunan-beginner-thursday',
        name: '2026 好運跑步訓練營 X 週四竹南初階班',
        weekday: '週四',
        location: '竹南',
        period: '7/9 - 9/24',
        focus: '初階跑班、基礎體能與穩定訓練',
        signupUrl: 'https://forms.gle/27DdkMRjqir2KGfAA',
      },
      {
        slug: 'taipei-morning-run-saturday',
        name: '2026 好運跑步訓練營 X 週六台北早鳥班',
        weekday: '週六',
        location: '台北',
        period: '7/11 - 9/19',
        focus: '晨間團練、長距離基礎與賽事準備',
        signupUrl: 'https://forms.gle/vpSJXxaAS8BPWuPX8',
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

export const coachProfiles = {
  chenShengQi: {
    name: '總教練 陳盛琦',
    nickname: '琦琦教練',
    role: '好運跑班創始人兼總教練',
    imageUrl: '/coaches/chen-sheng-qi.jpg',
    bio: '好運跑班創始人兼總教練，曾任寶礦力路跑進階訓練課程教練、MIZUNO REBELLION 馬拉鬆訓練營總教練、NIKE RUN CLUB 大中華區與北京總教練。',
    specialties: ['企業跑班課程規劃', '中、高階跑者週期訓練規劃', '1 對 1 中、高階線上訓練規劃', '初階跑者建立運動習慣'],
    style: '以完整週期規劃串起團練、線上課表與賽事目標，重視跑者長期穩定進步。',
    achievements: ['我型我速萬金石 2023-2026 教練', 'NIKE FAST42 臺灣北區教練', '國立體育大學陸上運動技術學系'],
    certifications: ['教育部學校專任運動教練證', '中華民國田徑協會 C 級教練', '中華民國田徑協會 C 級裁判', 'DR ACADEMY 功能性運動表現專家 L1'],
  },
  liuChengEn: {
    name: '劉丞恩教練',
    nickname: '恩恩教練',
    role: '企業跑班與初中高階跑者訓練',
    imageUrl: '/coaches/liu-cheng-en.jpg',
    bio: '曾任 NIKE NRC PACER、好運跑班教練、台灣應用材料跑班教練、寶礦力路跑初階訓練課程教練，並長期投入學校田徑與企業跑班教學。',
    specialties: ['企業跑班', '初、中、高階跑者訓練', '競技運動員訓練', '幼兒體能運動', '1 對 1 教學'],
    style: '兼顧基礎動作、訓練紀律與個別化調整，能陪跑者從入門走到進階。',
    achievements: ['NIKE NRC PACER', 'YYSPORTS 跑步教練', '國立台灣體育大學競技運動學系'],
    certifications: ['中華民國田徑協會 C 級教練', '中華民國田徑協會 C 級裁判', '中華民國健身運動協會運動按摩技術人員'],
  },
  wuPeiCi: {
    name: '吳珮慈教練',
    role: '初階跑者與跑者肌力體能訓練',
    imageUrl: '/coaches/wu-pei-ci.jpg',
    bio: '好運跑班教練，曾任寶礦力路跑初階訓練課程教練、長榮懂跑步訓練營教練、MIZUNO REBELLION 馬拉鬆訓練營教練。',
    specialties: ['企業跑班', '初階跑者訓練', '1 對 1 初階跑者訓練', '跑者肌力體能訓練'],
    style: '用清楚、安全的訓練步驟協助新手建立跑步習慣與基礎肌力。',
    achievements: ['我型我速萬金石 2024-2026 教練', '博仲法律事務所跑步社教練', '天主教輔仁大學體育系碩士班'],
    certifications: ['中華民國田徑協會 C 級教練', '中華民國田徑協會 C 級裁判', '中華民國體適能健身 C 級指導員證', 'DR ACADEMY 功能性運動表現專家 L1'],
  },
  bianbian: {
    name: '扁扁教練',
    nickname: '扁扁',
    role: '初階跑者、特殊族群與肌力訓練',
    imageUrl: '/coaches/chen-yi-ting.jpg',
    bio: '好運跑班教練，具伊甸鬆山視障中心視多障運動課教師、臺師大體適能與適應體育 TA 經歷。',
    specialties: ['初階跑者訓練', '特殊族群功能性訓練', '肌力訓練'],
    style: '細膩觀察身體狀態，用功能性訓練與肌力基礎降低跑步風險。',
    achievements: ['伊甸鬆山視障中心視多障運動課教師', '國立臺灣師範大學運動與科學學系碩士'],
    certifications: ['中華民國田徑協會 C 級教練', '中華民國田徑協會 C 級裁判', 'C 級健身體適能教練', '國民體適能檢測員', '丙級運動防護員'],
  },
  wuWeiQiao: {
    name: '鄔惟喬教練',
    role: '跑班教練與馬拉鬆訓練營助教',
    imageUrl: '/coaches/wu-wei-qiao.jpg',
    bio: '曾任森林跑站助教、好運跑班教練、MIZUNO REBELLION 馬拉鬆訓練營助教，出身台北市立大學陸上競技系。',
    specialties: ['跑步基礎訓練', '團練協助', '跑者體能建立'],
    style: '用穩定陪伴與動作提醒，幫助跑者在團練裡逐步累積。',
    achievements: ['森林跑站助教', 'MIZUNO REBELLION 馬拉鬆訓練營助教', '台北市立大學陸上競技系'],
    certifications: ['中華民國初級田徑專任教練證', '中華民國 C 級田徑裁判證', '中華民國 C 級田徑教練證', '體適能 C 級指導員'],
  },
  luoPeiCi: {
    name: '羅珮慈教練',
    role: '初中階跑者週期訓練規劃',
    imageUrl: '/coaches/luo-pei-ci.jpg',
    bio: 'GarminRun 跑步教練與好運跑班教練，具國立臺灣師範大學體育學系背景。',
    specialties: ['初、中階跑者週期訓練規劃', '跑步基礎能力建立', '配速與訓練節奏引導'],
    style: '把週期訓練拆成清楚可執行的步驟，協助跑者穩定完成課表。',
    achievements: ['GarminRun 跑步教練', '國立臺灣師範大學體育學系'],
    certifications: ['中華民國田徑 C 級教練', '中華民國田徑 C 級裁判'],
  },
  laiXinHong: {
    name: '賴信宏教練',
    nickname: '小黑教練',
    role: '初階跑姿建立與企業跑班規劃',
    imageUrl: '/coaches/lai-xin-hong.jpg',
    bio: '好運跑班教練，具輔仁大學體育學系碩士班與臺北市立大學陸上運動技術學系背景。',
    specialties: ['初階跑者跑姿建立', '企業跑班課程規劃', '社團跑班課程規劃'],
    style: '重視跑姿細節與課程結構，讓初階跑者在安全節奏裡建立自信。',
    achievements: ['輔仁大學體育學系碩士班', '臺北市立大學陸上運動技術學系'],
    certifications: ['中華民國田徑專任教練證照', '中華民國田徑協會 B 級教練證', 'IBMA-BASIC 個人伸展教練證'],
  },
  zhouXianFeng: {
    name: '周賢峰教練',
    role: '初階跑者習慣建立與競技跑者經驗分享',
    imageUrl: '/coaches/zhou-xian-feng.jpg',
    bio: '好運跑班教練，曾任長榮懂跑步訓練營助教、MIZUNO REBELLION 馬拉鬆訓練營教練，具豐富路跑與場地賽經驗。',
    specialties: ['初階跑者建立運動習慣', '半程馬拉鬆訓練', '賽事配速經驗分享'],
    style: '把選手經驗轉化為一般跑者可吸收的訓練提醒，陪學員穩定養成習慣。',
    achievements: ['2023 Garmin Run 亞洲系列賽臺北站半程馬拉鬆冠軍', '2023 臺南古都國際半程馬拉鬆亞軍', '成都世大運半程馬拉鬆國手', '半程馬拉鬆 1:06:58，全程馬拉鬆 2:31:24'],
    certifications: ['中華民國田徑 C 級教練', '中華民國田徑 C 級裁判'],
  },
  yangShengHao: {
    name: '楊陞豪教練',
    role: '初階跑姿建立與社團課程規劃',
    imageUrl: '/coaches/yang-sheng-hao.jpg',
    bio: '長庚路跑社教練與好運跑班教練，具國立體育大學陸上運動技術學系背景。',
    specialties: ['初階跑者跑姿建立', '企業跑班課程規劃', '社團課程規劃'],
    style: '以跑姿基礎和團練節奏建立訓練秩序，幫助跑者穩定累積。',
    achievements: ['2026 萬金石馬拉鬆 10K 總 2', '2026 台南國際古都馬拉鬆 10K 總 3', '2025 台中國際馬拉鬆半程馬拉鬆第一名', '2024 全國田徑錦標賽男子 1500M 第一名'],
    certifications: ['中華民國田徑 C 級教練', '中華民國田徑 C 級裁判'],
  },
  luoMinYao: {
    name: '羅閔耀教練',
    nickname: 'CC教練',
    role: '跑步生理學、戰術與個別化訓練',
    imageUrl: '/coaches/luo-min-yao.jpg',
    bio: '好運跑班教練，曾任丹鳳高中、八里國中、金山高中田徑教練，以及 NIKE RUN CLUB PACER、NIKE FAST42 臺灣北區助教。',
    specialties: ['跑步生理學與訓練原則', '跑步訓練技巧與戰術', '個別化訓練計畫', '運動員合作與帶領'],
    style: '以訓練原理為基礎，結合戰術和個別化安排，讓跑者清楚知道每堂課目的。',
    achievements: ['丹鳳高中田徑教練', 'NIKE RUN CLUB PACER', 'NIKE FAST42 臺灣北區助教', '國立體育大學陸上運動技術學系'],
    certifications: ['教育部學校專任運動教練證', '亞洲核心訓練師', '中華民國田徑協會 C 級教練', '中華民國田徑協會 C 級裁判'],
  },
  xiaoHe: {
    name: '赫嵐妮助教',
    nickname: '小赫助教',
    role: '好運跑班助教',
    imageUrl: '/coaches/xiao-he.jpg',
    bio: '好運跑班助教，協助課堂示範、動作觀察與團練節奏維持。',
    specialties: ['課堂協助', '動作觀察', '團練陪跑'],
    style: '在課堂中即時協助學員理解訓練內容，讓團練執行更順暢。',
    achievements: ['好運跑班課程助教'],
  },
  zhongLiChen: {
    name: '鍾立宸助教',
    nickname: '立宸助教',
    role: '好運跑班助教',
    imageUrl: '/coaches/zhong-li-chen.jpg',
    bio: '好運跑班助教，協助教練照看課堂安全、訓練動線與學員執行狀態。',
    specialties: ['課堂協助', '團練陪跑', '訓練動線維持'],
    style: '用穩定陪伴與即時提醒，幫助學員把課表內容確實完成。',
    achievements: ['好運跑班課程助教'],
  },
  zhengYiQun: {
    name: '鄭以群助教',
    nickname: '螞蟻助教',
    role: '好運跑班助教',
    imageUrl: '/coaches/zheng-yi-qun.jpg',
    bio: '好運跑班助教，協助團練分組、訓練執行與學員回饋觀察。',
    specialties: ['團練協助', '訓練執行觀察', '課堂節奏維持'],
    style: '協助教練掌握不同程度跑者的課堂狀態，讓訓練更有秩序。',
    achievements: ['好運跑班課程助教'],
  },
  yongXin: {
    name: '詠馨助教',
    role: '好運跑班助教',
    imageUrl: '/coaches/yong-xin.jpg',
    bio: '好運跑班助教，協助課堂示範、團練陪跑與學員狀態觀察。',
    specialties: ['課堂協助', '團練陪跑', '學員狀態觀察'],
    style: '用清楚提醒與陪伴協助跑者完成當日訓練。',
    achievements: ['好運跑班課程助教'],
  },
} satisfies Record<string, Coach>

function getCourseCoaches(course: Course): Coach[] {
  if (course.coaches?.length) return course.coaches
  if (course.coach) return [course.coach]

  const coachesBySlug: Record<string, Coach[]> = {
    'zhubei-night-run-monday': [coachProfiles.liuChengEn, coachProfiles.bianbian, coachProfiles.luoPeiCi],
    'taipei-pb-tuesday': [coachProfiles.chenShengQi, coachProfiles.wuWeiQiao, coachProfiles.wuPeiCi, coachProfiles.yongXin],
    'hsinchu-beginner-tuesday': [coachProfiles.bianbian],
    'hsinchu-morning-run-wednesday': [coachProfiles.chenShengQi, coachProfiles.liuChengEn, coachProfiles.xiaoHe],
    'taipei-night-run-wednesday': [coachProfiles.wuWeiQiao],
    'zhubei-night-run-wednesday': [coachProfiles.chenShengQi, coachProfiles.liuChengEn, coachProfiles.bianbian, coachProfiles.zhouXianFeng, coachProfiles.zhengYiQun],
    'hsinchu-night-run-thursday': [coachProfiles.liuChengEn, coachProfiles.xiaoHe, coachProfiles.zhongLiChen],
    'zhunan-beginner-thursday': [coachProfiles.zhouXianFeng, coachProfiles.yangShengHao],
    'taipei-morning-run-saturday': [coachProfiles.luoMinYao],
  }

  if (coachesBySlug[course.slug]) {
    return coachesBySlug[course.slug]
  }

  return [coachProfiles.chenShengQi, coachProfiles.luoMinYao, coachProfiles.zhouXianFeng]
}

export function courseSlug(course: Course) {
  return course.slug
}

function getDefaultTrainingItems(course: Course): string[] {
  if (course.name.includes('初心')) {
    return [
      '課前狀態確認與新手動態熱身',
      '走跑交替與輕鬆跑入門',
      '呼吸節奏、RPE 與強度辨識',
      '基礎跑姿與步頻觀念',
      '新手肌力、平衡與穩定訓練',
      '收操恢復與自主練習安排',
    ]
  }
  if (course.name.includes('初階')) {
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
  if (course.name.includes('初心')) {
    return [
      '在沒有配速壓力下開始跑步',
      '學會判斷輕鬆、適中與過強的運動強度',
      '建立每週可持續的走跑與練習習慣',
      '掌握新手需要的熱身、收操與恢復方法',
      '降低一開始跑太快、跑太多的常見風險',
      '累積銜接一般跑班所需的信心與基礎體能',
    ]
  }
  if (course.name.includes('初階')) {
    return [
      '建立穩定跑步習慣',
      '打好基礎有氧能力',
      '學會跑姿入門與熱身流程',
      '降低新手常見受傷風險',
      '理解 RPE、配速與訓練強度',
      '獲得新手友善的教練回饋',
    ]
  }

  if (course.name.includes('PB')) {
    return [
      '提升目標配速掌控能力',
      '強化間歇與節奏跑表現',
      '建立比賽策略與配速計畫',
      '學會管理訓練負荷與恢復',
      '為突破個人紀錄累積專項能力',
      '獲得更精準的賽事備戰回饋',
    ]
  }

  if (course.name.includes('夜跑')) {
    return [
      '建立下班後穩定團練節奏',
      '透過固定夜間訓練累積耐力',
      '在團隊氛圍中維持規律跑步',
      '學會夜跑配速與安全陪跑觀念',
      '獲得教練對跑姿與強度的提醒',
      '把平日訓練銜接到目標賽事',
    ]
  }

  if (course.name.includes('早鳥')) {
    return [
      '建立清晨固定訓練節奏',
      '用早晨有氧累積穩定跑量',
      '提升長距離基礎和耐力品質',
      '把訓練放進工作日前的固定流程',
      '獲得教練對恢復與負荷的提醒',
      '為半馬或全馬週期打好底層能力',
    ]
  }

  return [
    '建立固定團練習慣',
    '提升有氧能力與跑步效率',
    '理解自己的配速與訓練強度',
    '獲得教練針對當期目標的回饋',
    '在團隊中維持訓練動力',
    '為下一個賽事週期打好基礎',
  ]
}

function getDefaultSuitableFor(course: Course): string[] {
  if (course.name.includes('初心')) {
    return [
      '沒有跑步經驗，想知道第一步怎麼開始',
      '久未運動，希望用走跑交替安全恢復體能',
      '一跑就容易喘，還不會判斷適合自己的速度',
      '擔心跟不上一般團練，希望先建立信心與習慣',
    ]
  }
  if (course.name.includes('初階')) {
    return [
      '想建立規律跑步習慣',
      '已能完成短距離慢跑，想打好跑姿與有氧基礎',
      '希望在安全的環境下漸進式訓練',
      '想加入團練社群獲得支援與動力',
    ]
  }
  return [
    '想建立規律跑步習慣',
    '想提升 5K / 10K / 半馬能力',
    '希望在團練中獲得動力與支援',
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

function getDefaultFaq(course: Course): Array<{ question: string; answer: string }> {
  return [
    {
      question: '新手可以參加嗎？',
      answer: course.name.includes('初心')
        ? '可以。初心補習班就是為零基礎或久未運動的跑者設計，會從走跑交替、呼吸強度、熱身收操與基礎肌力開始，不需要配速門檻。'
        : course.name.includes('初階')
          ? '可以。初階班適合已能完成短距離慢跑、希望建立規律訓練的跑者；若目前完全沒有跑步經驗，建議優先選擇初心補習班。'
          : '各班級強度與目標不同。若目前完全沒有跑步經驗，建議優先選擇初心補習班；已有規律跑步習慣者可依目標選擇夜跑、早鳥或 PB 班。',
    },
    {
      question: '下雨怎麼辦？',
      answer: '小雨時團練照常進行，學員可自行決定是否參加。中大雨時教練會另行通知是否改期或改為線上課程，請關注 Instagram 通知。',
    },
    {
      question: '課程費用是多少？',
      answer: '費用與名額請透過 Instagram 私訊諮詢，我們會根據您的情況推薦最適合的班級與定價方案。',
    },
    {
      question: '可以請假嗎？',
      answer: '當然可以。請假與補課規則會在開課時詳細說明。我們支援合理的請假申請，但建議盡量不要缺課以保持訓練連貫性。',
    },
    {
      question: '可以試上嗎？',
      answer: '是否可試上請透過 Instagram 諮詢當期名額。試上可以幫助您了解班級風格與訓練強度是否符合需求。',
    },
  ]
}

function getDefaultCoach(course: Course): Coach {
  if (course.name.includes('PB')) {
    return coachProfiles.chenShengQi
  }

  if (course.name.includes('初心') || course.name.includes('初階')) {
    return coachProfiles.wuPeiCi
  }

  return coachProfiles.chenShengQi
}

function getDefaultClassTime(course: Course) {
  const isMorningClass = course.name.includes('早鳥') || course.name.includes('早晨')
  if (isMorningClass && course.weekday.includes('六')) return '06:37'
  if (isMorningClass) return '05:37'
  const isTaipeiNightClass = course.location.includes('台北')
  const isTuesdayHsinchuCityClass = course.weekday.includes('二') && course.location === '新竹市'
  if (isTaipeiNightClass || isTuesdayHsinchuCityClass) return '19:07（1.5-2 小時）'
  return '19:27（1.5-2 小時）'
}

function getDefaultMeetingPoint(course: Course) {
  if (course.location.includes('台北')) return '台大田徑場'
  if (course.location === '竹北') return '竹縣第一運動場'
  if (course.location === '竹南') return '竹南運動公園田徑場'
  if (course.location === '新竹' || course.location === '新竹市') return '竹市體育場'
  return `${course.location} 指定集合點，報名後通知`
}

export const allCourses = courseGroups.flatMap((group) =>
  group.courses.map((course) => {
    const slug = courseSlug(course)
    const coaches = getCourseCoaches(course)
    const coach = coaches[0] || getDefaultCoach(course)
    const classTime =
      course.classTime ||
      course.time ||
      getDefaultClassTime(course)
    const beginnerFriendly =
      typeof course.beginnerFriendly === 'boolean'
        ? course.beginnerFriendly
        : typeof course.isBeginnerFriendly === 'boolean'
          ? course.isBeginnerFriendly
          : course.name.includes('初心') || course.name.includes('初階') || course.name.includes('初阶')
    const trainingGoals = course.trainingGoals || [course.focus]

    return {
      ...course,
      slug,
      title: course.title || course.name,
      city: course.city || course.location,
      groupTitle: group.title,
      groupAudience: group.audience,
      targetAudience: course.targetAudience || group.audience,
      trainingGoal: course.trainingGoal || course.focus,
      trainingGoals,
      classTime,
      time: course.time || classTime,
      meetingPoint: course.meetingPoint || getDefaultMeetingPoint(course),
      beginnerFriendly,
      isBeginnerFriendly: beginnerFriendly,
      priceNote: course.priceNote || course.feeNote || '費用與名額請透過 Instagram 諮詢',
      feeNote: course.feeNote || course.priceNote || '費用與名額請透過 Instagram 諮詢',
      signupMethod: '請透過 Instagram 私訊報名或諮詢名額',
      trialPolicy: course.trialPolicy || '是否可試上請透過 Instagram 諮詢當期名額',
      absencePolicy: course.absencePolicy || '請假與補課規則以當期課程通知為準',
      slogan: course.slogan || '一起穩定累積，一起跑得更遠',
      level: course.level || (course.name.includes('PB') ? '進階' : course.name.includes('初心') ? '入門' : '中級'),
      trainingItems: course.trainingItems || getDefaultTrainingItems(course),
      benefits: course.benefits || getDefaultBenefits(course),
      suitableFor: course.suitableFor || getDefaultSuitableFor(course),
      notSuitableFor: course.notSuitableFor || getDefaultNotSuitableFor(),
      faq: course.faq || getDefaultFaq(course),
      instagramUrl: course.instagramUrl || 'https://www.instagram.com/nurture.running.team/',
      coach,
      coaches,
    }
  })
)

export function getCourseBySlug(slug: string) {
  return allCourses.find((course) => course.slug === slug)
}
