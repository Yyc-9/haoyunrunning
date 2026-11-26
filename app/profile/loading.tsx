export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-apple-gray-50 pt-20 sm:pt-24">
      <section className="container mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-12">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-8">
          <h1 className="text-2xl font-black text-black sm:text-4xl">我的帳戶</h1>
          <p role="status" className="mt-2 text-sm font-semibold text-apple-gray-600">正在讀取帳戶...</p>
          <div aria-hidden="true" className="mt-6 grid gap-3 motion-safe:animate-pulse sm:grid-cols-3">
            <span className="h-12 rounded-md bg-apple-gray-100" />
            <span className="h-12 rounded-md bg-apple-gray-100" />
            <span className="h-12 rounded-md bg-apple-gray-100" />
          </div>
        </div>
      </section>
    </div>
  )
}
