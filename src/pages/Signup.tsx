import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  supabase,
  isSupabaseConfigured,
  getSupabaseBrowserKeyMisuseMessage,
} from '../lib/supabase'
import { getAuthCallbackUrl, getGoogleOAuthOptions } from '../lib/oauth'

type RoleChoice = 'student' | 'landlord'

export default function Signup() {
  const [searchParams] = useSearchParams()
  const initialRole = searchParams.get('role') === 'landlord' ? 'landlord' : 'student'

  const [step, setStep] = useState<'role' | 'details'>('role')
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

      {step === 'role' && (
        <div className="space-y-4">
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

          <button
            type="button"
            onClick={handleGoogleSignup}
            className="w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Continue with Google
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            With Google you&apos;ll pick student or landlord after signing in if needed.
          </p>
        </>
      )}
    </div>
  )
}
