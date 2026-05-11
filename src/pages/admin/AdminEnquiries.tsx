import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { adminTableWrapClass, adminTdClass, adminThClass, formatDate } from './adminUi'
import { AdminPageHeader, EmptyState, LoadingState } from '../../components/admin/primitives'

type EnquiryStatus = Database['public']['Tables']['enquiries']['Row']['status']

type EnquiryRow = Database['public']['Tables']['enquiries']['Row'] & {
  properties: { title: string; suburb: string | null } | null
}

const STATUSES: EnquiryStatus[] = ['new', 'read', 'replied', 'archived']

const TRUNC = 80

function statusBadgeClass(s: EnquiryStatus) {
  switch (s) {
    case 'new':
      return 'bg-blue-100 text-blue-800'
    case 'read':
      return 'bg-gray-100 text-gray-600'
    case 'replied':
      return 'bg-emerald-100 text-emerald-800'
    case 'archived':
      return 'bg-gray-100 text-gray-500'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export default function AdminEnquiries() {
  const [rows, setRows] = useState<EnquiryRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('enquiries')
      .select(
        `
          *,
          properties ( title, suburb )
        `,
      )
      .order('created_at', { ascending: false })
    if (fetchError) {
      setError(fetchError.message)
      setRows([])
    } else {
      setRows((data ?? []) as EnquiryRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function setStatus(id: string, status: EnquiryStatus) {
    setUpdatingId(id)
    setError(null)
    const { error: upErr } = await supabase.from('enquiries').update({ status }).eq('id', id)
    if (upErr) {
      setError(upErr.message)
    } else {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    }
    setUpdatingId(null)
  }

  function toggleExpand(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }))
  }

  return (
    <div>
      <AdminPageHeader title="Enquiries" subtitle="Property enquiries from students and visitors." />

      {error && (
        <div className="mb-4 rounded-admin-md border border-admin-danger/20 bg-admin-danger-bg px-3.5 py-2.5 text-[13px] text-admin-danger-fg">
          {error}
        </div>
      )}

      <div className={adminTableWrapClass}>
        {loading ? (
          <LoadingState label="Loading enquiries…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="message-square"
            title="No enquiries yet"
            description="New messages from students will land here as soon as they arrive."
          />
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={adminThClass}>Contact</th>
                <th className={adminThClass}>Property</th>
                <th className={adminThClass}>Message</th>
                <th className={adminThClass}>Date</th>
                <th className={adminThClass}>Status</th>
                <th className={adminThClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                  const msg = row.message ?? ''
                  const isLong = msg.length > TRUNC
                  const isOpen = expanded[row.id]
                  const shown = isOpen || !isLong ? msg : `${msg.slice(0, TRUNC)}…`
                  const prop = row.properties
                  return (
                    <tr key={row.id}>
                      <td className={adminTdClass}>
                        <span className="font-medium text-gray-900">{row.name?.trim() || '—'}</span>
                        <span className="block text-xs text-gray-500">{row.email?.trim() || '—'}</span>
                      </td>
                      <td className={adminTdClass}>
                        {prop ? (
                          <>
                            {prop.title}
                            {prop.suburb ? (
                              <span className="block text-xs text-gray-500">{prop.suburb}</span>
                            ) : null}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={`${adminTdClass} max-w-xs`}>
                        <p className="text-gray-800 whitespace-pre-wrap break-words">{shown}</p>
                        {isLong && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(row.id)}
                            className="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            {isOpen ? 'Show less' : 'Show more'}
                          </button>
                        )}
                      </td>
                      <td className={adminTdClass}>{formatDate(row.created_at)}</td>
                      <td className={adminTdClass}>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className={adminTdClass}>
                        <select
                          aria-label="Change enquiry status"
                          disabled={updatingId === row.id}
                          value={row.status}
                          onChange={(e) => void setStatus(row.id, e.target.value as EnquiryStatus)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
