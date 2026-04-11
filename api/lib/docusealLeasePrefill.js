/**
 * Map lease data (same shape as OccupancyAgreement PDF props) into DocuSeal
 * submitter `fields[]` entries for API prefill (readonly text/number values).
 *
 * Template field `name` values must match DocuSeal exactly. Defaults are readable
 * English labels; override with env DOCUSEAL_LEASE_FIELD_MAP (JSON object).
 *
 * Optional env:
 *   DOCUSEAL_LEASE_FIELD_MAP — { "internal_key": "Exact DocuSeal field name", ... }
 *   DOCUSEAL_LEASE_LANDLORD_PREFILL_KEYS — comma-separated internal keys for First Party
 *   DOCUSEAL_LEASE_TENANT_PREFILL_KEYS — comma-separated internal keys for Second Party
 *   DOCUSEAL_LEASE_PREFILL — if "0"/"false"/"no", returns empty arrays (caller may skip)
 */

/** @typedef {{ name: string, default_value: string | number | boolean, readonly: boolean }} DocusealPrefillField */

const DEFAULT_LANDLORD_KEYS = [
  'landlord_full_name',
  'landlord_company',
  'landlord_address',
  'landlord_email',
  'landlord_phone',
  'premises_address',
  'property_type',
  'room_type',
  'premises_furnished',
  'linen_supplied',
  'weekly_cleaning_service',
  'term_start_date',
  'term_end_date',
  'periodic_tenancy',
  'lease_length_description',
  'weekly_rent',
  'platform_fee_percent',
  'total_weekly_rent',
  'payment_method',
  'bond_amount',
  'special_conditions',
  'booking_notes',
  'generated_at',
]

const DEFAULT_TENANT_KEYS = [
  'tenant_full_name',
  'tenant_email',
  'tenant_phone',
  'tenant_date_of_birth',
]

/** Default DocuSeal field names if DOCUSEAL_LEASE_FIELD_MAP omits a key (align template or override). */
const DEFAULT_FIELD_NAMES = {
  landlord_full_name: 'Landlord full name',
  landlord_company: 'Landlord company',
  landlord_address: 'Landlord address',
  landlord_email: 'Landlord email',
  landlord_phone: 'Landlord phone',
  tenant_full_name: 'Tenant full name',
  tenant_email: 'Tenant email',
  tenant_phone: 'Tenant phone',
  tenant_date_of_birth: 'Tenant date of birth',
  premises_address: 'Premises address',
  property_type: 'Property type',
  room_type: 'Room type',
  premises_furnished: 'Furnished',
  linen_supplied: 'Linen supplied',
  weekly_cleaning_service: 'Weekly cleaning service',
  term_start_date: 'Lease start date',
  term_end_date: 'Lease end date',
  periodic_tenancy: 'Periodic tenancy',
  lease_length_description: 'Lease length',
  weekly_rent: 'Weekly rent',
  platform_fee_percent: 'Platform fee percent',
  total_weekly_rent: 'Total weekly rent',
  payment_method: 'Rent payment method',
  bond_amount: 'Bond amount',
  special_conditions: 'Special conditions',
  booking_notes: 'Booking notes',
  generated_at: 'Document generated',
}

