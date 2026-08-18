export type HomeActivity = {
  title: string
  description: string
  action: string
  href: string
}

export type SeasonalUpdate = {
  active: boolean
  period: string
  title: string
  summary: string
  body: string
  href: string
  linkLabel: string
}

export type CourseOverride = {
  active?: boolean
  templateSlug?: string
  name?: string
  weekday?: string
  location?: string
  period?: string
  classTime?: string
  startTime?: string
  timeZone?: 'Asia/Taipei'
  meetingPoint?: string
  feeNote?: string
  campaignLabel?: string
  slogan?: string
  targetAudience?: string
  focus?: string
  benefits?: string[]
  suitableFor?: string[]
  enrollmentNote?: string
  signupUrl?: string
  coachKeys?: string[]
}

export type ContentCard = {
  title: string
  description: string
}

export type BrandContent = {
  brandName: string
  tagline: string
  logoUrl: string
  instagramUrl: string
  instagramHandle: string
  contactText: string
  address: string
  footerDescription: string
}

export type HomeContent = {
  activitiesLabel: string
  activitiesTitle: string
  activitiesDescription: string
  featuresTitle: string
  featuresSubtitle: string
  features: ContentCard[]
  stats: Array<{ value: string; label: string }>
  coursesLabel: string
  coursesTitle: string
  coursesDescription: string
  coursesCtaLabel: string
}

export type PhilosophyItem = ContentCard & {
  english: string
}

export type AboutContent = {
  heroEyebrow: string
  heroBrandName: string
  heroEnglishTitle: string
  heroChineseTitle: string
  philosophies: PhilosophyItem[]
  eyebrow: string
  title: string
  titleHighlight: string
  description: string
  beliefsLabel: string
  beliefsTitle: string
  beliefs: ContentCard[]
  audienceLabel: string
  audienceTitle: string
  audienceDescription: string
  audienceTags: string[]
  facts: ContentCard[]
  ctaTitle: string
  ctaDescription: string
}

export type CoursesPageContent = {
  heroLabel: string
  heroTitle: string
  heroDescription: string
  guideLabel: string
  guideTitle: string
  guideSteps: ContentCard[]
  faqTitle: string
  faqs: ContentCard[]
  highlights: ContentCard[]
}

export type TestimonialsContent = {
  eyebrow: string
  title: string
  description: string
  videoUrl: string
  videoTitle: string
  videoDescription: string
  videoEnabled: boolean
  pathLabel: string
  pathTitle: string
  pathDescription: string
  themes: ContentCard[]
  ctaLabel: string
  ctaTitle: string
  ctaDescription: string
}

export type TeamContent = {
  eyebrow: string
  title: string
  description: string
  rosterLabel: string
  rosterTitle: string
}

export type AchievementBadgeContent = {
  slug: string
  standard: string
  name: string
  image: string
  imageClassName?: string
  description: string
  story: string
}

export type AchievementMilestoneContent = {
  image: string
  alt: string
}

export type AchievementsContent = {
  heroLabel: string
  heroTitle: string
  heroStrapline: string
  heroDescription: string
  heroImage: string
  originImage: string
  originLabel: string
  originTitle: string
  originParagraphs: string[]
  collectionLabel: string
  collectionTitle: string
  collectionDescription: string
  badges: AchievementBadgeContent[]
  bqImage: string
  bqLabel: string
  bqTitle: string
  bqSubtitle: string
  bqDescription: string
  bqQualification: string
  milestoneLabel: string
  milestoneTitle: string
  milestoneDescription: string
  milestones: AchievementMilestoneContent[]
  howToLabel: string
  howToTitle: string
  howToSteps: string[]
  howToNote: string
  howToImage: string
  verifiedTitle: string
  verifiedDescription: string
  accountTitle: string
  accountDescription: string
  accountCta: string
}

export type AnniversaryContent = {
  label: string
  title: string
  status: string
  subtitle: string
  noticeTitle: string
  noticeDescription: string
  highlights: string[]
  secondaryCta: string
  contactCta: string
  formCta: string
  formLabel: string
  formTitle: string
  formDescription: string
  companionLabel: string
  companionOptions: string[]
}

export type PageMedia = {
  homeCoursesHero: string
  aboutPageHero: string
  aboutStoryHero: string
  coursesHero: string
  teamHero: string
  aboutHero: string
  testimonialsHero: string
  testimonialPathHero: string
  aboutBeliefImages: string[]
  aboutFactImages: string[]
  testimonialThemeImages: string[]
  shopHero: string
  anniversaryHero: string
  shopTitle: string
  shopSubtitle: string
}

export type SiteContent = {
  heroSlides: string[]
  activities: HomeActivity[]
  seasonalUpdate: SeasonalUpdate
  courseOverrides: Record<string, CourseOverride>
  brand: BrandContent
  home: HomeContent
  about: AboutContent
  coursesPage: CoursesPageContent
  testimonials: TestimonialsContent
  team: TeamContent
  achievements: AchievementsContent
  anniversary: AnniversaryContent
  pageMedia: PageMedia
  coachProfiles: CoachPublicProfileMap
}

export const defaultHeroSlides = [
  '/goodluck-anniversary-7089.jpg',
  '/goodluck-anniversary-7096.jpg',
  '/goodluck-fourth-anniversary-wallpaper.jpg',
]

