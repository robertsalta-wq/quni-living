import { describe, expect, it } from 'vitest'
import { findUnpersistedColumn, persistedColumnValuesEqual } from './persistedColumnValuesEqual'

const utilitiesWritten = {
  electricity: {
    tenant_pays: true,
    individually_metered: false,
    apportionment_percent: 40,
    how_must_be_paid: 'With rent',
  },
  gas: {
    tenant_pays: false,
    individually_metered: null,
    apportionment_percent: null,
    how_must_be_paid: null,
  },
}

const utilitiesReadBack = {
  gas: {
    how_must_be_paid: null,
    apportionment_percent: null,
    individually_metered: null,
    tenant_pays: false,
  },
  electricity: {
    how_must_be_paid: 'With rent',
    apportionment_percent: 40,
    individually_metered: false,
    tenant_pays: true,
  },
}

describe('persistedColumnValuesEqual', () => {
  it('treats jsonb objects as equal when only the key order differs', () => {
    expect(persistedColumnValuesEqual(utilitiesWritten, utilitiesReadBack)).toBe(true)
  })

  it('compares scalars and nulls', () => {
    expect(persistedColumnValuesEqual(true, true)).toBe(true)
    expect(persistedColumnValuesEqual(null, null)).toBe(true)
    expect(persistedColumnValuesEqual('battery', 'hardwired')).toBe(false)
    expect(persistedColumnValuesEqual(null, false)).toBe(false)
  })

  it('keeps array order', () => {
    expect(persistedColumnValuesEqual(['a', 'b'], ['b', 'a'])).toBe(false)
  })

  it('rejects a nested value that really changed', () => {
    expect(
      persistedColumnValuesEqual(utilitiesWritten, {
        ...utilitiesReadBack,
        electricity: { ...utilitiesReadBack.electricity, apportionment_percent: 50 },
      }),
    ).toBe(false)
  })
})

describe('findUnpersistedColumn', () => {
  it('accepts a utilities column whose keys come back in a different order', () => {
    expect(
      findUnpersistedColumn(
        {
          water_usage_charged_separately: true,
          utilities_services: utilitiesWritten,
        },
        {
          water_usage_charged_separately: true,
          utilities_services: utilitiesReadBack,
        },
      ),
    ).toBeNull()
  })

  it('reports the column that differs', () => {
    expect(
      findUnpersistedColumn(
        { smoke_alarm_type: 'battery', water_usage_charged_separately: false },
        { smoke_alarm_type: null, water_usage_charged_separately: false },
      ),
    ).toEqual({ key: 'smoke_alarm_type', expected: 'battery', actual: null })
  })
})
