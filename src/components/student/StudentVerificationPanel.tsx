import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { getValidAccessTokenForFunctions } from '../../lib/supabaseEdgeInvoke'
import type { Database } from '../../lib/database.types'
import { StudentUniEmailVerification } from './StudentUniEmailVerification'
import { isStudentUniEmailVerified } from '../../lib/studentUniEmailVerification'
import { isValidWorkEmailForVerification, workEmailDomainErrorMessage } from '../../lib/workEmailDomains'
import { formatDate } from '../../pages/admin/adminUi'
import { readSupabaseFunctionInvokeError } from '../../lib/readSupabaseFunctionInvokeError'
import { isNonStudentAccommodationRoute } from '../../lib/studentOnboarding'
import { messageFromSupabaseError } from '../../lib/supabaseErrorMessage'
import {
  CHOOSE_VERIFICATION_FILE_LABEL,
  isVerificationPdf,
  MAX_VERIFICATION_DOC_BYTES,
  validateVerificationFileSize,
  validateVerificationFileType,
  VERIFICATION_FILE_ACCEPT,
} from '../../lib/verificationDocUpload'
import {
  docFromProfile,
  docStepComplete,
  hasUploadedDoc,
  profileDocFieldsFromValues,
  resolveUploadedDoc,
  type VerificationDocKind,
  type VerificationUploadedDoc,
} from '../../lib/verificationDocSlot'
import { runVerificationDocUpload } from '../../lib/runVerificationDocUpload'
import { OwnerVerificationDocPreview } from './OwnerVerificationDocPreview'
import {
  clearVerificationOtpPending,
  readVerificationOtpPendingEmail,
  writeVerificationOtpPending,
} from '../../lib/verificationOtpPendingStorage'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

const RESEND_SECONDS = 60

function revokeBlobUrl(url: string | null | undefined) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

function profileDocFields(profile: StudentRow, kind: VerificationDocKind) {
  return profileDocFieldsFromValues(kind, {
    idUrl: profile.id_document_url,
    idSubmittedAt: profile.id_submitted_at,
    enrolUrl: profile.enrolment_doc_url,
    enrolSubmittedAt: profile.enrolment_submitted_at,
    identitySupportUrl: profile.identity_supporting_doc_url,
    identitySupportSubmittedAt: profile.identity_supporting_submitted_at,
  })
}

const verificationUploadButtonClass =
  'w-full sm:w-auto min-h-[3rem] px-6 rounded-lg border-2 border-indigo-600 text-indigo-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-indigo-50 disabled:opacity-50'

function formatReceivedAt(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return formatDate(iso)
  }
}

function DocUploadControl({
  busy,
  uploaded,
  error,
  onPick,
  reviewNote,
}: {
  busy: boolean
  uploaded: VerificationUploadedDoc | null
  error: string | null
  onPick: (e: ChangeEvent<HTMLInputElement>) => void
  reviewNote?: string
}) {
  const inputId = useId()
  const [inputKey, setInputKey] = useState(0)

  const pickLabel = uploaded
    ? busy
      ? 'Uploading…'
      : 'Replace document'
    : busy
      ? 'Uploading…'
      : CHOOSE_VERIFICATION_FILE_LABEL

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onPick(e)
    setInputKey((k) => k + 1)
  }

  return (
    <div className="space-y-3">
      {uploaded ? <DocReceivedCard doc={uploaded} reviewNote={reviewNote} /> : null}
      {error ? <UploadFailedBanner message={error} /> : null}
      <input
        key={inputKey}
        id={inputId}
        type="file"
        accept={VERIFICATION_FILE_ACCEPT}
        className="sr-only"
        onChange={handleChange}
        disabled={busy}
      />
      <label
        htmlFor={busy ? undefined : inputId}
        aria-disabled={busy}
        className={`${verificationUploadButtonClass}${busy ? ' opacity-50 pointer-events-none' : ' cursor-pointer'}`}
      >
        <span className="text-lg leading-none">+</span>
        {pickLabel}
      </label>
    </div>
  )
}

function UploadFailedBanner({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 flex gap-2.5 items-start shadow-sm"
      role="alert"
      aria-live="assertive"
    >
      <span className="text-xl leading-none text-red-600 shrink-0" aria-hidden>
        !
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-red-950">Upload failed</p>
        <p className="text-red-900/90 mt-1 break-words">{message}</p>
      </div>
    </div>
  )
}

