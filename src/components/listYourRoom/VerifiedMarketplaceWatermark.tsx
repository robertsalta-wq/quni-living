const STAMP_COUNT = 18

function StampMark() {
  return (
    <div className="relative mx-auto flex h-36 w-36 items-center justify-center text-[var(--quni-trust)]">
      <span className="absolute inset-0 rounded-full border-[3px] border-current" />
      <span className="absolute inset-[8px] rounded-full border border-current" />
      <div className="relative flex flex-col items-center px-3 text-center">
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em]">Verified</span>
        <svg className="my-1 h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em]">Marketplace</span>
      </div>
    </div>
  )
}

/** Decorative ink stamp tiled over the invite page. Does not capture clicks. */
export default function VerifiedMarketplaceWatermark() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      <div className="absolute -inset-[28%] grid grid-cols-3 content-start gap-x-8 gap-y-20 rotate-[-16deg] opacity-[0.18] mix-blend-multiply">
        {Array.from({ length: STAMP_COUNT }, (_, index) => (
          <div key={index} className={index % 3 === 1 ? 'translate-y-10' : undefined}>
            <StampMark />
          </div>
        ))}
      </div>
    </div>
  )
}
