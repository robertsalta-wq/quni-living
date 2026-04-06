import { Link } from 'react-router-dom'
import type { Property } from '../lib/listings'
import { isRoomType, ROOM_TYPE_LABELS } from '../lib/listings'

type Props = { property: Property; leased?: boolean }

export function PropertyCard({ property, leased }: Props) {
  const image = property.images?.[0]
  const landlordName = property.landlord_profiles?.full_name ?? 'Private landlord'
  const isVerified = property.landlord_profiles?.verified ?? false
  const roomLabel =
    property.room_type && isRoomType(property.room_type)
      ? ROOM_TYPE_LABELS[property.room_type]
      : null

  return (
    <Link
      to={`/properties/${property.slug}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt=""
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
        {property.featured && (
          <span className="absolute top-3 left-3 bg-indigo-600 text-white text-xs font-medium px-2 py-1 rounded-full">
            Featured
          </span>
        )}
        {property.furnished && (
          <span className="absolute top-3 right-3 bg-white/90 text-gray-700 text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm">
            Furnished
          </span>
        )}
        {leased && (
          <span className="absolute bottom-3 left-3 bg-stone-900/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm shadow-sm">
            Currently leased
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-baseline justify-between mb-1 gap-2">
          <span className="text-xl font-bold text-gray-900">
            ${Number(property.rent_per_week).toLocaleString(undefined, { maximumFractionDigits: 0 })}
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

        <div className="flex items-center gap-3 text-xs text-gray-600 mb-3 flex-wrap">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {property.bedrooms ?? 1} bed
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
              />
            </svg>
            {property.bathrooms ?? 1} bath
          </span>
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

        <div className="flex items-center gap-1.5 text-xs text-gray-400 border-t border-gray-50 pt-3">
          <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-[10px] font-semibold shrink-0">
            {landlordName.charAt(0).toUpperCase()}
          </div>
          <span className="truncate">{landlordName}</span>
          {isVerified && (
            <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          )}
        </div>
      </div>
    </Link>
  )
}
