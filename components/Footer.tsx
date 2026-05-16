import { Mail, MapPin, User } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = [
    {
      title: '训练课程',
      links: [
        { name: '马拉松训练', href: '#' },
        { name: '半程马拉松', href: '#' },
        { name: '10公里训练', href: '#' },
        { name: '新手入门', href: '#' },
      ],
    },
    {
      title: '资源中心',
      links: [
        { name: '训练计划', href: '#' },
        { name: '营养指南', href: '#' },
        { name: '装备推荐', href: '#' },
        { name: '常见问题', href: '#' },
      ],
    },
    {
      title: '关于我们',
      links: [
        { name: '教练团队', href: '#' },
        { name: '学员故事', href: '#' },
        { name: '加入我们', href: '#' },
        { name: '联系我们', href: '#' },
      ],
    },
  ]

  const contactInfo = [
    { icon: User, text: '+86 138 8888 8888' },
    { icon: Mail, text: 'contact@goodluckrunning.com' },
    { icon: MapPin, text: '北京市朝阳区跑步大道123号' },
  ]

  const socialMedia = [
    { icon: User, href: '#', isPrimary: true },
    { icon: Mail, href: '#' },
    { icon: MapPin, href: '#' },
  ]

  return (
    <footer className="mt-auto border-t border-gray-200 bg-gray-100">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="mb-6 flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-orange-400" />

              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  好運跑班
                </h2>
                <p className="text-sm text-gray-600">
                  科学训练，跑出好运
                </p>
              </div>
            </div>

            <p className="mb-6 max-w-md text-gray-600">
              专业的跑步训练平台，为跑者提供科学、系统、个性化的训练指导，
              帮助每一位跑者安全、高效地提升跑步能力，实现个人目标。
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
                    <a
                      href={link.href}
                      className="text-sm text-gray-600 transition-colors duration-200 hover:text-blue-500"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-gray-300" />

        {/* Bottom Section */}
        <div className="flex flex-col items-center justify-between md:flex-row">
          <p className="mb-4 text-sm text-gray-500 md:mb-0">
            © {currentYear} 好運跑班. 保留所有权利.
          </p>

          {/* Social Media */}
          <div className="flex items-center space-x-4">
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