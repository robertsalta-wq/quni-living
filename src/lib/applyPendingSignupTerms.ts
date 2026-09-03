import { supabase } from './supabase'
import { looksLikeMissingDbColumn } from './supabaseErrorMessage'
import {
  consumeSignupTermsAcceptedAt,
  landlordSignupTermsPatch,
  peekSignupTermsAcceptedAt,
  renterSignupTermsPatch,
} from './quniSignupTerms'

/** Apply stashed signup terms to an existing profile row (idempotent). */
export async function applyPendingSignupTerms(
  userId: string,
  role: 'renter' | 'landlord',
): Promise<void> {
  const acceptedAt = peekSignupTermsAcceptedAt()
  if (!acceptedAt) return

  if (role === 'landlord') {
    const patch = landlordSignupTermsPatch(acceptedAt)
    const { data: row } = await supabase
      .from('landlord_profiles')
      .select('terms_accepted_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (row?.terms_accepted_at) {
      consumeSignupTermsAcceptedAt()
      return
    }
    const first = await supabase.from('landlord_profiles').update(patch).eq('user_id', userId)
    if (!first.error) {
      consumeSignupTermsAcceptedAt()
      return
    }
    if (looksLikeMissingDbColumn(first.error)) {
      const rest = {
        terms_accepted_at: patch.terms_accepted_at,
        landlord_terms_accepted_at: patch.landlord_terms_accepted_at,
      }
      const second = await supabase.from('landlord_profiles').update(rest).eq('user_id', userId)
      if (!second.error) consumeSignupTermsAcceptedAt()
    }
    return
  }

  const patch = renterSignupTermsPatch(acceptedAt)
  const { data: row } = await supabase
    .from('student_profiles')
    .select('terms_accepted_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (row?.terms_accepted_at) {
    consumeSignupTermsAcceptedAt()
    return
  }
  const { error } = await supabase.from('student_profiles').update(patch).eq('user_id', userId)
  if (!error) consumeSignupTermsAcceptedAt()
}

export function mergeSignupTermsIntoInsert<T extends Record<string, unknown>>(
  role: 'renter' | 'landlord',
  row: T,
): T & { terms_accepted_at?: string; landlord_terms_accepted_at?: string; landlord_service_agreement_version?: string } {
  const acceptedAt = peekSignupTermsAcceptedAt()
  if (!acceptedAt) return row
  if (role === 'landlord') {
    return { ...row, ...landlordSignupTermsPatch(acceptedAt) }
  }
  return { ...row, ...renterSignupTermsPatch(acceptedAt) }
}
