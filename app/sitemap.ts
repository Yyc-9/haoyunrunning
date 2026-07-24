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
    { path: '/privacy', priority: 0.4, changeFrequency: 'monthly' as const },
    { path: '/terms', priority: 0.4, changeFrequency: 'monthly' as const },
    { path: '/refund-policy', priority: 0.4, changeFrequency: 'monthly' as const },
    { path: '/invoice', priority: 0.4, changeFrequency: 'monthly' as const },
  ]
  let courses: Awaited<ReturnType<typeof getManagedCourses>> = []

  try {
    courses = await getManagedCourses()
  } catch (error) {
    // A transient content-service error must not block the entire production
    // deployment. Static routes remain discoverable and course routes return
    // on the next successful sitemap generation.
    console.error('Load sitemap courses error:', error)
  }

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
