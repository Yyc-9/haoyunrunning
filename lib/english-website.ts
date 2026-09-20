import { dictionary, type Language } from '@/lib/dictionary'
import { publicEnglishCopy } from '@/lib/english-public-copy'
import { notificationEnglishCopy } from '@/lib/english-notification-copy'
import { policyEnglishCopy } from '@/lib/english-policy-copy'
import { coachEnglishCopy } from '@/lib/english-coach-copy'
import { achievementEnglishCopy } from '@/lib/english-achievement-copy'
import { registrationEnglishCopy } from '@/lib/english-registration-copy'
import { studentEnglishCopy } from '@/lib/english-student-copy'
import { coachWorkspaceEnglishCopy } from '@/lib/english-coach-workspace-copy'
import { financeEnglishCopy } from '@/lib/english-finance-copy'
import { adminEnglishCopy } from '@/lib/english-admin-copy'
import { adminEnrollmentEnglishCopy } from '@/lib/english-admin-enrollment-copy'
import { adminDutyEnglishCopy } from '@/lib/english-admin-duty-copy'
import { shopEnglishCopy } from '@/lib/english-shop-copy'
import { adminProductEnglishCopy } from '@/lib/english-admin-product-copy'
import { adminContentEnglishCopy } from '@/lib/english-admin-content-copy'
import { systemEnglishCopy } from '@/lib/english-system-copy'
import { coachActionEnglishCopy } from '@/lib/english-coach-action-copy'
import { studentActionEnglishCopy } from '@/lib/english-student-action-copy'
import { adminActionEnglishCopy } from '@/lib/english-admin-action-copy'
import { legacyEnrollmentEnglishCopy } from '@/lib/english-legacy-enrollment-copy'

type TextPair = readonly [string, string]

function collectDictionaryPairs(traditional: unknown, english: unknown, pairs: TextPair[]) {
  if (typeof traditional === 'string' && typeof english === 'string') {
    // Only collect human-language copy. Numeric stats, URLs and opaque identifiers
    // must never be rewritten while localizing the content JSON.
    if (traditional !== english && /[\u3400-\u9fff]/u.test(traditional)) {
      pairs.push([traditional, english])
    }
    return
  }
  if (Array.isArray(traditional) && Array.isArray(english)) {
    traditional.forEach((item, index) => collectDictionaryPairs(item, english[index], pairs))
    return
  }
  if (traditional && english && typeof traditional === 'object' && typeof english === 'object') {
    Object.entries(traditional).forEach(([key, value]) => {
      collectDictionaryPairs(value, (english as Record<string, unknown>)[key], pairs)
    })
  }
}

