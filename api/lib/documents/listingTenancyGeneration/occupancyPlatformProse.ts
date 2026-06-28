/** Platform brand references in licence additional terms (not legal-entity line). */

export function licencePlatformReference(tradingName: string): string {
  const t = tradingName.trim()
  return t ? `the ${t} platform` : 'the Quni platform'
}

export function licenceManagedPaymentMethod(tradingName: string): string {
  const t = tradingName.trim()
  return t ? `Via ${t} platform (quni.com.au)` : 'Via Quni platform (quni.com.au)'
}

export function licenceFacilitatedThroughLine(tradingName: string): string {
  return `This licence is facilitated through ${licencePlatformReference(tradingName)} (quni.com.au).`
}

/** Brand name for custodian/holdership prose (not legal entity). */
export function licencePlatformBrandShort(tradingName: string): string {
  const t = tradingName.trim()
  return t || 'Quni'
}
