import { allCourses } from '@/lib/goodluck-data'
import { getManagedCourses } from '@/lib/managed-courses-server'
import CourseRegistrationClient from './CourseRegistrationClient'
import { formatCourseWeekday } from '@/lib/course-weekday'

type CourseRegistrationPageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return allCourses.map((course) => ({ slug: course.slug }))
}

export async function generateMetadata({ params }: CourseRegistrationPageProps) {
  const { slug } = await params
  const course = (await getManagedCourses({ includeInactive: true })).find((item) => item.slug === slug)
  const courseName = course ? formatCourseWeekday(course.name) : ''
  return {
    title: course ? `${courseName}報名 - 好運跑班` : '課程報名 - 好運跑班',
    description: course ? `在好運網站填寫 ${courseName} 報名資料並查看匯款核對狀態。` : '好運跑班課程報名。',
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function CourseRegistrationPage({ params }: CourseRegistrationPageProps) {
  const { slug } = await params
  return <CourseRegistrationClient slug={slug} />
}
