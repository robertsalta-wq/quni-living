// @ts-nocheck — Landlord booking confirm: Listing (fee + bond_pending) or Managed (existing subscription path).
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { headerString, readJsonBody } from './lib/nodeHandler.js'
import { runManagedConfirmBooking } from './lib/booking/confirmManaged.js'
import { runListingConfirmBooking } from './lib/booking/confirmListing.js'
import {
  fetchPlatformConfigValueMap,
  parseBooleanConfig,
  PLATFORM_CONFIG_KEYS,
} from './lib/platformConfig.js'
import {
  resolveEffectiveConfirmTier,
  validateLandlordConfirmTierChoice,
} from './lib/booking/serviceTierSnapshot.js'

export const config = { runtime: 'nodejs', maxDuration: 60 }

function corsJson(res, body, status = 200, origin) {
  const allowOrigin = origin || '*'
  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  return res.status(status).json(body)
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

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!stripeSecret || !supabaseUrl || !serviceRole || !anonKey) {
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
  if (!bookingId) {
    return corsJson(res, { error: 'bookingId is required' }, 400, origin)
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
      return corsJson(res, { error: 'Only landlord accounts can confirm bookings' }, 403, origin)
    }

    const admin = createClient(supabaseUrl, serviceRole)

    const { data: landlord, error: llErr } = await admin
      .from('landlord_profiles')
      .select('id, stripe_connect_account_id, stripe_charges_enabled, stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (llErr || !landlord) {
      return corsJson(res, { error: 'Landlord profile not found' }, 404, origin)
    }

    const { data: bookingLite, error: liteErr } = await admin
      .from('bookings')
      .select(
        `
        id,
        landlord_id,
        property_id,
        status,
        service_tier_at_request,
        service_tier_final,
        stripe_subscription_id,
        stripe_subscription_status,
        bond_window_expires_at,
        confirmed_at
      `,
      )
      .eq('id', bookingId)
      .maybeSingle()

    if (liteErr || !bookingLite) {
      return corsJson(res, { error: 'Booking not found' }, 404, origin)
    }

    if (bookingLite.landlord_id !== landlord.id) {
      return corsJson(res, { error: 'Forbidden' }, 403, origin)
    }

    if (bookingLite.status === 'bond_pending') {
      return corsJson(
        res,
        {
          ok: true,
          idempotent: true,
          branch: 'listing',
          bookingStatus: 'bond_pending',
          service_tier_final: bookingLite.service_tier_final ?? 'listing',
          bond_window_expires_at: bookingLite.bond_window_expires_at,
          confirmed_at: bookingLite.confirmed_at,
        },
        200,
        origin,
      )
    }

    if (bookingLite.status === 'confirmed' || bookingLite.status === 'active') {
      return corsJson(
        res,
        {
          ok: true,
          idempotent: true,
          branch: bookingLite.service_tier_final === 'listing' ? 'listing' : 'managed',
          bookingStatus: bookingLite.status,
          service_tier_final: bookingLite.service_tier_final,
          subscriptionId: bookingLite.stripe_subscription_id ?? undefined,
          subscriptionStatus: bookingLite.stripe_subscription_status ?? undefined,
          confirmed_at: bookingLite.confirmed_at,
        },
        200,
        origin,
      )
    }

    const bodyServiceTier =
      body.serviceTier === 'listing' || body.serviceTier === 'managed' ? body.serviceTier : undefined

    const { data: propertyLite, error: propLiteErr } = await admin
      .from('properties')
      .select('state, property_type, is_registered_rooming_house, service_tier')
      .eq('id', bookingLite.property_id)
      .maybeSingle()

    if (propLiteErr || !propertyLite) {
      return corsJson(res, { error: 'Property not found for booking' }, 404, origin)
    }

    const cfgMap = await fetchPlatformConfigValueMap(admin, [
      PLATFORM_CONFIG_KEYS.QUNI_SERVICE_TIER_MODULE_ENABLED,
    ])
    const moduleEnabled = parseBooleanConfig(
      cfgMap[PLATFORM_CONFIG_KEYS.QUNI_SERVICE_TIER_MODULE_ENABLED],
      false,
    )

    const effectiveTier = resolveEffectiveConfirmTier({
      bodyServiceTier,
      bookingServiceTierAtRequest: bookingLite.service_tier_at_request,
      state: propertyLite.state,
      propertyType: propertyLite.property_type,
      isRegisteredRoomingHouse: propertyLite.is_registered_rooming_house,
      moduleEnabled,
      propertyServiceTier: propertyLite.service_tier,
    })

    const tierErr = validateLandlordConfirmTierChoice(effectiveTier, {
      moduleEnabled,
      state: propertyLite.state,
      propertyType: propertyLite.property_type,
      isRegisteredRoomingHouse: propertyLite.is_registered_rooming_house,
      propertyServiceTier: propertyLite.service_tier,
    })
    if (tierErr) {
      return corsJson(res, { error: tierErr.message, code: tierErr.code }, 400, origin)
    }

    const useListing = effectiveTier === 'listing'

    const stripe = new Stripe(stripeSecret)

    if (useListing) {
      const listingResult = await runListingConfirmBooking({
        stripe,
        admin,
        landlord,
        bookingId,
        origin,
      })

      if (!listingResult.ok) {
        return corsJson(res, listingResult.body, listingResult.status, origin)
      }

      return corsJson(
        res,
        {
          ok: true,
          branch: 'listing',
          idempotent: Boolean(listingResult.idempotent),
          bookingStatus: listingResult.status,
          bond_window_expires_at: listingResult.bond_window_expires_at,
          service_tier_final: listingResult.service_tier_final,
          listing_fee_payment_intent_id: listingResult.listing_fee_payment_intent_id,
        },
        200,
        origin,
      )
    }

    if (landlord.stripe_charges_enabled !== true) {
      return corsJson(res, { error: 'Landlord Stripe account not ready for charges' }, 400, origin)
    }

    const managedResult = await runManagedConfirmBooking({
      stripe,
      admin,
      landlord,
      bookingId,
      origin,
    })

    if (!managedResult.ok) {
      return corsJson(res, managedResult.body, managedResult.status, origin)
    }

    return corsJson(
      res,
      {
        ok: true,
        branch: 'managed',
        subscriptionId: managedResult.subscriptionId,
        subscriptionStatus: managedResult.subscriptionStatus,
      },
      200,
      origin,
    )
  } catch (e) {
    console.error('confirm-booking', e)
    let msg = 'Booking confirmation failed'
    if (e && typeof e === 'object') {
      if ('message' in e && typeof e.message === 'string' && e.message.trim()) {
        msg = e.message.trim()
      }
      const raw = 'raw' in e && e.raw && typeof e.raw === 'object' && 'message' in e.raw
      if (raw && typeof e.raw.message === 'string' && e.raw.message.trim()) {
        msg = e.raw.message.trim()
      }
    }
    return corsJson(res, { error: msg.slice(0, 500) }, 500, origin)
  }
}
