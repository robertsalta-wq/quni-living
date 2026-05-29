import { mergeVerifiedIntoLandlordUpdate } from './landlordVerifiedSync.js'

/**
 * Apply Stripe Connect account status to all landlord_profiles with this account id.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{ charges_enabled?: boolean; payouts_enabled?: boolean; details_submitted?: boolean }} account
 * @param {string} connectAccountId
 */
export async function syncLandlordProfilesFromStripeAccount(admin, account, connectAccountId) {
  const { data: rows, error: selErr } = await admin
    .from('landlord_profiles')
    .select('id, admin_override_verified')
    .eq('stripe_connect_account_id', connectAccountId)

  if (selErr) {
    throw selErr
  }

  if (!rows?.length) {
    return { updated: 0 }
  }

  for (const row of rows) {
    const payload = mergeVerifiedIntoLandlordUpdate(account, row)
    const { error: upErr } = await admin.from('landlord_profiles').update(payload).eq('id', row.id)
    if (upErr) {
      throw upErr
    }
  }

  return { updated: rows.length }
}
