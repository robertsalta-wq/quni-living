// @ts-nocheck
/**
 * Listing-tier document generation trigger.
 *
 * For Listing bookings the lease document goes through two phases:
 *   1. At landlord-confirm (status -> bond_pending): generate the PDF as a "preview" only,
 *      with `defer_signing: true`. No DocuSeal signing session is initiated yet.
 *   2. At mark-bond-received (status -> confirmed): re-trigger the same generator with
 *      `defer_signing: false`. The generator picks up the existing draft tenancy_document
 *      (status === 'draft', not yet sent_for_signing) and initiates DocuSeal signing.
 *
 * Consumer protection rationale (decision §4 of docs/phase-3-landlord-listing.md):
 * a renter must not be legally bound by a lease before they have paid bond direct to
 * the landlord. Preview-then-signable enforces that gate.
 */
import { resolveTenancyPackage, tenancyGeneratorToApiPath } from '../resolveTenancyPackage.js'

function internalApiOrigin() {
  const explicit = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || '').trim().replace(/\/$/, '')
  if (explicit.startsWith('http://') || explicit.startsWith('https://')) {
    return explicit
  }
  const vercel = (process.env.VERCEL_URL || '').trim().replace(/\/$/, '')
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, '')
    return `https://${host}`
  }
  return 'https://quni-living.vercel.app'
}

function internalPostHeaders(secret) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${secret}`,
    'X-Internal-Doc-Flow-Secret': secret,
  }
  const bypass = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim()
  if (bypass) {
    headers['x-vercel-protection-bypass'] = bypass
  }
  return headers
}

/**
 * Resolve the right document generator for a Listing booking and POST to it.
 * Returns `{ ok: true, skipped: true, reason }` for benign cases (missing config,
 * no property, unsupported tenancy package); `{ ok: true, status, body }` on success;
 * `{ ok: false, status, body }` on generator failure.
 */
export async function triggerListingDocumentGeneration(args) {
  const { admin, bookingId, deferSigning, logger } = args
  const log = logger ?? console

  const leaseFlowSecret = (process.env.INTERNAL_DOC_FLOW_SECRET || '').trim()
  if (!leaseFlowSecret) {
    log.warn('[trigger-listing-doc] skip: INTERNAL_DOC_FLOW_SECRET not set')
    return { ok: true, skipped: true, reason: 'no_internal_secret' }
  }

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      `
      id,
      property_id,
      move_in_date,
      properties ( state, property_type, is_registered_rooming_house )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr || !booking) {
    log.warn('[trigger-listing-doc] booking not found', bErr)
    return { ok: true, skipped: true, reason: 'booking_not_found' }
  }
  if (!booking.property_id) {
    log.warn('[trigger-listing-doc] booking missing property_id')
    return { ok: true, skipped: true, reason: 'no_property' }
  }

  const prop =
    booking.properties && typeof booking.properties === 'object' && !Array.isArray(booking.properties)
      ? booking.properties
      : {}

  const tenancyState = typeof prop.state === 'string' && prop.state.trim() ? prop.state.trim() : 'NSW'
  const propertyType = typeof prop.property_type === 'string' ? prop.property_type.trim() : ''
  const isRooming = Boolean(prop.is_registered_rooming_house)
  const moveIn = typeof booking.move_in_date === 'string' ? booking.move_in_date : undefined

  const tenancyPackage = resolveTenancyPackage({
    state: tenancyState,
    property_type: propertyType,
    is_registered_rooming_house: isRooming,
    date: moveIn,
  })

  if (!tenancyPackage.supported) {
    log.warn('[trigger-listing-doc] tenancy package unsupported', {
      reason: tenancyPackage.unsupportedReason,
      state: tenancyState,
      propertyType,
      isRooming,
    })
    return { ok: true, skipped: true, reason: 'tenancy_unsupported' }
  }

  const generatePath = tenancyGeneratorToApiPath(tenancyPackage.generator)
  if (!generatePath) {
    log.error('[trigger-listing-doc] no generator wired for', tenancyPackage.generator)
    return { ok: true, skipped: true, reason: 'no_generator' }
  }

  const url = `${internalApiOrigin()}${generatePath}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: internalPostHeaders(leaseFlowSecret),
      body: JSON.stringify({
        booking_id: booking.id,
        defer_signing: Boolean(deferSigning),
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      log.error(`[trigger-listing-doc] ${generatePath} failed`, res.status, text)
      return { ok: false, status: res.status, body: text }
    }
    return { ok: true, status: res.status, generatePath, deferSigning: Boolean(deferSigning) }
  } catch (e) {
    log.error('[trigger-listing-doc] fetch error', e)
    return { ok: false, status: 0, body: e instanceof Error ? e.message : String(e) }
  }
}
