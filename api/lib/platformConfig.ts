/**
 * Platform config + RTA bank line helpers for serverless routes under `api/`.
 * Kept under `api/lib/` so Vercel bundles resolve like `../lib/docuseal.js` (see generate-lease.ts).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types.js'

export type PlatformConfigRow = Database['public']['Tables']['platform_config']['Row']

/** Namespaced keys stored in `platform_config.config_key`. */
export const PLATFORM_CONFIG_KEYS = {
  BUSINESS_LEGAL_NAME: 'business.legal_name',
  BUSINESS_TRADING_NAME: 'business.trading_name',
  BUSINESS_ABN: 'business.abn',
  BUSINESS_ACN: 'business.acn',
  /** Named director shown on platform addendum / PDF identification line when set in Admin. */
  BUSINESS_DIRECTOR_NAME: 'business.director_name',
  BUSINESS_STRUCTURE: 'business.structure',
  CONTACT_EMAIL: 'contact.email',
  CONTACT_PHONE: 'contact.phone',
  BUSINESS_GST_REGISTERED: 'business.gst_registered',
  BUSINESS_GST_RATE: 'business.gst_rate',
  BUSINESS_GST_REGISTRATION_DATE: 'business.gst_registration_date',
  BANK_ACCOUNT_NAME: 'bank.account_name',
  BANK_BSB: 'bank.bsb',
  BANK_ACCOUNT_NUMBER: 'bank.account_number',
  BANK_BANK_NAME: 'bank.bank_name',
  SERVICE_TIER_NAMING: 'service_tier_naming',
  QUNI_SERVICE_TIER_MODULE_ENABLED: 'quni_service_tier_module_enabled',
  QUNI_SERVICE_TIER_MANAGED_ENABLED: 'quni_service_tier_managed_enabled',
} as const

export type ServiceTierPlatformFlags = {
  moduleEnabled: boolean
  managedGloballyEnabled: boolean
}

/** Loads Listing module + global Managed toggles from platform_config. */
export async function fetchServiceTierPlatformFlags(
  client: SupabaseClient<Database>,
): Promise<ServiceTierPlatformFlags> {
  const map = await fetchPlatformConfigValueMap(client, [
    PLATFORM_CONFIG_KEYS.QUNI_SERVICE_TIER_MODULE_ENABLED,
    PLATFORM_CONFIG_KEYS.QUNI_SERVICE_TIER_MANAGED_ENABLED,
  ])
  return {
    moduleEnabled: parseBooleanConfig(map[PLATFORM_CONFIG_KEYS.QUNI_SERVICE_TIER_MODULE_ENABLED], false),
    managedGloballyEnabled: parseBooleanConfig(
      map[PLATFORM_CONFIG_KEYS.QUNI_SERVICE_TIER_MANAGED_ENABLED],
      false,
    ),
  }
}

const BANK_KEYS_FOR_RTA = [
  PLATFORM_CONFIG_KEYS.BANK_BSB,
  PLATFORM_CONFIG_KEYS.BANK_ACCOUNT_NUMBER,
  PLATFORM_CONFIG_KEYS.BANK_ACCOUNT_NAME,
  PLATFORM_CONFIG_KEYS.BANK_BANK_NAME,
] as const

const BUSINESS_IDENTITY_KEYS_FOR_DOCUMENTS = [
  PLATFORM_CONFIG_KEYS.BUSINESS_LEGAL_NAME,
  PLATFORM_CONFIG_KEYS.BUSINESS_ABN,
  PLATFORM_CONFIG_KEYS.BUSINESS_ACN,
  PLATFORM_CONFIG_KEYS.BUSINESS_DIRECTOR_NAME,
] as const

export type PlatformBusinessIdentity = {
  legalName: string
  abn: string
  acn: string
  directorName: string
}

/** Loads legal entity line items for tenancy package PDFs from `platform_config`. */
export async function fetchPlatformBusinessIdentityForDocuments(
  client: SupabaseClient<Database>,
): Promise<PlatformBusinessIdentity> {
  const map = await fetchPlatformConfigValueMap(client, [...BUSINESS_IDENTITY_KEYS_FOR_DOCUMENTS])
  return {
    legalName: (map[PLATFORM_CONFIG_KEYS.BUSINESS_LEGAL_NAME] ?? '').trim(),
    abn: (map[PLATFORM_CONFIG_KEYS.BUSINESS_ABN] ?? '').trim(),
    acn: (map[PLATFORM_CONFIG_KEYS.BUSINESS_ACN] ?? '').trim(),
    directorName: (map[PLATFORM_CONFIG_KEYS.BUSINESS_DIRECTOR_NAME] ?? '').trim(),
  }
}

export async function fetchPlatformConfigRows(
  client: SupabaseClient<Database>,
): Promise<PlatformConfigRow[]> {
  const { data, error } = await client
    .from('platform_config')
    .select('*')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as PlatformConfigRow[]
}

/** Map of config_key → config_value for the given keys (missing keys omitted). */
export async function fetchPlatformConfigValueMap(
  client: SupabaseClient<Database>,
  keys: readonly string[],
): Promise<Record<string, string>> {
  if (keys.length === 0) return {}
  const { data, error } = await client
    .from('platform_config')
    .select('config_key, config_value')
    .in('config_key', [...keys])

  if (error) throw error
  const out: Record<string, string> = {}
  for (const row of data ?? []) {
    if (row.config_key) out[row.config_key] = row.config_value ?? ''
  }
  return out
}

export function parseBooleanConfig(value: string | null | undefined, fallback = false): boolean {
  const v = (value ?? '').trim().toLowerCase()
  if (v === 'true') return true
  if (v === 'false') return false
  return fallback
}

export function parseIntegerCentsConfig(value: string | null | undefined, fallback = 0): number {
  const n = Number((value ?? '').trim())
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.round(n))
}

export function parseDecimalConfig(value: string | null | undefined, fallback = 0): number {
  const n = Number((value ?? '').trim())
  if (!Number.isFinite(n)) return fallback
  return n
}

function formatBsbDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return raw.trim()
}

export type BankDetailsForRta = {
  bsb: string
  accountNumber: string
  accountName: string
  bankName: string
}

/**
 * Loads bank.* from platform_config. Does not throw — callers validate non-empty fields.
 */
export async function fetchBankDetailsForRta(
  client: SupabaseClient<Database>,
): Promise<BankDetailsForRta> {
  const map = await fetchPlatformConfigValueMap(client, BANK_KEYS_FOR_RTA)
  return {
    bsb: (map[PLATFORM_CONFIG_KEYS.BANK_BSB] ?? '').trim(),
    accountNumber: (map[PLATFORM_CONFIG_KEYS.BANK_ACCOUNT_NUMBER] ?? '').trim(),
    accountName: (map[PLATFORM_CONFIG_KEYS.BANK_ACCOUNT_NAME] ?? '').trim(),
    bankName: (map[PLATFORM_CONFIG_KEYS.BANK_BANK_NAME] ?? '').trim(),
  }
}

/** FT6600 schedule line: direct deposit + platform option (RTA s.35 free transfer). */
export function buildRtaRentPaymentMethodLine(details: BankDetailsForRta): string {
  const bsb = formatBsbDisplay(details.bsb)
  return (
    `Direct deposit — Account name: ${details.accountName}; BSB: ${bsb}; Account number: ${details.accountNumber}. ` +
    'Tenants may also pay recurring rent via the Quni Living platform (quni.com.au).'
  )
}