const managedContentPairs: TextPair[] = [
  ['每一步進步，都從願意開始', 'Every step forward begins with the decision to start'],
  ['好運跑班陪跑者從第一次規律訓練，到完成賽事與挑戰個人目標。真實學員分享與最新訓練現場，持續發布在官方 Instagram。', 'From a first consistent training cycle to race day and personal milestones, Nurture Running Team grows with every runner. Follow our official Instagram for real runner stories and the latest training moments.'],
  ['從訓練現場與賽事歷程，看見跑者如何一步一步完成自己的目標。', 'See how runners turn consistent training and race experience into meaningful personal goals.'],
  ['跑者的成長路徑', 'Runner Growth Path'],
  ['訓練不只看最後的成績', 'Training is about more than the final result'],
  ['我們更重視跑者能不能安全、穩定地持續下去。以下是好運跑班在每一段訓練裡最在意的事情。', 'We care most about helping runners train safely, consistently, and sustainably. These are the priorities behind every stage of our coaching.'],
  ['從適合自己的起點開始', 'Start from the right place for you'],
  ['依照跑齡、目前能力與可訓練時間選擇班級，先把穩定跑步的節奏建立起來。', 'Choose a class based on your experience, current ability, and available training time, then build a sustainable rhythm.'],
  ['在團練裡持續前進', 'Keep moving forward together'],
  ['和教練、同學一起完成每次訓練，在現場獲得配速、動作與節奏上的協助。', 'Train with coaches and teammates while receiving real-time guidance on pace, movement, and rhythm.'],
  ['朝自己的目標靠近', 'Move closer to your own goal'],
  ['不論是第一次參賽、穩定完賽或挑戰 PB，都用適合自己的步調累積。', 'Whether it is your first race, a steady finish, or a new PB, progress at a pace that fits you.'],
  ['好的環境，創造出好的運動員。', 'A great place builds great runners.'],
  ['專注速度能力與跑步經濟性', 'Speed and Running Economy'],
  ['不是追求更多公里，而是透過科學化訓練，提升速度能力與跑步經濟性，讓每一步都更有效率。', 'We focus on purposeful training that improves speed and running economy, making every step more efficient.'],
  ['建立穩固的訓練基礎', 'Build a Strong Training Base'],
  ['真正的進步，來自一季又一季穩定累積。用清楚的訓練節奏，讓每一次努力都能銜接賽事目標。', 'Real progress comes from consistent work across each season, with every session connected to a clear race goal.'],
  ['每位跑者都值得被看見', 'Every Runner Matters'],
  ['依班級人數配置專屬教練，確保每位學員都能獲得足夠的指導與回饋。', 'Coach staffing follows class size so every runner receives meaningful guidance and feedback.'],
  ['我們想讓更多人，', 'We want more people to'],
  ['真正愛上跑步。', 'truly enjoy running.'],
  ['關於好運跑班', 'About Nurture Running Team'],
  ['好運跑班面向台灣所有跑者。你可以是第一次想規律跑步的人，也可以是正在追逐 PB 的跑者；可以為 5000m、10000m 準備，也可以把目標放在半馬、全馬。重要的不是你現在跑得多快，而是你願意開始理解自己的身體，並且一步一步跑向更穩定的自己。', 'Nurture Running Team welcomes runners across Taiwan, from people building their first consistent habit to athletes chasing a PB across 5K, 10K, half marathon, or marathon. What matters is not how fast you are today, but your willingness to understand your body and become a steadier runner one step at a time.'],
  ['台灣多地開課', 'Classes Across Taiwan'],
  ['本期台北、新竹、竹北、竹南等班級同步整理上線。', 'Current classes are available in Taipei, Hsinchu, Zhubei, Zhunan, and other locations.'],
  ['週期化訓練', 'Periodized Training'],
  ['以固定週期建立跑力，讓課表、團練與恢復彼此銜接。', 'Build running fitness through structured cycles that connect workouts, group sessions, and recovery.'],
  ['教練與社群支援', 'Coach and Community Support'],
  ['學員回報訓練感受，教練依照狀態調整，讓進步不是孤單發生。', 'Runners share how training feels, and coaches adjust accordingly so progress never happens alone.'],
  ['訓練日程表', 'Training Schedule'],
  ['先看適合對象、訓練目標、時間地點與報名方式，不進入詳情頁也能初步判斷是否適合。', 'Compare target runners, training goals, time, location, and registration details before opening a class page.'],
  ['如何加入課程？', 'How to Join a Class'],
  ['查看本期課表', 'View the Current Schedule'],
  ['先依照星期、城市與上課時間，找到能穩定參加的班級。', 'Choose a class you can attend consistently by day, city, and start time.'],
  ['進入課程詳情', 'Open Class Details'],
  ['點擊課表中的課程卡片，確認訓練方向、教練與適合對象。', 'Open a class card to review its focus, coaches, and intended runners.'],
  ['填寫專屬報名表', 'Complete the Registration Form'],
  ['在課程詳情最下方點擊「立即報名」，登入後完成資料與計費確認。', 'Select Register at the bottom of the class page, sign in, and confirm your details and fee.'],
  ['完成匯款與核對', 'Complete the Bank Transfer'],
  ['依網站顯示的金額完成匯款並提交後五碼，財務核對後即完成報名。', 'Transfer the displayed amount and submit the last five digits. Registration is complete after finance review.'],
  ['新手可以參加嗎？', 'Can beginners join?'],
  ['可以。請先依目前跑齡、訓練習慣與目標選擇合適班級；若不確定，可透過 Instagram 詢問。', 'Yes. Choose a class based on your running experience, current routine, and goals. If you are unsure, contact us on Instagram.'],
  ['下雨怎麼辦？', 'What happens if it rains?'],
  ['是否停課或調整地點，會由各班教練依場地與天候狀況通知。', 'Your class coach will confirm any cancellation or location change based on the weather and venue conditions.'],
  ['課程費用是多少？', 'How much does a class cost?'],
  ['各班費用與可報名名額以課程詳情及報名頁顯示為準。', 'Fees and available places are shown on each class details and registration page.'],
  ['可以請假嗎？', 'Can I request leave?'],
  ['可以。學員可在個人帳戶為最近一堂尚未開始的所屬課程請假，並依本季度剩餘課次選擇補課。', 'Yes. Use your account to request leave for your next class before it starts, then choose an eligible make-up session within the current season.'],
  ['可以試上嗎？', 'Can I try a class first?'],
  ['是否開放試上會依班級名額、場地與當期安排確認。', 'Trial availability depends on class capacity, venue conditions, and the current season schedule.'],
  ['當期日期與開放班級以本頁課表及課程詳情為準。', 'Current dates and available classes are listed in the schedule and class details.'],
  ['涵蓋 5000m、10000m、半馬、全馬與 PB 目標。', 'Training supports 5K, 10K, half marathon, marathon, and PB goals.'],
  ['台北、新竹、竹北、竹南等班級依季度安排開課。', 'Classes in Taipei, Hsinchu, Zhubei, Zhunan, and other locations open by season.'],
  ['教練團隊', 'Coach Team'],
  ['每一堂團練由不同專長的教練與助教共同照顧。課程頁只保留姓名與負責班級，完整公開資料集中在這裡。', 'Every group session is supported by coaches and assistants with complementary strengths. Full public profiles are collected here.'],
  ['一起帶領每一次訓練', 'Meet the people behind every session'],
  ['近期報名入口', 'Current Registration'],
  ['活動與團練資訊整理在這裡，方便你快速完成報名。', 'Find current events and group training registration in one place.'],
  ['首頁整理本期代表班級，完整時間、訓練內容、費用與報名說明請進入課程頁查看。', 'The homepage highlights representative classes. Open the full schedule for times, training details, fees, and registration notes.'],
  ['查看完整課表', 'View Full Schedule'],
  ['好運商店', 'Nurture Running Shop'],
  ['跑班裝備與訓練補給，先把真正會用上的東西整理好。', 'Running team gear and training essentials selected for real use.'],
  ['認識跑步，嘗試跑步，愛上跑步', 'Know running. Try running. Love running.'],
  ['專業的跑步訓練平台，為跑者提供科學、系統、個人化的訓練指導，幫助每一位跑者安全、高效地提升跑步能力，實現個人目標。', 'Structured, science-based coaching that helps every runner improve safely, train efficiently, and reach personal goals.'],
  ['課程與商品諮詢請先透過 Instagram 聯絡', 'Contact us on Instagram for class and product enquiries.'],
  ['台灣各城市團練據點', 'Group training locations across Taiwan'],
  ['參加好運', 'Join Nurture Running'],
  ['探索', 'Explore'],
  ['聯絡', 'Contact'],
  ['法律與政策', 'Legal and Policies'],
  ['訓練課程', 'Training Classes'],
  ['課程報名', 'Class Registration'],
  ['團練報名', 'Group Training Registration'],
  ['團隊陣容', 'Coach Team'],
  ['榮耀徽章', 'Achievement Badges'],
  ['學員見證', 'Student Stories'],
  ['關於我們', 'About Us'],
  ['課程諮詢', 'Class Enquiries'],
  ['商品諮詢', 'Product Enquiries'],
  ['隱私權政策', 'Privacy Policy'],
  ['課程服務條款', 'Class Terms'],
  ['取消與退費政策', 'Cancellation and Refund Policy'],
  ['電子發票說明', 'E-Invoice Information'],
  ['查看課程', 'View Classes'],
  ['前往商店', 'Visit Shop'],
  ['保留所有權利。', 'All rights reserved.'],
  ['竹北夜跑班', 'Zhubei Night Run'],
  ['台北 PB 班', 'Taipei PB Class'],
  ['竹市初心補習班', 'Hsinchu Beginner Class'],
  ['新竹早鳥班', 'Hsinchu Early Bird'],
  ['台北夜跑班', 'Taipei Night Run'],
  ['竹市夜跑班', 'Hsinchu Night Run'],
  ['竹南初階班', 'Zhunan Beginner Class'],
  ['台北早鳥班', 'Taipei Early Bird'],
  ['竹縣第一運動場', 'Hsinchu County Stadium'],
  ['竹市體育場', 'Hsinchu City Stadium'],
  ['台大田徑場', 'NTU Track'],
  ['竹南運動公園田徑場', 'Zhunan Sports Park Track'],
  ['週一', 'Monday'],
  ['週二', 'Tuesday'],
  ['週三', 'Wednesday'],
  ['週四', 'Thursday'],
  ['週五', 'Friday'],
  ['週六', 'Saturday'],
  ['週日', 'Sunday'],
  ['新竹市', 'Hsinchu'],
  ['竹北', 'Zhubei'],
  ['竹南', 'Zhunan'],
  ['台北', 'Taipei'],
  ['好運跑班', 'Nurture Running Team'],
]

