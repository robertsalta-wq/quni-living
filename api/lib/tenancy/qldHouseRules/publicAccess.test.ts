import { describe, expect, it } from 'vitest'
import { qldPublicHouseRulesAccess } from './publicAccess'

describe('qldPublicHouseRulesAccess', () => {
  it('asks until live-in is answered', () => {
    expect(
      qldPublicHouseRulesAccess({ providerLivesAtPremises: null, roomsLetToResidents: 4 }),
    ).toBe('ask')
  })

  it('asks for a room count when the provider lives on site', () => {
    expect(
      qldPublicHouseRulesAccess({ providerLivesAtPremises: true, roomsLetToResidents: null }),
    ).toBe('ask')
  })

  it('generates when the provider lives off site', () => {
    expect(
      qldPublicHouseRulesAccess({ providerLivesAtPremises: false, roomsLetToResidents: null }),
    ).toBe('generate')
    expect(
      qldPublicHouseRulesAccess({ providerLivesAtPremises: false, roomsLetToResidents: 1 }),
    ).toBe('generate')
  })

  it('generates when the provider lives on site with four or more rooms let', () => {
    expect(
      qldPublicHouseRulesAccess({ providerLivesAtPremises: true, roomsLetToResidents: 4 }),
    ).toBe('generate')
  })

  it('stops when the provider lives on site with three or fewer rooms let', () => {
    expect(
      qldPublicHouseRulesAccess({ providerLivesAtPremises: true, roomsLetToResidents: 3 }),
    ).toBe('stop')
    expect(
      qldPublicHouseRulesAccess({ providerLivesAtPremises: true, roomsLetToResidents: 1 }),
    ).toBe('stop')
  })
})
