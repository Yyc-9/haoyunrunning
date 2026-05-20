import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarDays, MapPin, Target, UserRoundCheck } from 'lucide-react'
import { allCourses, getCourseBySlug, getCourseCoach } from '@/lib/goodluck-data'

export function generateStaticParams() {
  return allCourses.map((course) => ({ slug: course.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const course = getCourseBySlug(slug)
  return {
    title: course ? `${course.name} - 好运跑班` : '课程详情 - 好运跑班',
    description: course ? `${course.location} ${course.period}，${course.focus}` : '好运跑班课程详情',
  }
}

function zh(text: string) {
  return text
    .replaceAll('好運', '好运')
    .replaceAll('訓練', '训练')
    .replaceAll('課程', '课程')
    .replaceAll('週', '周')
    .replaceAll('節奏', '节奏')
    .replaceAll('備賽', '备赛')
    .replaceAll('階', '阶')
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const course = getCourseBySlug(slug)
  if (!course) notFound()

  const coach = getCourseCoach(course)

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <Link href="/courses" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-apple-gray-700">
            <ArrowLeft className="h-4 w-4" />
            返回课程日程
          </Link>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <section>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">Course detail</p>
              <h1 className="text-4xl font-black leading-tight text-apple-gray-900 md:text-5xl">{zh(course.name)}</h1>
              <p className="mt-5 text-lg leading-8 text-apple-gray-600">
                {zh(course.focus)}。课程会结合团练、课后回馈和阶段性调整，让学员清楚知道每一次训练目的。
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: CalendarDays, label: '开课周期', value: course.period },
                  { icon: MapPin, label: '上课地点', value: course.location },
                  { icon: Target, label: '训练日', value: zh(course.weekday) },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                    <item.icon className="mb-4 h-5 w-5 text-apple-gray-700" />
                    <p className="text-xs text-apple-gray-500">{item.label}</p>
                    <p className="mt-1 font-bold text-apple-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 apple-card p-6 md:p-8">
                <h2 className="text-2xl font-black text-apple-gray-900">课程 / 训练内容</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {[
                    ['热身与跑姿', '动态热身、技术跑、步频与落地控制，降低受伤风险。'],
                    ['主训练', zh(course.focus)],
                    ['课后回馈', '学员提交里程、配速、心率、RPE 与主观感受，教练据此调整后续课表。'],
                    ['阶段目标', '在 12 周周期内建立稳定训练习惯，并逐步靠近个人赛事或体能目标。'],
                  ].map(([title, description]) => (
                    <div key={title} className="rounded-2xl bg-apple-gray-100 p-5">
                      <h3 className="font-bold text-apple-gray-900">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-apple-gray-600">{description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="apple-card p-6 md:p-8">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
                  <UserRoundCheck className="h-7 w-7" />
                </div>
                <p className="text-sm text-apple-gray-500">授课教练</p>
                <h2 className="mt-1 text-2xl font-black text-apple-gray-900">{coach.name}</h2>
                <p className="mt-2 font-semibold text-apple-blue">{coach.title}</p>
                <p className="mt-4 leading-7 text-apple-gray-600">{coach.bio}</p>
              </div>

              <div className="apple-card p-6">
                <h2 className="font-bold text-apple-gray-900">报名与咨询</h2>
                <p className="mt-3 text-sm leading-6 text-apple-gray-600">
                  课程名额、费用与装备需求请先通过 Instagram 联系好运跑班，我们会根据你的跑龄、目标和可训练时间推荐班级。
                </p>
                <a
                  href="https://www.instagram.com/nurture.running.team/"
                  target="_blank"
                  rel="noreferrer"
                  className="apple-button-primary mt-5 w-full px-5 py-2.5 text-sm"
                >
                  咨询这门课程
                </a>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
