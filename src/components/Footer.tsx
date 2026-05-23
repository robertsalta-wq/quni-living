import { Link } from 'react-router-dom'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'
import AiSparkleIcon from './AiSparkleIcon'
import LegalFooter from './LegalFooter'

function IconPhone(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden
    >
      <path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h2a2 2 0 0 1 2 1.72c.12.9.33 1.78.63 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.2a2 2 0 0 1 2.11-.45c.85.3 1.73.51 2.63.63A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function IconMail(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

const linkClass =
  'text-[#333] text-sm hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded'

export default function Footer() {
  return (
    <footer className="bg-[#FF6F61] text-[#333] font-footer mt-auto">
      <div className={`${SITE_CONTENT_MAX_CLASS} py-14 md:py-16`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex items-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80">
              <img
                src="/quni-logo-white.png"
                srcSet="/quni-logo-white.png 1x, /quni-logo-white@2x.png 2x"
                alt="Quni"
                width={96}
                height={32}
                className="h-8 w-auto max-w-full object-contain object-left"
              />
            </Link>
            <p className="mt-4 text-sm leading-relaxed max-w-xs">
              Verified rooms near Australian universities — for students, graduates, and young professionals.
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-lg text-white mb-4">For Students</h2>
            <ul className="space-y-2.5">
              <li>
                <Link to="/student-accommodation" className={linkClass}>
                  Accommodation guides →
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display font-bold text-lg text-white mb-4">Quick Links</h2>
            <ul className="space-y-2.5">
              <li>
                <Link to="/" className={linkClass}>
                  Home
                </Link>
              </li>
              <li>
                <Link to="/listings" className={linkClass}>
                  Properties
                </Link>
              </li>
              <li>
                <Link to="/about" className={linkClass}>
                  About
                </Link>
              </li>
              <li>
                <Link to="/pricing" className={linkClass}>
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/contact" className={linkClass}>
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/for-landlords" className={linkClass}>
                  For landlords
                </Link>
              </li>
              <li>
                <Link to="/landlords/ai" className={`${linkClass} inline-flex items-center gap-1.5`}>
                  <AiSparkleIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                  AI listing tools
                </Link>
              </li>
              <li>
                <Link to="/rent-near-campus" className={linkClass}>
                  Rent near university
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display font-bold text-lg text-white mb-4">Legal</h2>
            <ul className="space-y-2.5">
              <li>
                <Link to="/terms" className={linkClass}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/refunds" className={linkClass}>
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/privacy" className={linkClass}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/landlord-service-agreement" className={linkClass}>
                  Landlord Service Agreement
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display font-bold text-lg text-white mb-4">Our Services</h2>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/services/student-accommodation" className={linkClass}>
                  Accommodation
                </Link>
              </li>
              <li>
                <Link to="/services/property-management" className={linkClass}>
                  Property Management
                </Link>
              </li>
              <li>
                <Link to="/services/landlord-partnerships" className={linkClass}>
                  Landlord Partnerships
                </Link>
              </li>
              <li>
                <Link to="/services/fully-furnished" className={linkClass}>
                  Fully Furnished Units
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display font-bold text-lg text-white mb-4">Contact Us</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2.5 items-start">
                <IconPhone className="w-5 h-5 shrink-0 mt-0.5 text-[#333]" />
                <span className="text-sm">Coming soon</span>
              </li>
              <li className="flex gap-2.5 items-start">
                <IconMail className="w-5 h-5 shrink-0 mt-0.5 text-[#333]" />
                <a href="mailto:hello@quni.com.au" className={linkClass}>
                  hello@quni.com.au
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-[#333]/35 pt-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs sm:text-sm text-[#333]">
            <p>© {new Date().getFullYear()} Quni. All rights reserved.</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Link to="/privacy" className={`${linkClass} text-xs sm:text-sm`}>
                Privacy Policy
              </Link>
              <Link to="/terms" className={`${linkClass} text-xs sm:text-sm`}>
                Terms of Service
              </Link>
              <Link to="/refunds" className={`${linkClass} text-xs sm:text-sm`}>
                Refund Policy
              </Link>
            </div>
          </div>
          <LegalFooter className="text-[#333]/85" />
        </div>
      </div>
    </footer>
  )
}
