/** @param {string | null | undefined} state */
export function bondAuthorityForState(state) {
  const s = (state || 'NSW').toUpperCase()
  const map = {
    NSW: 'NSW Fair Trading (Rental Bonds Online)',
    VIC: 'Residential Tenancies Bond Authority (RTBA)',
    QLD: 'Residential Tenancies Authority (RTA)',
    WA: 'Bond Administrator, Dept of Mines',
    SA: 'Consumer and Business Services',
    ACT: 'ACT Revenue Office',
    TAS: 'Consumer, Building and Occupational Services',
    NT: 'NT Consumer Affairs',
  }
  return map[s] ?? 'NSW Fair Trading (Rental Bonds Online)'
}
