import { describe, expect, it } from 'vitest'
import {
  LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE,
  LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE,
  licenceOccupyDocusealTag,
} from './docusealTags.js'

describe('licenceOccupyDocusealTag', () => {
  it('embeds width and height for sized NSW occupancy fields', () => {
    expect(
      licenceOccupyDocusealTag('Principal Signature', 'First Party', 'signature', LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE),
    ).toBe(
      `{{Principal Signature;role=First Party;type=signature;width=${LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE.width};height=${LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE.height}}}`,
    )
    expect(
      licenceOccupyDocusealTag('Resident Sign Date', 'Second Party', 'date', LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE),
    ).toContain(';width=120;height=28')
  })

  it('omits dimensions for legacy QLD/VIC tags', () => {
    expect(licenceOccupyDocusealTag('Owner Signature', 'First Party', 'signature')).toBe(
      '{{Owner Signature;role=First Party;type=signature}}',
    )
  })
})
