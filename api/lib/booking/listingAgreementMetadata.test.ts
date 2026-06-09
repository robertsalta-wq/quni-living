import { describe, expect, it } from 'vitest'

import { stripDocusealEmbedSrcFromMetadata } from './listingAgreementMetadata.js'

describe('stripDocusealEmbedSrcFromMetadata', () => {
  it('removes embed_src from submitters but keeps other fields', () => {
    const out = stripDocusealEmbedSrcFromMetadata({
      signing_package: 'residential_tenancy',
      docuseal_response: {
        id: 1,
        submitters: [
          { role: 'Landlord', embed_src: 'https://sign.example/ll', email: 'a@b.com' },
          { role: 'Tenant', embed_src: 'https://sign.example/tt', email: 'c@d.com' },
        ],
      },
    })

    const submitters = (out.docuseal_response as { submitters: Array<Record<string, unknown>> })
      .submitters
    expect(submitters[0].embed_src).toBeUndefined()
    expect(submitters[0].email).toBe('a@b.com')
    expect(out.signing_package).toBe('residential_tenancy')
  })
})
