/**
 * Nearest-campus options for `/list-your-room-d` earnings strip.
 * IDs are production `campuses.id` values (read-only guide).
 */

export type ListYourRoomDCampusOption = {
  id: string
  /** Short label in the output line, e.g. "Macquarie University". */
  label: string
  /** Select option text. */
  selectLabel: string
}

export const LIST_YOUR_ROOM_D_CAMPUSES: readonly ListYourRoomDCampusOption[] = [
  {
    id: '22222222-0000-0000-0000-000000000010',
    label: 'Macquarie University',
    selectLabel: 'Near Macquarie University',
  },
  {
    id: '22222222-0000-0000-0000-000000000005',
    label: 'UNSW (Kensington)',
    selectLabel: 'Near UNSW (Kensington)',
  },
  {
    id: '22222222-0000-0000-0000-000000000001',
    label: 'University of Sydney',
    selectLabel: 'Near University of Sydney',
  },
  {
    id: '22222222-0000-0000-0000-000000000008',
    label: 'UTS (Ultimo)',
    selectLabel: 'Near UTS (Ultimo)',
  },
  {
    id: '22222222-0000-0000-0000-000000000012',
    label: 'Western Sydney (Parramatta)',
    selectLabel: 'Near Western Sydney (Parramatta)',
  },
  {
    id: '22222222-0000-0000-0000-000000000018',
    label: 'ACU (North Sydney)',
    selectLabel: 'Near ACU (North Sydney)',
  },
] as const

/** Live listing used for listing-card + detail preview (Option A — real `.quni-card`). */
export const LIST_YOUR_ROOM_D_PREVIEW_SLUG = 'private-cosy-bedroom-in-ryde-6od8l' as const

export type ListYourRoomDRoomKind = 'single' | 'ensuite'
