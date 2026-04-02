import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminCardClass } from './adminUi'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

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

export default function AdminApps() {
  const [rows, setRows] = useState<VendorRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<VendorRow | null>(null)

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
      .order('title', { ascending: true })
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

  const totalMonthlyAudApprox = useMemo(() => {
    if (!rows?.length) return 0
    return rows.reduce((sum, r) => sum + monthlyAudApprox(r), 0)
  }, [rows])

  const totalFormatted = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: totalMonthlyAudApprox % 1 === 0 ? 0 : 2,
  }).format(totalMonthlyAudApprox)

  const linkClass =
    'text-xs text-indigo-600 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 rounded'

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Apps</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">External tools for running Quni Living — costs are stored in Supabase and editable below.</p>

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
        <p className="text-sm text-gray-600">No active vendors. Add rows in Supabase or run the latest migration.</p>
      ) : null}

      {!loading && rows && rows.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const sub = rowToSubscription(row)
            const billingHref = sub.billingHref?.trim()

            return (
              <div
                key={row.id}
                className={`${adminCardClass} flex flex-col transition-shadow hover:shadow-md hover:border-indigo-100 relative`}
              >
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
