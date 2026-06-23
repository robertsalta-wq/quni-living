/**
 * Student booking apply — tier-branched (mirrors confirmListing / confirmManaged on accept).
 *
 * Managed: PaymentIntent (manual capture) + commit with paymentIntentId.
 * Listing: no student Stripe call — commit inserts pending_confirmation with no deposit fields.
 *
 * POST JSON (Managed create PI): {
 *   propertyId, moveInDate, leaseLength, studentMessage?, bondAcknowledged,
 *   occupantCount?: 1|2, parkingSelected?: boolean
 * }
 * POST JSON (Listing apply preview): same body → { listingApply: true, weeklyRent, ... }
 * POST JSON (commit): {
 *   commit: true, propertyId, moveInDate, leaseLength, studentMessage?, bondAcknowledged,
 *   paymentIntentId?,  // Managed only
 *   propertyType?, rentPaymentMethod?, conversationId?, occupantCount?, parkingSelected?,
 *   coTenant?: { full_name, email, phone, date_of_birth }
 * }
 *
 * Authorization: Bearer <Supabase access_token>
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import {
  buildBookingRejectVisibility,
  captureBookingRejected,
  captureBookingRejectedResponse,
  recordJourneyEvent,
} from './lib/booking/captureBookingRejected.js'
import { readAttemptIdFromBody } from './lib/journey/insertJourneyEvent.js'
import { mergeDeviceContextMetadata, requestContextFromRequest } from './lib/journey/requestContext.js'
import {
  calculateBookingFeeCents,
  getActivePricingSnapshotForProperty,
} from './lib/pricing/index.js'
import { computeServiceTierAtRequestSnapshot } from './lib/booking/serviceTierSnapshot.js'
import { fetchServiceTierResolverContext } from './lib/platformConfig.js'
import { moveInFloorError } from './lib/booking/moveInFloor.js'
import {
  assertRenterEmailConfirmed,
  markTenantInviteAccepted,
  readTenantInviteTokenFromBody,
  fetchPendingTenantInviteForBooking,
} from './lib/booking/tenantInviteAccept.js'
import { assertRenterEligibleForBooking } from './lib/booking/assertRenterEligibleForBooking.js'
import {
  applyTenantInviteRentOffer,
  insertRentInviteOfferAppliedEvent,
} from './lib/booking/tenantInviteRentOffer.js'
import {
  assertPiMetadataMatchesOccupancy,
  OCCUPANCY_PROPERTY_COLUMNS,
  parseOccupancyScalarsFromBody,
  housematesCountFromOccupantCount,
  resolveCoTenantForCommit,
  resolveWeeklyRentForBooking,
} from './lib/booking/occupancyBooking.js'
import { TENANT_BOOKING_PIPELINE_STATUSES } from './lib/booking/tenantBookingPipelineStatuses.js'
import { checkPropertyAvailableForNewApplication } from './lib/booking/propertyAvailability.js'
import {
  buildListingApplyBookingRow,
  isListingServiceTier,
} from './lib/booking/listingBookingApply.js'
import { bondAmountAtApplyFromProperty } from './lib/booking/bookingBondAmount.js'

export const config = { runtime: 'edge' }

const PROPERTY_PIPELINE_STATUSES = TENANT_BOOKING_PIPELINE_STATUSES

const VALID_PROPERTY_TYPES = new Set([
  'entire_property',
  'private_room_landlord_off_site',
  'private_room_landlord_on_site',
  'shared_room',
])

function json(body, status = 200, origin) {
  const allowOrigin = origin || '*'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  })
}

function addDaysIso(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d) + days * 86400000
  const x = new Date(t)
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`
}

function todayUtcIso() {
  return new Date().toISOString().slice(0, 10)
}

function leaseEndDateIso(moveIn, leaseLength) {
  if (leaseLength === 'Flexible') return null
  const days =
    leaseLength === '3 months' ? 92 : leaseLength === '6 months' ? 183 : leaseLength === '12 months' ? 365 : null
  if (days == null) return null
  return addDaysIso(moveIn, days)
}

/**
 * Exclusive end date for half-open tenancy window [start, end).
 * Prefer stored end_date; otherwise leaseEndDateIso(start, lease_length) with Flexible / null / unknown → '12 months'.
 * Cross-property overlap has no DB-level guard (unlike same-property which has a unique index). API-only enforcement
 * is acceptable for MVP. If a second booking insert path is ever added, add a DB constraint or trigger at that point.
 */
function bookingTenancyExclusiveEndIso(storedEndDate, startIso, leaseLengthRaw) {
  const trimmedEnd = typeof storedEndDate === 'string' ? storedEndDate.trim() : ''
  if (trimmedEnd) return trimmedEnd
  const ll = typeof leaseLengthRaw === 'string' ? leaseLengthRaw.trim() : ''
  const effectiveLease =
    ll === '3 months' || ll === '6 months' || ll === '12 months' ? ll : '12 months'
  return leaseEndDateIso(startIso, effectiveLease)
}

/** Half-open [start, end): overlap iff newStart < existingEnd && newEnd > existingStart. end_date is the exclusive end. */
function halfOpenDateRangesOverlap(newStart, newEnd, existingStart, existingEnd) {
  return newStart < existingEnd && newEnd > existingStart
}

function conflictPropertyAddress(propertiesRow) {
  const addr = propertiesRow && typeof propertiesRow.address === 'string' ? propertiesRow.address.trim() : ''
  if (addr) return addr
  const suburb = propertiesRow && typeof propertiesRow.suburb === 'string' ? propertiesRow.suburb.trim() : ''
  if (suburb) return suburb
  return 'another property'
}