export const defaultHomeActivities: HomeActivity[] = [
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

export const defaultSeasonalUpdate: SeasonalUpdate = {
  active: false,
  period: '',
  title: '',
  summary: '',
  body: '',
  href: '',
  linkLabel: '了解更多',
}

export const defaultBrandContent: BrandContent = {
  brandName: '好運跑班',
  tagline: '認識跑步，嘗試跑步，愛上跑步',
  logoUrl: '/goodluck-logo-nav.jpg',
  instagramUrl: 'https://www.instagram.com/nurture.running.team/',
  instagramHandle: '@nurture.running.team',
  contactText: '課程與商品諮詢請先透過 Instagram 聯絡',
  address: '台灣各城市團練據點',
  footerDescription: '專業的跑步訓練平台，為跑者提供科學、系統、個人化的訓練指導，幫助每一位跑者安全、高效地提升跑步能力，實現個人目標。',
}

export const defaultHomeContent: HomeContent = {
  activitiesLabel: '近期更新',
  activitiesTitle: '近期報名入口',
  activitiesDescription: '活動與團練資訊整理在這裡，方便你快速完成報名。',
  featuresTitle: '好運跑班如何陪你進步？',
  featuresSubtitle: '從第一次規律跑步到站上賽道，我們把課表、團練、回饋與社群放在同一個訓練節奏裡',
  features: [
    { title: '初心到菁英都能加入', description: '依照程度安排初心補習班、初階班、夜跑班、早鳥班與 PB 班' },
    { title: '清楚的週期訓練', description: '以 12 週為一個節奏，逐步建立體能、速度、耐力與賽事狀態' },
    { title: '台灣多地團練', description: '本期整理台北、新竹、竹北、竹南等班級資訊' },
    { title: '現場動作與配速指導', description: '教練在團練現場觀察跑姿、節奏與完成狀況，提供當下建議' },
    { title: '目標導向訓練', description: '依照 5000m、10000m、半馬、全馬與 PB 目標安排訓練重點' },
    { title: '跑者社群陪伴', description: '讓每一位跑者認識跑步、嘗試跑步，最後真正愛上跑步' },
  ],
  stats: [
    { value: '5000m', label: '速度與耐力' },
    { value: '10000m', label: '節奏與配速' },
    { value: '半馬', label: '穩定完賽' },
    { value: '全馬', label: '週期備賽' },
  ],
  coursesLabel: '訓練日程',
  coursesTitle: '課程預覽',
  coursesDescription: '首頁整理本期代表班級，完整時間、訓練內容、費用與報名說明請進入課程頁查看。',
  coursesCtaLabel: '查看完整課表',
}

export const defaultAboutContent: AboutContent = {
  heroEyebrow: 'OUR PHILOSOPHY',
  heroBrandName: '好運跑班',
  heroEnglishTitle: 'A great place builds great runners.',
  heroChineseTitle: '好的環境，創造出好的運動員。',
  philosophies: [
    { title: '專注速度能力與跑步經濟性', english: 'Precision Training. Smarter, Faster, Stronger.', description: '不是追求更多公里，而是透過科學化訓練，提升速度能力與跑步經濟性，讓每一步都更有效率。' },
    { title: '建立穩固的訓練基礎', english: 'Build the Base. Prepare for Your Best.', description: '真正的進步，來自一季又一季穩定累積。用清楚的訓練節奏，讓每一次努力都能銜接賽事目標。' },
    { title: '每位跑者都值得被看見', english: 'Every Runner Matters.', description: '依班級人數配置專屬教練，確保每位學員都能獲得足夠的指導與回饋。' },
  ],
  eyebrow: '關於好運跑班',
  title: '我們想讓更多人，',
  titleHighlight: '真正愛上跑步。',
  description: '好運跑班面向台灣所有跑者。你可以是第一次想規律跑步的人，也可以是正在追逐 PB 的跑者；可以為 5000m、10000m 準備，也可以把目標放在半馬、全馬。重要的不是你現在跑得多快，而是你願意開始理解自己的身體，並且一步一步跑向更穩定的自己。',
  beliefsLabel: 'OUR PHILOSOPHY',
  beliefsTitle: '好的環境，創造出好的運動員。',
  beliefs: [
    { title: '專注於速度能力與跑步經濟性', description: 'Precision Training. Smarter, Faster, Stronger.' },
    { title: '為賽季打下穩固有氧與速度基礎', description: '用清楚的訓練節奏，讓每一次累積都能銜接賽事目標。' },
    { title: '教學品質保障', description: '依人數配置專屬教練。' },
  ],
  audienceLabel: '適合對象',
  audienceTitle: '不同程度的跑者，都可以在這裡找到自己的節奏。',
  audienceDescription: '我們不把跑者分成「會跑」或「不會跑」。每個人都有自己的起點，也有自己的目標。好運跑班希望做的是，讓你知道今天為什麼這樣跑，這週為什麼這樣練，下一個階段又要怎麼調整。',
  audienceTags: ['新手小白', '業餘跑者', '專業跑者', '菁英跑者', '5000m / 10000m 備賽', '半馬 / 全馬備賽'],
  facts: [
    { title: '台灣多地開課', description: '本期台北、新竹、竹北、竹南等班級同步整理上線。' },
    { title: '週期化訓練', description: '以固定週期建立跑力，讓課表、團練與恢復彼此銜接。' },
    { title: '教練與社群支援', description: '學員回報訓練感受，教練依照狀態調整，讓進步不是孤單發生。' },
  ],
  ctaTitle: '從下一次訓練開始，跑得更清楚一點。',
  ctaDescription: '如果你還不確定自己適合哪一班，先讓我們知道你的跑步經驗、目標距離與可訓練時間，我們會協助你找到更適合的起點。',
}

export const defaultCoursesPageContent: CoursesPageContent = {
  heroLabel: '訓練日程',
  heroTitle: '訓練日程表',
  heroDescription: '先看適合對象、訓練目標、時間地點與報名方式，不進入詳情頁也能初步判斷是否適合。',
  guideLabel: 'REGISTRATION GUIDE',
  guideTitle: '如何加入課程？',
  guideSteps: [
    { title: '查看本期課表', description: '先依照星期、城市與上課時間，找到能穩定參加的班級。' },
    { title: '進入課程詳情', description: '點擊課表中的課程卡片，確認訓練方向、教練與適合對象。' },
    { title: '填寫專屬報名表', description: '在課程詳情最下方點擊「立即報名」，登入後完成資料與計費確認。' },
    { title: '完成匯款與核對', description: '依網站顯示的金額完成匯款並提交後五碼，財務核對後即完成報名。' },
  ],
  faqTitle: '常見問題',
  faqs: [
    { title: '新手可以參加嗎？', description: '可以。請先依目前跑步經驗、可訓練時間與目標選擇適合班級，不確定時可透過 Instagram 諮詢。' },
    { title: '下雨怎麼辦？', description: '是否停課或調整場地，會依現場天候與安全狀況由教練在班級群組公告。' },
    { title: '課程費用是多少？', description: '各班費用與插班計價會依季度及剩餘課次不同，請進入課程詳情與報名頁查看當期金額。' },
    { title: '可以請假嗎？', description: '可以依當期規則申請最近一堂課請假，並在本季度符合條件的其他班級課次安排補課。' },
    { title: '可以試上嗎？', description: '試上安排依當期班級名額、場地與教練配置確認，請先透過 Instagram 詢問。' },
  ],
  highlights: [
    { title: '新一期課程', description: '當期日期與開放班級以本頁課表及課程詳情為準。' },
    { title: '多目標備賽', description: '涵蓋 5000m、10000m、半馬、全馬與 PB 目標。' },
    { title: '多地團練', description: '台北、新竹、竹北、竹南等班級依季度安排開課。' },
  ],
}

export const defaultTestimonialsContent: TestimonialsContent = {
  eyebrow: '學員見證',
  title: '每一步進步，都從願意開始',
  description: '好運跑班陪跑者從第一次規律訓練，到完成賽事與挑戰個人目標。真實學員分享與最新訓練現場，持續發布在官方 Instagram。',
  videoUrl: '',
  videoTitle: '學員故事',
  videoDescription: '從訓練現場與賽事歷程，看見跑者如何一步一步完成自己的目標。',
  videoEnabled: true,
  pathLabel: '跑者的成長路徑',
  pathTitle: '訓練不只看最後的成績',
  pathDescription: '我們更重視跑者能不能安全、穩定地持續下去。以下是好運跑班在每一段訓練裡最在意的事情。',
  themes: [
    { title: '從適合自己的起點開始', description: '依照跑齡、目前能力與可訓練時間選擇班級，先把穩定跑步的節奏建立起來。' },
    { title: '在團練裡持續前進', description: '和教練、同學一起完成每次訓練，在現場獲得配速、動作與節奏上的協助。' },
    { title: '朝自己的目標靠近', description: '不論是第一次參賽、穩定完賽或挑戰 PB，都用適合自己的步調累積。' },
  ],
  ctaLabel: '真實內容持續更新',
  ctaTitle: '到 Instagram 看最新學員故事與訓練現場',
  ctaDescription: '為避免使用未經確認的姓名、成績或照片，網站不刊登虛構見證；公開內容以好運跑班官方帳號發布為準。',
}

export const defaultTeamContent: TeamContent = {
  eyebrow: 'THE COACH TEAM',
  title: '教練團隊',
  description: '每一堂團練由不同專長的教練與助教共同照顧。課程頁只保留姓名與負責班級，完整公開資料集中在這裡。',
  rosterLabel: 'MEET YOUR MENTORS',
  rosterTitle: '一起帶領每一次訓練',
}

const defaultAchievementBadges: AchievementBadgeContent[] = [
  {
    slug: 'full-sub3',
    standard: '全馬 SUB 3',
    name: '閃電征途',
    image: '/achievements/2026/collection-full-sub3.jpg',
    description: '閃電構成 SUB「3」，展現速度與爆發力；融入 U 型馬蹄鐵，象徵競速與好運並存。',
    story: '星芒點綴其中，代表在挑戰中持續突破閃耀。',
  },
  {
    slug: 'full-sub4',
    standard: '全馬 SUB 4',
    name: '成就之星',
    image: '/achievements/2026/collection-full-sub4.jpg',
    description: '放射光芒呈現 SUB4，象徵達標瞬間的榮耀時刻；光芒四射的設計，展現挑戰自我的能量。',
    story: '每位跑者，都是為自己發光的一顆星。',
  },
  {
    slug: 'half-sub100',
    standard: '半馬 SUB 100',
    name: '與影同行',
    image: '/achievements/2026/collection-half-sub2.jpg',
    description: '影子為主視覺，象徵一路上的陪伴與自我對話；SUB 字樣延伸形成「100」，代表為目標付出的努力。',
    story: '你不孤單，陪你到終點的，是一路堅持的自己。',
  },
  {
    slug: 'half-sub2',
    standard: '半馬 SUB 2',
    name: '飛躍跑道',
    image: '/achievements/2026/collection-half-sub100.jpg',
    description: '跑道造型呈現 SUB「2」，日復一日的累積與訓練；每一圈都是汗水與堅持的軌跡。',
    story: '斜向延伸如展翅飛翔，突破極限持續向前。',
  },
]

export const defaultAchievementsContent: AchievementsContent = {
  heroLabel: 'SUB SERIES · SINCE 2025',
  heroTitle: '好運跑班限定\nSUB 系列榮耀徽章',
  heroStrapline: '每一步的汗水與堅持，都值得被紀念。',
  heroDescription: '完成賽事、達標成績，即可依申請資格取得專屬徽章，收藏每一次突破自己的榮耀時刻。',
  heroImage: '/achievements/2026/collection-cards.jpg',
  originImage: '/achievements/2026/lifestyle-sub3.jpg',
  originLabel: 'THE ORIGIN',
  originTitle: 'SUB 系列榮耀徽章的誕生。',
  originParagraphs: [
    '始於 2025 年，好運跑班以跑者追逐目標的歷程為靈感，打造專屬於跑班成員的 SUB 系列榮耀徽章。',
    '從 2025 年初開始企劃設計，歷經數個月的反覆討論與製作，於 2025 年 4 月完成首批實體徽章，並於同年 6 月好運跑班週年慶首次頒發給達成目標的跑班學員，正式開啟 SUB 系列的第一個里程碑。',
    '整體設計採用黑、金、白三色，呈現簡約且高級的視覺風格，並以好運跑班 Logo 中具有代表性的 U 字馬蹄鐵作為系列核心元素，延伸出專屬於跑班的榮耀識別。每一款徽章皆融入不同的象徵圖騰，代表各自的挑戰與目標，讓每一次突破，都化為值得珍藏的榮耀。',
    '自推出以來，SUB 系列陪伴許多跑者完成人生第一枚 SUB2、SUB4、突破 SUB3、達成 SUB100，甚至站上 BQ 的門檻。它所象徵的不只是完賽成績，更是無數個清晨、每一場訓練，以及一次次超越自我的見證。',
    '對好運跑班而言，SUB 系列榮耀徽章從來不只是一件紀念品，而是一份對努力的肯定。每一枚徽章，都承載著跑者一路走來的汗水、堅持與成長，也希望陪伴每一位跑者，收藏屬於自己的榮耀時刻。',
  ],
  collectionLabel: 'THE COLLECTION',
  collectionTitle: '全系列五款榮耀徽章',
  collectionDescription: '四款對應全馬與半馬達標標準，第五款 BQ Pride 獻給完成波士頓馬拉松的跑者。',
  badges: defaultAchievementBadges,
  bqImage: '/achievements/2026/bq-pride-feature.jpg',
  bqLabel: 'BOSTON MARATHON SPECIAL',
  bqTitle: 'BQ Pride',
  bqSubtitle: '獻給真正完成波士頓馬拉松的你',
  bqDescription: '融合 U 型馬蹄鐵，象徵幸運與實力的累積；代表突破自我、邁向波士頓的榮耀門檻。這不只是成績，而是屬於你的堅持與驕傲。',
  bqQualification: '提供當年度波士頓馬拉松正式完賽證明，經核對後依當期公告領取。',
  milestoneLabel: 'MILESTONE CARDS',
  milestoneTitle: '每一次突破，都值得留下紀念。',
  milestoneDescription: '達標紀念卡將與榮耀徽章一同記錄賽事與成績，讓每一次突破，不只停留在成績查詢頁，而是真正成為值得珍藏的回憶。',
  milestones: [
    { image: '/achievements/2026/full-sub3.jpg', alt: '全馬 SUB 3 達標紀念卡' },
    { image: '/achievements/2026/full-sub4.jpg', alt: '全馬 SUB 4 達標紀念卡' },
    { image: '/achievements/2026/half-sub100.jpg', alt: '半馬 SUB 100 達標紀念卡' },
    { image: '/achievements/2026/full-sub2.jpg', alt: '半馬 SUB 2 達標紀念卡' },
    { image: '/achievements/2026/bq-pride.jpg', alt: 'BQ Pride 達標紀念卡' },
  ],
  howToLabel: 'HOW TO EARN',
  howToTitle: '如何取得好運榮耀徽章',
  howToSteps: ['必須為好運跑班學員。', '參加正式賽事並達標對應成績。', '成績須於加入好運跑班期間內達成。', '向各班教練詢問及填寫申請表。', '經過審核後通知，並於課堂或指定地點領取徽章。'],
  howToNote: '每人每年限申請一款達標徽章；如同時符合多項資格，請擇一申請，且不得重複申請。每年度申請期間與領發安排不同，請以所屬跑班 LINE 群組的當期公告為準。',
  howToImage: '/achievements/2026/badge-in-hand.jpg',
  verifiedTitle: '成績核對後才正式取得',
  verifiedDescription: '申請資料會依正式賽事成績與跑班成員資格核對。徽章不是報名贈品，也不能單獨購買。',
  accountTitle: '查看你已經取得的徽章',
  accountDescription: '登入個人帳戶後，可查看解鎖狀態與實際取得原因。',
  accountCta: '前往個人帳戶',
}

export const defaultAnniversaryContent: AnniversaryContent = {
  label: '四週年活動',
  title: '好運跑班 4 週年活動',
  status: '活動意向登記中',
  subtitle: '這裡先收集 4 週年活動參加意向，方便我們掌握大致人數與聯絡方式；填寫內容只作為現場準備參考，不會影響能不能參加。',
  noticeTitle: '目前狀態',
  noticeDescription: '此頁目前只用於活動意向收集，不接入付款功能；後續如有活動時間、地點或流程變動，我們會再聯絡。',
  highlights: ['填寫意向即可', '方便掌握現場人數', '活動變動會再聯絡'],
  secondaryCta: '回到首頁',
  contactCta: 'Instagram 諮詢',
  formCta: '查看團練',
  formLabel: '活動表單',
  formTitle: '留下 4 週年活動意向',
  formDescription: '填寫意向，方便教練掌握現場人數。送出後也可以同時關注或私訊 Instagram，活動若有調整會再通知。',
  companionLabel: '預計同行人數',
  companionOptions: ['只有我自己', '2 人', '3 人', '4 人以上', '還不確定'],
}

const legacyAboutBeliefs = {
  label: '我們相信',
  title: '好運不是偶然，是一次次被好好安排的訓練。',
  cards: [
    { title: '跑步可以被認識', description: '跑步不是只靠意志硬撐。當你理解節奏、強度、恢復與身體訊號，每一次訓練都會變得更有方向。' },
    { title: '跑步值得被陪伴', description: '從第一次出門跑，到準備一場重要比賽，身邊有人一起練、有人看見你的狀態，進步會變得踏實很多。' },
    { title: '目標需要被拆解', description: '5000m、10000m、半馬、全馬，每個目標都有不同的節奏。好運把目標拆成週期、課表與每一次能完成的訓練。' },
  ],
}

const legacyTeamContent: TeamContent = {
  eyebrow: 'GOOD LUCK TEAM',
  title: '團隊陣容',
  description: defaultTeamContent.description,
  rosterLabel: 'COACHES & ASSISTANTS',
  rosterTitle: '一起帶領每一次訓練',
}

export const defaultPageMedia: PageMedia = {
  homeCoursesHero: '/site-visuals/hero-2026/home-courses.webp',
  aboutPageHero: '/site-visuals/hero-2026/about-track.webp',
  aboutStoryHero: '/goodluck-fourth-anniversary-wallpaper.jpg',
  coursesHero: '/site-visuals/hero-2026/home-courses.webp',
  teamHero: '/site-visuals/hero-2026/team-hero.webp',
  aboutHero: '/goodluck-fourth-anniversary-wallpaper.jpg',
  testimonialsHero: '/goodluck-anniversary-7089.jpg',
  testimonialPathHero: '/site-visuals/testimonial-together.webp',
  aboutBeliefImages: [
    '/site-visuals/about-belief-speed.webp',
    '/site-visuals/about-belief-foundation.webp',
    '/site-visuals/about-belief-coaching.webp',
  ],
  aboutFactImages: [
    '/site-visuals/about-fact-locations.webp',
    '/site-visuals/about-fact-cycle.webp',
    '/site-visuals/about-fact-community.webp',
  ],
  testimonialThemeImages: [
    '/site-visuals/testimonial-start.webp',
    '/site-visuals/testimonial-together.webp',
    '/site-visuals/testimonial-goal.webp',
  ],
  shopHero: '/site-visuals/hero-2026/shop-hero-02.jpg',
  anniversaryHero: '/goodluck-fourth-anniversary-wallpaper.jpg',
  shopTitle: '好運商店',
  shopSubtitle: '跑班裝備與訓練補給，先把真正會用上的東西整理好。',
}

export const defaultSiteContent: SiteContent = {
  heroSlides: defaultHeroSlides,
  activities: defaultHomeActivities,
  seasonalUpdate: defaultSeasonalUpdate,
  courseOverrides: {},
  brand: defaultBrandContent,
  home: defaultHomeContent,
  about: defaultAboutContent,
  coursesPage: defaultCoursesPageContent,
  testimonials: defaultTestimonialsContent,
  team: defaultTeamContent,
  achievements: defaultAchievementsContent,
  anniversary: defaultAnniversaryContent,
  pageMedia: defaultPageMedia,
  coachProfiles: defaultCoachPublicProfiles,
}

function cleanString(value: unknown, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

const legacyPublicAssets: Record<string, string> = {
  '/20250605[好運]三周年慶-7089.jpg': '/goodluck-anniversary-7089.jpg',
  '/20250605[好運]三周年慶-7096.jpg': '/goodluck-anniversary-7096.jpg',
  '/LINE_ALBUM_四週年手機桌布_260515_1.jpg': '/goodluck-fourth-anniversary-wallpaper.jpg',
}

function stablePublicAsset(value: string) {
  return legacyPublicAssets[value] || value
}

export function isSafePublicUrl(value: string) {
  if (value.startsWith('/') && !value.startsWith('//')) return true

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function normalizeHeroSlides(value: unknown) {
  if (!Array.isArray(value)) return defaultHeroSlides
  const slides = value
    .map((item) => stablePublicAsset(cleanString(item, 2000)))
    .filter((item) => item && isSafePublicUrl(item))
    .slice(0, 8)
  return slides.length > 0 ? slides : defaultHeroSlides
}

export function normalizeActivities(value: unknown) {
  if (!Array.isArray(value)) return defaultHomeActivities

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const activity = item as Partial<HomeActivity>
      const title = cleanString(activity.title, 100)
      const description = cleanString(activity.description, 500)
      const action = cleanString(activity.action, 60)
      const href = cleanString(activity.href, 2000)
      if (!title || !description || !action || !href || !isSafePublicUrl(href)) return null
      return { title, description, action, href }
    })
    .filter((item): item is HomeActivity => Boolean(item))
    .slice(0, 8)
}

export function normalizeSeasonalUpdate(value: unknown): SeasonalUpdate {
  if (!value || typeof value !== 'object') return defaultSeasonalUpdate
  const update = value as Partial<SeasonalUpdate>
  const href = cleanString(update.href, 2000)

  return {
    active: update.active === true,
    period: cleanString(update.period, 80),
    title: cleanString(update.title, 140),
    summary: cleanString(update.summary, 500),
    body: cleanString(update.body, 5000),
    href: href && isSafePublicUrl(href) ? href : '',
    linkLabel: cleanString(update.linkLabel, 60) || '了解更多',
  }
}

export function normalizeCourseOverrides(value: unknown): Record<string, CourseOverride> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const result: Record<string, CourseOverride> = {}
  Object.entries(value as Record<string, unknown>).slice(0, 100).forEach(([slug, rawOverride]) => {
    if (!/^[a-z0-9-]{1,120}$/.test(slug) || !rawOverride || typeof rawOverride !== 'object') return
    const override = rawOverride as CourseOverride
    const signupUrl = cleanString(override.signupUrl, 2000)
    const templateSlug = cleanString(override.templateSlug, 120)
    const coachKeys = Array.isArray(override.coachKeys)
      ? [...new Set(override.coachKeys.map((item) => cleanString(item, 80)).filter((item) => /^[A-Za-z0-9-]+$/.test(item)))].slice(0, 20)
      : undefined
    const benefits = cleanStringList(override.benefits, 8, 240)
    const suitableFor = cleanStringList(override.suitableFor, 8, 240)
    result[slug] = {
      active: override.active !== false,
      templateSlug: /^[a-z0-9-]{1,120}$/.test(templateSlug) ? templateSlug : undefined,
      name: cleanString(override.name, 180),
      weekday: cleanString(override.weekday, 20),
      location: cleanString(override.location, 100),
      period: cleanString(override.period, 160),
      classTime: cleanString(override.classTime, 200),
      startTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(cleanString(override.startTime, 5)) ? cleanString(override.startTime, 5) : '',
      timeZone: 'Asia/Taipei',
      meetingPoint: cleanString(override.meetingPoint, 300),
      feeNote: cleanString(override.feeNote, 300),
      campaignLabel: cleanString(override.campaignLabel, 120),
      slogan: cleanString(override.slogan, 300),
      targetAudience: cleanString(override.targetAudience, 500),
      focus: cleanString(override.focus, 300),
      benefits: benefits.length ? benefits : undefined,
      suitableFor: suitableFor.length ? suitableFor : undefined,
      enrollmentNote: cleanString(override.enrollmentNote, 300),
      signupUrl: signupUrl && isSafePublicUrl(signupUrl) ? signupUrl : '',
      coachKeys,
    }
  })
  return result
}

