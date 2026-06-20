import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getValidAccessTokenForFunctions } from '../../lib/supabaseEdgeInvoke'
import type { Database } from '../../lib/database.types'
import { isValidUniEmailForVerification, uniEmailDomainErrorMessage } from '../../lib/uniEmailDomains'
import { readSupabaseFunctionInvokeError } from '../../lib/readSupabaseFunctionInvokeError'
import { formatDate } from '../../pages/admin/adminUi'
import { isStudentUniEmailVerified } from '../../lib/studentUniEmailVerification'
import {
  clearVerificationOtpPending,
  readVerificationOtpPendingEmail,
  writeVerificationOtpPending,
} from '../../lib/verificationOtpPendingStorage'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

const RESEND_SECONDS = 60

type Props = {
  profile: StudentRow
  onVerified: () => Promise<void>
  /** Onboarding uses stone styling; profile page uses gray card styling. */
  variant?: 'onboarding' | 'profile'
  /** Hide admin Resend dashboard link (onboarding). */
  showAdminResendHint?: boolean
}

export function StudentUniEmailVerification({
  profile,
  onVerified,
  variant = 'profile',
  showAdminResendHint = variant === 'profile',
}: Props) {
  const emailVerified = isStudentUniEmailVerified(profile)
  const userId = profile.user_id

  const [uniEmailInput, setUniEmailInput] = useState(profile.uni_email ?? '')
  const [otpInput, setOtpInput] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resendAt, setResendAt] = useState<number | null>(null)
  const [, setResendTick] = useState(0)

  useEffect(() => {
    if (!emailVerified) {
      setUniEmailInput((prev) => (prev.trim() ? prev : profile.uni_email ?? ''))
    }
  }, [profile.uni_email, emailVerified])

  useEffect(() => {
    if (emailVerified) {
      clearVerificationOtpPending('uni', userId)
      setCodeSent(false)
      return
    }
    const pending = readVerificationOtpPendingEmail('uni', userId)
    if (!pending) return
    setCodeSent(true)
    setUniEmailInput((prev) => {
      const pt = prev.trim().toLowerCase()
      if (pt === pending) return prev
      const prof = (profile.uni_email ?? '').trim().toLowerCase()
      if (prof === pending && profile.uni_email) return profile.uni_email
      return pending
    })
  }, [userId, emailVerified, profile.uni_email])

  useEffect(() => {
    if (resendAt == null || Date.now() >= resendAt) return
    const t = window.setInterval(() => setResendTick((x) => x + 1), 1000)
    return () => window.clearInterval(t)
  }, [resendAt])

  const resendRemaining =
    resendAt != null && Date.now() < resendAt ? Math.ceil((resendAt - Date.now()) / 1000) : 0

  const inputClass =
    variant === 'onboarding'
      ? 'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 focus:border-[#FF6F61]'
      : 'w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 bg-white'
  const labelClass =
    variant === 'onboarding'
      ? 'block text-sm font-medium text-gray-700 mb-1'
      : 'block text-sm font-semibold text-gray-900 mb-1'
  const coralBtn =
    'inline-flex items-center justify-center rounded-lg bg-[#FF6F61] text-white text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-[#e85d52] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61] focus-visible:ring-offset-2 disabled:opacity-50'

  const sendCode = useCallback(async () => {
    setSendError(null)
    setVerifyError(null)
    const trimmed = uniEmailInput.trim().toLowerCase()
    if (!isValidUniEmailForVerification(trimmed)) {
      setSendError(uniEmailDomainErrorMessage())
      return
    }
    setSending(true)
    try {
      const auth = await getValidAccessTokenForFunctions()
      if ('error' in auth) {
        setSendError(auth.error)
        return
      }
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
        'send-uni-otp',
        {
          body: { uni_email: trimmed },
          headers: { Authorization: `Bearer ${auth.token}` },
        },
      )
      if (error) {
        setSendError(await readSupabaseFunctionInvokeError(data, error))
        return
      }
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        setSendError(String(data.error))
        return
      }
      writeVerificationOtpPending('uni', userId, trimmed)
      setCodeSent(true)
      setOtpInput('')
      setResendAt(Date.now() + RESEND_SECONDS * 1000)
    } finally {
      setSending(false)
    }
  }, [uniEmailInput, userId])

  const verifyCode = useCallback(async () => {
    setVerifyError(null)
    const digits = otpInput.replace(/\D/g, '')
    if (digits.length !== 6) {
      setVerifyError('Enter the 6-digit code from your email.')
      return
    }
    setVerifying(true)
    try {
      const auth = await getValidAccessTokenForFunctions()
      if ('error' in auth) {
        setVerifyError(auth.error)
        return
      }
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
        'verify-uni-otp',
        {
          body: { otp: digits },
          headers: { Authorization: `Bearer ${auth.token}` },
        },
      )
      if (error) {
        setVerifyError(await readSupabaseFunctionInvokeError(data, error))
        return
      }
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        setVerifyError(String(data.error))
        return
      }
      clearVerificationOtpPending('uni', userId)
      setCodeSent(false)
      setOtpInput('')
      setResendAt(null)
      await onVerified()
    } finally {
      setVerifying(false)
    }
  }, [otpInput, onVerified, userId])

  if (emailVerified) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
        <span className="text-lg" aria-hidden>
          ✅
        </span>
        <span className="font-semibold">Verified</span>
        <span className="text-emerald-800">{profile.uni_email}</span>
        {profile.uni_email_verified_at && (
          <span className="text-emerald-700/90 text-xs w-full sm:w-auto sm:ml-2">
            on {formatDate(profile.uni_email_verified_at)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!codeSent ? (
        <div>
          <label htmlFor="uni-email-verify" className={labelClass}>
            University email <span className="text-red-500">*</span>
          </label>
          <input
            id="uni-email-verify"
            type="email"
            autoComplete="email"
            required
            value={uniEmailInput}
            onChange={(e) => {
              setUniEmailInput(e.target.value)
              setSendError(null)
            }}
            placeholder="you@student.unsw.edu.au"
            className={inputClass}
          />
          <p className="text-xs text-stone-500 mt-1.5">
            Use your official student address (e.g. @student.unsw.edu.au), not your personal Gmail.
          </p>
          {sendError && (
            <p className="text-xs text-red-600 mt-2" role="alert">
              {sendError}
            </p>
          )}
          <button type="button" className={`${coralBtn} mt-3`} disabled={sending} onClick={() => void sendCode()}>
            {sending ? 'Sending…' : 'Send code'}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-2">
            We sent a code to {uniEmailInput.trim().toLowerCase()}. It often arrives within a minute, but{' '}
            <strong className="font-semibold text-stone-700">Gmail and other providers sometimes delay</strong>{' '}
            the first messages from a new sender (greylisting) - <strong>5–10 minutes</strong> is still normal.
          </p>
          <div className="rounded-lg border border-stone-200 bg-stone-50/90 px-3 py-2.5 text-xs text-stone-700 space-y-1.5 mb-4">
            <p className="font-semibold text-stone-800">While you wait</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Check <strong>Spam</strong>, <strong>Promotions</strong>, <strong>Updates</strong>, and search your
                inbox for <strong>Quni</strong> or <strong>verification</strong>.
              </li>
              <li>
                Avoid tapping <strong>Resend</strong> too often - each send creates a <strong>new</strong> code and only
                the <strong>latest</strong> email will work.
              </li>
              <li>
                After the timer, you can <strong>Resend code</strong> if nothing has arrived.
              </li>
            </ul>
            {showAdminResendHint && (
              <p className="text-stone-600 pt-1">
                Admins: open{' '}
                <a
                  href="https://resend.com/emails"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#FF6F61] underline underline-offset-2"
                >
                  Resend → Emails
                </a>{' '}
                to see send status (bounced, delayed, delivered).
              </p>
            )}
          </div>
          <label htmlFor="uni-otp" className={labelClass}>
            6-digit code <span className="text-red-500">*</span>
          </label>
          <input
            id="uni-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={otpInput}
            onChange={(e) => {
              setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))
              setVerifyError(null)
            }}
            className={`${inputClass} tracking-widest font-mono text-lg`}
            placeholder="000000"
          />
          {verifyError && (
            <p className="text-xs text-red-600 mt-2" role="alert">
              {verifyError}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button type="button" className={coralBtn} disabled={verifying} onClick={() => void verifyCode()}>
              {verifying ? 'Checking…' : 'Verify code'}
            </button>
            {resendRemaining > 0 ? (
              <span className="text-xs text-gray-500">Resend in {resendRemaining}s</span>
            ) : (
              <button
                type="button"
                className="text-sm font-semibold text-[#FF6F61] hover:text-[#e85d52] underline underline-offset-2"
                disabled={sending}
                onClick={() => void sendCode()}
              >
                Resend code
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
