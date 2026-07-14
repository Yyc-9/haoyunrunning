import CoachPublicProfileClient from './CoachPublicProfileClient'

export const metadata = {
  title: '教練頭像設定 - 好運跑班',
  description: '管理教練姓名、照片、專長與公開經歷。',
}

export default function CoachProfilePage() {
  return <CoachPublicProfileClient />
}
