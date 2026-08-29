type Props = {
  onClick: () => void
  busy?: boolean
  disabled?: boolean
  className?: string
}

export default function LandlordListingPublishButton({
  onClick,
  busy = false,
  disabled,
  className,
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled ?? busy}
      onClick={onClick}
      className={
        className ??
        'inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[var(--quni-coral)] px-4 text-sm font-semibold text-white hover:bg-[var(--quni-coral-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)] disabled:opacity-50'
      }
    >
      {busy ? 'Publishing…' : 'Publish'}
    </button>
  )
}
