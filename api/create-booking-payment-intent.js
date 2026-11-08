/**
 * Student booking apply.
 *
 * Listing: preview and commit insert a request. No renter PaymentIntent, deposit, bond, or rent charge.
 * Any other tier, including Managed, is refused. Rent is paid to the landlord.
 *
 * POST JSON (preview or commit): {
 *   commit?: true, propertyId, moveInDate, leaseLength, studentMessage?, bondAcknowledged,
 *   listingAcknowledged, propertyType?, conversationId?, occupantCount?, parkingSelected?,
 *   coTenant?: { full_name, email, phone, date_of_birth }
 * }
 *
 * Authorization: Bearer <Supabase access_token>
 */
import { createClient } from '@supabase/supabase-js'
import {
  buildBookingRejectVisibility,
  captureBookingRejected,
  captureBookingRejectedResponse,
  recordJourneyEvent,
} from './lib/booking/captureBookingRejected.js'
import { readAttemptIdFromBody } from './lib/journey/insertJourneyEvent.js'
import { mergeDeviceContextMetadata, requestContextFromRequest } from './lib/journey/requestContext.js'
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
  OCCUPANCY_PROPERTY_COLUMNS,
  parseOccupancyScalarsFromBody,
  housematesCountFromOccupantCount,
  resolveCoTenantForCommit,
  resolveWeeklyRentForBooking,
} from './lib/booking/occupancyBooking.js'
import { TENANT_BOOKING_PIPELINE_STATUSES } from './lib/booking/tenantBookingPipelineStatuses.js'
import { checkPropertyAvailableForNewApplication } from './lib/booking/propertyAvailability.js'
import { assertNoPropertyGroupDoubleHold } from './lib/booking/termination/propertyGroupOverlap.js'
import {
  buildListingAcknowledgmentColumns,
  buildListingApplyBookingRow,
  isListingServiceTier,
  LISTING_SNAPSHOT_PROPERTY_COLUMNS,
} from './lib/booking/listingBookingApply.js'
import { landlordResponseExpiresAtIso } from './lib/booking/landlordResponseExpiry.js'
import { attachBookingToConversationOnCreate } from './lib/messaging/bookingConversation.js'
import { isQldRoomingArrangement, resolveTenancyPackage } from './lib/resolveTenancyPackage.js'
import { parseQldResidentNoticeConsentBody } from './lib/tenancy/qldNoticeConsent.js'
import { qldNoticeConsentFieldError } from './lib/tenancy/qldRoomingListingFields.js'
import { recordQldNoticeConsentEvents } from './lib/tenancy/recordQldNoticeConsent.js'

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

