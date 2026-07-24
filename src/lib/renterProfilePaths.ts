/** Renter profile deep-link helpers — hub uses ?section=; hashes still redirect. */

export type RenterProfileExpandKey =
  | 'situation'
  | 'personal'
  | 'verification'
  | 'route'
  | 'emergency'
  | 'about'
  | 'prefs'

export type ParsedRenterSectionHash = {
  expand: RenterProfileExpandKey
  openGuarantor?: boolean
  scrollId: string
}

const HASH_MAP: Record<string, ParsedRenterSectionHash> = {
  'renter-section-situation': { expand: 'situation', scrollId: 'renter-section-situation' },
  'renter-section-personal': { expand: 'personal', scrollId: 'renter-section-personal' },
  'renter-section-verification': { expand: 'verification', scrollId: 'renter-section-verification' },
  'renter-section-route': { expand: 'route', scrollId: 'renter-section-route' },
  'renter-section-route-locked': { expand: 'situation', scrollId: 'renter-section-route-locked' },
  'renter-section-guarantor': {
    expand: 'route',
    openGuarantor: true,
    scrollId: 'renter-section-guarantor',
  },
  'renter-section-emergency': { expand: 'emergency', scrollId: 'renter-section-emergency' },
  'renter-section-about': { expand: 'about', scrollId: 'renter-section-about' },
  'renter-section-prefs': { expand: 'prefs', scrollId: 'renter-section-prefs' },
}

/** Hub / drill-in paths (landlord-style). Desktop accordion still honors hashes. */
export function renterProfilePath(section?: RenterProfileExpandKey | 'guarantor'): string {
  if (!section) return '/student-profile'
  if (section === 'guarantor') return '/student-profile?section=route&guarantor=1'
  return `/student-profile?section=${section}`
}

export function parseRenterSectionHash(hash: string): ParsedRenterSectionHash | null {
  const h = hash.replace(/^#/, '').trim()
  return HASH_MAP[h] ?? null
}
