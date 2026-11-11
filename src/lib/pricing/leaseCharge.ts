/**
 * One price for a Quni Listing lease.
 * $5 ex GST per rented month, $15 ex GST per quarter, GST 10%.
 * The charge, the tax invoice, the pricing page, and admin all read this module.
 */

export const LEASE_MONTH_EX_GST_CENTS = 500
export const LEASE_QUARTER_EX_GST_CENTS = 1500
export const GST_RATE = 0.1

export const TAX_INVOICE_LEGAL_NAME = 'Quinnvestments Pty Ltd'
export const TAX_INVOICE_TRADING_AS = 'Quni Living'
export const TAX_INVOICE_ABN = '65 675 990 968'

/** Menu strings already stored on bookings and listings. Weeks are the existing end-date map. */
export const LEASE_LENGTH_MONTHS = {
  '3 months': 3,
  '6 months': 6,
  '12 months': 12,
  '2 years': 24,
} as const

export type FixedLeaseLength = keyof typeof LEASE_LENGTH_MONTHS

export type LeaseChargeKind = 'fixed' | 'flexible'

export type LeaseChargeQuote = {
  kind: LeaseChargeKind
  /** Months this charge covers. A quarter is 3. */
  months: number
  exGstCents: number
  gstCents: number
  inclGstCents: number
  cadence: 'once' | 'every_3_months'
}

export function gstOnExCents(exGstCents: number): number {
  return Math.round(exGstCents * GST_RATE)
}

export function quoteForMonths(months: number, kind: LeaseChargeKind): LeaseChargeQuote {
  const safeMonths = Math.max(0, Math.round(months))
  const exGstCents = safeMonths * LEASE_MONTH_EX_GST_CENTS
  const gstCents = gstOnExCents(exGstCents)
  return {
    kind,
    months: safeMonths,
    exGstCents,
    gstCents,
    inclGstCents: exGstCents + gstCents,
    cadence: kind === 'flexible' ? 'every_3_months' : 'once',
  }
}

/** Null when the stored lease length is not one of the menu values. */
export function quoteForLeaseLength(leaseLength: string | null | undefined): LeaseChargeQuote | null {
  const raw = typeof leaseLength === 'string' ? leaseLength.trim() : ''
  if (raw === 'Flexible') return quoteForMonths(3, 'flexible')
  const months = LEASE_LENGTH_MONTHS[raw as FixedLeaseLength]
  if (!months) return null
  return quoteForMonths(months, 'fixed')
}

export function flexibleQuarterQuote(): LeaseChargeQuote {
  return quoteForMonths(3, 'flexible')
}

export type AmountsAfterCredit = {
  billedMonths: number
  creditMonths: number
  exGstCents: number
  gstCents: number
  chargedCents: number
}

/** Unused months reduce the months billed. Credit is months, never cash. */
export function amountsAfterCredit(billedMonths: number, creditMonthsAvailable: number): AmountsAfterCredit {
  const billed = Math.max(0, Math.round(billedMonths))
  const available = Math.max(0, Math.round(creditMonthsAvailable))
  const creditMonths = Math.min(billed, available)
  const quote = quoteForMonths(billed - creditMonths, 'fixed')
  return {
    billedMonths: billed,
    creditMonths,
    exGstCents: quote.exGstCents,
    gstCents: quote.gstCents,
    chargedCents: quote.inclGstCents,
  }
}

/** Whole calendar months from start to end. A partial month counts as used (not credited). */
export function wholeMonthsElapsed(startIso: string, endIso: string): number {
  const start = startIso.slice(0, 10)
  const end = endIso.slice(0, 10)
  const [ys, ms, ds] = start.split('-').map(Number)
  const [ye, me, de] = end.split('-').map(Number)
  if (!ys || !ms || !ds || !ye || !me || !de) return 0
  if (end <= start) return 0
  let months = (ye - ys) * 12 + (me - ms)
  if (de < ds) months -= 1
  months = Math.max(0, months)
  // A partial month counts as used. An exact anniversary does not add one.
  if (de !== ds) months += 1
  return months
}

export function unusedWholeMonths(billedMonths: number, startIso: string, earlyEndIso: string): number {
  const used = wholeMonthsElapsed(startIso, earlyEndIso)
  return Math.max(0, Math.round(billedMonths) - used)
}

export function formatAudFromCents(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const dollars = Math.floor(abs / 100)
  const rem = abs % 100
  return `${sign}$${dollars.toLocaleString('en-AU')}.${String(rem).padStart(2, '0')}`
}

/** Inclusive price for the page. Whole dollars drop the cents. */
export function formatLeaseTotal(cents: number): string {
  const raw = formatAudFromCents(cents)
  return raw.endsWith('.00') ? raw.slice(0, -3) : raw
}

export function addCalendarMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return isoDate.slice(0, 10)
  const dt = new Date(Date.UTC(y, m - 1 + months, d))
  return dt.toISOString().slice(0, 10)
}

export const PRICING_V2_LEASE_OPTIONS = [
  { id: '3 months', label: '3 months', leaseLength: '3 months' },
  { id: '6 months', label: '6 months', leaseLength: '6 months' },
  { id: '12 months', label: '12 months', leaseLength: '12 months' },
  { id: '2 years', label: '2 years', leaseLength: '2 years' },
  { id: 'Flexible', label: 'Flexible', leaseLength: 'Flexible' },
] as const

export const PRICING_V2_DEFAULT_LEASE = '6 months'
