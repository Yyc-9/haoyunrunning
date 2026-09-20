import type { RegistrationField } from '@/lib/coach-registration'

export default function CoachRegistrationDetails({ fields }: { fields?: RegistrationField[] }) {
  if (!fields?.length) return null
  return (
    <details className="mt-4 rounded-lg border border-black/10 p-4">
      <summary className="cursor-pointer font-bold text-apple-gray-900">查看完整報名資料</summary>
      <dl className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
        {fields.map(({ label, value }) => (
          <div key={label} className="min-w-0 rounded-lg bg-apple-gray-50 p-3">
            <dt className="text-xs text-apple-gray-500">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-apple-gray-900">{value || '未填寫'}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
