/** Canonical neutral bond custody - jurisdiction-aware; NSW hosted-room hold preserved. */
export const BOND_NEUTRAL_MARKETING =
  'For standard residential tenancies, bond is lodged with your state or territory bond authority. In NSW, bond for hosted rooms (boarder/lodger arrangements) may be held by the landlord. In Queensland, if a bond is taken for a boarder/lodger arrangement it must still be lodged with the RTA within 10 days. Quni does not hold bond money for any tenancy.'

/**
 * Listing vs Managed: payment conduit vs bond custodian - use where tier distinction matters
 * (how-it-works, refunds context, long-form marketing).
 */
export const BOND_CONDUIT_VS_CUSTODY =
  'On Quni Listing, bond and weekly rent are paid directly between landlord and renter; Quni does not route those tenancy funds. On Quni Managed, bond and rent may pass through Quni’s payment infrastructure for a limited time (for example card capture and settlement). That conduit role is not the same as Quni acting as bond custodian under state bond laws - ultimate lodgement and custody still follow the landlord or the relevant bond authority as the law requires.'

/** Managed conduit vs custody - short line for step lists (e.g. how-it-works). */
export const BOND_MANAGED_CONDUIT_SHORT =
  'On Managed, bond and rent may pass through Quni’s payment infrastructure briefly (for example card capture); that conduit role is not the same as Quni acting as bond custodian under state bond laws.'

/** Shorter line for compact pricing cards (renter column). */
export const BOND_NEUTRAL_PRICING_SHORT =
  'Lodged with the state bond authority where required; in NSW hosted rooms bond may be held by the landlord. Quni does not hold bond money.'

/** FAQ / pricing accordion - bond handling question. */
export const BOND_FAQ_HOW_HANDLED =
  'For standard residential tenancies, bond is lodged with your state or territory bond authority. In NSW, bond for hosted rooms (boarder/lodger arrangements) may be held by the landlord. In Queensland, if a bond is taken for a boarder/lodger arrangement it must still be lodged with the RTA within 10 days. Quni does not hold bond money for any tenancy. On Quni Listing, bond is between landlord and renter. On Quni Managed, lodgement may be coordinated where your tenancy requires a statutory scheme.'

/** FAQ - hosted room vs private room bond distinction. */
export const BOND_FAQ_HOSTED_VS_PRIVATE =
  'Hosted rooms are where the owner lives on-site (boarder/lodger-style). In NSW, bond for hosted rooms may be held by the landlord. In Queensland, any bond taken must be lodged with the RTA within 10 days — bond is not compulsory; rent in advance is a lawful alternative. Private rooms are standard residential tenancies where bond (if required) is lodged with your state\'s bond authority under the relevant rules.'
