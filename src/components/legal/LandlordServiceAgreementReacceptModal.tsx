import { useState } from 'react'
import { LandlordServiceAgreementContent } from './LandlordServiceAgreementContent'
import {
  LANDLORD_SERVICE_AGREEMENT_EFFECTIVE_DATE,
  LANDLORD_SERVICE_AGREEMENT_PUBLIC_TITLE,
  LANDLORD_SERVICE_AGREEMENT_VERSION,
  persistLandlordServiceAgreementAcceptance,
} from '../../lib/landlordServiceAgreement'

type Props = {
  userId: string
  onAccepted: () => Promise<void> | void
}

export function LandlordServiceAgreementReacceptModal({ userId, onAccepted }: Props) {
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onConfirm() {
    if (!agreed) {
      setError('Tick the box to confirm you accept the updated agreement.')
      return
    }
    setBusy(true)
    setError(null)
    const { error: persistError } = await persistLandlordServiceAgreementAcceptance(userId)
    if (persistError) {
      setError(persistError.message || 'Could not save your acceptance. Try again.')
      setBusy(false)
      return
    }
    await onAccepted()
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-[180] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lsa-reaccept-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
          <h2 id="lsa-reaccept-title" className="font-display text-xl font-bold text-stone-900">
            Updated {LANDLORD_SERVICE_AGREEMENT_PUBLIC_TITLE}
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Quni Listing · Version {LANDLORD_SERVICE_AGREEMENT_VERSION.replace('listing-', '')} · Effective{' '}
            {LANDLORD_SERVICE_AGREEMENT_EFFECTIVE_DATE}. This replaces the March 2026 agreement. You need to accept
            this version to keep using your landlord account.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <LandlordServiceAgreementContent />
        </div>
        <div className="border-t border-stone-100 px-5 py-4 sm:px-6">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-stone-800">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked)
                setError(null)
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 accent-[var(--quni-coral)]"
            />
            <span>
              I accept the {LANDLORD_SERVICE_AGREEMENT_PUBLIC_TITLE} (version{' '}
              {LANDLORD_SERVICE_AGREEMENT_VERSION.replace('listing-', '')}).
            </span>
          </label>
          {error ? (
            <p className="mt-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void onConfirm()}
            className="mt-3 w-full rounded-xl bg-[var(--quni-coral)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 sm:w-auto"
          >
            {busy ? 'Saving…' : 'Accept and continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