function isUniqueViolation(err) {
  if (!err || typeof err !== 'object') return false
  const code = /** @type {{ code?: string; message?: string }} */ (err).code
  if (code === '23505') return true
  const msg = String(/** @type {{ message?: string }} */ (err).message || '')
  return /duplicate key|unique constraint/i.test(msg)
}

async function releaseAuthorisedDepositIntent(stripe, paymentIntentId, context, visibility) {
  try {
    const p = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (p.status === 'requires_capture' || p.status === 'requires_confirmation') {
      await stripe.paymentIntents.cancel(paymentIntentId)
    } else if (p.status === 'succeeded') {
      await stripe.refunds.create({ payment_intent: paymentIntentId })
    }
  } catch (e) {
    console.error('releaseAuthorisedDepositIntent', context, e)
    await captureBookingRejected({
      ...(visibility ?? {}),
      error_code: 'stripe_cleanup_failed',
      http_status: 500,
      cleanup_context: context,
      paymentIntentId,
      err: e instanceof Error ? e.message : String(e),
    })
  }
}

/** Capture handled rejection JSON and return the same Response. */
async function rejectIfBlocked(block, visibility, fallbackErrorCode) {
  if (!block) return null
  await captureBookingRejectedResponse(block, visibility, fallbackErrorCode)
  return block
}

function journeyActor(user, attemptId) {
  return {
    user_id: user?.id ?? null,
    email: user?.email ?? null,
    attempt_id: attemptId ?? null,
  }
}

function recordBookingSubmitAttempt(admin, user, propertyId, mode, attemptId, serviceTier, deviceCtx) {
  recordJourneyEvent(admin, {
    ...journeyActor(user, attemptId),
    property_id: propertyId,
    event_type: 'booking_submit_attempt',
    step: mode,
    service_tier: serviceTier ?? null,
    metadata: mergeDeviceContextMetadata(undefined, deviceCtx),
  })
}

function recordBookingCompleted(admin, user, propertyId, mode, attemptId, bookingId, serviceTier, deviceCtx) {
  recordJourneyEvent(admin, {
    ...journeyActor(user, attemptId),
    property_id: propertyId,
    event_type: 'booking_completed',
    step: mode,
    service_tier: serviceTier ?? null,
    metadata: mergeDeviceContextMetadata({ booking_id: bookingId }, deviceCtx),
  })
}

async function assertPropertyAvailableForBooking(admin, propertyId, origin) {
  const result = await checkPropertyAvailableForNewApplication(admin, propertyId)
  if (result.ok) return null
  return json(result.body, result.status, origin)
}

async function assertStudentPipelineFree(admin, studentId, propertyId, origin) {
  const { data: rows, error } = await admin
    .from('bookings')
    .select('id')
    .eq('student_id', studentId)
    .eq('property_id', propertyId)
    .in('status', PROPERTY_PIPELINE_STATUSES)
    .limit(1)

  if (error) {
    console.error('assertStudentPipelineFree', error)
    return json({ error: 'Server error' }, 500, origin)
  }
  if (rows?.length) {
    return json(
      {
        error: 'duplicate_booking',
        message: 'You already have an active booking request for this property.',
      },
      409,
      origin,
    )
  }
  return null
}

/** @param {{ stripe?: import('stripe').default; paymentIntentId?: string }} [releaseOpts] Commit: cancel/refund PI if blocked. */
async function assertNoCrossPropertyDateOverlap(
  admin,
  studentId,
  propertyId,
  newMoveIn,
  newLeaseLength,
  origin,
  releaseOpts,
) {
  const newStart = typeof newMoveIn === 'string' ? newMoveIn.trim().slice(0, 10) : ''
  if (!newStart) return null

  const newEnd = bookingTenancyExclusiveEndIso(null, newStart, newLeaseLength)
  if (!newEnd) {
    console.error('assertNoCrossPropertyDateOverlap: could not compute new booking end')
    return json({ error: 'Server error' }, 500, origin)
  }

  const { data: rows, error } = await admin
    .from('bookings')
    .select(
      `
      id,
      property_id,
      move_in_date,
      start_date,
      end_date,
      lease_length,
      properties ( address, suburb )
    `,
    )
    .eq('student_id', studentId)
    .neq('property_id', propertyId)
    .in('status', PROPERTY_PIPELINE_STATUSES)

  if (error) {
    console.error('assertNoCrossPropertyDateOverlap', error)
    return json({ error: 'Server error' }, 500, origin)
  }

  for (const row of rows ?? []) {
    const exStartRaw = row.move_in_date || row.start_date
    const exStart = typeof exStartRaw === 'string' ? exStartRaw.trim().slice(0, 10) : ''
    if (!exStart) continue

    const exEnd = bookingTenancyExclusiveEndIso(row.end_date, exStart, row.lease_length)
    if (!exEnd) continue

    if (halfOpenDateRangesOverlap(newStart, newEnd, exStart, exEnd)) {
      const props = row.properties
      const property_address = conflictPropertyAddress(
        props && typeof props === 'object' ? props : null,
      )
      const body = {
        error: 'date_overlap',
        message: 'You already have a booking that overlaps with these dates.',
        conflict: {
          property_address,
          start_date: exStart,
          end_date: exEnd.slice(0, 10),
        },
      }
      if (releaseOpts?.stripe && releaseOpts?.paymentIntentId) {
        await releaseAuthorisedDepositIntent(
          releaseOpts.stripe,
          releaseOpts.paymentIntentId,
          'date_overlap_precheck',
        )
      }
      return json(body, 409, origin)
    }
  }

  return null
}

