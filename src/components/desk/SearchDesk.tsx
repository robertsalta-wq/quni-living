import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { firstPropertyImageUrl } from '../../lib/propertyImages'
import { deskIntentToPath, parseDeskIntent } from '../../lib/deskIntent'
import { ROOM_TYPE_SHORT_LABELS, isRoomType, type Property } from '../../lib/listings'

const UNI_OPTIONS = [
  { value: 'all', label: 'All universities' },
  { value: 'usyd', label: 'University of Sydney', q: 'University of Sydney' },
  { value: 'unsw', label: 'UNSW Sydney', q: 'UNSW' },
  { value: 'uts', label: 'UTS', q: 'UTS' },
  { value: 'mq', label: 'Macquarie University', q: 'Macquarie' },
  { value: 'wsu', label: 'Western Sydney University', q: 'Western Sydney' },
  { value: 'acu', label: 'Australian Catholic University', q: 'ACU' },
  { value: 'und', label: 'Notre Dame Sydney', q: 'Notre Dame' },
] as const

type SearchDeskProps = {
  listings: Property[]
  listingCount: number | null
  activityLine: string
  uniCoverage: { label: string; homes: number }[]
  className?: string
  compact?: boolean
}

function FactHeadline({ text }: { text: string }) {
  const parts = useMemo(() => {
    return text.split(/(\d[\d,]*)/).map((t, i) =>
      /^\d/.test(t)
        ? { t, coral: true, key: `n-${i}` }
        : { t, coral: false, key: `t-${i}` },
    )
  }, [text])

  return (
    <p className="m-0 max-w-[440px] font-[family-name:var(--font-serif)] text-[30px] font-bold leading-[1.14] tracking-[-0.01em] text-[var(--quni-ink)]">
      {parts.map((p) => (
        <span key={p.key} className={p.coral ? 'text-[var(--quni-coral)]' : undefined}>
          {p.t}
        </span>
      ))}
    </p>
  )
}

function listingTag(p: Property): string {
  const rt = p.room_type
  if (rt && isRoomType(rt)) return ROOM_TYPE_SHORT_LABELS[rt]
  return 'Room'
}

