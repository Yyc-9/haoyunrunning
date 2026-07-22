import type { MetadataRoute } from 'next'
import { getManagedCourses } from '@/lib/managed-courses-server'

const origin = 'https://nurturerunningteam.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticRoutes = [
    { path: '/', priority: 1, changeFrequency: 'weekly' as const },
    { path: '/courses', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/team', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/achievements', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/about', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/testimonials', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/shop', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/anniversary', priority: 0.5, changeFrequency: 'monthly' as const },
  ]
  const courses = await getManagedCourses()

  return [
    ...staticRoutes.map((route) => ({
      url: `${origin}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...courses.map((course) => ({
      url: `${origin}/courses/${course.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
