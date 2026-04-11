import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { getValidAccessTokenForFunctions } from '../../lib/supabaseEdgeInvoke'
import { readSupabaseFunctionInvokeError } from '../../lib/readSupabaseFunctionInvokeError'
import { adminTableWrapClass, adminTdClass, adminThClass, formatDate } from './adminUi'

type TppDomainRow = {
  domain: string
  expiryDate: string | null
  daysUntilExpiry: number | null
  status: string | null
  lockStatus: string | null
  nameservers: string[]
  autoRenew: boolean | null
}

type TppDomainsResponse = {
  domains?: TppDomainRow[]
  error?: string
  tppCode?: string
  tppMessage?: string
  tppRaw?: string
}

function daysBadgeClass(days: number | null): string {
  if (days === null || Number.isNaN(days)) {
    return 'bg-gray-100 text-gray-700'
  }
  if (days > 60) return 'bg-green-100 text-green-800'
  if (days >= 30) return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

function formatCheckedAt(d: Date): string {
  return d.toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDebugPayload(data: TppDomainsResponse | null): string {
  if (!data) return ''
  const lines: string[] = []
  if (typeof data.tppCode === 'string' && data.tppCode) lines.push(`tppCode: ${data.tppCode}`)
  if (typeof data.tppMessage === 'string' && data.tppMessage) lines.push(`tppMessage: ${data.tppMessage}`)
  if (typeof data.tppRaw === 'string' && data.tppRaw) lines.push(`tppRaw:\n${data.tppRaw}`)
  return lines.join('\n')
}

export default function DomainsPage() {
  const [rows, setRows] = useState<TppDomainRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugPayload, setDebugPayload] = useState<TppDomainsResponse | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    setDebugPayload(null)

    const auth = await getValidAccessTokenForFunctions()
    if ('error' in auth) {
      setError(auth.error)
      setRows([])
      setLastChecked(new Date())
      setLoading(false)
      return
    }

    const { data, error: fnError } = await supabase.functions.invoke<TppDomainsResponse>('tpp-domains', {
      method: 'GET',
      headers: { Authorization: `Bearer ${auth.token}` },
    })

    const checked = new Date()
    setLastChecked(checked)

    if (fnError) {
      const msg = await readSupabaseFunctionInvokeError(data, fnError)
      setError(msg)
      setDebugPayload(data && typeof data === 'object' ? data : null)
      setRows([])
    } else if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' && data.error) {
      setError(data.error)
      setDebugPayload(data)
      setRows([])
    } else {
      setRows(Array.isArray(data?.domains) ? data.domains : [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Domains</h1>
          <p className="text-sm text-gray-500 mt-1">Live domain data from TPP Wholesale</p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-[#FF6F61] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61]"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          {lastChecked ? (
            <p className="text-xs text-gray-500 text-right">Last checked: {formatCheckedAt(lastChecked)}</p>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 space-y-2">
          <p className="font-medium">Request failed</p>
          <p className="whitespace-pre-wrap break-words">{error}</p>
          {formatDebugPayload(debugPayload) ? (
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-white/80 border border-red-100 p-3 text-xs text-red-900 whitespace-pre-wrap break-words">
              {formatDebugPayload(debugPayload)}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
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
                <th className={adminThClass}>Domain name</th>
                <th className={adminThClass}>Expiry date</th>
                <th className={adminThClass}>Days remaining</th>
                <th className={adminThClass}>Auto-renew</th>
                <th className={adminThClass}>Lock status</th>
                <th className={adminThClass}>Nameservers</th>
                <th className={adminThClass}>Last checked</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.domain} className="border-t border-gray-100">
                  <td className={`${adminTdClass} font-medium text-gray-900`}>{row.domain}</td>
                  <td className={`${adminTdClass} text-gray-600 whitespace-nowrap`}>
                    {row.expiryDate ? formatDate(row.expiryDate) : '—'}
                  </td>
                  <td className={adminTdClass}>
                    {row.daysUntilExpiry !== null && row.daysUntilExpiry !== undefined ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${daysBadgeClass(row.daysUntilExpiry)}`}
                      >
                        {row.daysUntilExpiry} days
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className={`${adminTdClass} text-gray-600`}>
                    {row.autoRenew === null ? '—' : row.autoRenew ? 'Yes' : 'No'}
                  </td>
                  <td className={`${adminTdClass} text-gray-600`}>{row.lockStatus?.trim() || '—'}</td>
                  <td className={`${adminTdClass} text-gray-600 break-all max-w-[14rem]`}>
                    {row.nameservers.length > 0 ? row.nameservers.join(', ') : '—'}
                  </td>
                  <td className={`${adminTdClass} text-gray-600 whitespace-nowrap`}>
                    {lastChecked ? formatCheckedAt(lastChecked) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && rows.length === 0 && !error && (
          <p className="p-8 text-sm text-gray-500 text-center">No domains returned from TPP.</p>
        )}
      </div>
    </div>
  )
}
