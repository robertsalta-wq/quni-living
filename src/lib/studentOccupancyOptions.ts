/** How many people will live in the rental — used for landlord fit checks (room type, shared vs private). */
export const STUDENT_OCCUPANCY_OPTIONS = [
  {
    value: 'sole',
    label: 'Just me',
    shortLabel: 'Just me (sole occupant)',
    description: 'You will live alone and want your own bedroom — not a shared room with strangers.',
  },
  {
    value: 'couple',
    label: 'Two of us (couple)',
    shortLabel: 'Two of us (couple)',
    description: 'You and a partner will move in together — the home needs to suit two people.',
  },
  {
    value: 'open',
    label: 'Flexible',
    shortLabel: 'Flexible',
    description: 'You are open to either your own room or a suitable shared place, depending on the listing.',
  },
] as const

export type StudentOccupancyValue = (typeof STUDENT_OCCUPANCY_OPTIONS)[number]['value']

const BY_VALUE = new Map(STUDENT_OCCUPANCY_OPTIONS.map((o) => [o.value, o]))

/** Human-readable label for landlords and booking summaries. */
export function formatStudentOccupancyType(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const row = BY_VALUE.get(value.trim() as StudentOccupancyValue)
  return row?.shortLabel ?? value.replace(/_/g, ' ')
}
