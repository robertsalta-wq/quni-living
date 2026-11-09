/** Cards, property page, pricing. */
export const RENT_BOND_SHORT =
  "Rent goes to the landlord. Bond is lodged with your state's bond authority."

/** FAQ, Terms, and other places with room for the full rule. */
export const RENT_BOND_LONG =
  'Rent is paid directly to the landlord. For standard tenancies, bond is lodged with the state bond authority (NSW Fair Trading, the RTA in Queensland, or the RTBA in Victoria), paid either directly or through the landlord, who must lodge it. Under some occupancy or boarder arrangements, the landlord holds the deposit. Quni never holds, transfers or refunds bond.'

/** Canonical neutral bond custody - jurisdiction-aware; NSW hosted-room hold preserved. */
export const BOND_NEUTRAL_MARKETING =
  'For standard residential tenancies, bond is lodged with your state or territory bond authority. In NSW, bond for hosted rooms (boarder/lodger arrangements) may be held by the landlord. In Queensland, if a bond is taken for a boarder/lodger arrangement it must still be lodged with the RTA within 10 days. Quni does not hold bond money for any tenancy.'

/** Bond stays on the statutory route. Quni does not carry it. */
export const BOND_CONDUIT_VS_CUSTODY =
  'Bond follows the statutory route for the tenancy. The renter pays the bond authority, or pays the landlord who lodges it, as the law requires. Quni does not hold, transfer or refund the bond.'

/** Short bond line for step lists. */
export const BOND_MANAGED_CONDUIT_SHORT =
  'Bond is paid to the state bond authority, or to the landlord who lodges it. Quni does not hold, transfer or refund the bond.'

/** Shorter line for compact pricing cards (renter column). */
export const BOND_NEUTRAL_PRICING_SHORT =
  'Lodged with the state bond authority where required; in NSW hosted rooms bond may be held by the landlord. Quni does not hold bond money.'

/** FAQ / pricing accordion - bond handling question. */
export const BOND_FAQ_HOW_HANDLED =
  'For standard residential tenancies, bond is lodged with your state or territory bond authority. In NSW, bond for hosted rooms (boarder/lodger arrangements) may be held by the landlord. In Queensland, if a bond is taken for a boarder/lodger arrangement it must still be lodged with the RTA within 10 days. Quni does not hold, transfer or refund the bond.'

/** FAQ - hosted room vs private room bond distinction. */
export const BOND_FAQ_HOSTED_VS_PRIVATE =
  'Hosted rooms are where the owner lives on-site (boarder/lodger-style). In NSW, bond for hosted rooms may be held by the landlord. In Queensland, any bond taken must be lodged with the RTA within 10 days - bond is not compulsory; rent in advance is a lawful alternative. Private rooms are standard residential tenancies where bond (if required) is lodged with your state\'s bond authority under the relevant rules.'

/** FAQ - listing with no bond (bond weeks set to 0). */
export const BOND_FAQ_NO_BOND_REQUIRED =
  'On Quni Listing, landlords set bond as a number of weeks of rent (default 2 weeks, maximum 4). Enter 0 weeks for no bond - the bond line is hidden on the property page and renters see “No bond is required for this property” when they apply. In Queensland, a bond is not compulsory for boarder/lodger-style arrangements; rent in advance is a lawful alternative. After a landlord accepts a Listing booking, the booking still moves through the bond confirmation step on Quni even when no money is due - the landlord records that no bond was collected (or confirms the arrangement) so the tenancy can proceed to signing. Quni does not collect bond money on Listing. Landlords can still set agreed rent or an invite special offer on a no-bond listing; bond weeks can be set to 0 on the invite or when editing agreed rent before accept. Tenancy agreements and the platform addendum state clearly when no bond applies.'
