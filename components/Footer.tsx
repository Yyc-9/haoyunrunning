'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Instagram, Mail, MapPin, ShoppingBag, TicketCheck } from 'lucide-react'
import { useLanguage } from '@/app/language-context'

export default function Footer() {
  const { t } = useLanguage()
  const currentYear = new Date().getFullYear()

  const footerLinks = [
    {
      title: '參加好運',
      links: [
        { name: '訓練課程', href: '/courses' },
        { name: '團練報名', href: '/group-signup' },
        { name: '活動登記', href: '/anniversary' },
      ],
    },
    {
      title: '探索',
      links: [
        { name: '好運商店', href: '/shop' },
        { name: '學員見證', href: '/testimonials' },
        { name: '關於我們', href: '/about' },
      ],
    },
    {
      title: '聯絡',
      links: [
        { name: 'Instagram', href: 'https://www.instagram.com/nurture.running.team/' },
        { name: '課程諮詢', href: 'https://www.instagram.com/nurture.running.team/' },
        { name: '商品諮詢', href: 'https://www.instagram.com/nurture.running.team/' },
      ],
    },
  ]

  const contactInfo = [
    { icon: Instagram, text: '@nurture.running.team' },
    { icon: Mail, text: t.footer.contactInstagram },
    { icon: MapPin, text: t.footer.address },
  ]

  const socialMedia = [
    { icon: Instagram, href: 'https://www.instagram.com/nurture.running.team/', isPrimary: true },
  ]

  return (
    <footer className="mt-auto border-t border-gray-200 bg-gray-100">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="mb-6 flex items-center space-x-3">
              <div className="relative h-14 w-14 overflow-hidden rounded-full border border-black/10 bg-white shadow-sm">
                <Image
                  src="/goodluck-logo-nav.jpg"
                  alt={`${t.common.brand} Logo`}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t.common.brand}
                </h2>
                <p className="text-sm text-gray-600">
                  {t.common.tagline}
                </p>
              </div>
            </div>

            <p className="mb-6 max-w-md text-gray-600">
              {t.footer.description}
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              {contactInfo.map((item, index) => {
                const Icon = item.icon

                return (
                  <div
                    key={index}
                    className="flex items-center space-x-3"
                  >
                    <Icon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {item.text}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Links Columns */}
          {footerLinks.map((column) => (
            <div key={column.title}>
              <h3 className="mb-4 font-semibold text-gray-800">
                {column.title}
              </h3>

              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.name}>
                    {link.href.startsWith('http') ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-gray-600 transition-colors duration-200 hover:text-blue-500"
                      >
                        {link.name}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-gray-600 transition-colors duration-200 hover:text-blue-500"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-gray-300" />

        {/* Bottom Section */}
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="mb-4 text-sm text-gray-500 md:mb-0">
            © {currentYear} {t.common.brand}. {t.footer.copyright}
          </p>

          {/* Social Media */}
          <div className="flex items-center space-x-4">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-50 hover:text-black hover:shadow-md"
            >
              <TicketCheck className="h-4 w-4" />
              查看課程
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-50 hover:text-black hover:shadow-md"
            >
              <ShoppingBag className="h-4 w-4" />
              前往商店
            </Link>
            {socialMedia.map((social, index) => {
              const Icon = social.icon

              return (
                <a
                  key={index}
                  href={social.href}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 ${social.isPrimary
                      ? 'bg-gradient-to-br from-orange-400 to-pink-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  <Icon className="h-5 w-5" />
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </footer>
  )
}
