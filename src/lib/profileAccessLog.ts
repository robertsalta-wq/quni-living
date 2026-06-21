import { supabase } from './supabase'

/** Best-effort audit row when a platform admin opens a renter profile detail view. */
export async function logProfileView(studentProfileId: string): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) return

    const { error } = await supabase.from('profile_access_log').insert({
      admin_user_id: user.id,
      admin_email: user.email?.trim() || 'unknown',
      student_profile_id: studentProfileId,
    })
    if (error) console.error('profile_access_log insert failed', error.message)
  } catch (e) {
    console.error('profile_access_log insert failed', e)
  }
}
