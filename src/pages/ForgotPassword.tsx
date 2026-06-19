import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { formatAuthEmailErrorMessage, getPasswordResetRedirectUrl } from '../lib/oauth'
import Seo from '../components/Seo'

export default function ForgotPassword() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email')?.trim() ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      return
    }
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Enter your email address.')
      return
    }
    setSubmitting(true)
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: getPasswordResetRedirectUrl(),
      })
      if (resetErr) throw resetErr
      setSent(true)
    } catch (err) {
      setError(formatAuthEmailErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto px-6 py-12">
        <Seo
          title="Check your email"
          description="Reset your Quni Living account password."
          canonicalPath="/forgot-password"
        />
        <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
        <p className="text-sm text-gray-600 mt-2">
          If an account exists for <span className="font-semibold text-gray-900">{email.trim()}</span>, we sent a link
          to reset your password. Check spam folders too.
        </p>
        <p className="text-sm text-gray-600 mt-4">
          Open the link in a private/incognito window if your email app previews links. The link expires after a short
          time — request another below if it stops working.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false)
            setError(null)
          }}
          className="mt-8 w-full rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Send another link
        </button>
        <Link to="/login" className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800">
          Back to log in
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <Seo
        title="Reset your password"
        description="Request a password reset link for your Quni Living account."
        canonicalPath="/forgot-password"
      />
      <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
      <p className="text-sm text-gray-600 mt-2">
        Enter the email you used to sign up. We&apos;ll send a link to choose a new password.
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
          <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-gray-900 text-white py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <Link to="/login" className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800">
        Back to log in
      </Link>
    </div>
  )
}
