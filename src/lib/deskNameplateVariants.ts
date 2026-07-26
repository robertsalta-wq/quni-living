/**
 * `/home-v3` nameplate variant map — flip here, not in each desk component.
 * `/home-v2` does not import this file; it keeps the default `brass` control.
 */

export type DeskNameplateVariant =
  | 'brass'
  | 'darkPlate'
  | 'bronze'
  | 'letterpress'
  | 'engraved'

export type DeskNameplateKey =
  | 'reception'
  | 'listings'
  | 'landlord'
  | 'universities'
  | 'account'
  | 'trust'

/**
 * Recommended defaults for the nameplate lab (not permanent).
 * Landlord uses `bronze` with on-dark alloy (see DeskNameplate `onDark`).
 */
export const DESK_NAMEPLATE_VARIANTS: Record<DeskNameplateKey, DeskNameplateVariant> = {
  reception: 'bronze',
  listings: 'bronze',
  landlord: 'bronze',
  universities: 'engraved',
  account: 'engraved',
  trust: 'engraved',
}
