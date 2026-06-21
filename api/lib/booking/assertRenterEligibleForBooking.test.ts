import { describe, expect, it } from 'vitest'
import { renterBookingEligibilityBlock } from './assertRenterEligibleForBooking.js'

function json(body: object, status: number, origin: string) {
  return new Response(JSON.stringify(body), { status, headers: { origin } })
}

async function bodyOf(res: Response | null) {
  if (!res) return null
  return (await res.json()) as { error?: string }
}

describe('renterBookingEligibilityBlock', () => {
  it('blocks verification_type none on open listings', async () => {
    const res = renterBookingEligibilityBlock('none', true, json, '*')
    expect(res?.status).toBe(403)
    expect(await bodyOf(res)).toMatchObject({ error: 'verification_required' })
  })

  it('blocks verification_type none on student-only listings', async () => {
    const res = renterBookingEligibilityBlock('none', false, json, '*')
    expect(res?.status).toBe(403)
    expect(await bodyOf(res)).toMatchObject({ error: 'verification_required' })
  })

  it('allows identity on open listings', () => {
    expect(renterBookingEligibilityBlock('identity', true, json, '*')).toBeNull()
  })

  it('blocks identity on student-only listings', async () => {
    const res = renterBookingEligibilityBlock('identity', false, json, '*')
    expect(res?.status).toBe(403)
    expect(await bodyOf(res)).toMatchObject({ error: 'student_only_listing' })
  })

  it('allows student on student-only listings', () => {
    expect(renterBookingEligibilityBlock('student', false, json, '*')).toBeNull()
  })

  it('allows student on open listings', () => {
    expect(renterBookingEligibilityBlock('student', true, json, '*')).toBeNull()
  })
})
