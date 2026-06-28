/**
 * Legal entity display helpers for PDFs and contracts.
 * Values themselves come from `platform_config`; these helpers format and compose lines.
 */

export const DEFAULT_PLATFORM_LEGAL_NAME = 'Quni Living Pty Ltd'

/** Strip non-digits and format Australian ABN as XX XXX XXX XXX when 11 digits; otherwise return trimmed input. */
export function formatAustralianAbn(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 11) return raw.trim()
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`
}

export type PlatformIdentificationFields = {
  abn?: string | null
  acn?: string | null
  directorName?: string | null
}

/**
 * Single secondary line under the opening “Platform” paragraph: ABN · ACN · Director.
 * Omits empty fields; returns null when nothing to show.
 */
export function buildPlatformIdentificationLine(fields: PlatformIdentificationFields): string | null {
  const parts: string[] = []
  const abn = typeof fields.abn === 'string' ? fields.abn.trim() : ''
  if (abn) parts.push(`ABN ${formatAustralianAbn(abn)}`)
  const acn = typeof fields.acn === 'string' ? fields.acn.trim() : ''
  if (acn) parts.push(`ACN ${acn}`)
  const director = typeof fields.directorName === 'string' ? fields.directorName.trim() : ''
  if (director) parts.push(`Director: ${director}`)
  return parts.length ? parts.join(' · ') : null
}

export function resolvePlatformLegalEntityName(legalName?: string | null): string {
  const t = typeof legalName === 'string' ? legalName.trim() : ''
  return t || DEFAULT_PLATFORM_LEGAL_NAME
}

/** Thrown when `business.legal_name` is missing at licence PDF generation. */
export const PLATFORM_LEGAL_ENTITY_NOT_CONFIGURED =
  'platform legal entity not configured in Business settings'

export type LicencePlatformEntityFields = {
  legalName?: string | null
  acn?: string | null
  tradingName?: string | null
}

/**
 * Inline platform entity for Licence to Occupy clause 11, e.g.
 * "Quinnvestments Pty Ltd (ACN 675 990 968) trading as Quni Living".
 * ACN is rendered as stored in platform_config (no normalisation).
 */
export function buildLicencePlatformEntityDisplay(fields: LicencePlatformEntityFields): string {
  const legal = typeof fields.legalName === 'string' ? fields.legalName.trim() : ''
  if (!legal) throw new Error(PLATFORM_LEGAL_ENTITY_NOT_CONFIGURED)

  const acn = typeof fields.acn === 'string' ? fields.acn.trim() : ''
  const trading = typeof fields.tradingName === 'string' ? fields.tradingName.trim() : ''

  let display = legal
  if (acn) display = `${legal} (ACN ${acn})`
  if (trading) display = `${display} trading as ${trading}`
  return display
}
