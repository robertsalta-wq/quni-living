import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  supabase,
  isSupabaseConfigured,
  getSupabaseBrowserKeyMisuseMessage,
} from '../lib/supabase'
import { getAuthCallbackUrl, getGoogleOAuthOptions } from '../lib/oauth'
import { isSafeInternalPath, persistAuthReturnIntent } from '../lib/postAuthRedirect'
import { getQuniSelectedRole, setQuniSelectedRole, type QuniSignupRole } from '../lib/quniSelectedRole'
import Seo from '../components/Seo'

type SignupStep = 'primary' | 'details'

const SIGNUP_TERMS_CHECKBOX_CLASS =
  'mt-1 h-4 w-4 shrink-0 rounded border-stone-300 text-[#FF6F61] focus:ring-2 focus:ring-[#FF6F61] focus:ring-offset-0 accent-[#FF6F61]'

/** Supabase often returns a generic message when Auth cannot send the confirmation email. */
function formatSignupErrorForDisplay(raw: string): string {
  const lower = raw.toLowerCase()
  if (
    lower.includes('confirmation email') ||
    lower.includes('sending confirmation') ||
    lower.includes('error sending magic link')
  ) {
    return [
      'We could not send the confirmation email. This is usually fixed in your Supabase project:',
      '• Authentication → URL Configuration: set Site URL to your live site (e.g. https://quni-living.vercel.app) and add the same origin + /auth/callback under Redirect URLs.',
      '• Project Settings → Auth: if you use custom SMTP, confirm host, port, and credentials; otherwise check Auth logs for provider errors or rate limits.',
      '• Try again in a few minutes if the mail provider rate-limits signups.',
    ].join('\n')
  }
  return raw
}

type SignupTermsFieldsProps = {
  showLandlordAgreement: boolean
  termsPrivacy: boolean
  setTermsPrivacy: (v: boolean) => void
  landlordAgreement: boolean
  setLandlordAgreement: (v: boolean) => void
  termsError: boolean
  clearTermsError: () => void
}

