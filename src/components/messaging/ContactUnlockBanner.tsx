import { Link } from 'react-router-dom'

export default function ContactUnlockBanner() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">Contact details are hidden until booking is accepted</p>
      <p className="mt-1 text-amber-900/90 leading-relaxed">
        Keep all communication on Quni. Sharing phone numbers or email in messages is masked until the
        landlord accepts your booking and listing fee is confirmed.
      </p>
      <p className="mt-2 text-xs">
        <Link to="/terms" className="font-medium underline underline-offset-2">
          Terms of use
        </Link>
      </p>
    </div>
  )
}
