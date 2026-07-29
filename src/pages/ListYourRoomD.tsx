import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  ChevronRight,
  FilePenLine,
  MessageSquareText,
  SpellCheck,
  UserCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import { PropertyCard } from '../components/PropertyCard'
import { VerifiedLandlordBadge } from '../components/VerifiedLandlordBadge'
import Signup from './Signup'
import {
  LIST_YOUR_ROOM_D_CAMPUSES,
  LIST_YOUR_ROOM_D_PREVIEW_SLUG,
  type ListYourRoomDRoomKind,
} from '../lib/listYourRoomDCampuses'
import { LEGAL_ENTITY_NAME, getFallbackLegalEntity } from '../lib/legalEntity'
import type { Property } from '../lib/listings'
import { formatListingDetailAccommodation } from '../lib/listingAccommodationDisplay'
import { getListingRentDisplay } from '../lib/pricing/listingRentDisplay'
import { formatAustralianAbn } from '../lib/platformIdentity'
import { firstPropertyImageUrl, normalizePropertyImages } from '../lib/propertyImages'
import { loadPropertyDetailBySlug } from '../lib/propertyDetailCache'

/** TODO: replace with final approved Quinnie photo (same asset as `/list-your-room`). */
const QUINNIE_IMG = '/landlord-invite/quinnie.jpg'

/** Interim ABN for papers footer until public_legal_entity always supplies it. */
const INVITE_ABN_FALLBACK = '65675990968'

type SmartTool = {
  title: string
  body: string
  Icon: LucideIcon
}

/** Verbatim from `/list-your-room-c`. */
const SMART_TOOLS: SmartTool[] = [
  {
    Icon: FilePenLine,
    title: 'Instant listing builder',
    body: 'Get a clear, high-converting room description drafted in seconds.',
  },
  {
    Icon: SpellCheck,
    title: 'Polished copy',
    body: 'Proofreads and refines your text so your listing looks professional.',
  },
  {
    Icon: Banknote,
    title: 'Smart rent pricing',
    body: 'Recommends competitive weekly rates based on live Sydney student demand.',
  },
  {
    Icon: MessageSquareText,
    title: '1-click quick replies',
    body: 'Answer common student questions instantly without repetitive typing.',
  },
  {
    Icon: UserCheck,
    title: 'Applicant summaries',
    body: 'See enrolment status, lifestyle habits, and fit at a glance before replying.',
  },
]

/** Same line-item pattern as `/list-your-room-c` / Pricing Listing column. */
function OfferLineItem({
  icon,
  name,
  value,
  description,
  valueKind,
}: {
  icon: ReactNode
  name: string
  value: string
  description: string
  valueKind: 'coralLg' | 'coralSm'
}) {
  const valueCls =
    valueKind === 'coralLg'
      ? 'font-lora text-[length:var(--text-body-lg-size)] font-semibold text-[var(--quni-rust)]'
      : 'font-lora text-[length:var(--text-body-sm-size)] font-semibold text-[var(--quni-rust)]'

  return (
    <div className="mb-[18px] grid grid-cols-[22px_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 last:mb-0">
      <div
        className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--quni-rust)] [&_svg]:h-4 [&_svg]:w-4"
        aria-hidden
      >
        {icon}
      </div>
      <div className="text-[length:var(--text-body-sm-size)] font-medium leading-[var(--text-body-sm-lh)] text-[var(--quni-ink)]">
        {name}
      </div>
      <div className={`whitespace-nowrap leading-none ${valueCls}`}>{value}</div>
      <p className="col-span-2 col-start-2 text-[length:var(--text-caption-size)] leading-[var(--text-caption-lh)] text-[var(--quni-ink-4)]">
        {description}
      </p>
    </div>
  )
}

const HOUSE_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M2 6l6-4 6 4v8H2z" />
    <path d="M6 14V9h4v5" />
  </svg>
)

const CHECK_ICON = (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3,8 7,12 13,4" />
  </svg>
)

type RentGuideOk = {
  low: number
  high: number
  framing: 'campus_listings' | 'typical_nsw'
  caveat: string
}

type RentGuideState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: RentGuideOk }
  | { status: 'empty'; message: string }
  | { status: 'error'; message: string }

function plateClassName() {
  return 'inline-block rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-1)] px-2.5 py-1.5 text-[length:var(--text-micro-size)] font-semibold uppercase tracking-[var(--text-micro-track)] text-[var(--quni-ink)]'
}

