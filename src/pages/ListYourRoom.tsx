import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import {
  SAMPLE_LISTING_AD,
  extractListingFromAd,
  type ExtractedListingPreview,
} from '../lib/extractListingFromAd'
import { LEGAL_ENTITY_NAME, getFallbackLegalEntity } from '../lib/legalEntity'
import { formatAustralianAbn } from '../lib/platformIdentity'

const SIGNUP_LANDLORD = '/signup?role=landlord'

const WHY_POINTS = [
  {
    title: 'Keep your other ads.',
    body: 'Facebook, Flatmates, wherever — Quni is a second free shelf, not a replacement. More shelves, more chance your room fills.',
  },
  {
    title: 'Free to list. $99 once — only when you accept a tenant.',
    body: 'No subscription, no listing fee, nothing before you say yes.',
  },
  {
    title: 'We do the paperwork.',
    body: 'Verified renters, the right state lease, e-signed — you review a shortlist that fits, not a flooded inbox.',
  },
] as const

const TRUST_POINTS = [
  {
    title: 'Every renter is ID- and enrolment-verified',
    body: ' before they ever reach you.',
  },
  {
    title: 'State-compliant leases',
    body: ', signed in-platform. The right agreement for NSW or QLD.',
  },
  {
    title: 'Rent and bond stay yours.',
    body: ' Quni is never in the money chain and never holds your bond.',
  },
] as const

