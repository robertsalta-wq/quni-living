import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getValidAccessTokenForFunctions } from '../../lib/supabaseEdgeInvoke'
import type { Database } from '../../lib/database.types'
import { StudentUniEmailVerification } from './StudentUniEmailVerification'
import { isStudentUniEmailVerified } from '../../lib/studentUniEmailVerification'
import { isValidWorkEmailForVerification, workEmailDomainErrorMessage } from '../../lib/workEmailDomains'
import { formatDate } from '../../pages/admin/adminUi'
import { readSupabaseFunctionInvokeError } from '../../lib/readSupabaseFunctionInvokeError'
import { isNonStudentAccommodationRoute } from '../../lib/studentOnboarding'
import { tierToSync } from '../../lib/renterReadiness'
import {
  CHOOSE_VERIFICATION_FILE_LABEL,
} from '../../lib/verificationDocUpload'
import {
  docStepComplete,
  type VerificationDocKind,
  type VerificationUploadedDoc,
} from '../../lib/verificationDocSlot'
import { OwnerVerificationDocPreview } from './OwnerVerificationDocPreview'
import { StudentVerificationDocPick } from './StudentVerificationDocPick'
import { VERIF_UPLOAD_FLASH_KEY, type useStudentVerificationDocUpload } from '../../hooks/useStudentVerificationDocUpload'
import { useHoistedVerificationFileInputs } from '../../hooks/useHoistedVerificationFileInputs'
import {
  clearVerificationOtpPending,
  readVerificationOtpPendingEmail,
  writeVerificationOtpPending,
} from '../../lib/verificationOtpPendingStorage'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

