import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import {
  fetchRoleAndProfile,
  getPostLoginRedirectDestination,
} from '../lib/authProfile'
import {
  parseRecoveryTokenHashFromSearch,
  stripAuthCallbackHashFragment,
  stripSensitiveAuthCallbackQueryParams,
} from '../lib/authCallbackParams'
import { formatAuthLoginErrorMessage } from '../lib/authErrors'
import Seo from '../components/Seo'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, loading, refreshProfile } = useAuthContext()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(() => {
    const detail = searchParams.get('error')
    return detail ? decodeURIComponent(detail.replace(/\+/g, ' ')) : null
  })
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setBootstrapping(false)
      return
    }

    let cancelled = false

    ;(async () => {
      const recoveryParams = parseRecoveryTokenHashFromSearch(window.location.search)
      if (recoveryParams) {
        await supabase.auth.signOut()
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          token_hash: recoveryParams.token_hash,
          type: 'recovery',
        })
        if (cancelled) return
        if (verifyErr) {
          setError(
            verifyErr.message ||
              'That reset link could not be used. It may have expired — request a new one.',
          )
          stripSensitiveAuthCallbackQueryParams()
          setBootstrapping(false)
          return
        }
        stripSensitiveAuthCallbackQueryParams()
      }

      await supabase.auth.getSession()
      if (cancelled) return
      stripAuthCallbackHashFragment()
      setBootstrapping(false)
    })().catch((e) => {
      if (!cancelled) {
        setError(e instanceof Error ? e.message : 'Could not open reset link.')
        setBootstrapping(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) throw updateErr
      await refreshProfile()
      const { data } = await supabase.auth.getUser()
      const sessionUser = data.user
      if (sessionUser) {
        const { role, profile } = await fetchRoleAndProfile(sessionUser)
        navigate(getPostLoginRedirectDestination(sessionUser, role, profile), { replace: true })
        return
      }
      navigate('/login?password_updated=1', { replace: true })
    } catch (err) {
      setError(formatAuthLoginErrorMessage(err instanceof Error ? err : 'Could not update password.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-md mx-auto px-6 py-12 text-center text-gray-600 text-sm">
        Configure Supabase in <code className="bg-gray-100 px-1 rounded">.env.local</code>.
      </div>
    )
  }

  if (loading || bootstrapping) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-[#FF6F61] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-6 py-12">
        <Seo title="Reset link expired" canonicalPath="/reset-password" noindex />
        <h1 className="text-2xl font-bold text-gray-900">Reset link expired</h1>
        <p className="text-sm text-gray-600 mt-2">
          This password reset link is invalid or has expired. Request a new one and open it in a private window.
        </p>
        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}
        <Link
          to="/forgot-password"
          className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-[#FF6F61] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e85d52]"
        >
          Request a new reset link
        </Link>
        <Link to="/login" className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800">
          Back to log in
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <Seo title="Choose a new password" canonicalPath="/reset-password" noindex />
      <h1 className="text-2xl font-bold text-gray-900">Choose a new password</h1>
      <p className="text-sm text-gray-600 mt-2">
        Signed in as <span className="font-semibold text-gray-900">{user.email}</span>. Enter your new password below.
      </p>

      {error && (
        <div
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 whitespace-pre-wrap"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
        <div>
          <label htmlFor="reset-password" className="block text-sm font-medium text-gray-700 mb-1">
            New password
          </label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label htmlFor="reset-password-confirm" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm new password
          </label>
          <input
            id="reset-password-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-gray-900 text-white py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Update password'}
        </button>
      </form>

      <Link to="/login" className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800">
        Back to log in
      </Link>
    </div>
  )
}
