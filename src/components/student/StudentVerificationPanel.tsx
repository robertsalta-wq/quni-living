import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { getValidAccessTokenForFunctions } from '../../lib/supabaseEdgeInvoke'
import type { Database } from '../../lib/database.types'
import { isValidUniEmailForVerification, uniEmailDomainErrorMessage } from '../../lib/uniEmailDomains'
import { isValidWorkEmailForVerification, workEmailDomainErrorMessage } from '../../lib/workEmailDomains'
import { formatDate } from '../../pages/admin/adminUi'
import { readSupabaseFunctionInvokeError } from '../../lib/readSupabaseFunctionInvokeError'
import { isNonStudentAccommodationRoute } from '../../lib/studentOnboarding'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

const DOC_BUCKET = 'student-documents'
const MAX_DOC_BYTES = 5 * 1024 * 1024
const RESEND_SECONDS = 60

const cardClass = 'rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm'

type Props = {
  profile: StudentRow
  userId: string
  onRefresh: () => Promise<void>
}

type DocKind = 'id' | 'enrolment' | 'identity_supporting'

export function StudentVerificationPanel({ profile, userId, onRefresh }: Props) {
  const emailVerified = Boolean(profile.uni_email_verified && profile.uni_email)
  const workEmailVerified = Boolean(profile.work_email_verified && profile.work_email)
  const idSubmitted = Boolean(profile.id_submitted_at && profile.id_document_url)
  const enrolSubmitted = Boolean(profile.enrolment_submitted_at && profile.enrolment_doc_url)
  const identitySupportingSubmitted = Boolean(
    profile.identity_supporting_submitted_at && profile.identity_supporting_doc_url,
  )

  const useIdentityFlow =
    profile.verification_type === 'identity' ||
    (profile.verification_type === 'none' && isNonStudentAccommodationRoute(profile.accommodation_verification_route))

  const completeCount = useIdentityFlow
    ? [workEmailVerified, idSubmitted, identitySupportingSubmitted].filter(Boolean).length
    : [emailVerified, idSubmitted, enrolSubmitted].filter(Boolean).length
  const progressTotal = 3
  const progressPct = Math.round((completeCount / progressTotal) * 100)

  const [uniEmailInput, setUniEmailInput] = useState(profile.uni_email ?? '')
  const [otpInput, setOtpInput] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resendAt, setResendAt] = useState<number | null>(null)
  const [, setResendTick] = useState(0)

  const [workEmailInput, setWorkEmailInput] = useState(profile.work_email ?? '')
  const [workOtpInput, setWorkOtpInput] = useState('')
  const [workCodeSent, setWorkCodeSent] = useState(false)
  const [workSendError, setWorkSendError] = useState<string | null>(null)
  const [workVerifyError, setWorkVerifyError] = useState<string | null>(null)
  const [workSending, setWorkSending] = useState(false)
  const [workVerifying, setWorkVerifying] = useState(false)
  const [workResendAt, setWorkResendAt] = useState<number | null>(null)
  const [, setWorkResendTick] = useState(0)

  const idInputRef = useRef<HTMLInputElement>(null)
  const enrolInputRef = useRef<HTMLInputElement>(null)
  const identitySupportInputRef = useRef<HTMLInputElement>(null)
  const [idUploadError, setIdUploadError] = useState<string | null>(null)
  const [enrolUploadError, setEnrolUploadError] = useState<string | null>(null)
  const [identitySupportUploadError, setIdentitySupportUploadError] = useState<string | null>(null)
  const [idUploading, setIdUploading] = useState(false)
  const [enrolUploading, setEnrolUploading] = useState(false)
  const [identitySupportUploading, setIdentitySupportUploading] = useState(false)

  useEffect(() => {
    if (profile.verification_type !== 'none') return
    if (useIdentityFlow) return
    if (!emailVerified || !idSubmitted || !enrolSubmitted) return
    let cancelled = false
    ;(async () => {
      const { error } = await supabase
        .from('student_profiles')
        .update({ verification_type: 'student' })
        .eq('user_id', userId)
      if (!error && !cancelled) await onRefresh()
    })()
    return () => {
      cancelled = true
    }
  }, [profile.verification_type, emailVerified, idSubmitted, enrolSubmitted, userId, onRefresh, useIdentityFlow])

  useEffect(() => {
    if (profile.verification_type !== 'none') return
    if (!useIdentityFlow) return
    if (!idSubmitted || !identitySupportingSubmitted) return
    let cancelled = false
    ;(async () => {
      const { error } = await supabase
        .from('student_profiles')
        .update({ verification_type: 'identity' })
        .eq('user_id', userId)
      if (!error && !cancelled) await onRefresh()
    })()
    return () => {
      cancelled = true
    }
  }, [
    profile.verification_type,
    useIdentityFlow,
    idSubmitted,
    identitySupportingSubmitted,
    userId,
    onRefresh,
  ])

  useEffect(() => {
    if (!emailVerified) {
      setUniEmailInput((prev) => (prev.trim() ? prev : profile.uni_email ?? ''))
    }
  }, [profile.uni_email, emailVerified])

  useEffect(() => {
    if (!useIdentityFlow) return
    if (!workEmailVerified) {
      setWorkEmailInput((prev) => (prev.trim() ? prev : profile.work_email ?? ''))
    }
  }, [profile.work_email, workEmailVerified, useIdentityFlow])

  useEffect(() => {
    if (resendAt == null || Date.now() >= resendAt) return
    const t = window.setInterval(() => setResendTick((x) => x + 1), 1000)
    return () => window.clearInterval(t)
  }, [resendAt])

  useEffect(() => {
    if (workResendAt == null || Date.now() >= workResendAt) return
    const t = window.setInterval(() => setWorkResendTick((x) => x + 1), 1000)
    return () => window.clearInterval(t)
  }, [workResendAt])

  const resendRemaining =
    resendAt != null && Date.now() < resendAt ? Math.ceil((resendAt - Date.now()) / 1000) : 0

  const workResendRemaining =
    workResendAt != null && Date.now() < workResendAt ? Math.ceil((workResendAt - Date.now()) / 1000) : 0

  const inputClass =
    'w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 bg-white'
  const labelClass = 'block text-sm font-semibold text-gray-900 mb-1'

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
      setCodeSent(true)
      setOtpInput('')
      setResendAt(Date.now() + RESEND_SECONDS * 1000)
    } finally {
      setSending(false)
    }
  }, [uniEmailInput])

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
      setCodeSent(false)
      setOtpInput('')
      setResendAt(null)
      await onRefresh()
    } finally {
      setVerifying(false)
    }
  }, [otpInput, onRefresh])

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
      setWorkCodeSent(true)
      setWorkOtpInput('')
      setWorkResendAt(Date.now() + RESEND_SECONDS * 1000)
    } finally {
      setWorkSending(false)
    }
  }, [workEmailInput])

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
      setWorkCodeSent(false)
      setWorkOtpInput('')
      setWorkResendAt(null)
      await onRefresh()
    } finally {
      setWorkVerifying(false)
    }
  }, [workOtpInput, onRefresh])

  async function uploadDoc(
    file: File,
    kind: DocKind,
    setErr: (s: string | null) => void,
    setBusy: (b: boolean) => void,
  ) {
    setErr(null)
    if (file.size > MAX_DOC_BYTES) {
      setErr('File must be 5 MB or smaller.')
      return
    }
    const okType =
      file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'application/pdf'
    if (!okType) {
      setErr('Use a JPEG, PNG, or PDF file.')
      return
    }
    setBusy(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const safeExt =
        ext && /^[a-z0-9]+$/i.test(ext) && (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'pdf')
          ? ext === 'jpeg'
            ? 'jpg'
            : ext
          : file.type === 'image/png'
            ? 'png'
            : file.type === 'application/pdf'
              ? 'pdf'
              : 'jpg'
      const base =
        kind === 'id'
          ? 'id-document'
          : kind === 'enrolment'
            ? 'enrolment-doc'
            : 'identity-supporting-doc'
      const path = `${userId}/${base}.${safeExt}`

      const { error: upErr } = await supabase.storage.from(DOC_BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type,
      })
      if (upErr) throw upErr

      const nowIso = new Date().toISOString()
      const patch =
        kind === 'id'
          ? { id_document_url: path, id_submitted_at: nowIso }
          : kind === 'enrolment'
            ? { enrolment_doc_url: path, enrolment_submitted_at: nowIso }
            : { identity_supporting_doc_url: path, identity_supporting_submitted_at: nowIso }

      const { error: dbErr } = await supabase.from('student_profiles').update(patch).eq('user_id', userId)
      if (dbErr) throw dbErr

      await onRefresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed.'
      setErr(
        msg.includes('Bucket not found') || msg.includes('not found')
          ? 'Document storage is not set up yet. Ask the team to run supabase/student_verification.sql and create the student-documents bucket.'
          : msg,
      )
    } finally {
      setBusy(false)
    }
  }

  function onIdFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) void uploadDoc(f, 'id', setIdUploadError, setIdUploading)
  }

  function onEnrolFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) void uploadDoc(f, 'enrolment', setEnrolUploadError, setEnrolUploading)
  }

  function onIdentitySupportFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) void uploadDoc(f, 'identity_supporting', setIdentitySupportUploadError, setIdentitySupportUploading)
  }

  const coralBtn =
    'inline-flex items-center justify-center rounded-lg bg-[#FF6F61] text-white text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-[#e85d52] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61] focus-visible:ring-offset-2 disabled:opacity-50'

  if (useIdentityFlow) {
    return (
      <div className="space-y-6">
        <section
          className="rounded-2xl border border-[#FF6F61]/20 bg-[#FFF8F0] p-5 sm:p-6 shadow-sm"
          aria-labelledby="verification-summary-heading"
        >
          <h2 id="verification-summary-heading" className="text-lg font-bold text-gray-900">
            Identity verification
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {completeCount} of 3 complete — work email (optional), government ID plus one supporting document (payslip,
            employment letter, or bank statement).
          </p>
          <div className="mt-4 h-2.5 rounded-full bg-stone-200 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%`, backgroundColor: '#FF6F61' }}
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${completeCount} of 3 verification steps complete`}
            />
          </div>
          <ol className="flex flex-wrap gap-4 mt-5 text-xs font-semibold text-gray-600">
            <li className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                  workEmailVerified ? 'bg-emerald-500 text-white' : 'bg-white border border-stone-200 text-stone-500'
                }`}
              >
                {workEmailVerified ? '✓' : '1'}
              </span>
              Work email
            </li>
            <li className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                  idSubmitted ? 'bg-emerald-500 text-white' : 'bg-white border border-stone-200 text-stone-500'
                }`}
              >
                {idSubmitted ? '✓' : '2'}
              </span>
              Photo ID
            </li>
            <li className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                  identitySupportingSubmitted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white border border-stone-200 text-stone-500'
                }`}
              >
                {identitySupportingSubmitted ? '✓' : '3'}
              </span>
              Supporting document
            </li>
          </ol>
        </section>

        <section className={cardClass} aria-labelledby="verify-work-email-heading">
          <h3 id="verify-work-email-heading" className="text-base font-bold text-gray-900">
            Work email verification <span className="text-stone-500 font-semibold text-xs">(optional)</span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Verify your work email to show you can be contacted quickly about your application.
          </p>

          {workEmailVerified ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
              <span className="text-lg" aria-hidden>
                ✅
              </span>
              <span className="font-semibold">Verified</span>
              <span className="text-emerald-800">{profile.work_email}</span>
              {profile.work_email_verified_at && (
                <span className="text-emerald-700/90 text-xs w-full sm:w-auto sm:ml-2">
                  on {formatDate(profile.work_email_verified_at)}
                </span>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {!workCodeSent ? (
                <div>
                  <label htmlFor="work-email-verify" className={labelClass}>
                    Work email
                  </label>
                  <input
                    id="work-email-verify"
                    type="email"
                    autoComplete="email"
                    value={workEmailInput}
                    onChange={(e) => {
                      setWorkEmailInput(e.target.value)
                      setWorkSendError(null)
                    }}
                    placeholder="you@company.com"
                    className={inputClass}
                  />
                  {workSendError && (
                    <p className="text-xs text-red-600 mt-2" role="alert">
                      {workSendError}
                    </p>
                  )}
                  <button
                    type="button"
                    className={`${coralBtn} mt-3`}
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
                  <div className="rounded-lg border border-stone-200 bg-stone-50/90 px-3 py-2.5 text-xs text-stone-700 space-y-1.5 mb-4">
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
                  {workVerifyError && (
                    <p className="text-xs text-red-600 mt-2" role="alert">
                      {workVerifyError}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-3">
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
        </section>

        <section className={cardClass} aria-labelledby="verify-id-heading">
          <h3 id="verify-id-heading" className="text-base font-bold text-gray-900">
            Government photo ID
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload a clear photo of your passport or Australian driver&apos;s licence.
          </p>
          {idSubmitted ? (
            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-gray-800">
              <p className="font-semibold">
                <span aria-hidden>📄</span> ID provided
              </p>
              {profile.id_submitted_at && (
                <p className="text-gray-600 mt-1">Submitted {formatDate(profile.id_submitted_at)}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">Our team may review this document.</p>
            </div>
          ) : (
            <div className="mt-4">
              <input
                ref={idInputRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="sr-only"
                onChange={onIdFile}
              />
              <button
                type="button"
                disabled={idUploading}
                onClick={() => idInputRef.current?.click()}
                className="w-full sm:w-auto min-h-[2.75rem] px-5 rounded-lg border-2 border-[#FF6F61] text-[#FF6F61] font-semibold text-sm hover:bg-[#FFF8F0] disabled:opacity-50"
              >
                {idUploading ? 'Uploading…' : 'Choose file (JPEG, PNG or PDF, max 5 MB)'}
              </button>
              {idUploadError && (
                <p className="text-xs text-red-600 mt-2" role="alert">
                  {idUploadError}
                </p>
              )}
            </div>
          )}
        </section>

        <section className={cardClass} aria-labelledby="verify-support-heading">
          <h3 id="verify-support-heading" className="text-base font-bold text-gray-900">
            Supporting document
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload a recent payslip, employment letter, or bank statement (JPEG, PNG, or PDF).
          </p>
          {identitySupportingSubmitted ? (
            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-gray-800">
              <p className="font-semibold">
                <span aria-hidden>📎</span> Document provided
              </p>
              {profile.identity_supporting_submitted_at && (
                <p className="text-gray-600 mt-1">Submitted {formatDate(profile.identity_supporting_submitted_at)}</p>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <input
                ref={identitySupportInputRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="sr-only"
                onChange={onIdentitySupportFile}
              />
              <button
                type="button"
                disabled={identitySupportUploading}
                onClick={() => identitySupportInputRef.current?.click()}
                className="w-full sm:w-auto min-h-[2.75rem] px-5 rounded-lg border-2 border-[#FF6F61] text-[#FF6F61] font-semibold text-sm hover:bg-[#FFF8F0] disabled:opacity-50"
              >
                {identitySupportUploading ? 'Uploading…' : 'Choose file (JPEG, PNG or PDF, max 5 MB)'}
              </button>
              {identitySupportUploadError && (
                <p className="text-xs text-red-600 mt-2" role="alert">
                  {identitySupportUploadError}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section
        className="rounded-2xl border border-[#FF6F61]/20 bg-[#FFF8F0] p-5 sm:p-6 shadow-sm"
        aria-labelledby="verification-summary-heading"
      >
        <h2 id="verification-summary-heading" className="text-lg font-bold text-gray-900">
          Profile verification
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {completeCount} of 3 complete — help landlords trust your application.
        </p>
        <div className="mt-4 h-2.5 rounded-full bg-stone-200 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%`, backgroundColor: '#FF6F61' }}
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${completeCount} of 3 verification steps complete`}
          />
        </div>
        <ol className="flex flex-wrap gap-4 mt-5 text-xs font-semibold text-gray-600">
          <li className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                emailVerified ? 'bg-emerald-500 text-white' : 'bg-white border border-stone-200 text-stone-500'
              }`}
            >
              {emailVerified ? '✓' : '1'}
            </span>
            Uni email
          </li>
          <li className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                idSubmitted ? 'bg-emerald-500 text-white' : 'bg-white border border-stone-200 text-stone-500'
              }`}
            >
              {idSubmitted ? '✓' : '2'}
            </span>
            Photo ID
          </li>
          <li className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                enrolSubmitted ? 'bg-emerald-500 text-white' : 'bg-white border border-stone-200 text-stone-500'
              }`}
            >
              {enrolSubmitted ? '✓' : '3'}
            </span>
            Enrolment
          </li>
        </ol>
      </section>

      <section className={cardClass} aria-labelledby="verify-email-heading">
        <h3 id="verify-email-heading" className="text-base font-bold text-gray-900">
          University email verification
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Verify your student status by confirming access to your university email.
        </p>

        {emailVerified ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
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
        ) : (
          <div className="mt-4 space-y-4">
            {!codeSent ? (
              <div>
                <label htmlFor="uni-email-verify" className={labelClass}>
                  University email
                </label>
                <input
                  id="uni-email-verify"
                  type="email"
                  autoComplete="email"
                  value={uniEmailInput}
                  onChange={(e) => {
                    setUniEmailInput(e.target.value)
                    setSendError(null)
                  }}
                  placeholder="you@student.unsw.edu.au"
                  className={inputClass}
                />
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
                  the first messages from a new sender (greylisting) — <strong>5–10 minutes</strong> is still normal.
                </p>
                <div className="rounded-lg border border-stone-200 bg-stone-50/90 px-3 py-2.5 text-xs text-stone-700 space-y-1.5 mb-4">
                  <p className="font-semibold text-stone-800">While you wait</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      Check <strong>Spam</strong>, <strong>Promotions</strong>, <strong>Updates</strong>, and search your
                      inbox for <strong>Quni</strong> or <strong>verification</strong>.
                    </li>
                    <li>
                      Avoid tapping <strong>Resend</strong> too often — each send creates a <strong>new</strong> code
                      and only the <strong>latest</strong> email will work.
                    </li>
                    <li>
                      After the timer, you can <strong>Resend code</strong> if nothing has arrived.
                    </li>
                  </ul>
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
                </div>
                <label htmlFor="uni-otp" className={labelClass}>
                  6-digit code
                </label>
                <input
                  id="uni-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
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
                  <button
                    type="button"
                    className={coralBtn}
                    disabled={verifying}
                    onClick={() => void verifyCode()}
                  >
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
        )}
      </section>

      <section className={cardClass} aria-labelledby="verify-id-heading">
        <h3 id="verify-id-heading" className="text-base font-bold text-gray-900">
          Photo ID
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Upload a clear photo of your passport or Australian driver&apos;s licence.
        </p>
        {idSubmitted ? (
          <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-gray-800">
            <p className="font-semibold">
              <span aria-hidden>📄</span> ID provided
            </p>
            {profile.id_submitted_at && (
              <p className="text-gray-600 mt-1">Submitted {formatDate(profile.id_submitted_at)}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">Our team may review this document.</p>
          </div>
        ) : (
          <div className="mt-4">
            <input
              ref={idInputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="sr-only"
              onChange={onIdFile}
            />
            <button
              type="button"
              disabled={idUploading}
              onClick={() => idInputRef.current?.click()}
              className="w-full sm:w-auto min-h-[2.75rem] px-5 rounded-lg border-2 border-[#FF6F61] text-[#FF6F61] font-semibold text-sm hover:bg-[#FFF8F0] disabled:opacity-50"
            >
              {idUploading ? 'Uploading…' : 'Choose file (JPEG, PNG or PDF, max 5 MB)'}
            </button>
            {idUploadError && (
              <p className="text-xs text-red-600 mt-2" role="alert">
                {idUploadError}
              </p>
            )}
          </div>
        )}
      </section>

      <section className={cardClass} aria-labelledby="verify-enrol-heading">
        <h3 id="verify-enrol-heading" className="text-base font-bold text-gray-900">
          Proof of enrolment
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Upload your university enrolment confirmation letter or Confirmation of Enrolment (CoE) for international
          students.
        </p>
        {enrolSubmitted ? (
          <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-gray-800">
            <p className="font-semibold">
              <span aria-hidden>🎓</span> Enrolment submitted
            </p>
            {profile.enrolment_submitted_at && (
              <p className="text-gray-600 mt-1">Submitted {formatDate(profile.enrolment_submitted_at)}</p>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <input
              ref={enrolInputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="sr-only"
              onChange={onEnrolFile}
            />
            <button
              type="button"
              disabled={enrolUploading}
              onClick={() => enrolInputRef.current?.click()}
              className="w-full sm:w-auto min-h-[2.75rem] px-5 rounded-lg border-2 border-[#FF6F61] text-[#FF6F61] font-semibold text-sm hover:bg-[#FFF8F0] disabled:opacity-50"
            >
              {enrolUploading ? 'Uploading…' : 'Choose file (JPEG, PNG or PDF, max 5 MB)'}
            </button>
            {enrolUploadError && (
              <p className="text-xs text-red-600 mt-2" role="alert">
                {enrolUploadError}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
