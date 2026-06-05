/**
 * Landlord student profile AI assessment (Anthropic Claude) — Vercel Edge.
 * Env: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY
 *
 * POST Authorization: Bearer <Supabase access_token> (landlord)
 *
 * Body modes:
 * - With `bookingId`: loads student + listing from DB; caches result on the booking row.
 *   Use `refresh: true` to regenerate (max once per hour after last generation).
 * - Without `bookingId`: requires `applicantProfileId` + profile fields (dashboard modal); not persisted.
 */
import { createClient } from '@supabase/supabase-js'
import {
  buildBookingAiPayload,
  buildDeterministicFitVector,
  buildStudentProfileAiPayload,
  hashAiPayload,
  mergeAssessmentAiPayloads,
  NON_DISCRIMINATION_AI_RULE,
  BOOKING_AI_ASSESSMENT_SELECT,
  toneFirstNameOnly,
} from '../../src/lib/aiMatchingCriteria.js'
import type { BookingFitPropertyInput } from '../lib/bookingFitForAssessment.js'
import {
  buildAssessmentExtraContext,
  buildFitSummaryForAudit,
  formatLandlordAssessmentUserMessage,
  insertAiMatchingComplianceAudit,
} from '../lib/aiMatchingAudit.js'

export const config = {
  runtime: 'edge',
}

const ONE_HOUR_MS = 60 * 60 * 1000

const SYSTEM_PROMPT = `You are a helpful assistant on Quni Living, an Australian verified accommodation marketplace (students, graduates, and professional renters). You are helping a landlord review an applicant who has requested their property.

Address the landlord by their first name naturally once at the opening of the assessment when tone.landlord_first_name is provided. Use the applicant's first name throughout when tone.applicant_first_name is provided — never refer to them as "this applicant", "the student", or "they" as a substitute for their name. Do not use third-person pronouns (he, she, they, him, her, them, his, hers, their) at all — repeat the first name instead — so gender is never assumed incorrectly.

Based on the allowlisted applicant and booking fields provided, write a short, warm, and balanced 3-4 sentence assessment to help the landlord make an informed decision.

Rules:
- Open naturally addressing the landlord by first name when provided
- Use the applicant's first name throughout when provided; never use he/she/they pronouns
- Be factual and balanced — do not make the decision for the landlord
- ${NON_DISCRIMINATION_AI_RULE.replace(/^- /, '')}
- Applicant verification tier (student.verification_type): "student" = full student verification (uni email, ID, enrolment); "identity" = non-student identity path complete (ID + supporting doc; work email may apply); "none" = incomplete. State the tier plainly when it is not "student". For "none", say what verification steps are still missing and do not describe them as fully verified. For "identity", note they are a verified non-student tenant, not a verified student.
- For non-student applicants (identity or none tiers), do not assume university enrollment or praise course credentials unless provided; focus on identity/work-email verification, housing preferences, and listing fit.
- When context.fit_summary is present, it mirrors the booking review table on the site. You MUST reflect it faithfully: any line marked MISMATCH is a material gap — do not say preferences "align well", "line up nicely", or similar overall praise if there is at least one MISMATCH. Call out those gaps plainly (lease length, parking, bills, pets, move-in, occupancy, furnishing as applicable). UNKNOWN means data was missing — say what to verify. You may still comment on verification credentials separately from preference/listing fit.
- If there is no context.fit_summary block, do not claim strong preference alignment with the listing; summarise what the applicant asked for and note what to check on the listing.
- Focus on: verification completeness and tier, university and course when provided as facts only, housing preference alignment (occupancy, move-in flexibility, pets, parking, bills, furnishing when in allowlisted fields), budget fit, smoking status when present, and fit vs listing/booking context
- Location and commute: Do not claim the listing is near a specific university, campus, or landmark, and do not discuss commute length, unless those facts appear in context.property_listing. You may state the student's university from context.university_name as a fact; if listing context does not tie the property to a campus/university, do not invent a geographic mismatch or "wrong uni" narrative.
- Rent: Never invent dollar amounts. Only mention weekly rent if a figure appears in context.property_listing or booking.weekly_rent. If no rent is in the context, do not guess.
- End with one practical suggestion for what the landlord might want to ask or consider before confirming
- Keep the tone professional but warm and conversational`

type AnthropicContentBlock = { type: string; text?: string }
type AnthropicMessagesResponse = {
  content?: AnthropicContentBlock[]
  error?: { type?: string; message?: string }
}

