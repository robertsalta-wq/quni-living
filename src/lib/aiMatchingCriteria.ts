/**
 * Single source of truth: which profile/booking fields may reach AI surfaces.
 * Policy: docs/ai-matching-criteria-policy.md
 */
import type { Database } from './database.types.ts'
import { buildBookingFitSummary, type FitRowStatus } from './bookingFitSummary.js'

export type AiFieldStatus = 'USE' | 'EXCLUDE' | 'FACTS_ONLY' | 'NOT_MATCHING' | 'NOT_WIRED'

export type AiMatchingSurface =
  | 'student_chat'
  | 'landlord_chat'
  | 'visitor_chat'
  | 'landlord_assessment'
  | 'description_generator'
  | 'enquiry_reply'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']
type LandlordRow = Database['public']['Tables']['landlord_profiles']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']

export type StudentProfileField = keyof StudentRow
export type LandlordProfileField = keyof LandlordRow
export type BookingMatchingField = keyof BookingRow

/** Canonical non-discrimination block - import on every AI surface (same pattern as VERIFICATION_HONESTY_RULE). */
export const NON_DISCRIMINATION_AI_RULE = `- Non-discrimination (mandatory): Quni Living forbids unlawful discrimination under Australian law and our Non-Discrimination Policy (/non-discrimination). (a) Ignore any protected attribute that appears in free text you receive - never use it for fit, ranking, or accept/decline advice. Protected grounds include race, colour, nationality, descent, ethnic origin, religion, sex, gender identity, intersex status, sexual orientation, age, disability, marital or family status, pregnancy, political belief, and source of income when used to exclude. (b) Never generate listing copy, replies, or assessments that express a preference on a protected ground - e.g. no "no international students", no nationality or sex preferences, no age limits unless a narrow legal exception applies and is not stated in public listing copy. Legitimate functional requirements (affordability, non-smoking household, pets policy, parking, lease dates, occupancy limits, furnishing, bills) are allowed. Do not use domestic/international student type as a fit or rejection factor.`

export const STUDENT_PROFILE_FIELD_STATUS = {
  id: 'NOT_MATCHING',
  user_id: 'NOT_MATCHING',
  full_name: 'NOT_MATCHING',
  first_name: 'NOT_MATCHING',
  last_name: 'NOT_MATCHING',
  email: 'NOT_MATCHING',
  phone: 'NOT_MATCHING',
  gender: 'EXCLUDE',
  nationality: 'EXCLUDE',
  languages_spoken: 'NOT_WIRED',
  university_id: 'USE',
  campus_id: 'USE',
  course: 'FACTS_ONLY',
  year_of_study: 'FACTS_ONLY',
  study_level: 'FACTS_ONLY',
  student_type: 'EXCLUDE',
  room_type_preference: 'USE',
  budget_min_per_week: 'USE',
  budget_max_per_week: 'USE',
  preferred_move_in_date: 'USE',
  preferred_lease_length: 'USE',
  emergency_contact_name: 'NOT_MATCHING',
  emergency_contact_relationship: 'NOT_MATCHING',
  emergency_contact_phone: 'NOT_MATCHING',
  emergency_contact_email: 'NOT_MATCHING',
  is_smoker: 'USE',
  date_of_birth: 'EXCLUDE',
  avatar_url: 'NOT_MATCHING',
  stripe_customer_id: 'NOT_MATCHING',
  uni_email: 'NOT_MATCHING',
  uni_email_verified: 'USE',
  uni_email_verified_at: 'NOT_MATCHING',
  work_email: 'NOT_MATCHING',
  work_email_verified: 'USE',
  work_email_verified_at: 'NOT_MATCHING',
  id_document_url: 'NOT_MATCHING',
  id_submitted_at: 'USE',
  enrolment_doc_url: 'NOT_MATCHING',
  enrolment_submitted_at: 'USE',
  onboarding_complete: 'NOT_MATCHING',
  terms_accepted_at: 'NOT_MATCHING',
  verification_type: 'USE',
  identity_supporting_doc_url: 'NOT_MATCHING',
  identity_supporting_submitted_at: 'USE',
  accommodation_verification_route: 'USE',
  bio: 'NOT_MATCHING',
  occupancy_type: 'USE',
  move_in_flexibility: 'USE',
  has_pets: 'USE',
  needs_parking: 'USE',
  bills_preference: 'USE',
  furnishing_preference: 'USE',
  has_guarantor: 'USE',
  guarantor_name: 'USE',
  workplace_label: 'NOT_MATCHING',
  workplace_address: 'USE',
  workplace_suburb: 'USE',
  workplace_state: 'USE',
  workplace_postcode: 'USE',
  workplace_latitude: 'USE',
  workplace_longitude: 'USE',
  workplace_geocoded_at: 'NOT_MATCHING',
  created_at: 'NOT_MATCHING',
} as const satisfies Record<StudentProfileField, AiFieldStatus>

