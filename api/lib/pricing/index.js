import { createClient } from '@supabase/supabase-js'

const VALID_PROPERTY_TIERS = new Set(['t1', 't2', 't3'])
const VALID_SERVICE_TIERS = new Set(['listing', 'managed'])
const DEFAULT_SERVICE_TIER = 'managed'
const CARD_SURCHARGE_DOMESTIC = '1.7% + $0.30'
const CARD_SURCHARGE_INTERNATIONAL = '3.5% + $0.30'

function ensureServerEnv() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!supabaseUrl || !serviceRole) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return { supabaseUrl, serviceRole }
}

function adminClient() {
  const { supabaseUrl, serviceRole } = ensureServerEnv()
  return createClient(supabaseUrl, serviceRole)
}

function normalizePropertyTier(propertyTier) {
  const tier = String(propertyTier || '').trim().toLowerCase()
  if (!VALID_PROPERTY_TIERS.has(tier)) {
    throw new Error(`Invalid property tier: ${propertyTier}`)
  }
  return tier
}

function normalizeServiceTier(serviceTier = DEFAULT_SERVICE_TIER) {
  const tier = String(serviceTier || DEFAULT_SERVICE_TIER).trim().toLowerCase()
  if (!VALID_SERVICE_TIERS.has(tier)) {
    throw new Error(`Invalid service tier: ${serviceTier}`)
  }
  return tier
}

function centsToAud(cents) {
  return Number(cents || 0) / 100
}

function formatAudFromCents(cents) {
  return `$${centsToAud(cents).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export async function getPricingForCell(propertyTier, serviceTier = DEFAULT_SERVICE_TIER) {
  const propertyTierNormalized = normalizePropertyTier(propertyTier)
  const serviceTierNormalized = normalizeServiceTier(serviceTier)
  const admin = adminClient()
  const { data, error } = await admin
    .from('pricing_config')
    .select(
      'property_tier,service_tier,fee_mode,fee_percent,fee_fixed_cents,student_fee_mode,student_fee_percent,student_fee_fixed_cents,card_surcharge_enabled,free_transfer_required,utilities_cap_aud',
    )
    .eq('property_tier', propertyTierNormalized)
    .eq('service_tier', serviceTierNormalized)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new Error(`Missing pricing_config row for ${propertyTierNormalized}/${serviceTierNormalized}`)
  }
  return data
}

export function formatFeeForDisplay(cell) {
  const landlordFeeDisplay =
    cell.fee_mode === 'percent'
      ? `${Number(cell.fee_percent || 0).toLocaleString('en-AU', { maximumFractionDigits: 2 })}%`
      : formatAudFromCents(cell.fee_fixed_cents)

  const studentFeeDisplay =
    cell.student_fee_mode === 'percent'
      ? `${Number(cell.student_fee_percent || 0).toLocaleString('en-AU', { maximumFractionDigits: 2 })}%`
      : formatAudFromCents(cell.student_fee_fixed_cents)

  return {
    landlordFeeDisplay,
    studentFeeDisplay,
    studentFeeFixedDisplay: formatAudFromCents(cell.student_fee_fixed_cents),
    landlordFeeFixedDisplay: formatAudFromCents(cell.fee_fixed_cents),
    cardSurchargeEnabled: Boolean(cell.card_surcharge_enabled),
    cardSurchargeDomestic: CARD_SURCHARGE_DOMESTIC,
    cardSurchargeInternational: CARD_SURCHARGE_INTERNATIONAL,
    utilitiesCapDisplay: `$${Number(cell.utilities_cap_aud || 0).toLocaleString('en-AU')}`,
  }
}

export function calculateBookingFeeCents(cell, weeklyRentCents, leaseWeeks) {
  void leaseWeeks
  if (cell.student_fee_mode === 'percent') {
    const pct = Number(cell.student_fee_percent || 0)
    if (!Number.isFinite(pct) || pct <= 0) return 0
    return Math.max(0, Math.round(Number(weeklyRentCents || 0) * (pct / 100)))
  }
  const fixed = Number(cell.student_fee_fixed_cents || 0)
  if (!Number.isFinite(fixed) || fixed <= 0) return 0
  return Math.round(fixed)
}

export function resolvePropertyTierFromListing(propertyType, isRegisteredRoomingHouse) {
  const pt = String(propertyType || '').trim()
  if (pt === 'private_room_landlord_on_site') return 't1'
  if (pt === 'private_room_landlord_off_site' && Boolean(isRegisteredRoomingHouse)) return 't3'
  return 't2'
}
