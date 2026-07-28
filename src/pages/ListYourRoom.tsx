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

const CARD_SHELL =
  'flex h-full min-h-0 flex-col rounded-2xl border border-[rgba(31,42,68,0.08)] bg-white p-6 shadow-[0_10px_30px_rgba(31,42,68,0.06)]'

/** Sample listing for the live PropertyCard preview — no named places. */
const SAMPLE_LISTING_BASE = {
  id: 'list-your-room-sample',
  title: 'Furnished private room in a share house',
  slug: 'list-your-room-sample',
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
    id: 'list-your-room-sample-landlord',
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
      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ECFDF5] text-[#10B981]"
      aria-hidden
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  )
}

export default function ListYourRoom() {
  const entity = getFallbackLegalEntity()
  const abn = entity.abn.trim() || INVITE_ABN_FALLBACK
  const legalLine = `${entity.legalName.trim() || LEGAL_ENTITY_NAME} t/a Quni Living · ABN ${formatAustralianAbn(abn)} · ${entity.registeredState}`
  const sampleListing = sampleListingProperty()

  return (
    <div className="bg-[var(--quni-surface-1)]">
      <Seo
        title="List your room"
        description="Fill your room with a verified student. Quni is free until you accept — keep your Facebook ad running too."
        canonicalPath="/list-your-room"
      />

      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 py-4 md:gap-5 md:px-6 md:py-5 lg:py-6">
        {/* Row 1 — full-width hero */}
        <header className="max-w-3xl">
          <span className="inline-block rounded-md border border-[#F4D8CF] bg-[var(--quni-coral-soft)] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--quni-coral-active)]">
            For landlords
          </span>
          <h1 className="font-display mt-2.5 text-[1.75rem] font-extrabold leading-[1.1] tracking-tight text-[var(--quni-ink)] sm:text-[2.125rem] !mt-2.5 !mb-0">
            Fill your room with a verified student.
          </h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--quni-ink-3)] sm:text-base">
            An empty room is rent you&apos;re not earning. Quni fills it —{' '}
            <strong className="font-semibold text-[var(--quni-ink)]">fast, verified, and free until you accept</strong>.
            Keep your Facebook ad running too.
          </p>
        </header>

        {/*
          Row 2 — three matched cards:
          mobile: signup first; md+: listing | trust | signup
        */}
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(0,1.25fr)] xl:gap-6">
          {/* 1. Listing preview */}
          <div className={`order-2 md:order-1 xl:order-1 ${CARD_SHELL} [&_.h-48]:!h-[136px] [&_.quni-card]:shadow-none [&_.quni-card]:border-0`}>
            <PropertyCard property={sampleListing} staticDisplay />
            <p className="mt-3 text-[12px] leading-snug text-[var(--quni-ink-4)]">
              This is what your room looks like on Quni — photo, price, verified badge and all.
            </p>
          </div>

          {/* 2. Quinnie + proof points */}
          <div className={`order-3 md:order-3 xl:order-2 ${CARD_SHELL}`}>
            <div className="flex items-start gap-3.5">
              {/* TODO: replace with final approved Quinnie photo */}
              <img
                src={QUINNIE_IMG}
                alt="Quinnie Le, co-founder of Quni"
                width={88}
                height={88}
                loading="lazy"
                className="h-[88px] w-[88px] shrink-0 rounded-full object-cover object-[center_16%]"
              />
              <div className="min-w-0">
                <p className="text-[14px] font-medium leading-relaxed text-[#1F2A44]">
                  <strong className="font-semibold">Hi, I&apos;m Quinnie.</strong> I built Quni with my partner so a
                  spare room is easy money, not a headache. It takes a few minutes to set up, and you can message me
                  anytime — you&apos;ll get me, not a bot.
                </p>
                <p className="mt-2 text-[12.5px] font-semibold text-[#1F2A44]">Quinnie Le, co-founder.</p>
              </div>
            </div>

            <ul className="mt-5 flex flex-col gap-2.5 border-t border-[rgba(31,42,68,0.08)] pt-5">
              {PITCH_POINTS.map((line) => (
                <li key={line} className="flex gap-2.5 text-[13px] leading-snug text-[var(--quni-ink-2)]">
                  <TickBadge />
                  <span className="font-semibold">{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Signup */}
          <aside className={`order-1 md:order-2 xl:order-3 ${CARD_SHELL} sm:p-6`}>
            <Signup embedLandlordInvite collapsedEmail />
            <p className="mt-3 text-center text-[11px] text-[var(--quni-ink-5)]">{legalLine}</p>
          </aside>
        </div>
      </div>
    </div>
  )
}
