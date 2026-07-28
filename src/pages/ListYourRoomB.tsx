import Seo from '../components/Seo'
import { PropertyCard } from '../components/PropertyCard'
import Signup from './Signup'
import { LEGAL_ENTITY_NAME, getFallbackLegalEntity } from '../lib/legalEntity'
import type { Property } from '../lib/listings'
import { formatAustralianAbn } from '../lib/platformIdentity'

/** Interim ABN for invite card until public_legal_entity always supplies it. */
const INVITE_ABN_FALLBACK = '65675990968'

/**
 * TODO: replace both images with final approved photos.
 * Interim files from docs/mockups/quni-invite-landing-v*.html.
 */
const ROOM_IMG = '/landlord-invite/room.jpg'
const QUINNIE_IMG = '/landlord-invite/quinnie.jpg'

/** Sample listing for the live PropertyCard preview — no named places. */
const SAMPLE_LISTING_BASE = {
  id: 'list-your-room-b-sample',
  title: 'Furnished private room in a share house',
  slug: 'list-your-room-b-sample',
  description: null,
  rent_per_week: 320,
  room_type: 'single',
  bedrooms: 4,
  bathrooms: 2,
  rooms_rented_to_residents: 1,
  furnished: true,
  bond: null,
  bond_weeks: 4,
  qld_bond_remittance_preference: null,
  lease_length: null,
  listing_type: 'rent',
  featured: false,
  address: null,
  suburb: '—',
  state: null,
  postcode: null,
  latitude: null,
  longitude: null,
  landlord_id: null,
  university_id: null,
  campus_id: null,
  available_from: null,
  available_to: null,
  status: 'active',
  linen_supplied: null,
  weekly_cleaning_service: null,
  property_type: 'private_room_landlord_off_site',
  open_to_non_students: false,
  is_registered_rooming_house: false,
  rooming_house_registration_number: null,
  house_rules: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  property_group_id: null,
  service_tier: 'listing',
  max_occupants: 1,
  couple_surcharge_per_week: null,
  parking_surcharge_per_week: null,
  parking_available: false,
  smoke_alarm_type: null,
  smoke_alarm_battery_tenant_replaceable: null,
  smoke_alarm_battery_type: null,
  smoke_alarm_backup_tenant_replaceable: null,
  smoke_alarm_backup_battery_type: null,
  strata_oc_responsible_for_alarms: null,
  water_usage_charged_separately: null,
  electricity_embedded_network: null,
  gas_embedded_network: null,
  strata_bylaws_applicable: null,
  authority_to_let_attested_at: null,
  water_separately_metered_efficient_attested_at: null,
  accuracy_attested_at: null,
  accuracy_attested_content_hash: null,
  utilities_services: null,
  lister_role: 'owner',
  landlord_profiles: {
    id: 'list-your-room-b-sample-landlord',
    full_name: 'Private landlord',
    avatar_url: null,
    verified: true,
    languages_spoken: [],
  },
  universities: null,
  campuses: null,
} as const

/** PropertyCard only accepts http(s) image URLs (see firstPropertyImageUrl). */
function sampleListingProperty(): Property {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://quni.com.au'
  return {
    ...SAMPLE_LISTING_BASE,
    images: [`${origin}${ROOM_IMG}`],
    landlord_profiles: {
      ...SAMPLE_LISTING_BASE.landlord_profiles,
      languages_spoken: [] as string[],
    },
  } as Property
}

const PITCH_POINTS = [
  'Less vacancy, more rent.',
  'Verified students, not randoms.',
  'AI writes & prices your listing.',
  'State-compliant lease, e-signed.',
  'Rent & bond straight to you.',
] as const

function TickBadge() {
  return (
    <span
      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--quni-trust-bg)] text-[var(--quni-trust)]"
      aria-hidden
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  )
}

/**
 * A/B alternative to `/list-your-room`.
 * Same copy; v7 four-panel band (listing | Quinnie | why-points | signup).
 * Preview-gated — does not replace the live invite page.
 */