function GoogleMark({ className = 'h-5 w-5 shrink-0' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3 0-5.6-2-6.6-4.8H1.4v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.5a7.2 7.2 0 0 1 0-4.6V6.8H1.4a12 12 0 0 0 0 10.8l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.8l4 3.1C6.4 6.8 9 4.8 12 4.8z"
      />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg
      className="h-[18px] w-[18px] shrink-0 text-[var(--quni-ai)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function PreviewCard({ preview }: { preview: ExtractedListingPreview }) {
  const rent = preview.rentWeekly
  const meta = [preview.suburb, preview.campusHint].filter(Boolean).join(' · ')
  const roomChip = preview.roomType ?? 'Room'
  const highlights =
    preview.highlights.length > 0
      ? preview.highlights
      : ['Details will appear here once we read your ad']

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--quni-line)] bg-white shadow-sm">
      <div className="relative h-[150px] bg-[var(--quni-surface-2)]">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 320 150"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <rect width="320" height="150" fill="#F1E6D4" />
          <rect y="104" width="320" height="46" fill="#E7D5B9" />
          <rect x="196" y="26" width="96" height="60" rx="6" fill="#CBE3F2" stroke="#FFFDF6" strokeWidth="5" />
          <rect x="28" y="70" width="120" height="34" rx="6" fill="#FF8A7A" />
          <rect x="28" y="60" width="120" height="14" rx="6" fill="#FFF4E6" />
        </svg>
        <span className="absolute bottom-2 right-2 inline-flex items-center rounded-md border border-[var(--quni-trust-soft)] bg-[var(--quni-trust-bg)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--quni-trust)]">
          Preview
        </span>
      </div>
      <div className="px-3.5 pb-3.5 pt-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[22px] font-bold tabular-nums text-[var(--quni-ink)]">
            {rent != null ? (
              <>
                ${rent} <span className="text-[13px] font-semibold text-[var(--quni-ink-4)]">/wk</span>
              </>
            ) : (
              <span className="text-base font-semibold text-[var(--quni-ink-4)]">Rent from your ad</span>
            )}
          </span>
          <span className="inline-block rounded-md border border-[var(--quni-line)] px-2 py-0.5 text-[11px] font-semibold text-[var(--quni-ink-2)]">
            {roomChip}
          </span>
        </div>
        {meta ? <p className="mt-1.5 text-[13px] text-[var(--quni-ink-4)]">{meta}</p> : null}
        <ul className="mt-3 space-y-1.5 border-t border-[var(--quni-line)] pt-2.5">
          {highlights.map((line) => (
            <li key={line} className="flex items-start gap-2 text-[13px] text-[var(--quni-ink-2)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--quni-trust)]" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function ListYourRoom() {
  const adFieldId = useId()
  const previewRef = useRef<HTMLDivElement>(null)
  const [adText, setAdText] = useState('')
  const [preview, setPreview] = useState<ExtractedListingPreview | null>(null)
  const [building, setBuilding] = useState(false)
  const [buildError, setBuildError] = useState<string | null>(null)

  const entity = getFallbackLegalEntity()
  const abnSegment = entity.abn.trim() ? ` · ABN ${formatAustralianAbn(entity.abn)}` : ''
  const legalLine = `${entity.legalName.trim() || LEGAL_ENTITY_NAME} t/a Quni Living${abnSegment} · ${entity.registeredSuburb}, ${entity.registeredState}`

  async function buildListing(fromText?: string) {
    const text = (fromText ?? adText).trim()
    setBuildError(null)
    if (!text) {
      setBuildError('Paste your ad text first.')
      return
    }

    setBuilding(true)
    let next: ExtractedListingPreview = extractListingFromAd(text)

    try {
      const res = await fetch('/api/ai/extract-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (res.ok) {
        const data = (await res.json()) as { preview?: ExtractedListingPreview }
        if (data.preview && typeof data.preview.echo === 'string') {
          next = data.preview
        }
      }
      // TODO: wire Anthropic extraction in api/ai/extract-listing — heuristic is enough for preview.
    } catch {
      // Client heuristic already applied — endpoint is additive.
    } finally {
      setBuilding(false)
    }

    setPreview(next)
    requestAnimationFrame(() => {
      previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  function trySample() {
    setAdText(SAMPLE_LISTING_AD)
    void buildListing(SAMPLE_LISTING_AD)
  }

  return (
    <div className="bg-[var(--quni-surface-1)]">
      <Seo
        title="List your room"
        description="Add your room to Quni in about a minute. Keep your other ads — list free, pay $99 only when you place a tenant."
        canonicalPath="/list-your-room"
      />

      {/* Hero */}
      <section className="border-b border-[var(--quni-line)] px-6 pb-8 pt-10 sm:pt-12">
        <div className="mx-auto max-w-3xl">
          <span className="inline-block rounded-md border border-[var(--quni-line)] bg-[var(--quni-surface-2)] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--quni-ink)]">
            For landlords
          </span>
          <h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-[var(--quni-ink)] sm:text-4xl !mt-4 !mb-0 leading-tight">
            Add your room to Quni — in about a minute.
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--quni-ink-3)] sm:text-[16px]">
            You&apos;re already advertising it on Facebook. Keep that ad — just add Quni as a{' '}
            <strong className="font-semibold text-[var(--quni-ink)]">second, free shelf</strong>. More places your room
            shows, more chance it fills. You only pay{' '}
            <strong className="font-semibold text-[var(--quni-ink)]">$99 when you actually place a tenant</strong>, never
            before.
          </p>
        </div>
      </section>

      {/* Paste + preview */}
      <section className="px-6 py-8 sm:py-10">
        <div className="mx-auto max-w-3xl">
          <div className="quni-card border-[var(--quni-ink)]/20 p-5 sm:p-6">
            <div className="mb-2 flex items-center gap-2">
              <SparkIcon />
              <h2 className="text-[15px] font-semibold text-[var(--quni-ink)] !m-0">Start with the ad you already wrote</h2>
            </div>
            <p className="mb-3 text-[13px] text-[var(--quni-ink-4)]">
              Paste your Facebook, Flatmates or Gumtree ad. We&apos;ll build your Quni listing from it — you check it
              before anything goes live.
            </p>
            <label htmlFor={adFieldId} className="sr-only">
              Paste your listing ad
            </label>
            <textarea
              id={adFieldId}
              value={adText}
              onChange={(e) => setAdText(e.target.value)}
              rows={5}
              placeholder="Paste your listing text here…"
              className="w-full resize-y rounded-lg border border-[var(--quni-input-border)] bg-[var(--quni-surface-2)] px-3.5 py-3 text-sm leading-relaxed text-[var(--quni-ink-2)] placeholder:text-[var(--quni-ink-5)] focus:border-[var(--quni-coral)] focus:outline-none focus:ring-2 focus:ring-admin-coral/35"
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                disabled={building}
                onClick={() => void buildListing()}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--quni-coral)] px-5 py-3 text-[15px] font-bold text-white transition-colors hover:bg-[var(--quni-coral-hover)] focus:outline-none focus:ring-2 focus:ring-admin-coral/40 focus:ring-offset-2 disabled:opacity-60"
              >
                {building ? 'Building…' : 'Build my listing'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={trySample}
                className="text-[13px] font-semibold text-[var(--quni-coral-active)] underline-offset-2 hover:underline"
              >
                Try it with a sample ad
              </button>
              <span className="text-[13px] text-[var(--quni-ink-4)]">Nothing goes live until you approve it.</span>
            </div>
            {buildError ? (
              <p className="mt-2 text-sm text-red-700" role="alert">
                {buildError}
              </p>
            ) : null}

            {preview ? (
              <div ref={previewRef} className="mt-5 scroll-mt-24" aria-live="polite">
                <div className="grid gap-4 md:grid-cols-[1fr_minmax(0,280px)] md:items-start">
                  <div className="rounded-lg border border-dashed border-[var(--quni-line)] bg-[var(--quni-surface-2)] p-3.5 text-[13px] leading-relaxed text-[var(--quni-ink-4)]">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--quni-ink-4)]">
                      From your ad
                    </span>
                    {preview.echo}
                  </div>
                  <div>
                    <PreviewCard preview={preview} />
                    <p className="mt-3 text-[13px] text-[var(--quni-ink-4)]">
                      Green dots are pulled straight from your ad. Every field is yours to edit before it&apos;s live.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Why add Quni */}
      <section className="px-6 pb-8 sm:pb-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl bg-[var(--quni-navy)] px-6 py-7 text-[#F3EFE9] sm:px-8 sm:py-8">
            <span className="inline-block rounded-md border border-white/20 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#C9C0B4]">
              What adding Quni actually means
            </span>
            <h2 className="font-display mt-3.5 text-xl font-bold text-white sm:text-2xl !mt-3.5 !mb-0">
              Keep everything you&apos;re doing. Just add one more.
            </h2>
            <ul className="mt-4">
              {WHY_POINTS.map((point) => (
                <li
                  key={point.title}
                  className="flex gap-2.5 border-t border-white/10 py-3 first:border-t-0 first:pt-0 last:pb-0"
                >
                  <CheckIcon className="mt-0.5 shrink-0 text-[#C9C0B4]" />
                  <p className="text-[14.5px] leading-relaxed text-[#DED7CC]">
                    <strong className="font-semibold text-white">{point.title}</strong> {point.body}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3.5 text-xs text-[#9C9488]">
              You&apos;re getting this because you&apos;re advertising a room right now. This is just the fast way to
              add it.
            </p>
          </div>
        </div>
      </section>

      {/* Trust + Commit */}
      <section className="border-t border-[var(--quni-line)] bg-[var(--quni-surface-2)] px-6 py-10 sm:py-12">
        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2 md:items-start">
          <div className="rounded-xl border border-[var(--quni-trust-soft)] bg-[var(--quni-trust-bg)] p-6">
            <span className="inline-block rounded-md border border-[var(--quni-trust-soft)] bg-white/60 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--quni-trust)]">
              Why it&apos;s safe
            </span>
            <ul className="mt-1">
              {TRUST_POINTS.map((point) => (
                <li key={point.title} className="mt-3.5 flex gap-2.5">
                  <span className="mt-0.5 shrink-0 text-[var(--quni-trust)]">
                    <ShieldCheckIcon />
                  </span>
                  <p className="text-[14.5px] leading-relaxed text-[#2E4636]">
                    <strong className="font-semibold text-[var(--quni-trust)]">{point.title}</strong>
                    {point.body}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-[var(--quni-trust-soft)] pt-3 text-xs text-[#4C6553]">{legalLine}</p>
          </div>

          <div className="quni-card border-[var(--quni-ink)]/25 p-6">
            <h2 className="font-display text-xl font-bold text-[var(--quni-ink)] sm:text-2xl !mt-0 !mb-1">
              Publish your listing
            </h2>
            <p className="mb-4 text-xs text-[var(--quni-ink-4)]">
              You&apos;re joining as a landlord — no forms to sort, we already know.
            </p>
            <Link
              to={SIGNUP_LANDLORD}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-[var(--quni-line)] bg-white px-4 py-3.5 text-[15px] font-semibold text-[var(--quni-ink)] transition-colors hover:border-[var(--quni-ink)] focus:outline-none focus:ring-2 focus:ring-admin-coral/35 focus:ring-offset-2"
            >
              <GoogleMark />
              Continue with Google to publish
            </Link>
            <Link
              to={SIGNUP_LANDLORD}
              className="mt-2.5 flex w-full items-center justify-center rounded-lg border border-[var(--quni-line)] bg-transparent px-4 py-3 text-[15px] font-semibold text-[var(--quni-ink)] transition-colors hover:border-[var(--quni-ink)] focus:outline-none focus:ring-2 focus:ring-admin-coral/35 focus:ring-offset-2"
            >
              Continue with email
            </Link>
            <p className="mt-3 text-center text-xs leading-relaxed text-[var(--quni-ink-4)]">
              By continuing you agree to Quni&apos;s{' '}
              <Link to="/terms" className="font-semibold text-[var(--quni-coral-active)] hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link
                to="/landlord-service-agreement"
                className="font-semibold text-[var(--quni-coral-active)] hover:underline"
              >
                Landlord Service Agreement
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
