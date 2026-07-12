import { allCourses, getCourseBySlug } from '@/lib/goodluck-data'
import CourseRegistrationClient from './CourseRegistrationClient'

type CourseRegistrationPageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ submitted?: string | string[] }>
}

export function generateStaticParams() {
  return allCourses.map((course) => ({ slug: course.slug }))
}

export async function generateMetadata({ params }: CourseRegistrationPageProps) {
  const { slug } = await params
  const course = getCourseBySlug(slug)
  return {
    title: course ? `${course.name}報名 - 好運跑班` : '課程報名 - 好運跑班',
    description: course ? `填寫 ${course.name} 官方報名表並查看付款狀態。` : '好運跑班課程報名。',
  }
}

export default async function CourseRegistrationPage({ params, searchParams }: CourseRegistrationPageProps) {
  const { slug } = await params
  const query = await searchParams
  return <CourseRegistrationClient slug={slug} returnedFromGoogle={query.submitted === '1'} />
}