/** Grand cream search desk — intent field, filters, live listing cards. */
export default function SearchDesk({
  listings,
  listingCount,
  activityLine,
  uniCoverage,
  className = '',
  compact = false,
}: SearchDeskProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [uniSel, setUniSel] = useState('all')
  const [furnished, setFurnished] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [roomType, setRoomType] = useState('all')
  const [rentBand, setRentBand] = useState('any')
  const [moveIn, setMoveIn] = useState('')
  const [moveOut, setMoveOut] = useState('')
  const [leaseLen, setLeaseLen] = useState('open')
  const [marketOpen, setMarketOpen] = useState(false)

  const headline =
    listingCount != null && listingCount > 0
      ? `${listingCount} verified home${listingCount === 1 ? '' : 's'} near campus — every listing checked`
      : 'Verified rooms near campus — paperwork done'

  const preview = listings.slice(0, compact ? 2 : 3)

  function buildListingsPath(): string {
    const intent = parseDeskIntent(query)
    if (intent.kind !== 'listings') return deskIntentToPath(intent)

    const params = intent.params
    const uni = UNI_OPTIONS.find((u) => u.value === uniSel)
    if (uni && uni.value !== 'all' && 'q' in uni && uni.q) {
      if (!params.get('q')) params.set('q', uni.q)
    }
    if (furnished) params.set('furnished', '1')
    if (roomType !== 'all') params.set('property_type', roomType)
    if (rentBand === 'u300') params.set('max_rent', '300')
    if (rentBand === 'u400') params.set('max_rent', '400')
    if (rentBand === 'u500') params.set('max_rent', '500')
    if (rentBand === 'p500') params.set('min_rent', '500')
    if (moveIn.trim()) params.set('available_from', moveIn.trim())
    if (moveOut.trim()) params.set('available_to', moveOut.trim())
    if (leaseLen !== 'open') params.set('lease_length', leaseLen)

    const qs = params.toString()
    return qs ? `/listings?${qs}` : '/listings'
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const intent = parseDeskIntent(query)
    if (intent.kind === 'landlord' || intent.kind === 'university') {
      navigate(deskIntentToPath(intent))
      return
    }
    navigate(buildListingsPath())
  }

  const chipBase =
    'rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors duration-[120ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]'
  const furnishedChip = furnished
    ? `${chipBase} border border-[var(--quni-coral-border)] bg-[var(--quni-coral-tint)] text-[var(--quni-coral-active)]`
    : `${chipBase} border border-[var(--quni-line)] bg-white text-[var(--quni-ink-3)]`
  const filtersChip = filtersOpen
    ? `${chipBase} border border-dashed border-[var(--quni-coral-border)] bg-[var(--quni-coral-tint)] text-[var(--quni-coral-active)]`
    : `${chipBase} border border-dashed border-[var(--quni-ink-5)] bg-transparent text-[var(--quni-ink-4)]`

  return (
    <article
      className={[
        'desk-shell desk-settle relative flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-lg)]',
        'border border-[var(--quni-cream-border)] bg-[var(--quni-cream)] shadow-[var(--shadow-1)]',
        'transition-shadow duration-[var(--dur-base)] ease-[var(--ease-standard)] hover:shadow-[var(--shadow-2)]',
        '[contain:layout_paint] [animation-delay:50ms]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!compact ? (
        <div
          aria-hidden
          className="pointer-events-none absolute top-16 right-6 z-[4] flex h-[104px] w-[104px] rotate-[8deg] flex-col items-center justify-center gap-px rounded-full border-2 border-dashed border-[var(--quni-success)] bg-[var(--quni-success-bg)] text-center shadow-[var(--shadow-1)]"
        >
          <span className="font-[family-name:var(--font-serif)] text-[21px] font-bold leading-none tracking-[0.02em] text-[var(--quni-success-strong)]">
            FREE
          </span>
          <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--quni-success)]">
            for renters
          </span>
          <span className="mt-0.5 text-[8.5px] tracking-[0.02em] text-[var(--quni-success-strong)]">
            search → lease
          </span>
        </div>
      ) : null}

      <div
        className={[
          'flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto',
          compact ? 'p-3.5' : 'p-6',
        ].join(' ')}
      >
        <div className="flex flex-col gap-2">
          <Link to="/" className="inline-flex w-fit" aria-label="Quni home">
            <img
              src="/quni-logo.png"
              srcSet="/quni-logo.png 1x, /quni-logo@2x.png 2x"
              alt=""
              width={118}
              height={26}
              className="h-[26px] w-auto"
            />
          </Link>
          <FactHeadline text={compact ? headline.replace(' — every listing checked', '') : headline} />
          {!compact ? (
            <p className="m-0 max-w-[400px] text-[13.5px] text-[var(--quni-ink-4)]">
              Verified rooms & homes near Sydney&apos;s campuses — for students and professionals.
            </p>
          ) : (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-[rgba(29,158,117,0.5)] bg-[var(--quni-success-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--quni-success-strong)]">
              FREE for renters — search → lease
            </span>
          )}
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <div className="flex gap-2.5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suburb — or just tell Quni what you need…"
              aria-label="Search intent"
              className={[
                'min-w-0 flex-1 border border-[var(--quni-line)] bg-white px-4 py-3 text-[15px] text-[var(--quni-ink)] outline-none',
                'focus:border-[var(--quni-coral)] focus:shadow-[var(--shadow-focus)]',
                compact ? 'rounded-full py-2.5 text-[13px]' : 'rounded-[10px]',
              ].join(' ')}
            />
            <button
              type="submit"
              className={[
                'inline-flex items-center gap-2 bg-[var(--quni-coral)] px-6 py-3 text-[15px] font-semibold text-white transition-colors duration-[120ms] hover:bg-[var(--quni-coral-hover)]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]',
                compact ? 'rounded-full px-4 py-2.5 text-[13px] font-bold' : 'rounded-[10px]',
              ].join(' ')}
            >
              Search
            </button>
          </div>
          {!compact ? (
            <div className="flex items-center gap-1.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--quni-success)" strokeWidth="2.6" aria-hidden>
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[12.5px] font-medium text-[var(--quni-success-strong)]">
                Free for renters — from search to signed lease.
              </span>
            </div>
          ) : null}
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={uniSel}
            onChange={(e) => setUniSel(e.target.value)}
            aria-label="University"
            className="cursor-pointer rounded-[10px] border border-[var(--quni-line)] bg-white px-3 py-2 text-[13px] text-[var(--quni-ink)] outline-none"
          >
            {UNI_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
          <button type="button" className={furnishedChip} onClick={() => setFurnished((v) => !v)}>
            Furnished
          </button>
          <button type="button" className={filtersChip} onClick={() => setFiltersOpen((v) => !v)}>
            {filtersOpen ? '⊖ Fewer filters' : '⊕ All filters'}
          </button>
        </div>

        {filtersOpen ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-ink-5)]">
                Room type
              </span>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="rounded-[10px] border border-[var(--quni-line)] bg-white px-3 py-2.5 text-sm"
              >
                <option value="all">All types</option>
                <option value="private">Private room</option>
                <option value="studio">Studio</option>
                <option value="whole">Whole home</option>
                <option value="share">Share house</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-ink-5)]">
                Weekly rent
              </span>
              <select
                value={rentBand}
                onChange={(e) => setRentBand(e.target.value)}
                className="rounded-[10px] border border-[var(--quni-line)] bg-white px-3 py-2.5 text-sm"
              >
                <option value="any">Any price</option>
                <option value="u300">Under $300</option>
                <option value="u400">Under $400</option>
                <option value="u500">Under $500</option>
                <option value="p500">$500+</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-ink-5)]">
                Move-in date
              </span>
              <input
                value={moveIn}
                onChange={(e) => setMoveIn(e.target.value)}
                placeholder="dd/mm/yyyy"
                className="rounded-[10px] border border-[var(--quni-line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--quni-coral)]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-ink-5)]">
                Move-out date <span className="font-medium normal-case tracking-normal">(optional)</span>
              </span>
              <input
                value={moveOut}
                onChange={(e) => setMoveOut(e.target.value)}
                placeholder="dd/mm/yyyy"
                className="rounded-[10px] border border-[var(--quni-line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--quni-coral)]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-ink-5)]">
                Or lease length
              </span>
              <select
                value={leaseLen}
                onChange={(e) => setLeaseLen(e.target.value)}
                className="rounded-[10px] border border-[var(--quni-line)] bg-white px-3 py-2.5 text-sm"
              >
                <option value="open">Open-ended</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
                <option value="sem">Semester</option>
              </select>
            </label>
            <p className="m-0 self-end text-xs leading-relaxed text-[var(--quni-ink-4)] sm:col-span-2">
              With dates set, listings show whether each property is free for that window. Unavailable
              homes stay visible so you can tweak dates.
            </p>
          </div>
        ) : (
          <div
            className={[
              'grid min-h-[120px] gap-3',
              compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3',
            ].join(' ')}
          >
            {preview.length === 0 ? (
              <p className="col-span-full m-0 rounded-xl border border-[var(--quni-line)] bg-white px-4 py-6 text-sm text-[var(--quni-ink-4)]">
                Live listings will appear here as they are published.
              </p>
            ) : (
              preview.map((p) => {
                const img = firstPropertyImageUrl(p.images)
                const to = p.slug ? `/listings/${p.slug}` : '/listings'
                return (
                  <Link
                    key={p.id}
                    to={to}
                    className="group flex flex-col overflow-hidden rounded-xl border border-[var(--quni-line)] bg-white shadow-[var(--shadow-1)] transition-[transform,box-shadow] duration-[var(--dur-base)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
                  >
                    <div
                      className="relative h-[88px] bg-[var(--quni-surface-3)] bg-cover bg-center"
                      style={img ? { backgroundImage: `url(${img})` } : undefined}
                    >
                      <span className="absolute right-1.5 bottom-1.5 rotate-[-7deg] rounded border-[1.5px] border-[rgba(15,110,86,0.6)] bg-white/85 px-1.5 py-0.5 text-[8px] font-extrabold tracking-[0.1em] text-[var(--quni-success-strong)]">
                        ✓ VERIFIED
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 px-3.5 py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span>
                          <span className="font-[family-name:var(--font-serif)] text-[19px] font-bold text-[var(--quni-ink)]">
                            ${p.rent_per_week}
                          </span>
                          <span className="text-[11px] text-[var(--quni-ink-4)]"> /wk</span>
                        </span>
                        <span className="rounded-full bg-[var(--quni-navy-tint)] px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-[var(--quni-navy)]">
                          {listingTag(p)}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--quni-ink-4)]">
                        {p.suburb || 'Sydney'}
                        {p.universities?.name ? ` · ${p.universities.name}` : ''}
                      </span>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        )}

        <div className="mt-0.5 flex flex-wrap items-center gap-3">
          <Link
            to={buildListingsPath()}
            className="text-[13px] font-semibold text-[var(--quni-ink-3)] hover:text-[var(--quni-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
          >
            Browse all listings →
          </Link>
          {!compact ? (
            <button
              type="button"
              onClick={() => setMarketOpen((v) => !v)}
              className="rounded-full border border-[var(--quni-line)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--quni-ink-3)] hover:bg-[var(--quni-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
            >
              {marketOpen ? '⊖ Close' : '⊕ Live market'}
            </button>
          ) : null}
          <span className="ml-auto text-xs text-[var(--quni-ink-5)]">{activityLine}</span>
        </div>

        {marketOpen && !compact ? (
          <div className="mt-1 flex flex-col gap-2.5 border-t border-[var(--quni-line)] pt-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-ink-5)]">
              Live market · homes by university
            </span>
            {uniCoverage.length === 0 ? (
              <p className="m-0 text-xs text-[var(--quni-ink-4)]">Coverage grows as listings go live.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {uniCoverage.map((c) => {
                  const max = Math.max(...uniCoverage.map((x) => x.homes), 1)
                  const pct = Math.round((c.homes / max) * 100)
                  return (
                    <div key={c.label} className="flex items-center gap-2.5">
                      <span className="w-[88px] text-xs font-semibold whitespace-nowrap text-[var(--quni-ink)]">
                        {c.label}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--quni-surface-3)]">
                        <div
                          className="h-full rounded-full bg-[var(--quni-navy)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-[90px] text-right text-xs whitespace-nowrap text-[var(--quni-ink-4)]">
                        {c.homes} home{c.homes === 1 ? '' : 's'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </article>
  )
}
