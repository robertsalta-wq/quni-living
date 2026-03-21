import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { adminCardClass } from './adminUi'

type Counts = {
  activeProperties: number
  bookingsTotal: number
  bookingsPending: number
  bookingsConfirmed: number
  enquiriesTotal: number
  enquiriesNew: number
  enquiriesRead: number
  students: number
  landlords: number
}

async function countRows(
  fetcher: () => PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> {
  const { count, error } = await Promise.resolve(fetcher())
  if (error) throw new Error(error.message)
  return count ?? 0
}

export default function AdminOverview() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      setError('Supabase is not configured.')
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [
          activeProperties,
          bookingsTotal,
          bookingsPending,
          bookingsConfirmed,
          enquiriesTotal,
          enquiriesNew,
          enquiriesRead,
          students,
          landlords,
        ] = await Promise.all([
          countRows(() =>
            Promise.resolve(
              supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'active'),
            ),
          ),
          countRows(() => Promise.resolve(supabase.from('bookings').select('id', { count: 'exact', head: true }))),
          countRows(() =>
            Promise.resolve(
              supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            ),
          ),
          countRows(() =>
            Promise.resolve(
              supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
            ),
          ),
          countRows(() => Promise.resolve(supabase.from('enquiries').select('id', { count: 'exact', head: true }))),
          countRows(() =>
            Promise.resolve(
              supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
            ),
          ),
          countRows(() =>
            Promise.resolve(
              supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'read'),
            ),
          ),
          countRows(() =>
            Promise.resolve(supabase.from('student_profiles').select('id', { count: 'exact', head: true })),
          ),
          countRows(() =>
            Promise.resolve(supabase.from('landlord_profiles').select('id', { count: 'exact', head: true })),
          ),
        ])
        if (!cancelled) {
          setCounts({
            activeProperties,
            bookingsTotal,
            bookingsPending,
            bookingsConfirmed,
            enquiriesTotal,
            enquiriesNew,
            enquiriesRead,
            students,
            landlords,
          })
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load summary.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Overview</h1>
      <p className="text-sm text-gray-500 mt-1 mb-8">Live counts from your Supabase project.</p>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          {/permission denied|rls|42501/i.test(error) && (
            <p className="mt-2 text-red-700/90">
              Run <code className="bg-red-100/80 px-1 rounded text-xs">supabase/admin_rls_policies.sql</code> in the
              Supabase SQL Editor so admin accounts can read these tables.
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`${adminCardClass} animate-pulse h-28 bg-gray-100`} />
          ))}
        </div>
      ) : counts ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className={adminCardClass}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Active properties</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{counts.activeProperties}</p>
            <p className="text-xs text-gray-500 mt-1">Listings with status &quot;active&quot;</p>
          </div>
          <div className={adminCardClass}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bookings</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{counts.bookingsTotal}</p>
            <p className="text-xs text-gray-500 mt-1">
              Pending: <span className="font-medium text-amber-700">{counts.bookingsPending}</span>
              {' · '}
              Confirmed: <span className="font-medium text-emerald-700">{counts.bookingsConfirmed}</span>
            </p>
          </div>
          <div className={adminCardClass}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Enquiries</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{counts.enquiriesTotal}</p>
            <p className="text-xs text-gray-500 mt-1">
              New: <span className="font-medium text-blue-700">{counts.enquiriesNew}</span>
              {' · '}
              Read: <span className="font-medium text-gray-600">{counts.enquiriesRead}</span>
            </p>
          </div>
          <div className={adminCardClass}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Students</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{counts.students}</p>
            <p className="text-xs text-gray-500 mt-1">Student profile rows</p>
          </div>
          <div className={adminCardClass}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Landlords</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{counts.landlords}</p>
            <p className="text-xs text-gray-500 mt-1">Landlord profile rows</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
