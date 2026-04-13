import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminCardClass, adminTableWrapClass, adminThClass, adminTdClass } from './adminUi'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { getValidAccessTokenForFunctions } from '../../lib/supabaseEdgeInvoke'
import { readSupabaseFunctionInvokeError } from '../../lib/readSupabaseFunctionInvokeError'
import type { Database } from '../../lib/database.types'

type HealthResult = {
  service: string
  status: 'operational' | 'degraded' | 'down'
  message: string
}

type VendorHealthRow = Pick<Database['public']['Tables']['admin_vendor_subscriptions']['Row'], 'title' | 'href'>

/** Maps vendor rows to operational_status.service_name / health check keys (title + dashboard href). */
function vendorRowToHealthService(row: VendorHealthRow): string | null {
  const href = (row.href ?? '').trim().toLowerCase()
  const t = row.title.trim().toLowerCase()

  // Prefer dashboard URL so status dots work even if the display title is edited.
  if (href.includes('dash.cloudflare.com') || href.includes('cloudflare.com')) return 'cloudflare'
  if (href.includes('console.anthropic.com') || href.includes('anthropic.com')) return 'anthropic'

  if (t.includes('cloudflare')) return 'cloudflare'
  if (t.includes('anthropic')) return 'anthropic'
  if (t.includes('supabase') && t.includes('quni living')) return 'supabase'
  if (t.includes('sentry')) return 'sentry'
  if (t.includes('docuseal') || t.includes('railway')) return 'docuseal'
  if (t.includes('stripe')) return 'stripe'
  if (t.includes('vercel')) return 'vercel'
  if (t.includes('resend')) return 'resend'
  if (t.includes('tpp') || t.includes('wholesale')) return 'tpp_domains'
  return null
}

function HealthStatusDot({ serviceKey, results }: { serviceKey: string | null; results: HealthResult[] }) {
  if (!serviceKey) return null
  const h = results.find((r) => r.service === serviceKey)
  if (!h) return null
  const base = 'absolute top-3 right-11 z-10 h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-white shadow-sm'
  if (h.status === 'operational') {
    return <span className={`${base} bg-green-500`} title={h.message} aria-hidden />
  }
  if (h.status === 'degraded') {
    return <span className={`${base} bg-amber-500`} title={h.message} aria-hidden />
  }
  return (
    <span
      className={`${base} bg-red-500 animate-pulse`}
      title={h.message}
      role="status"
      aria-label={`${h.service} is down`}
    />
  )
}

type IncidentLogRow = Database['public']['Tables']['incident_log']['Row']

function formatIncidentAt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function IncidentStatusBadge({ status }: { status: string }) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize'
  if (status === 'operational') {
    return <span className={`${base} bg-green-100 text-green-800`}>operational</span>
  }
  if (status === 'degraded') {
    return <span className={`${base} bg-amber-100 text-amber-800`}>degraded</span>
  }
  if (status === 'down') {
    return <span className={`${base} bg-red-100 text-red-800`}>down</span>
  }
  return <span className={`${base} bg-gray-100 text-gray-700`}>{status}</span>
}

function IncidentCommentCell({ row, onSaved }: { row: IncidentLogRow; onSaved: () => void }) {
  const [value, setValue] = useState(row.comment ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(row.comment ?? '')
  }, [row.id, row.comment])

  const save = async () => {
    const trimmed = value.trim()
    const prev = (row.comment ?? '').trim()
    if (trimmed === prev) return
    setSaving(true)
    const { error } = await supabase.from('incident_log').update({ comment: trimmed || null }).eq('id', row.id)
    setSaving(false)
    if (!error) onSaved()
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void save()}
      disabled={saving}
      className="w-full min-w-[10rem] max-w-xs rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:opacity-60"
      placeholder="Add note…"
      aria-label={`Comment for ${row.service_name} incident`}
    />
  )
}

function IncidentMarkResolved({ row, onSaved }: { row: IncidentLogRow; onSaved: () => void }) {
  const [busy, setBusy] = useState(false)
  if (row.resolved_at) return null
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          const now = new Date().toISOString()
          const { error } = await supabase.from('incident_log').update({ resolved_at: now }).eq('id', row.id)
          if (!error) onSaved()
        } finally {
          setBusy(false)
        }
      }}
      className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
    >
      {busy ? '…' : 'Mark resolved'}
    </button>
  )
}

