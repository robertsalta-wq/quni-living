import { Link } from 'react-router-dom'
import { MARKETPLACE_TAGLINE, SITE_CONTENT_MAX_CLASS } from '../lib/site'
import { listGuideNavItems } from '../lib/guides/registry'
import AiSparkleIcon from './AiSparkleIcon'
import LegalFooter from './LegalFooter'
import SiteSocialLinks from './SiteSocialLinks'

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

const GUIDE_NAV_ITEMS = listGuideNavItems()

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
            <p className="mt-4 text-sm leading-relaxed max-w-xs">{MARKETPLACE_TAGLINE}</p>
            <SiteSocialLinks variant="footer" className="mt-5" />
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="font-display font-bold text-lg text-white mb-4">For renters</h2>
              <ul className="space-y-2.5">
                <li>
                  <Link to="/student-accommodation" className={linkClass}>
                    Accommodation guides →
                  </Link>
                </li>
                <li>
                  <Link to="/international" className={linkClass}>
                    International students →
                  </Link>
                </li>
              </ul>
            </div>
            {GUIDE_NAV_ITEMS.length > 0 ? (
              <div>
                <h2 className="font-display font-bold text-lg text-white mb-4">Guides</h2>
                <ul className="space-y-2.5">
                  <li>
                    <Link to="/guides" className={linkClass}>
                      All guides →
                    </Link>
                  </li>
                  {GUIDE_NAV_ITEMS.map((item) => (
                    <li key={item.to}>
                      <Link to={item.to} className={linkClass}>
                        {item.label} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
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
                <Link to="/faq" className={linkClass}>
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/verification" className={linkClass}>
                  Verification
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
                <Link to="/for-universities" className={linkClass}>
                  For universities
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
                <Link to="/non-discrimination" className={linkClass}>
                  Non-Discrimination Policy
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
              <Link to="/non-discrimination" className={`${linkClass} text-xs sm:text-sm`}>
                Non-Discrimination Policy
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
