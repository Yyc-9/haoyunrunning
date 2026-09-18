/** Grants the bank reconciliation workspace only, never an admin role. */
export function isFinanceViewer(email: string | null | undefined) {
  return email?.trim().toLowerCase() === 'yuanma0525@gmail.com'
}
