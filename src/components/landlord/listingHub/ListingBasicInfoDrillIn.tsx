import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import type { PropertyListingType, RoomType } from '../../../lib/listings'
import {
  fieldsFromHubListingTypeTile,
  hubListingTypeTileFromFields,
  listingHubPath,
  type HubListingTypeTile,
} from '../../../lib/listingEditHubHealth'
import { listingBasicInfoActionBarItemSpecs } from '../../../lib/appChromeBarItems'
import { useSetAppChromeActions, type AppActionBarItem } from '../../appShell/AppChromeActionsContext'
import { ListingHubStatusDot } from './ListingHubVisuals'

const TITLE_MAX = 60

const TYPE_TILES: { key: HubListingTypeTile; label: string; sub: string }[] = [
  { key: 'entire', label: 'Entire place', sub: 'Whole property' },
  { key: 'room', label: 'Private room', sub: 'Room in a share' },
  { key: 'rooming', label: 'Rooming house', sub: 'Registered share' },
]

export type ListingBasicInfoValues = {
  title: string
  headline: string
  availableFrom: string
  openToNonStudents: boolean
  propertyListingType: PropertyListingType
  roomType: RoomType | ''
  isRegisteredRoomingHouse: boolean
}

type Props = {
  propertyId: string | null
  isSetupMode: boolean
  initial: ListingBasicInfoValues
  saving: boolean
  error: string | null
  onSave: (values: ListingBasicInfoValues, intent: 'save' | 'draft' | 'next') => void
  onCancel: () => void
}

