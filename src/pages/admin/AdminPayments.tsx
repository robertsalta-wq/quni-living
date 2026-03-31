import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthContext } from '../../context/AuthContext'
import type { Database } from '../../lib/database.types'
import {
  adminCardClass,
  adminTableWrapClass,
  adminTdClass,
  adminThClass,
  formatAudCents,
  formatDate,
  studentDisplayName,
} from './adminUi'

type PaymentRow = Database['public']['Tables']['payments']['Row'] & {
  bookings: {
    id: string
    stripe_payment_intent_id: string | null
    end_date: string | null
    move_in_date: string | null
    weekly_rent: number | null
    student_profiles: {
      id: string
      user_id: string
      full_name: string | null
      first_name: string | null
      last_name: string | null
    } | null
    landlord_profiles: {
      id: string
      user_id: string
      full_name: string | null
      first_name: string | null
      last_name: string | null
      company_name: string | null
    } | null
    properties: {
      address: string | null
      suburb: string | null
      state: string | null
      postcode: string | null
    } | null
  } | null
}

type BookingSubRow = Database['public']['Tables']['bookings']['Row'] & {
  student_profiles: {
    id: string
    user_id: string
    full_name: string | null
    first_name: string | null
    last_name: string | null
  } | null
  landlord_profiles: {
    id: string
    user_id: string
    full_name: string | null
    first_name: string | null
    last_name: string | null
    company_name: string | null
  } | null
  properties: {
    address: string | null
    suburb: string | null
    state: string | null
    postcode: string | null
  } | null
}

type BondRow = Database['public']['Tables']['bonds']['Row'] & {
  student_profiles: {
    id: string
    full_name: string | null
    first_name: string | null
    last_name: string | null
  } | null
  landlord_profiles: {
    id: string
    full_name: string | null
    company_name: string | null
  } | null
  properties: {
    address: string | null
    suburb: string | null
    state: string | null
  } | null
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'refunds', label: 'Refunds' },
  { id: 'fees', label: 'Fee settings' },
  { id: 'xero', label: 'Xero' },
  { id: 'bonds', label: 'Bonds' },
] as const

type TabId = (typeof TABS)[number]['id']

const coralBtnClass =
  'inline-flex items-center justify-center rounded-lg bg-[#FF6F61] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed'

const coralOutlineBtnClass =
  'inline-flex items-center justify-center rounded-lg border border-[#FF6F61] text-[#FF6F61] px-4 py-2 text-sm font-semibold hover:bg-[#FF6F61]/5 disabled:opacity-50'

function landlordDisplayName(row: {
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
}): string {
  const fn = row.first_name?.trim() ?? ''
  const ln = row.last_name?.trim() ?? ''
  if (fn || ln) return [fn, ln].filter(Boolean).join(' ')
  if (row.full_name?.trim()) return row.full_name.trim()
  if (row.company_name?.trim()) return row.company_name.trim()
  return '—'
}

function propertyLine(p: {
  address?: string | null
  suburb?: string | null
  state?: string | null
  postcode?: string | null
} | null): string {
  if (!p) return '—'
  const parts = [p.address, p.suburb, p.state, p.postcode].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}

function paymentTypeLabel(t: string | null | undefined): string {
  switch (t) {
    case 'deposit':
      return 'Deposit'
    case 'rent':
      return 'Weekly rent'
    case 'platform_fee':
      return 'Platform fee'
    case 'refund':
      return 'Refund'
    default:
      return t?.replace(/_/g, ' ') || '—'
  }
}

function truncateId(id: string, keep = 10): string {
  if (id.length <= keep + 3) return id
  return `${id.slice(0, keep)}…`
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    window.prompt('Copy:', text)
  }
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, 1))
  return dt.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
}

export default function AdminPayments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as TabId | null
  const activeTab: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : 'overview'

  function setTab(id: TabId) {
    setSearchParams({ tab: id }, { replace: true })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payments</h1>
      <p className="text-sm text-gray-500 mt-1 mb-4">
        Platform revenue, transactions, subscriptions, refunds, fees, Xero, and bond records.
      </p>

      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-px mb-6">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={[
              'rounded-t-lg px-3 py-2 text-sm font-medium transition-colors',
              activeTab === id
                ? 'bg-white text-indigo-800 border border-b-0 border-gray-200 -mb-px'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'transactions' && <TransactionsTab />}
      {activeTab === 'subscriptions' && <SubscriptionsTab />}
      {activeTab === 'refunds' && <RefundsTab />}
      {activeTab === 'fees' && <FeeSettingsTab />}
      {activeTab === 'xero' && <XeroTab />}
      {activeTab === 'bonds' && <BondsTab />}
    </div>
  )
}

