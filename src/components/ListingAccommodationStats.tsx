import type { AccommodationDisplayInput } from '../lib/listingAccommodationDisplay'
import {
  formatListingDetailAccommodation,
  resolveListingAccommodationStats,
} from '../lib/listingAccommodationDisplay'

type Props = {
  property: AccommodationDisplayInput
  roomLabel: string | null
  variant?: 'hero' | 'compact'
}

function BedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  )
}

function BathIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
      />
    </svg>
  )
}

function DoorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
      />
    </svg>
  )
}

function HouseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
    </svg>
  )
}

function StatPill({
  icon,
  value,
  label,
  compact,
}: {
  icon: 'bed' | 'bath'
  value: number
  label: string
  compact?: boolean
}) {
  const Icon = icon === 'bed' ? BedIcon : BathIcon
  return (
    <div className={`flex items-center gap-2.5 ${compact ? 'min-w-0' : ''}`}>
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-white/80 text-[#5a8f7f] shadow-sm ring-1 ring-[#8FB9AB]/25 ${
          compact ? 'h-8 w-8' : 'h-10 w-10'
        }`}
      >
        <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </span>
      <div className="min-w-0">
        <p
          className={`font-display font-bold text-stone-900 tabular-nums leading-none ${
            compact ? 'text-xl' : 'text-2xl sm:text-3xl'
          }`}
        >
          {value}
        </p>
        <p className={`text-stone-500 leading-tight ${compact ? 'text-[10px]' : 'text-xs'}`}>{label}</p>
      </div>
    </div>
  )
}

function Connector({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center text-stone-300 ${
        compact ? 'px-0.5' : 'px-1 sm:px-2'
      }`}
      aria-hidden
    >
      <svg className={compact ? 'h-4 w-4' : 'h-5 w-5 sm:h-6 sm:w-6'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </div>
  )
}