const dictionaryPairs: TextPair[] = []
collectDictionaryPairs(dictionary['zh-TW'], dictionary.en, dictionaryPairs)

const normalizeCopy = (value: string) => value.replace(/\s+/gu, ' ').trim()
const englishCopy = new Map(
  [...dictionaryPairs, ...managedContentPairs, ...Object.entries(publicEnglishCopy), ...Object.entries(notificationEnglishCopy), ...Object.entries(policyEnglishCopy), ...Object.entries(coachEnglishCopy), ...Object.entries(achievementEnglishCopy), ...Object.entries(registrationEnglishCopy), ...Object.entries(studentEnglishCopy), ...Object.entries(coachWorkspaceEnglishCopy), ...Object.entries(financeEnglishCopy), ...Object.entries(adminEnglishCopy)]
    .concat(Object.entries(adminEnrollmentEnglishCopy))
    .concat(Object.entries(adminDutyEnglishCopy))
    .concat(Object.entries(shopEnglishCopy))
    .concat(Object.entries(adminProductEnglishCopy))
    .concat(Object.entries(adminContentEnglishCopy))
    .concat(Object.entries(systemEnglishCopy))
    .concat(Object.entries(coachActionEnglishCopy))
    .concat(Object.entries(studentActionEnglishCopy))
    .concat(Object.entries(adminActionEnglishCopy))
    .concat(Object.entries(legacyEnrollmentEnglishCopy))
    .filter(([source, translation]) => source && translation)
    .map(([source, translation]) => [normalizeCopy(source), translation]),
)

