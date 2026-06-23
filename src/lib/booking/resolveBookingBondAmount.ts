/** Client-safe bond resolution — same module as api/lib/booking/bookingBondAmount.js */
export {
  DEFAULT_BOND_WEEKS,
  MAX_BOND_WEEKS,
  assertBondWithinCap,
  bondAmountAtApplyFromProperty,
  isPropertyBondFixed,
  maxBondCapAud,
  parseBondWeeks,
  parsePropertyBondAud,
  resolveBookingBondAmountAud,
  resolveInviteBondAud,
  resolveListingBondAud,
  roundBondAud,
} from '../../../api/lib/booking/bookingBondAmount.js'