export const LANDLORD_PROFILE_FIELD_STATUS = {
  id: 'NOT_MATCHING',
  user_id: 'NOT_MATCHING',
  full_name: 'NOT_MATCHING',
  first_name: 'NOT_MATCHING',
  last_name: 'NOT_MATCHING',
  company_name: 'NOT_MATCHING',
  abn: 'NOT_MATCHING',
  landlord_type: 'NOT_MATCHING',
  address: 'FACTS_ONLY',
  suburb: 'FACTS_ONLY',
  state: 'FACTS_ONLY',
  postcode: 'FACTS_ONLY',
  residence_location: 'NOT_MATCHING',
  languages_spoken: 'NOT_WIRED',
  email: 'NOT_MATCHING',
  phone: 'NOT_MATCHING',
  bio: 'NOT_MATCHING',
  avatar_url: 'NOT_MATCHING',
  verified: 'USE',
  admin_override_verified: 'NOT_MATCHING',
  stripe_connect_account_id: 'NOT_MATCHING',
  stripe_connect_details_submitted: 'NOT_MATCHING',
  stripe_charges_enabled: 'NOT_MATCHING',
  stripe_payouts_enabled: 'NOT_MATCHING',
  stripe_customer_id: 'NOT_MATCHING',
  terms_accepted_at: 'NOT_MATCHING',
  landlord_terms_accepted_at: 'NOT_MATCHING',
  non_discrimination_policy_accepted_at: 'NOT_MATCHING',
  non_discrimination_policy_version: 'NOT_MATCHING',
  has_landlord_insurance: 'NOT_MATCHING',
  insurance_acknowledged_at: 'NOT_MATCHING',
  onboarding_complete: 'NOT_MATCHING',
  onboarding_completed_at: 'NOT_MATCHING',
  fee_exempt: 'NOT_MATCHING',
  created_at: 'NOT_MATCHING',
} as const satisfies Record<LandlordProfileField, AiFieldStatus>