// Match compact city labels exactly so longer names and addresses stay intact.
const cityFilterTranslations = new Map([
  ['北市', 'Taipei'],
  ['新北', 'New Taipei'],
  ['竹縣', 'Hsinchu County'],
  ['竹市', 'Hsinchu City'],
  ['苗栗', 'Miaoli'],
])

export function toEnglishWebsiteText(value: string): string {
  if (/^(?:https?:\/\/|\/[^/]|mailto:|tel:)/u.test(value)) return value
  const source = normalizeCopy(value)
  const exact = englishCopy.get(source) ?? cityFilterTranslations.get(source)
  const preserveSpace = (translation: string) => `${value.match(/^\s*/u)?.[0] ?? ''}${translation}${value.match(/\s*$/u)?.[0] ?? ''}`
  if (exact) return preserveSpace(exact)
  const requiredBankColumn = source.match(/^請指定「(.+)」欄位。$/u)
  const invalidBankColumn = source.match(/^「(.+)」欄位設定無效。$/u)
  if (requiredBankColumn || invalidBankColumn) {
    const label = toEnglishWebsiteText((requiredBankColumn || invalidBankColumn)![1])
    if (!/[\u3400-\u9fff]/u.test(label)) return preserveSpace(requiredBankColumn ? `Select the “${label}” column.` : `The “${label}” column setting is invalid.`)
  }
  const bankRowLimit = source.match(/^單次最多匯入 ([\d,]+) 筆交易。$/u)
  if (bankRowLimit) return preserveSpace(`You can import up to ${bankRowLimit[1]} transactions at a time.`)
  const imageLimit = source.match(/^圖片大小必須小於 (\d+) MB。$/u)
  if (imageLimit) return preserveSpace(`Images must be smaller than ${imageLimit[1]} MB.`)
  const seasonName = source.match(/^(\d{4})\s*第([一二三四])季$/u)
  if (seasonName) return preserveSpace(`${seasonName[1]} Q${'一二三四'.indexOf(seasonName[2]) + 1}`)
  const seasonCreated = source.match(/^(.+) 已建立為草稿，(?:第三季|來源季度)資料仍完整保留。$/u)
  if (seasonCreated) return preserveSpace(`${toEnglishWebsiteText(seasonCreated[1])} created as a draft. All source-season records are retained.`)
  const courseCopy = source.match(/^(.+)（複本）$/u)
  if (courseCopy) return preserveSpace(`${toEnglishWebsiteText(courseCopy[1])} (copy)`)
  const seasonExists = source.match(/^(.+) 已經存在，請直接切換管理。$/u)
  if (seasonExists) return preserveSpace(`${toEnglishWebsiteText(seasonExists[1])} already exists. Select it to manage it.`)
  const courseCreated = source.match(/^已新增「(.+)」；完成日期、教練與計價後再開啟對外顯示。$/u)
  if (courseCreated) return preserveSpace(`${toEnglishWebsiteText(courseCreated[1])} added. Set dates, coaches and pricing before publishing it.`)
  const incompleteCourses = source.match(/^還有 (\d+) 門對外課程未完成實際收費課次，不能切換前台招生。$/u)
  if (incompleteCourses) return preserveSpace(`${incompleteCourses[1]} public ${incompleteCourses[1] === '1' ? 'course has' : 'courses have'} incomplete billable sessions. Public enrollment cannot switch yet.`)
  const productDeleted = source.match(/^商品「(.+)」已刪除；既有訂單記錄與刪除紀錄仍會保留。$/u)
  if (productDeleted) return preserveSpace(`${toEnglishWebsiteText(productDeleted[1])} deleted. Existing orders and the deletion history are retained.`)
  const stockError = source.match(/^(庫存不足|商品尚未設定售價)：([A-Za-z0-9_-]+)$/u)
  if (stockError) return preserveSpace(`${stockError[1] === '庫存不足' ? 'Not enough stock' : 'Price not configured'}: ${stockError[2]}`)
  const specificationField = source.match(/^規格 (\d+) (名稱|可選項目)$/u)
  if (specificationField) return preserveSpace(`Specification ${specificationField[1]} ${specificationField[2] === '名稱' ? 'name' : 'options'}`)
  const productRemoval = source.match(/^(移除規格|刪除款式|移除詳情圖片) (\d+)$/u)
  if (productRemoval) return preserveSpace(`${productRemoval[1] === '移除規格' ? 'Remove specification' : productRemoval[1] === '刪除款式' ? 'Delete style' : 'Remove detail image'} ${productRemoval[2]}`)
  const styleImageMove = source.match(/^款式 (\d+) 圖片 (\d+) (向前移動|向後移動)$/u)
  if (styleImageMove) return preserveSpace(`Move style ${styleImageMove[1]} image ${styleImageMove[2]} ${styleImageMove[3] === '向前移動' ? 'earlier' : 'later'}`)
  const styleImageRemove = source.match(/^移除款式 (\d+) 圖片 (\d+)$/u)
  if (styleImageRemove) return preserveSpace(`Remove style ${styleImageRemove[1]} image ${styleImageRemove[2]}`)
  const missingSpecification = source.match(/^請填寫第 (\d+) 項規格的(名稱與內容，或刪除這一項|可選項目)。$/u)
  if (missingSpecification) return preserveSpace(missingSpecification[2] === '可選項目' ? `Enter options for specification ${missingSpecification[1]}.` : `Enter a name and options for specification ${missingSpecification[1]}, or remove it.`)
  const imported = source.match(/^已匯入 (\d+) 筆交易，系統已完成初步比對(?:，並標記 (\d+) 筆匯款資料需補充)?。$/u)
  if (imported) return preserveSpace(`Imported ${imported[1]} transactions and completed initial matching.${imported[2] ? ` ${imported[2]} transfer records need more information.` : ''}`)
  const reconciled = source.match(/^已完成 (\d+) 筆唯一相符交易的對帳。$/u)
  if (reconciled) return preserveSpace(`Reconciled ${reconciled[1]} uniquely matched transactions.`)
  const partiallyReconciled = source.match(/^已完成 (\d+) 筆；另有 (\d+) 筆需人工處理。$/u)
  if (partiallyReconciled) return preserveSpace(`Completed ${partiallyReconciled[1]} transactions; ${partiallyReconciled[2]} need manual review.`)
  const unread = source.match(/^通知，(\d+) 則未讀$/u)
  if (unread) return preserveSpace(`Notifications, ${unread[1]} unread`)
  const products = source.match(/^目前共 (\d+) 件商品$/u)
  if (products) return preserveSpace(`${products[1]} products available`)
  const places = source.match(/^剩餘名額 (\d+) 人$/u)
  if (places) return preserveSpace(`${places[1]} places available`)
  const wrappers: [RegExp, (text: string) => string][] = [
    [/^(.+)授課安排$/u, text => `${text} teaching schedule`],
    [/^查看(.+)的擅長、經歷與證照$/u, text => `View ${text}: expertise, experience, and qualifications`],
    [/^查看(.+)的完整介紹$/u, text => `View the full profile of ${text}`],
    [/^查看(.+)課程$/u, text => `View ${text}`],
    [/^(.+)教練照片$/u, text => `Portrait of ${text}`],
    [/^(.+)課程頭像$/u, text => `Class coach portrait: ${text}`],
    [/^(.+)報名$/u, text => `Register for ${text}`],
    [/^選擇(.+)$/u, text => `Select ${text}`],
    [/^(.+)徽章$/u, text => `${text} badge`],
    [/^(.+)達標紀念卡$/u, text => `${text} achievement card`],
    [/^複製(.+)$/u, text => `Copy ${text.toLowerCase()}`],
  ]
  for (const [pattern, format] of wrappers) {
    const match = source.match(pattern)
    if (!match) continue
    const translated = toEnglishWebsiteText(match[1])
    if (!/[\u3400-\u9fff]/u.test(translated)) return preserveSpace(format(translated))
  }

  // Translate complete, known formats only. Replacing dictionary words inside an
  // unknown sentence used to turn 是 into Yes and 一起 into 一From.
  const camp = source.match(/^(\d{4})好運跑步訓練營\s*[X×]\s*((?:週|星期)[一二三四五六日])(.+)$/u)
  if (camp) {
    const day = englishCopy.get(camp[2])
    const course = englishCopy.get(camp[3])
    if (day && course) return preserveSpace(`${camp[1]} Nurture Running Camp · ${day} ${course}`)
  }
  const duration = source.match(/^(\d{2}:\d{2})[（(]([\d.]+-[\d.]+) 小時[）)]$/u)
  if (duration) return preserveSpace(`${duration[1]} (${duration[2]} hours)`)
  const ability = source.match(/^已能完成 ([\d.-]+)KM$/u)
  if (ability) return preserveSpace(`Able to run ${ability[1]} km`)
  const closures = source.match(/^([\d/ -]+)\s*\(([\d/、]+)停課[一二三四五六七八九十\d]+次\)$/u)
  if (closures) return preserveSpace(`${closures[1].trim()} (no class on ${closures[2].replaceAll('、', ', ')})`)
  const image = source.match(/^好運跑班訓練紀錄\s*(\d+)$/u)
  if (image) return preserveSpace(`Nurture Running Team training photo ${image[1]}`)
  const preview = source.match(/^快速預覽[：:]?\s*(.+)$/u)
  if (preview) {
    const translated = toEnglishWebsiteText(preview[1])
    if (!/[\u3400-\u9fff]/u.test(translated)) return preserveSpace(`Preview ${translated}`)
  }
  // Lists of known locations and branded page titles can be composed safely.
  for (const separator of ['、', '｜', ' - ', ' · ']) {
    if (!source.includes(separator)) continue
    const parts = source.split(separator).map(part => toEnglishWebsiteText(part.trim()))
    if (parts.every(part => !/[\u3400-\u9fff]/u.test(part))) {
      return preserveSpace(parts.join(separator === '、' ? ', ' : separator === ' · ' ? ' · ' : ' | '))
    }
  }
  return value
}

export function localizeWebsiteValue<T>(value: T, language: Language): T {
  if (typeof value === 'string') {
    const localized = language === 'en' ? toEnglishWebsiteText(value) : value
    return localized as T
  }
  if (Array.isArray(value)) return value.map((item) => localizeWebsiteValue(item, language)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, localizeWebsiteValue(item, language)])
    ) as T
  }
  return value
}
