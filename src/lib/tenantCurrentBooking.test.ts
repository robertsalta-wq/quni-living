import { describe, expect, it } from 'vitest'
import {
  currentTenantBookingSectionTitle,
  isStayRelevant,
  pickCurrentTenantBooking,
} from './tenantCurrentBooking'

const base = {
  start_date: '2026-08-01',
  end_date: '2026-12-01',
  move_in_date: null as string | null,
  created_at: '2026-06-01T00:00:00Z',
}

describe('pickCurrentTenantBooking', () => {
  const now = new Date('2026-06-15T12:00:00+10:00')

  it('prefers confirmed over pending application', () => {
    const picked = pickCurrentTenantBooking(
      [
        { id: 'a', status: 'pending', ...base, created_at: '2026-06-10T00:00:00Z' },
        { id: 'b', status: 'confirmed', ...base, created_at: '2026-06-01T00:00:00Z' },
      ],
      now,
    )
    expect(picked?.id).toBe('b')
  })

  it('prefers bond_pending over pending when no confirmed stay', () => {
    const picked = pickCurrentTenantBooking(
      [
        { id: 'a', status: 'pending', ...base },
        { id: 'b', status: 'bond_pending', ...base },
      ],
      now,
    )
    expect(picked?.id).toBe('b')
  })

  it('ignores terminal bookings', () => {
    const picked = pickCurrentTenantBooking(
      [
        { id: 'a', status: 'declined', ...base },
        { id: 'b', status: 'cancelled', ...base },
      ],
      now,
    )
    expect(picked).toBeNull()
  })

  it('deprioritises confirmed stay that has ended', () => {
    const picked = pickCurrentTenantBooking(
      [
        {
          id: 'old',
          status: 'confirmed',
          start_date: '2025-01-01',
          end_date: '2025-06-01',
          move_in_date: null,
          created_at: '2024-12-01T00:00:00Z',
        },
        { id: 'app', status: 'pending_confirmation', ...base },
      ],
      now,
    )
    expect(picked?.id).toBe('app')
  })

  it('uses nearest move-in among same priority tier', () => {
    const picked = pickCurrentTenantBooking(
      [
        {
          id: 'later',
          status: 'pending',
          ...base,
          move_in_date: '2026-09-01',
          created_at: '2026-06-02T00:00:00Z',
        },
        {
          id: 'sooner',
          status: 'pending',
          ...base,
          move_in_date: '2026-07-01',
          created_at: '2026-06-01T00:00:00Z',
        },
      ],
      now,
    )
    expect(picked?.id).toBe('sooner')
  })
})

describe('isStayRelevant', () => {
  it('treats open-ended stays as relevant', () => {
    expect(isStayRelevant({ end_date: null }, '2026-06-15')).toBe(true)
  })

  it('treats future end date as relevant', () => {
    expect(isStayRelevant({ end_date: '2026-12-01' }, '2026-06-15')).toBe(true)
  })

  it('treats past end date as not relevant', () => {
    expect(isStayRelevant({ end_date: '2026-01-01' }, '2026-06-15')).toBe(false)
  })
})

describe('currentTenantBookingSectionTitle', () => {
  it('labels confirmed stays', () => {
    expect(currentTenantBookingSectionTitle('confirmed')).toBe('Your current booking')
  })

  it('labels applications', () => {
    expect(currentTenantBookingSectionTitle('pending')).toBe('Your application')
  })
})
