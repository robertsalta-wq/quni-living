/**
 * Shared account avatar for marketing Header and app AppHeader.
 * Photo from `profile.avatar_url`; initials only when no photo.
 * Size / crop / border match the marketing account control (h-8 circle).
 */

export const ACCOUNT_AVATAR_FRAME_CLASS =
  'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--quni-line)] bg-[var(--quni-surface-1)] p-1'

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
