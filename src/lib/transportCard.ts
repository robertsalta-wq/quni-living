/** Concession / public transport card names for student-facing copy by state. */
export function transportCardForAustralianState(state: string | null | undefined): string | null {
  const s = (state ?? '').trim().toUpperCase()
  switch (s) {
    case 'NSW':
      return 'Opal card'
    case 'VIC':
      return 'myki card'
    case 'QLD':
      return 'go card'
    case 'WA':
      return 'SmartRider'
    case 'SA':
      return 'Metrocard'
    case 'ACT':
      return 'MyWay card'
    case 'TAS':
    case 'NT':
      return null
    default:
      return null
  }
}
