/** Read every page explicitly; PostgREST otherwise silently caps a result at 1,000 rows. */
export async function readAllRows<T>(fetchPage: (from: number, to: number) => PromiseLike<{
  data: T[] | null; error: { message: string } | null
}>, pageSize = 500): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error('Invalid page size')
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1)
    if (error) throw Object.assign(new Error(error.message), error)
    if (!data) throw new Error('讀取資料失敗，未取得完整記錄。')
    rows.push(...data)
    if (data.length < pageSize) return rows
  }
}

/** Preserve query-result shape for dashboards that distinguish optional schemas. */
export async function readAllRowsResult<T>(fetchPage: (from: number, to: number) => PromiseLike<{
  data: T[] | null; error: { message: string; code?: string } | null
}>) {
  try { return { data: await readAllRows(fetchPage), error: null } }
  catch (cause) { return { data: null, error: cause as { message: string; code?: string } } }
}