function cleanStringList(value: unknown, limit: number, maxLength: number) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => cleanString(item, maxLength))
    .filter(Boolean)
    .slice(0, limit)
}

function cleanOr(value: unknown, fallback: string, maxLength = 500) {
  return cleanString(value, maxLength) || fallback
}

function normalizeCards(value: unknown, fallback: ContentCard[], limit: number) {
  if (!Array.isArray(value)) return fallback
  const cards = value.slice(0, limit).map((item, index) => {
    const source = item && typeof item === 'object' ? item as Partial<ContentCard> : {}
    const base = fallback[index] ?? { title: '', description: '' }
    return {
      title: cleanOr(source.title, base.title, 120),
      description: cleanOr(source.description, base.description, 600),
    }
  })
  return cards.length === limit ? cards : fallback
}

export function normalizeBrandContent(value: unknown): BrandContent {
  const source = value && typeof value === 'object' ? value as Partial<BrandContent> : {}
  const logoUrl = cleanString(source.logoUrl, 2000)
  const instagramUrl = cleanString(source.instagramUrl, 2000)
  return {
    brandName: cleanOr(source.brandName, defaultBrandContent.brandName, 80),
    tagline: cleanOr(source.tagline, defaultBrandContent.tagline, 160),
    logoUrl: logoUrl && isSafePublicUrl(logoUrl) ? logoUrl : defaultBrandContent.logoUrl,
    instagramUrl: instagramUrl && isSafePublicUrl(instagramUrl) ? instagramUrl : defaultBrandContent.instagramUrl,
    instagramHandle: cleanOr(source.instagramHandle, defaultBrandContent.instagramHandle, 100),
    contactText: cleanOr(source.contactText, defaultBrandContent.contactText, 240),
    address: cleanOr(source.address, defaultBrandContent.address, 200),
    footerDescription: cleanOr(source.footerDescription, defaultBrandContent.footerDescription, 800),
  }
}

