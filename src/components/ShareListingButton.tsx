import { useCallback, useEffect, useRef, useState } from 'react'
import { listingShareText, listingShareUrl } from '../lib/listingShare'

type Props = {
  slug: string
  title: string
  subtitle?: string
  className?: string
  disabled?: boolean
  disabledTitle?: string
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  )
}

export default function ShareListingButton({
  slug,
  title,
  subtitle,
  className = '',
  disabled = false,
  disabledTitle = 'Share is unavailable for this listing',
}: Props) {
  const [label, setLabel] = useState<'Share' | 'Link copied'>('Share')
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  const showCopied = useCallback(() => {
    setLabel('Link copied')
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    resetTimerRef.current = setTimeout(() => setLabel('Share'), 2000)
  }, [])

  const handleShare = useCallback(async () => {
    if (disabled || !slug.trim()) return

    const url = listingShareUrl(slug)
    const text = listingShareText(title, subtitle)
    const payload = { title: title.trim() || 'Quni Living listing', text, url }

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(payload)
        return
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      showCopied()
      return
    } catch {
      /* fall through */
    }

    window.prompt('Copy this link:', url)
  }, [disabled, slug, subtitle, title, showCopied])

  const isCopied = label === 'Link copied'

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      disabled={disabled || !slug.trim()}
      title={disabled ? disabledTitle : isCopied ? 'Link copied to clipboard' : 'Share this listing'}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]',
        disabled || !slug.trim()
          ? 'border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed'
          : isCopied
            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
            : 'border-stone-200 bg-white text-stone-700 hover:border-admin-coral/40 hover:bg-admin-coral/5 hover:text-[var(--quni-coral)]',
        className,
      ].join(' ')}
    >
      <ShareIcon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  )
}