function json(body: unknown, status = 200, origin: string) {
  const allowOrigin = origin || '*'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'public, max-age=0, s-maxage=0',
    },
  })
}

function parseBearer(request: Request): string | null {
  const h = request.headers.get('Authorization')?.trim() ?? ''
  const m = /^Bearer\s+(.+)$/i.exec(h)
  const t = m?.[1]?.trim()
  return t || null
}

function landlordFirstFromProfile(firstName: string | null | undefined): string {
  return toneFirstNameOnly(firstName) || ''
}

function propertyFeaturesLine(features: unknown): string {
  if (!Array.isArray(features)) return ''
  const names = features
    .map((f) => {
      if (f && typeof f === 'object' && 'features' in f) {
        const inner = (f as { features?: { name?: string } }).features
        return typeof inner?.name === 'string' ? inner.name : ''
      }
      return ''
    })
    .filter(Boolean)
  return names.length ? `Amenities / features: ${names.join(', ')}` : ''
}

function studentProfileFromBookingJoin(spRaw: unknown): Record<string, unknown> | null {
  if (spRaw == null) return null
  const row =
    Array.isArray(spRaw) && spRaw.length > 0 && typeof spRaw[0] === 'object' && spRaw[0]
      ? spRaw[0]
      : typeof spRaw === 'object' && !Array.isArray(spRaw)
        ? spRaw
        : null
  return row ? (row as Record<string, unknown>) : null
}

function buildPropertyListingLines(
  prop: Record<string, unknown> | null,
  booking: Record<string, unknown>,
): string[] {
  const propParts: string[] = []
  if (prop && 'title' in prop) {
    propParts.push(`Title: ${String(prop.title ?? '')}`)
    if (prop.address) propParts.push(`Address (on file): ${String(prop.address)}`)
    if (prop.suburb) propParts.push(`Suburb: ${String(prop.suburb)}`)
    if (prop.state) propParts.push(`State: ${String(prop.state)}`)
    const listUni =
      prop.universities && typeof prop.universities === 'object' && !Array.isArray(prop.universities)
        ? (prop.universities as { name?: string }).name?.trim() ?? ''
        : ''
    const listCampus =
      prop.campuses && typeof prop.campuses === 'object' && !Array.isArray(prop.campuses)
        ? (prop.campuses as { name?: string; address?: string | null }).name?.trim() ?? ''
        : ''
    const listCampusAddr =
      prop.campuses && typeof prop.campuses === 'object' && !Array.isArray(prop.campuses)
        ? (prop.campuses as { address?: string | null }).address?.trim() ?? ''
        : ''
    if (listUni) propParts.push(`Listing linked university (platform): ${listUni}`)
    if (listCampus) propParts.push(`Listing linked campus (platform): ${listCampus}`)
    if (listCampusAddr) propParts.push(`Campus address (platform): ${listCampusAddr}`)
    if (prop.rent_per_week != null) propParts.push(`Listing weekly rent: $${Number(prop.rent_per_week)}`)
    if (prop.room_type) propParts.push(`Room / listing type: ${String(prop.room_type)}`)
    if (prop.furnished === true) propParts.push('Furnished: yes')
    else if (prop.furnished === false) propParts.push('Furnished: no')
    if (prop.bond != null) propParts.push(`Bond (weeks/value on file): ${String(prop.bond)}`)
    if (prop.lease_length) propParts.push(`Typical lease on listing: ${String(prop.lease_length)}`)
    if (prop.available_from) propParts.push(`Available from: ${String(prop.available_from).slice(0, 10)}`)
    if (prop.property_type) propParts.push(`Accommodation type: ${String(prop.property_type)}`)
    const featLine = propertyFeaturesLine(prop.property_features)
    if (featLine) propParts.push(featLine)
  }
  const bookingWeekly = booking.weekly_rent
  if (bookingWeekly != null && Number.isFinite(Number(bookingWeekly))) {
    propParts.push(`This booking weekly rent: $${Math.round(Number(bookingWeekly))}`)
  }
  propParts.push(
    `Requested move-in: ${String(booking.move_in_date || booking.start_date || '').slice(0, 10)}`,
    `Requested lease length: ${String(booking.lease_length || '').trim() || 'Not specified'}`,
    `Occupant count (capacity signal): ${String(booking.occupant_count ?? 'Not specified')}`,
  )
  return propParts
}

