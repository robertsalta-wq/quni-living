import { describe, expect, it } from 'vitest'
import {
  listingAddressReadyForNearbyCampusLookup,
  shouldStartNearbyCampusLookup,
} from './listingNearbyCampus'

describe('listingAddressReadyForNearbyCampusLookup', () => {
  it('requires street, suburb, state, and postcode', () => {
    expect(listingAddressReadyForNearbyCampusLookup('', 'Chippendale', 'NSW', '2008')).toBe(false)
    expect(listingAddressReadyForNearbyCampusLookup('1 Lee St', '', 'NSW', '2008')).toBe(false)
    expect(listingAddressReadyForNearbyCampusLookup('1 Lee St', 'Chippendale', '', '2008')).toBe(false)
    expect(listingAddressReadyForNearbyCampusLookup('1 Lee St', 'Chippendale', 'NSW', '')).toBe(false)
    expect(listingAddressReadyForNearbyCampusLookup('1 Lee St', 'Chippendale', 'NSW', '2008')).toBe(true)
  })

  it('ignores surrounding whitespace', () => {
    expect(listingAddressReadyForNearbyCampusLookup(' 1 Lee St ', ' Chippendale ', ' NSW ', ' 2008 ')).toBe(
      true,
    )
  })
})

describe('shouldStartNearbyCampusLookup', () => {
  const ready = {
    addressReady: true,
    userChangedAddressThisSession: false,
    editBootstrapRequested: false,
  }

  it('does not run on create listing before the user types an address', () => {
    expect(
      shouldStartNearbyCampusLookup({
        ...ready,
        isEdit: false,
      }),
    ).toBe(false)
  })

  it('does not treat a restored draft address as user input on create', () => {
    expect(
      shouldStartNearbyCampusLookup({
        isEdit: false,
        addressReady: true,
        userChangedAddressThisSession: false,
        editBootstrapRequested: true,
      }),
    ).toBe(false)
  })

  it('runs on create after the user changes a complete address', () => {
    expect(
      shouldStartNearbyCampusLookup({
        isEdit: false,
        addressReady: true,
        userChangedAddressThisSession: true,
        editBootstrapRequested: false,
      }),
    ).toBe(true)
  })

  it('does not run when the address is still incomplete', () => {
    expect(
      shouldStartNearbyCampusLookup({
        isEdit: false,
        addressReady: false,
        userChangedAddressThisSession: true,
        editBootstrapRequested: false,
      }),
    ).toBe(false)
  })

  it('runs on edit when bootstrapping a saved listing with no campus', () => {
    expect(
      shouldStartNearbyCampusLookup({
        isEdit: true,
        addressReady: true,
        userChangedAddressThisSession: false,
        editBootstrapRequested: true,
      }),
    ).toBe(true)
  })
})
