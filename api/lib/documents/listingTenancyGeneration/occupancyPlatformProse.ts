/** Brand name for custodian/holdership prose (not legal entity). */
export function licencePlatformBrandShort(tradingName: string): string {
  const t = tradingName.trim()
  return t || 'Quni'
}
