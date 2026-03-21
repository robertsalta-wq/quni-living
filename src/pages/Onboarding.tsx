import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import { fetchRoleAndProfile, getDashboardPath } from '../lib/authProfile'

type Choice = 'student' | 'landlord'

export default function Onboarding() {
  const { user, loading: authLoading, refreshProfile } = useAuthContext()
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
        await supabase.from('landlord_profiles').delete().eq('user_id', user.id)
        const { error: insErr } = await supabase.from('student_profiles').upsert(payload, {
          onConflict: 'user_id',
        })
        if (insErr) throw insErr
      } else {
        await supabase.from('student_profiles').delete().eq('user_id', user.id)
        const { error: insErr } = await supabase.from('landlord_profiles').upsert(payload, {
          onConflict: 'user_id',
        })
        if (insErr) throw insErr
      }

      const { error: metaErr } = await supabase.auth.updateUser({
        data: { role: choice },
      })
      if (metaErr) throw metaErr

      await refreshProfile()
      navigate(getDashboardPath(choice), { replace: true })
    } catch (e) {
      console.error(e)
      setError('Something went wrong. Please try again.')
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

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome to Quni</h1>
      <p className="text-gray-600 text-sm mt-2 mb-8">Tell us how you&apos;ll use the platform.</p>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
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
