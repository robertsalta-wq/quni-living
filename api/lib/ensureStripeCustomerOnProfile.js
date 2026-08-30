import { isStripeMissingCustomerError, stripeCustomerIsUsable } from './stripeMissingCustomer.js'

/**
 * @param {{
 *   email?: string | null
 *   full_name?: string | null
 *   first_name?: string | null
 *   last_name?: string | null
 * }} profile
 * @param {{ email?: string | null }} user
 */
function customerCreateParams(profile, user) {
  const email =
    (typeof profile.email === 'string' && profile.email.includes('@') && profile.email) ||
    (typeof user.email === 'string' && user.email) ||
    undefined
  const name =
    (typeof profile.full_name === 'string' && profile.full_name.trim()) ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
    undefined
  return { email, name: name || undefined }
}

/**
 * Return a Customer id that exists in the current Stripe account/mode.
 * Stored ids from a previous test/live key or a deleted Customer are replaced.
 *
 * @param {{
 *   stripe: { customers: { retrieve: Function, create: Function } }
 *   admin: { from: Function }
 *   profile: {
 *     id: string
 *     stripe_customer_id?: string | null
 *     email?: string | null
 *     full_name?: string | null
 *     first_name?: string | null
 *     last_name?: string | null
 *   }
 *   user: { id: string, email?: string | null }
 *   table: 'landlord_profiles' | 'student_profiles'
 *   metadata: Record<string, string>
 * }} args
 * @returns {Promise<{ ok: true, customerId: string } | { ok: false, error: string, status?: number }>}
 */
export async function ensureStripeCustomerOnProfile({ stripe, admin, profile, user, table, metadata }) {
  let customerId = typeof profile.stripe_customer_id === 'string' ? profile.stripe_customer_id.trim() : ''

  if (customerId) {
    try {
      const existing = await stripe.customers.retrieve(customerId)
      if (stripeCustomerIsUsable(existing)) return { ok: true, customerId }
    } catch (e) {
      if (!isStripeMissingCustomerError(e)) throw e
    }
    customerId = ''
  }

  const created = await stripe.customers.create({
    ...customerCreateParams(profile, user),
    metadata,
  })
  customerId = created.id

  const { data: saved, error: upErr } = await admin
    .from(table)
    .update({ stripe_customer_id: customerId })
    .eq('id', profile.id)
    .select('stripe_customer_id')
    .maybeSingle()

  if (upErr) {
    console.error(`${table} stripe_customer_id update`, upErr)
    return { ok: false, error: upErr.message || 'Could not save Stripe customer id', status: 500 }
  }

  if (!saved || saved.stripe_customer_id !== customerId) {
    return {
      ok: false,
      status: 500,
      error:
        'Could not save Stripe customer (no row updated). Check Vercel SUPABASE_SERVICE_ROLE_KEY is the service_role secret.',
    }
  }

  return { ok: true, customerId }
}

/**
 * @param {Omit<Parameters<typeof ensureStripeCustomerOnProfile>[0], 'table' | 'metadata'>} args
 */
export function ensureLandlordStripeCustomer(args) {
  return ensureStripeCustomerOnProfile({
    ...args,
    table: 'landlord_profiles',
    metadata: {
      landlord_profile_id: args.profile.id,
      supabase_user_id: args.user.id,
    },
  })
}

/**
 * @param {Omit<Parameters<typeof ensureStripeCustomerOnProfile>[0], 'table' | 'metadata'>} args
 */
export function ensureStudentStripeCustomer(args) {
  return ensureStripeCustomerOnProfile({
    ...args,
    table: 'student_profiles',
    metadata: {
      student_profile_id: args.profile.id,
      supabase_user_id: args.user.id,
    },
  })
}
