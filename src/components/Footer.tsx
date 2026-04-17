import { Link } from 'react-router-dom'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'

const linkClass =
  'text-teal-light hover:text-white transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-light/50 rounded'

export default function Footer() {
  return (
    <footer className="bg-brand-black text-teal-light mt-auto font-sans">
      <div className={`${SITE_CONTENT_MAX_CLASS} py-12 md:py-14`}>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div>
            <Link to="/" className="inline-flex items-baseline gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-white">Project Warehouse</span>
            </Link>
            <p className="mt-1 text-sm font-medium text-white">Australia&apos;s free warehouse space directory</p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-teal-light">
              Connecting businesses with spare storage space to businesses that need it.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-base font-medium text-white">Find space</h2>
            <ul className="space-y-2.5">
              <li>
                <Link to="/listings" className={linkClass}>
                  Browse all listings →
                </Link>
              </li>
              <li>
                <Link to="/listings?space_type=pallet_storage" className={linkClass}>
                  Pallet storage
                </Link>
              </li>
              <li>
                <Link to="/listings?space_type=cool_room" className={linkClass}>
                  Cool rooms
                </Link>
              </li>
              <li>
                <Link to="/listings?space_type=frozen" className={linkClass}>
                  Frozen storage
                </Link>
              </li>
              <li>
                <Link to="/listings?space_type=outdoor_yard" className={linkClass}>
                  Outdoor yards
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-base font-medium text-white">List your space</h2>
            <ul className="space-y-2.5">
              <li>
                <Link to="/signup" className={linkClass}>
                  Create a free listing →
                </Link>
              </li>
              <li>
                <Link to="/login" className={linkClass}>
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className={linkClass}>
                  Host dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-base font-medium text-white">Company</h2>
            <ul className="space-y-2.5">
              <li>
                <Link to="/about" className={linkClass}>
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className={linkClass}>
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/terms" className={linkClass}>
                  Terms of use
                </Link>
              </li>
              <li>
                <Link to="/privacy" className={linkClass}>
                  Privacy policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-teal-dark pt-6 text-xs text-teal-light sm:flex-row sm:items-center sm:justify-between sm:text-sm">
          <div className="space-y-1">
            <p>© 2026 Project Warehouse. All rights reserved.</p>
            <p className="text-teal-light/90">Free to list. Free to search.</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/terms" className={`${linkClass} text-xs sm:text-sm`}>
              Terms
            </Link>
            <span className="text-teal-dark" aria-hidden>
              ·
            </span>
            <Link to="/privacy" className={`${linkClass} text-xs sm:text-sm`}>
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
