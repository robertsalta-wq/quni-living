import { useEffect, useId, useState } from 'react'
import {
  AUTHORITY_TO_LET_ATTESTATION_BULLETS,
  AUTHORITY_TO_LET_ATTESTATION_FOOTER,
  AUTHORITY_TO_LET_ATTESTATION_INTRO,
  AUTHORITY_TO_LET_ATTESTATION_LABEL,
  AUTHORITY_TO_LET_BLOCKED_MESSAGE,
  type AuthorityToLetListingIntent,
} from '../../lib/authorityToLetAttestation'

const CHECKBOX_CLASS =
  'h-4 w-4 flex-shrink-0 rounded border-gray-300 accent-[var(--quni-rust)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'

type Props = {
  open: boolean
  intent: AuthorityToLetListingIntent
  listingTitle: string
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function LandlordAuthorityToLetModal({
  open,
  intent,
  listingTitle,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  const [agreed, setAgreed] = useState(false)
  const certId = useId()
  const titleId = useId()

  useEffect(() => {
    if (open) setAgreed(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  const confirmLabel = intent === 'reactivate' ? 'Confirm and unpause' : 'Confirm and publish'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!busy) onCancel()
        }}
        aria-hidden
      />
      <div
        className="quni-modal relative z-10 flex max-h-[min(85dvh,36rem)] w-full max-w-md flex-col overflow-hidden p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h3 id={titleId} className="text-lg font-semibold text-gray-900">
          Confirm you have authority to let
        </h3>
        {listingTitle.trim() ? (
          <p className="mt-1 truncate text-sm text-gray-500">{listingTitle.trim()}</p>
        ) : null}
        <p className="mt-2 text-sm text-gray-600">{AUTHORITY_TO_LET_BLOCKED_MESSAGE}</p>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-relaxed text-gray-800">
            <input
              type="checkbox"
              checked={agreed}
              disabled={busy}
              onChange={(e) => setAgreed(e.target.checked)}
              className={`${CHECKBOX_CLASS} mt-0.5`}
              aria-describedby={certId}
            />
            <span id={certId} className="space-y-2">
              <span className="block font-medium text-gray-900">{AUTHORITY_TO_LET_ATTESTATION_LABEL}</span>
              <span className="block text-gray-800">{AUTHORITY_TO_LET_ATTESTATION_INTRO}</span>
              <ul className="list-disc space-y-1 pl-5 text-gray-800">
                {AUTHORITY_TO_LET_ATTESTATION_BULLETS.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <span className="block text-gray-800">{AUTHORITY_TO_LET_ATTESTATION_FOOTER}</span>
            </span>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (!agreed || busy) return
              onConfirm()
            }}
            disabled={!agreed || busy}
            className="rounded-xl bg-[var(--quni-coral)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--quni-coral-hover)] disabled:opacity-60"
          >
            {busy ? 'Saving…' : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
