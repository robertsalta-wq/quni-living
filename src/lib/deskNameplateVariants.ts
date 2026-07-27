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
 * Variant D · letterpress card — paper pressed into the desk (not metal).
 * Flip any desk back to brass/bronze/engraved here for A/B.
 */
export const DESK_NAMEPLATE_VARIANTS: Record<DeskNameplateKey, DeskNameplateVariant> = {
  reception: 'letterpress',
  listings: 'letterpress',
  landlord: 'letterpress',
  universities: 'letterpress',
  account: 'letterpress',
  trust: 'letterpress',
}
