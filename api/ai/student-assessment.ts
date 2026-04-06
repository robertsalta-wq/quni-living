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

export const config = {
  runtime: 'edge',
}

const ONE_HOUR_MS = 60 * 60 * 1000

const SYSTEM_PROMPT = `You are a helpful assistant on Quni Living, an Australian student accommodation marketplace. You are helping a landlord review a student who has applied for their property.

Address the landlord by their first name naturally once at the opening of the assessment. Use the student's first name throughout — never refer to them as "this applicant", "the student", or "they" as a substitute for their name.

Based on the student profile data provided, write a short, warm, and balanced 3-4 sentence assessment to help the landlord make an informed decision.

Rules:
- Open naturally addressing the landlord by first name (e.g. "Hi Rob," or just start with their name in context)
- Use the student's first name throughout the assessment
- Be factual and balanced — do not make the decision for the landlord
- Do not reference nationality, gender, or any protected characteristics in your assessment
- Focus on: verification completeness, student status, university and course credibility, housing preference alignment (including occupancy, move-in flexibility, pets, parking, bills, furnishing preferences when provided), budget fit, smoking status, and fit vs the listing summary when provided
- End with one practical suggestion for what the landlord might want to ask or consider before confirming
- Keep the tone professional but warm and conversational
- Never recommend rejecting a student based on protected characteristics`

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

function landlordFirstFromProfile(firstName: string | null | undefined, fullName: string | null | undefined): string {
  const fn = firstName?.trim()
  if (fn) return fn
  const full = fullName?.trim()
  if (full) {
    const w = full.split(/\s+/)[0]
    if (w) return w
  }
  return ''
}