function EarningsStrip() {
  const selectId = useId()
  const [campusId, setCampusId] = useState(LIST_YOUR_ROOM_D_CAMPUSES[0].id)
  const [roomKind, setRoomKind] = useState<ListYourRoomDRoomKind>('single')
  const [guide, setGuide] = useState<RentGuideState>({ status: 'idle' })
  const [fadeKey, setFadeKey] = useState(0)

  const campus = LIST_YOUR_ROOM_D_CAMPUSES.find((c) => c.id === campusId) ?? LIST_YOUR_ROOM_D_CAMPUSES[0]

  useEffect(() => {
    let cancelled = false
    const cacheKey = `${campusId}:${roomKind}`
    const cached =
      typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`lyrd-rent:${cacheKey}`) : null
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as RentGuideOk
        if (parsed && typeof parsed.low === 'number' && typeof parsed.high === 'number') {
          setGuide({ status: 'ok', data: parsed })
          setFadeKey((k) => k + 1)
          return
        }
      } catch {
        /* fall through */
      }
    }

    setGuide({ status: 'loading' })
    void (async () => {
      try {
        const res = await fetch(
          `/api/invite-rent-guide?campus_id=${encodeURIComponent(campusId)}&room_type=${encodeURIComponent(roomKind)}`,
        )
        const body = (await res.json().catch(() => null)) as
          | {
              low?: number
              high?: number
              framing?: 'campus_listings' | 'typical_nsw' | 'unavailable'
              caveat?: string
              error?: string
              message?: string
            }
          | null
        if (cancelled) return
        if (!res.ok) {
          setGuide({
            status: 'error',
            message: body?.message || body?.error || 'Could not load the rent guide.',
          })
          return
        }
        if (body?.framing === 'unavailable' || body?.error === 'no_data') {
          setGuide({
            status: 'empty',
            message: body.message || 'Not enough live listings to show a range yet.',
          })
          return
        }
        if (
          typeof body?.low !== 'number' ||
          typeof body?.high !== 'number' ||
          typeof body?.caveat !== 'string' ||
          (body.framing !== 'campus_listings' && body.framing !== 'typical_nsw')
        ) {
          setGuide({ status: 'error', message: 'Could not load the rent guide.' })
          return
        }
        const ok: RentGuideOk = {
          low: body.low,
          high: body.high,
          framing: body.framing,
          caveat: body.caveat,
        }
        try {
          sessionStorage.setItem(`lyrd-rent:${cacheKey}`, JSON.stringify(ok))
        } catch {
          /* ignore */
        }
        setGuide({ status: 'ok', data: ok })
        setFadeKey((k) => k + 1)
      } catch {
        if (!cancelled) setGuide({ status: 'error', message: 'Could not load the rent guide.' })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [campusId, roomKind])

  return (
    <section
      className="grid grid-cols-1 items-center gap-5 rounded-[var(--radius-sm)] border border-[var(--quni-ink)] bg-[var(--quni-surface-1)] p-5 md:grid-cols-[1.1fr_0.9fr] md:gap-6 md:p-6"
      aria-labelledby="lyrd-earn-heading"
    >
      <div>
        <span className={plateClassName()}>What could it earn?</span>
        <h2
          id="lyrd-earn-heading"
          className="font-display mt-3 text-[length:var(--text-h3-size)] font-semibold leading-[var(--text-h3-lh)] text-[var(--quni-ink)] !mt-3 !mb-0"
        >
          See the going rate before you list.
        </h2>
        <p className="mt-1.5 max-w-md text-[length:var(--text-body-sm-size)] leading-[var(--text-body-sm-lh)] text-[var(--quni-ink-3)]">
          Pick the campus your room is near — we&apos;ll show what similar rooms are renting for right now.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <label htmlFor={selectId} className="sr-only">
            Nearest university
          </label>
          <select
            id={selectId}
            value={campusId}
            onChange={(e) => setCampusId(e.target.value)}
            className="w-full cursor-pointer rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-1)] px-3 py-2.5 text-[length:var(--text-body-sm-size)] font-medium text-[var(--quni-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)] sm:w-auto"
          >
            {LIST_YOUR_ROOM_D_CAMPUSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.selectLabel}
              </option>
            ))}
          </select>
          <div
            className="inline-flex overflow-hidden rounded-[var(--radius-sm)] border border-[var(--quni-line)]"
            role="group"
            aria-label="Room type"
          >
            {(
              [
                { kind: 'single', label: 'Single room' },
                { kind: 'ensuite', label: 'Ensuite' },
              ] as const
            ).map(({ kind, label }) => {
              const pressed = roomKind === kind
              return (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => setRoomKind(kind)}
                  className={[
                    'px-3.5 py-2.5 text-[length:var(--text-caption-size)] font-semibold transition-colors duration-[var(--dur-base)] ease-[var(--ease-standard)]',
                    pressed
                      ? 'bg-[var(--quni-surface-2)] text-[var(--quni-ink)] shadow-[inset_0_0_0_1px_var(--quni-line)]'
                      : 'bg-[var(--quni-surface-1)] text-[var(--quni-ink-3)] hover:bg-[var(--quni-surface-2)]',
                  ].join(' ')}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--quni-line)] pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
        <p className="text-[length:var(--text-caption-size)] leading-[var(--text-caption-lh)] text-[var(--quni-ink-3)]">
          Rooms near {campus.label}
        </p>
        <div
          key={fadeKey}
          className="mt-1.5 font-sans text-[length:var(--text-display-sm-size)] font-bold leading-[var(--text-display-sm-lh)] tabular-nums text-[var(--quni-ink)] transition-opacity duration-[var(--dur-base)] ease-[var(--ease-standard)]"
        >
          {guide.status === 'loading' || guide.status === 'idle' ? (
            <span className="text-[length:var(--text-h3-size)] font-semibold text-[var(--quni-ink-4)]">
              Loading…
            </span>
          ) : guide.status === 'ok' ? (
            <>
              ${guide.data.low}&ndash;${guide.data.high}{' '}
              <span className="text-[length:var(--text-body-size)] font-semibold text-[var(--quni-ink-3)]">
                /wk
              </span>
            </>
          ) : (
            <span className="text-[length:var(--text-body-sm-size)] font-semibold text-[var(--quni-ink-3)]">
              —
            </span>
          )}
        </div>
        {guide.status === 'ok' ? (
          <p className="mt-2 max-w-sm text-[length:var(--text-micro-size)] leading-[var(--text-micro-lh)] text-[var(--quni-ink-3)]">
            {guide.data.caveat}
          </p>
        ) : guide.status === 'empty' || guide.status === 'error' ? (
          <p className="mt-2 max-w-sm text-[length:var(--text-micro-size)] leading-[var(--text-micro-lh)] text-[var(--quni-ink-3)]">
            {guide.message}
          </p>
        ) : (
          <p className="mt-2 max-w-sm text-[length:var(--text-micro-size)] leading-[var(--text-micro-lh)] text-[var(--quni-ink-3)]">
            A guide to what students are paying — not an estimate of your specific room.
          </p>
        )}
      </div>
    </section>
  )
}

