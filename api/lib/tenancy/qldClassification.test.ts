import { describe, expect, it } from 'vitest'

import {
  classifyQldArrangement,
  qldFactsFromListing,
  qldPropertyTierFromOutcome,
  QLD_ROOMS_RENTED_UNANSWERED_REASON,
  QLD_SHARES_KITCHEN_OR_BATHROOM_UNANSWERED_REASON,
} from './qldClassification.js'

describe('classifyQldArrangement', () => {
  it('whole premises or self-contained unit → general tenancy', () => {
    expect(
      classifyQldArrangement({
        whatIsLet: 'whole_or_self_contained',
        providerLivesAtPremises: false,
        roomsOccupiedOrAvailableToResidents: 1,
      }),
    ).toBe('general_tenancy')
    expect(
      classifyQldArrangement({
        whatIsLet: 'whole_or_self_contained',
        providerLivesAtPremises: true,
        roomsOccupiedOrAvailableToResidents: 8,
      }),
    ).toBe('general_tenancy')
  })

  it('off-site rooms with shared facilities → rooming at any count', () => {
    expect(
      classifyQldArrangement({
        whatIsLet: 'room_with_shared_facilities',
        providerLivesAtPremises: false,
        roomsOccupiedOrAvailableToResidents: 1,
      }),
    ).toBe('rooming')
    expect(
      classifyQldArrangement({
        whatIsLet: 'room_with_shared_facilities',
        providerLivesAtPremises: false,
        roomsOccupiedOrAvailableToResidents: null,
      }),
    ).toBe('rooming')
  })

  it('live-in, 3 or fewer rooms for residents → outside the Act', () => {
    expect(
      classifyQldArrangement({
        whatIsLet: 'room_with_shared_facilities',
        providerLivesAtPremises: true,
        roomsOccupiedOrAvailableToResidents: 3,
      }),
    ).toBe('outside_act')
    expect(
      classifyQldArrangement({
        whatIsLet: 'room_with_shared_facilities',
        providerLivesAtPremises: true,
        roomsOccupiedOrAvailableToResidents: 1,
      }),
    ).toBe('outside_act')
  })

  it('live-in, 4 or more rooms for residents → rooming', () => {
    expect(
      classifyQldArrangement({
        whatIsLet: 'room_with_shared_facilities',
        providerLivesAtPremises: true,
        roomsOccupiedOrAvailableToResidents: 4,
      }),
    ).toBe('rooming')
  })

  it('live-in with unknown count does not guess outside the Act', () => {
    expect(
      classifyQldArrangement({
        whatIsLet: 'room_with_shared_facilities',
        providerLivesAtPremises: true,
        roomsOccupiedOrAvailableToResidents: null,
      }),
    ).toBe('needs_room_count')
  })
})

describe('qldFactsFromListing', () => {
  it('maps entire_property to whole or self-contained', () => {
    expect(qldFactsFromListing({ propertyType: 'entire_property' })).toEqual({
      status: 'classified',
      facts: {
        whatIsLet: 'whole_or_self_contained',
        providerLivesAtPremises: false,
        roomsOccupiedOrAvailableToResidents: null,
      },
    })
  })

  it('does not guess kitchen or bathroom share when unanswered', () => {
    expect(qldFactsFromListing({ propertyType: 'private_room_landlord_off_site' })).toEqual({
      status: 'unanswered',
      unsupportedReason: QLD_SHARES_KITCHEN_OR_BATHROOM_UNANSWERED_REASON,
    })
    expect(qldFactsFromListing({ propertyType: 'shared_room' })).toEqual({
      status: 'unanswered',
      unsupportedReason: QLD_SHARES_KITCHEN_OR_BATHROOM_UNANSWERED_REASON,
    })
    expect(qldFactsFromListing({ propertyType: 'private_room_landlord_on_site' })).toEqual({
      status: 'unanswered',
      unsupportedReason: QLD_SHARES_KITCHEN_OR_BATHROOM_UNANSWERED_REASON,
    })
  })

  it('maps a QLD room that does not share a kitchen or bathroom to self-contained', () => {
    expect(
      qldFactsFromListing({
        propertyType: 'private_room_landlord_off_site',
        sharesKitchenOrBathroom: false,
      }),
    ).toMatchObject({
      status: 'classified',
      facts: { whatIsLet: 'whole_or_self_contained' },
    })
    expect(
      qldFactsFromListing({
        propertyType: 'shared_room',
        sharesKitchenOrBathroom: false,
      }),
    ).toMatchObject({
      status: 'classified',
      facts: { whatIsLet: 'whole_or_self_contained' },
    })
  })

  it('maps explicit share to shared facilities', () => {
    expect(
      qldFactsFromListing({
        propertyType: 'private_room_landlord_off_site',
        sharesKitchenOrBathroom: true,
      }),
    ).toMatchObject({
      status: 'classified',
      facts: { whatIsLet: 'room_with_shared_facilities', providerLivesAtPremises: false },
    })
  })

  it('maps on-site room and reads the rooms-let count', () => {
    const facts = qldFactsFromListing({
      propertyType: 'private_room_landlord_on_site',
      roomsRentedToResidents: 4,
      sharesKitchenOrBathroom: true,
    })
    expect(facts).toEqual({
      status: 'classified',
      facts: {
        whatIsLet: 'room_with_shared_facilities',
        providerLivesAtPremises: true,
        roomsOccupiedOrAvailableToResidents: 4,
      },
    })
  })

  it('live-in shared facilities with unknown count is unanswered, not occupancy', () => {
    expect(
      qldFactsFromListing({
        propertyType: 'private_room_landlord_on_site',
        sharesKitchenOrBathroom: true,
      }),
    ).toEqual({
      status: 'unanswered',
      unsupportedReason: QLD_ROOMS_RENTED_UNANSWERED_REASON,
    })
  })

  it('on-site self-contained is whole or self-contained regardless of room count', () => {
    expect(
      qldFactsFromListing({
        propertyType: 'private_room_landlord_on_site',
        roomsRentedToResidents: 8,
        sharesKitchenOrBathroom: false,
      }),
    ).toEqual({
      status: 'classified',
      facts: {
        whatIsLet: 'whole_or_self_contained',
        providerLivesAtPremises: true,
        roomsOccupiedOrAvailableToResidents: 8,
      },
    })
  })
})

describe('qldPropertyTierFromOutcome', () => {
  it('maps outcomes to pricing tiers', () => {
    expect(qldPropertyTierFromOutcome('outside_act')).toBe('t1')
    expect(qldPropertyTierFromOutcome('general_tenancy')).toBe('t2')
    expect(qldPropertyTierFromOutcome('rooming')).toBe('t3')
  })
})
