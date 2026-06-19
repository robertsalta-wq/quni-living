/**
 * Landlord student profile AI assessment (Anthropic Claude) - Vercel Edge.
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
  buildDeterministicFitVector,
  hashAiPayload,
  BOOKING_AI_ASSESSMENT_SELECT,
  toneFirstNameOnly,
} from '../../src/lib/aiMatchingCriteria.js'
import { assembleLandlordAssessmentModelCall } from '../../src/lib/aiSurfacePromptAssembly.js'
import type { BookingFitPropertyInput } from '../lib/bookingFitForAssessment.js'
import {
  insertAiMatchingComplianceAudit,
  AiMatchingAuditError,
} from '../lib/aiMatchingAudit.js'

export const config = {
  runtime: 'edge',
}

const ONE_HOUR_MS = 60 * 60 * 1000


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

  let userMessage = ''
  let systemPrompt = ''
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

    const propRaw = booking.properties
    const prop =
      propRaw && typeof propRaw === 'object' && !Array.isArray(propRaw)
        ? (propRaw as Record<string, unknown>)
        : null
    const propertyForFit: BookingFitPropertyInput | null =
      prop && 'title' in prop ? (prop as BookingFitPropertyInput) : null

    const assembled = assembleLandlordAssessmentModelCall({
      studentProfileRow: spJoin,
      bookingRow: booking as Record<string, unknown>,
      propertyRow: prop,
      universityName: uni,
      campusName: stuCampus,
      landlordFirstName,
      applicantFirstName,
    })
    userMessage = assembled.userMessage
    systemPrompt = assembled.system
    auditPayloadFieldKeys = assembled.payloadFieldKeys
    auditPayloadHash = await hashAiPayload(assembled.payloadFieldKeys, assembled.fullPayload)
    auditFitVector = buildDeterministicFitVector({
      booking: booking as never,
      student: spRow as never,
      property: propertyForFit,
    })
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

    const assembled = assembleLandlordAssessmentModelCall({
      studentProfileRow: modalProfileRow,
      universityName: typeof body.university === 'string' ? body.university : '',
      landlordFirstName,
      applicantFirstName,
    })
    userMessage = assembled.userMessage
    systemPrompt = assembled.system
    auditPayloadFieldKeys = assembled.payloadFieldKeys
    auditPayloadHash = await hashAiPayload(assembled.payloadFieldKeys, assembled.fullPayload)
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
        model: 'claude-sonnet-4-5',
        max_tokens: 500,
        system: systemPrompt,
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
    try {
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
    } catch (e) {
      const detail = e instanceof AiMatchingAuditError ? e.message : 'Compliance audit failed'
      return json({ error: `${detail}; assessment not saved.` }, 503, origin)
    }

    const { error: upErr } = await admin
      .from('bookings')
      .update({ ai_assessment: assessment, ai_assessment_at: nowIso })
      .eq('id', persistBookingId)
    if (upErr) {
      console.error('student-assessment persist booking', upErr)
      return json({ error: 'Assessment generated but could not be saved.' }, 500, origin)
    }
  }

  return json({ assessment, assessmentAt: nowIso, cached: false }, 200, origin)
}
