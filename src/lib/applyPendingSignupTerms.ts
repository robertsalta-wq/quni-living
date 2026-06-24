import { supabase } from './supabase'
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

  const table = role === 'landlord' ? 'landlord_profiles' : 'student_profiles'
  const patch = role === 'landlord' ? landlordSignupTermsPatch(acceptedAt) : renterSignupTermsPatch(acceptedAt)

  const { data: row } = await supabase.from(table).select('terms_accepted_at').eq('user_id', userId).maybeSingle()

  if (row?.terms_accepted_at) {
    consumeSignupTermsAcceptedAt()
    return
  }

  const { error } = await supabase.from(table).update(patch).eq('user_id', userId)
  if (!error) consumeSignupTermsAcceptedAt()
}

export function mergeSignupTermsIntoInsert<T extends Record<string, unknown>>(
  role: 'renter' | 'landlord',
  row: T,
): T & { terms_accepted_at?: string; landlord_terms_accepted_at?: string } {
  const acceptedAt = peekSignupTermsAcceptedAt()
  if (!acceptedAt) return row
  if (role === 'landlord') {
    return { ...row, ...landlordSignupTermsPatch(acceptedAt) }
  }
  return { ...row, ...renterSignupTermsPatch(acceptedAt) }
}
