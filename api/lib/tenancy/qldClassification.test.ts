import { describe, expect, it } from 'vitest'

import {
  classifyQldArrangement,
  qldFactsFromListing,
  qldPropertyTierFromOutcome,
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

  it('live-in with unknown count → outside the Act', () => {
    expect(
      classifyQldArrangement({
        whatIsLet: 'room_with_shared_facilities',
        providerLivesAtPremises: true,
        roomsOccupiedOrAvailableToResidents: null,
      }),
    ).toBe('outside_act')
  })
})

describe('qldFactsFromListing', () => {
  it('maps entire_property to whole or self-contained', () => {
    expect(qldFactsFromListing({ propertyType: 'entire_property' })).toEqual({
      whatIsLet: 'whole_or_self_contained',
      providerLivesAtPremises: false,
      roomsOccupiedOrAvailableToResidents: null,
    })
  })

  it('maps off-site room and shared room to shared facilities, provider off site', () => {
    expect(qldFactsFromListing({ propertyType: 'private_room_landlord_off_site' })?.providerLivesAtPremises).toBe(
      false,
    )
    expect(qldFactsFromListing({ propertyType: 'shared_room' })?.whatIsLet).toBe('room_with_shared_facilities')
  })

  it('maps on-site room and reads the rooms-let count', () => {
    const facts = qldFactsFromListing({
      propertyType: 'private_room_landlord_on_site',
      roomsRentedToResidents: 4,
    })
    expect(facts).toEqual({
      whatIsLet: 'room_with_shared_facilities',
      providerLivesAtPremises: true,
      roomsOccupiedOrAvailableToResidents: 4,
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
