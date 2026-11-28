export type ListingDraftLeaveIssue = {
  message: string
  fieldId: string
  sectionDomId: string
}

/**
 * Minimum fields before Save and exit or Save draft may leave the form.
 * Completeness (compliance, utilities, payee) is not included.
 */
export function listingDraftLeaveIssue(input: {
  title: string
  listingStateCode: string
  unsupportedStateMessage: string | null
  postcodeStateConflict: string | null
  rentPerWeek: string
  rentRequiredMessage: string
}): ListingDraftLeaveIssue | null {
  if (!input.title.trim()) {
    return {
      message: 'Title is required.',
      fieldId: 'pf-title',
      sectionDomId: 'section-basic-info',
    }
  }
  if (!input.listingStateCode.trim()) {
    return {
      message: 'Choose the state before saving. The questions below depend on it.',
      fieldId: 'pf-state',
      sectionDomId: 'section-location',
    }
  }
  if (input.unsupportedStateMessage) {
    return {
      message: input.unsupportedStateMessage,
      fieldId: 'pf-state',
      sectionDomId: 'section-location',
    }
  }
  if (input.postcodeStateConflict) {
    return {
      message: input.postcodeStateConflict,
      fieldId: 'pf-pc',
      sectionDomId: 'section-location',
    }
  }
  const rent = Number(input.rentPerWeek)
  if (!Number.isFinite(rent) || rent <= 0) {
    return {
      message: input.rentRequiredMessage,
      fieldId: 'pf-rent',
      sectionDomId: 'section-pricing-availability',
    }
  }
  return null
}
