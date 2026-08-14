/** Client-safe bond resolution - same module as api/lib/booking/bookingBondAmount.js */
export {
  DEFAULT_BOND_WEEKS,
  MAX_BOND_WEEKS,
  T3_MAX_SECURITY_DEPOSIT_WEEKS,
  assertBondWithinCap,
  assertT3SecurityDepositCap,
  bondAmountAtApplyFromProperty,
  maxBondCapAud,
  maxBondWeeksForProperty,
  occupancyFeeWeeklyEquivalentAud,
  parseBondWeeks,
  parsePropertyBondAud,
  resolveBookingBondAmountAud,
  resolveInviteBondAud,
  resolveListingBondAud,
  roundBondAud,
  t3SecurityDepositCapAud,
} from '../../../api/lib/booking/bookingBondAmount.js'
