import { describe, expect, it } from 'vitest'
import { comparePropertyFeatureNames, sortPropertyFeatureRows } from './propertyFeatureSignals'

describe('comparePropertyFeatureNames', () => {
  it('places Ceiling fan immediately after Air conditioning', () => {
    const names = [
      'Heating',
      'WiFi',
      'Ceiling fan',
      'Bills included',
      'Air conditioning',
      'Balcony',
    ]
    expect([...names].sort(comparePropertyFeatureNames)).toEqual([
      'Air conditioning',
      'Ceiling fan',
      'Balcony',
      'Bills included',
      'Heating',
      'WiFi',
    ])
  })
})

describe('sortPropertyFeatureRows', () => {
  it('sorts lookup rows the same way the listing form checkboxes render', () => {
    const rows = sortPropertyFeatureRows([
      { id: '3', name: 'Heating' },
      { id: '2', name: 'Ceiling fan' },
      { id: '1', name: 'Air conditioning' },
      { id: '4', name: 'WiFi' },
    ])
    expect(rows.map((r) => r.name)).toEqual(['Air conditioning', 'Ceiling fan', 'Heating', 'WiFi'])
  })
})
