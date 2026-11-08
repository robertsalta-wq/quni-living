import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../src/lib/database.types.js'
import {
  propertyPayoutDetailsFieldErrors,
  type PropertyPayoutDetailsInput,
} from '../../../../src/lib/propertyPayoutDetails.js'
import type { BankDetailsForRta } from '../../platformConfig.js'

export type LandlordPayoutBankResult =
  | { ok: true; bankDetails: BankDetailsForRta }
  | { ok: false; status: number; error: string }

function refusal(errs: string[]): { ok: false; status: 400; error: string } {
  return {
    ok: false,
    status: 400,
    error: `Rent payment details are incomplete for this property. ${errs.join(' ')} Add payee bank details before generating this agreement.`,
  }
}

/**
 * Rent on a generated agreement is paid to the landlord's property_payout_details account.
 * Incomplete details refuse the document, the same way an empty BSB used to.
 */
export async function loadLandlordPayoutBankForDocument(
  admin: SupabaseClient<Database>,
  propertyId: string | null | undefined,
): Promise<LandlordPayoutBankResult> {
  const id = typeof propertyId === 'string' ? propertyId.trim() : ''
  if (!id) {
    return refusal(propertyPayoutDetailsFieldErrors({}, { requireComplete: true }))
  }

  const { data, error } = await admin
    .from('property_payout_details')
    .select('account_name, bsb, account_number, bank_name')
    .eq('property_id', id)
    .maybeSingle()

  if (error) {
    console.error('[landlord-payout-bank] load', error)
    return { ok: false, status: 503, error: 'Could not load payee bank details for this property.' }
  }

  const row = (data ?? {}) as PropertyPayoutDetailsInput
  const errs = propertyPayoutDetailsFieldErrors(row, { requireComplete: true })
  if (errs.length) return refusal(errs)

  return {
    ok: true,
    bankDetails: {
      bsb: (row.bsb ?? '').replace(/[\s-]/g, ''),
      accountNumber: (row.account_number ?? '').trim(),
      accountName: (row.account_name ?? '').trim(),
      bankName: (row.bank_name ?? '').trim(),
    },
  }
}
