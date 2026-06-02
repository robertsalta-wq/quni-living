import { describe, expect, it } from 'vitest'
import {
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
  it('matches property availability blocking statuses', () => {
    expect(TENANT_BOOKING_CONFIRMED_STATUSES).toEqual(['confirmed', 'active'])
  })
})
