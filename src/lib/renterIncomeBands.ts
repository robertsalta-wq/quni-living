/** Weekly gross income bands (AUD) — nullable text stored in `income_band`. */
export const WEEKLY_INCOME_BAND_OPTIONS = [
  { value: 'under_400', label: 'Under $400 /wk' },
  { value: '400_600', label: '$400–$600 /wk' },
  { value: '600_800', label: '$600–$800 /wk' },
  { value: '800_1000', label: '$800–$1,000 /wk' },
  { value: '1000_plus', label: '$1,000+ /wk' },
  { value: 'no_income', label: 'No regular income' },
] as const

export type WeeklyIncomeBand = (typeof WEEKLY_INCOME_BAND_OPTIONS)[number]['value']

export const GUARANTOR_INCOME_BAND_OPTIONS = WEEKLY_INCOME_BAND_OPTIONS

/** Low-income bands that commonly trigger guarantor collection. */
export const INCOME_BANDS_SUGGEST_GUARANTOR = new Set<WeeklyIncomeBand>([
  'under_400',
  '400_600',
  'no_income',
])

export function incomeBandSuggestsGuarantor(band: string | null | undefined): boolean {
  if (!band) return false
  return INCOME_BANDS_SUGGEST_GUARANTOR.has(band as WeeklyIncomeBand)
}
