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

/**
 * Words a landlord may already have typed in the Unit field.
 * Longer words come first so "Apartment" is not read as "Apt".
 */
const UNIT_PREFIX = String.raw`apartment|apt|suite|ste|level|lvl|office|flat|unit|shop|lot`

const UNIT_PREFIX_START = new RegExp(`^(?:${UNIT_PREFIX})\\b`, 'i')
const UNIT_CLAUSE_WITH_STREET = new RegExp(`^((?:${UNIT_PREFIX})\\b.*?)\\s*,\\s*(.*)$`, 'i')
const DOUBLED_PREFIX = new RegExp(`^(${UNIT_PREFIX})\\s+\\1\\b\\s*`, 'i')

function collapseDoubledPrefix(clause: string): string {
  let text = clause.trim().replace(/\s+/g, ' ')
  while (DOUBLED_PREFIX.test(text)) {
    text = text.replace(DOUBLED_PREFIX, '$1 ').replace(/\s+/g, ' ').trim()
  }
  return text
}

/** A bare number or letter, such as "1", "A", "U1", or "12B". Prefix words are not bare. */
function isBareUnitToken(unit: string): boolean {
  return /^[0-9A-Za-z]+$/.test(unit) && !new RegExp(`^(?:${UNIT_PREFIX})$`, 'i').test(unit)
}

/** The unit clause stored before the comma. Adds "Unit" only for a bare token. */
function unitClause(unit: string): string {
  const text = collapseDoubledPrefix(unit)
  if (!text) return ''
  if (UNIT_PREFIX_START.test(text)) return text
  if (isBareUnitToken(text)) return `Unit ${text}`
  return text
}

export function splitUnitFromStreetLine(address: string): { unit: string; street: string } {
  const line = address.trim()
  const match = line.match(UNIT_CLAUSE_WITH_STREET)
  if (match) return { unit: collapseDoubledPrefix(match[1]), street: match[2].trim() }
  if (UNIT_PREFIX_START.test(line)) return { unit: collapseDoubledPrefix(line), street: '' }
  return { unit: '', street: line }
}

/** Stored on properties.address. There is no separate unit column. */
export function composeStreetLine(unit: string, street: string): string {
  const clause = unitClause(unit)
  const s = street.trim()
  if (!clause) return s
  if (!s) return clause
  return `${clause}, ${s}`
}

/**
 * Street number + name for geocoding (no unit/apartment). Used for lat/lng and nearest campus.
 * The full address line is still stored on the listing.
 */
export function streetLineForGeocode(address: string): string | null {
  let line = address.trim()
  if (!line) return null

  const parts = splitUnitFromStreetLine(line)
  if (parts.unit) line = parts.street

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
