type Props = {
  onClick: () => void
}

export default function LandlordListingReviewButton({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onClick()
      }}
      className="relative z-[2] inline-flex h-11 shrink-0 items-center justify-center rounded-[10px] bg-[var(--quni-coral)] px-3.5 text-[13px] font-semibold text-white hover:bg-[var(--quni-coral-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
    >
      Review listing
    </button>
  )
}
