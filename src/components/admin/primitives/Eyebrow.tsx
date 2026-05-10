import type { ReactNode } from 'react'

export type EyebrowTone = 'default' | 'coral'

export interface EyebrowProps {
  tone?: EyebrowTone
  children: ReactNode
  className?: string
}

const TONE_CLASSES: Record<EyebrowTone, string> = {
  default: 'text-admin-ink-5',
  coral: 'text-admin-coral-active',
}

/**
 * Small uppercase tracked label that sits above titles ("LIVE OPERATIONS · SYDNEY",
 * "MARKETPLACE PULSE · PAST 7 DAYS"). Two tones to keep the system tight.
 */
export function Eyebrow({ tone = 'default', children, className }: EyebrowProps) {
  const cls = [
    'text-[11px] font-bold uppercase tracking-[0.08em]',
    TONE_CLASSES[tone],
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  return <p className={cls}>{children}</p>
}
