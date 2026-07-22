/**
 * Shared helpers for booking-bound three-party terms → regenerate → signing smoke.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { getDocusealApiBase, getDocusealAuthHeaders } from '../api/lib/docusealClient.js'

export const SMOKE_TAG_PREFIX = '[SMOKE three-party signing'
export const ARTIFACTS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'smoke-artifacts',
)

export function smokeTagForToday() {
  const d = new Date().toISOString().slice(0, 10)
  return `${SMOKE_TAG_PREFIX} ${d}]`
}

export function requireEnv(name) {
  const v = (process.env[name] || '').trim()
  if (!v) throw new Error(`Missing ${name}`)
  return v
}

export function envFlag(name) {
  const v = (process.env[name] || '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

export function siteBase() {
  return (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://quni.com.au')
    .trim()
    .replace(/\/$/, '')
}

export function createAdmin() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export function createAnonAuth() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const anon = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!url || !anon) throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY')
  return createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } })
}

/** Landlord bearer for product POSTs (terms + regenerate). */
export async function resolveLandlordAccessToken(admin, landlordEmail) {
  const direct = (process.env.LANDLORD_ACCESS_TOKEN || process.env.SMOKE_LANDLORD_ACCESS_TOKEN || '').trim()
  if (direct) return direct

  const email = (process.env.SMOKE_LANDLORD_EMAIL || landlordEmail || '').trim()
  const password = (process.env.SMOKE_LANDLORD_PASSWORD || '').trim()
  if (email && password) {
    const auth = createAnonAuth()
    const { data, error } = await auth.auth.signInWithPassword({ email, password })
    if (error || !data.session?.access_token) {
      throw new Error(`Landlord sign-in failed: ${error?.message || 'no session'}`)
    }
    return data.session.access_token
  }

  if (email && admin && envFlag('SMOKE_MINT_LANDLORD_SESSION')) {
    return mintLandlordAccessTokenForEmail(admin, email)
  }

  throw new Error(
    'Set LANDLORD_ACCESS_TOKEN, or SMOKE_LANDLORD_EMAIL+PASSWORD, or SMOKE_MINT_LANDLORD_SESSION=1 with landlord email',
  )
}

