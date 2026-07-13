// @ts-nocheck
/**
 * Landlord: update editable booking terms before any party signs (listing, audited).
 * POST JSON: { bookingId: string, patch: object, reason: string }
 */
import { createClient } from '@supabase/supabase-js'
import { headerString, readJsonBody } from './lib/nodeHandler.js'
import { buildBookingTermsPatch } from './lib/booking/bookingTermsUpdate.js'

export const config = { runtime: 'nodejs', maxDuration: 30 }

const TERMS_UPDATE_ALLOWED_STATUSES = ['pending_confirmation', 'awaiting_info', 'bond_pending']

const BOOKING_TERMS_UPDATE_EVENT = 'booking_terms_update'

function corsJson(res, body, status = 200, origin) {
  const allowOrigin = origin || '*'
  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  return res.status(status).json(body)
}

/**
 * @param {object} booking
 */
function isManagedBooking(booking) {
  return booking.service_tier_at_request === 'managed' || booking.service_tier_final === 'managed'
}

/**
 * @param {object} booking
 */
function isListingBookingTermsEligible(booking) {
  const status = typeof booking.status === 'string' ? booking.status : ''
  if (!TERMS_UPDATE_ALLOWED_STATUSES.includes(status)) return false
  if (booking.service_tier_at_request === 'listing') return true
  return status === 'bond_pending' && booking.service_tier_final === 'listing'
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} bookingId
 */
async function resolveLeaseDocumentForBooking(admin, bookingId) {
  const { data: tenancy, error: tErr } = await admin
    .from('tenancies')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle()

  if (tErr) {
    console.error('[booking-update-terms] tenancy lookup', tErr)
    throw new Error('tenancy_lookup_failed')
  }
  if (!tenancy?.id) {
    return { tenancyId: null, doc: null }
  }

  const { data: docRows, error: dErr } = await admin
    .from('tenancy_documents')
    .select(
      'id, tenancy_id, document_type, status, metadata, file_path, docuseal_submission_id, landlord_signed_at, student_signed_at, co_tenant_signed_at',
    )
    .eq('tenancy_id', tenancy.id)
    .in('document_type', ['residential_tenancy', 'lease'])

  if (dErr) {
    console.error('[booking-update-terms] tenancy_documents lookup', dErr)
    throw new Error('document_lookup_failed')
  }

  const doc =
    (docRows ?? []).find((d) => d.document_type === 'residential_tenancy') ??
    (docRows ?? []).find((d) => d.document_type === 'lease') ??
    null

  return { tenancyId: tenancy.id, doc }
}

/**
 * @param {{ landlord_signed_at?: unknown, student_signed_at?: unknown, co_tenant_signed_at?: unknown } | null | undefined} doc
 */
function anyPartySignedOnLeaseDoc(doc) {
  if (!doc) return false
  const set = (v) => Boolean(v && String(v).trim())
  return set(doc.landlord_signed_at) || set(doc.student_signed_at) || set(doc.co_tenant_signed_at)
}

/**
 * @param {Record<string, unknown>} original
 * @param {Record<string, unknown>} patch
 */
function revertBookingPatch(original, patch) {
  /** @type {Record<string, unknown>} */
  const revert = {}
  for (const key of Object.keys(patch)) {
    revert[key] = Object.prototype.hasOwnProperty.call(original, key) ? original[key] : null
  }
  return revert
}

/**
 * @param {Record<string, unknown>} bookingPatch
 */