export default async function handler(request: Request) {
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

  const token = parseBearer(request)
  if (!token) {
    return json({ error: 'Authorization Bearer token required' }, 401, origin)
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server configuration error' }, 500, origin)
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser(token)

  if (userErr || !user) {
    return json({ error: 'Invalid or expired session' }, 401, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const { data: lpRow, error: lpErr } = await admin
    .from('landlord_profiles')
    .select('id, first_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (lpErr || !lpRow) {
    return json({ error: 'Landlord profile required' }, 403, origin)
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) {
    return json({ error: 'AI assessment is not configured on the server.' }, 500, origin)
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, origin)
  }

  const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  const refresh = body.refresh === true

  let landlordFirstName = landlordFirstFromProfile(lpRow.first_name)
  const bodyLandlordHint =
    typeof body.landlordFirstName === 'string' ? body.landlordFirstName.trim().slice(0, 80) : ''
  if (!landlordFirstName && bodyLandlordHint) landlordFirstName = toneFirstNameOnly(bodyLandlordHint)
  if (!landlordFirstName) landlordFirstName = 'there'

  let userMessage: string
  let persistBookingId: string | null = null
  let auditPayloadFieldKeys: string[] = []
  let auditPayloadHash = ''
  let auditStudentId: string | null = null
  let auditServiceTier: 'listing' | 'managed' | null = null
  let auditFitVector = buildDeterministicFitVector({
    booking: {
      move_in_date: null,
      start_date: '',
      lease_length: null,
      occupant_count: 1,
      parking_selected: false,
      weekly_rent: null,
    },
    student: {
      room_type_preference: null,
      budget_min_per_week: null,
      budget_max_per_week: null,
      occupancy_type: null,
      move_in_flexibility: null,
      has_pets: null,
      needs_parking: null,
      bills_preference: null,
      furnishing_preference: null,
    },
    property: null,
  })

  if (bookingId) {
    const { data: bookingRaw, error: bErr } = await admin
      .from('bookings')
      .select(BOOKING_AI_ASSESSMENT_SELECT)
      .eq('id', bookingId)
      .maybeSingle()

    const booking = bookingRaw as Record<string, unknown> | null

    if (bErr || !booking) {
      return json({ error: 'Booking not found' }, 404, origin)
    }

    if (booking.landlord_id !== lpRow.id) {
      return json({ error: 'Forbidden' }, 403, origin)
    }

    const assessable = booking.status === 'pending_confirmation' || booking.status === 'awaiting_info'
    if (!assessable) {
      return json({ error: 'AI assessment is not available for this booking status' }, 400, origin)
    }

    const cachedText =
      typeof booking.ai_assessment === 'string' && booking.ai_assessment.trim() ? booking.ai_assessment.trim() : ''
    if (!refresh && cachedText) {
      return json(
        {
          assessment: cachedText,
          assessmentAt: booking.ai_assessment_at ?? null,
          cached: true,
        },
        200,
        origin,
      )
    }

    if (refresh && booking.ai_assessment_at) {
      const last = new Date(String(booking.ai_assessment_at)).getTime()
      if (Number.isFinite(last) && Date.now() - last < ONE_HOUR_MS) {
        const waitSec = Math.ceil((ONE_HOUR_MS - (Date.now() - last)) / 1000)
        return json(
          {
            error: 'You can refresh the assessment at most once per hour. Please try again later.',
            retryAfterSeconds: waitSec,
          },
          429,
          origin,
        )
      }
    }

    const spJoin = studentProfileFromBookingJoin(booking.student_profiles)
    if (!spJoin) {
      return json({ error: 'Applicant profile not found for this booking.' }, 404, origin)
    }

    const uni =
      spJoin.universities && typeof spJoin.universities === 'object' && !Array.isArray(spJoin.universities)
        ? String((spJoin.universities as { name?: string }).name ?? '').trim()
        : ''
    const stuCampus =
      spJoin.campuses && typeof spJoin.campuses === 'object' && !Array.isArray(spJoin.campuses)
        ? String((spJoin.campuses as { name?: string }).name ?? '').trim()
        : ''
    const applicantFirstName = toneFirstNameOnly(
      typeof spJoin.first_name === 'string' ? spJoin.first_name : null,
    )

    const { universities: _u, campuses: _c, first_name: _fn, ...spRow } = spJoin
    const studentPayload = buildStudentProfileAiPayload('landlord_assessment', spRow)
    const bookingPayload = buildBookingAiPayload('landlord_assessment', booking as Record<string, unknown>)
    const merged = mergeAssessmentAiPayloads(studentPayload, bookingPayload)

    const propRaw = booking.properties
    const prop =
      propRaw && typeof propRaw === 'object' && !Array.isArray(propRaw)
        ? (propRaw as Record<string, unknown>)
        : null
    const propertyForFit: BookingFitPropertyInput | null =
      prop && 'title' in prop ? (prop as BookingFitPropertyInput) : null
    const fitSummaryText = buildFitSummaryForAudit(
      booking as Record<string, unknown>,
      spRow,
      propertyForFit,
    )
    const propParts = buildPropertyListingLines(prop, booking as Record<string, unknown>)

    const extra = buildAssessmentExtraContext({
      universityName: uni,
      campusName: stuCampus,
      propertyListingLines: propParts,
      fitSummaryBlock: fitSummaryText,
      landlordFirstName,
      applicantFirstName,
    })

    const fullPayload = { ...merged.payload, ...extra.extraPayload }
    auditPayloadFieldKeys = [...merged.fieldKeys, ...extra.extraFieldKeys].sort()
    auditPayloadHash = await hashAiPayload(auditPayloadFieldKeys, fullPayload)
    auditFitVector = buildDeterministicFitVector({
      booking: booking as never,
      student: spRow as never,
      property: propertyForFit,
    })
    userMessage = formatLandlordAssessmentUserMessage(fullPayload)
    persistBookingId = typeof booking.id === 'string' ? booking.id : null
    auditStudentId = typeof booking.student_id === 'string' ? booking.student_id : null
    const tierRaw = booking.service_tier_final ?? booking.service_tier_at_request
    auditServiceTier = tierRaw === 'listing' || tierRaw === 'managed' ? tierRaw : null
  } else {
    const applicantProfileId =
      typeof body.applicantProfileId === 'string' ? body.applicantProfileId.trim() : ''
    if (!applicantProfileId) {
      return json({ error: 'applicantProfileId is required when bookingId is omitted' }, 400, origin)
    }

    const { data: applicantRow, error: applicantErr } = await admin
      .from('student_profiles')
      .select('id, verification_type, accommodation_verification_route')
      .eq('id', applicantProfileId)
      .maybeSingle()

    if (applicantErr || !applicantRow) {
      return json({ error: 'Applicant profile not found.' }, 404, origin)
    }

    const applicantFirstName = toneFirstNameOnly(typeof body.firstName === 'string' ? body.firstName : '')
    const course = typeof body.course === 'string' ? body.course : ''
    const roomTypePreference = typeof body.roomTypePreference === 'string' ? body.roomTypePreference : ''

    const yearRaw = body.yearOfStudy
    const yearOfStudy =
      typeof yearRaw === 'number' && Number.isFinite(yearRaw)
        ? yearRaw
        : yearRaw === null
          ? null
          : undefined
    if (yearOfStudy === undefined && yearRaw !== undefined && yearRaw !== null) {
      return json({ error: 'yearOfStudy must be a finite number or null' }, 400, origin)
    }

    const uniEmailVerified = body.uniEmailVerified === true
    const workEmailVerified = body.workEmailVerified === true
    const idProvided = body.idProvided === true
    const enrolmentProvided = body.enrolmentProvided === true
    const identitySupportingProvided = body.identitySupportingProvided === true

    if (typeof body.uniEmailVerified !== 'boolean') {
      return json({ error: 'uniEmailVerified must be a boolean' }, 400, origin)
    }
    if (typeof body.idProvided !== 'boolean') {
      return json({ error: 'idProvided must be a boolean' }, 400, origin)
    }
    if (typeof body.enrolmentProvided !== 'boolean') {
      return json({ error: 'enrolmentProvided must be a boolean' }, 400, origin)
    }
    if (typeof body.identitySupportingProvided !== 'boolean') {
      return json({ error: 'identitySupportingProvided must be a boolean' }, 400, origin)
    }
    void idProvided
    void enrolmentProvided
    void identitySupportingProvided

    const budgetMinRaw = body.budgetMin
    const budgetMaxRaw = body.budgetMax
    const budgetMin =
      budgetMinRaw === null || budgetMinRaw === undefined
        ? null
        : typeof budgetMinRaw === 'number' && Number.isFinite(budgetMinRaw)
          ? budgetMinRaw
          : NaN
    const budgetMax =
      budgetMaxRaw === null || budgetMaxRaw === undefined
        ? null
        : typeof budgetMaxRaw === 'number' && Number.isFinite(budgetMaxRaw)
          ? budgetMaxRaw
          : NaN
    if (Number.isNaN(budgetMin) || Number.isNaN(budgetMax)) {
      return json({ error: 'budgetMin and budgetMax must be finite numbers or null' }, 400, origin)
    }

    const isSmokerRaw = body.isSmoker
    const isSmoker =
      isSmokerRaw === null || isSmokerRaw === undefined
        ? null
        : typeof isSmokerRaw === 'boolean'
          ? isSmokerRaw
          : undefined
    if (isSmoker === undefined) {
      return json({ error: 'isSmoker must be a boolean or null' }, 400, origin)
    }

    const occ = typeof body.occupancyType === 'string' ? body.occupancyType : null
    const flex = typeof body.moveInFlexibility === 'string' ? body.moveInFlexibility : null
    const bills = typeof body.billsPreference === 'string' ? body.billsPreference : null
    const furn = typeof body.furnishingPreference === 'string' ? body.furnishingPreference : null
    const hasPets = typeof body.hasPets === 'boolean' ? body.hasPets : null
    const needsParking = typeof body.needsParking === 'boolean' ? body.needsParking : null
    const hasGuarantor = typeof body.hasGuarantor === 'boolean' ? body.hasGuarantor : null
    const guarantorName = typeof body.guarantorName === 'string' ? body.guarantorName : null

    const modalProfileRow: Record<string, unknown> = {
      verification_type: applicantRow.verification_type,
      accommodation_verification_route: applicantRow.accommodation_verification_route,
      course,
      year_of_study: yearOfStudy ?? null,
      room_type_preference: roomTypePreference,
      budget_min_per_week: budgetMin,
      budget_max_per_week: budgetMax,
      is_smoker: isSmoker,
      uni_email_verified: uniEmailVerified,
      work_email_verified: workEmailVerified,
      occupancy_type: occ,
      move_in_flexibility: flex,
      has_pets: hasPets,
      needs_parking: needsParking,
      bills_preference: bills,
      furnishing_preference: furn,
      has_guarantor: hasGuarantor,
      guarantor_name: guarantorName,
    }

    const studentPayload = buildStudentProfileAiPayload('landlord_assessment', modalProfileRow)
    const extra = buildAssessmentExtraContext({
      universityName: typeof body.university === 'string' ? body.university : '',
      campusName: undefined,
      propertyListingLines: [],
      fitSummaryBlock: '',
      landlordFirstName,
      applicantFirstName,
    })
    const fullPayload = { ...studentPayload.payload, ...extra.extraPayload }
    auditPayloadFieldKeys = [...studentPayload.fieldKeys, ...extra.extraFieldKeys].sort()
    auditPayloadHash = await hashAiPayload(auditPayloadFieldKeys, fullPayload)
    userMessage = formatLandlordAssessmentUserMessage(fullPayload)
  }

  let anthropicRes: Response
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    return json({ error: `Could not reach AI service: ${msg}` }, 502, origin)
  }

  const anthropicData = (await anthropicRes.json()) as AnthropicMessagesResponse

  if (!anthropicRes.ok) {
    const errMsg = anthropicData.error?.message || anthropicRes.statusText || 'Anthropic request failed'
    const status = anthropicRes.status === 429 ? 429 : anthropicRes.status >= 500 ? 502 : 502
    return json({ error: errMsg }, status, origin)
  }

  const textBlock = anthropicData.content?.find((c) => c.type === 'text')
  const assessment = typeof textBlock?.text === 'string' ? textBlock.text.trim() : ''

  if (!assessment) {
    return json({ error: 'AI returned an empty assessment' }, 502, origin)
  }

  const nowIso = new Date().toISOString()

  if (persistBookingId) {
    const { error: upErr } = await admin
      .from('bookings')
      .update({ ai_assessment: assessment, ai_assessment_at: nowIso })
      .eq('id', persistBookingId)
    if (upErr) {
      console.error('student-assessment persist booking', upErr)
    }

    await insertAiMatchingComplianceAudit(admin, {
      bookingId: persistBookingId,
      landlordId: lpRow.id,
      studentId: auditStudentId,
      eventType: 'ai_assessment',
      aiSurface: 'landlord_assessment',
      serviceTier: auditServiceTier,
      outcome: 'assessment_generated',
      fitVector: auditFitVector,
      payloadFieldKeys: auditPayloadFieldKeys,
      payloadHash: auditPayloadHash,
    })
  }

  return json({ assessment, assessmentAt: nowIso, cached: false }, 200, origin)
}
