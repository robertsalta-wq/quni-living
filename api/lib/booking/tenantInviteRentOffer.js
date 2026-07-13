/**
 * Apply optional tenant-invite special rent offer at booking apply (Listing tier).
 */

import {
  baseRentBreakdownFromBooking,
  parseWeeklyRentAud,
  rentBreakdownWithOverride,
} from './rentAgreedOverride.js'
import {
  assertBondWithinCap,
  bondAmountAtApplyFromProperty,
  parseBondWeeks,
} from './bookingBondAmount.js'

export const RENT_INVITE_OFFER_APPLIED_EVENT = 'rent_invite_offer_applied'

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseInviteOfferWeeklyRentAud(raw) {
  return parseWeeklyRentAud(raw)
}

function inviteBondProvenanceFields(invite) {
  if (!invite) return {}
  if (invite.offered_bond_weeks != null && invite.offered_bond_weeks !== '') {
    const weeks = parseBondWeeks(invite.offered_bond_weeks)
    if (weeks != null) return { invite_bond_weeks: weeks }
  }
  return {}
}

/**
 * @param {object} listingResolved — output of resolveWeeklyRentForBooking.resolved
 * @param {object} property
 * @param {{ offered_weekly_rent?: unknown; offer_reason?: unknown; offered_bond_weeks?: unknown } | null | undefined} invite
 * @param {string | undefined} moveInDate
 */
export function applyTenantInviteRentOffer(listingResolved, property, invite, moveInDate) {
  void moveInDate
  const listingRent = parseWeeklyRentAud(listingResolved?.weeklyRent)
  if (listingRent == null) {
    return { ok: false, status: 400, error: 'invalid_listing_rent', message: 'Could not resolve listing rent.' }
  }

  const offer = parseInviteOfferWeeklyRentAud(invite?.offered_weekly_rent)
  const weeklyRent = offer ?? listingRent

  if (offer != null && offer > listingRent) {
    return {
      ok: false,
      status: 400,
      error: 'invite_offer_exceeds_listing',
      message:
        'This invite offer exceeds the listing rent for your selections. Ask your landlord to send an updated invite.',
    }
  }

  const bondAmount = bondAmountAtApplyFromProperty(property, weeklyRent, invite)
  const capCheck = assertBondWithinCap(bondAmount, weeklyRent)
  if (!capCheck.ok) {
    return {
      ok: false,
      status: 400,
      error: 'bond_exceeds_statutory_cap',
      message: capCheck.message,
    }
  }

  let breakdownAud = listingResolved.breakdownAud
  let inviteOfferApplied = false

  if (offer != null && offer < listingRent) {
    const baseBreakdown = baseRentBreakdownFromBooking(listingResolved.breakdownAud)
    breakdownAud = {
      ...rentBreakdownWithOverride(baseBreakdown, listingRent, offer),
      invite_offer_applied: true,
    }
    inviteOfferApplied = true
  }

  const bondProv = inviteBondProvenanceFields(invite)
  if (Object.keys(bondProv).length > 0) {
    breakdownAud = { ...(breakdownAud ?? {}), ...bondProv }
  }

  return {
    ok: true,
    weeklyRent,
    breakdownAud,
    bondAmount,
    inviteOfferApplied,
    listingWeeklyRentAud: listingRent,
    offeredWeeklyRentAud: offer ?? listingRent,
    offerReason: typeof invite?.offer_reason === 'string' ? invite.offer_reason.trim() : '',
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {object} args
 */
export async function insertRentInviteOfferAppliedEvent(admin, args) {
  const { booking, property, invite, landlordProfileId, studentId, metadata } = args
  const { recordBookingEvent } = await import('./events/recordBookingEvent.js')
  await recordBookingEvent(
    admin,
    {
      bookingId: booking.id,
      landlordId: landlordProfileId ?? property?.landlord_id ?? null,
      studentId: studentId ?? booking.student_id ?? null,
      eventType: 'rent.invite_offer_applied',
      actorType: 'system',
      actorId: landlordProfileId ?? property?.landlord_id ?? null,
      changes: [
        {
          field: 'weekly_rent',
          old: metadata?.listing_weekly_rent_aud ?? null,
          new: metadata?.applied_weekly_rent_aud ?? null,
        },
      ],
      metadata: {
        ...metadata,
        tenant_invite_id: invite?.id ?? null,
        service_tier: 'listing',
      },
    },
    { required: true },
  )
}
