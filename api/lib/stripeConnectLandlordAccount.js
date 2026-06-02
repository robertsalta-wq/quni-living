/**
 * Map landlord_profiles → Stripe Connect Express account create params (AU).
 */

/**
 * @param {string | null | undefined} landlordType
 * @returns {'individual' | 'company'}
 */
export function stripeBusinessTypeFromLandlordType(landlordType) {
  if (landlordType === 'company' || landlordType === 'trust') return 'company'
  return 'individual'
}

/**
 * @param {string | null | undefined} value
 */
function trimOrUndefined(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/**
 * @param {string | null | undefined} phone
 */
function formatAuPhoneForStripe(phone) {
  const raw = trimOrUndefined(phone)
  if (!raw) return undefined
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('61') && digits.length >= 11) return `+${digits}`
  if (digits.startsWith('0') && digits.length >= 9) return `+61${digits.slice(1)}`
  if (digits.length >= 9) return `+61${digits}`
  return undefined
}

/**
 * @param {{
 *   first_name?: string | null
 *   last_name?: string | null
 *   full_name?: string | null
 *   company_name?: string | null
 *   landlord_type?: string | null
 * }} profile
 */
function landlordDisplayName(profile) {
  const first = trimOrUndefined(profile.first_name)
  const last = trimOrUndefined(profile.last_name)
  if (first && last) return `${first} ${last}`
  return trimOrUndefined(profile.full_name) || trimOrUndefined(profile.company_name)
}

/**
 * @param {string} siteOrigin e.g. https://quni.com.au
 */
export function buildStripeConnectBusinessProfile(siteOrigin) {
  const url = trimOrUndefined(siteOrigin)?.replace(/\/$/, '') || 'https://quni.com.au'
  return {
    mcc: '6513',
    url,
    product_description:
      'Renting residential accommodation to verified tenants through the Quni Living platform.',
  }
}

/**
 * @param {Record<string, unknown>} profile
 * @param {string} siteOrigin
 */
export function buildStripeConnectAccountUpdateParams(profile, siteOrigin) {
  const businessType = stripeBusinessTypeFromLandlordType(profile.landlord_type)
  const displayName = landlordDisplayName(profile)
  /** @type {Record<string, unknown>} */
  const update = {
    business_profile: {
      ...buildStripeConnectBusinessProfile(siteOrigin),
      ...(displayName ? { name: displayName } : {}),
    },
  }

  const phone = formatAuPhoneForStripe(profile.phone)
  if (businessType === 'individual' && phone) {
    update.individual = { phone }
  }

  return update
}

/**
 * @param {string | null | undefined} fullName
 * @returns {{ first_name?: string; last_name?: string }}
 */
function splitFullName(fullName) {
  const trimmed = trimOrUndefined(fullName)
  if (!trimmed) return {}
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return { first_name: parts[0] }
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') }
}

/**
 * @param {{
 *   email?: string | null
 *   landlord_type?: string | null
 *   first_name?: string | null
 *   last_name?: string | null
 *   full_name?: string | null
 *   company_name?: string | null
 *   abn?: string | null
 *   address?: string | null
 *   suburb?: string | null
 *   state?: string | null
 *   postcode?: string | null
 *   phone?: string | null
 * }} profile
 * @param {string} [siteOrigin]
 */
export function buildStripeExpressAccountCreateParams(profile, siteOrigin) {
  const email = trimOrUndefined(profile.email)
  const businessType = stripeBusinessTypeFromLandlordType(profile.landlord_type)

  /** @type {Record<string, unknown>} */
  const params = {
    type: 'express',
    country: 'AU',
    business_type: businessType,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  }

  if (email) params.email = email

  const displayName = landlordDisplayName(profile)
  params.business_profile = {
    ...buildStripeConnectBusinessProfile(siteOrigin),
    ...(displayName ? { name: displayName } : {}),
  }

  const line1 = trimOrUndefined(profile.address)
  const city = trimOrUndefined(profile.suburb)
  const state = trimOrUndefined(profile.state)
  const postal_code = trimOrUndefined(profile.postcode)
  const hasAddress = line1 || city || state || postal_code

  if (businessType === 'company') {
    const companyName = trimOrUndefined(profile.company_name) || trimOrUndefined(profile.full_name)
    const abnRaw = trimOrUndefined(profile.abn)?.replace(/\D/g, '')
    /** @type {Record<string, unknown>} */
    const company = {}
    if (companyName) company.name = companyName
    if (abnRaw && abnRaw.length === 11) company.tax_id = abnRaw
    if (hasAddress) {
      company.address = {
        country: 'AU',
        ...(line1 ? { line1 } : {}),
        ...(city ? { city } : {}),
        ...(state ? { state } : {}),
        ...(postal_code ? { postal_code } : {}),
      }
    }
    if (Object.keys(company).length > 0) params.company = company
  } else {
    const firstName = trimOrUndefined(profile.first_name)
    const lastName = trimOrUndefined(profile.last_name)
    const fromFull = splitFullName(profile.full_name)
    /** @type {Record<string, unknown>} */
    const individual = {
      ...(firstName ? { first_name: firstName } : fromFull.first_name ? { first_name: fromFull.first_name } : {}),
      ...(lastName ? { last_name: lastName } : fromFull.last_name ? { last_name: fromFull.last_name } : {}),
    }
    if (email) individual.email = email
    const phone = formatAuPhoneForStripe(profile.phone)
    if (phone) individual.phone = phone
    if (hasAddress) {
      individual.address = {
        country: 'AU',
        ...(line1 ? { line1 } : {}),
        ...(city ? { city } : {}),
        ...(state ? { state } : {}),
        ...(postal_code ? { postal_code } : {}),
      }
    }
    if (Object.keys(individual).length > 0) params.individual = individual
  }

  return params
}

/**
 * Fields cleared when a landlord restarts incomplete Stripe Connect onboarding.
 * @param {{ admin_override_verified?: boolean | null }} profile
 */
export function clearedStripeConnectProfileFields(profile) {
  return {
    stripe_connect_account_id: null,
    stripe_connect_details_submitted: false,
    stripe_charges_enabled: false,
    stripe_payouts_enabled: false,
    ...(profile?.admin_override_verified === true ? {} : { verified: false }),
  }
}
