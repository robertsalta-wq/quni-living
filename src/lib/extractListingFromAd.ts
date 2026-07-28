/**
 * Heuristic listing-preview extraction from pasted ad text.
 * Used by `/api/ai/extract-listing` and as a client fallback.
 * Zero database writes — preview JSON only.
 *
 * TODO: wire richer AI extraction (Anthropic) behind the same response shape
 * without touching the landlord property form.
 */

export type ExtractedListingPreview = {
  suburb: string | null
  rentWeekly: number | null
  roomType: string | null
  campusHint: string | null
  highlights: string[]
  available: string | null
  echo: string
}

export const SAMPLE_LISTING_AD =
  'Furnished single room for rent in Kingsford, 10 min walk to UNSW. $320/week including bills and wifi. Available early March. Quiet, clean share house. Message me to arrange an inspection.'

const CAMPUS_HINTS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bUNSW\b/i, label: 'UNSW' },
  { pattern: /\bUSYD\b|\bUniversity of Sydney\b/i, label: 'University of Sydney' },
  { pattern: /\bUTS\b/i, label: 'UTS' },
  { pattern: /\bMacquarie\b|\bMQ\b/i, label: 'Macquarie' },
  { pattern: /\bANU\b/i, label: 'ANU' },
  { pattern: /\bUQ\b|\bUniversity of Queensland\b/i, label: 'UQ' },
  { pattern: /\bQUT\b/i, label: 'QUT' },
  { pattern: /\bMonash\b/i, label: 'Monash' },
  { pattern: /\bRMIT\b/i, label: 'RMIT' },
  { pattern: /\bDeakin\b/i, label: 'Deakin' },
]

/** Common AU suburbs that appear in share-house ads (substring match, word-boundary). */
const SUBURB_CANDIDATES = [
  'Kingsford',
  'Kensington',
  'Randwick',
  'Maroubra',
  'Coogee',
  'Bondi',
  'Surry Hills',
  'Newtown',
  'Glebe',
  'Ultimo',
  'Haymarket',
  'Chippendale',
  'Redfern',
  'Waterloo',
  'Zetland',
  'Mascot',
  'Camperdown',
  'Darlington',
  'Paddington',
  'Pyrmont',
  'Parramatta',
  'Strathfield',
  'Burwood',
  'Chatswood',
  'St Lucia',
  'Toowong',
  'Kelvin Grove',
  'South Bank',
  'Fortitude Valley',
  'Carlton',
  'Parkville',
  'Brunswick',
  'Footscray',
]

function extractRentWeekly(text: string): number | null {
  const patterns = [
    /\$\s*(\d{2,4})\s*(?:\/|\s)?\s*(?:per\s+)?(?:wk|week)\b/i,
    /(\d{2,4})\s*(?:dollars?\s+)?(?:per\s+)?(?:wk|week)\b/i,
    /\$\s*(\d{2,4})\s*(?:p\.?\s*w\.?|pw)\b/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) {
      const n = Number.parseInt(m[1], 10)
      if (n >= 50 && n <= 5000) return n
    }
  }
  return null
}

function extractSuburb(text: string): string | null {
  const inMatch = text.match(/\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/)
  if (inMatch?.[1]) {
    const candidate = inMatch[1]
    if (!/^(March|April|May|June|July|August|September|October|November|December|January|February)$/i.test(candidate)) {
      return candidate
    }
  }
  for (const suburb of SUBURB_CANDIDATES) {
    const re = new RegExp(`\\b${suburb.replace(/\s+/g, '\\s+')}\\b`, 'i')
    if (re.test(text)) return suburb
  }
  return null
}

function extractRoomType(text: string): string | null {
  if (/\bprivate\s+room\b/i.test(text)) return 'Private room'
  if (/\bsingle\s+room\b/i.test(text)) return 'Private room'
  if (/\bdouble\s+room\b/i.test(text)) return 'Double room'
  if (/\bmaster\s+(?:bed)?room\b/i.test(text)) return 'Master room'
  if (/\bstudio\b/i.test(text)) return 'Studio'
  if (/\bwhole\s+(?:place|property|apartment|flat|house)\b/i.test(text)) return 'Entire place'
  if (/\bshare\s+house\b|\bsharehouse\b/i.test(text)) return 'Private room'
  return null
}

function extractCampusHint(text: string): string | null {
  for (const { pattern, label } of CAMPUS_HINTS) {
    if (pattern.test(text)) return label
  }
  return null
}

function extractAvailable(text: string): string | null {
  const m = text.match(/\bavailable\s+([^.]{3,48})/i)
  if (!m?.[1]) return null
  return m[1].replace(/\s+/g, ' ').trim().replace(/[,;]+$/, '')
}

function extractHighlights(text: string): string[] {
  const bits: string[] = []
  const furnished = /\bfurnished\b/i.test(text)
  const bills = /\bbills?\s+included\b|\bincluding\s+bills\b/i.test(text)
  const wifi = /\bwifi\b|\bwi-?fi\b|\binternet\b/i.test(text)
  const share = /\bshare\s+house\b|\bsharehouse\b/i.test(text)
  const single = /\bsingle\s+room\b/i.test(text)

  const amenity: string[] = []
  if (furnished) amenity.push('Furnished')
  if (bills) amenity.push('bills included')
  if (wifi) amenity.push('wifi')
  if (amenity.length) bits.push(amenity.join(' · '))

  const avail = extractAvailable(text)
  if (avail) bits.push(`Available ${avail}`)

  if (single && share) bits.push('Single room in a share house')
  else if (share) bits.push('Share house')
  else if (single) bits.push('Single room')

  return bits.slice(0, 4)
}

/** Pure heuristic extract — safe to call from Edge or browser. */
export function extractListingFromAd(adText: string): ExtractedListingPreview {
  const echo = adText.trim()
  if (!echo) {
    return {
      suburb: null,
      rentWeekly: null,
      roomType: null,
      campusHint: null,
      highlights: [],
      available: null,
      echo: '',
    }
  }

  return {
    suburb: extractSuburb(echo),
    rentWeekly: extractRentWeekly(echo),
    roomType: extractRoomType(echo),
    campusHint: extractCampusHint(echo),
    highlights: extractHighlights(echo),
    available: extractAvailable(echo),
    echo,
  }
}
