import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../context/AuthContext'
import { Icon } from '../../components/admin/Icon'
import {
  Button,
  Eyebrow,
  ErrorState,
  LoadingState,
} from '../../components/admin/primitives'
import {
  AttentionStrip,
  MarketplacePulseCell,
  ZoneCard,
  type AttentionItem,
  type ZoneCardRow,
} from '../../components/admin/patterns'
import { ADMIN_NAV_ZONES } from '../../components/admin/nav'

type Range = 'today' | '7d'

interface ZonePayload {
  rows: ZoneCardRow[]
  spark: number[]
  sparkColor: 'coral' | 'navy'
}

interface PulseCell {
  value: string
  unit: string | null
  delta: string
  deltaTone: 'success' | 'danger' | 'neutral'
  spark: number[]
  sparkColor: 'coral' | 'navy'
  href: string
  linkLabel: string
}

interface Snapshot {
  range: Range
  generatedAt: string
  city: string
  attention: AttentionItem[]
  zones: {
    marketplace: ZonePayload
    tenancies: ZonePayload
    supply: ZonePayload
    money: ZonePayload
    trust: ZonePayload
    platform: ZonePayload
  }
  pulse: {
    mrr: PulseCell
    activeTenancies: PulseCell
    conversion: PulseCell
    avgWeeklyRent: PulseCell
  }
}

const TRUST_CHECKLIST_STORAGE_KEY = 'quni.trustChecklist.completion'

const ZONE_META: Array<{
  id: keyof Snapshot['zones']
  title: string
  eyebrow: string
  icon: 'home' | 'calendar-check' | 'building-2' | 'dollar-sign' | 'shield-check' | 'package'
  iconTone: 'cream' | 'navy' | 'success'
  href: string
}> = [
  {
    id: 'marketplace',
    title: 'Marketplace',
    eyebrow: 'Bookings · Enquiries',
    icon: 'home',
    iconTone: 'cream',
    href: '/admin/bookings',
  },
  {
    id: 'tenancies',
    title: 'Tenancies',
    eyebrow: 'Active · Arrears',
    icon: 'calendar-check',
    iconTone: 'cream',
    href: '/admin/bookings?status=confirmed',
  },
  {
    id: 'supply',
    title: 'Supply',
    eyebrow: 'Landlords · Leads',
    icon: 'building-2',
    iconTone: 'cream',
    href: '/admin/landlords',
  },
  {
    id: 'money',
    title: 'Money',
    eyebrow: 'Payments · Payouts',
    icon: 'dollar-sign',
    iconTone: 'success',
    href: '/admin/payments',
  },
  {
    id: 'trust',
    title: 'Trust & compliance',
    eyebrow: 'Trust · Docs',
    icon: 'shield-check',
    iconTone: 'navy',
    href: '/admin/trust-checklist',
  },
  {
    id: 'platform',
    title: 'Platform',
    eyebrow: 'Config · Integrations',
    icon: 'package',
    iconTone: 'cream',
    href: '/admin/apps',
  },
]

/**
 * The Living Console - `/admin`.
 *
 * Per HANDOFF.md §3, this page is the only true "console" page in admin.
 * Data comes from one round-trip to `api/admin/living-console-snapshot.ts`
 * (Decision J1). Trust checklist completion is overlaid client-side from
 * `localStorage` (Decision F1) so the API can stay schema-free for now.
 */
