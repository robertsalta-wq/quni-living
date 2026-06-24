import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getValidAccessTokenForFunctions } from '../../lib/supabaseEdgeInvoke'
import type { Database } from '../../lib/database.types'
import { isValidWorkEmailForVerification, workEmailDomainErrorMessage } from '../../lib/workEmailDomains'
import { formatDate } from '../../pages/admin/adminUi'
import { readSupabaseFunctionInvokeError } from '../../lib/readSupabaseFunctionInvokeError'
import {
  clearVerificationOtpPending,
  readVerificationOtpPendingEmail,
  writeVerificationOtpPending,
} from '../../lib/verificationOtpPendingStorage'
import { verificationEmailRowSlot } from '../../lib/verificationItemState'
import { RenterProfileVerificationRow } from './profile/RenterProfileVerificationRow'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

const RESEND_SECONDS = 60

type Props = {
  profile: StudentRow
  userId: string
  onVerified: () => Promise<void>
  onProfilePatch?: (patch: Partial<StudentRow>) => void
  /** When true, work email is required for verification section completion. */
  required?: boolean
  variant?: 'default' | 'renter-profile'
  hideFieldLabel?: boolean
}

export function StudentWorkEmailVerification({
  profile,
  userId,
  onVerified,
  onProfilePatch: _onProfilePatch,
  required = false,
  variant = 'default',
  hideFieldLabel = false,
}: Props) {
  const workEmailVerified = Boolean(profile.work_email_verified && profile.work_email)

  const [workEmailInput, setWorkEmailInput] = useState(profile.work_email ?? '')
  const [workOtpInput, setWorkOtpInput] = useState('')
  const [workCodeSent, setWorkCodeSent] = useState(false)
  const [workSendError, setWorkSendError] = useState<string | null>(null)
  const [workVerifyError, setWorkVerifyError] = useState<string | null>(null)
  const [workSending, setWorkSending] = useState(false)
  const [workVerifying, setWorkVerifying] = useState(false)
  const [workResendAt, setWorkResendAt] = useState<number | null>(null)
  const [, setWorkResendTick] = useState(0)

  useEffect(() => {
    if (!workEmailVerified) {
      setWorkEmailInput((prev) => (prev.trim() ? prev : profile.work_email ?? ''))
    }
  }, [profile.work_email, workEmailVerified])

  useEffect(() => {
    if (workResendAt == null || Date.now() >= workResendAt) return
    const t = window.setInterval(() => setWorkResendTick((x) => x + 1), 1000)
    return () => window.clearInterval(t)
  }, [workResendAt])

  useEffect(() => {
    if (workEmailVerified) {
      clearVerificationOtpPending('work', userId)
      setWorkCodeSent(false)
      return
    }
    const pending = readVerificationOtpPendingEmail('work', userId)
    if (!pending) return
    setWorkCodeSent(true)
    setWorkEmailInput((prev) => {
      const pt = prev.trim().toLowerCase()
      if (pt === pending) return prev
      const prof = (profile.work_email ?? '').trim().toLowerCase()
      if (prof === pending && profile.work_email) return profile.work_email
      return pending
    })
  }, [userId, workEmailVerified, profile.work_email])

  const workResendRemaining =
    workResendAt != null && Date.now() < workResendAt ? Math.ceil((workResendAt - Date.now()) / 1000) : 0

  const sendWorkCode = useCallback(async () => {
    setWorkSendError(null)
    setWorkVerifyError(null)
    const trimmed = workEmailInput.trim().toLowerCase()
    if (!isValidWorkEmailForVerification(trimmed)) {
      setWorkSendError(workEmailDomainErrorMessage())
      return
    }
    setWorkSending(true)
    try {
      const auth = await getValidAccessTokenForFunctions()
      if ('error' in auth) {
        setWorkSendError(auth.error)
        return
      }
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
        'send-work-otp',
        {
          body: { work_email: trimmed },
          headers: { Authorization: `Bearer ${auth.token}` },
        },
      )
      if (error) {
        setWorkSendError(await readSupabaseFunctionInvokeError(data, error))
        return
      }
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        setWorkSendError(String(data.error))
        return
      }
      writeVerificationOtpPending('work', userId, trimmed)
      setWorkCodeSent(true)
      setWorkOtpInput('')
      setWorkResendAt(Date.now() + RESEND_SECONDS * 1000)
    } finally {
      setWorkSending(false)
    }
  }, [workEmailInput, userId])

  const verifyWorkCode = useCallback(async () => {
    setWorkVerifyError(null)
    const digits = workOtpInput.replace(/\D/g, '')
    if (digits.length !== 6) {
      setWorkVerifyError('Enter the 6-digit code from your email.')
      return
    }
    setWorkVerifying(true)
    try {
      const auth = await getValidAccessTokenForFunctions()
      if ('error' in auth) {
        setWorkVerifyError(auth.error)
        return
      }
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
        'verify-work-otp',
        {
          body: { otp: digits },
          headers: { Authorization: `Bearer ${auth.token}` },
        },
      )
      if (error) {
        setWorkVerifyError(await readSupabaseFunctionInvokeError(data, error))
        return
      }
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        setWorkVerifyError(String(data.error))
        return
      }
      clearVerificationOtpPending('work', userId)
      setWorkCodeSent(false)
      setWorkOtpInput('')
      setWorkResendAt(null)
      await onVerified()
    } finally {
      setWorkVerifying(false)
    }
  }, [workOtpInput, onVerified, userId])

  const inputClass =
    variant === 'renter-profile'
      ? 'renter-profile-input'
      : 'w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 bg-white'
  const labelClass =
    variant === 'renter-profile' ? 'renter-profile-field-label' : 'block text-sm font-semibold text-gray-900 mb-1'
  const coralBtn =
    variant === 'renter-profile'
      ? 'renter-profile-btn-primary'
      : 'inline-flex items-center justify-center rounded-lg bg-[#FF6F61] text-white text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-[#e85d52] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61] focus-visible:ring-offset-2 disabled:opacity-50'
  const blockClass = variant === 'renter-profile' ? 'renter-profile-email-block' : 'space-y-4'
  const errorClass = variant === 'renter-profile' ? 'renter-profile-error' : 'text-xs text-red-600 mt-2'
  const waitBoxClass =
    variant === 'renter-profile'
      ? 'renter-profile-email-wait-box'
      : 'rounded-lg border border-stone-200 bg-stone-50/90 px-3 py-2.5 text-xs text-stone-700 space-y-1.5 mb-4'
  const actionsClass = variant === 'renter-profile' ? 'renter-profile-email-actions' : 'flex flex-wrap items-center gap-3 mt-3'
  const embedded = variant === 'renter-profile' && hideFieldLabel

  if (embedded && workEmailVerified) {
    const slot = verificationEmailRowSlot(profile, 'work')
    if (slot?.kind === 'verified') {
      return (
        <RenterProfileVerificationRow
          value={profile.work_email ?? ''}
          rightSlot={slot}
        />
      )
    }
  }

  return (
    <div className={embedded ? blockClass : 'space-y-3'}>
      {!embedded ? (
        <>
          <h3 className="text-sm font-bold text-gray-900">
            Work email verification
            {!required ? (
              <span className="text-stone-500 font-semibold text-xs"> (optional)</span>
            ) : null}
          </h3>
          <p className="text-xs text-stone-600">
            Verify your work email so landlords can see you can be contacted quickly about your application.
          </p>
        </>
      ) : null}

      {workEmailVerified ? (
        embedded ? null : (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
          <span className="text-lg" aria-hidden>
            ✓
          </span>
          <span className="font-semibold">Verified</span>
          <span className="text-emerald-800">{profile.work_email}</span>
          {profile.work_email_verified_at ? (
            <span className="text-emerald-700/90 text-xs w-full sm:w-auto sm:ml-2">
              on {formatDate(profile.work_email_verified_at)}
            </span>
          ) : null}
        </div>
        )
      ) : (
        <div className={blockClass}>
          {!workCodeSent ? (
            <div className={embedded ? 'renter-profile-email-block' : undefined}>
              {!hideFieldLabel ? (
                <label htmlFor="work-email-verify" className={labelClass}>
                  Work email
                </label>
              ) : null}
              <input
                id="work-email-verify"
                type="email"
                autoComplete="email"
                value={workEmailInput}
                onChange={(e) => {
                  const next = e.target.value
                  setWorkEmailInput(next)
                  setWorkSendError(null)
                  const pending = readVerificationOtpPendingEmail('work', userId)
                  if (pending && next.trim().toLowerCase() !== pending) {
                    clearVerificationOtpPending('work', userId)
                    setWorkCodeSent(false)
                    setWorkOtpInput('')
                    setWorkResendAt(null)
                  }
                }}
                placeholder="you@company.com"
                className={inputClass}
              />
              {workSendError ? (
                <p className={errorClass} role="alert">
                  {workSendError}
                </p>
              ) : null}
              <button
                type="button"
                className={variant === 'renter-profile' ? coralBtn : `${coralBtn} mt-3`}
                disabled={workSending}
                onClick={() => void sendWorkCode()}
              >
                {workSending ? 'Sending…' : 'Send code'}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                We sent a code to {workEmailInput.trim().toLowerCase()}. Enter it below to verify.
              </p>
              <div className={waitBoxClass}>
                <p className="font-semibold text-stone-800">While you wait</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    Check <strong>Spam</strong> and search your inbox for <strong>Quni</strong>.
                  </li>
                  <li>
                    Avoid tapping <strong>Resend</strong> too often — each send creates a <strong>new</strong> code.
                  </li>
                </ul>
              </div>

              <label htmlFor="work-otp" className={labelClass}>
                6-digit code
              </label>
              <input
                id="work-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={workOtpInput}
                onChange={(e) => {
                  setWorkOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))
                  setWorkVerifyError(null)
                }}
                className={`${inputClass} tracking-widest font-mono text-lg`}
                placeholder="000000"
              />
              {workVerifyError ? (
                <p className={errorClass} role="alert">
                  {workVerifyError}
                </p>
              ) : null}

              <div className={actionsClass}>
                <button
                  type="button"
                  className={coralBtn}
                  disabled={workVerifying}
                  onClick={() => void verifyWorkCode()}
                >
                  {workVerifying ? 'Checking…' : 'Verify code'}
                </button>
                {workResendRemaining > 0 ? (
                  <span className="text-xs text-gray-500">Resend in {workResendRemaining}s</span>
                ) : (
                  <button
                    type="button"
                    className="text-sm font-semibold text-[#FF6F61] hover:text-[#e85d52] underline underline-offset-2"
                    disabled={workSending}
                    onClick={() => void sendWorkCode()}
                  >
                    Resend code
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