async function loadPropertyServiceTier(admin, propertyId) {
  const { data, error } = await admin
    .from('properties')
    .select('service_tier')
    .eq('id', propertyId)
    .maybeSingle()
  if (error || !data) return null
  return isListingServiceTier(data.service_tier) ? 'listing' : 'managed'
}

/** Listing apply commit — no student PI, deposit, or rent_payment_method. */
async function handleListingBookingCommit(request, origin, body) {
  const deviceCtx = requestContextFromRequest(request)
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
  }

  const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : ''
  const moveInDate = typeof body.moveInDate === 'string' ? body.moveInDate.trim() : ''
  const leaseLength = typeof body.leaseLength === 'string' ? body.leaseLength.trim() : ''
  const studentMessage = typeof body.studentMessage === 'string' ? body.studentMessage.slice(0, 4000) : ''
  const bondAcknowledged = body.bondAcknowledged === true
  const propertyTypeRaw = typeof body.propertyType === 'string' ? body.propertyType.trim() : ''
  const propertyType = VALID_PROPERTY_TYPES.has(propertyTypeRaw) ? propertyTypeRaw : 'entire_property'
  const conversationIdHint =
    typeof body.conversationId === 'string' ? body.conversationId.trim() : ''

  const occupancyParsed = parseOccupancyScalarsFromBody(body)
  if (!occupancyParsed.ok) {
    return json(occupancyParsed.body, occupancyParsed.status, origin)
  }
  const { occupantCount, parkingSelected } = occupancyParsed

  if (!propertyId || !moveInDate || !leaseLength) {
    return json({ error: 'propertyId, moveInDate, and leaseLength are required' }, 400, origin)
  }
  if (!bondAcknowledged) {
    return json({ error: 'Bond acknowledgement is required' }, 400, origin)
  }

  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return json({ error: 'Missing authorization' }, 401, origin)
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser(token)

  if (userErr || !user) {
    return json({ error: 'Invalid or expired session' }, 401, origin)
  }

  const attemptId = readAttemptIdFromBody(body)
  const admin = createClient(supabaseUrl, serviceRole)
  recordBookingSubmitAttempt(admin, user, propertyId, 'listing_commit', attemptId, null, deviceCtx)

  const emailBlock = assertRenterEmailConfirmed(
    user,
    json,
    origin,
    buildBookingRejectVisibility(user, propertyId, 'listing_commit', { attempt_id: attemptId, ...deviceCtx }),
  )
  if (emailBlock) return emailBlock

  // Booking eligibility (verification_type × open_to_non_students). Visibility / abandoned-bookings logging hooks here.
  const eligibilityBlock = await assertRenterEligibleForBooking(
    admin,
    user.id,
    propertyId,
    json,
    origin,
    buildBookingRejectVisibility(user, propertyId, 'listing_commit', { attempt_id: attemptId, ...deviceCtx }),
  )
  if (eligibilityBlock) return eligibilityBlock

  const { data: student, error: stErr } = await admin
    .from('student_profiles')
    .select('id, user_id, email, full_name, first_name, last_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (stErr || !student) {
    return json({ error: 'Student profile not found' }, 404, origin)
  }

  const coTenantResolved = resolveCoTenantForCommit(occupantCount, body.coTenant ?? body.co_tenant, {
    primaryTenantEmail: student.email,
  })
  if (!coTenantResolved.ok) {
    return json(coTenantResolved.body, coTenantResolved.status, origin)
  }
  const coTenant = coTenantResolved.coTenant

  const listingVis = buildBookingRejectVisibility(user, propertyId, 'listing_commit', {
    attempt_id: attemptId,
    student_profile_id: student.id,
    email: student.email ?? user.email ?? null,
    ...deviceCtx,
  })

  const block1 = await assertPropertyAvailableForBooking(admin, propertyId, origin)
  const blocked1 = await rejectIfBlocked(block1, listingVis, 'property_unavailable')
  if (blocked1) return blocked1
  const block2 = await assertStudentPipelineFree(admin, student.id, propertyId, origin)
  const blocked2 = await rejectIfBlocked(block2, listingVis, 'duplicate_booking')
  if (blocked2) return blocked2
  const block3 = await assertNoCrossPropertyDateOverlap(
    admin,
    student.id,
    propertyId,
    moveInDate,
    leaseLength,
    origin,
  )
  const blocked3 = await rejectIfBlocked(block3, listingVis, 'date_overlap')
  if (blocked3) return blocked3

  const { data: property, error: propErr } = await admin
    .from('properties')
    .select(
      `id, title, landlord_id, status, suburb, state, property_type, is_registered_rooming_house, service_tier, available_from, ${OCCUPANCY_PROPERTY_COLUMNS}`,
    )
    .eq('id', propertyId)
    .maybeSingle()

  if (propErr || !property) {
    return json({ error: 'Property not found' }, 404, origin)
  }

  const moveInFloorErr = moveInFloorError(moveInDate, property.available_from)
  if (moveInFloorErr) {
    return json({ error: moveInFloorErr }, 400, origin)
  }

  if (!isListingServiceTier(property.service_tier)) {
    return json({ error: 'This property requires a deposit authorization' }, 400, origin)
  }

  if (property.status !== 'active') {
    await captureBookingRejected({
      ...listingVis,
      service_tier: property.service_tier ?? null,
      error_code: 'property_unavailable',
      http_status: 409,
    })
    return json(
      {
        error: 'property_unavailable',
        message: 'This property is no longer available.',
      },
      409,
      origin,
    )
  }

  const rentResolved = resolveWeeklyRentForBooking(property, { occupantCount, parkingSelected })
  if (!rentResolved.ok) {
    return json(rentResolved.body, rentResolved.status, origin)
  }
  const { weeklyRent: listingWeeklyRent, breakdownAud: listingBreakdownAud } = rentResolved.resolved
  void listingWeeklyRent
  void listingBreakdownAud

  const tenantInvite = await fetchPendingTenantInviteForBooking(
    admin,
    readTenantInviteTokenFromBody(body),
    propertyId,
  )

  const offerApplied = applyTenantInviteRentOffer(
    rentResolved.resolved,
    property,
    tenantInvite,
    moveInDate,
  )
  if (!offerApplied.ok) {
    return json(
      { error: offerApplied.error, message: offerApplied.message },
      offerApplied.status,
      origin,
    )
  }

  const { weeklyRent, breakdownAud, bondAmount } = offerApplied
  const tenantInviteId = tenantInvite?.id ?? null

  const tierContext = await fetchServiceTierResolverContext(admin)

  const serviceTierAtRequest = computeServiceTierAtRequestSnapshot({
    state: property.state,
    propertyType: property.property_type,
    isRegisteredRoomingHouse: property.is_registered_rooming_house,
    moduleEnabled: tierContext.moduleEnabled,
    managedGloballyEnabled: tierContext.managedGloballyEnabled,
    managedOverrides: tierContext.managedOverrides,
    propertyServiceTier: property.service_tier,
  })

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  const endDate = leaseEndDateIso(moveInDate, leaseLength)

  const row = buildListingApplyBookingRow({
    property,
    student,
    moveInDate,
    leaseLength,
    studentMessage,
    propertyType,
    occupantCount,
    parkingSelected,
    weeklyRent,
    breakdownAud,
    coTenant,
    serviceTierAtRequest,
    expiresAt,
    endDate,
    tenantInviteId,
    bondAmount,
  })

  const { data: inserted, error: insErr } = await admin.from('bookings').insert(row).select('id, student_id').single()

  if (!insErr && inserted?.id) {
    if (tenantInviteId) {
      await markTenantInviteAccepted(admin, tenantInviteId, student.id, inserted.id)
    }
    if (offerApplied.inviteOfferApplied && tenantInvite) {
      try {
        await insertRentInviteOfferAppliedEvent(admin, {
          booking: { id: inserted.id, property_id: propertyId, student_id: student.id },
          property,
          invite: tenantInvite,
          landlordProfileId: tenantInvite.landlord_id,
          studentId: student.id,
          metadata: {
            listing_weekly_rent_aud: offerApplied.listingWeeklyRentAud,
            offered_weekly_rent_aud: offerApplied.offeredWeeklyRentAud,
            applied_weekly_rent_aud: weeklyRent,
            bond_amount_aud: bondAmount,
            offer_reason: offerApplied.offerReason || null,
          },
        })
      } catch (evErr) {
        console.error('[listing-apply] rent_invite_offer_applied audit', evErr)
        await admin.from('bookings').delete().eq('id', inserted.id)
        if (tenantInviteId) {
          await admin
            .from('tenant_invites')
            .update({
              status: 'pending',
              accepted_by: null,
              accepted_booking_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', tenantInviteId)
            .eq('status', 'accepted')
        }
        return json(
          {
            error: 'audit_failed',
            message: 'Booking was not saved because the compliance audit record failed.',
          },
          500,
          origin,
        )
      }
    }
    try {
      await attachBookingToConversationOnCreate(admin, {
        bookingId: inserted.id,
        propertyId: property.id,
        tenantUserId: student.user_id,
        tenantProfileId: student.id,
        conversationIdHint: conversationIdHint || null,
      })
    } catch (e) {
      console.error('[booking] attach conversation', e)
    }
    recordBookingCompleted(
      admin,
      user,
      propertyId,
      'listing_commit',
      attemptId,
      inserted.id,
      property.service_tier ?? null,
      deviceCtx,
    )
    return json({ ok: true, bookingId: inserted.id, listingApply: true }, 200, origin)
  }

  if (!isUniqueViolation(insErr)) {
    console.error('listing booking insert', insErr)
    return json({ error: insErr?.message || 'Could not save booking' }, 500, origin)
  }

  await captureBookingRejected({
    ...listingVis,
    service_tier: property.service_tier ?? null,
    error_code: 'race_condition',
    http_status: 409,
  })

  return json(
    {
      error: 'race_condition',
      message: 'Sorry, this property was just booked by another student. Please try again.',
    },
    409,
    origin,
  )
}

async function handlePaymentIntentCommit(request, origin, body) {
  const deviceCtx = requestContextFromRequest(request)
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!stripeSecret || !supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
  }

  const paymentIntentId =
    typeof body.paymentIntentId === 'string' ? body.paymentIntentId.trim() : ''
  const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : ''
  const moveInDate = typeof body.moveInDate === 'string' ? body.moveInDate.trim() : ''
  const leaseLength = typeof body.leaseLength === 'string' ? body.leaseLength.trim() : ''
  const studentMessage = typeof body.studentMessage === 'string' ? body.studentMessage.slice(0, 4000) : ''
  const bondAcknowledged = body.bondAcknowledged === true
  const propertyTypeRaw = typeof body.propertyType === 'string' ? body.propertyType.trim() : ''
  const propertyType = VALID_PROPERTY_TYPES.has(propertyTypeRaw) ? propertyTypeRaw : 'entire_property'
  const rentPaymentMethodRaw =
    typeof body.rentPaymentMethod === 'string' ? body.rentPaymentMethod.trim() : ''
  const rentPaymentMethod =
    rentPaymentMethodRaw === 'bank_transfer' || rentPaymentMethodRaw === 'quni_platform'
      ? rentPaymentMethodRaw
      : null
  const conversationIdHint =
    typeof body.conversationId === 'string' ? body.conversationId.trim() : ''

  const occupancyParsed = parseOccupancyScalarsFromBody(body)
  if (!occupancyParsed.ok) {
    return json(occupancyParsed.body, occupancyParsed.status, origin)
  }
  const { occupantCount, parkingSelected } = occupancyParsed

  if (!paymentIntentId || !propertyId || !moveInDate || !leaseLength) {
    return json({ error: 'paymentIntentId, propertyId, moveInDate, and leaseLength are required' }, 400, origin)
  }
  if (!bondAcknowledged) {
    return json({ error: 'Bond acknowledgement is required' }, 400, origin)
  }
  if (!rentPaymentMethod) {
    return json(
      { error: 'rentPaymentMethod is required and must be bank_transfer or quni_platform' },
      400,
      origin,
    )
  }

  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return json({ error: 'Missing authorization' }, 401, origin)
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser(token)

  if (userErr || !user) {
    return json({ error: 'Invalid or expired session' }, 401, origin)
  }

  const attemptId = readAttemptIdFromBody(body)
  const admin = createClient(supabaseUrl, serviceRole)
  recordBookingSubmitAttempt(admin, user, propertyId, 'managed_commit', attemptId, null, deviceCtx)

  const emailBlockManaged = assertRenterEmailConfirmed(
    user,
    json,
    origin,
    buildBookingRejectVisibility(user, propertyId, 'managed_commit', { attempt_id: attemptId, ...deviceCtx }),
  )
  if (emailBlockManaged) return emailBlockManaged

  const eligibilityBlockManaged = await assertRenterEligibleForBooking(
    admin,
    user.id,
    propertyId,
    json,
    origin,
    buildBookingRejectVisibility(user, propertyId, 'managed_commit', { attempt_id: attemptId, ...deviceCtx }),
  )
  if (eligibilityBlockManaged) return eligibilityBlockManaged

  const stripe = new Stripe(stripeSecret)

  const { data: student, error: stErr } = await admin
    .from('student_profiles')
    .select('id, user_id, email, full_name, first_name, last_name, stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (stErr || !student) {
    return json({ error: 'Student profile not found' }, 404, origin)
  }

  const coTenantResolved = resolveCoTenantForCommit(occupantCount, body.coTenant ?? body.co_tenant, {
    primaryTenantEmail: student.email,
  })
  if (!coTenantResolved.ok) {
    return json(coTenantResolved.body, coTenantResolved.status, origin)
  }
  const coTenant = coTenantResolved.coTenant

  const managedVis = buildBookingRejectVisibility(user, propertyId, 'managed_commit', {
    attempt_id: attemptId,
    student_profile_id: student.id,
    email: student.email ?? user.email ?? null,
    ...deviceCtx,
  })

  const block1 = await assertPropertyAvailableForBooking(admin, propertyId, origin)
  if (block1) {
    await releaseAuthorisedDepositIntent(stripe, paymentIntentId, 'property_unavailable_precheck', managedVis)
    const blocked1 = await rejectIfBlocked(block1, managedVis, 'property_unavailable')
    if (blocked1) return blocked1
  }
  const block2 = await assertStudentPipelineFree(admin, student.id, propertyId, origin)
  if (block2) {
    await releaseAuthorisedDepositIntent(stripe, paymentIntentId, 'duplicate_booking_precheck', managedVis)
    const blocked2 = await rejectIfBlocked(block2, managedVis, 'duplicate_booking')
    if (blocked2) return blocked2
  }
  const block3 = await assertNoCrossPropertyDateOverlap(
    admin,
    student.id,
    propertyId,
    moveInDate,
    leaseLength,
    origin,
    { stripe, paymentIntentId },
  )
  if (block3) {
    const blocked3 = await rejectIfBlocked(block3, managedVis, 'date_overlap')
    if (blocked3) return blocked3
  }

  const { data: property, error: propErr } = await admin
    .from('properties')
    .select(
      `id, title, landlord_id, status, suburb, state, property_type, is_registered_rooming_house, service_tier, available_from, ${OCCUPANCY_PROPERTY_COLUMNS}`,
    )
    .eq('id', propertyId)
    .maybeSingle()

  if (propErr || !property) {
    return json({ error: 'Property not found' }, 404, origin)
  }

  const moveInFloorErrManaged = moveInFloorError(moveInDate, property.available_from)
  if (moveInFloorErrManaged) {
    await releaseAuthorisedDepositIntent(stripe, paymentIntentId, 'invalid_move_in_date', managedVis)
    return json({ error: moveInFloorErrManaged }, 400, origin)
  }

  if (property.status !== 'active') {
    await releaseAuthorisedDepositIntent(stripe, paymentIntentId, 'property_not_active', managedVis)
    await captureBookingRejected({
      ...managedVis,
      service_tier: property.service_tier ?? null,
      error_code: 'property_unavailable',
      http_status: 409,
    })
    return json(
      {
        error: 'property_unavailable',
        message: 'This property is no longer available.',
      },
      409,
      origin,
    )
  }

  if (isListingServiceTier(property.service_tier)) {
    await releaseAuthorisedDepositIntent(stripe, paymentIntentId, 'listing_property_managed_commit')
    return json({ error: 'This Listing property does not use a deposit authorization' }, 400, origin)
  }

  const rentResolved = resolveWeeklyRentForBooking(property, { occupantCount, parkingSelected })
  if (!rentResolved.ok) {
    await releaseAuthorisedDepositIntent(stripe, paymentIntentId, 'invalid_rent_commit')
    return json(rentResolved.body, rentResolved.status, origin)
  }
  const { weeklyRent, weeklyRentCents, breakdownAud } = rentResolved.resolved
  const depositCents = weeklyRentCents

  let pi
  try {
    pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch (e) {
    console.error('retrieve PI commit', e)
    return json({ error: 'Invalid payment' }, 400, origin)
  }

  const meta = pi.metadata || {}
  const metaStudent = typeof meta.studentProfileId === 'string' ? meta.studentProfileId.trim() : ''
  const metaProperty = typeof meta.propertyId === 'string' ? meta.propertyId.trim() : ''
  if (metaStudent !== student.id || metaProperty !== propertyId) {
    return json({ error: 'Payment does not match this listing' }, 400, origin)
  }

  const customerOk =
    typeof student.stripe_customer_id === 'string' &&
    student.stripe_customer_id.trim() &&
    pi.customer === student.stripe_customer_id.trim()
  if (!customerOk) {
    return json({ error: 'Payment does not match your account' }, 400, origin)
  }

  if (pi.status !== 'requires_capture' && pi.status !== 'succeeded') {
    return json({ error: `Payment is not authorised (status: ${pi.status})` }, 400, origin)
  }

  const metaMatch = assertPiMetadataMatchesOccupancy(meta, {
    occupantCount,
    parkingSelected,
    weeklyRentCents,
    depositCents,
  })
  if (!metaMatch.ok) {
    await releaseAuthorisedDepositIntent(stripe, paymentIntentId, 'pi_occupancy_mismatch')
    return json(metaMatch.body, 400, origin)
  }

  let pricingCell
  try {
    pricingCell = await getActivePricingSnapshotForProperty(
      property.id,
      property.service_tier === 'listing' ? 'listing' : 'managed',
    )
  } catch (e) {
    console.error('load pricing for booking commit', e)
    return json({ error: 'Could not resolve pricing for booking' }, 500, origin)
  }
  const bookingFeeCents = await calculateBookingFeeCents(pricingCell, depositCents, 1, {
    admin,
    landlordProfileId: property.landlord_id,
  })

  const expectedAmountCents = bookingFeeCents > 0 ? depositCents + bookingFeeCents : depositCents
  if (pi.amount !== expectedAmountCents) {
    await releaseAuthorisedDepositIntent(stripe, paymentIntentId, 'pi_amount_mismatch')
    return json(
      {
        error: 'payment_amount_mismatch',
        message: 'Payment amount does not match resolved weekly rent for this booking',
      },
      400,
      origin,
    )
  }

  const tierContext = await fetchServiceTierResolverContext(admin)

  const serviceTierAtRequest = computeServiceTierAtRequestSnapshot({
    state: property.state,
    propertyType: property.property_type,
    isRegisteredRoomingHouse: property.is_registered_rooming_house,
    moduleEnabled: tierContext.moduleEnabled,
    managedGloballyEnabled: tierContext.managedGloballyEnabled,
    managedOverrides: tierContext.managedOverrides,
    propertyServiceTier: property.service_tier,
  })

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  const endDate = leaseEndDateIso(moveInDate, leaseLength)

  const bondAmount = bondAmountAtApplyFromProperty(property, weeklyRent)

  const row = {
    property_id: property.id,
    student_id: student.id,
    landlord_id: property.landlord_id,
    start_date: moveInDate,
    move_in_date: moveInDate,
    end_date: endDate,
    weekly_rent: weeklyRent,
    ...(bondAmount != null ? { bond_amount: bondAmount } : {}),
    status: 'pending_confirmation',
    notes: null,
    student_message: studentMessage.trim() || null,
    lease_length: leaseLength,
    bond_acknowledged: true,
    stripe_payment_intent_id: paymentIntentId,
    deposit_amount: depositCents,
    platform_fee_amount: bookingFeeCents,
    booking_fee_paid: true,
    property_type: propertyType,
    rent_payment_method: rentPaymentMethod,
    expires_at: expiresAt,
    occupant_count: occupantCount,
    parking_selected: parkingSelected,
    rent_breakdown: breakdownAud,
    co_tenant: coTenant,
    housemates_count: housematesCountFromOccupantCount(occupantCount),
    ...(serviceTierAtRequest ? { service_tier_at_request: serviceTierAtRequest } : {}),
  }

  const { data: inserted, error: insErr } = await admin.from('bookings').insert(row).select('id').single()

  if (!insErr && inserted?.id) {
    try {
      await attachBookingToConversationOnCreate(admin, {
        bookingId: inserted.id,
        propertyId: property.id,
        tenantUserId: student.user_id,
        tenantProfileId: student.id,
        conversationIdHint: conversationIdHint || null,
      })
    } catch (e) {
      console.error('[booking] attach conversation', e)
    }
    recordBookingCompleted(
      admin,
      user,
      propertyId,
      'managed_commit',
      attemptId,
      inserted.id,
      property.service_tier ?? null,
      deviceCtx,
    )
    return json({ ok: true, bookingId: inserted.id }, 200, origin)
  }

  if (!isUniqueViolation(insErr)) {
    console.error('booking insert', insErr)
    return json({ error: insErr?.message || 'Could not save booking' }, 500, origin)
  }

  let piAfter
  try {
    piAfter = await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch (e) {
    console.error('race handler retrieve PI', e)
    piAfter = pi
  }

  const st = piAfter.status
  try {
    if (st === 'requires_capture' || st === 'requires_confirmation') {
      await stripe.paymentIntents.cancel(paymentIntentId)
    } else if (st === 'succeeded') {
      await stripe.refunds.create({ payment_intent: paymentIntentId })
    }
  } catch (stripeErr) {
    console.error('race handler stripe cleanup', stripeErr)
    await captureBookingRejected({
      ...managedVis,
      service_tier: property.service_tier ?? null,
      error_code: 'race_stripe_cleanup_failed',
      http_status: 500,
      paymentIntentId,
      piStatus: st,
      stripeErr: stripeErr instanceof Error ? stripeErr.message : String(stripeErr),
    })
  }

  await captureBookingRejected({
    ...managedVis,
    service_tier: property.service_tier ?? null,
    error_code: 'race_condition',
    http_status: 409,
    paymentIntentId,
    supabaseMessage: insErr?.message,
    piStatusAfter: st,
  })

  return json(
    {
      error: 'race_condition',
      message:
        'Sorry, this property was just booked by another student. Your payment has been cancelled and you will not be charged.',
    },
    409,
    origin,
  )
}

export default async function handler(request) {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400, origin)
  }

  if (body && body.commit === true) {
    const commitPropertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : ''
    if (commitPropertyId) {
      const supabaseUrlPeek = process.env.SUPABASE_URL
      const serviceRolePeek = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (supabaseUrlPeek && serviceRolePeek) {
        const adminPeek = createClient(supabaseUrlPeek, serviceRolePeek)
        const tier = await loadPropertyServiceTier(adminPeek, commitPropertyId)
        if (tier === 'listing') {
          return handleListingBookingCommit(request, origin, body)
        }
      }
    }
    return handlePaymentIntentCommit(request, origin, body)
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!stripeSecret || !supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
  }

  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return json({ error: 'Missing authorization' }, 401, origin)
  }

  const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : ''
  const moveInDate = typeof body.moveInDate === 'string' ? body.moveInDate.trim() : ''
  const leaseLength = typeof body.leaseLength === 'string' ? body.leaseLength.trim() : ''
  const studentMessage = typeof body.studentMessage === 'string' ? body.studentMessage.slice(0, 4000) : ''
  const bondAcknowledged = body.bondAcknowledged === true

  if (!propertyId || !moveInDate || !leaseLength) {
    return json({ error: 'propertyId, moveInDate, and leaseLength are required' }, 400, origin)
  }
  if (!bondAcknowledged) {
    return json({ error: 'Bond acknowledgement is required' }, 400, origin)
  }

  const occupancyParsed = parseOccupancyScalarsFromBody(body)
  if (!occupancyParsed.ok) {
    return json(occupancyParsed.body, occupancyParsed.status, origin)
  }
  const { occupantCount, parkingSelected } = occupancyParsed

  const supabaseAuth = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser(token)

  if (userErr || !user) {
    return json({ error: 'Invalid or expired session' }, 401, origin)
  }

  const deviceCtx = requestContextFromRequest(request)
  const attemptId = readAttemptIdFromBody(body)
  const admin = createClient(supabaseUrl, serviceRole)
  recordBookingSubmitAttempt(admin, user, propertyId, 'preview', attemptId, null, deviceCtx)

  const emailBlockPreview = assertRenterEmailConfirmed(
    user,
    json,
    origin,
    buildBookingRejectVisibility(user, propertyId, 'preview', { attempt_id: attemptId, ...deviceCtx }),
  )
  if (emailBlockPreview) return emailBlockPreview

  const eligibilityBlockPreview = await assertRenterEligibleForBooking(
    admin,
    user.id,
    propertyId,
    json,
    origin,
    buildBookingRejectVisibility(user, propertyId, 'preview', { attempt_id: attemptId, ...deviceCtx }),
  )
  if (eligibilityBlockPreview) return eligibilityBlockPreview

  const { data: student, error: stErr } = await admin
    .from('student_profiles')
    .select('id, user_id, email, full_name, first_name, last_name, stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (stErr || !student) {
    return json({ error: 'Student profile not found' }, 404, origin)
  }

  const previewVis = buildBookingRejectVisibility(user, propertyId, 'preview', {
    attempt_id: attemptId,
    student_profile_id: student.id,
    email: student.email ?? user.email ?? null,
    ...deviceCtx,
  })

  const blockA = await assertPropertyAvailableForBooking(admin, propertyId, origin)
  const blockedA = await rejectIfBlocked(blockA, previewVis, 'property_unavailable')
  if (blockedA) return blockedA
  const blockB = await assertStudentPipelineFree(admin, student.id, propertyId, origin)
  const blockedB = await rejectIfBlocked(blockB, previewVis, 'duplicate_booking')
  if (blockedB) return blockedB
  const blockC = await assertNoCrossPropertyDateOverlap(
    admin,
    student.id,
    propertyId,
    moveInDate,
    leaseLength,
    origin,
  )
  const blockedC = await rejectIfBlocked(blockC, previewVis, 'date_overlap')
  if (blockedC) return blockedC

  const { data: landlordSelf } = await admin.from('landlord_profiles').select('id').eq('user_id', user.id).maybeSingle()

  const { data: property, error: propErr } = await admin
    .from('properties')
    .select(
      `
      id,
      title,
      landlord_id,
      status,
      suburb,
      state,
      property_type,
      is_registered_rooming_house,
      service_tier,
      available_from,
      ${OCCUPANCY_PROPERTY_COLUMNS},
      landlord_profiles (
        id,
        stripe_connect_account_id,
        stripe_charges_enabled,
        email,
        full_name
      )
    `,
    )
    .eq('id', propertyId)
    .maybeSingle()

  if (propErr || !property) {
    return json({ error: 'Property not found' }, 404, origin)
  }

  if (property.status !== 'active') {
    return json({ error: 'This listing is not available for booking' }, 400, origin)
  }

  const moveInFloorErrPreview = moveInFloorError(moveInDate, property.available_from)
  if (moveInFloorErrPreview) {
    return json({ error: moveInFloorErrPreview }, 400, origin)
  }

  if (!property.landlord_id) {
    return json({ error: 'This listing has no host on file' }, 400, origin)
  }

  if (landlordSelf?.id && landlordSelf.id === property.landlord_id) {
    return json({ error: 'You cannot book your own listing' }, 400, origin)
  }

  const lp = property.landlord_profiles
  const propertyServiceTier = isListingServiceTier(property.service_tier) ? 'listing' : 'managed'

  const rentResolved = resolveWeeklyRentForBooking(property, { occupantCount, parkingSelected })
  if (!rentResolved.ok) {
    return json(rentResolved.body, rentResolved.status, origin)
  }

  if (propertyServiceTier === 'listing') {
    const tenantInvite = await fetchPendingTenantInviteForBooking(
      admin,
      readTenantInviteTokenFromBody(body),
      propertyId,
    )
    const offerApplied = applyTenantInviteRentOffer(
      rentResolved.resolved,
      property,
      tenantInvite,
      moveInDate,
    )
    if (!offerApplied.ok) {
      return json(
        { error: offerApplied.error, message: offerApplied.message },
        offerApplied.status,
        origin,
      )
    }
    const weeklyRentCents = Math.round(offerApplied.weeklyRent * 100)
    return json(
      {
        listingApply: true,
        weeklyRent: offerApplied.weeklyRent,
        weeklyRentCents,
        breakdownAud: offerApplied.breakdownAud,
        listingWeeklyRent: rentResolved.resolved.weeklyRent,
        inviteOffer: offerApplied.inviteOfferApplied
          ? {
              offeredWeeklyRent: offerApplied.offeredWeeklyRentAud,
              offerReason: offerApplied.offerReason || null,
            }
          : null,
        bondAmountAud: offerApplied.bondAmount,
        occupantCount,
        parkingSelected,
      },
      200,
      origin,
    )
  }

  if (propertyServiceTier === 'managed' && (!lp?.stripe_connect_account_id || !lp.stripe_charges_enabled)) {
    return json(
      {
        error: 'stripe_not_ready',
        message:
          'This host has not finished connecting their payout account yet. Try again once they have linked their bank in Stripe.',
      },
      400,
      origin,
    )
  }

  const { weeklyRent, weeklyRentCents, breakdownAud } = rentResolved.resolved
  const depositCents = weeklyRentCents

  let pricingCell
  try {
    pricingCell = await getActivePricingSnapshotForProperty(property.id, propertyServiceTier)
  } catch (e) {
    console.error('load pricing for booking PI', e)
    return json({ error: 'Could not resolve pricing for booking' }, 500, origin)
  }
  const bookingFeeCents = await calculateBookingFeeCents(pricingCell, depositCents, 1, {
    admin,
    landlordProfileId: property.landlord_id,
  })
  const amountCents = bookingFeeCents > 0 ? depositCents + bookingFeeCents : depositCents

  const stripe = new Stripe(stripeSecret)

  let customerId = student.stripe_customer_id?.trim() || null
  if (!customerId) {
    const email =
      (typeof student.email === 'string' && student.email.includes('@') && student.email) ||
      (typeof user.email === 'string' && user.email) ||
      undefined
    const name =
      (typeof student.full_name === 'string' && student.full_name.trim()) ||
      [student.first_name, student.last_name].filter(Boolean).join(' ').trim() ||
      undefined

    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: {
        student_profile_id: student.id,
        supabase_user_id: user.id,
      },
    })
    customerId = customer.id
    await admin.from('student_profiles').update({ stripe_customer_id: customerId }).eq('id', student.id)
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'aud',
    capture_method: 'manual',
    customer: customerId,
    setup_future_usage: 'off_session',
    automatic_payment_methods: { enabled: true },
    metadata: {
      bookingType: 'deposit',
      propertyId: property.id,
      studentProfileId: student.id,
      landlordProfileId: property.landlord_id,
      moveInDate,
      leaseLength,
      occupantCount: String(occupantCount),
      parkingSelected: parkingSelected ? 'true' : 'false',
      weeklyRentCents: String(weeklyRentCents),
      depositCents: String(depositCents),
      bookingFeeCents: String(bookingFeeCents),
      studentMessage: studentMessage ? studentMessage.slice(0, 500) : '',
    },
  })

  return json(
    {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amountCents,
      depositCents,
      bookingFeeCents,
      weeklyRent,
      weeklyRentCents,
      breakdownAud,
      occupantCount,
      parkingSelected,
    },
    200,
    origin,
  )
}