export function normalizeHomeContent(value: unknown): HomeContent {
  const source = value && typeof value === 'object' ? value as Partial<HomeContent> : {}
  const stats = Array.isArray(source.stats) && source.stats.length === 4
    ? source.stats.map((item, index) => ({
        value: cleanOr(item?.value, defaultHomeContent.stats[index].value, 40),
        label: cleanOr(item?.label, defaultHomeContent.stats[index].label, 80),
      }))
    : defaultHomeContent.stats
  return {
    activitiesLabel: cleanOr(source.activitiesLabel, defaultHomeContent.activitiesLabel, 80),
    activitiesTitle: cleanOr(source.activitiesTitle, defaultHomeContent.activitiesTitle, 140),
    activitiesDescription: cleanOr(source.activitiesDescription, defaultHomeContent.activitiesDescription, 500),
    featuresTitle: cleanOr(source.featuresTitle, defaultHomeContent.featuresTitle, 140),
    featuresSubtitle: cleanOr(source.featuresSubtitle, defaultHomeContent.featuresSubtitle, 500),
    features: normalizeCards(source.features, defaultHomeContent.features, 6),
    stats,
    coursesLabel: cleanOr(source.coursesLabel, defaultHomeContent.coursesLabel, 80),
    coursesTitle: cleanOr(source.coursesTitle, defaultHomeContent.coursesTitle, 140),
    coursesDescription: cleanOr(source.coursesDescription, defaultHomeContent.coursesDescription, 500),
    coursesCtaLabel: cleanOr(source.coursesCtaLabel, defaultHomeContent.coursesCtaLabel, 80),
  }
}