function RoomInHouseLayout({
  model,
  compact,
  ariaLabel,
}: {
  model: Extract<ReturnType<typeof resolveListingAccommodationStats>, { kind: 'room_in_house' }>
  compact?: boolean
  ariaLabel: string | null
}) {
  const bedLabel = model.beds === 1 ? 'bedroom' : 'bedrooms'
  const bathLabel = model.baths === 1 ? 'bathroom' : 'bathrooms'

  return (
    <div
      className={`flex items-stretch ${compact ? 'gap-2' : 'flex-col sm:flex-row gap-3'}`}
      role="group"
      aria-label={ariaLabel ?? undefined}
    >
      <div
        className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#FF6F61]/25 bg-gradient-to-br from-[#FF6F61]/12 via-[#FF6F61]/6 to-white shadow-sm ${
          compact ? 'px-3 py-2.5' : 'px-4 py-3.5 sm:py-4'
        }`}
      >
        <span
          className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-[#FF6F61]/15 text-[#FF6F61] ${
            compact ? 'h-9 w-9' : 'h-11 w-11 sm:h-12 sm:w-12'
          }`}
        >
          <DoorIcon className={compact ? 'h-4 w-4' : 'h-5 w-5 sm:h-6 sm:w-6'} />
        </span>
        <div className="min-w-0">
          <p className={`font-semibold text-stone-900 leading-snug ${compact ? 'text-sm' : 'text-base'}`}>
            {model.roomTitle}
          </p>
          <p className={`text-stone-500 leading-snug ${compact ? 'text-[11px]' : 'text-xs sm:text-sm'}`}>
            {model.roomSubtitle}
          </p>
        </div>
      </div>

      {!compact ? (
        <div className="hidden sm:flex items-center justify-center self-center" aria-hidden>
          <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            in a
          </span>
        </div>
      ) : (
        <Connector compact />
      )}

      <div
        className={`flex min-w-0 flex-[1.15] items-center gap-3 rounded-xl border border-[#8FB9AB]/35 bg-gradient-to-br from-[#8FB9AB]/18 via-[#8FB9AB]/8 to-white shadow-sm ${
          compact ? 'px-3 py-2.5' : 'px-4 py-3.5 sm:py-4'
        }`}
      >
        <span
          className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-[#8FB9AB]/20 text-[#5a8f7f] ${
            compact ? 'h-9 w-9' : 'h-11 w-11 sm:h-12 sm:w-12'
          }`}
        >
          <HouseIcon className={compact ? 'h-4 w-4' : 'h-5 w-5 sm:h-6 sm:w-6'} />
        </span>
        <div className="min-w-0 flex-1">
          {!compact ? (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5a8f7f] mb-2 sm:hidden">
              Whole {model.houseLabel}
            </p>
          ) : null}
          <div className={`flex ${compact ? 'gap-3' : 'gap-4 sm:gap-6'}`}>
            <StatPill icon="bed" value={model.beds} label={bedLabel} compact={compact} />
            <StatPill icon="bath" value={model.baths} label={bathLabel} compact={compact} />
          </div>
        </div>
      </div>
    </div>
  )
}

function EntirePropertyLayout({
  beds,
  baths,
  compact,
  ariaLabel,
}: {
  beds: number
  baths: number
  compact?: boolean
  ariaLabel: string | null
}) {
  const bedLabel = beds === 1 ? 'bedroom' : 'bedrooms'
  const bathLabel = baths === 1 ? 'bathroom' : 'bathrooms'

  return (
    <div
      className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}
      role="group"
      aria-label={ariaLabel ?? undefined}
    >
      <div
        className={`rounded-xl border border-stone-200/90 bg-white shadow-sm ${
          compact ? 'px-3 py-2.5' : 'px-4 py-3.5 sm:px-5 sm:py-4'
        }`}
      >
        <StatPill icon="bed" value={beds} label={bedLabel} compact={compact} />
      </div>
      <div
        className={`rounded-xl border border-stone-200/90 bg-white shadow-sm ${
          compact ? 'px-3 py-2.5' : 'px-4 py-3.5 sm:px-5 sm:py-4'
        }`}
      >
        <StatPill icon="bath" value={baths} label={bathLabel} compact={compact} />
      </div>
    </div>
  )
}

function SimpleLayout({
  beds,
  baths,
  roomLabel,
  compact,
  ariaLabel,
}: {
  beds: number
  baths: number
  roomLabel: string | null
  compact?: boolean
  ariaLabel: string | null
}) {
  const bedLabel = beds === 1 ? 'bed' : 'beds'
  const bathLabel = baths === 1 ? 'bath' : 'baths'

  return (
    <div
      className={`flex flex-wrap items-center ${compact ? 'gap-2' : 'gap-2.5'}`}
      role="group"
      aria-label={ariaLabel ?? undefined}
    >
      {roomLabel ? (
        <span
          className={`inline-flex items-center gap-2 rounded-full border border-[#FF6F61]/25 bg-[#FF6F61]/10 font-medium text-stone-800 ${
            compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
          }`}
        >
          <DoorIcon className={compact ? 'h-3.5 w-3.5 text-[#FF6F61]' : 'h-4 w-4 text-[#FF6F61]'} />
          {roomLabel}
        </span>
      ) : null}
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white font-medium text-stone-700 shadow-sm ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
        }`}
      >
        <BedIcon className={`text-[#5a8f7f] ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
        {beds} {bedLabel}
      </span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white font-medium text-stone-700 shadow-sm ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
        }`}
      >
        <BathIcon className={`text-[#5a8f7f] ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
        {baths} {bathLabel}
      </span>
    </div>
  )
}

export function ListingAccommodationStats({ property, roomLabel, variant = 'hero' }: Props) {
  const model = resolveListingAccommodationStats(property, roomLabel)
  const compact = variant === 'compact'
  const ariaLabel =
    formatListingDetailAccommodation(property) ??
    (model.kind === 'entire'
      ? `${model.beds} bedroom${model.beds !== 1 ? 's' : ''}, ${model.baths} bathroom${model.baths !== 1 ? 's' : ''}`
      : model.kind === 'simple' && model.roomLabel
        ? `${model.roomLabel}, ${model.beds} bed${model.beds !== 1 ? 's' : ''}, ${model.baths} bath${model.baths !== 1 ? 's' : ''}`
        : null)

  const inner =
    model.kind === 'room_in_house' ? (
      <RoomInHouseLayout model={model} compact={compact} ariaLabel={ariaLabel} />
    ) : model.kind === 'entire' ? (
      <EntirePropertyLayout beds={model.beds} baths={model.baths} compact={compact} ariaLabel={ariaLabel} />
    ) : (
      <SimpleLayout
        beds={model.beds}
        baths={model.baths}
        roomLabel={model.roomLabel}
        compact={compact}
        ariaLabel={ariaLabel}
      />
    )

  if (compact) return inner

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/70 p-3 sm:p-4 shadow-sm backdrop-blur-[2px]">
      {inner}
    </div>
  )
}