function PreviewDesk({ property }: { property: Property | null }) {
  const images = property ? normalizePropertyImages(property.images).map((img) => img.url).slice(0, 3) : []
  const hero = property ? firstPropertyImageUrl(property.images) : null
  const rent = property ? getListingRentDisplay(property) : null
  const accommodation = property ? formatListingDetailAccommodation(property) : null
  const hostName = property?.landlord_profiles?.full_name?.trim() || 'Private landlord'

  return (
    <section className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--quni-ink)] bg-[var(--quni-surface-1)]">
      <div className="flex flex-wrap items-center gap-3.5 px-5 py-4">
        <span className={plateClassName()}>Preview</span>
        <p className="font-display text-[length:var(--text-body-size)] text-[var(--quni-ink)]">
          See your room on Quni before you list.{' '}
          <span className="font-sans text-[length:var(--text-body-sm-size)] font-normal text-[var(--quni-ink-3)]">
            Optional — open a mode to preview.
          </span>
        </p>
      </div>

      <details className="group border-t border-[var(--quni-line)]">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 text-[length:var(--text-body-sm-size)] font-semibold text-[var(--quni-ink)] transition-colors hover:bg-[var(--quni-surface-2)] [&::-webkit-details-marker]:hidden">
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-[var(--quni-coral-active)] transition-transform duration-[var(--dur-base)] group-open:rotate-90"
            aria-hidden
          />
          Listing mode
          <span className="ml-auto hidden text-right text-[length:var(--text-caption-size)] font-normal text-[var(--quni-ink-3)] sm:inline">
            how your room appears in search
          </span>
        </summary>
        <div className="px-5 pb-5 pt-1.5">
          {property ? (
            <div className="flex flex-wrap items-start gap-6">
              <div className="w-full max-w-xs shrink-0 [&_.quni-card]:shadow-[var(--shadow-1)]">
                <PropertyCard property={property} staticDisplay />
              </div>
              <p className="max-w-xs text-[length:var(--text-body-sm-size)] leading-[var(--text-body-sm-lh)] text-[var(--quni-ink-3)]">
                The exact card a <strong className="font-semibold text-[var(--quni-ink-2)]">verified student</strong>{' '}
                sees while browsing — same component as every live listing, so what you preview is what publishes.
              </p>
            </div>
          ) : (
            <p className="text-[length:var(--text-body-sm-size)] text-[var(--quni-ink-3)]">Loading listing card…</p>
          )}
        </div>
      </details>

      <details className="group border-t border-[var(--quni-line)]">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 text-[length:var(--text-body-sm-size)] font-semibold text-[var(--quni-ink)] transition-colors hover:bg-[var(--quni-surface-2)] [&::-webkit-details-marker]:hidden">
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-[var(--quni-coral-active)] transition-transform duration-[var(--dur-base)] group-open:rotate-90"
            aria-hidden
          />
          Full viewing mode
          <span className="ml-auto hidden text-right text-[length:var(--text-caption-size)] font-normal text-[var(--quni-ink-3)] sm:inline">
            the page a student opens
          </span>
        </summary>
        <div className="px-5 pb-5 pt-1.5">
          {property ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)]">
              <div>
                <div className="grid aspect-[4/3] max-h-80 grid-cols-[2fr_1fr] grid-rows-2 gap-2">
                  <div className="relative row-span-2 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-2)]">
                    {hero ? (
                      <img src={hero} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : null}
                    <span className="absolute bottom-3 left-3 rounded-[var(--radius-sm)] bg-[var(--quni-ink)] px-2 py-1 text-[length:var(--text-micro-size)] font-semibold uppercase tracking-[var(--text-micro-track)] text-[var(--quni-surface-1)]">
                      Your room
                    </span>
                  </div>
                  {(images[1] ? [images[1], images[2] ?? images[1]] : [null, null]).map((src, i) => (
                    <div
                      key={i}
                      className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-2)]"
                    >
                      {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <h3 className="font-display text-[length:var(--text-h2-size)] font-semibold leading-[var(--text-h2-lh)] text-[var(--quni-ink)] !mt-0 !mb-0">
                    {property.title}
                  </h3>
                  <p className="mt-1.5 text-[length:var(--text-body-sm-size)] text-[var(--quni-ink-3)]">
                    {[property.suburb, property.state].filter(Boolean).join(', ')}
                    {accommodation ? ` · ${accommodation}` : null}
                  </p>
                </div>
                <div className="mt-3.5 flex items-center gap-2.5 border-y border-[var(--quni-line)] py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--quni-line)] bg-[var(--quni-surface-2)] text-[length:var(--text-body-sm-size)] font-semibold text-[var(--quni-ink-3)]">
                    {hostName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[length:var(--text-body-sm-size)] font-semibold text-[var(--quni-ink)]">
                      Hosted by {hostName}
                    </p>
                    <p className="text-[length:var(--text-caption-size)] text-[var(--quni-ink-3)]">
                      Usually replies within a few hours
                    </p>
                  </div>
                  {property.landlord_profiles?.verified ? (
                    <div className="ml-auto">
                      <VerifiedLandlordBadge />
                    </div>
                  ) : null}
                </div>
                {property.description?.trim() ? (
                  <div className="mt-4">
                    <p className="mb-2 text-[length:var(--text-micro-size)] font-semibold uppercase tracking-[var(--text-micro-track)] text-[var(--quni-ink-3)]">
                      About this room
                    </p>
                    <p className="line-clamp-5 text-[length:var(--text-body-sm-size)] leading-[var(--text-body-sm-lh)] text-[var(--quni-ink-2)]">
                      {property.description.trim()}
                    </p>
                  </div>
                ) : null}
                <p className="mt-4 text-[length:var(--text-caption-size)] text-[var(--quni-ink-3)]">
                  Read-only preview of a live listing —{' '}
                  <Link
                    to={`/properties/${property.slug}`}
                    className="font-semibold text-[var(--quni-coral-active)] underline-offset-2 hover:underline"
                  >
                    open the full property page
                  </Link>
                  .
                </p>
              </div>
              <aside>
                <div className="rounded-[var(--radius-sm)] border border-[var(--quni-ink)] bg-[var(--quni-surface-1)] p-4">
                  {rent ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-sans text-[length:var(--text-price-size)] font-bold tracking-[var(--text-price-track)] text-[var(--quni-ink)]">
                        {rent.showFromPrefix ? 'From ' : ''}$
                        {rent.primaryAmount.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[length:var(--text-caption-size)] text-[var(--quni-ink-3)]">/wk</span>
                    </div>
                  ) : null}
                  <p className="mt-1.5 text-[length:var(--text-caption-size)] text-[var(--quni-ink-3)]">
                    Preview only — booking is disabled here.
                  </p>
                  <button
                    type="button"
                    disabled
                    className="mt-3 flex w-full cursor-not-allowed items-center justify-center rounded-[var(--radius-sm)] border border-[var(--quni-coral)] bg-[var(--quni-coral)] px-3 py-2.5 text-[length:var(--text-body-sm-size)] font-semibold text-[var(--quni-surface-1)] opacity-70"
                  >
                    Ask to book
                  </button>
                  <button
                    type="button"
                    disabled
                    className="mt-2 flex w-full cursor-not-allowed items-center justify-center rounded-[var(--radius-sm)] border border-[var(--quni-ink)] bg-transparent px-3 py-2.5 text-[length:var(--text-body-sm-size)] font-semibold text-[var(--quni-ink)] opacity-70"
                  >
                    Message host
                  </button>
                </div>
              </aside>
            </div>
          ) : (
            <p className="text-[length:var(--text-body-sm-size)] text-[var(--quni-ink-3)]">Loading property preview…</p>
          )}
        </div>
      </details>
    </section>
  )
}

