/** This grants reconciliation visibility only; it must never grant an admin role. */
export function isFinanceViewer(email: string | null | undefined) {
  return email?.trim().toLowerCase() === 'yuanma0525@gmail.com'
}
