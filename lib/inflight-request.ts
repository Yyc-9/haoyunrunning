/** Share concurrent reads only. A settled response is never retained as a cache. */
export function createInflightRequest<T>(fetcher: () => Promise<T>) {
  let pending: Promise<T> | null = null
  return {
    load(force = false): Promise<T> {
      if (pending && !force) return pending
      const request = Promise.resolve().then(fetcher)
      pending = request
      const clear = () => { if (pending === request) pending = null }
      void request.then(clear, clear)
      return request
    },
    invalidate() { pending = null },
  }
}
