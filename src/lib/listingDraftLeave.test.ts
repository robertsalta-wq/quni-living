import { describe, expect, it } from 'vitest'
import { listingDraftLeaveIssue } from './listingDraftLeave'

const ready = {
  title: 'Room near campus',
  listingStateCode: 'NSW',
  unsupportedStateMessage: null,
  postcodeStateConflict: null,
  rentPerWeek: '250',
  rentRequiredMessage: 'Rent per week cannot be empty.',
}

describe('listingDraftLeaveIssue', () => {
  it('asks for a title before anything else', () => {
    expect(listingDraftLeaveIssue({ ...ready, title: '  ' })).toEqual({
      message: 'Title is required.',
      fieldId: 'pf-title',
      sectionDomId: 'section-basic-info',
    })
  })

  it('asks for a state once the title is set', () => {
    expect(listingDraftLeaveIssue({ ...ready, listingStateCode: '' })?.fieldId).toBe('pf-state')
  })

  it('keeps an unsupported state on the state field', () => {
    expect(
      listingDraftLeaveIssue({
        ...ready,
        listingStateCode: 'WA',
        unsupportedStateMessage: 'WA is not supported yet.',
      })?.fieldId,
    ).toBe('pf-state')
  })

  it('keeps a postcode clash on the postcode field', () => {
    expect(
      listingDraftLeaveIssue({
        ...ready,
        postcodeStateConflict: 'That postcode is not in NSW.',
      })?.fieldId,
    ).toBe('pf-pc')
  })

  it('asks for rent once title and state are set', () => {
    expect(listingDraftLeaveIssue({ ...ready, rentPerWeek: '' })).toEqual({
      message: 'Rent per week cannot be empty.',
      fieldId: 'pf-rent',
      sectionDomId: 'section-pricing-availability',
    })
    expect(listingDraftLeaveIssue({ ...ready, rentPerWeek: '0' })?.fieldId).toBe('pf-rent')
  })

  it('returns null when the minimum fields are present', () => {
    expect(listingDraftLeaveIssue(ready)).toBeNull()
  })
})
