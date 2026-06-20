/**
 * Apply optional tenant-invite special rent offer at booking apply (Listing tier).
 */

import { resolveTenancyPackage } from '../resolveTenancyPackage.js'
import {
  baseRentBreakdownFromBooking,
  parseWeeklyRentAud,
  rentBreakdownWithOverride,
} from './rentAgreedOverride.js'
import {
  bondAmountAtApplyFromProperty,
  parsePropertyBondAud,
  recomputeBondForAgreedRent,
  statutoryBondCapAudForOverride,
} from './bookingBondAmount.js'

export const RENT_INVITE_OFFER_APPLIED_EVENT = 'rent_invite_offer_applied'

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseInviteOfferWeeklyRentAud(raw) {
  return parseWeeklyRentAud(raw)
}

/**
 * @param {object} listingResolved — output of resolveWeeklyRentForBooking.resolved
 * @param {object} property
 * @param {{ offered_weekly_rent?: unknown; offer_reason?: unknown } | null | undefined} invite
 * @param {string | undefined} moveInDate
 */
export function applyTenantInviteRentOffer(listingResolved, property, invite, moveInDate) {
  const listingRent = parseWeeklyRentAud(listingResolved?.weeklyRent)
  if (listingRent == null) {
    return { ok: false, status: 400, error: 'invalid_listing_rent', message: 'Could not resolve listing rent.' }
  }

  const offer = parseInviteOfferWeeklyRentAud(invite?.offered_weekly_rent)
  if (offer == null) {
    const bondAmount = bondAmountAtApplyFromProperty(property)
    return {
      ok: true,
      weeklyRent: listingRent,
      breakdownAud: listingResolved.breakdownAud,
      bondAmount,
      inviteOfferApplied: false,
    }
  }

  if (offer > listingRent) {
    return {
      ok: false,
      status: 400,
      error: 'invite_offer_exceeds_listing',
      message:
        'This invite offer exceeds the listing rent for your selections. Ask your landlord to send an updated invite.',
    }
  }

  const propertyBond = parsePropertyBondAud(property?.bond)
  if (propertyBond == null) {
    return {
      ok: false,
      status: 400,
      error: 'missing_property_bond',
      message: 'Listing bond is not configured on this property.',
    }
  }

  let bondAmount = propertyBond
  if (offer < listingRent) {
    try {
      bondAmount = recomputeBondForAgreedRent(propertyBond, listingRent, offer)
    } catch {
      return {
        ok: false,
        status: 400,
        error: 'bond_recompute_failed',
        message: 'Could not compute bond for this invite offer.',
      }
    }
  }

  const moveIn = (moveInDate || '').slice(0, 10)
  const tenancyPackage = resolveTenancyPackage({
    state: typeof property.state === 'string' ? property.state : '',
    property_type: typeof property.property_type === 'string' ? property.property_type : '',
    is_registered_rooming_house: Boolean(property.is_registered_rooming_house),
    date: moveIn || undefined,
  })

  const capAud = statutoryBondCapAudForOverride(tenancyPackage, offer)
  if (capAud != null && bondAmount > capAud) {
    return {
      ok: false,
      status: 400,
      error: 'bond_exceeds_statutory_cap',
      message:
        'This invite offer would exceed the statutory bond cap for this tenancy type. Ask your landlord to adjust the offer.',
    }
  }

  let breakdownAud = listingResolved.breakdownAud
  let inviteOfferApplied = false

  if (offer < listingRent) {
    const baseBreakdown = baseRentBreakdownFromBooking(listingResolved.breakdownAud)
    breakdownAud = {
      ...rentBreakdownWithOverride(baseBreakdown, listingRent, offer),
      invite_offer_applied: true,
    }
    inviteOfferApplied = true
  }

  return {
    ok: true,
    weeklyRent: offer,
    breakdownAud,
    bondAmount,
    inviteOfferApplied,
    listingWeeklyRentAud: listingRent,
    offeredWeeklyRentAud: offer,
    offerReason: typeof invite?.offer_reason === 'string' ? invite.offer_reason.trim() : '',
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {object} args
 */
export async function insertRentInviteOfferAppliedEvent(admin, args) {
  const { booking, property, invite, landlordProfileId, studentId, metadata } = args
  const { error } = await admin.from('service_tier_events').insert({
    booking_id: booking.id,
    property_id: booking.property_id ?? property?.id ?? null,
    landlord_id: landlordProfileId ?? property?.landlord_id ?? null,
    student_id: studentId ?? booking.student_id ?? null,
    event_type: RENT_INVITE_OFFER_APPLIED_EVENT,
    service_tier: 'listing',
    metadata: {
      ...metadata,
      tenant_invite_id: invite?.id ?? null,
      recorded_at: new Date().toISOString(),
    },
  })
  if (error) throw error
}
