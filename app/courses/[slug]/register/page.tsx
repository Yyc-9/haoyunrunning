import { allCourses, getCourseBySlug } from '@/lib/goodluck-data'
import CourseRegistrationClient from './CourseRegistrationClient'

type CourseRegistrationPageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return allCourses.map((course) => ({ slug: course.slug }))
}

export async function generateMetadata({ params }: CourseRegistrationPageProps) {
  const { slug } = await params
  const course = getCourseBySlug(slug)
  return {
    title: course ? `${course.name}報名 - 好運跑班` : '課程報名 - 好運跑班',
    description: course ? `在好運網站填寫 ${course.name} 報名資料並查看付款狀態。` : '好運跑班課程報名。',
  }
}

export default async function CourseRegistrationPage({ params }: CourseRegistrationPageProps) {
  const { slug } = await params
  return <CourseRegistrationClient slug={slug} />
}
