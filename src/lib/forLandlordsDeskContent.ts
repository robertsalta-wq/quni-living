/**
 * Single source for /for-landlords human drawer HTML + structured-data twins (Gate 6).
 * NSW/QLD Listing product only - no Managed, no national claims, no yield figures.
 */

export const FOR_LANDLORDS_PATH = '/for-landlords'

export const LISTING_AI_DOES = [
  'Writes the description from your details',
  'Prices it against live market data',
  'Drafts your replies to enquiries',
  'Duplicates a listing for the next room',
] as const

export type FeeRow = {
  id: string
  label: string
  figure: string
  /** Shown in the always-visible fee tray (not only the drawer). */
  visible: boolean
}

export const FEE_ROWS: FeeRow[] = [
  { id: 'list', label: 'Listing, matching, AI', figure: '$0', visible: true },
  { id: 'accept', label: 'When you accept a tenant', figure: '$99 · once', visible: true },
  { id: 'rent', label: 'Rent', figure: 'Paid to you directly', visible: true },
  { id: 'bond', label: 'Bond', figure: 'Never held by Quni', visible: false },
  { id: 'renew', label: 'Renewals & re-lets', figure: '$0', visible: false },
  { id: 'unfilled', label: "If the room doesn't fill", figure: 'Nothing', visible: false },
]

export const FEE_ROWS_VISIBLE = FEE_ROWS.filter((r) => r.visible)
export const FEE_ROWS_DRAWER = FEE_ROWS.filter((r) => !r.visible)

export const RELATED_LANDLORD_LINKS = [
  { to: '/services/landlord-partnerships', label: 'Landlord partnerships' },
  { to: '/landlords/ai', label: 'Landlord AI' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/services/property-management', label: 'Property management' },
  { to: '/services/fully-furnished', label: 'Fully furnished' },
  { to: '/landlord-service-agreement', label: 'Service agreement' },
] as const

const PAGE_DESCRIPTION =
  'List a spare room in NSW or QLD on Quni: free to list, $99 once when you accept a tenant. Verified applicants, state-compliant agreements, rent paid to you directly. Quni never holds bond.'

export function buildForLandlordsJsonLd(siteUrl: string): Record<string, unknown>[] {
  const pageUrl = `${siteUrl}${FOR_LANDLORDS_PATH}`
  const feeFacts = FEE_ROWS.map((r) => `${r.label}: ${r.figure}`).join('. ')
  const aiFacts = LISTING_AI_DOES.join('. ')

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${pageUrl}#webpage`,
      url: pageUrl,
      name: 'List a room with Quni - for landlords',
      description: PAGE_DESCRIPTION,
      isPartOf: { '@type': 'WebSite', name: 'Quni Living', url: siteUrl },
      about: { '@id': `${pageUrl}#service` },
      mainEntity: { '@id': `${pageUrl}#service` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      '@id': `${pageUrl}#service`,
      name: 'Quni Listing',
      serviceType: 'Room listing and matching for landlords',
      description: PAGE_DESCRIPTION,
      provider: {
        '@type': 'Organization',
        name: 'Quni Living',
        url: siteUrl,
      },
      areaServed: [
        { '@type': 'State', name: 'New South Wales' },
        { '@type': 'State', name: 'Queensland' },
      ],
      offers: {
        '@type': 'Offer',
        name: 'Acceptance fee',
        price: '99',
        priceCurrency: 'AUD',
        description:
          'Free to list. $99 charged once when you accept a tenant. Listing, matching, AI, renewals and re-lets are $0. Rent is paid renter to landlord directly. Bond is never held by Quni.',
      },
      additionalProperty: [
        {
          '@type': 'PropertyValue',
          name: 'Every fee',
          value: feeFacts,
        },
        {
          '@type': 'PropertyValue',
          name: 'What the AI does',
          value: aiFacts,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${pageUrl}#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What does it cost to list a room on Quni?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Free to list. $99 once, only when you accept a tenant. ${feeFacts}.`,
          },
        },
        {
          '@type': 'Question',
          name: 'What does the listing AI do?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: `${aiFacts}.`,
          },
        },
        {
          '@type': 'Question',
          name: 'Where can I list a room with Quni?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Quni Listing is for rooms in New South Wales and Queensland. Rent is paid renter to landlord directly. Quni never holds bond. Agreements are state-compliant and signed online.',
          },
        },
      ],
    },
  ]
}

export { PAGE_DESCRIPTION as FOR_LANDLORDS_DESCRIPTION }
