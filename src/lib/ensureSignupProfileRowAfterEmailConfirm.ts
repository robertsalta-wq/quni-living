import type { User } from '@supabase/supabase-js'
import { isRenterRole } from './authProfile'
import { supabase } from './supabase'
import { mergeSignupTermsIntoInsert } from './applyPendingSignupTerms'
import { consumeSignupTermsAcceptedAt } from './quniSignupTerms'

function displayNameFromUser(user: User): string {
  return (
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    (user.user_metadata?.name as string | undefined)?.trim() ||
    user.email?.split('@')[0] ||
    ''
  )
}

/**
 * After signup email confirmation, insert a profile row only when metadata clearly
 * indicates student or landlord. Skips ambiguous/missing roles to avoid mislabeling.
 */
export async function ensureSignupProfileRowAfterEmailConfirm(user: User): Promise<void> {
  const [{ data: sp }, { data: lp }] = await Promise.all([
    supabase.from('student_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
    supabase.from('landlord_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
  ])

  if (sp || lp) return

  const email = user.email?.trim() ?? ''
  const fullName = displayNameFromUser(user)
  const metaRole = user.user_metadata?.role

  if (metaRole === 'landlord') {
    const insertRow = mergeSignupTermsIntoInsert('landlord', {
      user_id: user.id,
      email,
      full_name: fullName,
    })
    await supabase.from('landlord_profiles').insert(insertRow)
    if (insertRow.terms_accepted_at) consumeSignupTermsAcceptedAt()
    return
  }

  if (isRenterRole(metaRole)) {
    const insertRow = mergeSignupTermsIntoInsert('renter', {
      user_id: user.id,
      email,
      full_name: fullName,
    })
    await supabase.from('student_profiles').insert(insertRow)
    if (insertRow.terms_accepted_at) consumeSignupTermsAcceptedAt()
  }
}
