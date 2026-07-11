import { Link } from 'react-router-dom'
import type { InboxProperty } from '../../hooks/useConversationInbox'
import { firstPropertyImageUrl } from '../../lib/propertyImages'

type Props = {
  property: InboxProperty | null
  contactUnlocked: boolean
}

export default function ConversationHeader({ property, contactUnlocked }: Props) {
  if (!property) {
    return (
      <div className="border-b border-gray-100 bg-white px-3 py-2">
        <p className="text-sm font-semibold text-gray-900">Conversation</p>
      </div>
    )
  }

  const thumb = firstPropertyImageUrl(property.images)
  const listingHref = property.slug ? `/listings/${property.slug}` : '/listings'
  const rent =
    property.rent_per_week != null
      ? `$${Number(property.rent_per_week).toLocaleString(undefined, { maximumFractionDigits: 0 })}/wk`
      : null
  const subtitle = [property.suburb, rent].filter(Boolean).join(' · ')

  return (
    <div className="flex items-center gap-2.5 border-b border-gray-100 bg-white px-3 py-2">
      <Link to={listingHref} className="shrink-0">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="h-9 w-9 rounded-md object-cover ring-1 ring-gray-100"
          />
        ) : (
          <div className="h-9 w-9 rounded-md bg-gray-100" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to={listingHref}
          className="block truncate text-sm font-semibold text-gray-900 hover:text-[#FF6F61]"
        >
          {property.title}
        </Link>
        {subtitle ? (
          <p className="truncate text-xs text-gray-500">{subtitle}</p>
        ) : null}
      </div>
      <span
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
          contactUnlocked
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-800'
        }`}
      >
        {contactUnlocked ? 'Unlocked' : 'Masked'}
      </span>
    </div>
  )
}
