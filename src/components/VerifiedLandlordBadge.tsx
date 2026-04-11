/** Small trust pill for hosts who have `landlord_profiles.verified`. */
export function VerifiedLandlordBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-[#FF6F61]/15 px-2 py-0.5 text-[11px] font-semibold leading-tight text-[#FF6F61] ${className}`.trim()}
    >
      <svg className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
      Verified Landlord
    </span>
  )
}
