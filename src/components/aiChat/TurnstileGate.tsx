import { useCallback, useMemo, useState } from 'react'
import { isTurnstileSiteKeyConfigured } from '../../lib/verifyTurnstile'
import TurnstileCaptcha from '../TurnstileCaptcha'

type Props = {
  onSend: (turnstileToken: string | null) => Promise<void> | void
  disabled?: boolean
  sending?: boolean
  buttonLabel?: string
}

export default function TurnstileGate({ onSend, disabled, sending, buttonLabel }: Props) {
  const [verified, setVerified] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  const turnstileConfigured = useMemo(() => isTurnstileSiteKeyConfigured(), [])

  const verifyAndSend = useCallback(async () => {
    if (disabled) return
    if (verified) {
      await onSend(captchaToken)
      return
    }

    setError(null)
    if (!captchaToken) {
      setError('Please complete the verification challenge.')
      setCaptchaResetKey((k) => k + 1)
      return
    }

    // Do not call /api/verify-turnstile here: Turnstile tokens are single-use. /api/chat verifies
    // once on the first visitor message; a prior siteverify would consume the token.
    setVerified(true)
    await onSend(captchaToken)
  }, [captchaToken, disabled, onSend, verified])

  const isDisabled = Boolean(disabled || sending)

  if (verified) {
    return (
      <button
        type="button"
        onClick={() => void verifyAndSend()}
        disabled={isDisabled}
        className="rounded-xl bg-[#FF6F61] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {sending ? 'Sending…' : buttonLabel ?? 'Send'}
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <TurnstileCaptcha
        resetKey={captchaResetKey}
        disabled={Boolean(sending) || !turnstileConfigured}
        onTokenChange={(t) => {
          setCaptchaToken(t)
          setError(null)
        }}
        labelClassName="text-xs font-semibold text-gray-800 mb-2"
      />

      <button
        type="button"
        onClick={() => void verifyAndSend()}
        disabled={isDisabled || !captchaToken || !turnstileConfigured}
        className="w-full rounded-xl bg-[#FF6F61] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {sending ? 'Sending…' : buttonLabel ?? 'Send message'}
      </button>

      {error ? (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

