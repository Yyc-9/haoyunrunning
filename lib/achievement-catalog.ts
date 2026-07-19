export type PublicAchievement = {
  slug: string
  name: string
  description: string
  unlockHint: string
  icon: string
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export const publicAchievementCatalog: PublicAchievement[] = [
  {
    slug: 'runner-profile',
    name: '跑者名片',
    description: '完成個人跑者資料，讓教練與跑友更認識你。',
    unlockHint: '在個人帳戶填寫暱稱、城市與偏好距離。',
    icon: 'user-round',
    category: '帳戶',
    rarity: 'common',
  },
  {
    slug: 'first-course',
    name: '初次集結',
    description: '完成第一門好運跑班課程報名。',
    unlockHint: '第一筆課程款項經財務核對並確認後取得。',
    icon: 'ticket-check',
    category: '課程',
    rarity: 'common',
  },
  {
    slug: 'first-feedback',
    name: '訓練回聲',
    description: '送出第一篇完整訓練回饋。',
    unlockHint: '完成第一次訓練回報後取得。',
    icon: 'message-circle-heart',
    category: '訓練',
    rarity: 'common',
  },
  {
    slug: 'four-week-streak',
    name: '穩定四週',
    description: '連續四週留下訓練紀錄。',
    unlockHint: '連續四週完成訓練回報後取得。',
    icon: 'calendar-check',
    category: '訓練',
    rarity: 'rare',
  },
  {
    slug: 'hundred-km',
    name: '百公里累積',
    description: '累積完成 100 公里訓練里程。',
    unlockHint: '網站訓練里程累積達 100 公里後取得。',
    icon: 'route',
    category: '里程',
    rarity: 'rare',
  },
  {
    slug: 'first-finish',
    name: '初次完賽',
    description: '完成第一場正式目標賽事。',
    unlockHint: '提交完賽資料並由管理員確認後取得。',
    icon: 'medal',
    category: '賽事',
    rarity: 'rare',
  },
  {
    slug: 'pb-breakthrough',
    name: '突破 PB',
    description: '刷新自己的最佳成績。',
    unlockHint: '提交新的個人最佳成績並由管理員確認後取得。',
    icon: 'trophy',
    category: '賽事',
    rarity: 'epic',
  },
  {
    slug: 'team-spirit',
    name: '好運同行',
    description: '積極參與團練，陪伴夥伴一起進步。',
    unlockHint: '由教練或管理員依團隊參與狀況授予。',
    icon: 'heart-handshake',
    category: '社群',
    rarity: 'epic',
  },
  {
    slug: 'full-cycle',
    name: '十二週全勤',
    description: '完整參與一個十二週訓練週期。',
    unlockHint: '完成一期課程全勤並經點名紀錄確認後取得。',
    icon: 'crown',
    category: '課程',
    rarity: 'legendary',
  },
]
