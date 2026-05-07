/**
 * NSW-only: Rental Bonds Online context link. Render only when property.state is NSW.
 */
export default function NswRentalBondOnlineLink({ when }: { when: boolean }) {
  if (!when) return null
  return (
    <p className="mt-2 text-sm text-gray-700">
      <a
        href="https://www.nsw.gov.au/housing-and-construction/renting/rental-bonds"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[#FF6F61] underline underline-offset-2 hover:opacity-90"
      >
        NSW Rental Bonds Online
      </a>
      <span className="text-gray-600"> — information on lodgement and official receipts.</span>
    </p>
  )
}
