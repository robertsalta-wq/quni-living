import { Link } from 'react-router-dom'
import LegalFooter from './LegalFooter'

/** Minimal legal links when the marketing footer is hidden on signup, invite, and booking flows. */
export default function FocusFormLegalStrip() {
  return (
    <div className="border-t border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
      <div className="max-w-site mx-auto w-full space-y-2 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-600">
          <Link to="/privacy" className="hover:text-gray-900 hover:underline">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-gray-900 hover:underline">
            Terms of Service
          </Link>
          <Link to="/refunds" className="hover:text-gray-900 hover:underline">
            Refund Policy
          </Link>
          <Link to="/about" className="hover:text-gray-900 hover:underline">
            About Quni
          </Link>
        </div>
        <LegalFooter className="text-gray-500" />
      </div>
    </div>
  )
}
