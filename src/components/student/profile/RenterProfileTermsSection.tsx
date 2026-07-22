import { useState, type FormEvent, type ReactNode } from 'react'
import { supabase } from '../../../lib/supabase'
import { withSentryMonitoring } from '../../../lib/supabaseErrorMonitor'
import {
  LegalDocumentModal,
  SignupLegalDocLink,
  type LegalDocumentKind,
} from '../../legal/LegalDocumentModal'
import { TermsContent } from '../../legal/TermsContent'
import { PrivacyContent } from '../../legal/PrivacyContent'
import { useRenterProfileSectionValidation } from '../../../hooks/useRenterProfileSectionValidation'
import { RENTER_SAVE_WRITE_FAILURE, termsSectionFieldErrors } from '../../../lib/renterProfileFieldValidation'
import {
  RenterProfileFieldErrorMsg,
  RenterProfileSaveHint,
  RenterProfileSectionErrorBanner,
  RenterProfileWriteError,
} from './RenterProfileValidationUi'
import {
  renterCheckboxErrorClass,
  renterFormActionsColumnClass,
  renterSaveBtnClass,
} from '../../../lib/renterProfileFormClasses'

const TERMS_HINT_LABELS = {
  agreeTerms: 'terms acceptance',
} as const

type StudentLegalDocumentKind = Extract<LegalDocumentKind, 'terms' | 'privacy'>

const STUDENT_LEGAL_DOC_MODAL: Record<StudentLegalDocumentKind, { title: string; content: ReactNode }> = {
  terms: { title: 'Platform Terms of Service', content: <TermsContent /> },
  privacy: { title: 'Privacy Policy', content: <PrivacyContent /> },
}

type Props = {
  userId: string
  onAccepted: () => Promise<void>
}

export function RenterProfileTermsSection({ userId, onAccepted }: Props) {
  const [accepted, setAccepted] = useState(false)
  const [openLegalDoc, setOpenLegalDoc] = useState<LegalDocumentKind | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const {
    fieldErrors,
    sectionError,
    sectionSaveHint,
    saveError,
    setSaveError,
    applyValidationErrors,
    clearFieldError,
    beginSaveAttempt,
  } = useRenterProfileSectionValidation(TERMS_HINT_LABELS)

  const activeLegalDoc =
    openLegalDoc === 'terms' || openLegalDoc === 'privacy' ? STUDENT_LEGAL_DOC_MODAL[openLegalDoc] : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    beginSaveAttempt()

    const errors = termsSectionFieldErrors(accepted)
    if (Object.keys(errors).length > 0) {
      applyValidationErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      const now = new Date().toISOString()
      const { error: upErr } = await withSentryMonitoring('RenterProfileTermsSection/accept', () =>
        supabase.from('student_profiles').update({ terms_accepted_at: now }).eq('user_id', userId),
      )
      if (upErr) throw upErr
      await onAccepted()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : RENTER_SAVE_WRITE_FAILURE)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
      <RenterProfileSectionErrorBanner message={sectionError} />
      <p style={{ fontSize: 'var(--text-body-sm-size)', color: 'var(--quni-ink-3)' }}>
        Accept our policies before you browse listings or apply.
      </p>
      <div>
        <label
          htmlFor="renter-profile-terms"
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            cursor: 'pointer',
            fontSize: 'var(--text-body-sm-size)',
            color: 'var(--quni-ink-2)',
            lineHeight: 1.5,
          }}
        >
          <input
            id="renter-profile-terms"
            type="checkbox"
            checked={accepted}
            onChange={(ev) => {
              setAccepted(ev.target.checked)
              clearFieldError('agreeTerms')
            }}
            className={fieldErrors.agreeTerms ? renterCheckboxErrorClass : undefined}
            style={{ marginTop: 3, accentColor: 'var(--quni-coral)' }}
            aria-invalid={fieldErrors.agreeTerms ? true : undefined}
            aria-describedby={fieldErrors.agreeTerms ? 'renter-profile-terms-error' : undefined}
          />
          <span>
            I agree to the{' '}
            <SignupLegalDocLink kind="terms" onOpen={setOpenLegalDoc}>
              Terms of Service
            </SignupLegalDocLink>{' '}
            and{' '}
            <SignupLegalDocLink kind="privacy" onOpen={setOpenLegalDoc}>
              Privacy Policy
            </SignupLegalDocLink>
          </span>
        </label>
        <RenterProfileFieldErrorMsg id="renter-profile-terms-error" message={fieldErrors.agreeTerms} />
      </div>
      <RenterProfileWriteError message={saveError} />
      <div className={renterFormActionsColumnClass}>
        <RenterProfileSaveHint message={sectionSaveHint} />
        <button type="submit" disabled={submitting} className={renterSaveBtnClass}>
          {submitting ? 'Saving…' : 'Accept and continue'}
        </button>
      </div>
      {activeLegalDoc ? (
        <LegalDocumentModal
          open={openLegalDoc !== null}
          onClose={() => setOpenLegalDoc(null)}
          title={activeLegalDoc.title}
        >
          {activeLegalDoc.content}
        </LegalDocumentModal>
      ) : null}
    </form>
  )
}
