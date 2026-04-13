import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { QasePriority, QaseStatus, QaseSubmitterType, QaseTicket } from '../../types/qase'
import QaseAdminCreateModal from '../../components/qase/QaseAdminCreateModal'
import { adminTableWrapClass, adminTdClass, adminThClass, formatRelativeTime } from './adminUi'

type QueueFilter = 'all' | 'open' | 'pending' | 'unlinked'

const SUBJECT_MAX = 60

function priorityBadgeClass(p: QasePriority): string {
  switch (p) {
    case 'urgent':
      return 'bg-red-100 text-red-800'
    case 'high':
      return 'bg-amber-100 text-amber-900'
    case 'normal':
      return 'bg-gray-100 text-gray-700'
    case 'low':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function statusBadgeClass(s: QaseStatus): string {
  switch (s) {
    case 'new':
      return 'bg-indigo-100 text-indigo-800'
    case 'open':
      return 'bg-blue-100 text-blue-800'
    case 'pending':
      return 'bg-amber-100 text-amber-900'
    case 'on_hold':
      return 'bg-gray-100 text-gray-600'
    case 'solved':
      return 'bg-emerald-100 text-emerald-800'
    case 'closed':
      return 'bg-gray-100 text-gray-500'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function submitterTypeBadgeClass(t: string): string {
  switch (t) {
    case 'student':
      return 'bg-sky-100 text-sky-800'
    case 'landlord':
      return 'bg-violet-100 text-violet-800'
    case 'anonymous':
      return 'bg-gray-100 text-gray-600'
    case 'admin':
      return 'bg-slate-200 text-slate-800'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function formatSubmitterLabel(t: string): string {
  if (t === 'anonymous') return 'Anonymous'
  if (t === 'admin') return 'Admin'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function truncateUuid(id: string): string {
  if (id.length <= 13) return id
  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

function truncateSubject(s: string): string {
  if (s.length <= SUBJECT_MAX) return s
  return `${s.slice(0, SUBJECT_MAX)}…`
}

function filterButtonClass(active: boolean): string {
  return [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    active ? 'bg-indigo-50 text-indigo-800' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
  ].join(' ')
}

function asQaseTicket(row: unknown): QaseTicket {
  return row as QaseTicket
}

function ticketSearchMatch(row: QaseTicket, qLower: string): boolean {
  if (!qLower) return true
  if (row.subject.toLowerCase().includes(qLower)) return true
  const numQuery = qLower.startsWith('#') ? qLower.slice(1) : qLower
  if (numQuery && String(row.ticket_number).includes(numQuery)) return true
  return false
}

function matchingTicketsLabel(count: number, term: string): string {
  const quoted = `'${term}'`
  if (count === 1) return `1 ticket matching ${quoted}`
  return `${count} tickets matching ${quoted}`
}

export default function QaseTicketList() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<QaseTicket[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const filteredRows = useMemo(() => {
    const q = debouncedSearch.toLowerCase()
    if (!q) return rows
    return rows.filter((r) => ticketSearchMatch(r, q))
  }, [rows, debouncedSearch])

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      setRows([])
      return
    }
    setLoading(true)
    setError(null)

    let query = supabase.from('qase_tickets').select('*').order('created_at', { ascending: false })

    if (filter === 'open') {
      query = query.eq('status', 'open')
    } else if (filter === 'pending') {
      query = query.eq('status', 'pending')
    } else if (filter === 'unlinked') {
      query = query.is('submitted_by_id', null)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
      setRows([])
    } else {
      setRows((data ?? []).map(asQaseTicket))
    }
    setLoading(false)
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  function emptyMessage(): string {
    if (!isSupabaseConfigured) return 'Supabase is not configured.'
    if (filter === 'all') return 'No support tickets yet.'
    if (filter === 'unlinked') return 'No unlinked tickets.'
    return 'No tickets match this filter.'
  }

  const searchActive = debouncedSearch.length > 0
  const tableEmptyMessage =
    searchActive && rows.length > 0 && filteredRows.length === 0
      ? `No tickets matching '${debouncedSearch}'`
      : emptyMessage()

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Support (Qase)</h1>
          <p className="text-sm text-gray-500 mt-1">Manage support tickets from students and landlords</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          New ticket
        </button>
      </div>

      <QaseAdminCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(ticketId) => {
          navigate(`/admin/qase/${ticketId}`)
        }}
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="mb-6">
        <label htmlFor="qase-ticket-search" className="sr-only">
          Search tickets
        </label>
        <div className="relative max-w-md">
          <input
            id="qase-ticket-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by subject or ticket number..."
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Clear search"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>
        {searchActive ? (
          <p className="mt-2 text-sm text-gray-600">{matchingTicketsLabel(filteredRows.length, debouncedSearch)}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button type="button" className={filterButtonClass(filter === 'all')} onClick={() => setFilter('all')}>
          All tickets
        </button>
        <button type="button" className={filterButtonClass(filter === 'open')} onClick={() => setFilter('open')}>
          Open
        </button>
        <button type="button" className={filterButtonClass(filter === 'pending')} onClick={() => setFilter('pending')}>
          Pending
        </button>
        <button type="button" className={filterButtonClass(filter === 'unlinked')} onClick={() => setFilter('unlinked')}>
          Unlinked
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
                <th className={adminThClass}>#</th>
                <th className={adminThClass}>Subject</th>
                <th className={adminThClass}>Submitter</th>
                <th className={adminThClass}>Category</th>
                <th className={adminThClass}>Priority</th>
                <th className={adminThClass}>Status</th>
                <th className={adminThClass}>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`${adminTdClass} text-gray-500 text-center py-10`}>
                    {emptyMessage()}
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`${adminTdClass} text-gray-500 text-center py-10`}>
                    {tableEmptyMessage}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const st = row.submitted_by_type as QaseSubmitterType | string
                  return (
                    <tr
                      key={row.id}
                      role="link"
                      tabIndex={0}
                      className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                      onClick={() => navigate(`/admin/qase/${row.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/admin/qase/${row.id}`)
                        }
                      }}
                    >
                      <td className={adminTdClass}>
                        <span className="font-medium text-gray-900">#{row.ticket_number}</span>
                      </td>
                      <td className={adminTdClass}>
                        <span className="text-gray-900">{truncateSubject(row.subject)}</span>
                      </td>
                      <td className={adminTdClass}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${submitterTypeBadgeClass(st)}`}
                          >
                            {formatSubmitterLabel(st)}
                          </span>
                          {row.submitted_by_id == null ? (
                            <span className="text-xs font-medium text-amber-700">Unlinked</span>
                          ) : (
                            <span className="font-mono text-xs text-gray-500">{truncateUuid(row.submitted_by_id)}</span>
                          )}
                        </div>
                      </td>
                      <td className={adminTdClass}>{row.category ?? '—'}</td>
                      <td className={adminTdClass}>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${priorityBadgeClass(row.priority)}`}
                        >
                          {row.priority}
                        </span>
                      </td>
                      <td className={adminTdClass}>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(row.status)}`}
                        >
                          {row.status.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className={adminTdClass} title={row.created_at}>
                        {formatRelativeTime(row.created_at)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
