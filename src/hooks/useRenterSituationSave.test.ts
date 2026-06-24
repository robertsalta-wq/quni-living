import { describe, expect, it } from 'vitest'
import { routeSectionClearPatch, routeSectionHasData } from '../lib/renterRouteSection'
import type { StudentProfileRow } from '../lib/studentOnboarding'

/**
 * Situation-switch clearing is applied in useRenterSituationSave when
 * routeSectionHasData(currentSituation, profile) is true. These tests document
 * that contract without mounting the hook (window.confirm / Supabase).
 */
describe('situation switch clearing contract', () => {
  const studentProfile = {
    renter_situation: 'student',
    university_id: '00000000-0000-0000-0000-000000000001',
    course: 'BSc',
    study_level: 'year_2',
  } as StudentProfileRow

  it('only prompts to clear when route section has data', () => {
    expect(routeSectionHasData('student', studentProfile)).toBe(true)
    expect(routeSectionHasData('student', { renter_situation: 'student' } as StudentProfileRow)).toBe(false)
  })

  it('merges clear patch for prior situation when switching away from student', () => {
    const patch = {
      renter_situation: 'working',
      accommodation_verification_route: 'non_student',
      ...routeSectionClearPatch('student'),
    }
    expect(patch.university_id).toBe(null)
    expect(patch.course).toBe(null)
    expect(patch.income_band).toBe(null)
    expect(patch.income_source).toBe(null)
    expect(patch.renter_situation).toBe('working')
  })

  it('clears working fields when switching from working to retired', () => {
    const working = {
      renter_situation: 'working',
      employer_name: 'Acme',
      workplace_latitude: -33.8,
    } as StudentProfileRow
    expect(routeSectionHasData('working', working)).toBe(true)
    const patch = routeSectionClearPatch('working')
    expect(patch.employer_name).toBe(null)
    expect(patch.workplace_latitude).toBe(null)
  })
})
