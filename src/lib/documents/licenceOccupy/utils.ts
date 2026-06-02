/** Notice period text aligned to payment method wording (weekly default). */
export function licenceTerminationNoticePhrase(paymentMethod: string): string {
  const m = paymentMethod.toLowerCase()
  if (m.includes('fortnight')) {
    return 'where the licence fee is payable fortnightly, at least two weeks\' written notice;'
  }
  if (m.includes('month')) {
    return 'where the licence fee is payable monthly, at least one calendar month\'s written notice;'
  }
  return 'where the licence fee is payable weekly, at least one week\'s written notice;'
}

export function ownerServiceFeeParagraph(template: string, feePercent: string): string {
  return template.replace('{feePercent}', feePercent)
}
