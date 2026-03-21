import { Turnstile } from '@marsidev/react-turnstile'

const siteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()

type Props = {
  /** Bump after a failed submit to get a fresh challenge */
  resetKey: number
  onTokenChange: (token: string | null) => void
  disabled?: boolean
}

export default function TurnstileCaptcha({ resetKey, onTokenChange, disabled }: Props) {
  if (!siteKey) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Captcha is not configured. Add{' '}
        <code className="rounded bg-white/80 px-1 font-mono text-[11px]">VITE_TURNSTILE_SITE_KEY</code> and on Vercel{' '}
        <code className="rounded bg-white/80 px-1 font-mono text-[11px]">TURNSTILE_SECRET_KEY</code>.
      </div>
    )
  }

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
      <p className="text-xs font-semibold text-gray-800 mb-2">I&apos;m not a robot</p>
      <Turnstile
        key={resetKey}
        siteKey={siteKey}
        onSuccess={(t) => onTokenChange(t)}
        onExpire={() => onTokenChange(null)}
        onError={() => onTokenChange(null)}
        options={{ theme: 'light', size: 'normal' }}
      />
    </div>
  )
}
