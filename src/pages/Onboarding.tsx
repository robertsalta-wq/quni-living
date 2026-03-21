import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  supabase,
  isSupabaseConfigured,
  getSupabaseBrowserKeyMisuseMessage,
} from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import { isAdminUser } from '../lib/adminEmails'
import { fetchRoleAndProfile, getDashboardPath } from '../lib/authProfile'

type Choice = 'student' | 'landlord'

function formatError(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    const m = (e as { message: string }).message
    if (m) return m
  }
  if (e instanceof Error && e.message) return e.message
  return 'Something went wrong. Please try again.'
}

/** Avoid `upsert` under RLS (often fails); use update-then-insert. */
async function saveProfileRow(
  table: 'student_profiles' | 'landlord_profiles',
  payload: { user_id: string; full_name: string; email: string },
): Promise<{ error: Error | null }> {
  const { data: existing, error: selErr } = await supabase
    .from(table)
    .select('user_id')
    .eq('user_id', payload.user_id)
    .maybeSingle()

  if (selErr) return { error: new Error(selErr.message) }

  if (existing) {
    const { error: upErr } = await supabase
      .from(table)
      .update({ full_name: payload.full_name, email: payload.email })
      .eq('user_id', payload.user_id)
    return { error: upErr ? new Error(upErr.message) : null }
  }

  const { error: insErr } = await supabase.from(table).insert(payload)
  return { error: insErr ? new Error(insErr.message) : null }
}

export default function Onboarding() {
  const { user, loading: authLoading, refreshProfile, role: contextRole } = useAuthContext()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    ;(async () => {
      const meta = user.user_metadata?.role
      const { role, profile } = await fetchRoleAndProfile(user)
      if (role === 'admin') {
        navigate('/admin', { replace: true })
        return
      }
      if (
        (meta === 'student' || meta === 'landlord') &&
        profile !== null &&
        role === meta
      ) {
        navigate(getDashboardPath(role), { replace: true })
      }
    })()
  }, [user, authLoading, navigate])

  async function complete(choice: Choice) {
    if (!user) return
    setError(null)
    setSubmitting(true)
    try {
      const fullName =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        user.email?.split('@')[0] ??
        ''

      const payload = {
        user_id: user.id,
        full_name: fullName,
        email: user.email ?? '',
      }

      if (choice === 'student') {
        const { error: delErr } = await supabase.from('landlord_profiles').delete().eq('user_id', user.id)
        if (delErr) throw new Error(delErr.message)
        const { error: saveErr } = await saveProfileRow('student_profiles', payload)
        if (saveErr) throw saveErr
      } else {
        const { error: delErr } = await supabase.from('student_profiles').delete().eq('user_id', user.id)
        if (delErr) throw new Error(delErr.message)
        const { error: saveErr } = await saveProfileRow('landlord_profiles', payload)
        if (saveErr) throw saveErr
      }

      const { error: metaErr } = await supabase.auth.updateUser({
        data: { role: choice },
      })
      if (metaErr) throw metaErr

      await refreshProfile()
      navigate(getDashboardPath(choice), { replace: true })
    } catch (e) {
      console.error(e)
      const msg = formatError(e)
      const hint = /could not find the table|schema cache|PGRST205/i.test(msg)
        ? ' Your Supabase project is missing tables. Open Supabase → SQL Editor, paste and run `supabase/profile_tables_bootstrap.sql` from this repo (or run the full `supabase/quni_supabase_schema.sql`). Wait a few seconds, then try again.'
        : /row level security|rls|permission denied|42501/i.test(msg)
          ? ' If this mentions RLS or permission, confirm policies allow users to insert/update their own row (see supabase/quni_supabase_schema.sql or profile_tables_bootstrap.sql).'
          : ''
      setError(msg + hint)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12 text-center text-gray-600 text-sm">
        Configure Supabase in <code className="bg-gray-100 px-1 rounded">.env.local</code>.
      </div>
    )
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (contextRole === 'admin' || isAdminUser(user)) {
    return <Navigate to="/admin" replace />
  }

  const keyMisuse = getSupabaseBrowserKeyMisuseMessage()

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome to Quni</h1>
      <p className="text-gray-600 text-sm mt-2 mb-8">Tell us how you&apos;ll use the platform.</p>

      {keyMisuse && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Wrong API key</p>
          <p className="mt-2 text-amber-900/90">{keyMisuse}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 whitespace-pre-wrap break-words">
          {error}
        </div>
      )}

      <p className="text-sm font-medium text-gray-700 mb-4">I am a…</p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          disabled={submitting}
          onClick={() => complete('student')}
          className="flex-1 rounded-2xl border-2 border-gray-200 p-6 text-left hover:border-indigo-500 hover:bg-indigo-50/50 transition-colors disabled:opacity-50"
        >
          <span className="font-semibold text-gray-900">Student</span>
          <p className="text-sm text-gray-600 mt-1">Find accommodation and manage bookings.</p>
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => complete('landlord')}
          className="flex-1 rounded-2xl border-2 border-gray-200 p-6 text-left hover:border-indigo-500 hover:bg-indigo-50/50 transition-colors disabled:opacity-50"
        >
          <span className="font-semibold text-gray-900">Landlord</span>
          <p className="text-sm text-gray-600 mt-1">List properties and manage enquiries.</p>
        </button>
      </div>
    </div>
  )
}