function tenancySyncPatchFromBookingPatch(bookingPatch) {
  /** @type {Record<string, unknown>} */
  const out = {}
  if ('move_in_date' in bookingPatch || 'start_date' in bookingPatch) {
    out.start_date = bookingPatch.move_in_date ?? bookingPatch.start_date
  }
  if ('end_date' in bookingPatch) {
    out.end_date = bookingPatch.end_date
  }
  return out
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {object} args
 */
async function insertBookingTermsUpdateEvent(admin, args) {
  const { booking, property, landlordProfileId, studentId, metadata } = args
  const { error } = await admin.from('service_tier_events').insert({
    booking_id: booking.id,
    property_id: booking.property_id ?? property?.id ?? null,
    landlord_id: landlordProfileId,
    student_id: studentId ?? booking.student_id ?? null,
    event_type: BOOKING_TERMS_UPDATE_EVENT,
    service_tier: 'listing',
    metadata: {
      ...metadata,
      recorded_at: new Date().toISOString(),
    },
  })
  if (error) throw error
}

export default async function handler(req, res) {
  const origin = headerString(req.headers, 'origin') || '*'

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.setHeader('Access-Control-Max-Age', '86400')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return corsJson(res, { error: 'Method not allowed' }, 405, origin)
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return corsJson(res, { error: 'Server misconfigured' }, 500, origin)
  }

  const auth = headerString(req.headers, 'authorization')
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return corsJson(res, { error: 'Missing authorization' }, 401, origin)
  }

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return corsJson(res, { error: 'Invalid JSON' }, 400, origin)
  }

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  const patch = body.patch && typeof body.patch === 'object' && !Array.isArray(body.patch) ? body.patch : null

  if (!bookingId) {
    return corsJson(res, { error: 'bookingId is required' }, 400, origin)
  }
  if (!patch || Object.keys(patch).length === 0) {
    return corsJson(res, { error: 'patch is required' }, 400, origin)
  }
  if (reason.length < 3) {
    return corsJson(res, { error: 'reason is required (at least 3 characters)' }, 400, origin)
  }
  if (reason.length > 2000) {
    return corsJson(res, { error: 'reason is too long' }, 400, origin)
  }

  try {
    const supabaseAuth = createClient(supabaseUrl, anonKey)
    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser(token)

    if (userErr || !user) {
      return corsJson(res, { error: 'Invalid or expired session' }, 401, origin)
    }

    if (user.user_metadata?.role !== 'landlord') {
      return corsJson(res, { error: 'Only landlords can update booking terms' }, 403, origin)
    }

    const admin = createClient(supabaseUrl, serviceRole)

    const { data: landlord, error: llErr } = await admin
      .from('landlord_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (llErr || !landlord) {
      return corsJson(res, { error: 'Landlord profile not found' }, 404, origin)
    }

    const { data: booking, error: bErr } = await admin
      .from('bookings')
      .select(
        `
        id,
        property_id,
        student_id,
        landlord_id,
        status,
        service_tier_at_request,
        service_tier_final,
        weekly_rent,
        rent_breakdown,
        bond_amount,
        move_in_date,
        start_date,
        end_date,
        lease_length,
        notes,
        occupant_count,
        housemates_count,
        co_tenant,
        properties (
          id,
          bond,
          bond_weeks,
          state,
          property_type,
          is_registered_rooming_house
        )
      `,
      )
      .eq('id', bookingId)
      .maybeSingle()

    if (bErr || !booking) {
      return corsJson(res, { error: 'Booking not found' }, 404, origin)
    }

    if (booking.landlord_id !== landlord.id) {
      return corsJson(res, { error: 'Forbidden' }, 403, origin)
    }

    if (isManagedBooking(booking)) {
      return corsJson(
        res,
        {
          error: 'managed_booking',
          message: 'Booking term updates are not available for managed bookings.',
        },
        400,
        origin,
      )
    }

    if (!isListingBookingTermsEligible(booking)) {
      return corsJson(
        res,
        {
          error: 'invalid_booking_status',
          message: 'Booking terms can only be updated before signing on listing bookings.',
        },
        409,
        origin,
      )
    }

    const { data: student, error: spErr } = await admin
      .from('student_profiles')
      .select('email')
      .eq('id', booking.student_id)
      .maybeSingle()

    if (spErr) {
      console.error('[booking-update-terms] student profile', spErr)
      return corsJson(res, { error: 'Could not load student profile' }, 500, origin)
    }

    const primaryTenantEmail = typeof student?.email === 'string' ? student.email : null

    const property =
      booking.properties && typeof booking.properties === 'object' && !Array.isArray(booking.properties)
        ? booking.properties
        : {}

    let leaseCtx
    try {
      leaseCtx = await resolveLeaseDocumentForBooking(admin, bookingId)
    } catch {
      return corsJson(res, { error: 'Could not load tenancy agreement' }, 500, origin)
    }

    if (leaseCtx.doc) {
      const sid =
        typeof leaseCtx.doc.docuseal_submission_id === 'string'
          ? leaseCtx.doc.docuseal_submission_id.trim()
          : ''
      const unsigned =
        !anyPartySignedOnLeaseDoc(leaseCtx.doc) && Boolean(sid) && Boolean(leaseCtx.tenancyId)
      if (unsigned) {
        try {
          const { refreshUnsignedLeaseSignaturesFromDocuseal } = await import(
            './lib/docuseal/reconcileFromDocuseal.js'
          )
          const refreshed = await refreshUnsignedLeaseSignaturesFromDocuseal(admin, {
            ...leaseCtx.doc,
            tenancy_id: leaseCtx.tenancyId,
          })
          leaseCtx = { ...leaseCtx, doc: refreshed.doc }
        } catch (refreshErr) {
          console.error('[booking-update-terms] signature refresh', refreshErr)
          return corsJson(
            res,
            {
              error: 'signature_state_unavailable',
              message: 'Could not verify agreement signature state with DocuSeal. Try again shortly.',
            },
            503,
            origin,
          )
        }
      }
    }

    if (anyPartySignedOnLeaseDoc(leaseCtx.doc)) {
      return corsJson(
        res,
        {
          error: 'agreement_already_signed',
          message: 'Terms cannot be changed after a party has signed the tenancy agreement.',
        },
        409,
        origin,
      )
    }

    const built = await buildBookingTermsPatch(booking, patch, {
      property,
      primaryTenantEmail,
      landlordProfileId: landlord.id,
      reason,
    })

    if (built.errors.length > 0) {
      return corsJson(
        res,
        { error: 'validation_failed', messages: built.errors },
        400,
        origin,
      )
    }

    const bookingPatch = built.patch
    const revertBooking = revertBookingPatch(booking, bookingPatch)

    let tenancyBefore = null
    const tenancySyncPatch = leaseCtx.tenancyId ? tenancySyncPatchFromBookingPatch(bookingPatch) : {}
    if (leaseCtx.tenancyId && Object.keys(tenancySyncPatch).length > 0) {
      const { data: tenancyRow, error: tenancyLoadErr } = await admin
        .from('tenancies')
        .select('start_date, end_date')
        .eq('id', leaseCtx.tenancyId)
        .maybeSingle()
      if (tenancyLoadErr || !tenancyRow) {
        console.error('[booking-update-terms] tenancy preload', tenancyLoadErr)
        return corsJson(res, { error: 'Could not load tenancy' }, 500, origin)
      }
      tenancyBefore = tenancyRow
    }

    const { data: updated, error: upErr } = await admin
      .from('bookings')
      .update(bookingPatch)
      .eq('id', bookingId)
      .in('status', TERMS_UPDATE_ALLOWED_STATUSES)
      .select('id')
      .maybeSingle()

    if (upErr) {
      console.error('[booking-update-terms] booking update', upErr)
      return corsJson(res, { error: 'Could not update booking' }, 500, origin)
    }

    if (!updated) {
      return corsJson(
        res,
        {
          error: 'concurrent_update',
          message: 'Booking status changed; refresh and try again.',
        },
        409,
        origin,
      )
    }

    let tenancySynced = false
    if (leaseCtx.tenancyId && Object.keys(tenancySyncPatch).length > 0) {
      const { error: tenancyUpErr } = await admin
        .from('tenancies')
        .update(tenancySyncPatch)
        .eq('id', leaseCtx.tenancyId)
      if (tenancyUpErr) {
        console.error('[booking-update-terms] tenancy sync', tenancyUpErr)
        await admin.from('bookings').update(revertBooking).eq('id', bookingId)
        return corsJson(res, { error: 'Could not sync tenancy dates' }, 500, origin)
      }
      tenancySynced = true
    }

    let leaseAfter
    try {
      leaseAfter = await resolveLeaseDocumentForBooking(admin, bookingId)
    } catch {
      await admin.from('bookings').update(revertBooking).eq('id', bookingId)
      if (tenancySynced && tenancyBefore && leaseCtx.tenancyId) {
        await admin.from('tenancies').update(tenancyBefore).eq('id', leaseCtx.tenancyId)
      }
      return corsJson(res, { error: 'Could not verify agreement signature state' }, 500, origin)
    }

    if (anyPartySignedOnLeaseDoc(leaseAfter.doc)) {
      await admin.from('bookings').update(revertBooking).eq('id', bookingId)
      if (tenancySynced && tenancyBefore && leaseCtx.tenancyId) {
        await admin.from('tenancies').update(tenancyBefore).eq('id', leaseCtx.tenancyId)
      }
      return corsJson(
        res,
        {
          error: 'agreement_already_signed',
          message: 'Terms cannot be changed after a party has signed the tenancy agreement.',
        },
        409,
        origin,
      )
    }

    try {
      await insertBookingTermsUpdateEvent(admin, {
        booking,
        property,
        landlordProfileId: landlord.id,
        studentId: booking.student_id,
        metadata: {
          changes: built.changes,
          reason,
          actor_landlord_id: landlord.id,
          ...(built.co_tenant_unverified ? { co_tenant_unverified: true } : {}),
        },
      })
    } catch (evErr) {
      console.error('[booking-update-terms] audit event', evErr)
      await admin.from('bookings').update(revertBooking).eq('id', bookingId)
      if (tenancySynced && tenancyBefore && leaseCtx.tenancyId) {
        const { error: tenancyRevertErr } = await admin
          .from('tenancies')
          .update(tenancyBefore)
          .eq('id', leaseCtx.tenancyId)
        if (tenancyRevertErr) {
          console.error('[booking-update-terms] revert tenancy after audit failure', tenancyRevertErr)
        }
      }
      return corsJson(
        res,
        {
          error: 'audit_failed',
          message: 'Terms were not saved because the compliance audit record failed.',
        },
        500,
        origin,
      )
    }

    return corsJson(
      res,
      {
        ok: true,
        changes: built.changes,
        ...(built.co_tenant_unverified ? { co_tenant_unverified: true } : {}),
      },
      200,
      origin,
    )
  } catch (e) {
    console.error('[booking-update-terms]', e)
    return corsJson(res, { error: 'Server error' }, 500, origin)
  }
}