function isoToDisplay(iso: string): string {
  if (!iso || iso.length < 10) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

export default function ListingBasicInfoDrillIn({
  propertyId,
  isSetupMode,
  initial,
  saving,
  error,
  onSave,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(initial.title)
  const [headline, setHeadline] = useState(initial.headline)
  const [availableFrom, setAvailableFrom] = useState(initial.availableFrom.slice(0, 10))
  const [openToNonStudents, setOpenToNonStudents] = useState(initial.openToNonStudents)
  const [listingType, setListingType] = useState<HubListingTypeTile | null>(() =>
    hubListingTypeTileFromFields(
      initial.propertyListingType,
      initial.roomType,
      initial.isRegisteredRoomingHouse,
    ),
  )

  useEffect(() => {
    setTitle(initial.title)
    setHeadline(initial.headline)
    setAvailableFrom(initial.availableFrom.slice(0, 10))
    setOpenToNonStudents(initial.openToNonStudents)
    setListingType(
      hubListingTypeTileFromFields(
        initial.propertyListingType,
        initial.roomType,
        initial.isRegisteredRoomingHouse,
      ),
    )
  }, [initial])

  const titleCount = title.length
  const basicDone = title.trim().length > 0 && listingType != null

  const values = useMemo((): ListingBasicInfoValues => {
    const mapped = listingType
      ? fieldsFromHubListingTypeTile(listingType, {
          propertyListingType: initial.propertyListingType,
          roomType: initial.roomType,
        })
      : {
          propertyListingType: initial.propertyListingType,
          roomType: (initial.roomType || 'apartment') as RoomType,
          isRegisteredRoomingHouse: initial.isRegisteredRoomingHouse,
        }
    return {
      title: title.trim(),
      headline: headline.trim(),
      availableFrom: availableFrom.trim(),
      openToNonStudents,
      propertyListingType: mapped.propertyListingType,
      roomType: mapped.roomType,
      isRegisteredRoomingHouse: mapped.isRegisteredRoomingHouse,
    }
  }, [
    title,
    headline,
    availableFrom,
    openToNonStudents,
    listingType,
    initial.propertyListingType,
    initial.roomType,
    initial.isRegisteredRoomingHouse,
  ])

  const hubHref = listingHubPath({ propertyId })
  const nextHref = listingHubPath({ propertyId, view: 'property' })

  const actionItems: AppActionBarItem[] = useMemo(() => {
    const specs = listingBasicInfoActionBarItemSpecs({
      isSetupMode,
      saving,
      canSubmit: Boolean(title.trim()),
    })
    return specs.map((spec) => ({
      ...spec,
      icon: spec.primary ? Check : X,
      onClick:
        spec.id === 'cancel'
          ? onCancel
          : () => onSave(values, spec.id === 'draft' ? 'draft' : spec.id === 'next' ? 'next' : 'save'),
    }))
  }, [isSetupMode, saving, title, values, onSave, onCancel])
  useSetAppChromeActions(actionItems)

  const footerSpecs = listingBasicInfoActionBarItemSpecs({
    isSetupMode,
    saving,
    canSubmit: Boolean(title.trim()),
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--quni-surface-2)]">
      <div className="shrink-0 border-b border-[var(--quni-line-soft)] bg-white px-4 py-3">
        <Link
          to={hubHref}
          className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--quni-ink-4)] hover:text-[var(--quni-ink)]"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Listing health
        </Link>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-[var(--quni-ink)]">Basic info</h1>
          <span className="text-xs font-semibold text-[var(--quni-ink-5)]">Step 1 of 8</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {error ? (
          <div
            className="mb-4 rounded-xl border border-[var(--quni-danger-bg)] bg-[var(--quni-danger-bg)] px-3 py-2 text-sm text-[var(--quni-danger-fg)]"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="mb-[22px]">
          <label
            htmlFor="hub-listing-title"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--quni-ink-4)]"
          >
            Listing title
          </label>
          <input
            id="hub-listing-title"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sunny room near UNSW"
            className="w-full rounded-[10px] border border-[#D8D3C7] bg-white px-3.5 py-3 text-[15px] text-[var(--quni-ink)] outline-none focus:border-[var(--quni-coral)] focus:shadow-[0_0_0_3px_rgba(255,111,97,0.18)]"
          />
          <div className="mt-1.5 flex justify-between gap-2">
            <span className="text-xs text-[var(--quni-ink-5)]">Clear and specific helps students find you.</span>
            <span className="shrink-0 text-xs tabular-nums text-[var(--quni-ink-5)]">
              {titleCount}/{TITLE_MAX}
            </span>
          </div>
        </div>

        <div className="mb-[22px]">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--quni-ink-4)]">
            Listing type
          </p>
          <div className="flex gap-2.5">
            {TYPE_TILES.map((t) => {
              const sel = listingType === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setListingType(t.key)}
                  className={`flex-1 rounded-xl p-3 text-left ${
                    sel
                      ? 'border-[1.5px] border-[var(--quni-coral)] bg-[rgba(255,111,97,0.06)] shadow-[0_0_0_1px_var(--quni-coral)]'
                      : 'border border-[#D8D3C7] bg-white'
                  }`}
                >
                  <span className="mb-0.5 flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold text-[var(--quni-ink)]">{t.label}</span>
                    {sel ? (
                      <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--quni-coral)]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d="M4 12.5l5 5L20 6"
                            stroke="#fff"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    ) : (
                      <span className="inline-block h-[18px] w-[18px] rounded-full border-[1.5px] border-[#D2CDC2]" />
                    )}
                  </span>
                  <span className="block text-[11px] leading-snug text-[var(--quni-ink-5)]">{t.sub}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-[22px]">
          <label
            htmlFor="hub-listing-headline"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--quni-ink-4)]"
          >
            Headline <span className="font-medium normal-case tracking-normal text-[#B2AAB9]">· optional</span>
          </label>
          <input
            id="hub-listing-headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="One line students see first"
            maxLength={120}
            className="w-full rounded-[10px] border border-[#D8D3C7] bg-white px-3.5 py-3 text-[15px] text-[var(--quni-ink)] outline-none focus:border-[var(--quni-coral)] focus:shadow-[0_0_0_3px_rgba(255,111,97,0.18)]"
          />
          <p className="mt-1.5 text-xs text-[var(--quni-ink-5)]">
            Optional — shown on your edit hub for now until a dedicated field ships.
          </p>
        </div>

        <div className="mb-[22px]">
          <label
            htmlFor="hub-available-from"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--quni-ink-4)]"
          >
            Available from
          </label>
          <div className="flex items-center gap-2.5 rounded-[10px] border border-[#D8D3C7] bg-white px-3.5 py-3">
            <span className="text-[var(--quni-ink-5)]" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </span>
            <input
              id="hub-available-from"
              type="date"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[var(--quni-ink)] outline-none"
            />
            <span className="shrink-0 text-xs text-[var(--quni-ink-5)]">
              {availableFrom ? isoToDisplay(availableFrom) : 'dd/mm/yyyy'}
            </span>
          </div>
        </div>

        <div className="mb-[18px] flex items-center gap-3 rounded-xl border border-[var(--quni-line)] bg-white p-3.5">
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-sm font-semibold text-[var(--quni-ink)]">Open to non-students</p>
            <p className="text-xs leading-snug text-[var(--quni-ink-5)]">
              Allow enquiries from working professionals too.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={openToNonStudents}
            onClick={() => setOpenToNonStudents((v) => !v)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              openToNonStudents ? 'bg-[var(--quni-coral)]' : 'bg-[#D9D5CC]'
            }`}
          >
            <span
              className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-[left] ${
                openToNonStudents ? 'left-[23px]' : 'left-[3px]'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-2 px-0.5">
          <ListingHubStatusDot status={basicDone ? 'complete' : 'attention'} />
          <p className="text-[12.5px] leading-snug text-[var(--quni-ink-4)]">
            {basicDone
              ? 'Looking good — saving turns Basic info green on your listing health.'
              : 'Add a listing title and listing type to complete this section and turn it green.'}
          </p>
        </div>
      </div>

      {/* Desktop only — mobile uses AppActionBar (same specs). */}
      <div className="hidden shrink-0 border-t border-[var(--quni-line-soft)] bg-white px-4 py-3 sm:block">
        <div className="flex gap-3">
          {footerSpecs.map((spec) => {
            const primary = Boolean(spec.primary)
            const disabled = Boolean(spec.disabled)
            return (
              <button
                key={spec.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (spec.id === 'cancel') {
                    onCancel()
                    return
                  }
                  onSave(values, spec.id === 'draft' ? 'draft' : spec.id === 'next' ? 'next' : 'save')
                }}
                className={
                  primary
                    ? 'flex-1 rounded-[10px] bg-[var(--quni-coral)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--quni-coral-hover)] disabled:opacity-50'
                    : 'flex-1 rounded-[10px] border border-[#D8D3C7] bg-white px-4 py-3 text-sm font-semibold text-[var(--quni-navy)] hover:bg-[var(--quni-surface-3)] disabled:opacity-50'
                }
              >
                {spec.label}
              </button>
            )
          })}
        </div>
      </div>

      {isSetupMode ? <Link to={nextHref} className="hidden" tabIndex={-1} aria-hidden /> : null}
    </div>
  )
}
