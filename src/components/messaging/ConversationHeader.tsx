import { Link } from 'react-router-dom'
import type { InboxProperty } from '../../hooks/useConversationInbox'

type Props = {
  property: InboxProperty | null
  contactUnlocked: boolean
}

export default function ConversationHeader({ property, contactUnlocked }: Props) {
  if (!property) {
    return (
      <div className="border-b border-gray-100 bg-white px-4 py-3">
        <p className="font-display font-bold text-gray-900">Conversation</p>
      </div>
    )
  }

  const thumb = property.images?.[0]
  const listingHref = property.slug ? `/listings/${property.slug}` : '/listings'
  const rent =
    property.rent_per_week != null
      ? `$${Number(property.rent_per_week).toLocaleString(undefined, { maximumFractionDigits: 0 })}/wk`
      : null

  return (
    <div className="border-b border-gray-100 bg-white px-4 py-3 flex gap-3 items-center">
      <Link to={listingHref} className="shrink-0">
        {thumb ? (
          <img src={thumb} alt="" className="h-14 w-14 rounded-lg object-cover ring-1 ring-gray-100" />
        ) : (
          <div className="h-14 w-14 rounded-lg bg-gray-100" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={listingHref} className="font-display font-bold text-gray-900 hover:text-[#FF6F61] line-clamp-2">
          {property.title}
        </Link>
        <p className="text-sm text-gray-500 truncate">
          {[property.suburb, rent].filter(Boolean).join(' · ')}
        </p>
      </div>
      <span
        className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${
          contactUnlocked
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-amber-100 text-amber-900'
        }`}
      >
        {contactUnlocked ? 'Unlocked' : 'Masked'}
      </span>
    </div>
  )
}