function formatBudgetLine(min: number | null, max: number | null): string {
  const hasMin = min != null && Number.isFinite(min)
  const hasMax = max != null && Number.isFinite(max)
  if (!hasMin && !hasMax) return 'Not specified'
  const fmt = (n: number) => `$${Math.round(n).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
  if (hasMin && hasMax) return `${fmt(min!)}–${fmt(max!)}/wk`
  if (hasMin) return `From ${fmt(min!)}/wk`
  return `Up to ${fmt(max!)}/wk`
}

function formatSmoker(v: boolean | null | undefined): string {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return 'Not specified'
}

function buildUserMessage(input: {
  landlordFirstName: string
  firstName: string
  lastName: string
  university: string
  course: string
  yearOfStudy: number | null
  studentType: string
  uniEmailVerified: boolean
  workEmailVerified: boolean
  idProvided: boolean
  enrolmentProvided: boolean
  roomTypePreference: string
  budgetMin: number | null
  budgetMax: number | null
  isSmoker: boolean | null
  occupancyType: string | null
  moveInFlexibility: string | null
  hasPets: boolean | null
  needsParking: boolean | null
  billsPreference: string | null
  furnishingPreference: string | null
  hasGuarantor: boolean | null
  guarantorName: string | null
  propertyContext: string | null
}): string {
  const studentFirst = input.firstName.trim() || 'Not specified'
  const studentLast = input.lastName.trim() || 'Not specified'
  const landlordLine = input.landlordFirstName.trim() || 'Not specified'
  const lines = [
    `Landlord name: ${landlordLine}`,
    'Student profile:',
    `- First name: ${studentFirst}`,
    `- Last name: ${studentLast}`,
    `- University: ${input.university.trim() || 'Not specified'}`,
    `- Course: ${input.course.trim() || 'Not specified'}`,
    `- Year of study: ${input.yearOfStudy != null && Number.isFinite(input.yearOfStudy) ? String(input.yearOfStudy) : 'Not specified'}`,
    `- Student type: ${input.studentType.trim() || 'Not specified'}`,
    `- Verification: Uni email verified: ${input.uniEmailVerified ? 'yes' : 'no'}, Work email verified: ${input.workEmailVerified ? 'yes' : 'no'}, ID provided: ${input.idProvided ? 'yes' : 'no'}, Enrolment provided: ${input.enrolmentProvided ? 'yes' : 'no'}`,
    `- Room type preference: ${input.roomTypePreference.trim() || 'Not specified'}`,
    `- Budget: ${formatBudgetLine(input.budgetMin, input.budgetMax)}`,
    `- Smoker: ${formatSmoker(input.isSmoker)}`,
    `- Occupancy preference: ${input.occupancyType?.trim() || 'Not specified'}`,
    `- Move-in flexibility: ${input.moveInFlexibility?.trim() || 'Not specified'}`,
    `- Has pets: ${formatSmoker(input.hasPets)}`,
    `- Needs parking: ${formatSmoker(input.needsParking)}`,
    `- Bills preference: ${input.billsPreference?.trim() || 'Not specified'}`,
    `- Furnishing preference: ${input.furnishingPreference?.trim() || 'Not specified'}`,
    `- Has guarantor: ${formatSmoker(input.hasGuarantor)}`,
  ]
  if (input.guarantorName?.trim()) {
    lines.push(`- Guarantor name (provided): ${input.guarantorName.trim()}`)
  }
  if (input.propertyContext?.trim()) {
    lines.push('', 'Listing / booking context:', input.propertyContext.trim())
  }
  return lines.join('\n')
}

type StudentProfileDb = {
  id: string
  verification_type: string | null
  first_name: string | null
  last_name: string | null
  full_name: string | null
  course: string | null
  year_of_study: number | null
  student_type: string | null
  room_type_preference: string | null
  budget_min_per_week: number | null
  budget_max_per_week: number | null
  is_smoker: boolean | null
  uni_email_verified: boolean | null
  work_email_verified: boolean | null
  id_submitted_at: string | null
  enrolment_submitted_at: string | null
  occupancy_type: string | null
  move_in_flexibility: string | null
  has_pets: boolean | null
  needs_parking: boolean | null
  bills_preference: string | null
  furnishing_preference: string | null
  has_guarantor: boolean | null
  guarantor_name: string | null
  universities: { name: string } | null
}

function studentProfileFromBookingJoin(spRaw: unknown): StudentProfileDb | null {
  if (spRaw == null) return null
  const row =
    Array.isArray(spRaw) && spRaw.length > 0 && typeof spRaw[0] === 'object' && spRaw[0]
      ? spRaw[0]
      : typeof spRaw === 'object' && !Array.isArray(spRaw)
        ? spRaw
        : null
  if (!row) return null
  return row as unknown as StudentProfileDb
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
    .select('id, first_name, full_name')
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

  let landlordFirstName = landlordFirstFromProfile(lpRow.first_name, lpRow.full_name)
  const bodyLandlordHint =
    typeof body.landlordFirstName === 'string' ? body.landlordFirstName.trim().slice(0, 80) : ''
  if (!landlordFirstName && bodyLandlordHint) landlordFirstName = bodyLandlordHint
  if (!landlordFirstName) landlordFirstName = 'there'

  let userMessage: string
  let persistBookingId: string | null = null

  if (bookingId) {
    const { data: booking, error: bErr } = await admin
      .from('bookings')
      .select(
        `
        id,
        landlord_id,
        status,
        student_id,
        move_in_date,
        start_date,
        lease_length,
        weekly_rent,
        ai_assessment,
        ai_assessment_at,
        properties (
          title,
          address,
          suburb,
          state,
          rent_per_week,
          room_type,
          furnished,
          bond,
          lease_length,
          available_from,
          listing_type,
          property_features ( features ( name ) )
        ),
        student_profiles (
          id,
          verification_type,
          first_name,
          last_name,
          full_name,
          course,
          year_of_study,
          student_type,
          room_type_preference,
          budget_min_per_week,
          budget_max_per_week,
          is_smoker,
          uni_email_verified,
          work_email_verified,
          id_submitted_at,
          enrolment_submitted_at,
          occupancy_type,
          move_in_flexibility,
          has_pets,
          needs_parking,
          bills_preference,
          furnishing_preference,
          has_guarantor,
          guarantor_name,
          universities ( name )
        )
      `,
      )
      .eq('id', bookingId)
      .maybeSingle()

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
      const last = new Date(booking.ai_assessment_at).getTime()
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

    const sp = studentProfileFromBookingJoin(booking.student_profiles)
    if (!sp || sp.verification_type !== 'student') {
      return json({ error: 'AI assessment is only available for fully verified student tenants.' }, 403, origin)
    }

    const uni = sp.universities && typeof sp.universities === 'object' ? sp.universities.name?.trim() ?? '' : ''
    const firstName = sp.first_name?.trim() || ''
    const lastName = sp.last_name?.trim() || ''
    const propRaw = booking.properties
    const prop =
      propRaw && typeof propRaw === 'object' && !Array.isArray(propRaw)
        ? (propRaw as Record<string, unknown>)
        : null
    const propParts: string[] = []
    if (prop && 'title' in prop) {
      propParts.push(`Title: ${String(prop.title ?? '')}`)
      if (prop.suburb) propParts.push(`Suburb: ${String(prop.suburb)}`)
      if (prop.rent_per_week != null) propParts.push(`Weekly rent: $${Number(prop.rent_per_week)}`)
      if (prop.room_type) propParts.push(`Room / listing type: ${String(prop.room_type)}`)
      if (prop.furnished === true) propParts.push('Furnished: yes')
      else if (prop.furnished === false) propParts.push('Furnished: no')
      if (prop.bond != null) propParts.push(`Bond (weeks/value on file): ${String(prop.bond)}`)
      if (prop.lease_length) propParts.push(`Typical lease on listing: ${String(prop.lease_length)}`)
      if (prop.available_from) propParts.push(`Available from: ${String(prop.available_from).slice(0, 10)}`)
      if (prop.listing_type) propParts.push(`Listing category: ${String(prop.listing_type)}`)
      const featLine = propertyFeaturesLine(prop.property_features)
      if (featLine) propParts.push(featLine)
    }
    propParts.push(
      `Requested move-in: ${String(booking.move_in_date || booking.start_date || '').slice(0, 10)}`,
      `Requested lease length: ${String(booking.lease_length || '').trim() || 'Not specified'}`,
    )

    userMessage = buildUserMessage({
      landlordFirstName,
      firstName,
      lastName,
      university: uni,
      course: sp.course?.trim() ?? '',
      studentType: sp.student_type?.trim() ?? '',
      yearOfStudy: sp.year_of_study ?? null,
      uniEmailVerified: sp.uni_email_verified === true,
      workEmailVerified: sp.work_email_verified === true,
      idProvided: Boolean(sp.id_submitted_at),
      enrolmentProvided: Boolean(sp.enrolment_submitted_at),
      roomTypePreference: sp.room_type_preference?.trim() ?? '',
      budgetMin: sp.budget_min_per_week ?? null,
      budgetMax: sp.budget_max_per_week ?? null,
      isSmoker: sp.is_smoker ?? null,
      occupancyType: sp.occupancy_type ?? null,
      moveInFlexibility: sp.move_in_flexibility ?? null,
      hasPets: sp.has_pets ?? null,
      needsParking: sp.needs_parking ?? null,
      billsPreference: sp.bills_preference ?? null,
      furnishingPreference: sp.furnishing_preference ?? null,
      hasGuarantor: sp.has_guarantor ?? null,
      guarantorName: sp.guarantor_name ?? null,
      propertyContext: propParts.join('\n'),
    })
    persistBookingId = booking.id
  } else {
    const applicantProfileId =
      typeof body.applicantProfileId === 'string' ? body.applicantProfileId.trim() : ''
    if (!applicantProfileId) {
      return json({ error: 'applicantProfileId is required when bookingId is omitted' }, 400, origin)
    }

    const { data: applicantRow, error: applicantErr } = await admin
      .from('student_profiles')
      .select('verification_type')
      .eq('id', applicantProfileId)
      .maybeSingle()

    if (applicantErr || !applicantRow || applicantRow.verification_type !== 'student') {
      return json({ error: 'AI assessment is only available for fully verified student tenants.' }, 403, origin)
    }

    const firstName = typeof body.firstName === 'string' ? body.firstName : ''
    const lastName = typeof body.lastName === 'string' ? body.lastName : ''
    const university = typeof body.university === 'string' ? body.university : ''
    const course = typeof body.course === 'string' ? body.course : ''
    const studentType = typeof body.studentType === 'string' ? body.studentType : ''
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

    if (typeof body.uniEmailVerified !== 'boolean') {
      return json({ error: 'uniEmailVerified must be a boolean' }, 400, origin)
    }
    if (typeof body.idProvided !== 'boolean') {
      return json({ error: 'idProvided must be a boolean' }, 400, origin)
    }
    if (typeof body.enrolmentProvided !== 'boolean') {
      return json({ error: 'enrolmentProvided must be a boolean' }, 400, origin)
    }

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

    userMessage = buildUserMessage({
      landlordFirstName,
      firstName,
      lastName,
      university,
      course,
      studentType,
      yearOfStudy: yearOfStudy ?? null,
      uniEmailVerified,
      workEmailVerified,
      idProvided,
      enrolmentProvided,
      roomTypePreference,
      budgetMin,
      budgetMax,
      isSmoker,
      occupancyType: occ,
      moveInFlexibility: flex,
      hasPets,
      needsParking,
      billsPreference: bills,
      furnishingPreference: furn,
      hasGuarantor,
      guarantorName,
      propertyContext: null,
    })
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
  }

  return json({ assessment, assessmentAt: nowIso, cached: false }, 200, origin)
}
