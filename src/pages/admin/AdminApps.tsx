import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminCardClass } from './adminUi'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { getValidAccessTokenForFunctions } from '../../lib/supabaseEdgeInvoke'
import { readSupabaseFunctionInvokeError } from '../../lib/readSupabaseFunctionInvokeError'
import type { Database } from '../../lib/database.types'

type HealthResult = {
  service: string
  status: 'operational' | 'degraded' | 'down'
  message: string
}

/** Maps vendor card titles to operational_status.service_name / health check keys. */
function vendorTitleToHealthService(title: string): string | null {
  const t = title.toLowerCase()
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

type AppsGridItem =
  | { kind: 'appledeveloper'; sortKey: string }
  | { kind: 'firebase'; sortKey: string }
  | { kind: 'googleplay'; sortKey: string }
  | { kind: 'vendor'; sortKey: string; row: VendorRow }

function buildSortedAppsGridItems(rows: VendorRow[]): AppsGridItem[] {
  const items: AppsGridItem[] = [
    { kind: 'appledeveloper', sortKey: 'Apple Developer' },
    { kind: 'firebase', sortKey: 'Firebase' },
    { kind: 'googleplay', sortKey: 'Google Play Console' },
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

function FirebaseAppCard({ linkClass }: { linkClass: string }) {
  return (
    <div
      className={`${adminCardClass} flex flex-col transition-shadow hover:shadow-md hover:border-amber-100/90 border-amber-100/50 bg-amber-50/20 relative`}
    >
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
  }, [])

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
  }, [load])

  useEffect(() => {
    void loadHealth()
    const id = window.setInterval(() => void loadHealth(), HEALTH_POLL_MS)
    return () => window.clearInterval(id)
  }, [loadHealth])

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

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Apps</h1>
          <p className="text-sm text-gray-500 mt-1">
            External tools for running Quni Living — costs are stored in Supabase and editable below. Apple Developer,
            Firebase, and Google Play Console are fixed shortcuts for the native app stack; all cards are sorted A–Z by
            name.
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
              return <FirebaseAppCard key="firebase" linkClass={linkClass} />
            }
            if (item.kind === 'googleplay') {
              return <GooglePlayAppCard key="googleplay" linkClass={linkClass} />
            }

            const row = item.row
            const sub = rowToSubscription(row)
            const billingHref = sub.billingHref?.trim()

            return (
              <div
                key={row.id}
                className={`${adminCardClass} flex flex-col transition-shadow hover:shadow-md hover:border-indigo-100 relative`}
              >
                <HealthStatusDot serviceKey={vendorTitleToHealthService(row.title)} results={healthResults} />
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

      {editing ? (
        <VendorEditModal row={editing} onClose={() => setEditing(null)} onSaved={() => void load()} />
      ) : null}
    </div>
  )
}
