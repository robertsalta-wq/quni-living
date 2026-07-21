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

/** Side-view bed - matches common AU property listing iconography. */
function BedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3 11V8a2 2 0 012-2h3l1.5-2h5L16 6h3a2 2 0 012 2v3M3 11h18M3 11v5h18v-5M7 16v2M17 16v2"
      />
    </svg>
  )
}

/** Bathtub with shower - similar to realestate.com.au listing stats. */
function BathIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M5 14h14v2.5a2.5 2.5 0 01-2.5 2.5h-9A2.5 2.5 0 015 16.5V14z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 14V11a2 2 0 012-2h0" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 8V6.5M7 8h2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 19v1M17 19v1" />
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
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3m2 0v-4h10v4M12 11h.01"
      />
    </svg>
  )
}

function PropertyStat({
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
    <div className={`flex flex-1 min-w-0 flex-col items-center text-center ${compact ? 'gap-0' : 'gap-0.5'}`}>
      <div className={`flex items-center justify-center ${compact ? 'gap-1' : 'gap-1.5'}`}>
        <Icon className={`shrink-0 text-stone-600 ${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
        <span
          className={`font-display font-bold text-stone-900 tabular-nums leading-none ${
            compact ? 'text-xl' : 'text-2xl'
          }`}
        >
          {value}
        </span>
      </div>
      <span className={`text-stone-500 leading-tight ${compact ? 'text-[10px]' : 'text-xs'}`}>{label}</span>
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
  const bedLabel = model.beds === 1 ? 'bed' : 'beds'
  const bathLabel = model.baths === 1 ? 'bath' : 'baths'

  return (
    <div
      className={`flex items-center ${compact ? 'gap-2' : 'gap-2 sm:gap-3'}`}
      role="group"
      aria-label={ariaLabel ?? undefined}
    >
      <div
        className={`flex min-w-0 shrink-0 items-center gap-2.5 rounded-xl border border-admin-coral/20 bg-admin-coral/8 ${
          compact ? 'px-3 py-2' : 'px-3.5 py-3 sm:px-4 sm:py-3.5'
        }`}
      >
        <span
          className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-admin-coral/12 text-[var(--quni-coral)] ${
            compact ? 'h-8 w-8' : 'h-9 w-9'
          }`}
        >
          <DoorIcon className={compact ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
        </span>
        <div className="min-w-0">
          <p className={`font-semibold text-stone-900 leading-tight ${compact ? 'text-sm' : 'text-sm sm:text-base'}`}>
            {model.roomTitle}
          </p>
          <p className={`text-stone-500 leading-tight ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {model.roomSubtitle}
          </p>
        </div>
      </div>

      <span
        className={`shrink-0 font-semibold uppercase tracking-wide text-stone-400 ${
          compact ? 'text-[9px]' : 'text-[10px]'
        }`}
        aria-hidden
      >
        in a
      </span>

      <div
        className={`flex min-w-0 flex-1 items-center justify-evenly rounded-xl border border-admin-trust-soft/30 bg-admin-trust-soft/10 ${
          compact ? 'px-2 py-2' : 'px-3 py-3 sm:px-4 sm:py-3.5'
        }`}
      >
        <PropertyStat icon="bed" value={model.beds} label={bedLabel} compact={compact} />
        <div className={`w-px self-stretch bg-admin-trust-soft/25 ${compact ? 'my-0.5' : 'my-1'}`} aria-hidden />
        <PropertyStat icon="bath" value={model.baths} label={bathLabel} compact={compact} />
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
  const bedLabel = beds === 1 ? 'bed' : 'beds'
  const bathLabel = baths === 1 ? 'bath' : 'baths'

  return (
    <div
      className={`flex items-center justify-evenly rounded-xl border border-stone-200/90 bg-white ${
        compact ? 'px-3 py-2.5 gap-2' : 'px-4 py-3.5 sm:px-5 sm:py-4 gap-3'
      }`}
      role="group"
      aria-label={ariaLabel ?? undefined}
    >
      <PropertyStat icon="bed" value={beds} label={bedLabel} compact={compact} />
      <div className={`w-px self-stretch bg-stone-200 ${compact ? 'my-0.5' : 'my-1'}`} aria-hidden />
      <PropertyStat icon="bath" value={baths} label={bathLabel} compact={compact} />
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
          className={`inline-flex items-center gap-1.5 rounded-full border border-admin-coral/20 bg-admin-coral/8 font-medium text-stone-800 ${
            compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
          }`}
        >
          <DoorIcon className={`text-[var(--quni-coral)] ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
          {roomLabel}
        </span>
      ) : null}
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white font-medium text-stone-700 ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
        }`}
      >
        <BedIcon className={`text-stone-600 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
        {beds} {bedLabel}
      </span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white font-medium text-stone-700 ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
        }`}
      >
        <BathIcon className={`text-stone-600 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
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
    <div className="quni-card p-3 sm:p-3.5">
      {inner}
    </div>
  )
}
