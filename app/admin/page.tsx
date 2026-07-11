import AdminDashboardClient from './AdminDashboardClient'

export const metadata = {
  title: '管理員後台 - 好運跑班',
  description: '集中管理好運跑班網站內容、課程、商品、訂單、學員與收款資料。',
}

export default function AdminPage() {
  return <AdminDashboardClient />
}
