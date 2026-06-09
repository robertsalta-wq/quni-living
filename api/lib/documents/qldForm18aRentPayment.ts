/** Item 9 rent payment methods (Standard term 8(3); s.83 RTRA Act). */
const QUNI_RENT_PORTAL_URL = 'https://quni.com.au'

export function item9RentPaymentMethodPair(preference: 'bank_transfer' | 'quni_platform' | null): {
  method1: string
  method2: string
} {
  if (preference === 'quni_platform') {
    return {
      method1: `Scheduled rent payments via the Quni Living platform (${QUNI_RENT_PORTAL_URL}) using the card or other payment facility activated for this tenancy in the tenant's Quni account.`,
      method2: 'Direct credit (electronic funds transfer) to the account details below.',
    }
  }
  return {
    method1: 'Electronic funds transfer (internet or mobile banking) to the account details below.',
    method2:
      'Over-the-counter deposit at a branch of the nominated financial institution, or any other channel your bank provides to pay into this BSB and account number.',
  }
}
