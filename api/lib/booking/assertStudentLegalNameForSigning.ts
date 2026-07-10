import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../src/lib/database.types.js'
import {
  studentLegalNameReady,
  type NameProfile,
} from '../../../src/lib/nameResolution.js'
import {
  fetchLegalNameSigningGateEnabled,
} from '../platformConfig.js'

export const TENANT_LEGAL_NAME_NOT_READY_CODE = 'tenant_legal_name_not_ready'

export type StudentLegalNameGateProfile = Pick<
  NameProfile,
  'first_name' | 'last_name' | 'verification_type' | 'legal_name_locked_at'
>

export const STUDENT_LEGAL_NAME_GATE_SELECT =
  'first_name, last_name, full_name, verification_type, legal_name_locked_at'

export class TenantLegalNameNotReadyError extends Error {
  readonly code = TENANT_LEGAL_NAME_NOT_READY_CODE
  readonly status = 409

  constructor(message = 'Tenant legal name is not verified and locked for signing.') {
    super(message)
    this.name = 'TenantLegalNameNotReadyError'
  }
}

/**
 * Hard gate when platform_config `legal_name_signing_gate_enabled` is true.
 * Reads the flag live on each call (no module-level cache).
 */
export async function assertStudentLegalNameForSigning(
  admin: SupabaseClient<Database>,
  profile: StudentLegalNameGateProfile | null | undefined,
): Promise<void> {
  const enabled = await fetchLegalNameSigningGateEnabled(admin)
  if (!enabled) return

  if (!profile || !studentLegalNameReady(profile)) {
    throw new TenantLegalNameNotReadyError()
  }
}

export async function assertStudentLegalNameForSigningByBookingId(
  admin: SupabaseClient<Database>,
  bookingId: string,
): Promise<void> {
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('student_id')
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr) throw bErr
  if (!booking?.student_id) {
    throw new TenantLegalNameNotReadyError('Booking has no student profile.')
  }

  const { data: profile, error: pErr } = await admin
    .from('student_profiles')
    .select(STUDENT_LEGAL_NAME_GATE_SELECT)
    .eq('id', booking.student_id)
    .maybeSingle()

  if (pErr) throw pErr
  await assertStudentLegalNameForSigning(admin, profile as StudentLegalNameGateProfile | null)
}

export async function assertStudentLegalNameForSigningByStudentProfileId(
  admin: SupabaseClient<Database>,
  studentProfileId: string,
): Promise<void> {
  const { data: profile, error: pErr } = await admin
    .from('student_profiles')
    .select(STUDENT_LEGAL_NAME_GATE_SELECT)
    .eq('id', studentProfileId)
    .maybeSingle()

  if (pErr) throw pErr
  await assertStudentLegalNameForSigning(admin, profile as StudentLegalNameGateProfile | null)
}

export async function assertStudentLegalNameForSigningByTenancyId(
  admin: SupabaseClient<Database>,
  tenancyId: string,
): Promise<void> {
  const { data: tenancy, error: tErr } = await admin
    .from('tenancies')
    .select('student_profile_id')
    .eq('id', tenancyId)
    .maybeSingle()

  if (tErr) throw tErr
  if (!tenancy?.student_profile_id) {
    throw new TenantLegalNameNotReadyError('Tenancy has no student profile.')
  }

  await assertStudentLegalNameForSigningByStudentProfileId(admin, tenancy.student_profile_id)
}
