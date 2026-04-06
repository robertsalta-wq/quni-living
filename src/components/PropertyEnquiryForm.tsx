import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AuthProfile, UserRole } from '../lib/authProfile'
import { isTurnstileSiteKeyConfigured } from '../lib/verifyTurnstile'
import { apiUrl } from '../lib/apiUrl'
import TurnstileCaptcha from './TurnstileCaptcha'

type Props = {
  propertyId: string
  landlordId: string | null
  propertyTitle: string
  user: User | null
  profile: AuthProfile | null
  role: UserRole
  /** Called after a successful submit (enquiry saved and emails sent). */
  onSuccess?: () => void
  /** When false, omits the in-form title and helper line (e.g. modal supplies its own header). */
  showIntro?: boolean
}

function enquiryDisplayName(user: User | null, profile: AuthProfile | null): string {
  const metaFull = user?.user_metadata?.full_name
  if (typeof metaFull === 'string' && metaFull.trim()) return metaFull.trim()
  const metaName = user?.user_metadata?.name
  if (typeof metaName === 'string' && metaName.trim()) return metaName.trim()
  if (!profile) return ''
  const any = profile as { first_name?: string | null; last_name?: string | null; full_name?: string | null }
  const fn = any.first_name?.trim() ?? ''
  const ln = any.last_name?.trim() ?? ''
  if (fn || ln) return [fn, ln].filter(Boolean).join(' ')
  return any.full_name?.trim() ?? ''
}

function enquiryDisplayEmail(user: User | null, profile: AuthProfile | null): string {
  const p = profile as { email?: string | null } | null
  return (p?.email?.trim() || user?.email || '').trim()
}

export default function PropertyEnquiryForm({
  propertyId,
  landlordId,
  propertyTitle,
  user,
  profile,
  role,
  onSuccess,
  showIntro = true,
}: Props) {
  const loggedIn = Boolean(user)
  const studentId = role === 'student' && profile ? profile.id : null

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)

  useEffect(() => {
    if (!loggedIn) return
    setName((n) => (n ? n : enquiryDisplayName(user, profile)))
    setEmail((e) => (e ? e : enquiryDisplayEmail(user, profile)))
  }, [loggedIn, user, profile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const formName = name.trim()
    const formEmail = email.trim()
    const formMessage = message.trim()

    if (!formMessage) {
      setError('Please enter a message.')
      return
    }
    if (!formName || !formEmail) {
      setError('Please enter your name and email.')
      return
    }

    if (!isTurnstileSiteKeyConfigured()) {
      setError('This form is not available right now. Please email hello@quni.com.au directly.')
      return
    }

    if (!captchaToken?.trim()) {
      setError('Please complete the verification step.')
      return
    }

    setSubmitting(true)
    try {
      const { error: insErr } = await supabase.from('enquiries').insert({
        property_id: propertyId,
        student_id: studentId,
        landlord_id: landlordId,
        name: formName,
        email: formEmail,
        message: formMessage,
      })
      if (insErr) throw insErr

      const mailRes = await fetch(apiUrl('/api/enquiry-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyTitle,
          senderName: formName,
          senderEmail: formEmail,
          message: formMessage,
          turnstileToken: captchaToken,
        }),
      })
      const mailData = (await mailRes.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!mailRes.ok || !mailData.ok) {
        const detail =
          typeof mailData.error === 'string' && mailData.error ? mailData.error : 'Email delivery failed.'
        throw new Error(
          `Your enquiry was saved, but we could not send the emails (${detail}). Please try again in a few minutes or contact hello@quni.com.au.`,
        )
      }

      setSent(true)
      onSuccess?.()
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Something went wrong.'
      setError(raw)
      setCaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white'
  const labelClass = 'block text-sm font-semibold text-gray-900 mb-1'

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
        <p className="text-sm font-semibold text-emerald-900">Your enquiry has been sent!</p>
        <p className="text-xs text-emerald-800 mt-2">We&apos;ll get back to you soon. Check your inbox for a confirmation.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showIntro && (
        <>
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Send an enquiry</h2>
          <p className="text-xs text-gray-500 -mt-2">Ask the host a question about this listing.</p>
        </>
      )}

      <div>
        <label htmlFor="enq-name" className={labelClass}>
          Name
        </label>
        <input
          id="enq-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          readOnly={loggedIn}
          required
          className={`${inputClass} ${loggedIn ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''}`}
        />
      </div>
      <div>
        <label htmlFor="enq-email" className={labelClass}>
          Email
        </label>
        <input
          id="enq-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          readOnly={loggedIn}
          required
          className={`${inputClass} ${loggedIn ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''}`}
        />
      </div>
      <div>
        <label htmlFor="enq-msg" className={labelClass}>
          Message
        </label>
        <textarea
          id="enq-msg"
          rows={4}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={"Hi, I'm interested in this property…"}
          className={`${inputClass} resize-y min-h-[5rem]`}
        />
      </div>

      <TurnstileCaptcha
        resetKey={captchaResetKey}
        onTokenChange={setCaptchaToken}
        disabled={submitting}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl border border-gray-900 text-gray-900 py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
      >
        {submitting ? 'Sending…' : 'Send Enquiry'}
      </button>
    </form>
  )
}
