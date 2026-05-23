import { Building2, CreditCard, Instagram } from 'lucide-react'

type PaymentMethod = {
  title: string
  status: string
  description: string
}

type PaymentOptionsProps = {
  title: string
  methods: readonly PaymentMethod[]
}

export default function PaymentOptions({ title, methods }: PaymentOptionsProps) {
  const icons = [CreditCard, Building2, Instagram]

  return (
    <section className="apple-card p-6 md:p-8">
      <h2 className="text-2xl font-black text-apple-gray-900">{title}</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {methods.map((method, index) => {
          const Icon = icons[index] ?? CreditCard

          return (
            <article key={method.title} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-apple-gray-100 text-apple-gray-900">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-black text-apple-gray-900">{method.title}</h3>
              <p className="mt-2 inline-flex rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-bold text-apple-gray-600">
                {method.status}
              </p>
              <p className="mt-3 text-sm leading-6 text-apple-gray-600">{method.description}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
