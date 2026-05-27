import { describe, expect, it } from 'vitest'

import { coTenantNameFromAddendumProps } from './addendumCoTenantExecution'

describe('coTenantNameFromAddendumProps', () => {
  it('returns first additional tenant name when present', () => {
    expect(coTenantNameFromAddendumProps(['Sam Partner', ''])).toBe('Sam Partner')
  })

  it('returns empty when no co-tenant', () => {
    expect(coTenantNameFromAddendumProps([])).toBe('')
    expect(coTenantNameFromAddendumProps(undefined)).toBe('')
  })
})
