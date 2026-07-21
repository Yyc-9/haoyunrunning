export type CourseWebsiteCopy = {
  campaignLabel: string
  slogan: string
  introPoints: string[]
  targetAudience: string
  suitableFor: string[]
  enrollmentNote?: string
}

const campaignLabel = 'S3 | 2026 RUNNING CAMP'

export const courseMemberPerks = [
  '賽前專業建議與訓練規劃',
  '不定期團練活動',
  '裝備＆補給優惠',
]

export const courseWebsiteCopyBySlug: Record<string, CourseWebsiteCopy> = {
  'zhubei-night-run-monday': {
    campaignLabel,
    slogan: '我們陪你扎穩根基 ─ 在本季跑出更好的自己',
    introPoints: [
      '穩定累積體能，持續強化有氧基礎',
      '循序訓練，為賽季做好準備',
      '專業課表，避免過度訓練',
    ],
    targetAudience: '已有跑步習慣、想進一步挑戰，對賽事成績有追求，並已能完成 10KM 的跑者。',
    suitableFor: [
      '已有跑步習慣，想進一步挑戰',
      '對賽事成績有追求',
      '已能完成 10KM',
    ],
  },
  'taipei-pb-tuesday': {
    campaignLabel,
    slogan: '我們幫助你穩定突破 ─ 為下一次 PB 做好準備',
    introPoints: [
      '持續強化速度與有氧能力',
      '掌握節奏，提升跑步效率',
      '專業指導，避免訓練迷惘',
    ],
    targetAudience: '有固定跑步習慣、追求突破 PB，下半年已有目標賽事，並具半馬完賽能力的跑者。',
    suitableFor: [
      '有固定跑步習慣，追求突破 PB',
      '下半年已有目標賽事，需規律訓練',
      '具半馬完賽能力（21KM）',
    ],
  },
  'hsinchu-beginner-tuesday': {
    campaignLabel,
    slogan: '我們陪你踏出第一步 ─ 在本季穩定成長，邁向進步',
    introPoints: [
      '從零開始，建立跑步習慣',
      '循序訓練，培養穩定能力',
      '專業課表，帶你安全入門',
    ],
    targetAudience: '想建立跑步習慣、循序漸進避免受傷，並已能完成 5-10KM 的跑步新手。',
    suitableFor: [
      '跑步新手，想建立習慣',
      '希望循序漸進，避免受傷',
      '已能完成 5-10KM',
    ],
  },
  'hsinchu-morning-run-wednesday': {
    campaignLabel,
    slogan: '我們陪你建立晨跑節奏 ─ 迎接更強的自己',
    introPoints: [
      '固定晨練，累積穩定訓練量',
      '持續提升速度與有氧能力',
      '專業教練協助精進表現',
    ],
    targetAudience: '下班時間不固定、需要晨練夥伴互相督促，並已能完成 10KM 的上班族跑者。',
    suitableFor: [
      '上班族，下班時間不固定',
      '需要晨練夥伴互相督促',
      '已能完成 10KM',
    ],
  },
  'taipei-night-run-wednesday': {
    campaignLabel,
    slogan: '我們幫助你穩紮穩打 ─ 逐步邁向更好狀態',
    introPoints: [
      '穩定訓練，持續累積體能',
      '強化速度與耐力，打造基礎',
      '專業指導，避免過度訓練',
    ],
    targetAudience: '剛開始跑步、想培養穩定習慣，並希望提升路跑成績、突破 PB 的跑者。',
    suitableFor: [
      '剛開始跑步，想培養穩定習慣',
      '想提升路跑成績、突破 PB',
      '已能完成 5KM，並想更進一步',
    ],
  },
  'zhubei-night-run-wednesday': {
    campaignLabel,
    slogan: '我們陪你穩定前進 ─ 建立長期進步的節奏',
    introPoints: [
      '循序訓練，打造紮實基礎',
      '專業課表，降低疲勞與傷害風險',
      '結合交叉訓練，提升整體能力',
    ],
    targetAudience: '已有跑步基礎、想再進階，並希望提升賽事表現、突破成績的跑者。',
    suitableFor: [
      '已有跑步基礎，想再進階',
      '想提升賽事表現、突破成績',
      '已能完成 10KM',
    ],
  },
  'hsinchu-night-run-thursday': {
    campaignLabel,
    slogan: '我們幫助你精準訓練 ─ 跑出更好的表現',
    introPoints: [
      '提升跑步效率，持續建立速度基礎',
      '強化有氧能力與配速掌控',
      '專業指導，協助穩定進步',
    ],
    targetAudience: '已有跑步習慣、想更進階，下半年有賽事目標，並已能完成 5-10KM 的跑者。',
    suitableFor: [
      '已有跑步習慣，想更進階',
      '下半年有賽事目標',
      '已能完成 5-10KM',
    ],
  },
  'zhunan-beginner-thursday': {
    campaignLabel,
    slogan: '我們陪你一步一步前進 ─ 讓跑步成為生活的一部分',
    introPoints: [
      '建立運動習慣，培養跑步基礎',
      '循序提升體能，累積自信與耐力',
      '專業教練帶領，安心開始訓練',
    ],
    targetAudience: '想建立跑步習慣、循序漸進避免受傷，並已能完成 5-10KM 的跑步新手。',
    suitableFor: [
      '跑步新手，想建立習慣',
      '希望循序漸進，避免受傷',
      '已能完成 5-10KM',
    ],
  },
  'taipei-morning-run-saturday': {
    campaignLabel,
    slogan: '我們陪你養成晨跑習慣 ─ 持續提升整體表現',
    introPoints: [
      '早晨訓練，穩定養成紀律',
      '累積有氧與速度，強化基礎能力',
      '專業指導，避免走錯方向',
    ],
    targetAudience: '晚上沒有時間、想在早晨運動，並希望培養跑步習慣或突破 PB 的跑者。',
    suitableFor: [
      '晚上沒空，想在早晨運動',
      '希望培養跑步習慣或突破 PB',
      '已能完成 5KM',
    ],
    enrollmentNote: '未滿五人不開班',
  },
}
