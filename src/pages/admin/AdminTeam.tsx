import { useCallback, useEffect, useState } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { adminCardClass, adminTableWrapClass, adminTdClass, adminThClass } from './adminUi'
import { AdminPageHeader, EmptyState, LoadingState } from '../../components/admin/primitives'

type StaffRow = Database['public']['Tables']['platform_staff']['Row']
type StaffRole = StaffRow['role']

const ROLE_OPTIONS: StaffRole[] = ['admin', 'support', 'moderator']

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function AdminTeam() {
  const { user } = useAuthContext()
  const [rows, setRows] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('admin')
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('platform_staff')
      .select('*')
      .order('created_at', { ascending: true })
    if (fetchError) {
      setError(fetchError.message)
      setRows([])
    } else {
      setRows((data ?? []) as StaffRow[])
    }
    setLoading(false)
  }, [])

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
    setSaving(true)
    setError(null)
    const { error: insertError } = await supabase.from('platform_staff').insert({
      email: normalized,
      role,
      notes: notes.trim() || null,
      created_by: user?.id ?? null,
    })
    if (insertError) {
      setError(insertError.message)
    } else {
      setEmail('')
      setNotes('')
      setRole('admin')
      await load()
    }
    setSaving(false)
  }

  async function handleRemove(row: StaffRow) {
    if (!window.confirm(`Remove platform access for ${row.email}?`)) return
    setError(null)
    const { error: deleteError } = await supabase.from('platform_staff').delete().eq('id', row.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    await load()
  }

  return (
    <div>
      <AdminPageHeader
        title="Team"
        subtitle="Platform staff who can access the admin dashboard. Users must sign up with the same email before they can log in."
      />

      {error && (
        <div className="mb-4 rounded-admin-md border border-admin-danger/20 bg-admin-danger-bg px-3.5 py-2.5 text-[13px] text-admin-danger-fg">
          {error}
        </div>
      )}

      <div className={`${adminCardClass} mb-8`}>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Add team member</h2>
        <form onSubmit={(e) => void handleAdd(e)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2 lg:col-span-4">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Notes (optional)</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Ops lead"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d5c4a] disabled:opacity-50"
            >
              {saving ? 'Adding…' : 'Add to team'}
            </button>
          </div>
        </form>
        <p className="mt-4 text-xs text-gray-500">
          v1: all roles grant full admin access. The last team member cannot be removed.
        </p>
      </div>

      <div className={adminTableWrapClass}>
        {loading ? (
          <LoadingState label="Loading team…" />
        ) : rows.length === 0 ? (
          <EmptyState title="No team members" description="Add an email above to grant admin access." />
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className={adminThClass}>Email</th>
                <th className={adminThClass}>Role</th>
                <th className={adminThClass}>Notes</th>
                <th className={adminThClass}>Added</th>
                <th className={adminThClass} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className={adminTdClass}>{row.email}</td>
                  <td className={adminTdClass}>{row.role}</td>
                  <td className={adminTdClass}>{row.notes ?? '—'}</td>
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
