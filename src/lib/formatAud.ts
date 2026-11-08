/** Whole-dollar AUD display shared by the landlord desk ledger and /by-the-room. */
export function formatAud(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount)
}