export async function loadBookingBundle(admin, bookingId) {
  const { data: booking, error } = await admin
    .from('bookings')
    .select(
      `
      id, status, notes, landlord_id, student_id, property_id,
      service_tier_at_request, service_tier_final,
      weekly_rent, bond_amount, rent_breakdown,
      move_in_date, start_date, end_date, lease_length,
      occupant_count, housemates_count, co_tenant, parking_selected,
      properties (
        id, state, property_type, is_registered_rooming_house, status, service_tier,
        bond, bond_weeks
      )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (error) throw error
  if (!booking) throw new Error(`Booking not found: ${bookingId}`)

  const { data: tenancy } = await admin
    .from('tenancies')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle()

  let doc = null
  if (tenancy?.id) {
    const { data: docs } = await admin
      .from('tenancy_documents')
      .select(
        'id, status, document_type, docuseal_submission_id, landlord_signed_at, student_signed_at, co_tenant_signed_at, metadata, updated_at',
      )
      .eq('tenancy_id', tenancy.id)
      .in('document_type', ['residential_tenancy', 'lease'])
      .order('created_at', { ascending: false })
      .limit(5)

    doc =
      (docs ?? []).find((d) => d.document_type === 'residential_tenancy') ??
      (docs ?? [])[0] ??
      null
  }

  const { data: student } = await admin
    .from('student_profiles')
    .select('id, email, full_name')
    .eq('id', booking.student_id)
    .maybeSingle()

  return { booking, tenancyId: tenancy?.id ?? null, doc, student }
}

/**
 * Eligible for co-tenant DocuSeal party: Listing residential packages
 * (NSW FT6600 / QLD Form18a / VIC Form1). Rejects on-site occupancy generators.
 */
export function assertListingResidentialCoTenantEligible(booking) {
  const prop = booking.properties
  if (!prop) throw new Error('Booking missing properties join')
  if (booking.service_tier_at_request !== 'listing' && booking.service_tier_final !== 'listing') {
    throw new Error('Booking is not Listing tier')
  }
  const state = String(prop.state || '').toUpperCase()
  if (!['NSW', 'QLD', 'VIC'].includes(state)) {
    throw new Error(`Unsupported state for residential co-tenant smoke: ${prop.state}`)
  }
  if (prop.is_registered_rooming_house) {
    throw new Error('Registered rooming house is not valid for this smoke')
  }
  const pt = String(prop.property_type || '')
  const residentialTypes = new Set([
    'private_room_landlord_off_site',
    'entire_property',
    'shared_room',
  ])
  if (!residentialTypes.has(pt)) {
    throw new Error(
      `Property type ${pt || '(empty)'} uses occupancy (or unknown) — not residential co-tenant DocuSeal. Need entire_property / private_room_landlord_off_site / shared_room.`,
    )
  }
}

/** @deprecated use assertListingResidentialCoTenantEligible */
export function assertListingNswResidentialEligible(booking) {
  assertListingResidentialCoTenantEligible(booking)
  const state = String(booking.properties?.state || '').toUpperCase()
  if (state !== 'NSW') {
    console.warn(
      `[smoke] Warning: preferred NSW FT6600 not available; proceeding with ${state} residential package`,
    )
  }
}

export function assertRegeneratable(booking, doc) {
  if (booking.service_tier_final !== 'listing') {
    throw new Error(`service_tier_final must be listing (got ${booking.service_tier_final})`)
  }
  if (booking.status !== 'bond_pending') {
    throw new Error(
      `Regenerate requires bond_pending (got ${booking.status}). Confirm the listing booking first.`,
    )
  }
  if (doc?.status === 'signed') {
    throw new Error('Tenancy document already status=signed — regenerate rejects already_signed')
  }
}

export function parseCoTenant(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const full_name = typeof raw.full_name === 'string' ? raw.full_name.trim() : ''
  const email = typeof raw.email === 'string' ? raw.email.trim() : ''
  if (full_name.length < 2 || !email.includes('@')) return null
  return {
    full_name,
    email,
    phone: typeof raw.phone === 'string' ? raw.phone.trim() : '',
    date_of_birth: typeof raw.date_of_birth === 'string' ? raw.date_of_birth.trim().slice(0, 10) : '',
  }
}

export function bookingHasCoTenantSigner(booking) {
  const occ = Math.floor(Number(booking.occupant_count))
  return Number.isFinite(occ) && occ >= 2 && parseCoTenant(booking.co_tenant) != null
}

export function defaultSmokeCoTenant(primaryEmail) {
  const email = (process.env.SMOKE_CO_TENANT_EMAIL || 'rob+smoke-co@quni.com.au').trim()
  const name = (process.env.SMOKE_CO_TENANT_NAME || 'Smoke Co-Tenant').trim()
  const phone = (process.env.SMOKE_CO_TENANT_PHONE || '0400000002').trim()
  const dob = (process.env.SMOKE_CO_TENANT_DOB || '1995-06-15').trim()
  if (primaryEmail && email.toLowerCase() === String(primaryEmail).trim().toLowerCase()) {
    throw new Error('SMOKE_CO_TENANT_EMAIL must differ from primary tenant email')
  }
  return { full_name: name, email, phone, date_of_birth: dob }
}

export async function postJson(pathname, body, bearer) {
  const base = siteBase()
  const res = await fetch(`${base}${pathname}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearer}`,
      Origin: base,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text.slice(0, 500) }
  }
  return { ok: res.ok, status: res.status, json }
}

export async function fetchDocusealSubmission(submissionId) {
  const base = getDocusealApiBase()
  if (!base) throw new Error('Missing DOCUSEAL_API_URL')
  const res = await fetch(`${base}/api/submissions/${submissionId}`, {
    headers: getDocusealAuthHeaders(),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`DocuSeal GET submission ${submissionId}: ${res.status} ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}

