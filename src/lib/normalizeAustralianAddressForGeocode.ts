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
 * Build geocode query strings (most specific first) for Nominatim.
 * Handles unit/slash formats like "401/311 Hume Hwy" that often fail as a single line.
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
    const q = [line, tail].filter(Boolean).join(', ')
    if (q.length >= 6 && !out.includes(q)) out.push(q)
  }

  push(expandStreetAbbreviations(addr))

  const unitSlash = addr.match(/^(\d+)\s*\/\s*(\d+)\s+(.+)$/i)
  if (unitSlash) {
    const unit = unitSlash[1]
    const streetNo = unitSlash[2]
    const rest = expandStreetAbbreviations(unitSlash[3].trim())
    push(`Unit ${unit}, ${streetNo} ${rest}`)
    push(`${streetNo} ${rest}`)
  }

  const unitComma = addr.match(/^(\d+)\s*\/\s*(\d+),?\s*(.+)$/i)
  if (unitComma && unitComma[0] !== unitSlash?.[0]) {
    const rest = expandStreetAbbreviations(unitComma[3].trim())
    push(`Unit ${unitComma[1]}, ${unitComma[2]} ${rest}`)
  }

  return out
}
