export const socials = {
  /** Legacy fallback only — prefer Admin → Settings → Social media (`social.accounts`). */
  instagram: '', // e.g. "https://instagram.com/quniliving"
  tiktok: '', // e.g. "https://tiktok.com/@quniliving"
  xiaohongshu: '', // e.g. "https://www.xiaohongshu.com/user/profile/..."
  wechat: '', // WeChat ID, NOT a URL — e.g. "QuniSupport"
}

export type SocialKey = keyof typeof socials
