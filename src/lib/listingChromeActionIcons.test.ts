import { describe, expect, it } from 'vitest'
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { listingChromeActionIcon } from './listingChromeActionIcons'

describe('listingChromeActionIcon', () => {
  it('maps Prev and Next to chevrons even when Next is primary (draft wizard)', () => {
    expect(listingChromeActionIcon({ id: 'prev' })).toBe(ChevronLeft)
    expect(listingChromeActionIcon({ id: 'next', primary: true })).toBe(ChevronRight)
    expect(listingChromeActionIcon({ id: 'next' })).toBe(ChevronRight)
  })

  it('keeps a tick on Save and an X on Save draft', () => {
    expect(listingChromeActionIcon({ id: 'save', primary: true })).toBe(Check)
    expect(listingChromeActionIcon({ id: 'draft' })).toBe(X)
  })
})
