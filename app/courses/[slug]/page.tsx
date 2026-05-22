import CourseDetailClient from './CourseDetailClient'
import { allCourses, getCourseBySlug } from '@/lib/goodluck-data'

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
  const course = getCourseBySlug(slug)

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
  const course = getCourseBySlug(slug)

  return <CourseDetailClient course={course ?? null} />
}