type OperationalStatusRow = Database['public']['Tables']['operational_status']['Row']

const MONITORED_SERVICE_NAMES = [
  'anthropic',
  'cloudflare',
  'docuseal',
  'firebase',
  'resend',
  'sentry',
  'stripe',
  'supabase',
  'tpp_domains',
  'vercel',
] as const

const SERVICE_DISPLAY_LABEL: Record<(typeof MONITORED_SERVICE_NAMES)[number], string> = {
  anthropic: 'Anthropic (Claude API)',
  cloudflare: 'Cloudflare',
  docuseal: 'DocuSeal',
  firebase: 'Firebase',
  resend: 'Resend',
  sentry: 'Sentry',
  stripe: 'Stripe Connect',
  supabase: 'Supabase',
  tpp_domains: 'TPP Domains',
  vercel: 'Vercel',
}

type AppsPageTab = 'services' | 'status' | 'incidents'

const OPS_POLL_MS = 60_000

function formatRelativeCheckedAt(iso: string, now: Date): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return '—'
  const sec = Math.max(0, Math.floor((now.getTime() - t) / 1000))
  if (sec < 10) return 'just now'
  if (sec < 60) return `${sec} second${sec === 1 ? '' : 's'} ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.floor(hr / 24)
  return `${day} day${day === 1 ? '' : 's'} ago`
}

function OpsStatusBadge({ status }: { status: OperationalStatusRow['status'] | null }) {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold'
  if (status === 'operational') {
    return <span className={`${base} bg-green-100 text-green-800`}>Operational</span>
  }
  if (status === 'degraded') {
    return <span className={`${base} bg-amber-100 text-amber-800`}>Degraded</span>
  }
  if (status === 'down') {
    return <span className={`${base} bg-red-100 text-red-800`}>Down</span>
  }
  return <span className={`${base} bg-gray-100 text-gray-600`}>—</span>
}

/** Placeholder FX for rough AUD rollup (replace with a live rate when you care about accuracy). */
const USD_TO_AUD_PLACEHOLDER = 1.55

export type AdminAppSubscription = {
  planName?: string
  amount?: number
  currency?: 'AUD' | 'USD'
  cadence?: 'monthly' | 'yearly' | 'usage' | 'free'
  billingHref?: string
}

type VendorRow = Database['public']['Tables']['admin_vendor_subscriptions']['Row']

function parseAmount(n: VendorRow['amount']): number {
  if (typeof n === 'number') return n
  const v = parseFloat(String(n))
  return Number.isFinite(v) ? v : 0
}

function rowToSubscription(row: VendorRow): AdminAppSubscription {
  const amount = parseAmount(row.amount)
  return {
    planName: row.plan_name?.trim() || undefined,
    amount: Number.isFinite(amount) ? amount : undefined,
    currency: row.currency === 'AUD' || row.currency === 'USD' ? row.currency : 'USD',
    cadence: row.cadence,
    billingHref: row.billing_href?.trim() || undefined,
  }
}

function formatSubscriptionLine(sub: AdminAppSubscription): string {
  const parts: string[] = []
  if (sub.planName?.trim()) parts.push(sub.planName.trim())
  if (sub.amount != null && Number.isFinite(sub.amount)) {
    const cur = sub.currency ?? 'AUD'
    const money = new Intl.NumberFormat(cur === 'AUD' ? 'en-AU' : 'en-US', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: sub.amount % 1 === 0 ? 0 : 2,
    }).format(sub.amount)
    const cadence = sub.cadence ?? 'monthly'
    const suffix =
      cadence === 'monthly'
        ? '/mo'
        : cadence === 'yearly'
          ? '/yr'
          : cadence === 'usage'
            ? ' (usage)'
            : ''
    parts.push(`${money}${suffix}`)
  } else if (sub.cadence === 'free') {
    parts.push('Free tier')
  } else if (sub.cadence === 'usage') {
    parts.push('Usage-based (set amount if you want a typical month)')
  }
  return parts.length ? parts.join(' · ') : '—'
}

/** Normalise each row to an approximate monthly AUD figure for the summary strip. */
function monthlyAudApprox(row: VendorRow): number {
  if (row.cadence === 'free') return 0
  const amount = parseAmount(row.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    if (row.cadence === 'usage') return 0
  }
  let monthly = amount
  if (row.cadence === 'yearly') monthly = amount / 12
  if (row.currency === 'USD') monthly *= USD_TO_AUD_PLACEHOLDER
  return monthly
}

function faviconForHref(href: string): string | null {
  try {
    const url = new URL(href)
    return `${url.origin}/favicon.ico`
  } catch {
    return null
  }
}

function BrandLogo({
  title,
  href,
  logoSrc,
}: {
  title: string
  href: string
  logoSrc?: string | null
}) {
  const [errored, setErrored] = useState(false)
  const src = logoSrc ?? faviconForHref(href)
  const initials = title.trim().split(/\s+/)[0]?.[0]?.toUpperCase() ?? 'B'

  if (!src || errored) {
    return (
      <div
        className="h-9 w-9 shrink-0 rounded-xl border border-gray-100 bg-white flex items-center justify-center"
        aria-hidden
      >
        <span className="text-sm font-semibold text-gray-700">{initials}</span>
      </div>
    )
  }

  return (
    <div
      className="h-9 w-9 shrink-0 rounded-xl border border-gray-100 bg-white flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      <img
        src={src}
        alt=""
        className="h-7 w-7 object-contain"
        onError={() => setErrored(true)}
      />
    </div>
  )
}

function AppsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className={`${adminCardClass} animate-pulse`}>
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-gray-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-2/3" />
              <div className="h-3 bg-gray-50 rounded w-full" />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3 bg-gray-50 rounded w-24" />
            <div className="h-4 bg-gray-100 rounded w-4/5" />
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex gap-3">
            <div className="h-3 bg-gray-100 rounded w-28" />
            <div className="h-3 bg-gray-100 rounded w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

const APPLE_DEVELOPER_HREF = 'https://developer.apple.com/'
const FIREBASE_CONSOLE_HREF = 'https://console.firebase.google.com/'
const GOOGLE_PLAY_CONSOLE_HREF = 'https://play.google.com/console'
const GOOGLE_WORKSPACE_ADMIN_HREF = 'https://admin.google.com/'
const GOOGLE_WORKSPACE_PRODUCT_HREF = 'https://workspace.google.com/'

type AppsGridItem =
  | { kind: 'appledeveloper'; sortKey: string }
  | { kind: 'firebase'; sortKey: string }
  | { kind: 'googleplay'; sortKey: string }
  | { kind: 'googleworkspace'; sortKey: string }
  | { kind: 'vendor'; sortKey: string; row: VendorRow }

function buildSortedAppsGridItems(rows: VendorRow[]): AppsGridItem[] {
  const items: AppsGridItem[] = [
    { kind: 'appledeveloper', sortKey: 'Apple Developer' },
    { kind: 'firebase', sortKey: 'Firebase' },
    { kind: 'googleplay', sortKey: 'Google Play Console' },
    { kind: 'googleworkspace', sortKey: 'Google Workspace' },
    ...rows.map((row) => ({
      kind: 'vendor' as const,
      sortKey: row.title.trim() || row.id,
      row,
    })),
  ]
  items.sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'en', { sensitivity: 'base' }))
  return items
}

function AppleDeveloperIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.14-.493 2.278-1.11 3.04-.704.896-1.922 1.59-3.11 1.59-.15 0-.293-.012-.434-.037.036-.117.063-.238.09-.36 0 0 .028-.09.052-.17.052-.17.1-.35.137-.533.34-1.43-.486-2.988-1.702-3.784a5.582 5.582 0 0 0-1.29-.575c.13-.06.26-.115.4-.165.108-.038.216-.073.328-.105.46-.125.958-.19 1.456-.19.83 0 1.65.135 2.375.402.78.29 1.5.726 2.04 1.327.57.63.98 1.39 1.2 2.25.15.57.19 1.16.15 1.74zM12.035 6.16c-2.18.01-4.022 1.578-4.022 1.578s-1.842-1.568-4.022-1.578C2.793 6.17 1 7.746 1 10.028c0 1.648.89 3.437 2.11 4.874C4.308 16.37 5.708 17.8 7.01 17.8c1.302 0 1.842-.578 3.025-.578 1.183 0 1.723.578 3.025.578 1.302 0 2.702-1.43 3.9-2.898 1.22-1.437 2.11-3.226 2.11-4.874 0-2.282-1.793-3.858-3.99-3.868z"
      />
    </svg>
  )
}

function AppleDeveloperAppCard({ linkClass }: { linkClass: string }) {
  return (
    <div
      className={`${adminCardClass} flex flex-col transition-shadow hover:shadow-md hover:border-slate-200/90 border-slate-200/60 bg-slate-50/40 relative`}
    >
      <div className="flex items-start gap-3 flex-1">
        <div
          className="h-9 w-9 shrink-0 rounded-xl border border-slate-200/90 bg-white flex items-center justify-center text-gray-900"
          aria-hidden
        >
          <AppleDeveloperIcon className="shrink-0" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">Apple Developer</p>
          <p className="text-sm text-gray-500 mt-1">
            iOS distribution, certificates, identifiers, App Store Connect, and TestFlight for the Quni Living app.
          </p>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Subscription</p>
        <p className="text-sm text-gray-800 mt-1">Apple Developer Program (annual membership)</p>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-2">
        <a href={APPLE_DEVELOPER_HREF} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Open Apple Developer →
        </a>
      </div>
    </div>
  )
}

function FirebaseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#FFCA28"
        d="M3.89 15.672 6.255.461A.542.542 0 0 1 7.27.289l9.941 5.721a.542.542 0 0 1 .183.744l-2.524 4.786 1.755-3.043a.542.542 0 0 1 .744-.183L22.463 9.11a.542.542 0 0 1 .183.744l-4.947 9.413a.542.542 0 0 1-.744.183L2.524 15.929a.542.542 0 0 1-.634-.257Z"
      />
    </svg>
  )
}

function GoogleWorkspaceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="2.5" y="2.5" width="8" height="8" rx="1.75" fill="#4285F4" />
      <rect x="13.5" y="2.5" width="8" height="8" rx="1.75" fill="#34A853" />
      <rect x="2.5" y="13.5" width="8" height="8" rx="1.75" fill="#FBBC04" />
      <rect x="13.5" y="13.5" width="8" height="8" rx="1.75" fill="#EA4335" />
    </svg>
  )
}

function GoogleWorkspaceAppCard({ linkClass }: { linkClass: string }) {
  return (
    <div
      className={`${adminCardClass} flex flex-col transition-shadow hover:shadow-md hover:border-blue-100/90 border-blue-100/50 bg-blue-50/20 relative`}
    >
      <div className="flex items-start gap-3 flex-1">
        <div
          className="h-9 w-9 shrink-0 rounded-xl border border-blue-100/80 bg-white flex items-center justify-center"
          aria-hidden
        >
          <GoogleWorkspaceIcon className="shrink-0" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">Google Workspace</p>
          <p className="text-sm text-gray-500 mt-1">
            Team email (@your domain), Google Calendar, Drive, Meet, Groups, and Vault-style retention where enabled.
            Manage users, security, devices, reporting, and billing from the Admin console.
          </p>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Subscription</p>
        <p className="text-sm text-gray-800 mt-1">Per-seat Workspace plan — billed by Google (Starter / Standard / Plus, etc.)</p>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-2">
        <a href={GOOGLE_WORKSPACE_ADMIN_HREF} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Open Google Admin →
        </a>
        <a href={GOOGLE_WORKSPACE_PRODUCT_HREF} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Workspace home →
        </a>
      </div>
    </div>
  )
}

function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        fill="#00D9FF"
        d="M3.609 1.814 13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92z"
      />
      <path fill="#FFD23F" d="m14.499 12 2.302 2.302-10.937 6.333 8.635-8.635z" />
      <path
        fill="#00F076"
        d="m17.698 8.802 2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491z"
      />
      <path fill="#FF3A44" d="M5.864 2.658 16.802 8.99l-2.303 2.303-8.635-8.635z" />
    </svg>
  )
}

function GooglePlayAppCard({ linkClass }: { linkClass: string }) {
  return (
    <div
      className={`${adminCardClass} flex flex-col transition-shadow hover:shadow-md hover:border-emerald-100/90 border-emerald-100/50 bg-emerald-50/15 relative`}
    >
      <div className="flex items-start gap-3 flex-1">
        <div
          className="h-9 w-9 shrink-0 rounded-xl border border-emerald-100/80 bg-white flex items-center justify-center"
          aria-hidden
        >
          <GooglePlayIcon className="shrink-0" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">Google Play Console</p>
          <p className="text-sm text-gray-500 mt-1">
            Android releases, internal testing tracks, store listing, and Play integrity for the Quni Living app.
          </p>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Subscription</p>
        <p className="text-sm text-gray-800 mt-1">One-time $25 dev account + any Play billing you enable</p>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-2">
        <a href={GOOGLE_PLAY_CONSOLE_HREF} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Open Play Console →
        </a>
      </div>
    </div>
  )
}

function FirebaseAppCard({ linkClass, healthResults }: { linkClass: string; healthResults: HealthResult[] }) {
  return (
    <div
      className={`${adminCardClass} flex flex-col transition-shadow hover:shadow-md hover:border-amber-100/90 border-amber-100/50 bg-amber-50/20 relative`}
    >
      <HealthStatusDot serviceKey="firebase" results={healthResults} />
      <div className="flex items-start gap-3 flex-1">
        <div
          className="h-9 w-9 shrink-0 rounded-xl border border-amber-100/80 bg-white flex items-center justify-center"
          aria-hidden
        >
          <FirebaseIcon className="shrink-0" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">Firebase</p>
          <p className="text-sm text-gray-500 mt-1">
            FCM push, mobile app config, and Google-backed project tools (linked to your Capacitor builds).
          </p>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Subscription</p>
        <p className="text-sm text-gray-800 mt-1">Free tier / usage — see Google Cloud billing if linked</p>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-2">
        <a href={FIREBASE_CONSOLE_HREF} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Open Firebase Console →
        </a>
      </div>
    </div>
  )
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function VendorEditModal({
  row,
  onClose,
  onSaved,
}: {
  row: VendorRow
  onClose: () => void
  onSaved: () => void
}) {
  const [planName, setPlanName] = useState(row.plan_name ?? '')
  const [amount, setAmount] = useState(String(parseAmount(row.amount)))
  const [currency, setCurrency] = useState<'AUD' | 'USD'>(row.currency)
  const [cadence, setCadence] = useState<VendorRow['cadence']>(row.cadence)
  const [billingHref, setBillingHref] = useState(row.billing_href ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const num = parseFloat(amount)
    const payload = {
      plan_name: planName.trim() || null,
      amount: Number.isFinite(num) ? num : 0,
      currency,
      cadence,
      billing_href: billingHref.trim() || null,
    }
    const { error: upErr } = await supabase.from('admin_vendor_subscriptions').update(payload).eq('id', row.id)
    setSaving(false)
    if (upErr) {
      setError(upErr.message)
      return
    }
    onSaved()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">Edit subscription — {row.title}</h2>
        <p className="text-sm text-gray-500 mt-1">Dashboard link and title are fixed in the database (run a SQL migration to change them).</p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Plan name</span>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</span>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Currency</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'AUD' | 'USD')}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="AUD">AUD</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cadence</span>
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value as VendorRow['cadence'])}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="usage">Usage (typical month)</option>
                <option value="free">Free</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Billing / invoices URL</span>
            <input
              type="url"
              value={billingHref}
              onChange={(e) => setBillingHref(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="https://"
            />
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

const HEALTH_POLL_MS = 5 * 60 * 1000

export default function AdminApps() {
  const [rows, setRows] = useState<VendorRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<VendorRow | null>(null)
  const [healthResults, setHealthResults] = useState<HealthResult[]>([])
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null)
  const [incidents, setIncidents] = useState<IncidentLogRow[]>([])
  const [incidentsLoading, setIncidentsLoading] = useState(false)
  const [appsTab, setAppsTab] = useState<AppsPageTab>('services')
  const [opsRows, setOpsRows] = useState<OperationalStatusRow[]>([])
  const [opsLoading, setOpsLoading] = useState(false)
  const [statusClock, setStatusClock] = useState(() => Date.now())

  const loadIncidents = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setIncidentsLoading(true)
    const { data, error: qErr } = await supabase
      .from('incident_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    setIncidentsLoading(false)
    if (qErr) {
      console.error('incident_log', qErr)
      setIncidents([])
      return
    }
    setIncidents((data as IncidentLogRow[] | null) ?? [])
  }, [])

  const loadOperationalStatus = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setOpsLoading(true)
    const names = [...MONITORED_SERVICE_NAMES]
    const { data, error: qErr } = await supabase.from('operational_status').select('*').in('service_name', names)
    setOpsLoading(false)
    if (qErr) {
      console.error('operational_status', qErr)
      setOpsRows([])
      return
    }
    setOpsRows((data as OperationalStatusRow[] | null) ?? [])
  }, [])

  const loadHealth = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setHealthLoading(true)
    setHealthError(null)
    const auth = await getValidAccessTokenForFunctions()
    if ('error' in auth) {
      setHealthError(auth.error)
      setHealthLoading(false)
      setLastHealthCheck(new Date())
      return
    }
    const { data, error: fnError } = await supabase.functions.invoke<HealthResult[]>('platform-health', {
      method: 'GET',
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    setLastHealthCheck(new Date())
    setHealthLoading(false)
    if (fnError) {
      setHealthError(await readSupabaseFunctionInvokeError(data, fnError))
      return
    }
    if (data && typeof data === 'object' && 'error' in data && typeof (data as { error?: string }).error === 'string') {
      setHealthError((data as { error: string }).error)
      return
    }
    setHealthResults(Array.isArray(data) ? data : [])
    void loadIncidents()
  }, [loadIncidents])

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setRows([])
      setLoading(false)
      setError('Supabase is not configured.')
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: qErr } = await supabase
      .from('admin_vendor_subscriptions')
      .select('*')
      .eq('is_active', true)
    setLoading(false)
    if (qErr) {
      setError(qErr.message)
      setRows([])
      return
    }
    setRows((data as VendorRow[] | null) ?? [])
  }, [])

  useEffect(() => {
    void load()
    void loadIncidents()
  }, [load, loadIncidents])

  useEffect(() => {
    void loadHealth()
    const id = window.setInterval(() => void loadHealth(), HEALTH_POLL_MS)
    return () => window.clearInterval(id)
  }, [loadHealth])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    void loadOperationalStatus()
    const id = window.setInterval(() => {
      void loadOperationalStatus()
      setStatusClock(Date.now())
    }, OPS_POLL_MS)
    return () => window.clearInterval(id)
  }, [loadOperationalStatus])

  const opsByService = useMemo(() => {
    const m = new Map<string, OperationalStatusRow>()
    for (const r of opsRows) {
      if (r.service_name) m.set(r.service_name, r)
    }
    return m
  }, [opsRows])

  const statusSummary = useMemo(() => {
    let down = 0
    let degraded = 0
    let known = 0
    for (const name of MONITORED_SERVICE_NAMES) {
      const row = opsByService.get(name)
      if (!row) continue
      known += 1
      const st = row.status
      if (st === 'down') down += 1
      else if (st === 'degraded') degraded += 1
    }
    return { down, degraded, known }
  }, [opsByService])

  const activeIncidentCount = useMemo(() => incidents.filter((i) => !i.resolved_at).length, [incidents])

  const statusNow = useMemo(() => new Date(statusClock), [statusClock])

  const totalMonthlyAudApprox = useMemo(() => {
    if (!rows?.length) return 0
    return rows.reduce((sum, r) => sum + monthlyAudApprox(r), 0)
  }, [rows])

  const totalFormatted = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: totalMonthlyAudApprox % 1 === 0 ? 0 : 2,
  }).format(totalMonthlyAudApprox)

  const appsGridItems = useMemo(() => (rows ? buildSortedAppsGridItems(rows) : null), [rows])

  const linkClass =
    'text-xs text-indigo-600 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 rounded'

  const downHealth = useMemo(() => healthResults.filter((r) => r.status === 'down'), [healthResults])

  const tabBtnBase =
    'border-b-2 pb-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF6F61] rounded-t'
  const tabBtnInactive = `${tabBtnBase} border-transparent text-gray-500 hover:text-gray-800`
  const tabBtnActive = `${tabBtnBase} border-[#FF6F61] text-[#FF6F61]`

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Apps</h1>
          <p className="text-sm text-gray-500 mt-1">
            External tools for running Quni Living — costs are stored in Supabase and editable below. Apple Developer,
            Firebase, Google Play Console, and Google Workspace are fixed shortcuts for the app stack and org productivity;
            vendor cards from the database fill in the rest. All cards are sorted A–Z by name.
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void loadHealth()}
            disabled={healthLoading}
            className="inline-flex items-center justify-center rounded-lg bg-[#FF6F61] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61]"
          >
            {healthLoading ? 'Refreshing…' : 'Refresh All'}
          </button>
          {lastHealthCheck ? (
            <p className="text-xs text-gray-500 text-right">
              Last checked:{' '}
              {lastHealthCheck.toLocaleString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex flex-wrap gap-x-8 gap-y-2" role="tablist" aria-label="Apps page sections">
          <button
            type="button"
            role="tab"
            aria-selected={appsTab === 'services'}
            id="apps-tab-services"
            aria-controls="apps-panel-services"
            className={appsTab === 'services' ? tabBtnActive : tabBtnInactive}
            onClick={() => setAppsTab('services')}
          >
            Services
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={appsTab === 'status'}
            id="apps-tab-status"
            aria-controls="apps-panel-status"
            className={appsTab === 'status' ? tabBtnActive : tabBtnInactive}
            onClick={() => setAppsTab('status')}
          >
            Status
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={appsTab === 'incidents'}
            id="apps-tab-incidents"
            aria-controls="apps-panel-incidents"
            className={appsTab === 'incidents' ? tabBtnActive : tabBtnInactive}
            onClick={() => setAppsTab('incidents')}
          >
            {activeIncidentCount > 0 ? `Incident Log (${activeIncidentCount})` : 'Incident Log'}
          </button>
        </nav>
      </div>

      {appsTab === 'services' ? (
        <div id="apps-panel-services" role="tabpanel" aria-labelledby="apps-tab-services">
          {downHealth.length > 0 ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <p className="font-semibold">⚠️ Platform issue detected</p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                {downHealth.map((r) => (
                  <li key={r.service}>
                    {r.service}: {r.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {healthError ? <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">{healthError}</p> : null}

          {!loading && !error && rows && rows.length > 0 ? (
            <div className={`${adminCardClass} mb-6 border-indigo-100/80 bg-indigo-50/40`}>
              <p className="text-sm font-semibold text-gray-900">Approximate monthly total (AUD)</p>
              <p className="text-2xl font-bold text-indigo-900 mt-1 tabular-nums">{totalFormatted}</p>
              <p className="text-xs text-gray-600 mt-2">
                Rough rollup: USD × {USD_TO_AUD_PLACEHOLDER} (placeholder rate), yearly ÷ 12, usage/free treated as above. Not financial
                advice — numbers are indicative only.
              </p>
            </div>
          ) : null}

          {error && !loading ? <p className="text-sm text-red-600 mb-4">{error}</p> : null}

          {loading ? <AppsSkeleton /> : null}

          {!loading && rows && rows.length === 0 && !error ? (
            <p className="text-sm text-gray-600 mb-4">No active vendors. Add rows in Supabase or run the latest migration.</p>
          ) : null}

          {!loading && !error && appsGridItems ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {appsGridItems.map((item) => {
                if (item.kind === 'appledeveloper') {
                  return <AppleDeveloperAppCard key="appledeveloper" linkClass={linkClass} />
                }
                if (item.kind === 'firebase') {
                  return <FirebaseAppCard key="firebase" linkClass={linkClass} healthResults={healthResults} />
                }
                if (item.kind === 'googleplay') {
                  return <GooglePlayAppCard key="googleplay" linkClass={linkClass} />
                }
                if (item.kind === 'googleworkspace') {
                  return <GoogleWorkspaceAppCard key="googleworkspace" linkClass={linkClass} />
                }

                const row = item.row
                const sub = rowToSubscription(row)
                const billingHref = sub.billingHref?.trim()

                return (
                  <div
                    key={row.id}
                    className={`${adminCardClass} flex flex-col transition-shadow hover:shadow-md hover:border-indigo-100 relative`}
                  >
                    <HealthStatusDot serviceKey={vendorRowToHealthService(row)} results={healthResults} />
                    <div className="flex items-start gap-3 flex-1">
                      <BrandLogo title={row.title} href={row.href} logoSrc={row.logo_src} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{row.title}</p>
                            {row.subtitle ? <p className="text-sm text-gray-500 mt-1">{row.subtitle}</p> : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditing(row)}
                            className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            aria-label={`Edit subscription for ${row.title}`}
                          >
                            <PencilIcon />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Subscription</p>
                      <p className="text-sm text-gray-800 mt-1">{formatSubscriptionLine(sub)}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <a href={row.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                        Open dashboard →
                      </a>
                      {billingHref ? (
                        <a href={billingHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
                          Billing / invoices →
                        </a>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {appsTab === 'status' ? (
        <div id="apps-panel-status" role="tabpanel" aria-labelledby="apps-tab-status">
          {opsLoading && statusSummary.known === 0 ? (
            <p className="text-sm text-gray-600 mb-4">Loading status…</p>
          ) : !opsLoading && statusSummary.known === 0 ? (
            <p className="text-sm font-medium text-gray-600 mb-4">
              No status rows yet — open Services and use Refresh All, or wait for the scheduled health cron.
            </p>
          ) : statusSummary.down > 0 ? (
            <p className="text-sm font-medium text-red-800 mb-4">
              🔴 {statusSummary.down} service{statusSummary.down === 1 ? '' : 's'} down
            </p>
          ) : statusSummary.degraded > 0 ? (
            <p className="text-sm font-medium text-amber-800 mb-4">
              ⚠️ {statusSummary.degraded} service{statusSummary.degraded === 1 ? '' : 's'} degraded
            </p>
          ) : (
            <p className="text-sm font-medium text-green-800 mb-4">✅ All systems operational</p>
          )}

          <div className={adminTableWrapClass}>
            <table className="min-w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className={adminThClass}>Service</th>
                  <th className={adminThClass}>Status</th>
                  <th className={adminThClass}>Message</th>
                  <th className={adminThClass}>Last Checked</th>
                </tr>
              </thead>
              <tbody>
                {MONITORED_SERVICE_NAMES.map((name) => {
                  const row = opsByService.get(name)
                  return (
                    <tr key={name}>
                      <td className={adminTdClass}>
                        <span className="font-medium text-gray-900">{SERVICE_DISPLAY_LABEL[name]}</span>
                      </td>
                      <td className={adminTdClass}>
                        <OpsStatusBadge status={row?.status ?? null} />
                      </td>
                      <td className={`${adminTdClass} max-w-md`}>
                        <span className="text-gray-700 break-words">{row?.message?.trim() ? row.message : '—'}</span>
                      </td>
                      <td className={`${adminTdClass} whitespace-nowrap text-gray-700`}>
                        {row?.checked_at ? formatRelativeCheckedAt(row.checked_at, statusNow) : opsLoading ? '…' : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {appsTab === 'incidents' ? (
        <div id="apps-panel-incidents" role="tabpanel" aria-labelledby="apps-tab-incidents">
          <div className="mt-0">
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Incident Log</h2>
            {incidentsLoading && incidents.length === 0 ? (
              <p className="text-sm text-gray-500 mt-3">Loading incidents…</p>
            ) : incidents.length === 0 ? (
              <p className="text-sm text-gray-600 mt-3">No incidents recorded — all systems have been operational.</p>
            ) : (
              <div className={`${adminTableWrapClass} mt-4`}>
                <table className="min-w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <th className={adminThClass}>Service</th>
                      <th className={adminThClass}>Status</th>
                      <th className={adminThClass}>Message</th>
                      <th className={adminThClass}>Started</th>
                      <th className={adminThClass}>Resolved</th>
                      <th className={adminThClass}>Comment</th>
                      <th className={adminThClass}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((row) => (
                      <tr key={row.id}>
                        <td className={adminTdClass}>
                          <span className="font-medium text-gray-900">{row.service_name}</span>
                        </td>
                        <td className={adminTdClass}>
                          <IncidentStatusBadge status={row.status} />
                        </td>
                        <td className={`${adminTdClass} max-w-xs`}>
                          <span className="text-gray-700 break-words">{row.message ?? '—'}</span>
                        </td>
                        <td className={`${adminTdClass} whitespace-nowrap tabular-nums text-gray-700`}>
                          {formatIncidentAt(row.created_at)}
                        </td>
                        <td className={adminTdClass}>
                          {row.resolved_at ? (
                            <span className="tabular-nums text-gray-700 whitespace-nowrap">{formatIncidentAt(row.resolved_at)}</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </td>
                        <td className={adminTdClass}>
                          <IncidentCommentCell row={row} onSaved={() => void loadIncidents()} />
                        </td>
                        <td className={adminTdClass}>
                          <IncidentMarkResolved row={row} onSaved={() => void loadIncidents()} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {editing ? (
        <VendorEditModal row={editing} onClose={() => setEditing(null)} onSaved={() => void load()} />
      ) : null}
    </div>
  )
}