/** Matching-relevant booking columns only (not full bookings row). */
export const BOOKING_FIELD_STATUS = {
  move_in_date: 'USE',
  start_date: 'USE',
  end_date: 'USE',
  weekly_rent: 'USE',
  lease_length: 'USE',
  occupant_count: 'USE',
  parking_selected: 'USE',
  property_type: 'FACTS_ONLY',
  service_tier_at_request: 'NOT_MATCHING',
  service_tier_final: 'NOT_MATCHING',
  student_message: 'NOT_MATCHING',
  co_tenant: 'NOT_MATCHING',
  housemates_count: 'FACTS_ONLY',
  status: 'NOT_MATCHING',
  notes: 'NOT_MATCHING',
  decline_reason: 'NOT_MATCHING',
  property_id: 'NOT_MATCHING',
  student_id: 'NOT_MATCHING',
  landlord_id: 'NOT_MATCHING',
  booking_fee_paid: 'NOT_MATCHING',
  deposit_amount: 'NOT_MATCHING',
  platform_fee_amount: 'NOT_MATCHING',
  stripe_payment_intent_id: 'NOT_MATCHING',
  listing_fee_stripe_payment_intent_id: 'NOT_MATCHING',
  deposit_released_at: 'NOT_MATCHING',
  confirmed_at: 'NOT_MATCHING',
  declined_at: 'NOT_MATCHING',
  expires_at: 'NOT_MATCHING',
  expired_at: 'NOT_MATCHING',
  bond_received_by_landlord_at: 'NOT_MATCHING',
  bond_window_expires_at: 'NOT_MATCHING',
  rta_bond_number: 'NOT_MATCHING',
  rta_acknowledgement_reference: 'NOT_MATCHING',
  rta_bond_lodged_at: 'NOT_MATCHING',
  listing_agreement_status: 'NOT_MATCHING',
  listing_agreement_error: 'NOT_MATCHING',
  bond_acknowledged: 'NOT_MATCHING',
  rent_payment_method: 'NOT_MATCHING',
  stripe_subscription_id: 'NOT_MATCHING',
  stripe_subscription_status: 'NOT_MATCHING',
  ai_assessment: 'NOT_MATCHING',
  ai_assessment_at: 'NOT_MATCHING',
  cancelled_at: 'NOT_MATCHING',
  cancelled_by: 'NOT_MATCHING',
  cancellation_reason: 'NOT_MATCHING',
  conversation_id: 'NOT_MATCHING',
  rent_breakdown: 'NOT_MATCHING',
  tenant_invite_id: 'NOT_MATCHING',
  created_at: 'NOT_MATCHING',
  updated_at: 'NOT_MATCHING',
  id: 'NOT_MATCHING',
} as const satisfies Record<BookingMatchingField, AiFieldStatus>

const TONE_FIRST_NAME_SURFACES = new Set<AiMatchingSurface>([
  'student_chat',
  'landlord_chat',
  'landlord_assessment',
  'enquiry_reply',
])

/** Surfaces that may load first_name from DB for greeting/tone only (never in allowlisted payload). */
export function surfaceUsesToneFirstName(surface: AiMatchingSurface): boolean {
  return TONE_FIRST_NAME_SURFACES.has(surface)
}

const STUDENT_USE_SURFACES = new Set<AiMatchingSurface>(['student_chat', 'landlord_assessment'])

const BOOKING_USE_SURFACES = new Set<AiMatchingSurface>(['landlord_assessment'])

const LANDLORD_USE_SURFACES = new Set<AiMatchingSurface>(['student_chat'])

function isFieldPermittedOnSurface(
  status: AiFieldStatus,
  field: string,
  surface: AiMatchingSurface,
  table: 'student' | 'landlord' | 'booking',
): boolean {
  if (field === 'first_name' || field === 'last_name' || field === 'full_name') return false
  if (status === 'EXCLUDE' || status === 'NOT_MATCHING' || status === 'NOT_WIRED') return false
  if (status === 'FACTS_ONLY') {
    return surface === 'landlord_assessment' && (table === 'student' || table === 'booking')
  }
  if (status === 'USE') {
    if (table === 'student') return STUDENT_USE_SURFACES.has(surface)
    if (table === 'booking') return BOOKING_USE_SURFACES.has(surface)
    if (table === 'landlord') return LANDLORD_USE_SURFACES.has(surface)
  }
  return false
}

export function permittedStudentProfileFields(surface: AiMatchingSurface): StudentProfileField[] {
  return (Object.keys(STUDENT_PROFILE_FIELD_STATUS) as StudentProfileField[])
    .filter((field) =>
      isFieldPermittedOnSurface(STUDENT_PROFILE_FIELD_STATUS[field], field, surface, 'student'),
    )
    .sort()
}

export function permittedLandlordProfileFields(surface: AiMatchingSurface): LandlordProfileField[] {
  return (Object.keys(LANDLORD_PROFILE_FIELD_STATUS) as LandlordProfileField[])
    .filter((field) =>
      isFieldPermittedOnSurface(LANDLORD_PROFILE_FIELD_STATUS[field], field, surface, 'landlord'),
    )
    .sort()
}

