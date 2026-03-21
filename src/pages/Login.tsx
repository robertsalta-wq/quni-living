import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
  supabase,
  isSupabaseConfigured,
  getSupabaseBrowserKeyMisuseMessage,
} from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import { fetchRoleAndProfile, getDashboardPath, needsOnboarding } from '../lib/authProfile'
import { getGoogleOAuthOptions } from '../lib/oauth'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user, profile, role, loading: authLoading } = useAuthContext()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const urlError = searchParams.get('error')
  const urlDetail = searchParams.get('detail')

  const errorMessage =
    urlError === 'auth_failed'
      ? 'Sign-in failed. Please try again.'
      : urlError === 'missing_code'
        ? 'Invalid or incomplete sign-in link.'
        : urlError === 'oauth'
          ? 'Google sign-in was cancelled or denied.'
        : urlError === 'config'
          ? 'App is not configured for authentication.'
          : null

  let detailText: string | null = null
  if (urlDetail) {
    try {
      detailText = decodeURIComponent(urlDetail.replace(/\+/g, ' '))
    } catch {
      detailText = urlDetail
    }
  }

  useEffect(() => {
    if (authLoading || !user) return
    if (role === 'admin') {
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname
      navigate(from && from !== '/login' ? from : '/admin', { replace: true })
      return
    }
    if (!user.user_metadata?.role || profile === null || needsOnboarding(role, profile)) {
      navigate('/onboarding', { replace: true })
      return
    }
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname
    navigate(from && from !== '/login' ? from : getDashboardPath(role), { replace: true })
  }, [user, profile, role, authLoading, navigate, location.state])

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      return
    }
    setSubmitting(true)
    try {
      const { data, error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signErr) throw signErr
      if (!data.user) throw new Error('No user returned')

      const { role: r, profile: p } = await fetchRoleAndProfile(data.user)
      if (r === 'admin') {
        const from = (location.state as { from?: { pathname?: string } })?.from?.pathname
        navigate(from && from !== '/login' ? from : '/admin', { replace: true })
        return
      }
      if (!data.user.user_metadata?.role || needsOnboarding(r, p) || p === null) {
        navigate('/onboarding', { replace: true })
        return
      }
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname
      navigate(from && from !== '/login' ? from : getDashboardPath(r), { replace: true })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid email or password.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      return
    }
    const { error: oErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: getGoogleOAuthOptions(),
    })
    if (oErr) setError(oErr.message)
  }

  const keyMisuse = getSupabaseBrowserKeyMisuseMessage()
  const errLower = (error ?? '').toLowerCase()
  const secretKeyError =
    errLower.includes('forbidden') && errLower.includes('secret')
  /** Amber banner already explains bad key — hide duplicate red box for same email-login error. */
  const redundantSecretBanner =
    Boolean(keyMisuse && secretKeyError && !errorMessage && !detailText)

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Log in</h1>
      <p className="text-sm text-gray-600 mt-1 mb-8">
        New here?{' '}
        <Link to="/signup" className="text-indigo-600 font-medium hover:text-indigo-800">
          Create an account
        </Link>
      </p>

      {keyMisuse && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Wrong API key type</p>
          <p className="mt-2 text-amber-900/90">{keyMisuse}</p>
        </div>
      )}

      {(error || errorMessage || detailText) && !redundantSecretBanner && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 space-y-1">
          {secretKeyError && !keyMisuse ? (
            <>
              <p>Wrong API key: use the Publishable key, not a Secret key.</p>
              <p className="text-red-700/90 text-xs mt-2">
                Supabase → Project Settings → API → copy the key under <strong>Publishable keys</strong> into{' '}
                <code className="bg-red-100/80 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>, then restart dev server
                or redeploy Vercel.
              </p>
            </>
          ) : (
            error || errorMessage
          )}
          {detailText && !secretKeyError && (
            <p className="text-red-700/90 text-xs mt-1 whitespace-pre-wrap break-words">{detailText}</p>
          )}
        </div>
      )}

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-gray-900 text-white py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide text-gray-500">
          <span className="bg-white px-2">Or continue with</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Google
      </button>
    </div>
  )
}
