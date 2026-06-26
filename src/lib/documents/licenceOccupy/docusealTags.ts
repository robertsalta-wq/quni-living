/** DocuSeal field dimensions (px) aligned to docusealSignatureFieldBox / docusealDateFieldBox. */
export const LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE = { width: 220, height: 72 } as const
export const LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE = { width: 120, height: 28 } as const

/** Matches occupancyMatchPdf docuseal field box background — hides 1pt anchor text on draft PDFs. */
export const LICENCE_OCCUPY_DOCUSEAL_TAG_HIDDEN = {
  fontSize: 1,
  color: '#FAF6EE',
} as const

export function licenceOccupyDocusealTag(
  fieldName: string,
  role: 'First Party' | 'Second Party' | 'Co-tenant',
  type: 'signature' | 'date',
  size?: { width: number; height: number },
): string {
  const base = `${fieldName};role=${role};type=${type}`
  if (!size) return `{{${base}}}`
  return `{{${base};width=${size.width};height=${size.height}}}`
}