export function normalizeAboutContent(value: unknown): AboutContent {
  const source = value && typeof value === 'object' ? value as Partial<AboutContent> : {}
  const audienceTags = Array.isArray(source.audienceTags)
    ? source.audienceTags.map((item) => cleanString(item, 80)).filter(Boolean).slice(0, 12)
    : []
  const storedBeliefs = Array.isArray(source.beliefs) ? source.beliefs : []
  const usesLegacyBeliefs = cleanString(source.beliefsLabel, 80) === legacyAboutBeliefs.label
    && cleanString(source.beliefsTitle, 180) === legacyAboutBeliefs.title
    && legacyAboutBeliefs.cards.every((legacy, index) => cleanString(storedBeliefs[index]?.title, 120) === legacy.title)

  return {
    heroEyebrow: cleanOr(source.heroEyebrow, defaultAboutContent.heroEyebrow, 80),
    heroBrandName: cleanOr(source.heroBrandName, defaultAboutContent.heroBrandName, 100),
    heroEnglishTitle: cleanOr(source.heroEnglishTitle, defaultAboutContent.heroEnglishTitle, 180),
    heroChineseTitle: cleanOr(source.heroChineseTitle, defaultAboutContent.heroChineseTitle, 180),
    philosophies: Array.isArray(source.philosophies) && source.philosophies.length === 3
      ? source.philosophies.map((item, index) => ({
          title: cleanOr(item?.title, defaultAboutContent.philosophies[index].title, 140),
          english: cleanOr(item?.english, defaultAboutContent.philosophies[index].english, 180),
          description: cleanOr(item?.description, defaultAboutContent.philosophies[index].description, 800),
        }))
      : defaultAboutContent.philosophies,
    eyebrow: cleanOr(source.eyebrow, defaultAboutContent.eyebrow, 80),
    title: cleanOr(source.title, defaultAboutContent.title, 140),
    titleHighlight: cleanOr(source.titleHighlight, defaultAboutContent.titleHighlight, 140),
    description: cleanOr(source.description, defaultAboutContent.description, 1600),
    beliefsLabel: usesLegacyBeliefs ? defaultAboutContent.beliefsLabel : cleanOr(source.beliefsLabel, defaultAboutContent.beliefsLabel, 80),
    beliefsTitle: usesLegacyBeliefs ? defaultAboutContent.beliefsTitle : cleanOr(source.beliefsTitle, defaultAboutContent.beliefsTitle, 180),
    beliefs: usesLegacyBeliefs ? defaultAboutContent.beliefs : normalizeCards(source.beliefs, defaultAboutContent.beliefs, 3),
    audienceLabel: cleanOr(source.audienceLabel, defaultAboutContent.audienceLabel, 80),
    audienceTitle: cleanOr(source.audienceTitle, defaultAboutContent.audienceTitle, 180),
    audienceDescription: cleanOr(source.audienceDescription, defaultAboutContent.audienceDescription, 1200),
    audienceTags: audienceTags.length ? audienceTags : defaultAboutContent.audienceTags,
    facts: normalizeCards(source.facts, defaultAboutContent.facts, 3),
    ctaTitle: cleanOr(source.ctaTitle, defaultAboutContent.ctaTitle, 180),
    ctaDescription: cleanOr(source.ctaDescription, defaultAboutContent.ctaDescription, 800),
  }
}