function DocReceivedCard({
  doc,
  reviewNote,
}: {
  doc: VerificationUploadedDoc
  reviewNote?: string
}) {
  return (
    <div
      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex gap-2.5 items-start">
        <span className="text-xl leading-none text-emerald-600 shrink-0" aria-hidden>
          {doc.pending ? '…' : '✓'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-emerald-950">
            {doc.pending ? 'Uploading your document…' : 'Document received'}
          </p>
          {!doc.pending ? (
            <p className="text-emerald-900/90 mt-1">
              Received {formatReceivedAt(doc.submittedAt)} · pending review (not verified yet)
            </p>
          ) : null}
          <p className="text-emerald-900/90 mt-1 break-all">
            <span className="font-medium">{doc.displayFileName}</span>
          </p>
          {reviewNote && !doc.pending ? <p className="text-xs text-emerald-800/80 mt-2">{reviewNote}</p> : null}
          {doc.previewUrl || doc.filePath ? (
            <OwnerVerificationDocPreview
              key={`${doc.filePath}-${doc.submittedAt}-${doc.previewUrl ?? ''}`}
              filePath={doc.filePath || doc.displayFileName}
              submittedAt={doc.submittedAt}
              previewUrl={doc.previewUrl}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

const cardClass = 'rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm'

type Props = {
  profile: StudentRow
  userId: string
  onRefresh: () => Promise<void>
  onVerificationDocUploaded: (kind: VerificationDocKind, filePath: string, submittedAt: string) => void
}

export function StudentVerificationPanel({ profile, userId, onRefresh, onVerificationDocUploaded }: Props) {

  const emailVerified = isStudentUniEmailVerified(profile)
  const workEmailVerified = Boolean(profile.work_email_verified && profile.work_email)

  const [uploadedByKind, setUploadedByKind] = useState<Partial<Record<VerificationDocKind, VerificationUploadedDoc>>>({})
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  const hasIdDoc = hasUploadedDoc('id', uploadedByKind, profileDocFields(profile, 'id'))
  const hasEnrolDoc = hasUploadedDoc('enrolment', uploadedByKind, profileDocFields(profile, 'enrolment'))
  const hasIdentitySupportDoc = hasUploadedDoc(
    'identity_supporting',
    uploadedByKind,
    profileDocFields(profile, 'identity_supporting'),
  )

  const idDoc = resolveUploadedDoc(
    uploadedByKind.id,
    docFromProfile(profile.id_document_url, profile.id_submitted_at),
  )
  const enrolDoc = resolveUploadedDoc(
    uploadedByKind.enrolment,
    docFromProfile(profile.enrolment_doc_url, profile.enrolment_submitted_at),
  )
  const identitySupportDoc = resolveUploadedDoc(
    uploadedByKind.identity_supporting,
    docFromProfile(profile.identity_supporting_doc_url, profile.identity_supporting_submitted_at),
  )

  const useIdentityFlow =
    profile.verification_type === 'identity' ||
    (profile.verification_type === 'none' && isNonStudentAccommodationRoute(profile.accommodation_verification_route))

  const completeCount = useIdentityFlow
    ? [workEmailVerified, docStepComplete(idDoc), docStepComplete(identitySupportDoc)].filter(Boolean).length
    : [emailVerified, docStepComplete(idDoc), docStepComplete(enrolDoc)].filter(Boolean).length
  const progressTotal = 3
  const progressPct = Math.round((completeCount / progressTotal) * 100)

  const [workEmailInput, setWorkEmailInput] = useState(profile.work_email ?? '')
  const [workOtpInput, setWorkOtpInput] = useState('')
  const [workCodeSent, setWorkCodeSent] = useState(false)
  const [workSendError, setWorkSendError] = useState<string | null>(null)
  const [workVerifyError, setWorkVerifyError] = useState<string | null>(null)
  const [workSending, setWorkSending] = useState(false)
  const [workVerifying, setWorkVerifying] = useState(false)
  const [workResendAt, setWorkResendAt] = useState<number | null>(null)
  const [, setWorkResendTick] = useState(0)

  const [idUploadError, setIdUploadError] = useState<string | null>(null)
  const [enrolUploadError, setEnrolUploadError] = useState<string | null>(null)
  const [identitySupportUploadError, setIdentitySupportUploadError] = useState<string | null>(null)
  const [idUploading, setIdUploading] = useState(false)
  const [enrolUploading, setEnrolUploading] = useState(false)
  const [identitySupportUploading, setIdentitySupportUploading] = useState(false)

  function revertDocUpload(
    kind: VerificationDocKind,
    previewUrl: string | null,
    rollback: VerificationUploadedDoc | null,
  ) {
    revokeBlobUrl(previewUrl)
    setUploadedByKind((prev) => {
      if (rollback) return { ...prev, [kind]: rollback }
      const next = { ...prev }
      delete next[kind]
      return next
    })
  }

  async function handleDocChange(
    e: ChangeEvent<HTMLInputElement>,
    kind: VerificationDocKind,
    setErr: (s: string | null) => void,
    setBusy: (b: boolean) => void,
  ) {
    setErr(null)
    const file = e.target.files?.[0]
    if (e.target) e.target.value = ''
    if (!file) return

    const profileFields = profileDocFields(profile, kind)
    const existing = resolveUploadedDoc(
      uploadedByKind[kind],
      docFromProfile(profileFields.url, profileFields.submittedAt),
    )
    const rollback: VerificationUploadedDoc | null =
      existing && !existing.pending
        ? {
            filePath: existing.filePath,
            submittedAt: existing.submittedAt,
            displayFileName: existing.displayFileName,
          }
        : null

    const instantPreview = isVerificationPdf(file) ? null : URL.createObjectURL(file)

    setBusy(true)
    setUploadedByKind((prev) => {
      revokeBlobUrl(prev[kind]?.previewUrl)
      return {
        ...prev,
        [kind]: {
          filePath: existing?.filePath ?? '',
          submittedAt: new Date().toISOString(),
          displayFileName: file.name,
          previewUrl: instantPreview,
          pending: true,
        },
      }
    })

    const sizeError = validateVerificationFileSize(file, MAX_VERIFICATION_DOC_BYTES)
    if (sizeError) {
      revertDocUpload(kind, instantPreview, rollback)
      setErr(sizeError)
      setBusy(false)
      return
    }
    const typeError = validateVerificationFileType(file)
    if (typeError) {
      revertDocUpload(kind, instantPreview, rollback)
      setErr(typeError)
      setBusy(false)
      return
    }

    try {
      const result = await runVerificationDocUpload(supabase, userId, kind, file)
      if (!result.ok) {
        throw new Error(result.message)
      }

      setUploadedByKind((prev) => ({
        ...prev,
        [kind]: {
          filePath: result.filePath,
          submittedAt: result.submittedAt,
          displayFileName: file.name,
          previewUrl: prev[kind]?.previewUrl ?? instantPreview,
          pending: false,
        },
      }))
      onVerificationDocUploaded(kind, result.filePath, result.submittedAt)
    } catch (err: unknown) {
      console.error('Verification document upload failed', { kind, fileName: file.name, error: err })
      revertDocUpload(kind, instantPreview, rollback)
      let msg = err instanceof Error ? err.message : messageFromSupabaseError(err)
      if (msg === 'Something went wrong.' || msg === 'Unknown error') {
        msg = String(err)
      }
      if (msg.includes('Bucket not found') || msg.includes('not found')) {
        msg =
          'Document storage is not set up yet. Ask the team to run supabase/student_verification.sql and create the student-documents bucket.'
      }
      setErr(msg)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (profile.verification_type !== 'none') return
    if (useIdentityFlow) return
    if (!emailVerified || !hasIdDoc || !hasEnrolDoc) return
    let cancelled = false
    ;(async () => {
      const { error } = await supabase
        .from('student_profiles')
        .update({ verification_type: 'student' })
        .eq('user_id', userId)
      if (!error && !cancelled) await onRefreshRef.current()
    })()
    return () => {
      cancelled = true
    }
  }, [
    profile.verification_type,
    emailVerified,
    hasIdDoc,
    hasEnrolDoc,
    userId,
    useIdentityFlow,
  ])

  useEffect(() => {
    if (profile.verification_type !== 'none') return
    if (!useIdentityFlow) return
    if (!hasIdDoc || !hasIdentitySupportDoc) return
    let cancelled = false
    ;(async () => {
      const { error } = await supabase
        .from('student_profiles')
        .update({ verification_type: 'identity' })
        .eq('user_id', userId)
      if (!error && !cancelled) await onRefreshRef.current()
    })()
    return () => {
      cancelled = true
    }
  }, [
    profile.verification_type,
    useIdentityFlow,
    hasIdDoc,
    hasIdentitySupportDoc,
    userId,
  ])

  useEffect(() => {
    if (!useIdentityFlow) return
    if (!workEmailVerified) {
      setWorkEmailInput((prev) => (prev.trim() ? prev : profile.work_email ?? ''))
    }
  }, [profile.work_email, workEmailVerified, useIdentityFlow])

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

  const inputClass =
    'w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 bg-white'
  const labelClass = 'block text-sm font-semibold text-gray-900 mb-1'

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
      await onRefresh()
    } finally {
      setWorkVerifying(false)
    }
  }, [workOtpInput, onRefresh, userId])

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
            {completeCount} of 3 complete - work email (optional), government ID plus one supporting document (payslip,
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
                  docStepComplete(idDoc) ? 'bg-emerald-500 text-white' : 'bg-white border border-stone-200 text-stone-500'
                }`}
              >
                {docStepComplete(idDoc) ? '✓' : idDoc?.pending ? '…' : '2'}
              </span>
              Photo ID
            </li>
            <li className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                  docStepComplete(identitySupportDoc) ? 'bg-emerald-500 text-white' : 'bg-white border border-stone-200 text-stone-500'
                }`}
              >
                {docStepComplete(identitySupportDoc) ? '✓' : identitySupportDoc?.pending ? '…' : '3'}
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
                        Avoid tapping <strong>Resend</strong> too often - each send creates a <strong>new</strong> code.
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
          <div className="mt-4">
            <DocUploadControl
              busy={idUploading}
              uploaded={idDoc}
              error={idUploadError}
              onPick={(e) => void handleDocChange(e, 'id', setIdUploadError, setIdUploading)}
              reviewNote="Our team may review this document."
            />
          </div>
        </section>

        <section className={cardClass} aria-labelledby="verify-support-heading">
          <h3 id="verify-support-heading" className="text-base font-bold text-gray-900">
            Supporting document
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload a recent payslip, employment letter, or bank statement (JPEG, PNG, or PDF).
          </p>
          <div className="mt-4">
            <DocUploadControl
              busy={identitySupportUploading}
              uploaded={identitySupportDoc}
              error={identitySupportUploadError}
              onPick={(e) =>
                void handleDocChange(e, 'identity_supporting', setIdentitySupportUploadError, setIdentitySupportUploading)
              }
            />
          </div>
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
          {completeCount} of 3 complete - help landlords trust your application.
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
                docStepComplete(idDoc) ? 'bg-emerald-500 text-white' : 'bg-white border border-stone-200 text-stone-500'
              }`}
            >
              {docStepComplete(idDoc) ? '✓' : idDoc?.pending ? '…' : '2'}
            </span>
            Photo ID
          </li>
          <li className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                docStepComplete(enrolDoc) ? 'bg-emerald-500 text-white' : 'bg-white border border-stone-200 text-stone-500'
              }`}
            >
              {docStepComplete(enrolDoc) ? '✓' : enrolDoc?.pending ? '…' : '3'}
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

        <div className="mt-4">
          <StudentUniEmailVerification profile={profile} onVerified={onRefresh} variant="profile" />
        </div>
      </section>

      <section className={cardClass} aria-labelledby="verify-id-heading">
        <h3 id="verify-id-heading" className="text-base font-bold text-gray-900">
          Photo ID
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Upload a clear photo of your passport or Australian driver&apos;s licence.
        </p>
        <div className="mt-4">
          <DocUploadControl
            busy={idUploading}
            uploaded={idDoc}
            error={idUploadError}
            onPick={(e) => void handleDocChange(e, 'id', setIdUploadError, setIdUploading)}
            reviewNote="Our team may review this document."
          />
        </div>
      </section>

      <section className={cardClass} aria-labelledby="verify-enrol-heading">
        <h3 id="verify-enrol-heading" className="text-base font-bold text-gray-900">
          Proof of enrolment
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Upload your university enrolment confirmation letter or Confirmation of Enrolment (CoE) for international
          students.
        </p>
        <div className="mt-4">
          <DocUploadControl
            busy={enrolUploading}
            uploaded={enrolDoc}
            error={enrolUploadError}
            onPick={(e) => void handleDocChange(e, 'enrolment', setEnrolUploadError, setEnrolUploading)}
          />
        </div>
      </section>
    </div>
  )
}