export default function LivingConsole() {
  const { user, signOut } = useAuthContext()
  const navigate = useNavigate()
  const [range, setRange] = useState<Range>('7d')
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [trustPct, setTrustPct] = useState<number | null>(null)

  const fetchSnapshot = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) {
        setError('Sign in required')
        setLoading(false)
        return
      }
      const res = await fetch(`/api/admin/living-console-snapshot?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? `Snapshot failed (${res.status})`)
        setLoading(false)
        return
      }
      const body = (await res.json()) as Snapshot
      setSnapshot(body)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    void fetchSnapshot()
  }, [fetchSnapshot])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TRUST_CHECKLIST_STORAGE_KEY)
      if (raw === null) return
      const parsed = Number.parseFloat(raw)
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
        setTrustPct(parsed)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const trustRowsWithOverlay = useMemo<ZoneCardRow[] | null>(() => {
    if (!snapshot) return null
    return snapshot.zones.trust.rows.map((row) => {
      if (row.text.startsWith('Trust checklist completion')) {
        const pct = trustPct === null ? '38' : Math.round(trustPct).toString()
        return {
          tone: 'watch' as const,
          text: `${pct}% Trust checklist complete`,
          stub: trustPct === null,
        }
      }
      return row
    })
  }, [snapshot, trustPct])

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    (user?.user_metadata?.name as string | undefined)?.trim() ||
    user?.email?.split('@')[0] ||
    'Admin'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'A'

  return (
    <div>
      <Hero
        city={snapshot?.city ?? 'Sydney'}
        range={range}
        onRangeChange={setRange}
        displayName={displayName}
        initials={initials}
        onSignOut={async () => {
          await signOut()
          navigate('/', { replace: true })
        }}
      />

      {loading && !snapshot ? (
        <div className="rounded-admin-lg border border-admin-line bg-white">
          <LoadingState label="Loading the console…" />
        </div>
      ) : error ? (
        <div className="rounded-admin-lg border border-admin-line bg-white">
          <ErrorState
            description={error === 'Sign in required' ? 'Your session expired.' : error}
            onRetry={() => void fetchSnapshot()}
          />
        </div>
      ) : snapshot ? (
        <>
          <AttentionStrip items={snapshot.attention} />

          <section className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ZONE_META.map((meta) => {
              const zone = snapshot.zones[meta.id]
              const rows = meta.id === 'trust' && trustRowsWithOverlay ? trustRowsWithOverlay : zone.rows
              return (
                <ZoneCard
                  key={meta.id}
                  zone={zoneIdToNavId(meta.id)}
                  title={meta.title}
                  eyebrow={meta.eyebrow}
                  icon={meta.icon}
                  iconTone={meta.iconTone}
                  spark={zone.spark}
                  sparkColor={zone.sparkColor}
                  rows={rows}
                  href={meta.href}
                />
              )
            })}
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <Eyebrow>Marketplace pulse · past 7 days</Eyebrow>
              <Link to="/admin/settings" className="text-[12px] text-admin-ink-4 hover:text-admin-coral-active">
                Configure pulse
              </Link>
            </div>
            <div className="grid overflow-hidden rounded-admin-lg border border-admin-line bg-white sm:grid-cols-2 lg:grid-cols-4">
              <MarketplacePulseCell {...snapshot.pulse.mrr} label="MRR" />
              <MarketplacePulseCell {...snapshot.pulse.activeTenancies} label="Active tenancies" />
              <MarketplacePulseCell {...snapshot.pulse.conversion} label="Conversion (enquiry → booking)" />
              <MarketplacePulseCell {...snapshot.pulse.avgWeeklyRent} label="Avg weekly rent" isLast />
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}

interface HeroProps {
  city: string
  range: Range
  onRangeChange: (next: Range) => void
  displayName: string
  initials: string
  onSignOut: () => void | Promise<void>
}

function Hero({ city, range, onRangeChange, displayName, initials, onSignOut }: HeroProps) {
  return (
    <section className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-[760px]">
          <div className="mb-3.5 flex items-center gap-3">
            <span
              aria-hidden
              className="grid h-10 w-10 place-items-center rounded-[10px] bg-admin-coral text-white shadow-admin-card"
            >
              <span className="font-admin-display text-[22px] font-bold leading-none tracking-tight">Q</span>
            </span>
            <Eyebrow>Live operations · {city}</Eyebrow>
          </div>
          <h1 className="m-0 font-admin-display text-[clamp(44px,5vw,60px)] font-bold leading-[1.05] tracking-tight text-admin-ink">
            The <em className="font-bold italic">Living</em> Console.
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RangeToggle range={range} onChange={onRangeChange} />
          <Link
            to="/admin/bookings"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-admin-ink-3 hover:text-admin-coral-active"
          >
            <Icon name="bookmark" size={13} className="text-admin-ink-4" /> Saved views
          </Link>
          <Button kind="primary" icon="plus">
            Quick action
          </Button>
          <span aria-hidden className="h-5 w-px bg-admin-line" />
          <span className="inline-flex items-center gap-1.5 rounded-admin-pill border border-emerald-700/20 bg-admin-success-bg px-2.5 py-1 text-[11px] font-semibold text-admin-success-fg">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-admin-success" /> Live
          </span>
          <button
            type="button"
            title="Notifications"
            className="relative rounded-md p-1.5 text-admin-ink-3 transition-colors hover:bg-admin-coral-tint hover:text-admin-coral-active"
          >
            <Icon name="bell" size={17} />
            <span
              aria-hidden
              className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-admin-coral ring-2 ring-white"
            />
          </button>
          <UserMenu displayName={displayName} initials={initials} onSignOut={onSignOut} />
        </div>
      </div>
    </section>
  )
}

interface RangeToggleProps {
  range: Range
  onChange: (next: Range) => void
}

function RangeToggle({ range, onChange }: RangeToggleProps) {
  return (
    <div className="inline-flex rounded-admin-pill border border-admin-line bg-white p-[3px]" role="group">
      {(['today', '7d'] as const).map((opt) => {
        const active = range === opt
        const label = opt === 'today' ? 'Today' : '7d'
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={
              'rounded-admin-pill px-3 py-1 text-[12px] font-semibold transition-colors ' +
              (active ? 'bg-admin-ink text-white' : 'text-admin-ink-3 hover:text-admin-ink-2')
            }
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

interface UserMenuProps {
  displayName: string
  initials: string
  onSignOut: () => void | Promise<void>
}

function UserMenu({ displayName, initials, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        className="flex items-center gap-2 rounded-admin-pill border border-admin-line py-1 pl-1 pr-2.5 transition-colors hover:bg-admin-surface-2"
      >
        <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-admin-navy text-[11px] font-semibold text-white">
          {initials}
        </span>
        <span className="text-[12px] font-medium text-admin-ink-2">{displayName.split(/\s+/)[0]}</span>
        <Icon name="chevron-down" size={12} className="text-admin-ink-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 w-40 overflow-hidden rounded-admin-md border border-admin-line bg-white shadow-admin-modal"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void onSignOut()}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-admin-ink-2 hover:bg-admin-surface-2"
          >
            <Icon name="log-out" size={14} className="text-admin-ink-4" /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}

// The snapshot zone ids match the AdminZoneId union 1:1; this stays as a
// typed guard to make the contract explicit at the call site.
function zoneIdToNavId(id: keyof Snapshot['zones']): (typeof ADMIN_NAV_ZONES)[number]['id'] {
  return id
}
