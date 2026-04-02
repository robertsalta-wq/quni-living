/**
 * Landlord student profile AI assessment (Anthropic Claude) — Vercel Edge.
 * Env: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY
 *
 * POST Authorization: Bearer <Supabase access_token> (landlord)
 */
import { createClient } from '@supabase/supabase-js'

export const config = {
  runtime: 'edge',
}

const SYSTEM_PROMPT = `You are a helpful assistant on Quni Living, an Australian student accommodation marketplace. You are helping a landlord review a student who has applied for their property.

Address the landlord by their first name naturally once at the opening of the assessment. Use the student's first name throughout — never refer to them as "this applicant", "the student", or "they" as a substitute for their name.

Based on the student profile data provided, write a short, warm, and balanced 3-4 sentence assessment to help the landlord make an informed decision.

Rules:
- Open naturally addressing the landlord by first name (e.g. "Hi Rob," or just start with their name in context)
- Use the student's first name throughout the assessment
- Be factual and balanced — do not make the decision for the landlord
- Do not reference nationality, gender, or any protected characteristics in your assessment
- Focus on: verification completeness, student status, university and course credibility, housing preference alignment, budget fit, smoking status, and any notable gaps
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
  idProvided: boolean
  enrolmentProvided: boolean
  roomTypePreference: string
  budgetMin: number | null
  budgetMax: number | null
  isSmoker: boolean | null
}): string {
  const studentFirst = input.firstName.trim() || 'Not specified'
  const studentLast = input.lastName.trim() || 'Not specified'
  const landlordLine = input.landlordFirstName.trim() || 'Not specified'
  return [
    `Landlord name: ${landlordLine}`,
    'Student profile:',
    `- First name: ${studentFirst}`,
    `- Last name: ${studentLast}`,
    `- University: ${input.university.trim() || 'Not specified'}`,
    `- Course: ${input.course.trim() || 'Not specified'}`,
    `- Year of study: ${input.yearOfStudy != null && Number.isFinite(input.yearOfStudy) ? String(input.yearOfStudy) : 'Not specified'}`,
    `- Student type: ${input.studentType.trim() || 'Not specified'}`,
    `- Verification: Uni email verified: ${input.uniEmailVerified ? 'yes' : 'no'}, ID provided: ${input.idProvided ? 'yes' : 'no'}, Enrolment provided: ${input.enrolmentProvided ? 'yes' : 'no'}`,
    `- Room type preference: ${input.roomTypePreference.trim() || 'Not specified'}`,
    `- Budget: ${formatBudgetLine(input.budgetMin, input.budgetMax)}`,
    `- Smoker: ${formatSmoker(input.isSmoker)}`,
  ].join('\n')
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
    .select('first_name, full_name')
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

  const applicantProfileId =
    typeof body.applicantProfileId === 'string' ? body.applicantProfileId.trim() : ''
  if (!applicantProfileId) {
    return json({ error: 'applicantProfileId is required' }, 400, origin)
  }

  const { data: applicantRow, error: applicantErr } = await admin
    .from('student_profiles')
    .select('verification_type')
    .eq('id', applicantProfileId)
    .maybeSingle()

  if (applicantErr || !applicantRow || applicantRow.verification_type !== 'student') {
    return json({ error: 'AI assessment is only available for fully verified student tenants.' }, 403, origin)
  }

  const bodyLandlordHint =
    typeof body.landlordFirstName === 'string' ? body.landlordFirstName.trim().slice(0, 80) : ''

  let landlordFirstName = landlordFirstFromProfile(lpRow.first_name, lpRow.full_name)
  if (!landlordFirstName && bodyLandlordHint) {
    landlordFirstName = bodyLandlordHint
  }
  if (!landlordFirstName) {
    landlordFirstName = 'there'
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

  const userMessage = buildUserMessage({
    landlordFirstName,
    firstName,
    lastName,
    university,
    course,
    studentType,
    yearOfStudy: yearOfStudy ?? null,
    uniEmailVerified,
    idProvided,
    enrolmentProvided,
    roomTypePreference,
    budgetMin,
    budgetMax,
    isSmoker,
  })

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

  return json({ assessment }, 200, origin)
}
