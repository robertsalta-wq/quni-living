import { useEffect, useMemo, useState } from 'react'
import { BookOpen, MessageCircle, Music2, Share2 } from 'lucide-react'
import { socials, type SocialKey } from '../config/site'

type SiteSocialLinksProps = {
  /** Footer uses light icons on coral; mobile drawer uses dark on white. */
  variant?: 'footer' | 'drawer'
  className?: string
}

type SocialEntry =
  | { key: SocialKey; kind: 'url'; href: string; label: string }
  | { key: SocialKey; kind: 'wechat'; id: string; label: string }

function configuredSocials(): SocialEntry[] {
  const out: SocialEntry[] = []
  if (socials.instagram.trim()) {
    out.push({ key: 'instagram', kind: 'url', href: socials.instagram.trim(), label: 'Instagram' })
  }
  if (socials.tiktok.trim()) {
    out.push({ key: 'tiktok', kind: 'url', href: socials.tiktok.trim(), label: 'TikTok' })
  }
  if (socials.xiaohongshu.trim()) {
    out.push({
      key: 'xiaohongshu',
      kind: 'url',
      href: socials.xiaohongshu.trim(),
      label: 'Xiaohongshu (RED)',
    })
  }
  if (socials.wechat.trim()) {
    out.push({ key: 'wechat', kind: 'wechat', id: socials.wechat.trim(), label: 'WeChat' })
  }
  return out
}

function SocialIcon({ entry, className }: { entry: SocialEntry; className: string }) {
  switch (entry.key) {
    case 'instagram':
      return <Share2 className={className} aria-hidden />
    case 'tiktok':
      return <Music2 className={className} aria-hidden />
    case 'xiaohongshu':
      return <BookOpen className={className} aria-hidden />
    case 'wechat':
      return <MessageCircle className={className} aria-hidden />
    default:
      return null
  }
}

export default function SiteSocialLinks({ variant = 'footer', className = '' }: SiteSocialLinksProps) {
  const entries = useMemo(() => configuredSocials(), [])
  const [wechatCopied, setWechatCopied] = useState(false)
  const [wechatOpen, setWechatOpen] = useState(false)

  useEffect(() => {
    if (!wechatCopied) return
    const timer = window.setTimeout(() => setWechatCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [wechatCopied])

  if (entries.length === 0) return null

  const iconClass = variant === 'footer' ? 'h-5 w-5 text-[#1B2A4A]' : 'h-5 w-5 text-[#1B2A4A]'
  const buttonClass =
    variant === 'footer'
      ? 'inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#1B2A4A] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80'
      : 'inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#1B2A4A]/15 text-[#1B2A4A] hover:border-[#FF6F61]/40 hover:bg-[#FF6F61]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61]/40'

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()} role="list" aria-label="Social media">
      {entries.map((entry) =>
        entry.kind === 'url' ? (
          <a
            key={entry.key}
            href={entry.href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass}
            aria-label={entry.label}
            role="listitem"
          >
            <SocialIcon entry={entry} className={iconClass} />
          </a>
        ) : (
          <div key={entry.key} className="relative" role="listitem">
            <button
              type="button"
              className={buttonClass}
              aria-label={`${entry.label}: ${entry.id}`}
              aria-describedby={wechatOpen ? `wechat-id-${entry.key}` : undefined}
              onClick={() => {
                void navigator.clipboard.writeText(entry.id).then(() => setWechatCopied(true))
                setWechatOpen(true)
              }}
            >
              <SocialIcon entry={entry} className={iconClass} />
            </button>
            {wechatOpen ? (
              <span
                id={`wechat-id-${entry.key}`}
                className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#1B2A4A] px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
                role="status"
              >
                {wechatCopied ? 'Copied!' : entry.id}
              </span>
            ) : null}
          </div>
        ),
      )}
    </div>
  )
}
