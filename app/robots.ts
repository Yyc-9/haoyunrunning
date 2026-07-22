import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/checkout/',
        '/coach/',
        '/courses/*/register',
        '/payment/',
        '/profile/',
        '/student/',
      ],
    },
    sitemap: 'https://nurturerunningteam.com/sitemap.xml',
    host: 'https://nurturerunningteam.com',
  }
}