function PapersFooter() {
  const entity = getFallbackLegalEntity()
  const abn = entity.abn.trim() || INVITE_ABN_FALLBACK
  const legalLine = `${entity.legalName.trim() || LEGAL_ENTITY_NAME} t/a Quni Living · ABN ${formatAustralianAbn(abn)} · ${entity.registeredState} · Information, not legal advice.`

  return (
    <footer className="mt-11 bg-[var(--quni-navy)]">
      <div className="mx-auto flex max-w-site flex-wrap items-start justify-between gap-7 px-5 py-8 md:px-6">
        <div>
          <span className="font-display text-[length:var(--text-h2-size)] font-bold text-[var(--quni-coral)]">
            Quni
          </span>
          <p className="mt-3 max-w-md font-footer text-[length:var(--text-caption-size)] leading-[var(--text-caption-lh)] text-white/55">
            {legalLine}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3.5 sm:items-end">
          <nav className="flex flex-wrap gap-5" aria-label="Footer">
            {(
              [
                { to: '/privacy', label: 'Privacy Policy' },
                { to: '/terms', label: 'Terms of Service' },
                { to: '/refunds', label: 'Refund Policy' },
                { to: '/about', label: 'About Quni' },
              ] as const
            ).map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="font-footer text-[length:var(--text-caption-size)] font-normal text-white/80 no-underline hover:text-white hover:underline"
              >
                {label}
              </Link>
            ))}
          </nav>
          <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-white/20 bg-[var(--quni-success-bg)] px-2.5 py-1.5 text-[length:var(--text-caption-size)] font-semibold text-[var(--quni-success-fg)]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Verified student marketplace
          </span>
        </div>
      </div>
    </footer>
  )
}