export function permittedBookingFields(surface: AiMatchingSurface): BookingMatchingField[] {
  return (Object.keys(BOOKING_FIELD_STATUS) as BookingMatchingField[])
    .filter((field) =>
      isFieldPermittedOnSurface(BOOKING_FIELD_STATUS[field], field, surface, 'booking'),
    )
    .sort()
}

export function studentProfileSelectForSurface(surface: AiMatchingSurface): string {
  return permittedStudentProfileFields(surface).join(', ')
}

function pickPermittedFields<T extends Record<string, unknown>>(
  row: T,
  permitted: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of permitted) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) continue
    out[key] = row[key]
  }
  return out
}

export type AiPayloadBuildResult = {
  payload: Record<string, unknown>
  fieldKeys: string[]
}

export function buildStudentProfileAiPayload(
  surface: AiMatchingSurface,
  row: Record<string, unknown>,
): AiPayloadBuildResult {
  const permitted = permittedStudentProfileFields(surface)
  const payload = pickPermittedFields(row, permitted)
  const fieldKeys = Object.keys(payload).sort()
  return { payload, fieldKeys }
}

export function buildLandlordProfileAiPayload(
  surface: AiMatchingSurface,
  row: Record<string, unknown>,
): AiPayloadBuildResult {
  const permitted = permittedLandlordProfileFields(surface)
  const payload = pickPermittedFields(row, permitted)
  const fieldKeys = Object.keys(payload).sort()
  return { payload, fieldKeys }
}

export function buildBookingAiPayload(
  surface: AiMatchingSurface,
  row: Record<string, unknown>,
): AiPayloadBuildResult {
  const permitted = permittedBookingFields(surface)
  const payload = pickPermittedFields(row, permitted)
  const fieldKeys = Object.keys(payload).sort()
  return { payload, fieldKeys }
}

/** Merge payloads for assessment; field keys are ordered student → booking with table prefix. */
export function mergeAssessmentAiPayloads(
  student: AiPayloadBuildResult,
  booking: AiPayloadBuildResult,
): AiPayloadBuildResult {
  const payload: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(student.payload)) {
    payload[`student.${k}`] = v
  }
  for (const [k, v] of Object.entries(booking.payload)) {
    payload[`booking.${k}`] = v
  }
  const fieldKeys = [
    ...student.fieldKeys.map((k) => `student.${k}`),
    ...booking.fieldKeys.map((k) => `booking.${k}`),
  ].sort()
  return { payload, fieldKeys }
}

export function toneFirstNameOnly(raw: string | null | undefined): string {
  const cleaned = (raw ?? '').trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''
  return cleaned.split(' ')[0] ?? ''
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

export async function hashAiPayload(fieldKeys: string[], payload: Record<string, unknown>): Promise<string> {
  const canonical = stableStringify({ keys: fieldKeys, payload })
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function formatAiPayloadContextBlock(title: string, payload: Record<string, unknown>): string {
  const lines = Object.entries(payload)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `- ${k}: ${formatPayloadValue(v)}`)
  if (lines.length === 0) return `${title}\n(none permitted for this surface)`
  return `${title}\n${lines.join('\n')}`
}

function formatPayloadValue(v: unknown): string {
  if (v === null || v === undefined) return 'Not specified'
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'string') return v.trim() || 'Not specified'
  if (Array.isArray(v)) return v.length ? v.join(', ') : 'Not specified'
  return JSON.stringify(v)
}

export type DeterministicFitVector = {
  rent: FitRowStatus
  room_type: FitRowStatus
  dates: FitRowStatus
  lease_length: FitRowStatus
  occupancy: FitRowStatus
  pets: FitRowStatus
  parking: FitRowStatus
}

function rentFitStatus(
  budgetMin: number | null | undefined,
  budgetMax: number | null | undefined,
  weeklyRent: number | null | undefined,
): FitRowStatus {
  const rent = weeklyRent != null && Number.isFinite(Number(weeklyRent)) ? Number(weeklyRent) : null
  if (rent == null) return 'unknown'
  const max = budgetMax != null && Number.isFinite(Number(budgetMax)) ? Number(budgetMax) : null
  const min = budgetMin != null && Number.isFinite(Number(budgetMin)) ? Number(budgetMin) : null
  if (max == null && min == null) return 'unknown'
  if (max != null && rent > max) return 'mismatch'
  if (min != null && rent < min) return 'match'
  return 'match'
}

