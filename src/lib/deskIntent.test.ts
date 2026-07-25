import { describe, expect, it } from 'vitest'
import { deskIntentToPath, parseDeskIntent } from './deskIntent'

describe('parseDeskIntent', () => {
  it('routes landlord language to signup', () => {
    const intent = parseDeskIntent('I want to list my spare room')
    expect(intent.kind).toBe('landlord')
    expect(deskIntentToPath(intent)).toBe('/signup?role=landlord')
  })

  it('routes university partnership language', () => {
    const intent = parseDeskIntent('university partnership for our students')
    expect(intent.kind).toBe('university')
  })

  it('parses suburb + budget into listings query', () => {
    const intent = parseDeskIntent('Newtown under $400')
    expect(intent.kind).toBe('listings')
    if (intent.kind === 'listings') {
      expect(intent.params.get('q')).toContain('Newtown')
      expect(intent.params.get('max_rent')).toBe('400')
    }
  })
})
