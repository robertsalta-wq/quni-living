import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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

  it('listing drill-ins use the id mapper instead of primary-equals-Check', () => {
    const files = [
      'src/pages/landlord/LandlordPropertyFormPage.tsx',
      'src/components/landlord/listingHub/ListingBasicInfoDrillIn.tsx',
    ]
    for (const file of files) {
      const src = readFileSync(join(process.cwd(), file), 'utf8')
      expect(src).toContain('listingChromeActionIcon(spec)')
      expect(src).not.toMatch(/spec\.primary \? Check/)
    }
  })
})
