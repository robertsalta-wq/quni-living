import { DESK_FAQ_INDEX, type DeskFaqItem } from './deskFaqIndex'
import { DESK_PLACES_FIXTURE, type DeskPlace } from './deskPlacesFixture'

const MAX_PER_SECTION = 3

export type DeskReceptionMatches = {
  places: DeskPlace[]
  questions: DeskFaqItem[]
}

/** Local string match only — never guesses beyond substring / word inclusion. */
export function matchDeskReceptionQuery(raw: string): DeskReceptionMatches {
  const v = raw.trim().toLowerCase()
  if (!v) return { places: [], questions: [] }

  const places = DESK_PLACES_FIXTURE.filter((p) => p.label.toLowerCase().includes(v)).slice(
    0,
    MAX_PER_SECTION,
  )

  const words = v.split(/\s+/).filter((w) => w.length > 2)
  const questions = DESK_FAQ_INDEX.filter((item) => {
    const q = item.question.toLowerCase()
    if (q.includes(v)) return true
    return words.some((w) => q.includes(w))
  }).slice(0, MAX_PER_SECTION)

  return { places, questions }
}

export function placeListingsPath(place: DeskPlace): string {
  const params = new URLSearchParams()
  params.set('q', place.query)
  return `/listings?${params.toString()}`
}

/** Submit button label — Search for places / empty; Ask for questions or sentences. */
export function deskReceptionSubmitLabel(
  raw: string,
  matches: DeskReceptionMatches,
): 'Search' | 'Ask' {
  const q = raw.trim()
  if (!q) return 'Search'

  const looksLikeQuestion =
    /\?/.test(q) ||
    /^(is|who|what|when|where|can|how|does|do|are|will|should)\b/i.test(q) ||
    /\b(free|bond|verified|rent out|spare room)\b/i.test(q)

  if (matches.places.length > 0 && matches.questions.length === 0) return 'Search'
  if (matches.questions.length > 0 && matches.places.length === 0) return 'Ask'
  if (matches.places.length > 0 && matches.questions.length > 0) {
    return looksLikeQuestion ? 'Ask' : 'Search'
  }
  return looksLikeQuestion ? 'Ask' : 'Search'
}
