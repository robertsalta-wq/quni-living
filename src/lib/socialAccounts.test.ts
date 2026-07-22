import { describe, expect, it } from 'vitest'
import {
  parseSocialAccountsJson,
  publicSocialLinksFromAccounts,
  SOCIAL_ACCOUNTS_INITIAL,
  type SocialAccount,
} from './socialAccounts'

describe('publicSocialLinksFromAccounts', () => {
  it('exposes only Active Brand/Company http URLs, one per platform', () => {
    const accounts: SocialAccount[] = [
      {
        platform: 'TikTok',
        type: 'Brand',
        handle: '@quniliving',
        url: 'https://tiktok.com/@quniliving',
        status: 'Active',
      },
      {
        platform: 'TikTok',
        type: 'Personal',
        handle: '@quinnleeau',
        url: 'https://tiktok.com/@quinnleeau',
        status: 'Active',
      },
      {
        platform: 'Instagram',
        type: 'Brand',
        handle: '@quniliving',
        url: 'https://instagram.com/@quniliving',
        status: 'Not created',
      },
      {
        platform: 'LinkedIn',
        type: 'Company',
        handle: 'Quni Living',
        url: 'https://linkedin.com/company/quniliving',
        status: 'Active',
      },
    ]
    expect(publicSocialLinksFromAccounts(accounts)).toEqual([
      {
        key: 'tiktok',
        platform: 'TikTok',
        href: 'https://tiktok.com/@quniliving',
        label: 'TikTok',
      },
      {
        key: 'linkedin',
        platform: 'LinkedIn',
        href: 'https://linkedin.com/company/quniliving',
        label: 'LinkedIn',
      },
    ])
  })

  it('skips non-http urls', () => {
    expect(
      publicSocialLinksFromAccounts([
        {
          platform: 'WeChat',
          type: 'Brand',
          handle: 'QuniSupport',
          url: 'QuniSupport',
          status: 'Active',
        },
      ]),
    ).toEqual([])
  })
})

describe('parseSocialAccountsJson', () => {
  it('parses the seeded initial list', () => {
    const parsed = parseSocialAccountsJson(JSON.stringify(SOCIAL_ACCOUNTS_INITIAL))
    expect(parsed).toHaveLength(SOCIAL_ACCOUNTS_INITIAL.length)
    expect(parsed?.[0]?.platform).toBe('TikTok')
  })

  it('returns null for invalid JSON', () => {
    expect(parseSocialAccountsJson('{')).toBeNull()
    expect(parseSocialAccountsJson('[]')).toEqual([])
  })
})
