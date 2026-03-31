/**
 * Extra URL segments → canonical `universities.slug` stored in the database.
 * (Seed uses short codes like `usyd`; marketing URLs often use full-name slugs.)
 */
const ALIASES: Record<string, string> = {
  'university-of-sydney': 'usyd',
  'university-of-new-south-wales': 'unsw',
  'university-of-technology-sydney': 'uts',
  'macquarie-university': 'mq',
  'western-sydney-university': 'wsu',
  'university-of-newcastle': 'uon',
  'university-of-wollongong': 'uow',
  'southern-cross-university': 'scu',
  'charles-sturt-university': 'csu',
  'university-of-melbourne': 'unimelb',
  'monash-university': 'monash',
  'rmit-university': 'rmit',
  'deakin-university': 'deakin',
  'la-trobe-university': 'latrobe',
  'swinburne-university': 'swinburne',
  'victoria-university': 'vu',
  'federation-university': 'feduni',
  'university-of-queensland': 'uq',
  'queensland-university-of-technology': 'qut',
  'griffith-university': 'griffith',
  'james-cook-university': 'jcu',
  'university-of-southern-queensland': 'usq',
  'bond-university': 'bond',
  'central-queensland-university': 'cqu',
  'university-of-western-australia': 'uwa',
  'curtin-university': 'curtin',
  'murdoch-university': 'murdoch',
  'edith-cowan-university': 'ecu',
  'university-of-adelaide': 'uoadelaide',
  'university-of-south-australia': 'unisa',
  'flinders-university': 'flinders',
  'australian-national-university': 'anu',
  'university-of-canberra': 'uni-canberra',
  'university-of-tasmania': 'utas',
  'charles-darwin-university': 'cdu',
}

/** Normalise a path or query `uni` value to the slug used in `universities.slug`. */
export function resolveUniversitySlugParam(raw: string): string {
  const s = raw.trim().toLowerCase()
  if (!s) return ''
  return ALIASES[s] ?? s
}