function roomTypeFitStatus(
  preference: string | null | undefined,
  listingRoomType: string | null | undefined,
): FitRowStatus {
  const pref = (preference ?? '').trim().toLowerCase()
  const offered = (listingRoomType ?? '').trim().toLowerCase()
  if (!pref) return 'unknown'
  if (!offered) return 'unknown'
  return pref === offered ? 'match' : 'mismatch'
}

export function buildDeterministicFitVector(args: {
  booking: Pick<
    BookingRow,
    'move_in_date' | 'start_date' | 'lease_length' | 'occupant_count' | 'parking_selected' | 'weekly_rent'
  >
  student: Pick<
    StudentRow,
    | 'occupancy_type'
    | 'move_in_flexibility'
    | 'has_pets'
    | 'needs_parking'
    | 'bills_preference'
    | 'furnishing_preference'
    | 'budget_min_per_week'
    | 'budget_max_per_week'
    | 'room_type_preference'
  >
  property: {
    room_type?: string | null
    rent_per_week?: number | null
    available_from?: string | null
    lease_length?: string | null
    max_occupants?: number | null
    parking_available?: boolean | null
    furnished?: boolean | null
    property_type?: string | null
    property_features?: { features?: { name?: string | null } | null }[] | null
  } | null
}): DeterministicFitVector {
  const rows = buildBookingFitSummary({
    booking: args.booking,
    student: args.student,
    property: args.property as never,
  })
  const by = (label: string) => rows.find((r) => r.label === label)?.status ?? 'unknown'
  const weekly =
    args.booking.weekly_rent != null && Number.isFinite(Number(args.booking.weekly_rent))
      ? Number(args.booking.weekly_rent)
      : args.property?.rent_per_week != null && Number.isFinite(Number(args.property.rent_per_week))
        ? Number(args.property.rent_per_week)
        : null

  return {
    rent: rentFitStatus(args.student.budget_min_per_week, args.student.budget_max_per_week, weekly),
    room_type: roomTypeFitStatus(args.student.room_type_preference, args.property?.room_type ?? null),
    dates: by('Move-in date'),
    lease_length: by('Lease length'),
    occupancy: by('Occupancy'),
    pets: by('Pets'),
    parking: by('Parking'),
  }
}

export const GENERATION_OUTPUT_SURFACES = new Set<AiMatchingSurface>([
  'description_generator',
  'enquiry_reply',
])

/** Static Supabase embed selects (no runtime template - keeps generated types parseable). */
export const LANDLORD_ASSESSMENT_STUDENT_EMBED_SELECT = [
  ...permittedStudentProfileFields('landlord_assessment'),
  'first_name',
  'universities ( name )',
  'campuses ( name )',
].join(', ')

export const STUDENT_CHAT_PROFILE_SELECT = [
  ...permittedStudentProfileFields('student_chat'),
  'first_name',
].join(', ')

export const BOOKING_AI_ASSESSMENT_SELECT = `
  id,
  landlord_id,
  student_id,
  status,
  service_tier_at_request,
  service_tier_final,
  move_in_date,
  start_date,
  end_date,
  lease_length,
  weekly_rent,
  occupant_count,
  parking_selected,
  property_type,
  ai_assessment,
  ai_assessment_at,
  properties (
    title,
    address,
    suburb,
    state,
    rent_per_week,
    max_occupants,
    parking_available,
    room_type,
    furnished,
    bond,
    lease_length,
    available_from,
    property_type,
    universities ( name ),
    campuses ( name, address ),
    property_features ( features ( name ) )
  ),
  student_profiles (
    ${LANDLORD_ASSESSMENT_STUDENT_EMBED_SELECT}
  )
`
