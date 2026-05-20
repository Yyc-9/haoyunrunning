import { ClipboardCheck, LockKeyhole, SendToBack } from 'lucide-react'

export default function TestimonialComments() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-5xl">
        <div className="rounded-3xl border border-black/10 bg-apple-gray-50 p-6 md:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">Review workflow</p>
          <h2 className="text-3xl font-black text-apple-gray-900">回顾内容改为定向邀请与后台审核。</h2>
          <p className="mt-4 max-w-3xl leading-8 text-apple-gray-600">
            网站不再开放任何人随时填写评价。每一期课程或训练营结营后，我们会定向邀请结营学员提交回顾，内容先进入后台待审核列表，再由管理员筛选后发布到前台。
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { icon: LockKeyhole, title: '定向邀请', description: '只对当期结营学员开放提交入口，避免公开灌水和无关评价。' },
              { icon: ClipboardCheck, title: '后台筛选', description: '提交内容进入待审核状态，由管理员确认是否适合公开展示。' },
              { icon: SendToBack, title: '手动发布', description: '通过审核的回顾才会出现在“上期学员回顾”前台页面。' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/10">
                <item.icon className="mb-4 h-5 w-5 text-apple-gray-700" />
                <h3 className="font-bold text-apple-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-apple-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
