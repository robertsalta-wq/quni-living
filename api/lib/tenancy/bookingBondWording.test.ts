import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import {
  listingBookingAcceptedLandlord,
  listingBookingAcceptedRenter,
} from '../emailTemplates.js'
import { bookingBondWordingFromPackage } from './bookingBondWording.js'
import { bondStepRegulatoryCopy } from './bondCopy.js'
import { resolveTenancyPackage } from '../resolveTenancyPackage.js'
import { listingBondPaymentTenantGuidance } from './listingBondPaymentCopy.js'
import ListingBondPaymentGuidance from '../../../src/components/booking/ListingBondPaymentGuidance'
import ListingPaymentInstructions from '../../../src/components/student/ListingPaymentInstructions'
import { resolveLandlordBookingReviewActionCopy } from '../../../src/lib/booking/bookingReviewActionModel'
import { resolveBookingReviewHoldNote } from '../../../src/lib/booking/bookingReviewTermsSummary'
import TenantBookingRequestSubmittedSummary from '../../../src/components/student/TenantBookingRequestSubmittedSummary'

const CASES = [
  {
    name: 'NSW residential',
    input: {
      state: 'NSW',
      property_type: 'private_room_landlord_off_site',
      is_registered_rooming_house: false,
    },
    bondLine:
      'Bond is lodged with NSW Fair Trading (Rental Bonds Online). Pay the authority directly, or pay the landlord, who must lodge it.',
    confirm: 'confirm once lodged',
  },
  {
    name: 'NSW occupancy',
    input: {
      state: 'NSW',
      property_type: 'private_room_landlord_on_site',
      is_registered_rooming_house: false,
    },
    bondLine:
      'The deposit is held by the landlord and is not lodged with NSW Fair Trading (Rental Bonds Online).',
    confirm: 'confirm once received',
  },
  {
    name: 'QLD residential',
    input: {
      state: 'QLD',
      property_type: 'entire_property',
      is_registered_rooming_house: false,
    },
    bondLine:
      'Bond is lodged with the Residential Tenancies Authority. Pay the authority directly, or pay the landlord, who must lodge it.',
    confirm: 'confirm once lodged',
  },
  {
    name: 'QLD occupancy',
    input: {
      state: 'QLD',
      property_type: 'private_room_landlord_on_site',
      is_registered_rooming_house: false,
      rooms_rented_to_residents: 1,
      shares_kitchen_or_bathroom: true,
    },
    bondLine:
      'Bond is lodged with the Residential Tenancies Authority. Pay the authority directly, or pay the landlord, who must lodge it.',
    confirm: 'confirm once lodged',
  },
  {
    name: 'VIC residential',
    input: {
      state: 'VIC',
      property_type: 'entire_property',
      is_registered_rooming_house: false,
    },
    bondLine:
      'Bond is lodged with the Residential Tenancies Bond Authority. Pay the authority directly, or pay the landlord, who must lodge it.',
    confirm: 'confirm once lodged',
  },
  {
    name: 'QLD rooming',
    input: {
      state: 'QLD',
      property_type: 'private_room_landlord_off_site',
      is_registered_rooming_house: false,
      shares_kitchen_or_bathroom: true,
    },
    bondLine:
      'Bond is lodged with the Residential Tenancies Authority. Pay the authority directly, or pay the landlord, who must lodge it.',
    confirm: 'confirm once lodged',
  },
  {
    name: 'VIC occupancy',
    input: {
      state: 'VIC',
      property_type: 'private_room_landlord_on_site',
      is_registered_rooming_house: false,
    },
    bondLine:
      'The deposit is held by the landlord and is not lodged with the Residential Tenancies Bond Authority.',
    confirm: 'confirm once received',
  },
] as const

const RENT = 'Rent is paid directly to the landlord at the account named in the agreement.'