export function normalizeCoursesPageContent(value: unknown): CoursesPageContent {
  const source = value && typeof value === 'object' ? value as Partial<CoursesPageContent> : {}
  return {
    heroLabel: cleanOr(source.heroLabel, defaultCoursesPageContent.heroLabel, 80),
    heroTitle: cleanOr(source.heroTitle, defaultCoursesPageContent.heroTitle, 160),
    heroDescription: cleanOr(source.heroDescription, defaultCoursesPageContent.heroDescription, 800),
    guideLabel: cleanOr(source.guideLabel, defaultCoursesPageContent.guideLabel, 80),
    guideTitle: cleanOr(source.guideTitle, defaultCoursesPageContent.guideTitle, 160),
    guideSteps: normalizeCards(source.guideSteps, defaultCoursesPageContent.guideSteps, 4),
    faqTitle: cleanOr(source.faqTitle, defaultCoursesPageContent.faqTitle, 120),
    faqs: normalizeCards(source.faqs, defaultCoursesPageContent.faqs, defaultCoursesPageContent.faqs.length),
    highlights: normalizeCards(source.highlights, defaultCoursesPageContent.highlights, 3),
  }
}

export function normalizeTestimonialsContent(value: unknown): TestimonialsContent {
  const source = value && typeof value === 'object' ? value as Partial<TestimonialsContent> : {}
  const videoUrl = stablePublicAsset(cleanString(source.videoUrl, 2000))
  return {
    eyebrow: cleanOr(source.eyebrow, defaultTestimonialsContent.eyebrow, 80),
    title: cleanOr(source.title, defaultTestimonialsContent.title, 180),
    description: cleanOr(source.description, defaultTestimonialsContent.description, 1000),
    videoUrl: videoUrl && isSafePublicUrl(videoUrl) ? videoUrl : '',
    videoTitle: cleanOr(source.videoTitle, defaultTestimonialsContent.videoTitle, 160),
    videoDescription: cleanOr(source.videoDescription, defaultTestimonialsContent.videoDescription, 600),
    videoEnabled: source.videoEnabled !== false,
    pathLabel: cleanOr(source.pathLabel, defaultTestimonialsContent.pathLabel, 80),
    pathTitle: cleanOr(source.pathTitle, defaultTestimonialsContent.pathTitle, 180),
    pathDescription: cleanOr(source.pathDescription, defaultTestimonialsContent.pathDescription, 800),
    themes: normalizeCards(source.themes, defaultTestimonialsContent.themes, 3),
    ctaLabel: cleanOr(source.ctaLabel, defaultTestimonialsContent.ctaLabel, 80),
    ctaTitle: cleanOr(source.ctaTitle, defaultTestimonialsContent.ctaTitle, 180),
    ctaDescription: cleanOr(source.ctaDescription, defaultTestimonialsContent.ctaDescription, 1000),
  }
}

