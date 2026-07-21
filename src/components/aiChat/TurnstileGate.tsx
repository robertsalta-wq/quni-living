import { useCallback, useMemo, useState } from 'react'
import { chatDebug } from '../../lib/aiChat/chatDebug'
import { isTurnstileSiteKeyConfigured } from '../../lib/verifyTurnstile'
import AiSparkleIcon from '../AiSparkleIcon'
import TurnstileCaptcha from '../TurnstileCaptcha'
import { ASK_AI_BUTTON_LABEL, ASK_AI_STREAMING_LABEL } from './chatAiLabels'

function AskAiButtonContent({ sending, label }: { sending: boolean; label: string }) {
  return (
    <>
      <AiSparkleIcon className="h-4 w-4 shrink-0" />
      {sending ? ASK_AI_STREAMING_LABEL : label}
    </>
  )
}

type Props = {
  onSend: (turnstileToken: string | null) => Promise<void> | void
  disabled?: boolean
  sending?: boolean
  buttonLabel?: string
  /** Turnstile scaled down, to the left of Send on one row (embed / listings chat). */
  compactInline?: boolean
}

export default function TurnstileGate({ onSend, disabled, sending, buttonLabel, compactInline }: Props) {
  const [verified, setVerified] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  const turnstileConfigured = useMemo(() => isTurnstileSiteKeyConfigured(), [])

  const handleTokenChange = useCallback((t: string | null) => {
    setCaptchaToken(t)
    setError(null)
  }, [])

  const verifyAndSend = useCallback(async () => {
    if (disabled) return
    if (verified) {
      chatDebug('TurnstileGate → onSend (repeat)', { tokenLength: captchaToken?.length ?? 0 })
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
    chatDebug('TurnstileGate → onSend', {
      tokenLength: captchaToken?.length ?? 0,
      alreadyVerified: verified,
    })
    setVerified(true)
    await onSend(captchaToken)
  }, [captchaToken, disabled, onSend, verified])

  const isDisabled = Boolean(disabled || sending)

  const sendButtonClass = compactInline
    ? 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--quni-coral)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--quni-coral-hover)] disabled:opacity-60 disabled:cursor-not-allowed'
    : 'inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--quni-coral)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[var(--quni-coral-hover)] disabled:opacity-60 disabled:cursor-not-allowed'

  if (verified) {
    return (
      <button type="button" onClick={() => void verifyAndSend()} disabled={isDisabled} className={sendButtonClass}>
        <AskAiButtonContent sending={Boolean(sending)} label={buttonLabel ?? ASK_AI_BUTTON_LABEL} />
      </button>
    )
  }

  if (compactInline) {
    return (
      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full flex-row flex-wrap items-center justify-end gap-2">
          <div
            className="shrink-0"
            style={{ transform: 'scale(0.75)', transformOrigin: 'left center' }}
          >
            <TurnstileCaptcha
              resetKey={captchaResetKey}
              disabled={Boolean(sending) || !turnstileConfigured}
              onTokenChange={handleTokenChange}
              showLabel={false}
            />
          </div>
          <button
            type="button"
            onClick={() => void verifyAndSend()}
            disabled={isDisabled || !captchaToken || !turnstileConfigured}
            className={sendButtonClass}
          >
            <AskAiButtonContent sending={Boolean(sending)} label={buttonLabel ?? ASK_AI_BUTTON_LABEL} />
          </button>
        </div>
        {error ? (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <TurnstileCaptcha
        resetKey={captchaResetKey}
        disabled={Boolean(sending) || !turnstileConfigured}
        onTokenChange={handleTokenChange}
        labelClassName="text-xs font-semibold text-gray-800 mb-2"
      />

      <button
        type="button"
        onClick={() => void verifyAndSend()}
        disabled={isDisabled || !captchaToken || !turnstileConfigured}
        className={sendButtonClass}
      >
        <AskAiButtonContent sending={Boolean(sending)} label={buttonLabel ?? ASK_AI_BUTTON_LABEL} />
      </button>

      {error ? (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

