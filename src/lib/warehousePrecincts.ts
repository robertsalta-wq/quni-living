import { suburbToSlug } from './seoHelpers.js'

/** Featured industrial suburbs on the Australia warehousing index. */
export const POPULAR_WAREHOUSE_PREMIUMS: { stateSlug: string; suburb: string }[] = [
  { stateSlug: 'nsw', suburb: 'Wetherill Park' },
  { stateSlug: 'nsw', suburb: 'Erskine Park' },
  { stateSlug: 'nsw', suburb: 'Moorebank' },
  { stateSlug: 'vic', suburb: 'Dandenong' },
  { stateSlug: 'vic', suburb: 'Altona' },
  { stateSlug: 'qld', suburb: 'Acacia Ridge' },
]

/** Major industrial suburbs per state (display names). */
export const KEY_PRECINCTS_BY_STATE: Record<string, string[]> = {
  nsw: ['Wetherill Park', 'Erskine Park', 'Moorebank', 'Eastern Creek', 'Yennora', 'Prestons'],
  vic: ['Dandenong', 'Altona', 'Campbellfield', 'Somerton', 'Laverton'],
  qld: ['Acacia Ridge', 'Rocklea', 'Brendale', 'Yatala'],
  wa: ['Kewdale', 'Welshpool', 'Canning Vale', 'Malaga'],
  sa: ['Gillman', 'Wingfield', 'Regency Park'],
  tas: ['Cambridge', 'Hobart'],
  act: ['Fyshwick', 'Mitchell'],
  nt: ['Darwin', 'Winnellie'],
}

/** Long-form “about this precinct” copy for primary hubs. */
export const WAREHOUSE_PRECINCT_BLURBS: Record<string, string> = {
  'nsw/wetherill-park':
    "Wetherill Park is Sydney's largest industrial precinct, home to hundreds of logistics operators, manufacturers, and distribution centres. Located 35km west of the CBD with direct access to the M7 motorway.",
  'nsw/erskine-park':
    'Erskine Park is a major industrial hub in Western Sydney, adjacent to Wetherill Park and Eastern Creek. Close to the M7/M4 interchange, making it a key location for freight and logistics operations.',
  'nsw/moorebank':
    "Moorebank is home to Australia's largest intermodal freight terminal, handling hundreds of thousands of containers annually. A critical node in the Sydney logistics network.",
  'vic/dandenong':
    "Dandenong is Melbourne's largest industrial precinct, located 35km southeast of the CBD. Home to major manufacturers, distributors, and 3PL operators.",
  'vic/altona':
    "Altona is a key industrial suburb in Melbourne's west, close to the Port of Melbourne. A major location for chemical, food, and general freight operations.",
  'qld/acacia-ridge':
    "Acacia Ridge is Brisbane's primary industrial and logistics hub, with direct rail and road connections. Home to major freight operators and distribution centres.",
  'wa/kewdale':
    "Kewdale is Perth's largest industrial precinct, adjacent to Perth Airport. A major hub for freight, logistics, and aviation-related businesses.",
}

/** Nearby suburb SEO pages (same state) for key precincts. Values are suburb display names. */
export const WAREHOUSE_NEARBY_SUBURBS: Record<string, string[]> = {
  'nsw/wetherill-park': ['Erskine Park', 'Eastern Creek', 'Prestons'],
  'nsw/erskine-park': ['Wetherill Park', 'Eastern Creek', 'Moorebank'],
  'nsw/moorebank': ['Wetherill Park', 'Erskine Park', 'Prestons'],
  'vic/dandenong': ['Campbellfield', 'Somerton', 'Laverton'],
  'vic/altona': ['Laverton', 'Dandenong', 'Campbellfield'],
  'qld/acacia-ridge': ['Rocklea', 'Brendale', 'Yatala'],
  'wa/kewdale': ['Welshpool', 'Canning Vale', 'Malaga'],
}

export function precinctBlurbKey(stateSlug: string, suburbSlug: string): string {
  return `${stateSlug.toLowerCase()}/${suburbSlug.toLowerCase()}`
}

export function warehousingSuburbPath(stateSlug: string, suburbName: string): string {
  return `/warehousing/${stateSlug.toLowerCase()}/${suburbToSlug(suburbName)}`
}

/** Every `/warehousing/:state/:suburb` path to include in the sitemap (deduped). */
export function allWarehousingSuburbPaths(): string[] {
  const out = new Set<string>()
  for (const { stateSlug, suburb } of POPULAR_WAREHOUSE_PREMIUMS) {
    out.add(`/warehousing/${stateSlug}/${suburbToSlug(suburb)}`)
  }
  for (const [stateSlug, suburbs] of Object.entries(KEY_PRECINCTS_BY_STATE)) {
    for (const s of suburbs) {
      out.add(`/warehousing/${stateSlug}/${suburbToSlug(s)}`)
    }
  }
  return [...out].sort()
}
