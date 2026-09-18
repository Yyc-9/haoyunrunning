'use client'

export default function StudentCoachBindingPanel({ currentCoachName }: {
  currentCoachName?: string
  onBound: (coachName: string) => void
}) {
  return <section className="apple-card p-5">
    <h2 className="text-xl font-black">我的任課教練</h2>
    <p className="mt-2 font-bold">{currentCoachName || '尚無已入帳班級的教練關聯'}</p>
    <p className="mt-2 text-sm leading-6 text-apple-gray-600">確認課程入帳後，依季度與報名班級自動關聯教練。跨班補課只開放該堂點名，不會更換原班教練。</p>
  </section>
}