function SignupTermsFields({
  showLandlordAgreement,
  termsPrivacy,
  setTermsPrivacy,
  landlordAgreement,
  setLandlordAgreement,
  termsError,
  clearTermsError,
}: SignupTermsFieldsProps) {
  return (
    <div className="space-y-3">
      <label className="flex gap-3 items-start cursor-pointer text-sm text-gray-800 leading-relaxed">
        <input
          type="checkbox"
          checked={termsPrivacy}
          onChange={(e) => {
            setTermsPrivacy(e.target.checked)
            clearTermsError()
          }}
          className={SIGNUP_TERMS_CHECKBOX_CLASS}
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
      {showLandlordAgreement && (
        <label className="flex gap-3 items-start cursor-pointer text-sm text-gray-800 leading-relaxed">
          <input
            type="checkbox"
            checked={landlordAgreement}
            onChange={(e) => {
              setLandlordAgreement(e.target.checked)
              clearTermsError()
            }}
            className={SIGNUP_TERMS_CHECKBOX_CLASS}
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
      {termsError && <p className="text-sm text-red-600 font-medium">Please accept the terms to continue</p>}
    </div>
  )
}

export default function Signup() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const roleFromUrl = searchParams.get('role')

  const [step, setStep] = useState<SignupStep>(() =>
    roleFromUrl === 'student' || roleFromUrl === 'landlord' ? 'details' : 'primary',
  )
  const [role, setRole] = useState<QuniSignupRole | null>(() =>
    roleFromUrl === 'landlord' ? 'landlord' : roleFromUrl === 'student' ? 'student' : null,
  )
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)
  const [termsPrivacy, setTermsPrivacy] = useState(false)
  const [landlordAgreement, setLandlordAgreement] = useState(false)
  const [termsError, setTermsError] = useState(false)

  useEffect(() => {
    const r = searchParams.get('role')
    if (r === 'student' || r === 'landlord') {
      setRole(r)
      setQuniSelectedRole(r)
      setStep('details')
    }
  }, [searchParams])

  useEffect(() => {
    persistAuthReturnIntent(searchParams, location.state)
  }, [searchParams, location.state])

  useEffect(() => {
    if (step === 'details' && !role) setStep('primary')
  }, [step, role])

  function pickRole(r: QuniSignupRole) {
    setRole(r)
    setQuniSelectedRole(r)
    if (r === 'student') setLandlordAgreement(false)
  }

  /** Role from UI or localStorage (e.g. refreshed mid-flow). */
  const effectiveSignupRole: QuniSignupRole | null =
    role ?? getQuniSelectedRole()
  const showLandlordAgreement = effectiveSignupRole === 'landlord'

  function termsAcceptedForSignup(): boolean {
    if (!termsPrivacy) return false
    if (showLandlordAgreement && !landlordAgreement) return false
    return true
  }

  const signupTermsFieldsProps: SignupTermsFieldsProps = {
    showLandlordAgreement,
    termsPrivacy,
    setTermsPrivacy,
    landlordAgreement,
    setLandlordAgreement,
    termsError,
    clearTermsError: () => setTermsError(false),
  }

  function googleButton(className: string) {
    return (
      <button type="button" onClick={handleGoogleSignup} disabled={!role} className={className}>
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
    if (!role) {
      setError('Please choose whether you are signing up as a student or landlord.')
      return
    }
    if (!termsAcceptedForSignup()) {
      setTermsError(true)
      return
    }
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
      const raw = e instanceof Error ? e.message : 'Could not sign up.'
      const msg = formatSignupErrorForDisplay(raw)
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSignup() {
    setError(null)
    if (!role) {
      setError('Choose Student or Landlord above before continuing with Google.')
      return
    }
    if (!termsAcceptedForSignup()) {
      setTermsError(true)
      return
    }
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      return
    }
    setQuniSelectedRole(role)
    const { error: oErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: getGoogleOAuthOptions(),
    })
    if (oErr) setError(oErr.message)
  }

  if (checkEmail) {
    const redirectQ = searchParams.get('redirect')
    const loginBackHref =
      redirectQ && isSafeInternalPath(redirectQ)
        ? `/login?redirect=${encodeURIComponent(redirectQ)}`
        : '/login'
    return (
      <div className="max-w-md mx-auto px-6 py-12 text-center">
        <Seo
          title="Confirm your email"
          description="Finish creating your Quni Living account — student accommodation and landlord listings in Australia."
          canonicalPath="/signup"
        />
        <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
        <p className="text-gray-600 text-sm mt-3">
          We sent a confirmation link to <strong>{email}</strong>. Open it to finish setting up your
          account.
        </p>
        <Link to={loginBackHref} className="inline-block mt-8 text-sm font-medium text-indigo-600 hover:text-indigo-800">
          Back to log in
        </Link>
      </div>
    )
  }

  const redirectQ = searchParams.get('redirect')
  const loginHref =
    redirectQ && isSafeInternalPath(redirectQ) ? `/login?redirect=${encodeURIComponent(redirectQ)}` : '/login'

  const keyMisuse = getSupabaseBrowserKeyMisuseMessage()
  const errLower = (error ?? '').toLowerCase()
  const secretKeyError =
    errLower.includes('forbidden') && errLower.includes('secret')

  const roleCardClass = (r: QuniSignupRole) =>
    `w-full rounded-xl border-2 p-5 text-left transition-colors ${
      role === r
        ? 'border-[#FF6F61] bg-[#FFF8F0] ring-1 ring-[#FF6F61]/20'
        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/80'
    }`

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <Seo
        title="Create an account"
        description="Sign up for Quni Living — find student accommodation near university or list your property for verified student tenants."
        canonicalPath="/signup"
      />
      <h1 className="text-2xl font-bold text-gray-900">Create an account</h1>
      <p className="text-sm text-gray-600 mt-1 mb-8">
        Already have an account?{' '}
        <Link to={loginHref} className="text-indigo-600 font-medium hover:text-indigo-800">
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
            <div className="whitespace-pre-line">{error}</div>
          )}
        </div>
      )}

      {step === 'primary' && (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-gray-800 mb-3">I am signing up as a…</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={() => pickRole('student')} className={roleCardClass('student')}>
                <span className="font-semibold text-gray-900">Student</span>
                <p className="text-sm text-gray-600 mt-1">Find housing and manage bookings.</p>
              </button>
              <button type="button" onClick={() => pickRole('landlord')} className={roleCardClass('landlord')}>
                <span className="font-semibold text-gray-900">Landlord</span>
                <p className="text-sm text-gray-600 mt-1">List properties and manage enquiries.</p>
              </button>
            </div>
            {!role && (
              <p className="text-xs text-amber-800 mt-2">Choose one option above to continue with Google or email.</p>
            )}
          </div>

          {role ? <SignupTermsFields {...signupTermsFieldsProps} /> : null}

          {googleButton(
            `w-full rounded-lg border border-gray-200 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              role
                ? 'text-gray-800 hover:bg-gray-50'
                : 'text-gray-400 bg-gray-50 cursor-not-allowed opacity-70'
            }`,
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
            disabled={!role}
            onClick={() => setStep('details')}
            className="w-full rounded-lg bg-gray-900 text-white py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sign up with email
          </button>
        </div>
      )}

      {step === 'details' && role && (
        <>
          <button
            type="button"
            onClick={() => setStep('primary')}
            className="text-xs text-gray-500 hover:text-gray-800 mb-4"
          >
            ← Back
          </button>
          <p className="text-sm text-gray-600 mb-4">
            Signing up as a <span className="font-semibold text-gray-900">{role === 'student' ? 'Student' : 'Landlord'}</span>.
          </p>

          <div
            className="mb-6 rounded-xl border border-stone-200/80 bg-[#FEF9E4] px-4 py-3"
            style={{ borderLeftWidth: 4, borderLeftColor: '#FF6F61' }}
            aria-label="Sign-up steps"
          >
            <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide mb-2">Your sign-up steps</p>
            <div className="flex gap-1.5 mb-2" aria-hidden>
              <div className="h-1.5 flex-1 rounded-full bg-[#FF6F61]" />
              <div className="h-1.5 flex-1 rounded-full bg-stone-200" />
              <div className="h-1.5 flex-1 rounded-full bg-stone-200" />
            </div>
            <ol className="text-sm text-stone-800 space-y-1 list-decimal list-inside">
              <li className="font-medium text-stone-900">Create account (this page)</li>
              <li>Confirm your email</li>
              <li>Complete your {role === 'student' ? 'student' : 'landlord'} profile</li>
            </ol>
          </div>

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
            <SignupTermsFields {...signupTermsFieldsProps} />
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
            `w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium flex items-center justify-center gap-2 ${
              role
                ? 'text-gray-800 hover:bg-gray-50'
                : 'text-gray-400 bg-gray-50 cursor-not-allowed opacity-70'
            }`,
          )}
        </>
      )}
    </div>
  )
}
