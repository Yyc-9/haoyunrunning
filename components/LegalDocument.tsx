import Link from 'next/link'
import type { LegalSection } from '@/lib/legal-content'

type LegalDocumentProps = {
  eyebrow: string
  title: string
  description: string
  version: string
  sections: LegalSection[]
}

export default function LegalDocument({ eyebrow, title, description, version, sections }: LegalDocumentProps) {
  return (
    <main className="min-h-screen bg-apple-gray-50 px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
        <header className="border-b border-black/10 bg-black px-6 py-10 text-white sm:px-10 sm:py-14">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">{description}</p>
          <p className="mt-6 text-xs font-bold text-white/45">版本：{version}</p>
        </header>

        <div className="space-y-10 px-6 py-8 sm:px-10 sm:py-12">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-black text-apple-gray-950 sm:text-2xl">{section.title}</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-apple-gray-700 sm:text-base sm:leading-8">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.items?.length ? (
                  <ul className="list-disc space-y-2 pl-5">
                    {section.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <footer className="flex flex-wrap gap-3 border-t border-black/10 bg-apple-gray-50 px-6 py-6 sm:px-10">
          <Link href="/privacy" className="text-sm font-bold underline underline-offset-4">隱私權政策</Link>
          <Link href="/terms" className="text-sm font-bold underline underline-offset-4">課程服務條款</Link>
          <Link href="/refund-policy" className="text-sm font-bold underline underline-offset-4">取消與退費政策</Link>
          <Link href="/invoice" className="text-sm font-bold underline underline-offset-4">電子發票說明</Link>
        </footer>
      </article>
    </main>
  )
}
