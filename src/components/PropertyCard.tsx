import { Link } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import type { Property } from '../lib/listings'
import { isRoomType, ROOM_TYPE_LABELS } from '../lib/listings'
import { firstPropertyImageUrl } from '../lib/propertyImages'
import { formatDistanceKm } from '../lib/workplaceLocation'
import { getListingRentDisplay } from '../lib/pricing/listingRentDisplay'
import {
  formatListingCardBedIconLabel,
  formatListingCardBathIconLabel,
  formatListingCardContextLine,
} from '../lib/listingAccommodationDisplay'
import { buildListingHighlightLabels } from '../lib/listingDisplayHighlights'
import {
  buildListingCardImageBadges,
  listingCardBadgeVisibleOnMobile,
} from '../lib/listingCardImageBadges'
import { VerifiedLandlordBadge } from './VerifiedLandlordBadge'

type Props = {
  property: Property
  /** When set, appended to `/properties/:slug` (e.g. `?move_in=…`). */
  linkSearch?: string
  /** Straight-line km from viewer search anchor (work or geocoded location). */
  distanceKm?: number
  /** e.g. "your work" or "this location" */
  distanceLabel?: string
  /** Dim card when the property conflicts with the viewer's selected dates. */
  unavailableForSelectedDates?: boolean
  unavailableBadgeLabel?: string
}

export function PropertyCard({
  property,
  linkSearch,
  distanceKm,
  distanceLabel,
  unavailableForSelectedDates,
  unavailableBadgeLabel,
}: Props) {
  const { user } = useAuthContext()
  const image = firstPropertyImageUrl(property.images)
  const listingRent = getListingRentDisplay(property)
  const isVerified = property.landlord_profiles?.verified ?? false
  const showLandlordName = Boolean(user)
  const landlordName = showLandlordName
    ? property.landlord_profiles?.full_name?.trim() || 'Private landlord'
    : 'Private landlord'
  const guestVerifiedBadgeOnly = !user && isVerified
  const landlordInitial = showLandlordName ? landlordName.charAt(0).toUpperCase() : null
  const roomLabel =
    property.room_type && isRoomType(property.room_type)
      ? ROOM_TYPE_LABELS[property.room_type]
      : null
  const accommodationContextLine = formatListingCardContextLine(property)
  const bedIconLabel = formatListingCardBedIconLabel(property)
  const bathIconLabel = formatListingCardBathIconLabel(property)
  const imageBadges = buildListingCardImageBadges(property)
  const highlightLabels = buildListingHighlightLabels(property)

  const to =
    linkSearch && linkSearch.length > 0
      ? `/properties/${property.slug}${linkSearch.startsWith('?') ? linkSearch : `?${linkSearch}`}`
      : `/properties/${property.slug}`

  return (
    <Link
      to={to}
      className={`group block bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
        unavailableForSelectedDates ? 'opacity-60 grayscale-[0.35]' : ''
      }`}
    >
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
              <polyline
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                points="9 22 9 12 15 12 15 22"
              />
            </svg>
          </div>
        )}
        {imageBadges.length > 0 && (
          <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5 z-10 pointer-events-none">
            {imageBadges.map((badge) => {
              const showOnMobile = listingCardBadgeVisibleOnMobile(imageBadges, badge.id)
              const visibility = showOnMobile ? 'inline-flex' : 'hidden sm:inline-flex'
              const className =
                badge.variant === 'featured'
                  ? `${visibility} items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-[#FF6F61] text-white shadow-sm`
                  : `${visibility} items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-[#8FB9AB] text-white shadow-sm`
              return (
                <span key={badge.id} className={className}>
                  {badge.label}
                </span>
              )
            })}
          </div>
        )}
        {unavailableForSelectedDates && unavailableBadgeLabel && (
          <span className="absolute bottom-3 left-3 bg-stone-800/95 text-white text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm shadow-sm max-w-[calc(100%-1.5rem)] line-clamp-2 leading-snug">
            {unavailableBadgeLabel}
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-baseline justify-between mb-1 gap-2">
          <span className="text-xl font-bold text-gray-900 whitespace-nowrap">
            {listingRent.showFromPrefix ? (
              <span className="text-sm font-normal text-gray-500">From </span>
            ) : null}
            ${listingRent.primaryAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span className="text-sm font-normal text-gray-500"> /wk</span>
          </span>
          {roomLabel && (
            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium shrink-0">
              {roomLabel}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-1">
          {property.title}
        </h3>

        {listingRent.breakdownLine ? (
          <p className="text-[11px] text-gray-500 leading-snug mb-1 line-clamp-2">{listingRent.breakdownLine}</p>
        ) : null}

        {accommodationContextLine ? (
          <p className="text-xs text-gray-600 leading-snug mb-2 line-clamp-2">{accommodationContextLine}</p>
        ) : null}

        {highlightLabels.length > 0 ? (
          <div className="flex flex-wrap gap-1 mb-2" aria-label="What's included">
            {highlightLabels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-md bg-[#8FB9AB]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#5a8f7f]"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}

        <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {property.suburb ?? property.address ?? 'Location TBC'}
        </p>

        {distanceKm != null && Number.isFinite(distanceKm) && distanceLabel && (
          <p className="text-xs font-medium text-[#FF6F61] mb-2">
            {formatDistanceKm(distanceKm)} km from {distanceLabel}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-600 mb-3 flex-wrap">
          {bedIconLabel ? (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              {bedIconLabel}
            </span>
          ) : null}
          {bathIconLabel ? (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                />
              </svg>
              {bathIconLabel}
            </span>
          ) : null}
          {property.universities && (
            <span className="flex items-center gap-1 min-w-0">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                />
              </svg>
              <span className="truncate">{property.universities.name}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400 border-t border-gray-50 pt-3">
          {guestVerifiedBadgeOnly ? (
            <VerifiedLandlordBadge className="shrink-0" />
          ) : (
            <>
              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0" aria-hidden>
                {landlordInitial ? (
                  <span className="text-[10px] font-semibold">{landlordInitial}</span>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                    />
                  </svg>
                )}
              </div>
              <span className="truncate min-w-0">{landlordName}</span>
              {isVerified ? <VerifiedLandlordBadge className="shrink-0" /> : null}
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
