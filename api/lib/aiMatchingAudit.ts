/**
 * Append-only compliance audit for AI matching and landlord review actions.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { captureSentryMessageEdge } from './sentryEdgeCapture.js'
import {
  buildBookingAiPayload,
  buildDeterministicFitVector,
  buildStudentProfileAiPayload,
  hashAiPayload,
  mergeAssessmentAiPayloads,
  type AiMatchingSurface,
  type DeterministicFitVector,
} from '../../src/lib/aiMatchingCriteria.js'
import {
  buildBookingFitSummary,
  formatBookingFitSummaryForPrompt,
  type BookingFitPropertyInput,
  type BookingFitStudentInput,
} from './bookingFitForAssessment.js'

export class AiMatchingAuditError extends Error {
  readonly causeDetail: unknown

  constructor(message: string, causeDetail?: unknown) {
    super(message)
    this.name = 'AiMatchingAuditError'
    this.causeDetail = causeDetail
  }
}

export type AiMatchingAuditEventType = 'ai_assessment' | 'landlord_confirm' | 'landlord_decline'

export type RecordAiMatchingAuditInput = {
  bookingId: string
  landlordId?: string | null
  studentId?: string | null
  eventType: AiMatchingAuditEventType
  aiSurface?: AiMatchingSurface | null
  serviceTier?: 'listing' | 'managed' | null
  outcome: string
  decisionReason?: string | null
  fitVector: DeterministicFitVector
  payloadFieldKeys: string[]
  payloadHash: string
  metadata?: Record<string, unknown>
}

export async function insertAiMatchingComplianceAudit(
  admin: SupabaseClient,
  input: RecordAiMatchingAuditInput,
): Promise<void> {
  const { error } = await admin.from('ai_matching_compliance_audit').insert({
    booking_id: input.bookingId,
    landlord_id: input.landlordId ?? null,
    student_id: input.studentId ?? null,
    event_type: input.eventType,
    ai_surface: input.aiSurface ?? null,
    service_tier: input.serviceTier ?? null,
    outcome: input.outcome,
    decision_reason: input.decisionReason?.trim() || null,
    fit_vector: input.fitVector,
    payload_field_keys: input.payloadFieldKeys,
    payload_hash: input.payloadHash,
    metadata: input.metadata ?? {},
  })
  if (error) {
    console.error('[aiMatchingAudit] insert failed', error)
    await captureSentryMessageEdge('AI matching compliance audit insert failed', {
      bookingId: input.bookingId,
      eventType: input.eventType,
      aiSurface: input.aiSurface ?? null,
      outcome: input.outcome,
      supabaseError: error.message,
      code: error.code,
    })
    throw new AiMatchingAuditError('Compliance audit record could not be saved', error)
  }
}

export async function loadBookingFitAuditContext(
  admin: SupabaseClient,
  bookingId: string,
): Promise<{
  booking: Record<string, unknown>
  student: Record<string, unknown> | null
  property: BookingFitPropertyInput | null
} | null> {
  const { data, error } = await admin
    .from('bookings')
    .select(
      `
      id,
      student_id,
      landlord_id,
      move_in_date,
      start_date,
      end_date,
      lease_length,
      weekly_rent,
      occupant_count,
      parking_selected,
      property_type,
      service_tier_at_request,
      service_tier_final,
      properties (
        rent_per_week,
        room_type,
        furnished,
        lease_length,
        available_from,
        max_occupants,
        parking_available,
        property_type,
        property_features ( features ( name ) )
      ),
      student_profiles (
        room_type_preference,
        budget_min_per_week,
        budget_max_per_week,
        occupancy_type,
        move_in_flexibility,
        has_pets,
        needs_parking,
        bills_preference,
        furnishing_preference
      )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (error || !data) return null

  const spRaw = data.student_profiles
  const student =
    spRaw && typeof spRaw === 'object' && !Array.isArray(spRaw)
      ? (spRaw as Record<string, unknown>)
      : Array.isArray(spRaw) && spRaw[0] && typeof spRaw[0] === 'object'
        ? (spRaw[0] as Record<string, unknown>)
        : null

  const propRaw = data.properties
  const property =
    propRaw && typeof propRaw === 'object' && !Array.isArray(propRaw)
      ? (propRaw as BookingFitPropertyInput)
      : null

  return { booking: data as Record<string, unknown>, student, property }
}

export async function buildAuditFromBookingContext(
  admin: SupabaseClient,
  bookingId: string,
  args: {
    eventType: AiMatchingAuditEventType
    aiSurface?: AiMatchingSurface | null
    outcome: string
    decisionReason?: string | null
    extraPayload?: Record<string, unknown>
    extraFieldKeys?: string[]
  },
): Promise<RecordAiMatchingAuditInput | null> {
  const ctx = await loadBookingFitAuditContext(admin, bookingId)
  if (!ctx) return null

  const { booking, student, property } = ctx
  const studentPayload = student
    ? buildStudentProfileAiPayload('landlord_assessment', student)
    : { payload: {}, fieldKeys: [] as string[] }
  const bookingPayload = buildBookingAiPayload('landlord_assessment', booking)
  const merged = mergeAssessmentAiPayloads(studentPayload, bookingPayload)

  const extraKeys = args.extraFieldKeys ?? []
  const extraPayload = args.extraPayload ?? {}
  const payload = { ...merged.payload, ...extraPayload }
  const fieldKeys = [...merged.fieldKeys, ...extraKeys].sort()
  const payloadHash = await hashAiPayload(fieldKeys, payload)

  const fitVector = buildDeterministicFitVector({
    booking: booking as never,
    student: (student ?? {}) as never,
    property,
  })

  const tierRaw = booking.service_tier_final ?? booking.service_tier_at_request
  const serviceTier = tierRaw === 'listing' || tierRaw === 'managed' ? tierRaw : null

  return {
    bookingId,
    landlordId: typeof booking.landlord_id === 'string' ? booking.landlord_id : null,
    studentId: typeof booking.student_id === 'string' ? booking.student_id : null,
    eventType: args.eventType,
    aiSurface: args.aiSurface ?? null,
    serviceTier,
    outcome: args.outcome,
    decisionReason: args.decisionReason ?? null,
    fitVector,
    payloadFieldKeys: fieldKeys,
    payloadHash,
  }
}

export function buildAssessmentExtraContext(args: {
  universityName?: string
  campusName?: string | null
  propertyListingLines: string[]
  fitSummaryBlock: string
  landlordFirstName: string
  applicantFirstName: string
}): { extraPayload: Record<string, unknown>; extraFieldKeys: string[] } {
  const extraPayload: Record<string, unknown> = {}
  const extraFieldKeys: string[] = []

  if (args.landlordFirstName.trim()) {
    extraPayload['tone.landlord_first_name'] = args.landlordFirstName.trim()
    extraFieldKeys.push('tone.landlord_first_name')
  }
  if (args.applicantFirstName.trim()) {
    extraPayload['tone.applicant_first_name'] = args.applicantFirstName.trim()
    extraFieldKeys.push('tone.applicant_first_name')
  }
  if (args.universityName?.trim()) {
    extraPayload['context.university_name'] = args.universityName.trim()
    extraFieldKeys.push('context.university_name')
  }
  if (args.campusName?.trim()) {
    extraPayload['context.campus_name'] = args.campusName.trim()
    extraFieldKeys.push('context.campus_name')
  }
  if (args.propertyListingLines.length) {
    extraPayload['context.property_listing'] = args.propertyListingLines.join('\n')
    extraFieldKeys.push('context.property_listing')
  }
  if (args.fitSummaryBlock.trim()) {
    extraPayload['context.fit_summary'] = args.fitSummaryBlock.trim()
    extraFieldKeys.push('context.fit_summary')
  }

  return { extraPayload, extraFieldKeys }
}

export function formatLandlordAssessmentUserMessage(payload: Record<string, unknown>): string {
  const toneLandlord = payload['tone.landlord_first_name']
  const toneApplicant = payload['tone.applicant_first_name']
  const lines: string[] = []

  if (typeof toneLandlord === 'string' && toneLandlord.trim()) {
    lines.push(`Landlord name: ${toneLandlord.trim()}`)
  }

  lines.push('Applicant profile (allowlisted fields only):')
  const studentBooking = Object.entries(payload)
    .filter(([k]) => k.startsWith('student.') || k.startsWith('booking.'))
    .sort(([a], [b]) => a.localeCompare(b))
  for (const [k, v] of studentBooking) {
    lines.push(`- ${k}: ${formatAuditValue(v)}`)
  }

  const uni = payload['context.university_name']
  const campus = payload['context.campus_name']
  if (typeof uni === 'string' && uni.trim()) lines.push(`- context.university_name: ${uni.trim()}`)
  if (typeof campus === 'string' && campus.trim()) lines.push(`- context.campus_name: ${campus.trim()}`)

  const listing = payload['context.property_listing']
  if (typeof listing === 'string' && listing.trim()) {
    lines.push('', 'Listing / booking context:', listing.trim())
  }

  const fit = payload['context.fit_summary']
  if (typeof fit === 'string' && fit.trim()) {
    lines.push('', 'Listing fit summary (same logic as the on-screen fit table):', fit.trim())
  }

  if (typeof toneApplicant === 'string' && toneApplicant.trim()) {
    lines.push('', `Address the applicant as ${toneApplicant.trim()} throughout.`)
  }

  return lines.join('\n')
}

function formatAuditValue(v: unknown): string {
  if (v === null || v === undefined) return 'Not specified'
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'string') return v.trim() || 'Not specified'
  return JSON.stringify(v)
}

export async function recordLandlordReviewAudit(
  admin: SupabaseClient,
  bookingId: string,
  args: {
    eventType: 'landlord_confirm' | 'landlord_decline'
    outcome: string
    decisionReason?: string | null
  },
): Promise<void> {
  const ctx = await loadBookingFitAuditContext(admin, bookingId)
  if (!ctx) {
    await captureSentryMessageEdge('AI matching compliance audit: booking context missing', {
      bookingId,
      eventType: args.eventType,
    })
    throw new AiMatchingAuditError('Compliance audit context unavailable for booking')
  }

  const fitVector = buildDeterministicFitVector({
    booking: ctx.booking as never,
    student: (ctx.student ?? {}) as never,
    property: ctx.property,
  })
  const payloadFieldKeys: string[] = []
  const payloadHash = await hashAiPayload(payloadFieldKeys, {})

  const booking = ctx.booking
  const tierRaw = booking.service_tier_final ?? booking.service_tier_at_request
  const serviceTier = tierRaw === 'listing' || tierRaw === 'managed' ? tierRaw : null

  await insertAiMatchingComplianceAudit(admin, {
    bookingId,
    landlordId: typeof booking.landlord_id === 'string' ? booking.landlord_id : null,
    studentId: typeof booking.student_id === 'string' ? booking.student_id : null,
    eventType: args.eventType,
    aiSurface: null,
    serviceTier,
    outcome: args.outcome,
    decisionReason: args.decisionReason ?? null,
    fitVector,
    payloadFieldKeys,
    payloadHash,
  })
}

export function buildFitSummaryForAudit(
  booking: Record<string, unknown>,
  student: Record<string, unknown> | null,
  property: BookingFitPropertyInput | null,
): string {
  return formatBookingFitSummaryForPrompt(
    buildBookingFitSummary({
      booking: {
        move_in_date: booking.move_in_date as string | null,
        start_date: (booking.start_date as string | null | undefined) ?? '',
        lease_length: booking.lease_length as string | null,
        occupant_count: booking.occupant_count as number,
        parking_selected: booking.parking_selected as boolean,
      },
      student: {
        occupancy_type: (student?.occupancy_type as BookingFitStudentInput['occupancy_type']) ?? null,
        move_in_flexibility: (student?.move_in_flexibility as BookingFitStudentInput['move_in_flexibility']) ?? null,
        has_pets: (student?.has_pets as boolean | null) ?? null,
        needs_parking: (student?.needs_parking as boolean | null) ?? null,
        bills_preference: (student?.bills_preference as BookingFitStudentInput['bills_preference']) ?? null,
        furnishing_preference:
          (student?.furnishing_preference as BookingFitStudentInput['furnishing_preference']) ?? null,
      },
      property,
    }),
  )
}
