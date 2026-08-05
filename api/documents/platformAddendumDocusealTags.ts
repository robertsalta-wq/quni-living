/** DocuSeal field dimensions for Quni platform addendum signature blocks (react-pdf px). */
export const PLATFORM_ADDENDUM_DOCUSEAL_SIGNATURE_SIZE = { width: 240, height: 72 } as const
export const PLATFORM_ADDENDUM_DOCUSEAL_DATE_SIZE = { width: 140, height: 28 } as const

export const DOCUSEAL_AU_DATE_FORMAT = 'DD/MM/YYYY' as const

export function platformAddendumDocusealTag(
  fieldName: string,
  role: 'First Party' | 'Second Party' | 'Co-tenant',
  type: 'signature' | 'date',
): string {
  const size =
    type === 'signature' ? PLATFORM_ADDENDUM_DOCUSEAL_SIGNATURE_SIZE : PLATFORM_ADDENDUM_DOCUSEAL_DATE_SIZE
  const parts = [
    fieldName,
    `role=${role}`,
    `type=${type}`,
    ...(type === 'date' ? [`format=${DOCUSEAL_AU_DATE_FORMAT}`] : []),
    `width=${size.width}`,
    `height=${size.height}`,
  ]
  return `{{${parts.join(';')}}}`
}
