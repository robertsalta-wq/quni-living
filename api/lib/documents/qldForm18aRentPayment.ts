/** Item 9 rent payment methods (Standard term 8(3); s.83 RTRA Act). Rent is paid to the landlord account printed below. */
export function item9RentPaymentMethodPair(preference: 'bank_transfer' | 'quni_platform' | null): {
  method1: string
  method2: string
} {
  void preference
  return {
    method1: 'Electronic funds transfer (internet or mobile banking) to the account details below.',
    method2:
      'Over-the-counter deposit at a branch of the nominated financial institution, or any other channel your bank provides to pay into this BSB and account number.',
  }
}
