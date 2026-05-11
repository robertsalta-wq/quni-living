import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { adminTableWrapClass, adminTdClass, adminThClass, formatDate } from './adminUi'
import { AdminPageHeader, EmptyState, LoadingState } from '../../components/admin/primitives'

type LandlordLeadRow = Database['public']['Tables']['landlord_leads']['Row']

const TRUNC = 120

export default function AdminLandlordLeads() {
  const [rows, setRows] = useState<LandlordLeadRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('landlord_leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (fetchError) {
      setError(fetchError.message)
      setRows([])
    } else {
      setRows((data ?? []) as LandlordLeadRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function toggleExpand(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }))
  }

  return (
    <div>
      <AdminPageHeader
        title="Landlord leads"
        subtitle="Partnership enquiries from the landlord partnerships page."
      />

      {error && (
        <div className="mb-4 rounded-admin-md border border-admin-danger/20 bg-admin-danger-bg px-3.5 py-2.5 text-[13px] text-admin-danger-fg">
          {error}
        </div>
      )}

      <div className={adminTableWrapClass}>
        {loading ? (
          <LoadingState label="Loading leads…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="No landlord leads yet"
            description="New partnership enquiries land here as they come in."
          />
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={adminThClass}>Contact</th>
                <th className={adminThClass}>Phone</th>
                <th className={adminThClass}>Suburb</th>
                <th className={adminThClass}>Properties</th>
                <th className={adminThClass}>Message</th>
                <th className={adminThClass}>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                  const msg = row.message ?? ''
                  const isLong = msg.length > TRUNC
                  const isOpen = expanded[row.id]
                  const shown = isOpen || !isLong ? msg : `${msg.slice(0, TRUNC)}…`
                  return (
                    <tr key={row.id}>
                      <td className={adminTdClass}>
                        <span className="font-medium text-gray-900">{row.name?.trim() || '—'}</span>
                        <span className="block text-xs text-gray-500">{row.email?.trim() || '—'}</span>
                      </td>
                      <td className={adminTdClass}>
                        <a
                          href={row.phone?.trim() ? `tel:${row.phone.replace(/\s/g, '')}` : undefined}
                          className={
                            row.phone?.trim()
                              ? 'text-indigo-600 hover:text-indigo-800'
                              : 'text-gray-800 pointer-events-none'
                          }
                        >
                          {row.phone?.trim() || '—'}
                        </a>
                      </td>
                      <td className={adminTdClass}>{row.suburb?.trim() || '—'}</td>
                      <td className={adminTdClass}>{row.property_count?.trim() || '—'}</td>
                      <td className={`${adminTdClass} max-w-xs`}>
                        {msg ? (
                          <>
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
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={adminTdClass}>{formatDate(row.created_at)}</td>
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
