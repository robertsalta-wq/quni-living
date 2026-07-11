import { describe, expect, it } from 'vitest'
import { buildNswResidentialTenancyAgreementPropsFromBooking } from './buildNswFt6600AgreementProps.js'
import { Ft6600BondUnresolvedError } from './ft6600BondRequired.js'
import {
  QUINN_ROBERT_FT6600_BOOKING,
  QUINN_ROBERT_FT6600_LISTING_INPUT,
  QUINN_ROBERT_FT6600_PROPERTY,
} from './quinnRobertFt6600Fixture.js'

describe('buildNswResidentialTenancyAgreementPropsFromBooking', () => {
  it('rejects null resolved bond (FT6600 s.159)', () => {
    expect(() =>
      buildNswResidentialTenancyAgreementPropsFromBooking({
        ...QUINN_ROBERT_FT6600_LISTING_INPUT,
        property: { ...QUINN_ROBERT_FT6600_PROPERTY, bond: null },
        booking: { ...QUINN_ROBERT_FT6600_BOOKING, bond_amount: null },
      }),
    ).toThrow(Ft6600BondUnresolvedError)
  })
})
