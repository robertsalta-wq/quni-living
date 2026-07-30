import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Banknote, FilePenLine, MessageSquareText, SpellCheck, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import ListYourRoomDPreviewDrawer, {
  ListYourRoomDPreviewRail,
  type ListYourRoomDPreviewMode,
} from '../components/listYourRoom/ListYourRoomDPreviewDrawer'
import ListYourRoomDSignupSheet from '../components/listYourRoom/ListYourRoomDSignupSheet'
import { QuniLogoHomeLink } from '../components/SiteBrandLockup'
import { LegalDocumentModal } from '../components/legal/LegalDocumentModal'
import Seo from '../components/Seo'
import {
  LIST_YOUR_ROOM_D_CAMPUSES,
  LIST_YOUR_ROOM_D_PREVIEW_SLUG,
  type ListYourRoomDRoomKind,
} from '../lib/listYourRoomDCampuses'
import { LEGAL_ENTITY_NAME, getFallbackLegalEntity } from '../lib/legalEntity'
import type { Property } from '../lib/listings'
import { formatAustralianAbn } from '../lib/platformIdentity'
import { loadPropertyDetailBySlug } from '../lib/propertyDetailCache'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'

const QUINNIE_IMG = '/landlord-invite/quinnie.jpg'
const INVITE_ABN_FALLBACK = '65675990968'

type ActiveOverlay = 'preview' | 'signup' | 'verification' | null

type SmartTool = {
  title: string
  body: string
  Icon: LucideIcon
}

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

const SAFE_ITEMS = [
  {
    name: 'Verified renters',
    description: 'Students with checked identity (and enrolment where required).',
  },
  {
    name: 'See them before you pay',
    description: 'Full request review before the $99 — accept or decline with no fee.',
  },
  {
    name: 'Your details stay private',
    description: 'Email and phone stay masked until you accept.',
  },
  {
    name: 'The paperwork signs itself',
    description: 'NSW and QLD tenancy agreements generated and e-signed in-platform.',
  },
] as const

type RentGuideOk = {
  low: number
  high: number
  framing: 'campus_listings' | 'typical_nsw'
  caveat: string
}

type RentGuideState =
  | { status: 'idle' | 'loading' }
  | { status: 'ok'; data: RentGuideOk }
  | { status: 'empty' | 'error'; message: string }

