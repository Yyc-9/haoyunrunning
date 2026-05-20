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

export const allCourses = courseGroups.flatMap((group) =>
  group.courses.map((course) => ({ ...course, groupTitle: group.title, slug: courseSlug(course) }))
)

export function getCourseBySlug(slug: string) {
  return allCourses.find((course) => course.slug === slug)
}

export function getCourseCoach(course: Course) {
  if (course.name.includes('PB')) {
    return {
      name: '好运竞速教练组',
      title: 'PB 与间歇训练专项',
      bio: '擅长用分段配速、间歇结构和恢复监控协助跑者提升 5000m、10000m、半马与全马成绩。',
    }
  }

  if (course.name.includes('初心') || course.name.includes('初階')) {
    return {
      name: '好运基础教练组',
      title: '新手跑姿与基础体能专项',
      bio: '专注帮助新手建立安全跑步习惯，从跑姿、肌力、呼吸节奏到训练负荷逐步打底。',
    }
  }

  return {
    name: '好运跑班教练组',
    title: '耐力训练与赛事备赛专项',
    bio: '以周期化训练安排团练课表，结合课后回馈调整强度，让跑者稳定累积跑量并减少伤痛风险。',
  }
}