const RESEND_SECONDS = 60

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
  onPickClick,
  reviewNote,
}: {
  busy: boolean
  uploaded: VerificationUploadedDoc | null
  error: string | null
  onPickClick: () => void
  reviewNote?: string
}) {
  return (
    <div className="space-y-3">
      {uploaded ? <DocReceivedCard doc={uploaded} reviewNote={reviewNote} /> : null}
      {error ? <UploadFailedBanner message={error} /> : null}
      <StudentVerificationDocPick
        busy={busy}
        label={uploaded ? 'Replace document' : CHOOSE_VERIFICATION_FILE_LABEL}
        onPickClick={onPickClick}
        error={null}
      />
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
          <p className="text-emerald-900/90 mt-1 font-medium truncate" title={doc.displayFileName}>
            {doc.displayFileName}
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

const cardClass = 'quni-card p-5 sm:p-6'

type DocUploadApi = ReturnType<typeof useStudentVerificationDocUpload>

type Props = {
  profile: StudentRow
  userId: string
  onRefresh: () => Promise<void>
  docUpload: DocUploadApi
}

export function StudentVerificationPanel({ profile, userId, onRefresh, docUpload }: Props) {
  const {
    idDoc,
    enrolDoc,
    identitySupportDoc,
    idUploading,
    enrolUploading,
    identitySupportUploading,
    idUploadError,
    enrolUploadError,
    identitySupportUploadError,
    pickIdFile,
    pickEnrolFile,
    pickIdentitySupportFile,
  } = docUpload

  const pickSlots = useMemo(
    () => [
      { kind: 'id' as const, pick: pickIdFile },
      { kind: 'enrolment' as const, pick: pickEnrolFile },
      { kind: 'identity_supporting' as const, pick: pickIdentitySupportFile },
    ],
    [pickIdFile, pickEnrolFile, pickIdentitySupportFile],
  )
  const { hoistedFileInputs, openPicker } = useHoistedVerificationFileInputs(pickSlots)

  // Unmistakable success confirmation: when a doc finishes uploading (pending ->
  // received), flash a prominent banner so users SEE it worked and don't retry.
  const prevPending = useRef<Record<VerificationDocKind, boolean>>({
    id: false,
    enrolment: false,
    identity_supporting: false,
  })
  const [uploadedFlash, setUploadedFlash] = useState<string | null>(null)
  const flashTimer = useRef<number | null>(null)
  useEffect(() => {
    const docs: Array<[VerificationDocKind, VerificationUploadedDoc | null, string]> = [
      ['id', idDoc, 'Photo ID'],
      ['enrolment', enrolDoc, 'Enrolment document'],
      ['identity_supporting', identitySupportDoc, 'Supporting document'],
    ]
    for (const [kind, doc, label] of docs) {
      const justFinished = prevPending.current[kind] && !!doc && !doc.pending && !!doc.filePath
      if (justFinished) {
        setUploadedFlash(`${label} uploaded`)
        if (flashTimer.current) window.clearTimeout(flashTimer.current)
        flashTimer.current = window.setTimeout(() => setUploadedFlash(null), 4500)
      }
      prevPending.current[kind] = !!doc?.pending
    }
  }, [idDoc, enrolDoc, identitySupportDoc])

  // After a post-upload reload (used on devices that don't repaint in place),
  // show the success banner that was flagged just before the reload.
  useEffect(() => {
    let msg: string | null = null
    try {
      msg = sessionStorage.getItem(VERIF_UPLOAD_FLASH_KEY)
      if (msg) sessionStorage.removeItem(VERIF_UPLOAD_FLASH_KEY)
    } catch {
      /* ignore */
    }
    if (!msg) return
    setUploadedFlash(msg)
    // The post-upload reload otherwise restores the old scroll position and dumps
    // the user at the bottom/footer. Land them at the top, on the confirmation.
    window.scrollTo(0, 0)
    const t = window.setTimeout(() => setUploadedFlash(null), 4500)
    return () => window.clearTimeout(t)
  }, [])

  const uploadFlashBanner = uploadedFlash ? (
    <div
      className="fixed top-3 inset-x-3 z-[60] rounded-xl bg-emerald-600 text-white px-4 py-3 shadow-lg text-sm font-semibold flex items-center gap-2"
      role="status"
      aria-live="polite"
    >
      <span aria-hidden>✓</span>
      <span>{uploadedFlash} — pending review</span>
    </div>
  ) : null

  const emailVerified = isStudentUniEmailVerified(profile)
  const workEmailVerified = Boolean(profile.work_email_verified && profile.work_email)

  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

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

  useEffect(() => {
    const next = tierToSync(profile)
    if (!next) return
    let cancelled = false
    ;(async () => {
      const { error } = await supabase
        .from('student_profiles')
        .update({ verification_type: next })
        .eq('user_id', userId)
      if (!error && !cancelled) await onRefreshRef.current()
    })()
    return () => {
      cancelled = true
    }
  }, [
    profile,
    userId,
    profile.verification_type,
    profile.accommodation_verification_route,
    profile.uni_email_verified,
    profile.id_document_url,
    profile.id_submitted_at,
    profile.enrolment_doc_url,
    profile.enrolment_submitted_at,
    profile.identity_supporting_doc_url,
    profile.identity_supporting_submitted_at,
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
    'w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-admin-coral/40 bg-white'
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
    'inline-flex items-center justify-center rounded-lg bg-[var(--quni-coral)] text-white text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-[var(--quni-coral-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quni-coral)] focus-visible:ring-offset-2 disabled:opacity-50'

  if (useIdentityFlow) {
    return (
      <div className="space-y-6 pb-32">
        {hoistedFileInputs}
        {uploadFlashBanner}
        <section
          className="rounded-2xl border border-admin-coral/20 bg-[var(--quni-coral-soft)] p-5 sm:p-6 shadow-sm"
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
              style={{ width: `${progressPct}%`, backgroundColor: 'var(--quni-coral)' }}
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
                        className="text-sm font-semibold text-[var(--quni-coral)] hover:text-[var(--quni-coral-hover)] underline underline-offset-2"
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
              onPickClick={openPicker('id')}
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
              onPickClick={openPicker('identity_supporting')}
            />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-32">
      {hoistedFileInputs}
      {uploadFlashBanner}
      <section
        className="rounded-2xl border border-admin-coral/20 bg-[var(--quni-coral-soft)] p-5 sm:p-6 shadow-sm"
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
            style={{ width: `${progressPct}%`, backgroundColor: 'var(--quni-coral)' }}
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
            onPickClick={openPicker('id')}
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
            onPickClick={openPicker('enrolment')}
          />
        </div>
      </section>
    </div>
  )
}
