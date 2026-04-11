type Props = {
  /** `text-center` for narrow columns; default left-aligned for forms */
  align?: 'center' | 'start'
  className?: string
}

export default function PaymentsSecuredByStripe({ align = 'start', className = '' }: Props) {
  const justify = align === 'center' ? 'justify-center text-center' : 'justify-start text-left'
  return (
    <p
      className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-gray-500 ${justify} ${className}`.trim()}
      role="note"
    >
      <svg
        className="h-3.5 w-3.5 shrink-0 text-gray-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
      <span>Payments secured by</span>
      <span className="font-semibold text-[#635BFF]">Stripe</span>
    </p>
  )
}
