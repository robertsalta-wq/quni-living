/** Expand common AU street abbreviations for geocoders. */
function expandStreetAbbreviations(line: string): string {
  return line
    .replace(/\bHwy\b/gi, 'Highway')
    .replace(/\bSt\b/gi, 'Street')
    .replace(/\bRd\b/gi, 'Road')
    .replace(/\bAve\b/gi, 'Avenue')
    .replace(/\bDr\b/gi, 'Drive')
    .replace(/\bCt\b/gi, 'Court')
    .replace(/\bPde\b/gi, 'Parade')
}

/** Prefixes like "Unit 406," that geocoders often fail on — strip for street-level lookup. */
const UNIT_LINE_PREFIX =
  /^(?:unit|apt|apartment|apts?|suite|ste|level|lvl|lot|shop|office|flat)\s*[\d\w-]+\s*,?\s*/i

/**
 * Street number + name for geocoding (no unit/apartment). Used for lat/lng and nearest campus.
 * The full address line is still stored on the listing.
 */
export function streetLineForGeocode(address: string): string | null {
  let line = address.trim()
  if (!line) return null

  let guard = 0
  while (UNIT_LINE_PREFIX.test(line) && guard < 4) {
    line = line.replace(UNIT_LINE_PREFIX, '').trim()
    guard += 1
  }

  const unitSlash = line.match(/^(\d+)\s*\/\s*(\d+)\s+(.+)$/i)
  if (unitSlash) {
    line = `${unitSlash[2]} ${unitSlash[3].trim()}`
  }

  const expanded = expandStreetAbbreviations(line).trim()
  if (expanded.length < 4 || !/\d/.test(expanded)) return null
  return expanded
}

/**
 * Build geocode query strings (most specific first) for Nominatim.
 * Tries the full line, then unit/slash variants, then street-only (suburb/state/postcode unchanged).
 */
export function buildGeocodeQueryCandidates(
  address: string,
  suburb: string,
  state: string,
  postcode: string,
): string[] {
  const addr = address.trim()
  const sub = suburb.trim()
  const st = state.trim()
  const pc = postcode.trim()
  const tail = [sub, st, pc, 'Australia'].filter(Boolean).join(', ')
  if (!addr || !sub || !st || !pc) return []

  const out: string[] = []
  const push = (line: string) => {
    const expanded = expandStreetAbbreviations(line.trim())
    const q = [expanded, tail].filter(Boolean).join(', ')
    if (q.length >= 6 && !out.includes(q)) out.push(q)
  }

  push(addr)

  const unitSlash = addr.match(/^(\d+)\s*\/\s*(\d+)\s+(.+)$/i)
  if (unitSlash) {
    const unit = unitSlash[1]
    const streetNo = unitSlash[2]
    const rest = unitSlash[3].trim()
    push(`Unit ${unit}, ${streetNo} ${rest}`)
    push(`${streetNo} ${rest}`)
  }

  const unitComma = addr.match(/^(\d+)\s*\/\s*(\d+),?\s*(.+)$/i)
  if (unitComma && unitComma[0] !== unitSlash?.[0]) {
    push(`Unit ${unitComma[1]}, ${unitComma[2]} ${unitComma[3].trim()}`)
  }

  const streetOnly = streetLineForGeocode(addr)
  if (streetOnly) {
    const normalizedFull = expandStreetAbbreviations(addr)
    if (streetOnly.toLowerCase() !== normalizedFull.toLowerCase()) {
      push(streetOnly)
    }
  }

  return out
}
