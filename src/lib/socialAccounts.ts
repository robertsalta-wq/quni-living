/** Social media accounts edited in Admin → Settings → Social media. */

export const SOCIAL_ACCOUNTS_CONFIG_KEY = 'social.accounts'
export const SOCIAL_STORAGE_KEY = 'quni_social_accounts'

export type SocialAccountStatus = 'Active' | 'Parked' | 'Not created'
export type SocialAccountType = 'Brand' | 'Personal' | 'Company'

export type SocialAccount = {
  platform: string
  type: SocialAccountType
  handle: string
  url: string
  status: SocialAccountStatus
}

/** Public footer / drawer link derived from Active Brand or Company rows. */
export type PublicSocialLink = {
  /** Stable key for React lists (platform slug). */
  key: string
  platform: string
  href: string
  label: string
}

export const SOCIAL_ACCOUNTS_INITIAL: SocialAccount[] = [
  { platform: 'TikTok', type: 'Brand', handle: '@quniliving', url: 'https://tiktok.com/@quniliving', status: 'Active' },
  { platform: 'TikTok', type: 'Personal', handle: '@quinnleeau', url: 'https://tiktok.com/@quinnleeau', status: 'Not created' },
  { platform: 'Instagram', type: 'Brand', handle: '@quniliving', url: 'https://instagram.com/quniliving', status: 'Not created' },
  { platform: 'Instagram', type: 'Personal', handle: '@quinnleeau', url: 'https://instagram.com/quinnleeau', status: 'Not created' },
  { platform: 'LinkedIn', type: 'Company', handle: 'Quni Living', url: 'https://linkedin.com/company/quniliving', status: 'Not created' },
  { platform: 'LinkedIn', type: 'Personal', handle: 'Quinn Lee', url: 'https://linkedin.com/in/quinnleeau', status: 'Not created' },
  { platform: 'Facebook', type: 'Brand', handle: 'Quni Living', url: 'https://facebook.com/quniliving', status: 'Not created' },
  { platform: 'YouTube', type: 'Brand', handle: '@quniliving', url: 'https://youtube.com/@quniliving', status: 'Not created' },
  { platform: 'Twitter/X', type: 'Brand', handle: '@quniliving', url: 'https://x.com/quniliving', status: 'Not created' },
]

export function cloneSocialAccountsInitial(): SocialAccount[] {
  return SOCIAL_ACCOUNTS_INITIAL.map((r) => ({ ...r }))
}

export function isSocialAccountStatus(v: unknown): v is SocialAccountStatus {
  return v === 'Active' || v === 'Parked' || v === 'Not created'
}

export function isSocialAccountType(v: unknown): v is SocialAccountType {
  return v === 'Brand' || v === 'Personal' || v === 'Company'
}

export function parseSocialAccounts(raw: unknown): SocialAccount[] | null {
  if (!Array.isArray(raw)) return null
  const out: SocialAccount[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const o = item as Record<string, unknown>
    if (typeof o.platform !== 'string') return null
    if (!isSocialAccountType(o.type)) return null
    if (typeof o.handle !== 'string') return null
    if (typeof o.url !== 'string') return null
    if (!isSocialAccountStatus(o.status)) return null
    out.push({
      platform: o.platform,
      type: o.type,
      handle: o.handle,
      url: o.url,
      status: o.status,
    })
  }
  return out
}

export function parseSocialAccountsJson(raw: string | null | undefined): SocialAccount[] | null {
  if (raw == null || raw.trim() === '') return null
  try {
    return parseSocialAccounts(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

function platformKey(platform: string): string {
  const p = platform.trim().toLowerCase()
  if (p.includes('tiktok')) return 'tiktok'
  if (p.includes('instagram')) return 'instagram'
  if (p.includes('linkedin')) return 'linkedin'
  if (p.includes('facebook')) return 'facebook'
  if (p.includes('youtube')) return 'youtube'
  if (p.includes('twitter') || p === 'x' || p.startsWith('x/') || p.includes('twitter/x')) return 'twitter'
  if (p.includes('xiaohongshu') || p.includes('red')) return 'xiaohongshu'
  if (p.includes('wechat')) return 'wechat'
  return p.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'other'
}

function looksLikeHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim())
}

/**
 * Active Brand/Company accounts with http(s) URLs for public chrome.
 * Personal accounts are excluded. One link per platform (first wins).
 */
export function publicSocialLinksFromAccounts(accounts: SocialAccount[]): PublicSocialLink[] {
  const seen = new Set<string>()
  const out: PublicSocialLink[] = []
  for (const row of accounts) {
    if (row.status !== 'Active') continue
    if (row.type !== 'Brand' && row.type !== 'Company') continue
    const href = row.url.trim()
    if (!href || !looksLikeHttpUrl(href)) continue
    const key = platformKey(row.platform)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push({
      key,
      platform: row.platform.trim() || key,
      href,
      label: row.platform.trim() || key,
    })
  }
  return out
}
