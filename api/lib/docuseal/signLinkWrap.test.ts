import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'

import {
  docusealEmbedSrcFromSubmitter,
  mintSignLinkToken,
  parseSignLinkToken,
  pickNswFt6600DateFieldsForRole,
  publicSignWrapUrl,
  resolveSigningLinkUrl,
  signingPackageNeedsDateRefresh,
  wrapSubmissionSubmitters,
} from './signLinkWrap.js'

describe('signLinkWrap tokens', () => {
  afterEach(() => {
    delete process.env.DOCUSEAL_SIGN_LINK_SECRET
  })

  it('round-trips submitter id and refresh flag', () => {
    process.env.DOCUSEAL_SIGN_LINK_SECRET = 'test-secret'
    const token = mintSignLinkToken(155, true)
    const parsed = parseSignLinkToken(token)
    expect(parsed).toEqual({ submitterId: 155, refreshDates: true })
    expect(parseSignLinkToken(mintSignLinkToken(99, false))).toEqual({
      submitterId: 99,
      refreshDates: false,
    })
  })

  it('rejects tampered tokens', () => {
    process.env.DOCUSEAL_SIGN_LINK_SECRET = 'test-secret'
    const token = mintSignLinkToken(1, true)
    expect(parseSignLinkToken(`${token}x`)).toBeNull()
    expect(parseSignLinkToken('not-a-token')).toBeNull()
  })

  it('publicSignWrapUrl does not contain DocuSeal slug', () => {
    process.env.DOCUSEAL_SIGN_LINK_SECRET = 'test-secret'
    process.env.PUBLIC_SITE_URL = 'https://quni.com.au'
    const url = publicSignWrapUrl(500001, true)
    expect(url).toMatch(/^https:\/\/quni\.com\.au\/api\/sign\/\d+\.[dn]\./)
    expect(url).not.toContain('/s/')
  })
})

describe('resolveSigningLinkUrl', () => {
  afterEach(() => {
    delete process.env.DOCUSEAL_SIGN_LINK_SECRET
    delete process.env.PUBLIC_SITE_URL
  })

  it('wraps raw embed_src with token URL', () => {
    process.env.DOCUSEAL_SIGN_LINK_SECRET = 'wrap-secret'
    process.env.PUBLIC_SITE_URL = 'https://quni.com.au'
    const wrapped = resolveSigningLinkUrl(
      { id: 42, embed_src: 'https://sign.quni.com.au/s/abc123' },
      true,
    )
    expect(wrapped).toMatch(/\/api\/sign\/42\.d\./)
    expect(wrapped).not.toContain('abc123')
  })

  it('leaves already-wrapped links unchanged', () => {
    const existing = 'https://quni.com.au/api/sign/42.d.sig'
    expect(
      resolveSigningLinkUrl({ id: 42, embed_src: existing }, true),
    ).toBe(existing)
  })
})

describe('wrapSubmissionSubmitters', () => {
  afterEach(() => {
    delete process.env.DOCUSEAL_SIGN_LINK_SECRET
    delete process.env.PUBLIC_SITE_URL
  })

  it('replaces each submitter embed_src', () => {
    process.env.DOCUSEAL_SIGN_LINK_SECRET = 'wrap-secret'
    process.env.PUBLIC_SITE_URL = 'https://quni.com.au'
    const out = wrapSubmissionSubmitters(
      {
        id: 1,
        submitters: [
          { id: 10, role: 'First Party', embed_src: 'https://sign.quni.com.au/s/a' },
          { id: 11, role: 'Second Party', embed_src: 'https://sign.quni.com.au/s/b' },
        ],
      },
      true,
    )
    expect(out.submitters?.[0]?.embed_src).toMatch(/\/api\/sign\/10\./)
    expect(out.submitters?.[1]?.embed_src).toMatch(/\/api\/sign\/11\./)
  })
})

describe('pickNswFt6600DateFieldsForRole', () => {
  it('includes addendum date for First Party', () => {
    const fields = pickNswFt6600DateFieldsForRole('First Party')
    expect(fields.some((f) => f.name === 'Addendum Landlord Date')).toBe(true)
  })

  it('includes addendum date for Second Party', () => {
    const fields = pickNswFt6600DateFieldsForRole('Second Party')
    expect(fields.some((f) => f.name === 'Addendum Tenant Date')).toBe(true)
  })
})

describe('docusealEmbedSrcFromSubmitter', () => {
  afterEach(() => {
    delete process.env.DOCUSEAL_API_URL
  })

  it('builds /s/{slug} when embed_src is absent', () => {
    process.env.DOCUSEAL_API_URL = 'https://sign.quni.com.au'
    expect(docusealEmbedSrcFromSubmitter({ slug: 'MvExDdioXt6bmZ' })).toBe(
      'https://sign.quni.com.au/s/MvExDdioXt6bmZ',
    )
  })

  it('prefers embed_src when present', () => {
    expect(
      docusealEmbedSrcFromSubmitter({
        slug: 'x',
        embed_src: 'https://sign.quni.com.au/s/y',
      }),
    ).toBe('https://sign.quni.com.au/s/y')
  })
})

describe('signingPackageNeedsDateRefresh', () => {
  it('is true only for NSW residential_tenancy', () => {
    expect(signingPackageNeedsDateRefresh('residential_tenancy')).toBe(true)
    expect(signingPackageNeedsDateRefresh('residential_tenancy_qld')).toBe(false)
    expect(signingPackageNeedsDateRefresh('residential_tenancy_vic')).toBe(false)
  })
})