/**
 * Desk-format landlord invite — Preview-gated (`list_your_room_d_enabled`).
 * Does not replace `/list-your-room`, `-b`, or `-c`.
 */
export default function ListYourRoomD() {
  const [previewProperty, setPreviewProperty] = useState<Property | null>(null)

  const loadPreview = useCallback(() => {
    void loadPropertyDetailBySlug(LIST_YOUR_ROOM_D_PREVIEW_SLUG).then((p) => {
      if (p) setPreviewProperty(p)
    })
  }, [])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  return (
    <div className="bg-[var(--quni-surface-1)]">
      <Seo
        title="List your property"
        description="The safest way to rent your spare room to university students. Set your terms, vet pre-screened applicants, and get paid weekly — free to list until you accept."
        canonicalPath="/list-your-room-d"
        noindex
      />

      <div className="mx-auto flex max-w-site flex-col gap-6 px-5 py-6 md:px-6 md:py-8 lg:py-9">
        <h1 className="sr-only">The safest way to rent your spare room to university students.</h1>

        {/* Quinnie desk — wordmark above avatar (letterhead) */}
        <section className="flex max-w-3xl items-center gap-4 rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-1)] px-5 py-5">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <span className="font-display text-[length:var(--text-h3-size)] font-bold leading-none text-[var(--quni-coral)]">
              Quni
            </span>
            <img
              src={QUINNIE_IMG}
              alt="Quinnie Le, co-founder of Quni"
              width={70}
              height={70}
              loading="lazy"
              className="h-20 w-20 rounded-full border border-[var(--quni-line)] object-cover object-[center_16%]"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[length:var(--text-body-size)] leading-[var(--text-body-lh)] text-[var(--quni-ink-2)]">
              <strong className="font-semibold text-[var(--quni-ink)]">Hi, I&apos;m Quinnie.</strong> I built Quni with
              my partner so a spare room is easy money, not a headache. It takes a few minutes to set up, and you can
              message me anytime — you&apos;ll get me, not a bot.
            </p>
            <p className="mt-1.5 text-[length:var(--text-caption-size)] font-semibold leading-[var(--text-caption-lh)] text-[var(--quni-ink-3)]">
              Quinnie Le, co-founder.
            </p>
          </div>
        </section>

        <EarningsStrip />
        <PreviewDesk property={previewProperty} />

        {/* Three content desks — Rob's -c copy */}
        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.05fr]">
          <section className="rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-1)] p-5 md:p-6">
            <h2 className="font-display text-[length:var(--text-h2-size)] font-semibold leading-[var(--text-h2-lh)] text-[var(--quni-ink)] !mt-0 !mb-4">
              Smart tools that save you hours
            </h2>
            <ul className="flex flex-col">
              {SMART_TOOLS.map(({ title, body, Icon }, i) => (
                <li
                  key={title}
                  className={[
                    'flex gap-3 py-2.5',
                    i === 0 ? 'pt-0.5' : 'border-t border-[var(--quni-line)]',
                  ].join(' ')}
                >
                  <span
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-2)] text-[var(--quni-coral-active)]"
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[length:var(--text-body-sm-size)] font-semibold leading-[var(--text-body-sm-lh)] text-[var(--quni-ink)]">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[length:var(--text-caption-size)] leading-[var(--text-caption-lh)] text-[var(--quni-ink-3)]">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-1)] p-5 md:p-6">
            <h2 className="font-display text-[length:var(--text-h2-size)] font-semibold leading-[var(--text-h2-lh)] text-[var(--quni-ink)] !mt-0 !mb-4">
              Safe and Simple
            </h2>
            <div>
              <OfferLineItem
                icon={CHECK_ICON}
                name="Verified renters"
                value="Included"
                description="Students with checked identity (and enrolment where required)."
                valueKind="coralSm"
              />
              <OfferLineItem
                icon={CHECK_ICON}
                name="See them before you pay"
                value="Included"
                description="Full request review before the $99 — accept or decline with no fee."
                valueKind="coralSm"
              />
              <OfferLineItem
                icon={CHECK_ICON}
                name="Your details stay private"
                value="Included"
                description="Email and phone stay masked until you accept."
                valueKind="coralSm"
              />
              <OfferLineItem
                icon={CHECK_ICON}
                name="The paperwork signs itself."
                value="Included"
                description="NSW and QLD tenancy agreements generated and e-signed in-platform."
                valueKind="coralSm"
              />
            </div>
          </section>

          <aside
            id="list-your-room-d-signup"
            className="rounded-[var(--radius-sm)] border border-[var(--quni-ink)] bg-[var(--quni-surface-1)] p-5 md:p-6 md:col-span-2 xl:col-span-1"
          >
            <Signup
              embedLandlordInvite
              embedInviteTitle="List your property"
              embedInviteSub={
                <div className="mt-4">
                  <OfferLineItem
                    icon={HOUSE_ICON}
                    name="Listing fee"
                    value="$99.00"
                    description="One-off, only when you accept a tenant. No subscription."
                    valueKind="coralLg"
                  />
                </div>
              }
            />
          </aside>
        </div>
      </div>

      <PapersFooter />
    </div>
  )
}
