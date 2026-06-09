import { describe, expect, it } from 'vitest'
import {
  PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES,
  TENANT_BOOKING_CONFIRMED_STATUSES,
  TENANT_BOOKING_PIPELINE_STATUSES,
} from './tenantBookingPipelineStatuses.js'

describe('TENANT_BOOKING_PIPELINE_STATUSES', () => {
  it('includes bond_pending so accepted stays block overlapping applications', () => {
    expect(TENANT_BOOKING_PIPELINE_STATUSES).toContain('bond_pending')
  })

  it('includes pending_confirmation for submitted requests', () => {
    expect(TENANT_BOOKING_PIPELINE_STATUSES).toContain('pending_confirmation')
  })

  it('does not treat terminal statuses as pipeline', () => {
    expect(TENANT_BOOKING_PIPELINE_STATUSES).not.toContain('declined')
    expect(TENANT_BOOKING_PIPELINE_STATUSES).not.toContain('expired')
  })
})

describe('TENANT_BOOKING_CONFIRMED_STATUSES', () => {
  it('is only fully confirmed stays (not bond_pending)', () => {
    expect(TENANT_BOOKING_CONFIRMED_STATUSES).toEqual(['confirmed', 'active'])
  })
})

describe('PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES', () => {
  it('includes bond_pending for Listing property reservation', () => {
    expect(PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES).toContain('bond_pending')
    expect(PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES).toContain('confirmed')
    expect(PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES).toContain('active')
  })

  it('is a superset of confirmed stay statuses', () => {
    for (const s of TENANT_BOOKING_CONFIRMED_STATUSES) {
      expect(PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES).toContain(s)
    }
  })
})
