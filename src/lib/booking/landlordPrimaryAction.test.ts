import { describe, expect, it } from 'vitest'

import { deriveLandlordPrimaryAction } from './landlordPrimaryAction'
import { resolveLandlordBookingReviewActionCopy } from './bookingReviewActionModel'

const ll = 'landlord-profile-uuid'

const base = {
  bookingLandlordId: ll,
  viewerLandlordProfileId: ll,
  hasTenancy: true,
  tenancyBondLodgedAt: null as string | null,
  tenancyBondLodgementReference: null as string | null,
  hasProperty: true,
}

describe('deriveLandlordPrimaryAction', () => {
  it('#55 lock: confirmed + bond set + boarding → NOT mark-bond / not Confirm the bond', () => {
    const result = deriveLandlordPrimaryAction({
      ...base,
      bookingStatus: 'confirmed',
      serviceTierFinal: 'listing',
      bondReceivedByLandlordAt: '2026-07-16T00:00:00.000Z',
      propertyType: 'homestay',
    })

    expect(result.kind).not.toBe('mark-bond')
    expect(result.copyStatus).toBe('confirmed')
    expect(result.copyStatus).not.toBe('bond_pending')

    const copy = resolveLandlordBookingReviewActionCopy({
      status: result.copyStatus,
      studentDisplayName: 'Sahil',
      askedAtLabel: null,
      bondDeadlineLabel: null,
      hasActionRequired: false,
    })
    expect(copy.title).not.toBe('Confirm the bond')
    expect(copy.title).toBe('Chase the signature')
  })

  it('pre-bond pin: confirmed + bond null + boarding → mark-bond / Confirm the bond', () => {
    // mark-bond is only for confirmed|active|completed (not bond_pending — that is bond-received).
    const result = deriveLandlordPrimaryAction({
      ...base,
      bookingStatus: 'confirmed',
      serviceTierFinal: 'listing',
      bondReceivedByLandlordAt: null,
      propertyType: 'boarding',
    })

    expect(result.kind).toBe('mark-bond')
    expect(result.copyStatus).toBe('bond_pending')

    const copy = resolveLandlordBookingReviewActionCopy({
      status: result.copyStatus,
      studentDisplayName: 'Sahil',
      askedAtLabel: null,
      bondDeadlineLabel: null,
      hasActionRequired: false,
    })
    expect(copy.title).toBe('Confirm the bond')
  })

  it('scope pin: confirmed + non-boarding → NEVER mark-bond', () => {
    for (const bondAt of [null, '2026-07-16T00:00:00.000Z'] as const) {
      const result = deriveLandlordPrimaryAction({
        ...base,
        bookingStatus: 'confirmed',
        serviceTierFinal: 'listing',
        bondReceivedByLandlordAt: bondAt,
        propertyType: 'entire_place',
      })
      expect(result.kind, `bondAt=${bondAt}`).not.toBe('mark-bond')
      expect(result.copyStatus, `bondAt=${bondAt}`).toBe('confirmed')
    }
  })

  it('Listing bond_pending + viewer owns → bond-received (not mark-bond)', () => {
    const result = deriveLandlordPrimaryAction({
      ...base,
      bookingStatus: 'bond_pending',
      serviceTierFinal: 'listing',
      bondReceivedByLandlordAt: null,
      propertyType: 'homestay',
    })
    expect(result.kind).toBe('bond-received')
    expect(result.copyStatus).toBe('bond_pending')
    expect(result.suppressDeadlinePill).toBe(true)
  })

  it('pending_confirmation → accept-decline-info', () => {
    const result = deriveLandlordPrimaryAction({
      ...base,
      bookingStatus: 'pending_confirmation',
      serviceTierFinal: null,
      bondReceivedByLandlordAt: null,
      propertyType: 'entire_place',
    })
    expect(result.kind).toBe('accept-decline-info')
    expect(result.copyStatus).toBe('pending_confirmation')
  })

  it('prove #55: without bondReceived==null gate, confirmed+bond set+boarding wrongly becomes mark-bond', () => {
    // Inline the broken pre-#55 mark-bond formula (missing bondReceived check).
    const brokenShowMarkBond = (input: {
      hasTenancy: boolean
      tenancyBondLodgedAt: string | null
      tenancyBondLodgementReference: string | null
      hasProperty: boolean
      propertyType: string
      bookingStatus: string
    }) =>
      input.hasTenancy &&
      !input.tenancyBondLodgedAt &&
      !input.tenancyBondLodgementReference &&
      // missing: bondReceivedByLandlordAt == null
      input.hasProperty &&
      ['boarding', 'homestay', 'lodger', 'private_room_landlord_on_site'].includes(input.propertyType) &&
      (input.bookingStatus === 'confirmed' ||
        input.bookingStatus === 'active' ||
        input.bookingStatus === 'completed')

    const input = {
      ...base,
      bookingStatus: 'confirmed',
      serviceTierFinal: 'listing' as const,
      bondReceivedByLandlordAt: '2026-07-16T00:00:00.000Z',
      propertyType: 'homestay',
    }

    expect(
      brokenShowMarkBond(input),
      'pre-#55 formula wrongly shows mark-bond after bond received',
    ).toBe(true)

    const fixed = deriveLandlordPrimaryAction(input)
    expect(fixed.kind).not.toBe('mark-bond')
  })
})