export function normalizeTeamContent(value: unknown): TeamContent {
  const source = value && typeof value === 'object' ? value as Partial<TeamContent> : {}
  return {
    eyebrow: cleanString(source.eyebrow, 80) === legacyTeamContent.eyebrow ? defaultTeamContent.eyebrow : cleanOr(source.eyebrow, defaultTeamContent.eyebrow, 80),
    title: cleanString(source.title, 160) === legacyTeamContent.title ? defaultTeamContent.title : cleanOr(source.title, defaultTeamContent.title, 160),
    description: cleanOr(source.description, defaultTeamContent.description, 1200),
    rosterLabel: cleanString(source.rosterLabel, 80) === legacyTeamContent.rosterLabel ? defaultTeamContent.rosterLabel : cleanOr(source.rosterLabel, defaultTeamContent.rosterLabel, 80),
    rosterTitle: cleanOr(source.rosterTitle, defaultTeamContent.rosterTitle, 160),
  }
}

function normalizeImage(value: unknown, fallback: string) {
  const url = stablePublicAsset(cleanString(value, 2000))
  return url && isSafePublicUrl(url) ? url : fallback
}

export function normalizeAchievementsContent(value: unknown): AchievementsContent {
  const source = value && typeof value === 'object' ? value as Partial<AchievementsContent> : {}
  const badges = Array.isArray(source.badges) && source.badges.length === defaultAchievementBadges.length
    ? source.badges.map((item, index) => {
        const base = defaultAchievementBadges[index]
        const entry = item && typeof item === 'object' ? item as Partial<AchievementBadgeContent> : {}
        return {
          slug: /^[a-z0-9-]{1,80}$/.test(cleanString(entry.slug, 80)) ? cleanString(entry.slug, 80) : base.slug,
          standard: cleanOr(entry.standard, base.standard, 100),
          name: cleanOr(entry.name, base.name, 100),
          image: normalizeImage(entry.image, base.image),
          description: cleanOr(entry.description, base.description, 800),
          story: cleanOr(entry.story, base.story, 500),
        }
      })
    : defaultAchievementBadges
  const milestones = Array.isArray(source.milestones) && source.milestones.length === defaultAchievementsContent.milestones.length
    ? source.milestones.map((item, index) => {
        const base = defaultAchievementsContent.milestones[index]
        const entry = item && typeof item === 'object' ? item as Partial<AchievementMilestoneContent> : {}
        return { image: normalizeImage(entry.image, base.image), alt: cleanOr(entry.alt, base.alt, 160) }
      })
    : defaultAchievementsContent.milestones
  const paragraphs = cleanStringList(source.originParagraphs, 5, 1800)
  const steps = cleanStringList(source.howToSteps, 5, 300)
  return {
    heroLabel: cleanOr(source.heroLabel, defaultAchievementsContent.heroLabel, 100),
    heroTitle: cleanOr(source.heroTitle, defaultAchievementsContent.heroTitle, 180),
    heroStrapline: cleanOr(source.heroStrapline, defaultAchievementsContent.heroStrapline, 300),
    heroDescription: cleanOr(source.heroDescription, defaultAchievementsContent.heroDescription, 800),
    heroImage: normalizeImage(source.heroImage, defaultAchievementsContent.heroImage),
    originImage: normalizeImage(source.originImage, defaultAchievementsContent.originImage),
    originLabel: cleanOr(source.originLabel, defaultAchievementsContent.originLabel, 80),
    originTitle: cleanOr(source.originTitle, defaultAchievementsContent.originTitle, 180),
    originParagraphs: paragraphs.length === 5 ? paragraphs : defaultAchievementsContent.originParagraphs,
    collectionLabel: cleanOr(source.collectionLabel, defaultAchievementsContent.collectionLabel, 80),
    collectionTitle: cleanOr(source.collectionTitle, defaultAchievementsContent.collectionTitle, 160),
    collectionDescription: cleanOr(source.collectionDescription, defaultAchievementsContent.collectionDescription, 500),
    badges,
    bqImage: normalizeImage(source.bqImage, defaultAchievementsContent.bqImage),
    bqLabel: cleanOr(source.bqLabel, defaultAchievementsContent.bqLabel, 100),
    bqTitle: cleanOr(source.bqTitle, defaultAchievementsContent.bqTitle, 120),
    bqSubtitle: cleanOr(source.bqSubtitle, defaultAchievementsContent.bqSubtitle, 240),
    bqDescription: cleanOr(source.bqDescription, defaultAchievementsContent.bqDescription, 800),
    bqQualification: cleanOr(source.bqQualification, defaultAchievementsContent.bqQualification, 500),
    milestoneLabel: cleanOr(source.milestoneLabel, defaultAchievementsContent.milestoneLabel, 100),
    milestoneTitle: cleanOr(source.milestoneTitle, defaultAchievementsContent.milestoneTitle, 180),
    milestoneDescription: cleanOr(source.milestoneDescription, defaultAchievementsContent.milestoneDescription, 800),
    milestones,
    howToLabel: cleanOr(source.howToLabel, defaultAchievementsContent.howToLabel, 80),
    howToTitle: cleanOr(source.howToTitle, defaultAchievementsContent.howToTitle, 160),
    howToSteps: steps.length === 5 ? steps : defaultAchievementsContent.howToSteps,
    howToNote: cleanOr(source.howToNote, defaultAchievementsContent.howToNote, 1000),
    howToImage: normalizeImage(source.howToImage, defaultAchievementsContent.howToImage),
    verifiedTitle: cleanOr(source.verifiedTitle, defaultAchievementsContent.verifiedTitle, 160),
    verifiedDescription: cleanOr(source.verifiedDescription, defaultAchievementsContent.verifiedDescription, 800),
    accountTitle: cleanOr(source.accountTitle, defaultAchievementsContent.accountTitle, 160),
    accountDescription: cleanOr(source.accountDescription, defaultAchievementsContent.accountDescription, 500),
    accountCta: cleanOr(source.accountCta, defaultAchievementsContent.accountCta, 80),
  }
}

