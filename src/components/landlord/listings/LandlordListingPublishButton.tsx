type Props = {
  busy?: boolean
  onClick: () => void
}

export default function LandlordListingPublishButton({ busy, onClick }: Props) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        if (busy) return
        onClick()
      }}
      className="relative z-[2] inline-flex h-11 shrink-0 items-center justify-center rounded-[10px] bg-[var(--quni-coral)] px-3.5 text-[13px] font-semibold text-white hover:bg-[var(--quni-coral-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)] disabled:opacity-60"
    >
      {busy ? 'Publishing…' : 'Publish'}
    </button>
  )
}
