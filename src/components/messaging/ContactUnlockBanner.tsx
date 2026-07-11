import { Link } from 'react-router-dom'

/** Quiet inline system note when contact details are still masked. */
export default function ContactUnlockBanner() {
  return (
    <div className="flex justify-center py-2">
      <p className="max-w-md rounded-full bg-gray-100 px-3 py-1.5 text-center text-xs text-gray-500">
        🔒 Contact details unlock once the booking is accepted.{' '}
        <Link to="/terms" className="text-gray-600 underline underline-offset-2 hover:text-gray-800">
          Terms
        </Link>
      </p>
    </div>
  )
}
