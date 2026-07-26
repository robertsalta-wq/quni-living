import { describe, expect, it } from 'vitest'
import { deskReceptionSubmitLabel, matchDeskReceptionQuery, placeListingsPath } from './deskReceptionMatch'
import { DESK_PLACES_FIXTURE } from './deskPlacesFixture'

describe('matchDeskReceptionQuery', () => {
  it('ryde → places only', () => {
    const m = matchDeskReceptionQuery('ryde')
    expect(m.places.length).toBeGreaterThan(0)
    expect(m.questions).toHaveLength(0)
  })

  it('is it free → questions only', () => {
    const m = matchDeskReceptionQuery('is it free')
    expect(m.places).toHaveLength(0)
    expect(m.questions.some((q) => /free/i.test(q.question))).toBe(true)
  })

  it('bond → both sections', () => {
    const m = matchDeskReceptionQuery('bond')
    expect(m.places.some((p) => /bondi/i.test(p.label))).toBe(true)
    expect(m.questions.some((q) => /bond/i.test(q.question))).toBe(true)
  })

  it('empty → nothing', () => {
    expect(matchDeskReceptionQuery('')).toEqual({ places: [], questions: [] })
  })
})

describe('placeListingsPath', () => {
  it('navigates with q= from fixture query', () => {
    const ryde = DESK_PLACES_FIXTURE[0]
    expect(placeListingsPath(ryde)).toBe('/listings?q=Ryde')
  })
})

describe('deskReceptionSubmitLabel', () => {
  it('defaults to Search when empty', () => {
    expect(deskReceptionSubmitLabel('', { places: [], questions: [] })).toBe('Search')
  })

  it('Search for place-only match', () => {
    const m = matchDeskReceptionQuery('ryde')
    expect(deskReceptionSubmitLabel('ryde', m)).toBe('Search')
  })

  it('Ask for question-only match', () => {
    const m = matchDeskReceptionQuery('is it free')
    expect(deskReceptionSubmitLabel('is it free', m)).toBe('Ask')
  })
})