function recordBookingCompleted(admin, user, propertyId, mode, attemptId, bookingId, serviceTier, deviceCtx, extraMeta) {
  recordJourneyEvent(admin, {
    ...journeyActor(user, attemptId),
    property_id: propertyId,
    event_type: 'booking_completed',
    step: mode,
    service_tier: serviceTier ?? null,
    metadata: mergeDeviceContextMetadata(
      { booking_id: bookingId, ...(extraMeta && typeof extraMeta === 'object' ? extraMeta : {}) },
      deviceCtx,
    ),
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

async function assertStudentPropertyGroupFree(admin, studentId, propertyId, moveInDate, origin) {
  const newStart =
    typeof moveInDate === 'string' && moveInDate.trim()
      ? moveInDate.trim().slice(0, 10)
      : null
  const result = await assertNoPropertyGroupDoubleHold({
    admin,
    studentId,
    propertyId,
    newStartDate: newStart,
  })
  if (result.ok) return null
  return json(
    {
      error: result.code || 'property_group_double_hold',
      message: result.message,
      conflicting_booking_id: result.conflictingBookingId,
    },
    result.status,
    origin,
  )
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

/** Listing apply commit - no student PI, deposit, or rent_payment_method. */
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
  const listingAcknowledged = body.listingAcknowledged === true
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
  if (!listingAcknowledged) {
    return json({ error: 'Listing acknowledgement is required' }, 400, origin)
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
  const block2b = await assertStudentPropertyGroupFree(
    admin,
    student.id,
    propertyId,
    moveInDate,
    origin,
  )
  const blocked2b = await rejectIfBlocked(block2b, listingVis, 'property_group_double_hold')
  if (blocked2b) return blocked2b
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
      `id, title, landlord_id, status, suburb, state, property_type, is_registered_rooming_house, rooms_rented_to_residents, service_tier, available_from, ${OCCUPANCY_PROPERTY_COLUMNS}, ${LISTING_SNAPSHOT_PROPERTY_COLUMNS}`,
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
    roomsRentedToResidents: property.rooms_rented_to_residents,
    moduleEnabled: tierContext.moduleEnabled,
    managedGloballyEnabled: tierContext.managedGloballyEnabled,
    managedOverrides: tierContext.managedOverrides,
    propertyServiceTier: property.service_tier,
  })

  const expiresAt = landlordResponseExpiresAtIso('listing')
  const endDate = leaseEndDateIso(moveInDate, leaseLength)

  let listingAcknowledgment
  try {
    listingAcknowledgment = await buildListingAcknowledgmentColumns(admin, property)
  } catch (snapErr) {
    console.error('[listing-apply] listing snapshot', snapErr)
    return json({ error: 'Could not capture listing acknowledgment snapshot' }, 500, origin)
  }

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
    listingAcknowledgment,
  })

  const qldRoomingPkg = resolveTenancyPackage({
    state: property.state ?? '',
    property_type: property.property_type ?? '',
    is_registered_rooming_house: Boolean(property.is_registered_rooming_house),
    rooms_rented_to_residents: property.rooms_rented_to_residents,
    shares_kitchen_or_bathroom: property.qld_shares_kitchen_or_bathroom,
  })
  const qldRoomingApply = isQldRoomingArrangement(qldRoomingPkg)
  const residentNotice = parseQldResidentNoticeConsentBody(body.qldResidentNoticeConsent)
  if (qldRoomingApply) {
    const noticeErr = residentNotice
      ? qldNoticeConsentFieldError(residentNotice, 'you (the resident)')
      : 'Say whether you may be given notices by email and by text message.'
    if (noticeErr) {
      return json({ error: 'qld_notice_consent_required', message: noticeErr }, 400, origin)
    }
  }

  const { data: inserted, error: insErr } = await admin.from('bookings').insert(row).select('id, student_id').single()

  if (!insErr && inserted?.id) {
    if (qldRoomingApply && residentNotice) {
      try {
        await recordQldNoticeConsentEvents(admin, {
          propertyId,
          party: 'resident',
          bookingId: inserted.id,
          desired: residentNotice,
          createdBy: user.id,
        })
      } catch (noticeErr) {
        console.error('[listing-apply] qld notice consent', noticeErr)
      }
    }
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
      {
        listing_acknowledged: true,
        listing_snapshot_hash: listingAcknowledgment.listing_snapshot_hash,
      },
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

  if (body && typeof body.rentPaymentMethod === 'string' && body.rentPaymentMethod.trim() === 'quni_platform') {
    return json(
      {
        error: 'managed_retired',
        message: 'Paying rent via Quni is no longer available. Rent is paid to the landlord.',
      },
      410,
      origin,
    )
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
        if (tier === 'managed') {
          return json(
            {
              error: 'managed_retired',
              message: 'Managed bookings are no longer available.',
            },
            410,
            origin,
          )
        }
      }
    }
    return json(
      {
        error: 'managed_retired',
        message: 'Managed bookings are no longer available. Rent is paid to the landlord.',
      },
      410,
      origin,
    )
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
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
  const blockBb = await assertStudentPropertyGroupFree(
    admin,
    student.id,
    propertyId,
    moveInDate,
    origin,
  )
  const blockedBb = await rejectIfBlocked(blockBb, previewVis, 'property_group_double_hold')
  if (blockedBb) return blockedBb
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

  const propertyServiceTier = isListingServiceTier(property.service_tier) ? 'listing' : 'managed'
  if (propertyServiceTier !== 'listing') {
    return json(
      {
        error: 'managed_retired',
        message: 'Managed bookings are no longer available.',
      },
      410,
      origin,
    )
  }

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

  return json(
    {
      error: 'managed_retired',
      message: 'Managed bookings are no longer available.',
    },
    410,
    origin,
  )
}
