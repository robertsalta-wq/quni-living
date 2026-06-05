import { describe, expect, it } from 'vitest'
import type { Database } from './database.types'
import {
  BOOKING_FIELD_STATUS,
  LANDLORD_PROFILE_FIELD_STATUS,
  STUDENT_PROFILE_FIELD_STATUS,
  buildStudentProfileAiPayload,
  permittedStudentProfileFields,
} from './aiMatchingCriteria'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']
type LandlordRow = Database['public']['Tables']['landlord_profiles']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']

function rowKeys<T extends Record<string, unknown>>(statusMap: T): string[] {
  return Object.keys(statusMap).sort()
}

describe('aiMatchingCriteria classification drift', () => {
  it('classifies every student_profiles column', () => {
    const classified = rowKeys(STUDENT_PROFILE_FIELD_STATUS)
    const expected: (keyof StudentRow)[] = [
      'id',
      'user_id',
      'full_name',
      'first_name',
      'last_name',
      'email',
      'phone',
      'gender',
      'nationality',
      'languages_spoken',
      'university_id',
      'campus_id',
      'course',
      'year_of_study',
      'study_level',
      'student_type',
      'room_type_preference',
      'budget_min_per_week',
      'budget_max_per_week',
      'preferred_move_in_date',
      'preferred_lease_length',
      'emergency_contact_name',
      'emergency_contact_relationship',
      'emergency_contact_phone',
      'emergency_contact_email',
      'is_smoker',
      'date_of_birth',
      'avatar_url',
      'stripe_customer_id',
      'uni_email',
      'uni_email_verified',
      'uni_email_verified_at',
      'work_email',
      'work_email_verified',
      'work_email_verified_at',
      'id_document_url',
      'id_submitted_at',
      'enrolment_doc_url',
      'enrolment_submitted_at',
      'onboarding_complete',
      'terms_accepted_at',
      'verification_type',
      'identity_supporting_doc_url',
      'identity_supporting_submitted_at',
      'accommodation_verification_route',
      'bio',
      'occupancy_type',
      'move_in_flexibility',
      'has_pets',
      'needs_parking',
      'bills_preference',
      'furnishing_preference',
      'has_guarantor',
      'guarantor_name',
      'workplace_label',
      'workplace_address',
      'workplace_suburb',
      'workplace_state',
      'workplace_postcode',
      'workplace_latitude',
      'workplace_longitude',
      'workplace_geocoded_at',
      'created_at',
    ]
    expect(classified).toEqual([...expected].sort())
  })

  it('classifies every landlord_profiles column', () => {
    const classified = rowKeys(LANDLORD_PROFILE_FIELD_STATUS)
    const expected: (keyof LandlordRow)[] = [
      'id',
      'user_id',
      'full_name',
      'first_name',
      'last_name',
      'company_name',
      'abn',
      'landlord_type',
      'address',
      'suburb',
      'state',
      'postcode',
      'residence_location',
      'languages_spoken',
      'email',
      'phone',
      'bio',
      'avatar_url',
      'verified',
      'admin_override_verified',
      'stripe_connect_account_id',
      'stripe_connect_details_submitted',
      'stripe_charges_enabled',
      'stripe_payouts_enabled',
      'stripe_customer_id',
      'terms_accepted_at',
      'landlord_terms_accepted_at',
      'non_discrimination_policy_accepted_at',
      'non_discrimination_policy_version',
      'has_landlord_insurance',
      'insurance_acknowledged_at',
      'onboarding_complete',
      'onboarding_completed_at',
      'fee_exempt',
      'created_at',
    ]
    expect(classified).toEqual([...expected].sort())
  })

  it('classifies every bookings column', () => {
    const classified = rowKeys(BOOKING_FIELD_STATUS)
    const expected: (keyof BookingRow)[] = [
      'id',
      'property_id',
      'student_id',
      'landlord_id',
      'start_date',
      'end_date',
      'weekly_rent',
      'status',
      'notes',
      'move_in_date',
      'lease_length',
      'student_message',
      'booking_fee_paid',
      'deposit_amount',
      'platform_fee_amount',
      'stripe_payment_intent_id',
      'listing_fee_stripe_payment_intent_id',
      'deposit_released_at',
      'confirmed_at',
      'declined_at',
      'expires_at',
      'expired_at',
      'bond_received_by_landlord_at',
      'bond_window_expires_at',
      'bond_acknowledged',
      'property_type',
      'rent_payment_method',
      'stripe_subscription_id',
      'stripe_subscription_status',
      'ai_assessment',
      'ai_assessment_at',
      'service_tier_at_request',
      'service_tier_final',
      'decline_reason',
      'cancelled_at',
      'cancelled_by',
      'cancellation_reason',
      'housemates_count',
      'conversation_id',
      'occupant_count',
      'parking_selected',
      'rent_breakdown',
      'co_tenant',
      'created_at',
      'updated_at',
    ]
    expect(classified).toEqual([...expected].sort())
  })
})

describe('aiMatchingCriteria fail-closed payload', () => {
  it('never includes EXCLUDE fields on landlord_assessment', () => {
    const row = {
      first_name: 'Alex',
      gender: 'female',
      nationality: 'Chinese',
      student_type: 'international',
      date_of_birth: '2000-01-01',
      bio: 'Hello world',
      room_type_preference: 'single',
      budget_max_per_week: 400,
    }
    const { payload, fieldKeys } = buildStudentProfileAiPayload('landlord_assessment', row)
    expect(fieldKeys).not.toContain('gender')
    expect(fieldKeys).not.toContain('nationality')
    expect(fieldKeys).not.toContain('student_type')
    expect(fieldKeys).not.toContain('date_of_birth')
    expect(fieldKeys).not.toContain('bio')
    expect(fieldKeys).toContain('room_type_preference')
    expect(payload.gender).toBeUndefined()
  })

  it('includes USE preference fields on student_chat', () => {
    const fields = permittedStudentProfileFields('student_chat')
    expect(fields).toContain('budget_max_per_week')
    expect(fields).toContain('room_type_preference')
    expect(fields).not.toContain('gender')
  })
})
