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
  const [error, setError] = useState<string | null>(null)

  const activeLegalDoc =
    openLegalDoc === 'terms' || openLegalDoc === 'privacy' ? STUDENT_LEGAL_DOC_MODAL[openLegalDoc] : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!accepted) {
      setError('Please accept the Terms of Service and Privacy Policy to continue.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const now = new Date().toISOString()
      const { error: upErr } = await withSentryMonitoring('RenterProfileTermsSection/accept', () =>
        supabase.from('student_profiles').update({ terms_accepted_at: now }).eq('user_id', userId),
      )
      if (upErr) throw upErr
      await onAccepted()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save acceptance.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="renter-profile-form-stack">
      <p style={{ fontSize: 'var(--text-body-sm-size)', color: 'var(--quni-ink-3)' }}>
        Accept our policies before you browse listings or request bookings.
      </p>
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
            setError(null)
          }}
          style={{ marginTop: 3, accentColor: 'var(--quni-coral)' }}
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
      {error ? (
        <p className="renter-profile-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="renter-profile-form-actions">
        <button type="submit" disabled={submitting} className="renter-profile-btn-primary">
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
