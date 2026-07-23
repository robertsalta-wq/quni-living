/**
 * Shared account avatar for marketing Header and app AppHeader.
 * Photo from `profile.avatar_url`; initials only when no photo.
 * Size / crop / border: h-8 circle inside ACCOUNT_AVATAR_FRAME_CLASS.
 *
 * Desktop account trigger chrome (LOCKED — docs/account-control-alignment-brief.md):
 * frame wraps avatar only; name + chevron sit outside (no outer pill).
 */

export const ACCOUNT_AVATAR_FRAME_CLASS =
  'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--quni-line)] bg-[var(--quni-surface-1)] p-1'

/** Desktop account menu button — open layout; do not put FRAME on this. */
export const ACCOUNT_MENU_TRIGGER_CLASS =
  'inline-flex items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]'

export const ACCOUNT_MENU_NAME_CLASS =
  'text-[13.5px] font-semibold text-[var(--quni-ink)]'

export const ACCOUNT_MENU_CHEVRON_CLASS = 'h-3.5 w-3.5 text-[var(--quni-ink-4)]'

type Props = {
  photoUrl?: string | null
  initials: string
  className?: string
}

export default function AccountAvatar({ photoUrl, initials, className = '' }: Props) {
  const url = photoUrl?.trim() || null
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={['h-8 w-8 rounded-full object-cover bg-[var(--quni-surface-3)]', className]
          .filter(Boolean)
          .join(' ')}
      />
    )
  }
  return (
    <span
      className={[
        'inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--quni-surface-3)] text-xs font-semibold text-[var(--quni-ink-3)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {initials}
    </span>
  )
}
