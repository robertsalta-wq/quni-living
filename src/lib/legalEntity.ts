import { formatAustralianAbn } from './platformIdentity'

/** ASIC-registered entity (not GTM operating area). Build-time fallback when Supabase is unavailable. */
export const LEGAL_ENTITY_NAME = 'Quinnvestments Pty Ltd'

/** Set when available from ASIC extract; omitted from public line when empty. */
export const LEGAL_ENTITY_ABN = ''

export const REGISTERED_OFFICE = {
  line1: 'Level 2 Suite 4, 90 Phillip Street',
  line2: '' as string,
  suburb: 'Parramatta',
  state: 'NSW',
  postcode: '2150',
} as const

/** Row shape of `public.public_legal_entity` view (not in generated Database types). */
export type PublicLegalEntityRow = {
  legal_name: string
  trading_name: string
  abn: string
  registered_address_line1: string
  registered_address_line2: string
  registered_suburb: string
  registered_state: string
  registered_postcode: string
}

export type LegalEntity = {
  legalName: string
  tradingName: string
  abn: string
  registeredAddressLine1: string
  registeredAddressLine2: string
  registeredSuburb: string
  registeredState: string
  registeredPostcode: string
}

/** Initial / offline values for LegalFooter (matches pre-wire hardcoded copy). */
export function getFallbackLegalEntity(): LegalEntity {
  return {
    legalName: LEGAL_ENTITY_NAME,
    tradingName: '',
    abn: LEGAL_ENTITY_ABN,
    registeredAddressLine1: REGISTERED_OFFICE.line1,
    registeredAddressLine2: REGISTERED_OFFICE.line2,
    registeredSuburb: REGISTERED_OFFICE.suburb,
    registeredState: REGISTERED_OFFICE.state,
    registeredPostcode: REGISTERED_OFFICE.postcode,
  }
}

function pickField(dbValue: string | null | undefined, fallback: string): string {
  const t = (dbValue ?? '').trim()
  return t || fallback
}

/** Merge a public_legal_entity row with fallbacks (empty DB fields keep fallback). */
export function mergeLegalEntityFromRow(
  row: {
    legal_name?: string | null
    trading_name?: string | null
    abn?: string | null
    registered_address_line1?: string | null
    registered_address_line2?: string | null
    registered_suburb?: string | null
    registered_state?: string | null
    registered_postcode?: string | null
  } | null | undefined,
  fallback: LegalEntity = getFallbackLegalEntity(),
): LegalEntity {
  if (!row) return fallback
  return {
    legalName: pickField(row.legal_name, fallback.legalName),
    tradingName: pickField(row.trading_name, fallback.tradingName),
    abn: pickField(row.abn, fallback.abn),
    registeredAddressLine1: pickField(row.registered_address_line1, fallback.registeredAddressLine1),
    registeredAddressLine2: pickField(row.registered_address_line2, fallback.registeredAddressLine2),
    registeredSuburb: pickField(row.registered_suburb, fallback.registeredSuburb),
    registeredState: pickField(row.registered_state, fallback.registeredState),
    registeredPostcode: pickField(row.registered_postcode, fallback.registeredPostcode),
  }
}

export function legalEntitiesEqual(a: LegalEntity, b: LegalEntity): boolean {
  return (
    a.legalName === b.legalName &&
    a.tradingName === b.tradingName &&
    a.abn === b.abn &&
    a.registeredAddressLine1 === b.registeredAddressLine1 &&
    a.registeredAddressLine2 === b.registeredAddressLine2 &&
    a.registeredSuburb === b.registeredSuburb &&
    a.registeredState === b.registeredState &&
    a.registeredPostcode === b.registeredPostcode
  )
}

export function formatRegisteredOfficeFromEntity(entity: LegalEntity): string {
  const street = [entity.registeredAddressLine1, entity.registeredAddressLine2].filter(Boolean).join(', ')
  const locality = [entity.registeredSuburb, entity.registeredState, entity.registeredPostcode]
    .filter(Boolean)
    .join(' ')
  return [street, locality].filter(Boolean).join(', ')
}

/** Single-line legal footer: entity · optional ABN · registered office. */
export function buildLegalFooterText(entity: LegalEntity = getFallbackLegalEntity()): string {
  const legalName = entity.legalName.trim() || LEGAL_ENTITY_NAME
  const abn = entity.abn.trim()
  const abnSegment = abn ? ` · ABN ${formatAustralianAbn(abn)}` : ''
  return `${legalName}${abnSegment} · Registered office: ${formatRegisteredOfficeFromEntity(entity)}`
}