function TrustTick() {
  return (
    <svg
      className="mt-1 h-4 w-4 shrink-0 text-[var(--quni-trust)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function EarningsCard() {
  const selectId = useId()
  const [campusId, setCampusId] = useState(LIST_YOUR_ROOM_D_CAMPUSES[0].id)
  const [roomKind, setRoomKind] = useState<ListYourRoomDRoomKind>('single')
  const [guide, setGuide] = useState<RentGuideState>({ status: 'idle' })
  const campus = LIST_YOUR_ROOM_D_CAMPUSES.find((item) => item.id === campusId) ?? LIST_YOUR_ROOM_D_CAMPUSES[0]

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch(
          `/api/invite-rent-guide?campus_id=${encodeURIComponent(campusId)}&room_type=${encodeURIComponent(roomKind)}`,
        )
        const body = (await response.json().catch(() => null)) as
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
        if (!response.ok) {
          setGuide({ status: 'error', message: body?.message || body?.error || 'Could not load the rent guide.' })
          return
        }
        if (body?.framing === 'unavailable' || body?.error === 'no_data') {
          setGuide({ status: 'empty', message: body.message || 'Not enough live listings to show a range yet.' })
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

        const nextGuide: RentGuideOk = {
          low: body.low,
          high: body.high,
          framing: body.framing,
          caveat: body.caveat,
        }
        setGuide({ status: 'ok', data: nextGuide })
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
      className="rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-1)] p-4"
      aria-labelledby="lyrd-earnings-title"
    >
      <div className="flex flex-wrap items-center gap-3 md:flex-nowrap">
        <span className="rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-2)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--quni-ink)]">
          What could it earn?
        </span>
        <h2 id="lyrd-earnings-title" className="font-display text-xl font-semibold text-[var(--quni-ink)]">
          See the going rate before you list.
        </h2>
      </div>

      <div className="mt-3 grid items-center gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm text-[var(--quni-ink-3)]">
            Pick the campus your room is near — we&apos;ll show what similar rooms are renting for right now.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <label htmlFor={selectId} className="sr-only">
              Nearest university
            </label>
            <select
              id={selectId}
              value={campusId}
              onChange={(event) => {
                setGuide({ status: 'loading' })
                setCampusId(event.target.value)
              }}
              className="min-w-0 basis-64 flex-1 rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-1)] px-3 py-2 text-sm font-medium text-[var(--quni-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
            >
              {LIST_YOUR_ROOM_D_CAMPUSES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.selectLabel}
                </option>
              ))}
            </select>
            <div
              className="inline-flex overflow-hidden rounded-[var(--radius-sm)] border border-[var(--quni-line)]"
              role="group"
              aria-label="Room type"
            >
              {(['single', 'ensuite'] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={roomKind === kind}
                  onClick={() => {
                    setGuide({ status: 'loading' })
                    setRoomKind(kind)
                  }}
                  className={[
                    'whitespace-nowrap px-3 py-2 text-sm font-semibold transition-colors duration-[var(--dur-base)] ease-[var(--ease-standard)]',
                    roomKind === kind
                      ? 'bg-[var(--quni-ink)] text-white'
                      : 'bg-[var(--quni-surface-1)] text-[var(--quni-ink-3)] hover:bg-[var(--quni-surface-2)]',
                  ].join(' ')}
                >
                  {kind === 'single' ? 'Single room' : 'Ensuite'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--quni-line)] pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
          {guide.status === 'ok' ? (
            <>
              <p className="text-sm text-[var(--quni-ink-3)]">
                Rooms near {campus.label} {guide.data.framing === 'typical_nsw' ? 'typically ' : ''}rent for
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-[var(--quni-ink)]">
                ${guide.data.low}&ndash;${guide.data.high}
                <span className="ml-1 text-sm font-semibold text-[var(--quni-ink-3)]">/wk</span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--quni-ink-3)]">{guide.data.caveat}</p>
            </>
          ) : guide.status === 'loading' || guide.status === 'idle' ? (
            <p className="text-sm font-semibold text-[var(--quni-ink-3)]">Loading the live guide…</p>
          ) : guide.status === 'empty' || guide.status === 'error' ? (
            <p className="text-sm text-[var(--quni-ink-3)]">{guide.message}</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function QuinnieBand() {
  return (
    <section className="border-b border-[var(--quni-line)] pb-5">
      <div className="flex items-start justify-between gap-3 md:items-baseline">
        <div className="flex min-w-0 flex-col items-start gap-2 md:flex-row md:items-baseline md:gap-3">
          <QuniLogoHomeLink />
          <h1 className="m-0 min-w-0 font-lora text-xl font-semibold leading-tight text-[var(--quni-ink)] md:text-2xl">
            The <span className="text-[var(--quni-coral-active)]">safest way</span> to rent your spare room to university
            students.
          </h1>
        </div>
        <Link
          to="/login"
          className="shrink-0 text-sm font-semibold text-[var(--quni-ink-3)] hover:text-[var(--quni-ink)]"
        >
          Log in
        </Link>
      </div>
      <div className="mt-3 flow-root md:flex md:items-start md:gap-3">
        <img
          src={QUINNIE_IMG}
          alt="Quinnie Le, co-founder of Quni"
          width={72}
          height={72}
          className="lyrd-quinnie-thumbnail float-left mb-2 mr-3 shrink-0 rounded-full border border-[var(--quni-line)] object-cover object-top md:float-none md:m-0"
        />
        <div className="min-w-0">
          <p className="text-sm leading-relaxed text-[var(--quni-ink-2)]">
            <strong className="font-semibold text-[var(--quni-ink)]">Hi, I&apos;m Quinnie.</strong> I built Quni with
            my partner so a spare room is easy money, not a headache. It takes a few minutes to set up, and you can
            message me anytime — you&apos;ll get me, not a bot.
          </p>
          <p className="mt-1 clear-both text-xs font-semibold text-[var(--quni-ink-3)] md:clear-none">
            Quinnie Le, co-founder.
          </p>
        </div>
      </div>
    </section>
  )
}

function SmartToolsPanel() {
  return (
    <section className="px-1 py-5">
      <h2 className="font-display text-xl font-semibold text-[var(--quni-ink)]">Smart tools that save you hours</h2>
      <ul className="mt-4">
        {SMART_TOOLS.map(({ title, body, Icon }, index) => (
          <li
            key={title}
            className={['flex gap-3 py-3', index === 0 ? 'pt-0' : 'border-t border-[var(--quni-line)]'].join(' ')}
          >
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-2)] text-[var(--quni-coral-active)]"
              aria-hidden
            >
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--quni-ink)]">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--quni-ink-3)]">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TrustPanel({ onOpenVerification }: { onOpenVerification: (opener: HTMLElement) => void }) {
  return (
    <section className="rounded-[var(--radius-sm)] border border-[var(--quni-trust-soft)] bg-[var(--quni-trust-bg)] p-5">
      <span className="rounded-[var(--radius-sm)] border border-[var(--quni-trust-soft)] bg-[var(--quni-surface-1)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--quni-trust)]">
        Safe and simple
      </span>
      <ul className="mt-3">
        {SAFE_ITEMS.map((item) => (
          <li key={item.name} className="flex gap-3 py-2">
            <TrustTick />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[var(--quni-trust)]">{item.name}</p>
                <span className="ml-auto text-xs font-semibold text-[var(--quni-trust)]">Included</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--quni-trust)]">{item.description}</p>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={(event) => onOpenVerification(event.currentTarget)}
        className="mt-2 text-sm font-semibold text-[var(--quni-trust)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-trust)]"
      >
        How verification works →
      </button>
    </section>
  )
}

const VERIFICATION_STEPS = [
  {
    title: 'Identity checked',
    body: 'Every renter verifies their identity before they can enquire, so there are no anonymous messages.',
  },
  {
    title: 'Enrolment confirmed',
    body: 'Where a listing is student-only, we confirm current university enrolment.',
  },
  {
    title: 'Every listing reviewed',
    body: 'Each room is checked before it goes live, so what students see is real.',
  },
] as const

function VerificationExplainerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <LegalDocumentModal
      open={open}
      onClose={onClose}
      title="How verification works"
      subtitle="Verification is handled inside Quni."
    >
      <ul>
        {VERIFICATION_STEPS.map((step, index) => (
          <li
            key={step.title}
            className={['flex gap-3 py-3', index === 0 ? '' : 'border-t border-[var(--quni-line)]'].join(' ')}
          >
            <TrustTick />
            <div>
              <p className="text-sm font-semibold text-[var(--quni-ink)]">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--quni-ink-3)]">{step.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </LegalDocumentModal>
  )
}

function PapersFooter() {
  const entity = getFallbackLegalEntity()
  const abn = entity.abn.trim() || INVITE_ABN_FALLBACK
  const legalName = entity.legalName.trim() || LEGAL_ENTITY_NAME

  return (
    <footer className="mt-5 flex flex-col items-stretch gap-3 border-t border-[var(--quni-line)] px-1 pb-1 pt-4">
      <p className="w-full font-footer text-xs text-[var(--quni-ink-3)]">
        {legalName} t/a Quni Living
        <span className="block md:inline">
          <span className="hidden md:inline"> · </span>ABN {formatAustralianAbn(abn)}
        </span>
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-4 text-xs font-medium text-[var(--quni-ink-3)]" aria-label="Footer">
          <Link to="/privacy" className="hover:text-[var(--quni-ink)] hover:underline">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-[var(--quni-ink)] hover:underline">
            Terms
          </Link>
          <Link to="/refunds" className="hover:text-[var(--quni-ink)] hover:underline">
            Refunds
          </Link>
          <Link to="/about" className="hover:text-[var(--quni-ink)] hover:underline">
            About
          </Link>
        </nav>
        <span className="rounded-[var(--radius-sm)] border border-[var(--quni-trust-soft)] bg-[var(--quni-trust-bg)] px-2 py-1 text-xs font-semibold text-[var(--quni-trust)]">
          ✓ Verified marketplace
        </span>
      </div>
    </footer>
  )
}

export default function ListYourRoomD() {
  const previewDialogRef = useRef<HTMLDialogElement>(null)
  const lastOpenerRef = useRef<HTMLElement | null>(null)
  const hadOverlayRef = useRef(false)
  const [property, setProperty] = useState<Property | null>(null)
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null)
  const [previewMode, setPreviewMode] = useState<ListYourRoomDPreviewMode>('listing')

  const loadPreview = useCallback(() => {
    void loadPropertyDetailBySlug(LIST_YOUR_ROOM_D_PREVIEW_SLUG).then((nextProperty) => {
      if (nextProperty) setProperty(nextProperty)
    })
  }, [])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  useEffect(() => {
    if (activeOverlay) {
      hadOverlayRef.current = true
      return
    }
    if (hadOverlayRef.current) {
      const frame = requestAnimationFrame(() => {
        hadOverlayRef.current = false
        lastOpenerRef.current?.focus()
      })
      return () => cancelAnimationFrame(frame)
    }
  }, [activeOverlay])

  function openOverlay(kind: Exclude<ActiveOverlay, null>, opener: HTMLElement) {
    lastOpenerRef.current = opener
    setActiveOverlay(kind)
  }

  return (
    <div className="bg-[var(--quni-surface-2)] [padding-bottom:calc(var(--space-24)+env(safe-area-inset-bottom,0px))]">
      <Seo
        title="List your property"
        description="The safest way to rent your spare room to university students. See the going rate, preview your room, and list free until someone moves in."
        canonicalPath="/list-your-room-d"
        noindex
      />

      <main className={`${SITE_CONTENT_MAX_CLASS} pt-4`}>
        <QuinnieBand />
        <div className="mt-5 flex items-start gap-4">
          <div className="min-w-0 flex-1 space-y-5">
            <EarningsCard />
            <button
              type="button"
              onClick={(event) => openOverlay('preview', event.currentTarget)}
              className="w-full rounded-[var(--radius-sm)] bg-[var(--quni-ink)] px-4 py-3 text-sm font-bold text-white transition-colors duration-[var(--dur-base)] ease-[var(--ease-standard)] hover:bg-[var(--quni-ink-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)] md:hidden"
            >
              Preview your room on Quni →
            </button>
            <div className="grid gap-5 md:grid-cols-2">
              <SmartToolsPanel />
              <TrustPanel onOpenVerification={(opener) => openOverlay('verification', opener)} />
            </div>
            <PapersFooter />
          </div>
          <ListYourRoomDPreviewRail onOpen={(opener) => openOverlay('preview', opener)} />
        </div>
      </main>

      <ListYourRoomDPreviewDrawer
        open={activeOverlay === 'preview'}
        mode={previewMode}
        property={property}
        dialogRef={previewDialogRef}
        onClose={() => setActiveOverlay((current) => (current === 'preview' ? null : current))}
        onModeChange={setPreviewMode}
      />
      <ListYourRoomDSignupSheet
        open={activeOverlay === 'signup'}
        onOpen={(opener) => openOverlay('signup', opener)}
        onClose={() => setActiveOverlay((current) => (current === 'signup' ? null : current))}
      />
      <VerificationExplainerModal
        open={activeOverlay === 'verification'}
        onClose={() => setActiveOverlay((current) => (current === 'verification' ? null : current))}
      />
    </div>
  )
}
