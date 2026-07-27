/**
 * Fixture places for `/home-v3` Reception matching.
 * Not a live DB pull — suburb/campus/postcode list from the Reception mock.
 */

export type DeskPlace = {
  /** Display label, e.g. "Ryde, NSW 2112" */
  label: string
  /** Hint shown in the tray (rooms nearby, campus name, etc.) */
  hint: string
  /** Value used as `/listings?q=` when selected */
  query: string
}

export const DESK_PLACES_FIXTURE: readonly DeskPlace[] = [
  { label: 'Ryde, NSW 2112', hint: '12 rooms nearby', query: 'Ryde' },
  { label: 'North Ryde, NSW 2113', hint: 'Macquarie', query: 'North Ryde' },
  { label: 'Macquarie University — Ryde', hint: 'campus', query: 'Macquarie' },
  { label: 'Bondi Junction, NSW 2022', hint: '—', query: 'Bondi Junction' },
  { label: 'Camperdown, NSW 2050', hint: 'USYD', query: 'Camperdown' },
  { label: 'Kensington, NSW 2033', hint: 'UNSW', query: 'Kensington' },
  { label: 'Chippendale, NSW 2008', hint: 'UTS', query: 'Chippendale' },
  { label: 'Auchenflower, QLD 4066', hint: 'UQ', query: 'Auchenflower' },
  { label: 'Buderim, QLD 4556', hint: 'USC', query: 'Buderim' },
] as const