export function normalizeAnniversaryContent(value: unknown): AnniversaryContent {
  const source = value && typeof value === 'object' ? value as Partial<AnniversaryContent> : {}
  const highlights = cleanStringList(source.highlights, 6, 120)
  const companionOptions = cleanStringList(source.companionOptions, 8, 120)
  return {
    label: cleanOr(source.label, defaultAnniversaryContent.label, 100),
    title: cleanOr(source.title, defaultAnniversaryContent.title, 180),
    status: cleanOr(source.status, defaultAnniversaryContent.status, 120),
    subtitle: cleanOr(source.subtitle, defaultAnniversaryContent.subtitle, 1000),
    noticeTitle: cleanOr(source.noticeTitle, defaultAnniversaryContent.noticeTitle, 120),
    noticeDescription: cleanOr(source.noticeDescription, defaultAnniversaryContent.noticeDescription, 800),
    highlights: highlights.length ? highlights : defaultAnniversaryContent.highlights,
    secondaryCta: cleanOr(source.secondaryCta, defaultAnniversaryContent.secondaryCta, 100),
    contactCta: cleanOr(source.contactCta, defaultAnniversaryContent.contactCta, 100),
    formCta: cleanOr(source.formCta, defaultAnniversaryContent.formCta, 100),
    formLabel: cleanOr(source.formLabel, defaultAnniversaryContent.formLabel, 100),
    formTitle: cleanOr(source.formTitle, defaultAnniversaryContent.formTitle, 180),
    formDescription: cleanOr(source.formDescription, defaultAnniversaryContent.formDescription, 800),
    companionLabel: cleanOr(source.companionLabel, defaultAnniversaryContent.companionLabel, 120),
    companionOptions: companionOptions.length ? companionOptions : defaultAnniversaryContent.companionOptions,
  }
}

export function normalizePageMedia(value: unknown): PageMedia {
  const source = value && typeof value === 'object' ? value as Partial<PageMedia> : {}
  const replacedShopHeroes = new Set([
    '/goodluck-anniversary-7096.jpg',
    'https://vmnbthmssiizbsvzeahz.supabase.co/storage/v1/object/public/site-media/pages/2026-07-24/a75fcf26-acc9-4d99-a993-6c81971301ee.webp',
  ])
  const image = (candidate: unknown, fallback: string) => {
    const url = stablePublicAsset(cleanString(candidate, 2000))
    return url && isSafePublicUrl(url) ? url : fallback
  }
  const imageList = (candidate: unknown, fallback: string[]) => {
    if (!Array.isArray(candidate) || candidate.length !== fallback.length) return fallback
    return fallback.map((fallbackImage, index) => image(candidate[index], fallbackImage))
  }
  return {
    homeCoursesHero: image(source.homeCoursesHero, defaultPageMedia.homeCoursesHero),
    aboutPageHero: image(source.aboutPageHero, defaultPageMedia.aboutPageHero),
    aboutStoryHero: image(source.aboutStoryHero, source.aboutHero || defaultPageMedia.aboutStoryHero),
    coursesHero: image(source.coursesHero, defaultPageMedia.coursesHero),
    teamHero: image(source.teamHero, defaultPageMedia.teamHero),
    aboutHero: image(source.aboutHero, defaultPageMedia.aboutHero),
    testimonialsHero: image(source.testimonialsHero, defaultPageMedia.testimonialsHero),
    testimonialPathHero: image(source.testimonialPathHero, defaultPageMedia.testimonialPathHero),
    aboutBeliefImages: imageList(source.aboutBeliefImages, defaultPageMedia.aboutBeliefImages),
    aboutFactImages: imageList(source.aboutFactImages, defaultPageMedia.aboutFactImages),
    testimonialThemeImages: imageList(source.testimonialThemeImages, defaultPageMedia.testimonialThemeImages),
    shopHero: replacedShopHeroes.has(image(source.shopHero, defaultPageMedia.shopHero))
      ? defaultPageMedia.shopHero
      : image(source.shopHero, defaultPageMedia.shopHero),
    anniversaryHero: image(source.anniversaryHero, defaultPageMedia.anniversaryHero),
    shopTitle: cleanOr(source.shopTitle, defaultPageMedia.shopTitle, 120),
    shopSubtitle: cleanOr(source.shopSubtitle, defaultPageMedia.shopSubtitle, 500),
  }
}

export function siteContentFromRows(rows: Array<{ key: string; value: unknown }> | null | undefined): SiteContent {
  const values = new Map((rows ?? []).map((row) => [row.key, row.value]))

  return {
    heroSlides: normalizeHeroSlides(values.get('hero_slides')),
    activities: normalizeActivities(values.get('home_activities')),
    seasonalUpdate: normalizeSeasonalUpdate(values.get('seasonal_update')),
    courseOverrides: normalizeCourseOverrides(values.get('course_overrides')),
    brand: normalizeBrandContent(values.get('brand_content')),
    home: normalizeHomeContent(values.get('home_content')),
    about: normalizeAboutContent(values.get('about_content')),
    coursesPage: normalizeCoursesPageContent(values.get('courses_page_content')),
    testimonials: normalizeTestimonialsContent(values.get('testimonials_content')),
    team: normalizeTeamContent(values.get('team_content')),
    achievements: normalizeAchievementsContent(values.get('achievements_content')),
    anniversary: normalizeAnniversaryContent(values.get('anniversary_content')),
    pageMedia: normalizePageMedia(values.get('page_media')),
    coachProfiles: defaultCoachPublicProfiles,
  }
}
import { defaultCoachPublicProfiles, type CoachPublicProfileMap } from '@/lib/coach-profiles'
