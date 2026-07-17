import CourseDetailClient from './CourseDetailClient'
import { allCourses } from '@/lib/goodluck-data'
import { getManagedCourses } from '@/lib/managed-courses-server'

type CourseDetailPageProps = {
  params: Promise<{
    slug: string
  }>
}

export function generateStaticParams() {
  return allCourses.map((course) => ({
    slug: course.slug,
  }))
}

export async function generateMetadata({ params }: CourseDetailPageProps) {
  const { slug } = await params
  const course = (await getManagedCourses({ includeInactive: true })).find((item) => item.slug === slug)

  if (!course) {
    return {
      title: '課程不存在 - 好運跑班',
      description: '找不到指定的好運跑班課程。',
    }
  }

  return {
    title: `${course.title} - 好運跑班`,
    description: course.slogan,
  }
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { slug } = await params
  const course = (await getManagedCourses()).find((item) => item.slug === slug)

  return <CourseDetailClient course={course ?? null} />
}