export default function ListYourRoomB() {
  const entity = getFallbackLegalEntity()
  const abn = entity.abn.trim() || INVITE_ABN_FALLBACK
  const legalLine = `${entity.legalName.trim() || LEGAL_ENTITY_NAME} t/a Quni Living · ABN ${formatAustralianAbn(abn)} · ${entity.registeredState}`
  const sampleListing = sampleListingProperty()

  return (
    <div className="bg-[var(--quni-surface-1)]">
      <Seo
        title="List your room"
        description="Fill your room with a verified student. Quni is free until you accept — keep your Facebook ad running too."
        canonicalPath="/list-your-room-b"
        noindex
      />

      <div className="mx-auto flex max-w-[1240px] flex-col justify-center gap-5 px-5 py-6 md:gap-6 md:px-7 md:py-8 lg:min-h-[calc(100vh-4rem)] lg:py-9">
        {/* Row 1 — full-width hero (same copy as /list-your-room) */}
        <header className="max-w-3xl">
          <span className="inline-block rounded-md border border-[var(--quni-coral-border)] bg-[var(--quni-coral-soft)] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--quni-coral-active)]">
            For landlords
          </span>
          <h1 className="font-display mt-3.5 text-[1.875rem] font-extrabold leading-[1.06] tracking-tight text-[var(--quni-ink)] sm:text-[2.25rem] lg:text-[2.625rem] !mt-3.5 !mb-0">
            Fill your room with a verified student.
          </h1>
          <p className="mt-3 max-w-[760px] text-[15px] leading-relaxed text-[var(--quni-ink-3)] sm:text-[17px]">
            An empty room is rent you&apos;re not earning. Quni fills it —{' '}
            <strong className="font-semibold text-[var(--quni-ink)]">fast, verified, and free until you accept</strong>.
            Keep your Facebook ad running too.
          </p>
        </header>

        {/*
          Row 2 — four matched panels (v7 band):
          mobile: signup first; md: 2×2; xl: listing | Quinnie | points | signup
        */}
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.86fr)_minmax(0,1.18fr)] xl:gap-5">
          {/* 1. Listing preview */}
          <div className="quni-card order-2 flex h-full min-h-0 flex-col overflow-hidden p-0 md:order-1 xl:order-1 [&_.h-48]:!h-[158px] [&_.quni-card]:border-0 [&_.quni-card]:shadow-none">
            <div className="p-4 pb-0 sm:p-5 sm:pb-0">
              <PropertyCard property={sampleListing} staticDisplay />
            </div>
            <p className="mt-2.5 px-4 pb-4 text-[12px] leading-snug text-[var(--quni-ink-4)] sm:px-5 sm:pb-5">
              This is what your room looks like on Quni — photo, price, verified badge and all.
            </p>
          </div>

          {/* 2. Quinnie — photo band + quote (separate from ticks) */}
          <div className="quni-card order-3 flex h-full min-h-0 flex-col overflow-hidden p-0 md:order-3 xl:order-2">
            <div className="h-[150px] shrink-0 overflow-hidden">
              {/* TODO: replace with final approved Quinnie photo */}
              <img
                src={QUINNIE_IMG}
                alt="Quinnie Le, co-founder of Quni"
                width={400}
                height={150}
                loading="lazy"
                className="h-full w-full object-cover object-[center_22%]"
              />
            </div>
            <div className="flex flex-1 flex-col justify-center p-4 sm:p-[18px]">
              <p className="text-[14px] leading-relaxed text-[var(--quni-ink-3)]">
                <strong className="font-semibold text-[var(--quni-ink)]">Hi, I&apos;m Quinnie.</strong> I built Quni with
                my partner so a spare room is easy money, not a headache. It takes a few minutes to set up, and you can
                message me anytime — you&apos;ll get me, not a bot.
              </p>
              <p className="font-display mt-3.5 text-[15px] font-bold text-[var(--quni-ink)] !mt-3.5 !mb-0">
                Quinnie Le
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--quni-ink-4)]">Co-founder, Quni</p>
            </div>
          </div>

          {/* 3. Why landlords list */}
          <div className="quni-card order-4 flex h-full min-h-0 flex-col justify-center p-5 md:order-4 xl:order-3">
            <p className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--quni-ink-4)]">
              Why landlords list
            </p>
            <ul className="flex flex-col">
              {PITCH_POINTS.map((line, i) => (
                <li
                  key={line}
                  className={`flex gap-2.5 py-2.5 text-[14.5px] font-semibold leading-snug text-[var(--quni-ink-2)] ${
                    i === 0 ? '' : 'border-t border-[var(--quni-line-soft)]'
                  }`}
                >
                  <TickBadge />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. Signup */}
          <aside className="quni-card order-1 flex h-full min-h-0 flex-col p-[22px] md:order-2 xl:order-4">
            <Signup embedLandlordInvite collapsedEmail />
            <p className="mt-3.5 text-center text-[10.5px] leading-normal text-[var(--quni-ink-5)]">{legalLine}</p>
          </aside>
        </div>
      </div>
    </div>
  )
}
