import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  supabase,
  isSupabaseConfigured,
  getSupabaseBrowserKeyMisuseMessage,
} from '../lib/supabase'
import { getAuthCallbackUrl, getGoogleOAuthOptions } from '../lib/oauth'

type RoleChoice = 'student' | 'landlord'

/** Google first on /signup; email path uses role → details. ?role= skips to email form (shortcuts). */
type SignupStep = 'primary' | 'role' | 'details'

export default function Signup() {
  const [searchParams] = useSearchParams()
  const initialRole = searchParams.get('role') === 'landlord' ? 'landlord' : 'student'
  const roleFromUrl = searchParams.get('role')

  const [step, setStep] = useState<SignupStep>(() =>
    roleFromUrl === 'student' || roleFromUrl === 'landlord' ? 'details' : 'primary',
  )
  const [role, setRole] = useState<RoleChoice>(initialRole)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  useEffect(() => {
    const r = searchParams.get('role')
    if (r === 'student' || r === 'landlord') {
      setRole(r)
      setStep('details')
    }
  }, [searchParams])

  function googleButton(className: string) {
    return (
      <button type="button" onClick={handleGoogleSignup} className={className}>
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
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
        Continue with Google
      </button>
    )
  }

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      return
    }
    setSubmitting(true)
    try {
      const { error: signErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            role,
            full_name: fullName.trim(),
          },
          emailRedirectTo: getAuthCallbackUrl(),
        },
      })
      if (signErr) throw signErr
      setCheckEmail(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not sign up.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSignup() {
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

  if (checkEmail) {
    return (
      <div className="max-w-md mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
        <p className="text-gray-600 text-sm mt-3">
          We sent a confirmation link to <strong>{email}</strong>. Open it to finish setting up your
          account.
        </p>
        <Link to="/login" className="inline-block mt-8 text-sm font-medium text-indigo-600 hover:text-indigo-800">
          Back to log in
        </Link>
      </div>
    )
  }

  const keyMisuse = getSupabaseBrowserKeyMisuseMessage()
  const errLower = (error ?? '').toLowerCase()
  const secretKeyError =
    errLower.includes('forbidden') && errLower.includes('secret')

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Create an account</h1>
      <p className="text-sm text-gray-600 mt-1 mb-8">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-600 font-medium hover:text-indigo-800">
          Log in
        </Link>
      </p>

      {keyMisuse && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Wrong API key type</p>
          <p className="mt-2 text-amber-900/90">{keyMisuse}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {secretKeyError && !keyMisuse ? (
            <>
              <p>Wrong API key: use the Publishable key, not a Secret key.</p>
              <p className="text-red-700/90 text-xs mt-2">
                Supabase → Project Settings → API → <strong>Publishable keys</strong> → copy into{' '}
                <code className="bg-red-100/80 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>.
              </p>
            </>
          ) : (
            error
          )}
        </div>
      )}

      {step === 'primary' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Use Google to create your account. If you&apos;re new, you&apos;ll choose <strong>Student</strong> or{' '}
            <strong>Landlord</strong> right after you sign in.
          </p>
          {googleButton(
            'w-full rounded-lg border border-gray-200 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 flex items-center justify-center gap-2',
          )}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide text-gray-500">
              <span className="bg-white px-2">Or</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStep('role')}
            className="w-full rounded-lg bg-gray-900 text-white py-2.5 text-sm font-medium hover:bg-gray-800"
          >
            Sign up with email
          </button>
          <p className="text-xs text-gray-500 text-center">
            Email sign-up asks for student or landlord first so we can attach it to your account.
          </p>
        </div>
      )}

      {step === 'role' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setStep('primary')}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            ← Back
          </button>
          <p className="text-sm font-medium text-gray-700">I am a…</p>
          <button
            type="button"
            onClick={() => {
              setRole('student')
              setStep('details')
            }}
            className="w-full rounded-xl border border-gray-200 p-5 text-left hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors"
          >
            <span className="font-semibold text-gray-900">Student</span>
            <p className="text-sm text-gray-600 mt-1">Find housing and manage bookings.</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('landlord')
              setStep('details')
            }}
            className="w-full rounded-xl border border-gray-200 p-5 text-left hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors"
          >
            <span className="font-semibold text-gray-900">Landlord</span>
            <p className="text-sm text-gray-600 mt-1">List properties and manage enquiries.</p>
          </button>
        </div>
      )}

      {step === 'details' && (
        <>
          <button
            type="button"
            onClick={() => setStep('role')}
            className="text-xs text-gray-500 hover:text-gray-800 mb-4"
          >
            ← Change role ({role === 'student' ? 'Student' : 'Landlord'})
          </button>

          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div>
              <label htmlFor="su-name" className="block text-sm font-medium text-gray-700 mb-1">
                Full name
              </label>
              <input
                id="su-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label htmlFor="su-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="su-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label htmlFor="su-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="su-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {submitting ? 'Creating account…' : 'Sign up with email'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide text-gray-500">
              <span className="bg-white px-2">Or</span>
            </div>
          </div>

          {googleButton(
            'w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 flex items-center justify-center gap-2',
          )}
          <p className="text-xs text-gray-500 mt-2 text-center">
            With Google you won&apos;t need a password; you&apos;ll confirm student or landlord after sign-in.
          </p>
        </>
      )}
    </div>
  )
}
