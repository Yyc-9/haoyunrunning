'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Instagram, Mail, MapPin, ShoppingBag, TicketCheck } from 'lucide-react'
import { useLanguage } from '@/app/language-context'
import { useSiteContent } from '@/app/site-content-provider'

export default function Footer() {
  const { t } = useLanguage()
  const { brand } = useSiteContent()
  const currentYear = new Date().getFullYear()

  const footerLinks = [
    {
      title: '參加好運',
      links: [
        { name: '訓練課程', href: '/courses' },
        { name: '課程報名', href: '/courses' },
        { name: '團練報名', href: '/group-signup' },
      ],
    },
    {
      title: '探索',
      links: [
        { name: '團隊陣容', href: '/team' },
        { name: '榮耀徽章', href: '/achievements' },
        { name: '好運商店', href: '/shop' },
        { name: '學員見證', href: '/testimonials' },
        { name: '關於我們', href: '/about' },
      ],
    },
    {
      title: '聯絡',
      links: [
        { name: 'Instagram', href: brand.instagramUrl },
        { name: '課程諮詢', href: brand.instagramUrl },
        { name: '商品諮詢', href: brand.instagramUrl },
      ],
    },
  ]

  const contactInfo = [
    { icon: Instagram, text: brand.instagramHandle },
    { icon: Mail, text: brand.contactText },
    { icon: MapPin, text: brand.address },
  ]

  const socialMedia = [
    { icon: Instagram, href: brand.instagramUrl, isPrimary: true },
  ]

  return (
    <footer className="mt-auto border-t border-white/10 bg-black text-white">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="mb-6 flex items-center space-x-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/15 bg-white shadow-sm">
                <Image
                  src={brand.logoUrl}
                  alt={`${brand.brandName} Logo`}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white">
                  {brand.brandName}
                </h2>
                <p className="text-sm text-white/55">
                  {brand.tagline}
                </p>
              </div>
            </div>

            <p className="mb-6 max-w-md text-white/65">
              {brand.footerDescription}
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
                    <Icon className="h-4 w-4 text-white/40" />
                    <span className="text-sm text-white/60">
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
              <h3 className="mb-4 font-semibold text-white">
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
                        className="text-sm text-white/60 transition-colors duration-200 hover:text-white"
                      >
                        {link.name}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-white/60 transition-colors duration-200 hover:text-white"
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
        <div className="my-8 border-t border-white/15" />

        {/* Bottom Section */}
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="mb-4 text-sm text-white/45 md:mb-0">
            © {currentYear} {brand.brandName}. {t.footer.copyright}
          </p>

          {/* Social Media */}
          <div className="flex items-center space-x-4">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-white hover:text-black"
            >
              <TicketCheck className="h-4 w-4" />
              查看課程
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-white hover:text-black"
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
