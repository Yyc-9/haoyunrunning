type Order = { orderKind: string; seasonId: string; status: string; email: string; id: string }

export function summarizeSeasonOrders<T extends Order>(orders: T[], seasonId: string) {
  const records = orders.filter((order) => order.orderKind === 'course' && order.seasonId === seasonId)
  return {
    records,
    pending: records.filter((order) => order.status === 'pending_review'),
    approved: records.filter((order) => order.status === 'approved'),
    pendingTransfer: records.filter((order) => order.status === 'pending_transfer'),
    needsReview: records.filter((order) => order.status === 'rejected'),
    studentCount: new Set(records.filter((order) => order.status !== 'rejected').map((order) => order.email.trim().toLowerCase() || order.id)).size,
  }
}
