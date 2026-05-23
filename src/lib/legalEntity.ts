import { formatAustralianAbn } from './platformIdentity'

/** ASIC-registered entity (not GTM operating area). */
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

export function formatRegisteredOffice(): string {
  const { line1, line2, suburb, state, postcode } = REGISTERED_OFFICE
  const street = [line1, line2].filter(Boolean).join(', ')
  return `${street}, ${suburb} ${state} ${postcode}`
}

/** Single-line legal footer: entity · optional ABN · registered office. */
export function buildLegalFooterText(): string {
  const abn = LEGAL_ENTITY_ABN.trim()
  const abnSegment = abn ? ` · ABN ${formatAustralianAbn(abn)}` : ''
  return `${LEGAL_ENTITY_NAME}${abnSegment} · Registered office: ${formatRegisteredOffice()}`
}
