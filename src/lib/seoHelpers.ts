export const STATE_SLUGS: Record<string, string> = {
  nsw: 'New South Wales',
  vic: 'Victoria',
  qld: 'Queensland',
  wa: 'Western Australia',
  sa: 'South Australia',
  tas: 'Tasmania',
  act: 'Australian Capital Territory',
  nt: 'Northern Territory',
}

export const STATE_ABBREV: Record<string, string> = {
  nsw: 'NSW',
  vic: 'VIC',
  qld: 'QLD',
  wa: 'WA',
  sa: 'SA',
  tas: 'TAS',
  act: 'ACT',
  nt: 'NT',
}

export const STATE_SLUG_ORDER = ['nsw', 'vic', 'qld', 'wa', 'sa', 'tas', 'act', 'nt'] as const

export type WarehouseStateSlug = (typeof STATE_SLUG_ORDER)[number]

export function isValidStateSlug(slug: string): slug is WarehouseStateSlug {
  return (STATE_SLUG_ORDER as readonly string[]).includes(slug)
}

export function slugToSuburb(slug: string): string {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function suburbToSlug(suburb: string): string {
  return suburb.toLowerCase().replace(/\s+/g, '-')
}