export async function mintWrappedLinks(submitterIds) {
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const res = await fetch(`${siteBase()}/api/dev/mint-sign-links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ submitter_ids: submitterIds, refresh_dates: true }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`mint-sign-links failed: ${JSON.stringify(json)}`)
  return json.links || {}
}

export function classifySubmitterRole(role) {
  const r = String(role || '').toLowerCase()
  if (r.includes('co-tenant') || r.includes('co tenant')) return 'co_tenant'
  if (r.includes('landlord') || r.includes('first party')) return 'landlord'
  if (r.includes('tenant') || r.includes('second party') || r.includes('renter')) return 'tenant'
  return 'unknown'
}

export function ensureArtifactsDir() {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
  return ARTIFACTS_DIR
}

export function writeArtifact(filename, data) {
  ensureArtifactsDir()
  const p = path.join(ARTIFACTS_DIR, filename)
  fs.writeFileSync(p, JSON.stringify(data, null, 2))
  return p
}

export async function loadRecentBookingEvents(admin, bookingId, limit = 30) {
  const { data, error } = await admin
    .from('booking_events')
    .select('id, event_type, occurred_at, outcome, actor_type, reason, metadata, document_id')
    .eq('booking_id', bookingId)
    .order('occurred_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

/**
 * Create a disposable Listing bond_pending booking for smoke (service-role insert).
 * Requires SMOKE_PROPERTY_ID + SMOKE_STUDENT_PROFILE_ID + SMOKE_LANDLORD_PROFILE_ID
 * (or discovery helpers).
 */
export async function createDisposableSmokeBooking(admin, args) {
  const tag = smokeTagForToday()
  const start = new Date()
  start.setUTCDate(start.getUTCDate() + 28)
  const startDate = start.toISOString().slice(0, 10)
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + 6)
  const endDate = end.toISOString().slice(0, 10)

  const row = {
    property_id: args.propertyId,
    student_id: args.studentProfileId,
    landlord_id: args.landlordProfileId,
    start_date: startDate,
    move_in_date: startDate,
    end_date: endDate,
    weekly_rent: args.weeklyRent ?? 350,
    bond_amount: args.bondAmount ?? 1400,
    status: 'bond_pending',
    student_message: `${tag} disposable booking — cancel after smoke`,
    notes: `${tag} disposable booking — cancel after smoke`,
    lease_length: '6 months',
    service_tier_at_request: 'listing',
    service_tier_final: 'listing',
    confirmed_at: new Date().toISOString(),
    bond_window_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    occupant_count: 1,
    housemates_count: 0,
    co_tenant: null,
    parking_selected: false,
  }

  const { data, error } = await admin.from('bookings').insert(row).select('id').single()
  if (error) throw error
  if (!data?.id) throw new Error('createDisposableSmokeBooking returned no id')
  return data.id
}

/** Find NSW FT6600 Listing properties for a landlord (candidates for smoke). */
export async function discoverNswListingProperties(admin, landlordProfileId) {
  const ft6600Types = [
    'private_room_landlord_off_site',
    'entire_property',
    'shared_room',
  ]
  const { data, error } = await admin
    .from('properties')
    .select('id, title, state, property_type, is_registered_rooming_house, status, service_tier, landlord_id')
    .eq('landlord_id', landlordProfileId)
    .eq('status', 'active')
    .eq('service_tier', 'listing')
    .ilike('state', 'NSW')
    .in('property_type', ft6600Types)
  if (error) throw error
  return (data ?? []).filter((p) => !p.is_registered_rooming_house)
}

/**
 * Mint a short-lived landlord access token via Admin Auth generateLink + verifyOtp.
 * Requires SMOKE_MINT_LANDLORD_SESSION=1. Prefer LANDLORD_ACCESS_TOKEN when available.
 */
export async function mintLandlordAccessTokenForEmail(admin, email) {
  if (!envFlag('SMOKE_MINT_LANDLORD_SESSION')) {
    throw new Error('mintLandlordAccessTokenForEmail requires SMOKE_MINT_LANDLORD_SESSION=1')
  }
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (error) throw error
  const hashed = data?.properties?.hashed_token
  if (!hashed) throw new Error('generateLink returned no hashed_token')

  const anon = createAnonAuth()
  const verified = await anon.auth.verifyOtp({
    token_hash: hashed,
    type: 'magiclink',
  })
  if (verified.error || !verified.data.session?.access_token) {
    throw new Error(`verifyOtp failed: ${verified.error?.message || 'no session'}`)
  }
  return verified.data.session.access_token
}
