import { useMemo, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  supabase,
  isSupabaseConfigured,
  getSupabaseBrowserKeyMisuseMessage,
} from '../lib/supabase'
import { withSentryMonitoring } from '../lib/supabaseErrorMonitor'
import { useAuthContext } from '../context/AuthContext'
import { isAdminUser } from '../lib/adminEmails'
import { fetchRoleAndProfile, getPostLoginRedirectDestination } from '../lib/authProfile'
import { consumePostAuthRedirect } from '../lib/postAuthRedirect'
import { clearQuniSelectedRole, getQuniSelectedRole } from '../lib/quniSelectedRole'
import { reportFormError } from '../lib/reportFormError'

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
  acceptedAt: string,
): Promise<{ error: Error | null }> {
  const { data: existing, error: selErr } = await withSentryMonitoring('Onboarding/select-profile-for-terms', () =>
    supabase.from(table).select('user_id').eq('user_id', payload.user_id).maybeSingle(),
  )

  if (selErr) return { error: new Error(selErr.message) }

  const termsPatch =
    table === 'landlord_profiles'
      ? {
          full_name: payload.full_name,
          email: payload.email,
          terms_accepted_at: acceptedAt,
          landlord_terms_accepted_at: acceptedAt,
        }
      : { full_name: payload.full_name, email: payload.email, terms_accepted_at: acceptedAt }

  if (existing) {
    const { error: upErr } = await withSentryMonitoring('Onboarding/update-profile-terms', () =>
      supabase.from(table).update(termsPatch).eq('user_id', payload.user_id),
    )
    return { error: upErr ? new Error(upErr.message) : null }
  }

  const insertPayload =
    table === 'landlord_profiles'
      ? { ...payload, terms_accepted_at: acceptedAt, landlord_terms_accepted_at: acceptedAt }
      : { ...payload, terms_accepted_at: acceptedAt }

  const { error: insErr } = await withSentryMonitoring('Onboarding/insert-profile-terms', () =>
    supabase.from(table).insert(insertPayload),
  )
  return { error: insErr ? new Error(insErr.message) : null }
}