function OverviewTab() {
  const [payments, setPayments] = useState<Database['public']['Tables']['payments']['Row'][]>([])
  const [bookings, setBookings] = useState<Database['public']['Tables']['bookings']['Row'][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    const [pRes, bRes] = await Promise.all([
      supabase.from('payments').select('*').order('paid_at', { ascending: false }),
      supabase
        .from('bookings')
        .select(
          'id, status, deposit_amount, deposit_released_at, stripe_subscription_id, stripe_subscription_status',
        ),
    ])
    const errMsg = pRes.error?.message || bRes.error?.message || null
    setError(errMsg)
    if (pRes.error) {
      setPayments([])
    } else {
      setPayments((pRes.data ?? []) as Database['public']['Tables']['payments']['Row'][])
    }
    if (bRes.error) {
      setBookings([])
    } else {
      setBookings((bRes.data ?? []) as Database['public']['Tables']['bookings']['Row'][])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    const now = new Date()
    const thisMonthStart = startOfMonth(now)
    const thisMonthKey = monthKey(thisMonthStart)

    const succeeded = payments.filter((p) => p.status === 'succeeded')
    const feesThisMonth = succeeded
      .filter((p) => {
        if (!p.paid_at) return false
        return monthKey(new Date(p.paid_at)) === thisMonthKey
      })
      .reduce((s, p) => s + (p.amount_platform_fee ?? 0), 0)

    const feesAllTime = succeeded.reduce((s, p) => s + (p.amount_platform_fee ?? 0), 0)

    const activeSubs = bookings.filter(
      (b) =>
        b.stripe_subscription_id?.trim() &&
        ['active', 'trialing', 'past_due'].includes((b.stripe_subscription_status || '').toLowerCase()),
    ).length

    const depositsHeldCents = bookings
      .filter(
        (b) =>
          (b.status === 'pending_confirmation' || b.status === 'confirmed' || b.status === 'active') &&
          !b.deposit_released_at &&
          typeof b.deposit_amount === 'number',
      )
      .reduce((s, b) => s + (b.deposit_amount ?? 0), 0)

    const byBooking = new Map<string, number>()
    for (const p of succeeded) {
      if (!p.booking_id || !(p.amount_platform_fee && p.amount_platform_fee > 0)) continue
      byBooking.set(p.booking_id, (byBooking.get(p.booking_id) ?? 0) + (p.amount_platform_fee ?? 0))
    }
    const avgFee =
      byBooking.size > 0
        ? [...byBooking.values()].reduce((a, b) => a + b, 0) / byBooking.size
        : 0

    const chartMonths: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      chartMonths.push(monthKey(d))
    }
    const chartData = chartMonths.map((key) => {
      const revenue = succeeded
        .filter((p) => p.paid_at && monthKey(new Date(p.paid_at)) === key)
        .reduce((s, p) => s + (p.amount_platform_fee ?? 0), 0)
      return { month: monthLabel(key), revenueAud: revenue / 100 }
    })

    return {
      feesThisMonth,
      feesAllTime,
      activeSubs,
      depositsHeldCents,
      avgFeeCents: avgFee,
      chartData,
    }
  }, [payments, bookings])

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className={adminCardClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Revenue this month</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatAudCents(stats.feesThisMonth)}</p>
          <p className="text-xs text-gray-500 mt-1">Platform fees collected (succeeded payments)</p>
        </div>
        <div className={adminCardClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Revenue all time</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatAudCents(stats.feesAllTime)}</p>
        </div>
        <div className={adminCardClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Active rent subscriptions</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.activeSubs}</p>
        </div>
        <div className={adminCardClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Deposits held</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatAudCents(stats.depositsHeldCents)}</p>
          <p className="text-xs text-gray-500 mt-1">Bookings not yet released (uncaptured context)</p>
        </div>
        <div className={adminCardClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Avg platform fee / booking</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatAudCents(Math.round(stats.avgFeeCents))}</p>
          <p className="text-xs text-gray-500 mt-1">Across bookings with fee ledger rows</p>
        </div>
      </div>

      <div className={adminCardClass}>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Month-on-month platform fee revenue</h2>
        {stats.chartData.every((d) => d.revenueAud === 0) ? (
          <p className="text-sm text-gray-500 py-8 text-center">No revenue data in the last 6 months.</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) =>
                    `$${Number(v).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
                  }
                />
                <Tooltip
                  formatter={(value: number) => [
                    `$${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    'Platform fees',
                  ]}
                />
                <Bar dataKey="revenueAud" fill="#FF6F61" radius={[4, 4, 0, 0]} name="Revenue (AUD)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

const PAGE_SIZE = 25