function asBooleanEnv(name, defaultValue = false) {
  const v = (process.env[name] || '').trim().toLowerCase()
  if (!v) return defaultValue
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

function parseJsonObject(raw, label) {
  const s = (raw || '').trim()
  if (!s) return {}
  try {
    const o = JSON.parse(s)
    if (o && typeof o === 'object' && !Array.isArray(o)) return o
  } catch {
    console.warn(`[DocuSeal] ${label} is not valid JSON object, ignoring`)
  }
  return {}
}

function parseKeyList(raw) {
  const s = (raw || '').trim()
  if (!s) return null
  return s
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
}

function formatAuDate(iso) {
  if (!iso || typeof iso !== 'string') return ''
  const d = iso.slice(0, 10)
  const parts = d.split('-')
  if (parts.length !== 3) return iso
  const [y, m, day] = parts
  if (!y || !m || !day) return iso
  return `${day}/${m}/${y}`
}

function formatAud(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return ''
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

/**
 * @param {Record<string, unknown>} props — same structure as OccupancyAgreement props
 * @returns {Record<string, string | number | boolean>}
 */
export function buildLeasePrefillValues(props) {
  const landlord = props.landlord && typeof props.landlord === 'object' ? props.landlord : {}
  const tenant = props.tenant && typeof props.tenant === 'object' ? props.tenant : {}
  const premises = props.premises && typeof props.premises === 'object' ? props.premises : {}
  const term = props.term && typeof props.term === 'object' ? props.term : {}
  const rent = props.rent && typeof props.rent === 'object' ? props.rent : {}
  const bond = props.bond && typeof props.bond === 'object' ? props.bond : {}

  const periodic = Boolean(term.periodic)
  const endRaw = term.endDate == null ? '' : String(term.endDate)
  const special =
    Array.isArray(props.specialConditions) && props.specialConditions.length
      ? props.specialConditions.map((x) => String(x)).join('\n')
      : ''

  const fmtBool = (v) => (v == null ? '' : v ? 'Yes' : 'No')

  /** @type {Record<string, string | number | boolean>} */
  const out = {
    landlord_full_name: typeof landlord.fullName === 'string' ? landlord.fullName : '',
    landlord_company:
      landlord.companyName != null && String(landlord.companyName).trim()
        ? String(landlord.companyName).trim()
        : '',
    landlord_address: typeof landlord.addressLine === 'string' ? landlord.addressLine : '',
    landlord_email: typeof landlord.email === 'string' ? landlord.email : '',
    landlord_phone: typeof landlord.phone === 'string' ? landlord.phone : '',
    tenant_full_name: typeof tenant.fullName === 'string' ? tenant.fullName : '',
    tenant_email: typeof tenant.email === 'string' ? tenant.email : '',
    tenant_phone: typeof tenant.phone === 'string' ? tenant.phone : '',
    tenant_date_of_birth:
      tenant.dateOfBirth != null && String(tenant.dateOfBirth).trim()
        ? formatAuDate(String(tenant.dateOfBirth))
        : '',
    premises_address: typeof premises.addressLine === 'string' ? premises.addressLine : '',
    property_type: premises.propertyType != null ? String(premises.propertyType) : '',
    room_type: premises.roomType != null ? String(premises.roomType) : '',
    premises_furnished: fmtBool(premises.furnished),
    linen_supplied: fmtBool(premises.linenSupplied),
    weekly_cleaning_service: fmtBool(premises.weeklyCleaningService),
    term_start_date: formatAuDate(typeof term.startDate === 'string' ? term.startDate : ''),
    term_end_date: periodic ? 'Ongoing (periodic)' : formatAuDate(endRaw),
    periodic_tenancy: periodic ? 'Yes' : 'No',
    lease_length_description:
      typeof term.leaseLengthDescription === 'string' ? term.leaseLengthDescription : '',
    weekly_rent: typeof rent.weeklyRent === 'number' && Number.isFinite(rent.weeklyRent) ? rent.weeklyRent : '',
    platform_fee_percent:
      typeof rent.platformFeePercent === 'number' && Number.isFinite(rent.platformFeePercent)
        ? rent.platformFeePercent
        : '',
    total_weekly_rent:
      typeof rent.totalWeekly === 'number' && Number.isFinite(rent.totalWeekly) ? rent.totalWeekly : '',
    payment_method: typeof rent.paymentMethod === 'string' ? rent.paymentMethod : '',
    bond_amount:
      bond.amount != null && typeof bond.amount === 'number' && Number.isFinite(bond.amount)
        ? formatAud(bond.amount)
        : '',
    special_conditions: special,
    booking_notes:
      props.bookingNotes != null && String(props.bookingNotes).trim() ? String(props.bookingNotes).trim() : '',
    generated_at: typeof props.generatedAt === 'string' ? props.generatedAt : '',
  }

  return out
}

/**
 * @param {string} internalKey
 * @param {Record<string, string>} fieldMap
 * @returns {string | null}
 */
function resolveTemplateFieldName(internalKey, fieldMap) {
  const fromEnv = fieldMap[internalKey]
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim()
  const def = DEFAULT_FIELD_NAMES[internalKey]
  if (typeof def === 'string' && def.trim()) return def.trim()
  return null
}

/**
 * @param {Record<string, string | number | boolean>} values
 * @param {string} key
 */
function valueForKey(values, key) {
  const v = values[key]
  if (v === '' || v === null || v === undefined) return null
  return v
}

/**
 * @param {string[]} keys
 * @param {Record<string, string | number | boolean>} values
 * @param {Record<string, string>} fieldMap
 * @returns {DocusealPrefillField[]}
 */
function fieldsForKeys(keys, values, fieldMap) {
  /** @type {DocusealPrefillField[]} */
  const fields = []
  const seen = new Set()
  for (const key of keys) {
    const templateName = resolveTemplateFieldName(key, fieldMap)
    if (!templateName) continue
    const val = valueForKey(values, key)
    if (val === null) continue
    if (seen.has(templateName)) continue
    seen.add(templateName)
    fields.push({
      name: templateName,
      default_value: val,
      readonly: true,
    })
  }
  return fields
}

/**
 * @param {Record<string, unknown>} leaseProps
 * @returns {{ landlord: DocusealPrefillField[], tenant: DocusealPrefillField[] }}
 */
export function buildDocusealLeasePrefillFields(leaseProps) {
  if (!asBooleanEnv('DOCUSEAL_LEASE_PREFILL', true)) {
    return { landlord: [], tenant: [] }
  }

  const fieldMap = parseJsonObject(process.env.DOCUSEAL_LEASE_FIELD_MAP, 'DOCUSEAL_LEASE_FIELD_MAP')
  const landlordKeys = parseKeyList(process.env.DOCUSEAL_LEASE_LANDLORD_PREFILL_KEYS) || DEFAULT_LANDLORD_KEYS
  const tenantKeys = parseKeyList(process.env.DOCUSEAL_LEASE_TENANT_PREFILL_KEYS) || DEFAULT_TENANT_KEYS

  const values = buildLeasePrefillValues(leaseProps)
  return {
    landlord: fieldsForKeys(landlordKeys, values, fieldMap),
    tenant: fieldsForKeys(tenantKeys, values, fieldMap),
  }
}
