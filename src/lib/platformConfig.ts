import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types.js'

export type PlatformConfigRow = Database['public']['Tables']['platform_config']['Row']

/** Namespaced keys stored in `platform_config.config_key`. */
export const PLATFORM_CONFIG_KEYS = {
  BUSINESS_LEGAL_NAME: 'business.legal_name',
  BUSINESS_TRADING_NAME: 'business.trading_name',
  BUSINESS_ABN: 'business.abn',
  BUSINESS_ACN: 'business.acn',
  BUSINESS_STRUCTURE: 'business.structure',
  CONTACT_EMAIL: 'contact.email',
  CONTACT_PHONE: 'contact.phone',
  BUSINESS_GST_REGISTERED: 'business.gst_registered',
  BUSINESS_GST_RATE: 'business.gst_rate',
  BUSINESS_GST_REGISTRATION_DATE: 'business.gst_registration_date',
  BANK_ACCOUNT_NAME: 'bank.account_name',
  BANK_BSB: 'bank.bsb',
  BANK_ACCOUNT_NUMBER: 'bank.account_number',
} as const

const BANK_KEYS_FOR_RTA = [
  PLATFORM_CONFIG_KEYS.BANK_BSB,
  PLATFORM_CONFIG_KEYS.BANK_ACCOUNT_NUMBER,
  PLATFORM_CONFIG_KEYS.BANK_ACCOUNT_NAME,
] as const

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

function formatBsbDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return raw.trim()
}

export type BankDetailsForRta = {
  bsb: string
  accountNumber: string
  accountName: string
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