export default function Onboarding() {
  const { user, loading: authLoading, refreshProfile, role: contextRole } = useAuthContext()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [termsPrivacy, setTermsPrivacy] = useState(false)
  const [landlordAgreement, setLandlordAgreement] = useState(false)
  const [agreementError, setAgreementError] = useState(false)

  const { resolvedRole, usedRoleFallback } = useMemo(() => {
    const stored = getQuniSelectedRole()
    return {
      resolvedRole: (stored === 'landlord' ? 'landlord' : 'student') as Choice,
      usedRoleFallback: stored === null,
    }
  }, [])

  const isLandlord = resolvedRole === 'landlord'

  useEffect(() => {
    if (!isSupabaseConfigured) return
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const u = data.user ?? user
      const meta = u.user_metadata?.role
      const { role, profile } = await fetchRoleAndProfile(u)
      if (role === 'admin' || isAdminUser(u)) {
        navigate('/admin', { replace: true })
        return
      }
      if (
        (meta === 'student' || meta === 'landlord') &&
        profile !== null &&
        role === meta
      ) {
        navigate(getPostLoginRedirectDestination(u, role, profile), { replace: true })
      }
    })()
  }, [user, authLoading, navigate])

  async function handleComplete() {
    if (!user) return
    setAgreementError(false)
    if (!termsPrivacy) {
      setAgreementError(true)
      reportFormError('Onboarding', 'agreementError', 'Terms not accepted')
      return
    }
    if (isLandlord && !landlordAgreement) {
      setAgreementError(true)
      reportFormError('Onboarding', 'agreementError', 'Terms not accepted')
      return
    }
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
      const acceptedAt = new Date().toISOString()

      if (resolvedRole === 'student') {
        const { error: delErr } = await withSentryMonitoring('Onboarding/delete-landlord-profile', () =>
          supabase.from('landlord_profiles').delete().eq('user_id', user.id),
        )
        if (delErr) throw new Error(delErr.message)
        const { error: saveErr } = await saveProfileRow('student_profiles', payload, acceptedAt)
        if (saveErr) throw saveErr
      } else {
        const { error: delErr } = await withSentryMonitoring('Onboarding/delete-student-profile', () =>
          supabase.from('student_profiles').delete().eq('user_id', user.id),
        )
        if (delErr) throw new Error(delErr.message)
        const { error: saveErr } = await saveProfileRow('landlord_profiles', payload, acceptedAt)
        if (saveErr) throw saveErr
      }

      const { error: metaErr } = await supabase.auth.updateUser({
        data: { role: resolvedRole },
      })
      if (metaErr) throw metaErr

      clearQuniSelectedRole()
      await refreshProfile()
      const { data: freshUserData } = await supabase.auth.getUser()
      const uAfter = freshUserData.user ?? user
      const { role: rAfter, profile: pAfter } = await fetchRoleAndProfile(uAfter)
      const returnTo = consumePostAuthRedirect()
      navigate(returnTo ?? getPostLoginRedirectDestination(uAfter, rAfter, pAfter), { replace: true })
    } catch (e) {
      console.error(e)
      const msg = formatError(e)
      const hint = /could not find the table|schema cache|PGRST205/i.test(msg)
        ? ' Your Supabase project is missing tables. Open Supabase → SQL Editor, paste and run `supabase/profile_tables_bootstrap.sql` from this repo (or run the full `supabase/quni_supabase_schema.sql`). Wait a few seconds, then try again.'
        : /row level security|rls|permission denied|42501/i.test(msg)
          ? ' If this mentions RLS or permission, confirm policies allow users to insert/update their own row (see supabase/quni_supabase_schema.sql or profile_tables_bootstrap.sql).'
          : ''
      const errorStr = msg + hint
      setError(errorStr)
      if (errorStr) reportFormError('Onboarding', 'formError', errorStr)
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
      <p className="text-gray-600 text-sm mt-2">
        You&apos;re signing up as a{' '}
        <span className="font-semibold text-gray-900">{isLandlord ? 'landlord' : 'student'}</span>. Please accept the
        terms below to continue.
      </p>

      {usedRoleFallback && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
          We couldn&apos;t detect your earlier role choice, so we&apos;re continuing as a <strong>student</strong>. If
          you need a landlord account, contact{' '}
          <a href="mailto:hello@quni.com.au" className="font-medium text-amber-950 underline">
            hello@quni.com.au
          </a>
          .
        </p>
      )}

      {keyMisuse && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 mt-6">
          <p className="font-semibold">Wrong API key</p>
          <p className="mt-2 text-amber-900/90">{keyMisuse}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 whitespace-pre-wrap break-words mt-6">
          {error}
        </div>
      )}

      {agreementError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mt-6">
          Please accept all required agreements before continuing.
        </div>
      )}

      <div className="space-y-4 mb-8 mt-8">
        <label className="flex gap-3 items-start cursor-pointer text-sm text-gray-800 leading-relaxed">
          <input
            type="checkbox"
            checked={termsPrivacy}
            onChange={(e) => {
              setTermsPrivacy(e.target.checked)
              setAgreementError(false)
            }}
            className="mt-1 h-4 w-4 shrink-0 rounded border-stone-300 text-[#FF6F61] focus:ring-2 focus:ring-[#FF6F61] focus:ring-offset-0 accent-[#FF6F61]"
          />
          <span>
            I agree to the{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FF6F61] font-medium underline underline-offset-2 hover:opacity-90"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FF6F61] font-medium underline underline-offset-2 hover:opacity-90"
            >
              Privacy Policy
            </a>
          </span>
        </label>

        {isLandlord && (
          <label className="flex gap-3 items-start cursor-pointer text-sm text-gray-800 leading-relaxed">
            <input
              type="checkbox"
              checked={landlordAgreement}
              onChange={(e) => {
                setLandlordAgreement(e.target.checked)
                setAgreementError(false)
              }}
              className="mt-1 h-4 w-4 shrink-0 rounded border-stone-300 text-[#FF6F61] focus:ring-2 focus:ring-[#FF6F61] focus:ring-offset-0 accent-[#FF6F61]"
            />
            <span>
              I agree to the{' '}
              <a
                href="/landlord-service-agreement"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF6F61] font-medium underline underline-offset-2 hover:opacity-90"
              >
                Landlord Service Agreement
              </a>
            </span>
          </label>
        )}
      </div>

      <button
        type="button"
        disabled={submitting}
        onClick={() => void handleComplete()}
        className="w-full rounded-xl bg-[#FF6F61] text-white py-3.5 text-sm font-semibold hover:bg-[#e85d52] transition-colors disabled:opacity-50 shadow-sm"
      >
        {submitting ? 'Saving…' : 'Continue'}
      </button>
    </div>
  )
}