describe('booking bond line matches the agreement', () => {
  it.each(CASES)('$name', ({ input, bondLine, confirm }) => {
    const pkg = resolveTenancyPackage(input)
    expect(pkg.supported).toBe(true)
    if (!pkg.supported) return
    const wording = bookingBondWordingFromPackage(pkg)
    expect(wording?.bondLine).toBe(bondLine)
    expect(wording?.rentLine).toBe(RENT)
    expect(wording?.confirmPhrase).toBe(confirm)

    const regulatory = bondStepRegulatoryCopy(pkg.rules.bond, input.state, { tier: pkg.tier })
    expect(regulatory.acknowledgementCheckbox).toContain(bondLine)
    expect(regulatory.acknowledgementCheckbox).toContain(RENT)

    const emailData = {
      student_name: 'Alex',
      landlord_name: 'Jordan',
      property_address: '1 Test St',
      booking_reference: 'ABC',
      bond_deadline_display: '1 June 2026',
      property_state: input.state,
      bond_scheme_applies: pkg.rules.bond.schemeApplies,
    }
    const renter = listingBookingAcceptedRenter(emailData)
    const landlord = listingBookingAcceptedLandlord(emailData)
    expect(renter.html).toContain(bondLine)
    expect(renter.html).toContain(RENT)
    expect(renter.html).toContain(confirm)
    expect(landlord.html).toContain(bondLine)
    expect(landlord.html).toContain(confirm)
    expect(landlord.html).toContain('$99.00')

    const otherAuthorities = [
      'NSW Fair Trading (Rental Bonds Online)',
      'the Residential Tenancies Authority',
      'the Residential Tenancies Bond Authority',
    ].filter((name) => !bondLine.includes(name))
    for (const other of otherAuthorities) {
      expect(renter.html).not.toContain(other)
      expect(landlord.html).not.toContain(other)
    }

    const screen = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(TenantBookingRequestSubmittedSummary, {
        bookingId: '11111111-1111-1111-1111-111111111111',
        propertyTitle: 'Room',
        propertySuburb: 'Sydney',
        moveInDate: '2026-06-01',
        leaseLength: '6 months',
        isListing: true,
        bondLine: wording?.bondLine,
        rentLine: wording?.rentLine,
      })),
    )
    expect(screen).toContain(bondLine)
    expect(screen).toContain(RENT)

    const landlordAction = resolveLandlordBookingReviewActionCopy({
      status: 'bond_pending',
      studentDisplayName: 'Alex',
      askedAtLabel: null,
      bondDeadlineLabel: '1 Jun',
      hasActionRequired: false,
      bondWording: wording,
    })
    expect(landlordAction.sub).toContain(bondLine)
    expect(landlordAction.sub).toContain(confirm[0].toUpperCase() + confirm.slice(1))

    const hold = resolveBookingReviewHoldNote({
      tier: 'listing',
      status: 'bond_pending',
      depositAmountCents: null,
      depositReleasedAt: null,
      bondWording: wording,
    })
    expect(hold).toContain(bondLine)
    expect(hold).toContain(RENT)

    const payment = renderToStaticMarkup(
      createElement(ListingPaymentInstructions, {
        booking: {
          status: 'bond_pending',
          bond_amount: 1400,
          weekly_rent: 350,
          bond_window_expires_at: '2026-06-01',
          bond_received_by_landlord_at: null,
          move_in_date: '2026-06-15',
          start_date: null,
        },
        property: {
          title: 'Room',
          address: '1 Test St',
          suburb: 'Sydney',
          state: input.state,
          postcode: '2000',
          property_type: input.property_type,
          is_registered_rooming_house: false,
          rooms_rented_to_residents:
            'rooms_rented_to_residents' in input ? input.rooms_rented_to_residents : null,
          qld_shares_kitchen_or_bathroom:
            'shares_kitchen_or_bathroom' in input ? input.shares_kitchen_or_bathroom : null,
          rent_per_week: 350,
          bond: 1400,
          bond_weeks: 4,
          property_payout_details: {
            account_name: 'Host Co',
            bsb: '123456',
            account_number: '98765432',
          },
        },
        renterDisplayName: 'Alex',
      }),
    )
    expect(payment).toContain(bondLine)
    expect(payment).toContain(RENT)

    if (pkg.rules.bond.schemeApplies) {
      const guidance = listingBondPaymentTenantGuidance(pkg.rules.bond, input.state)
      expect(guidance).not.toBeNull()
      const guidanceHtml = renderToStaticMarkup(
        createElement(ListingBondPaymentGuidance, { guidance: guidance!, bondAmountAud: 1400 }),
      )
      expect(guidanceHtml).toContain(bondLine)
      expect(guidanceHtml).toContain(RENT)
    }
  })
})
