import { useMemo, useState } from 'react'
import type { ListingContext } from '../../lib/aiChat/chatTypes'
import ChatPanel from './ChatPanel'

type Props = {
  listingContext?: ListingContext
  defaultOpen?: boolean
  /** Listings page: always-open inline panel (no banner / toggle). */
  variant?: 'default' | 'listings'
}

export default function ChatEmbed({ listingContext, defaultOpen, variant = 'default' }: Props) {
  const [open, setOpen] = useState(Boolean(defaultOpen))

  const hasAnyContext = useMemo(() => {
    if (!listingContext) return false
    if (listingContext.propertyId) return true
    if (listingContext.listingIds && listingContext.listingIds.length > 0) return true
    return false
  }, [listingContext])

  if (variant === 'listings') {
    return <ChatPanel variant="listings" listingContext={listingContext} />
  }

  if (open) {
    return <ChatPanel variant="embed" listingContext={listingContext} onClose={() => setOpen(false)} />
  }

  return (
    <div className="w-full rounded-2xl border border-[#FF6F61]/30 bg-[#FFF8F0] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#CC4A3C]">Ask Quni AI</p>
          <p className="mt-1 text-xs text-stone-700">
            {hasAnyContext ? 'Get guidance tailored to these listings.' : 'Ask a question about the marketplace.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-xl bg-[#FF6F61] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e85d52]"
        >
          Open chat →
        </button>
      </div>
    </div>
  )
}

