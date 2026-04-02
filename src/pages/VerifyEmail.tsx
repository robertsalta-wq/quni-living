import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import { userNeedsEmailAddressVerification } from '../lib/authEmailVerification'
import { formatAuthEmailErrorMessage, getAuthCallbackUrl } from '../lib/oauth'
import Seo from '../components/Seo'

/**
 * Shown when the user has a session but `email_confirmed_at` is still null (email/password signup
 * with “Confirm email” enabled in Supabase). If Confirm email is off, users are auto-confirmed
 * and typically never land here.
 */
export default function VerifyEmail() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading, signOut, refreshProfile } = useAuthContext()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-md mx-auto px-6 py-12 text-center text-gray-600 text-sm">
        Configure Supabase in <code className="bg-gray-100 px-1 rounded">.env.local</code>.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-[#FF6F61] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={location.state} />
  }

  if (!userNeedsEmailAddressVerification(user)) {
    const dest =
      fromPath && fromPath !== '/verify-email' && fromPath.startsWith('/') ? fromPath : '/'
    return <Navigate to={dest} replace />
  }

  const email = user.email ?? ''

  async function resend() {
    setErr(null)
    setMsg(null)
    setBusy(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: getAuthCallbackUrl() },
      })
      if (error) throw error
      setMsg('If this address has an unconfirmed signup, we sent another email. Check spam folders too.')
    } catch (e) {
      setErr(formatAuthEmailErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function recheck() {
    setErr(null)
    setMsg(null)
    setBusy(true)
    try {
      await refreshProfile()
      const { data } = await supabase.auth.getUser()
      if (data.user?.email_confirmed_at) {
        const dest =
          fromPath && fromPath !== '/verify-email' && fromPath.startsWith('/') ? fromPath : '/'
        navigate(dest, { replace: true })
        return
      }
      setMsg('Not confirmed yet — open the link in the email we sent, then try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <Seo
        title="Confirm your email"
        description="Confirm your email address to continue using Quni Living."
        canonicalPath="/verify-email"
      />
      <h1 className="text-2xl font-bold text-gray-900">Confirm your email</h1>
      <p className="text-sm text-gray-600 mt-2">
        We still need you to verify <span className="font-semibold text-gray-900">{email}</span> before you can use your
        account. Check your inbox for a confirmation link (and spam).
      </p>

      {err && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 whitespace-pre-wrap">
          {err}
        </div>
      )}
      {msg && (
        <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800">{msg}</div>
      )}

      <div className="mt-8 space-y-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void resend()}
          className="w-full rounded-lg bg-[#FF6F61] text-white py-2.5 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Resend confirmation email'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void recheck()}
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          I&apos;ve clicked the link — continue
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void signOut()}
          className="w-full text-sm text-gray-600 hover:text-gray-900 py-2"
        >
          Sign out
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-8 leading-relaxed">
        If you never receive mail but can still sign in, your Supabase project likely has{' '}
        <strong className="font-medium text-gray-700">Confirm email</strong> turned off under Authentication → Providers
        → Email. Turn it on to require verification and to send confirmation messages (with SMTP configured).
      </p>

      <Link to="/login" className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800">
        Back to log in
      </Link>
    </div>
  )
}
