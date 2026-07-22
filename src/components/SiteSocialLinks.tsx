import { useEffect, useState } from 'react'
import { AtSign, BookOpen, Globe, Link2, MessageCircle, Music2, Share2, Video } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/supabaseConfigured'
import {
  parseSocialAccountsJson,
  publicSocialLinksFromAccounts,
  type PublicSocialLink,
} from '../lib/socialAccounts'
import { socials } from '../config/site'

type SiteSocialLinksProps = {
  /** Footer uses light icons on coral; mobile drawer uses dark on white. */
  variant?: 'footer' | 'drawer'
  className?: string
}

/** Build-time / empty-DB fallback from `config/site.ts` (legacy). */
function fallbackLinksFromConfig(): PublicSocialLink[] {
  const out: PublicSocialLink[] = []
  if (socials.instagram.trim()) {
    out.push({
      key: 'instagram',
      platform: 'Instagram',
      href: socials.instagram.trim(),
      label: 'Instagram',
    })
  }
  if (socials.tiktok.trim()) {
    out.push({ key: 'tiktok', platform: 'TikTok', href: socials.tiktok.trim(), label: 'TikTok' })
  }
  if (socials.xiaohongshu.trim()) {
    out.push({
      key: 'xiaohongshu',
      platform: 'Xiaohongshu (RED)',
      href: socials.xiaohongshu.trim(),
      label: 'Xiaohongshu (RED)',
    })
  }
  return out
}

function SocialIcon({ platformKey, className }: { platformKey: string; className: string }) {
  switch (platformKey) {
    case 'instagram':
      return <AtSign className={className} aria-hidden />
    case 'tiktok':
      return <Music2 className={className} aria-hidden />
    case 'linkedin':
      return <Link2 className={className} aria-hidden />
    case 'facebook':
      return <Globe className={className} aria-hidden />
    case 'youtube':
      return <Video className={className} aria-hidden />
    case 'twitter':
      return <Share2 className={className} aria-hidden />
    case 'xiaohongshu':
      return <BookOpen className={className} aria-hidden />
    case 'wechat':
      return <MessageCircle className={className} aria-hidden />
    default:
      return <Link2 className={className} aria-hidden />
  }
}

export default function SiteSocialLinks({ variant = 'footer', className = '' }: SiteSocialLinksProps) {
  const [links, setLinks] = useState<PublicSocialLink[]>(() => fallbackLinksFromConfig())

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let cancelled = false
    void (async () => {
      const { supabase } = await import('../lib/supabase')
      type PublicSocialClient = {
        from(table: 'public_social_links'): {
          select(cols: 'accounts_json'): {
            maybeSingle(): Promise<{
              data: { accounts_json: string | null } | null
              error: { message: string } | null
            }>
          }
        }
      }
      const { data, error } = await (supabase as unknown as PublicSocialClient)
        .from('public_social_links')
        .select('accounts_json')
        .maybeSingle()
      if (cancelled || error || !data) return

      const parsed = parseSocialAccountsJson(data.accounts_json)
      if (!parsed) return
      const next = publicSocialLinksFromAccounts(parsed)
      setLinks(next.length > 0 ? next : fallbackLinksFromConfig())
    })()

    return () => {
      cancelled = true
    }
  }, [])

  if (links.length === 0) return null

  const iconClass = variant === 'footer' ? 'h-5 w-5 text-[var(--quni-navy)]' : 'h-5 w-5 text-[var(--quni-navy)]'
  const buttonClass =
    variant === 'footer'
      ? 'inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[var(--quni-navy)] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80'
      : 'inline-flex h-11 w-11 items-center justify-center rounded-full border border-admin-navy/15 text-[var(--quni-navy)] hover:border-admin-coral/40 hover:bg-admin-coral/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-coral/40'

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()} role="list" aria-label="Social media">
      {links.map((link) => (
        <a
          key={link.key}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
          aria-label={link.label}
          role="listitem"
        >
          <SocialIcon platformKey={link.key} className={iconClass} />
        </a>
      ))}
    </div>
  )
}