function TransactionsTab() {
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [nameSearch, setNameSearch] = useState('')

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('payments')
      .select(
        `
          *,
          bookings (
            id,
            stripe_payment_intent_id,
            end_date,
            move_in_date,
            weekly_rent,
            student_profiles ( id, user_id, full_name, first_name, last_name ),
            landlord_profiles ( id, user_id, full_name, first_name, last_name, company_name ),
            properties ( address, suburb, state, postcode )
          )
        `,
      )
      .order('created_at', { ascending: false })
    if (fetchError) {
      setError(fetchError.message)
      setRows([])
    } else {
      setRows((data ?? []) as PaymentRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = nameSearch.trim().toLowerCase()
    return rows.filter((r) => {
      if (typeFilter && (r.payment_type || '') !== typeFilter) return false
      if (statusFilter && (r.status || '') !== statusFilter) return false
      const paid = r.paid_at?.slice(0, 10) || r.created_at?.slice(0, 10) || ''
      if (dateFrom && paid && paid < dateFrom) return false
      if (dateTo && paid && paid > dateTo) return false
      if (q) {
        const sp = r.bookings?.student_profiles
        const lp = r.bookings?.landlord_profiles
        const sn = studentDisplayName(sp ?? {}).toLowerCase()
        const ln = landlordDisplayName(lp ?? {}).toLowerCase()
        if (!sn.includes(q) && !ln.includes(q)) return false
      }
      return true
    })
  }, [rows, typeFilter, statusFilter, dateFrom, dateTo, nameSearch])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSafe = Math.min(page, pageCount - 1)
  const slice = filtered.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE)

  function exportCsv() {
    const headers = [
      'Date',
      'Student',
      'Landlord',
      'Property',
      'Type',
      'Gross',
      'Platform fee',
      'Landlord payout',
      'Status',
      'Payment Intent',
    ]
    const lines = [
      headers.join(','),
      ...filtered.map((r) => {
        const paid = r.paid_at || r.created_at || ''
        const sp = r.bookings?.student_profiles
        const lp = r.bookings?.landlord_profiles
        const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
        return [
          esc(paid),
          esc(studentDisplayName(sp ?? {})),
          esc(landlordDisplayName(lp ?? {})),
          esc(propertyLine(r.bookings?.properties ?? null)),
          esc(paymentTypeLabel(r.payment_type)),
          esc(String((r.amount_total ?? 0) / 100)),
          esc(String((r.amount_platform_fee ?? 0) / 100)),
          esc(String((r.amount_landlord_payout ?? 0) / 100)),
          esc(r.status || ''),
          esc(r.stripe_payment_intent_id || ''),
        ].join(',')
      }),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `quni-payments-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setPage(0)
              setDateFrom(e.target.value)
            }}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setPage(0)
              setDateTo(e.target.value)
            }}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setPage(0)
              setTypeFilter(e.target.value)
            }}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm min-w-[140px]"
          >
            <option value="">All</option>
            <option value="deposit">Deposit</option>
            <option value="rent">Weekly rent</option>
            <option value="platform_fee">Platform fee</option>
            <option value="refund">Refund</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(0)
              setStatusFilter(e.target.value)
            }}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm min-w-[140px]"
          >
            <option value="">All</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Search student / landlord</label>
          <input
            type="search"
            value={nameSearch}
            onChange={(e) => {
              setPage(0)
              setNameSearch(e.target.value)
            }}
            placeholder="Name…"
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
          />
        </div>
        <button type="button" onClick={exportCsv} className={coralOutlineBtnClass}>
          Export CSV
        </button>
      </div>

      <div className={adminTableWrapClass}>
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={adminThClass}>Date</th>
                <th className={adminThClass}>Student</th>
                <th className={adminThClass}>Landlord</th>
                <th className={adminThClass}>Property</th>
                <th className={adminThClass}>Type</th>
                <th className={adminThClass}>Gross</th>
                <th className={adminThClass}>Platform fee</th>
                <th className={adminThClass}>Landlord</th>
                <th className={adminThClass}>Status</th>
                <th className={adminThClass}>PI</th>
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={10} className={`${adminTdClass} text-center text-gray-500 py-10`}>
                    No payments match your filters.
                  </td>
                </tr>
              ) : (
                slice.map((r) => {
                  const sp = r.bookings?.student_profiles
                  const lp = r.bookings?.landlord_profiles
                  const pi = r.stripe_payment_intent_id?.trim() || ''
                  const paid = r.paid_at || r.created_at
                  return (
                    <tr key={r.id}>
                      <td className={adminTdClass}>{formatDate(paid)}</td>
                      <td className={adminTdClass}>
                        {sp ? (
                          <Link
                            to={`/admin/students?profile=${sp.id}`}
                            className="font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            {studentDisplayName(sp)}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={adminTdClass}>
                        {lp ? (
                          <Link
                            to={`/admin/landlords?profile=${lp.id}`}
                            className="font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            {landlordDisplayName(lp)}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={adminTdClass}>{propertyLine(r.bookings?.properties ?? null)}</td>
                      <td className={adminTdClass}>{paymentTypeLabel(r.payment_type)}</td>
                      <td className={adminTdClass}>{formatAudCents(r.amount_total)}</td>
                      <td className={adminTdClass}>{formatAudCents(r.amount_platform_fee)}</td>
                      <td className={adminTdClass}>{formatAudCents(r.amount_landlord_payout)}</td>
                      <td className={adminTdClass}>
                        <span className="capitalize">{r.status || '—'}</span>
                      </td>
                      <td className={adminTdClass}>
                        {pi ? (
                          <button
                            type="button"
                            className="font-mono text-xs text-indigo-600 hover:underline"
                            title="Copy full ID"
                            onClick={() => void copyText(pi)}
                          >
                            {truncateId(pi)}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            Page {pageSafe + 1} of {pageCount} ({filtered.length} rows)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pageSafe <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pageSafe >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SubscriptionsTab() {
  const { user } = useAuthContext()
  const [rows, setRows] = useState<BookingSubRow[]>([])
  const [stripeDates, setStripeDates] = useState<Record<string, { currentPeriodEnd: number | null; status: string | null }>>(
    {},
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('bookings')
      .select(
        `
          *,
          student_profiles ( id, user_id, full_name, first_name, last_name ),
          landlord_profiles ( id, user_id, full_name, first_name, last_name, company_name ),
          properties ( address, suburb, state, postcode )
        `,
      )
      .not('stripe_subscription_id', 'is', null)
      .order('created_at', { ascending: false })
    if (fetchError) {
      setError(fetchError.message)
      setRows([])
    } else {
      setRows((data ?? []) as BookingSubRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!user || rows.length === 0) return
    let cancelled = false
    ;(async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) return
      const ids = rows.map((r) => r.id).slice(0, 50)
      const res = await fetch('/api/admin-subscription-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingIds: ids }),
      })
      const j = (await res.json()) as { dates?: typeof stripeDates }
      if (!cancelled && j.dates) setStripeDates(j.dates)
    })()
    return () => {
      cancelled = true
    }
  }, [user, rows])

  async function confirmCancel(bookingId: string) {
    setCancelBusy(true)
    setError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session expired')
      const res = await fetch('/api/admin-cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(j.error || 'Cancel failed')
      setCancelId(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed')
    } finally {
      setCancelBusy(false)
    }
  }

  const activeRows = rows.filter((b) => {
    const st = (b.stripe_subscription_status || '').toLowerCase()
    return ['active', 'trialing', 'past_due'].includes(st)
  })

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className={adminTableWrapClass}>
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={adminThClass}>Student</th>
                <th className={adminThClass}>Landlord</th>
                <th className={adminThClass}>Property</th>
                <th className={adminThClass}>Weekly rent</th>
                <th className={adminThClass}>Fee %</th>
                <th className={adminThClass}>Start</th>
                <th className={adminThClass}>Next payment</th>
                <th className={adminThClass}>Lease end</th>
                <th className={adminThClass}>Status</th>
                <th className={adminThClass}>Subscription</th>
                <th className={adminThClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className={`${adminTdClass} text-center text-gray-500 py-10`}>
                    No active rent subscriptions.
                  </td>
                </tr>
              ) : (
                activeRows.map((b) => {
                  const sp = b.student_profiles
                  const lp = b.landlord_profiles
                  const subId = b.stripe_subscription_id?.trim() || ''
                  const nextMs = stripeDates[b.id]?.currentPeriodEnd
                  return (
                    <tr key={b.id}>
                      <td className={adminTdClass}>
                        {sp ? (
                          <Link
                            to={`/admin/students?profile=${sp.id}`}
                            className="font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            {studentDisplayName(sp)}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={adminTdClass}>
                        {lp ? (
                          <Link
                            to={`/admin/landlords?profile=${lp.id}`}
                            className="font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            {landlordDisplayName(lp)}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={adminTdClass}>{propertyLine(b.properties)}</td>
                      <td className={adminTdClass}>
                        {b.weekly_rent != null
                          ? formatAudCents(Math.round(Number(b.weekly_rent) * 100))
                          : '—'}
                      </td>
                      <td className={adminTdClass}>8.00%</td>
                      <td className={adminTdClass}>{formatDate(b.move_in_date || b.start_date)}</td>
                      <td className={adminTdClass}>
                        {nextMs ? formatDate(new Date(nextMs).toISOString()) : '—'}
                      </td>
                      <td className={adminTdClass}>{formatDate(b.end_date)}</td>
                      <td className={adminTdClass}>
                        <span className="capitalize">{b.stripe_subscription_status || '—'}</span>
                      </td>
                      <td className={adminTdClass}>
                        {subId ? (
                          <button
                            type="button"
                            className="font-mono text-xs text-indigo-600 hover:underline"
                            onClick={() => void copyText(subId)}
                          >
                            {truncateId(subId, 12)}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={adminTdClass}>
                        <div className="flex flex-col gap-1">
                          <Link
                            to={`/admin/bookings?highlight=${b.id}`}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            View booking details
                          </Link>
                          <button
                            type="button"
                            className="text-xs font-medium text-red-700 hover:underline text-left"
                            onClick={() => setCancelId(b.id)}
                          >
                            Cancel subscription
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {cancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900">Cancel subscription?</h3>
            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to cancel this subscription? This will stop all future rent payments.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
                onClick={() => setCancelId(null)}
                disabled={cancelBusy}
              >
                Back
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                onClick={() => void confirmCancel(cancelId)}
                disabled={cancelBusy}
              >
                {cancelBusy ? 'Cancelling…' : 'Cancel subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const REFUND_REASONS = [
  { value: 'Landlord declined', label: 'Landlord declined' },
  { value: 'Booking cancelled', label: 'Booking cancelled' },
  { value: 'Dispute resolution', label: 'Dispute resolution' },
  { value: 'Other', label: 'Other' },
] as const

function RefundsTab() {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [booking, setBooking] = useState<BookingSubRow | null>(null)
  const [ledgerPayment, setLedgerPayment] = useState<Database['public']['Tables']['payments']['Row'] | null>(null)
  const [amountAud, setAmountAud] = useState('')
  const [reason, setReason] = useState<string>(REFUND_REASONS[0].value)
  const [notes, setNotes] = useState('')
  const [submitBusy, setSubmitBusy] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function runSearch() {
    const q = query.trim()
    if (!q) return
    if (!isSupabaseConfigured) return
    setSearching(true)
    setSearchError(null)
    setBooking(null)
    setLedgerPayment(null)
    setSuccessMsg(null)
    try {
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      let b: BookingSubRow | null = null

      if (uuidRe.test(q)) {
        const { data } = await supabase
          .from('bookings')
          .select(
            `
            *,
            student_profiles ( id, user_id, full_name, first_name, last_name ),
            landlord_profiles ( id, user_id, full_name, first_name, last_name, company_name ),
            properties ( address, suburb, state, postcode )
          `,
          )
          .eq('id', q)
          .maybeSingle()
        b = data as BookingSubRow | null
      } else if (q.startsWith('pi_')) {
        let data = (
          await supabase
            .from('bookings')
            .select(
              `
            *,
            student_profiles ( id, user_id, full_name, first_name, last_name ),
            landlord_profiles ( id, user_id, full_name, first_name, last_name, company_name ),
            properties ( address, suburb, state, postcode )
          `,
            )
            .eq('stripe_payment_intent_id', q)
            .maybeSingle()
        ).data as BookingSubRow | null
        if (!data) {
          const { data: pay } = await supabase.from('payments').select('booking_id').eq('stripe_payment_intent_id', q).maybeSingle()
          const bid = pay?.booking_id?.trim()
          if (bid) {
            const { data: b2 } = await supabase
              .from('bookings')
              .select(
                `
            *,
            student_profiles ( id, user_id, full_name, first_name, last_name ),
            landlord_profiles ( id, user_id, full_name, first_name, last_name, company_name ),
            properties ( address, suburb, state, postcode )
          `,
              )
              .eq('id', bid)
              .maybeSingle()
            data = b2 as BookingSubRow | null
          }
        }
        b = data
      } else {
        const { data: profiles } = await supabase
          .from('student_profiles')
          .select('id')
          .or(
            `full_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`,
          )
          .limit(20)
        const ids = (profiles ?? []).map((p) => p.id)
        if (ids.length === 0) {
          setSearchError('No booking found for that search.')
          setSearching(false)
          return
        }
        const { data: bookings } = await supabase
          .from('bookings')
          .select(
            `
            *,
            student_profiles ( id, user_id, full_name, first_name, last_name ),
            landlord_profiles ( id, user_id, full_name, first_name, last_name, company_name ),
            properties ( address, suburb, state, postcode )
          `,
          )
          .in('student_id', ids)
          .order('created_at', { ascending: false })
          .limit(1)
        const first = bookings?.[0]
        b = first ? (first as BookingSubRow) : null
      }

      if (!b) {
        setSearchError('No booking found.')
        setSearching(false)
        return
      }

      setBooking(b)
      const { data: pays } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', b.id)
        .order('created_at', { ascending: false })
      const list = (pays ?? []) as Database['public']['Tables']['payments']['Row'][]
      const qPi = query.trim().startsWith('pi_') ? query.trim() : ''
      const matchedPi = qPi ? list.find((p) => p.stripe_payment_intent_id?.trim() === qPi) : null
      const depositPay =
        matchedPi ??
        list.find((p) => p.payment_type === 'deposit' && p.status === 'succeeded') ??
        list[0] ??
        null
      setLedgerPayment(depositPay)
      const pi = depositPay?.stripe_payment_intent_id?.trim() || b.stripe_payment_intent_id?.trim()
      if (pi) {
        const cents = depositPay?.amount_total ?? b.deposit_amount ?? 0
        setAmountAud((cents / 100).toFixed(2))
      } else {
        setAmountAud(b.deposit_amount != null ? (b.deposit_amount / 100).toFixed(2) : '0.00')
      }
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function submitRefund() {
    const pi =
      ledgerPayment?.stripe_payment_intent_id?.trim() || booking?.stripe_payment_intent_id?.trim() || ''
    if (!pi) {
      setSearchError('No payment intent found for refund (check payments ledger).')
      return
    }
    const aud = Number(amountAud)
    if (!Number.isFinite(aud) || aud <= 0) {
      setSearchError('Enter a valid refund amount.')
      return
    }
    setSubmitBusy(true)
    setSearchError(null)
    setSuccessMsg(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session expired')
      const res = await fetch('/api/admin-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          paymentIntentId: pi,
          amountCents: Math.round(aud * 100),
          reason,
          notes,
        }),
      })
      const j = (await res.json()) as { error?: string; stripeRefundId?: string; amountRefundedCents?: number }
      if (!res.ok) throw new Error(j.error || 'Refund failed')
      setSuccessMsg(
        `Refund issued. Stripe refund ID: ${j.stripeRefundId ?? '—'} (${formatAudCents(j.amountRefundedCents ?? 0)}).`,
      )
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Refund failed')
    } finally {
      setSubmitBusy(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Search by student name, booking ID, or Stripe Payment Intent ID
        </label>
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="e.g. pi_… or booking UUID"
          />
          <button type="button" className={coralBtnClass} onClick={() => void runSearch()} disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
        {searchError && <p className="text-sm text-red-600 mt-2">{searchError}</p>}
      </div>

      {booking && (
        <div className={`${adminCardClass} space-y-4`}>
          <h2 className="text-sm font-semibold text-gray-900">Booking summary</h2>
          <dl className="grid grid-cols-1 gap-2 text-sm">
            <div>
              <dt className="text-gray-500">Student</dt>
              <dd className="font-medium">{studentDisplayName(booking.student_profiles ?? {})}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Landlord</dt>
              <dd className="font-medium">{landlordDisplayName(booking.landlord_profiles ?? {})}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Property</dt>
              <dd>{propertyLine(booking.properties)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Amount paid (ledger)</dt>
              <dd>{formatAudCents(ledgerPayment?.amount_total ?? booking.deposit_amount ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Date</dt>
              <dd>{formatDate(ledgerPayment?.paid_at ?? booking.created_at)}</dd>
            </div>
          </dl>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Refund amount (AUD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amountAud}
              onChange={(e) => setAmountAud(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {REFUND_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            className={coralBtnClass}
            onClick={() => void submitRefund()}
            disabled={
              submitBusy ||
              !(ledgerPayment?.stripe_payment_intent_id?.trim() || booking.stripe_payment_intent_id?.trim())
            }
          >
            {submitBusy ? 'Processing…' : 'Issue refund'}
          </button>
          {successMsg && <p className="text-sm text-emerald-700">{successMsg}</p>}
        </div>
      )}
    </div>
  )
}

function FeeSettingsTab() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [landlordPct, setLandlordPct] = useState('5')
  const [studentPct, setStudentPct] = useState('3')
  const [studentBookingFee, setStudentBookingFee] = useState('49')
  const [landlordAccept, setLandlordAccept] = useState('0')

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    const { data, error: fErr } = await supabase.from('platform_settings').select('key, value')
    if (fErr) {
      setError(fErr.message)
    } else {
      const map = new Map((data ?? []).map((r) => [r.key, r.value]))
      setLandlordPct(map.get('landlord_service_fee_pct') ?? '5')
      setStudentPct(map.get('student_platform_fee_pct') ?? '3')
      setStudentBookingFee(map.get('student_booking_processing_fee_aud') ?? '49')
      setLandlordAccept(map.get('landlord_acceptance_fee_aud') ?? '0')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    setSaving(true)
    setError(null)
    const { data: sessionData } = await supabase.auth.getSession()
    const uid = sessionData.session?.user?.id ?? null
    const rows = [
      { key: 'landlord_service_fee_pct', value: landlordPct.trim(), updated_by: uid },
      { key: 'student_platform_fee_pct', value: studentPct.trim(), updated_by: uid },
      { key: 'student_booking_processing_fee_aud', value: studentBookingFee.trim(), updated_by: uid },
      { key: 'landlord_acceptance_fee_aud', value: landlordAccept.trim(), updated_by: uid },
    ]
    for (const r of rows) {
      const { error: uErr } = await supabase
        .from('platform_settings')
        .update({ value: r.value, updated_by: r.updated_by, updated_at: new Date().toISOString() })
        .eq('key', r.key)
      if (uErr) {
        setError(uErr.message)
        setSaving(false)
        return
      }
    }
    setSaving(false)
    await load()
  }

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-md space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}
      <div className={adminCardClass + ' space-y-4'}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Landlord service fee (%)</label>
          <input
            type="number"
            step="0.01"
            value={landlordPct}
            onChange={(e) => setLandlordPct(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Student platform fee (%)</label>
          <input
            type="number"
            step="0.01"
            value={studentPct}
            onChange={(e) => setStudentPct(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Student booking processing fee ($)</label>
          <input
            type="number"
            step="0.01"
            value={studentBookingFee}
            onChange={(e) => setStudentBookingFee(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Landlord acceptance fee ($)</label>
          <input
            type="number"
            step="0.01"
            value={landlordAccept}
            onChange={(e) => setLandlordAccept(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <button type="button" className={coralBtnClass} onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
      <p className="text-sm text-gray-600">
        Fee changes apply to new bookings only. Existing subscriptions continue at the rate locked in at booking time.
      </p>
    </div>
  )
}

function XeroTab() {
  const { user } = useAuthContext()
  const [connected, setConnected] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [connectedAt, setConnectedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setLoading(false)
        return
      }
      const res = await fetch('/api/admin-xero-status', { headers: { Authorization: `Bearer ${token}` } })
      const j = (await res.json()) as { connected?: boolean; lastSyncAt?: string | null; connectedAt?: string | null }
      if (!cancelled && res.ok) {
        setConnected(Boolean(j.connected))
        setLastSync(j.lastSyncAt ?? null)
        setConnectedAt(j.connectedAt ?? null)
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div className={`${adminCardClass} max-w-lg space-y-4`}>
      <h2 className="text-sm font-semibold text-gray-900">Xero</h2>
      {loading ? (
        <p className="text-sm text-gray-500">Loading status…</p>
      ) : (
        <>
          <p className="text-sm text-gray-700">
            Connection status:{' '}
            <strong>{connected ? 'Connected' : 'Not connected'}</strong>
          </p>
          {connectedAt && (
            <p className="text-sm text-gray-600">Connected at: {formatDate(connectedAt)}</p>
          )}
          {lastSync && <p className="text-sm text-gray-600">Last sync: {formatDate(lastSync)}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={coralBtnClass} onClick={() => window.alert('Xero OAuth will be available when integration ships.')}>
              Connect to Xero
            </button>
            <button type="button" className={coralOutlineBtnClass} disabled={!connected}>
              Sync now
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Full sync is not enabled yet. Placeholder API routes: <code className="text-xs">/api/xero/connect</code>,{' '}
            <code className="text-xs">/api/xero/sync</code> (501).
          </p>
        </>
      )}
    </div>
  )
}

function BondsTab() {
  const [rows, setRows] = useState<BondRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [editRef, setEditRef] = useState<{ id: string; value: string } | null>(null)
  const [disputeRow, setDisputeRow] = useState<BondRow | null>(null)
  const [disputeNotes, setDisputeNotes] = useState('')

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    const { data, error: fErr } = await supabase
      .from('bonds')
      .select(
        `
        *,
        student_profiles ( id, full_name, first_name, last_name ),
        landlord_profiles ( id, full_name, company_name ),
        properties ( address, suburb, state )
      `,
      )
      .order('created_at', { ascending: false })
    if (fErr) {
      setError(fErr.message)
      setRows([])
    } else {
      setRows((data ?? []) as BondRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (!statusFilter) return rows
    return rows.filter((r) => r.bond_status === statusFilter)
  }, [rows, statusFilter])

  async function updateBond(id: string, patch: Record<string, unknown>) {
    const { error: uErr } = await supabase.from('bonds').update(patch).eq('id', id)
    if (uErr) setError(uErr.message)
    else await load()
  }

  function exportBondsCsv() {
    const headers = [
      'Created',
      'Student',
      'Landlord',
      'Property',
      'State',
      'Amount',
      'Type',
      'Status',
      'Reference',
    ]
    const lines = [
      headers.join(','),
      ...filtered.map((r) => {
        const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`
        return [
          esc(r.created_at || ''),
          esc(studentDisplayName(r.student_profiles ?? {})),
          esc(landlordDisplayName(r.landlord_profiles ?? {})),
          esc(propertyLine(r.properties)),
          esc(r.state || ''),
          esc(String((r.bond_amount ?? 0) / 100)),
          esc(r.bond_type || ''),
          esc(r.bond_status || ''),
          esc(r.lodgement_reference || ''),
        ].join(',')
      }),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `quni-bonds-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="pending_lodgement">Pending lodgement</option>
            <option value="lodged">Lodged</option>
            <option value="disputed">Disputed</option>
            <option value="released">Released</option>
          </select>
        </div>
        <button type="button" className={coralOutlineBtnClass} onClick={exportBondsCsv}>
          Export CSV
        </button>
      </div>

      <div className={adminTableWrapClass}>
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={adminThClass}>Student</th>
                <th className={adminThClass}>Landlord</th>
                <th className={adminThClass}>Property</th>
                <th className={adminThClass}>State</th>
                <th className={adminThClass}>Amount</th>
                <th className={adminThClass}>Type</th>
                <th className={adminThClass}>Status</th>
                <th className={adminThClass}>Reference</th>
                <th className={adminThClass}>Created</th>
                <th className={adminThClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className={`${adminTdClass} text-center text-gray-500 py-10`}>
                    No bond records yet.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td className={adminTdClass}>
                      {r.student_profiles ? (
                        <Link
                          to={`/admin/students?profile=${r.student_profiles.id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          {studentDisplayName(r.student_profiles)}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={adminTdClass}>
                      {r.landlord_profiles ? (
                        <Link
                          to={`/admin/landlords?profile=${r.landlord_profiles.id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          {landlordDisplayName(r.landlord_profiles)}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={adminTdClass}>{propertyLine(r.properties)}</td>
                    <td className={adminTdClass}>{r.state || '—'}</td>
                    <td className={adminTdClass}>{formatAudCents(r.bond_amount)}</td>
                    <td className={adminTdClass}>{r.bond_type || '—'}</td>
                    <td className={adminTdClass}>{r.bond_status || '—'}</td>
                    <td className={adminTdClass}>
                      {editRef?.id === r.id ? (
                        <div className="flex gap-1">
                          <input
                            className="w-28 rounded border border-gray-200 px-1 text-xs"
                            value={editRef.value}
                            onChange={(e) => setEditRef({ id: r.id, value: e.target.value })}
                          />
                          <button
                            type="button"
                            className="text-xs text-indigo-600"
                            onClick={() => {
                              void updateBond(r.id, { lodgement_reference: editRef.value.trim() || null })
                              setEditRef(null)
                            }}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="text-left text-sm text-gray-800 hover:text-indigo-600"
                          onClick={() => setEditRef({ id: r.id, value: r.lodgement_reference || '' })}
                        >
                          {r.lodgement_reference?.trim() || '—'}
                        </button>
                      )}
                    </td>
                    <td className={adminTdClass}>{formatDate(r.created_at)}</td>
                    <td className={adminTdClass}>
                      <div className="flex flex-col gap-1 text-xs">
                        <button
                          type="button"
                          className="text-indigo-600 hover:underline text-left"
                          disabled={r.bond_status === 'lodged'}
                          onClick={() =>
                            void updateBond(r.id, {
                              bond_status: 'lodged',
                              lodged_at: new Date().toISOString(),
                            })
                          }
                        >
                          Mark lodged
                        </button>
                        <button
                          type="button"
                          className="text-indigo-600 hover:underline text-left"
                          disabled={r.bond_status === 'released'}
                          onClick={() =>
                            void updateBond(r.id, {
                              bond_status: 'released',
                              released_at: new Date().toISOString(),
                            })
                          }
                        >
                          Mark released
                        </button>
                        <button
                          type="button"
                          className="text-red-700 hover:underline text-left"
                          onClick={() => {
                            setDisputeRow(r)
                            setDisputeNotes(r.dispute_notes || '')
                          }}
                        >
                          Dispute / notes
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {disputeRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900">Dispute notes</h3>
            <p className="text-sm text-gray-600 mt-1">Record details and outcome for this bond.</p>
            <textarea
              className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              rows={4}
              value={disputeNotes}
              onChange={(e) => setDisputeNotes(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
                onClick={() => setDisputeRow(null)}
              >
                Close
              </button>
              <button
                type="button"
                className={coralBtnClass}
                onClick={() => {
                  void updateBond(disputeRow.id, {
                    bond_status: 'disputed',
                    dispute_notes: disputeNotes.trim() || null,
                  })
                  setDisputeRow(null)
                }}
              >
                Save as disputed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
