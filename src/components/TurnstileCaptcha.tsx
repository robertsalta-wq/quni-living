import { memo, useCallback, useMemo } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'

const siteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()

const DEFAULT_OPTIONS = { theme: 'light' as const, size: 'normal' as const }

type Props = {
  /** Bump after a failed submit to get a fresh challenge */
  resetKey: number
  onTokenChange: (token: string | null) => void
  disabled?: boolean
  /** Override label styling (e.g. white text on coral backgrounds) */
  labelClassName?: string
  /** When false, only an sr-only label is rendered (compact inline layouts). */
  showLabel?: boolean
}

function TurnstileCaptcha({ resetKey, onTokenChange, disabled, labelClassName, showLabel = true }: Props) {
  const onSuccess = useCallback((t: string) => onTokenChange(t), [onTokenChange])
  const onExpire = useCallback(() => onTokenChange(null), [onTokenChange])
  const onError = useCallback(() => onTokenChange(null), [onTokenChange])
  const options = useMemo(() => DEFAULT_OPTIONS, [])

  if (!siteKey) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Captcha is not configured. Add{' '}
        <code className="rounded bg-white/80 px-1 font-mono text-[11px]">VITE_TURNSTILE_SITE_KEY</code> and on Vercel{' '}
        <code className="rounded bg-white/80 px-1 font-mono text-[11px]">TURNSTILE_SECRET_KEY</code>.
      </div>
    )
  }

  const labelCls = labelClassName ?? 'text-xs font-semibold text-gray-800 mb-2'

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
      {showLabel ? (
        <p className={labelCls}>I&apos;m not a robot</p>
      ) : (
        <span className="sr-only">I&apos;m not a robot</span>
      )}
      <Turnstile
        key={resetKey}
        siteKey={siteKey}
        onSuccess={onSuccess}
        onExpire={onExpire}
        onError={onError}
        options={options}
      />
    </div>
  )
}

/**
 * Memoized so parent state updates after `onSuccess` (e.g. storing the token) do not re-render the
 * Cloudflare iframe/widget and restart the challenge cycle.
 */
export default memo(TurnstileCaptcha)
