import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import {
  addFeeExemptAccount,
  fetchFeeExemptAccounts,
  removeFeeExemptAccount,
  type FeeExemptAccount,
} from '../../lib/adminFeeExempt'
import { adminTableWrapClass, adminTdClass, adminThClass } from './adminUi'
import { EmptyState, LoadingState } from '../../components/admin/primitives'

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function FeeExemptAccountsSection() {
  const [rows, setRows] = useState<FeeExemptAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  const authHeader = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? `Bearer ${token}` : null
  }, [])

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    const h = await authHeader()
    if (!h) {
      setError('You need to be signed in.')
      setRows([])
      setLoading(false)
      return
    }
    try {
      setRows(await fetchFeeExemptAccounts(h))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load fee-exempt accounts')
      setRows([])
    }
    setLoading(false)
  }, [authHeader])

  useEffect(() => {
    void load()
  }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const normalized = normalizeEmail(email)
    if (!isValidEmail(normalized)) {
      setError('Enter a valid email address.')
      return
    }
    const h = await authHeader()
    if (!h) {
      setError('You need to be signed in.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await addFeeExemptAccount(h, normalized, notes.trim() || undefined)
      setEmail('')
      setNotes('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add account')
    }
    setSaving(false)
  }

  async function handleRemove(row: FeeExemptAccount) {
    if (!window.confirm(`Remove fee exemption for ${row.email}? They will be charged normal platform fees again.`)) {
      return
    }
    const h = await authHeader()
    if (!h) {
      setError('You need to be signed in.')
      return
    }
    setError(null)
    try {
      await removeFeeExemptAccount(h, row.email)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove account')
    }
  }

  if (!isSupabaseConfigured) return null

  return (
    <div className="mt-8 space-y-4 border-t border-gray-100 pt-8">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Fee-exempt accounts</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-gray-600">
          Internal only - landlords with these emails pay no listing ($99) or managed (7%) platform fees. Not visible to
          landlords. New sign-ups and existing profiles sync automatically.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">{error}</div>
      ) : null}

      <form onSubmit={(e) => void handleAdd(e)} className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[14rem] flex-1">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[var(--quni-success-strong)] focus:ring-1 focus:ring-[var(--quni-success-strong)]"
          />
        </label>
        <label className="block min-w-[12rem] flex-1">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Notes (optional)</span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Quinn test"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[var(--quni-success-strong)] focus:ring-1 focus:ring-[var(--quni-success-strong)]"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[var(--quni-success-strong)] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d5c4a] disabled:opacity-50"
        >
          {saving ? 'Adding…' : 'Add'}
        </button>
      </form>

      <div className={adminTableWrapClass}>
        {loading ? (
          <LoadingState label="Loading fee-exempt accounts…" />
        ) : rows.length === 0 ? (
          <EmptyState title="No fee-exempt emails" description="Add an email above to waive platform fees for that landlord." />
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className={adminThClass}>Email</th>
                <th className={adminThClass}>Notes</th>
                <th className={adminThClass}>Added</th>
                <th className={adminThClass} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className={adminTdClass}>{row.email}</td>
                  <td className={adminTdClass}>{row.notes ?? '-'}</td>
                  <td className={adminTdClass}>{new Date(row.created_at).toLocaleDateString()}</td>
                  <td className={`${adminTdClass} text-right`}>
                    <button
                      type="button"
                      onClick={() => void handleRemove(row)}
                      className="text-xs font-medium text-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
