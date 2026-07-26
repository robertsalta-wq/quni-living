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
