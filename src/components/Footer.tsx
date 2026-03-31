import { Link } from 'react-router-dom'

function IconLocation(props: { className?: string }) {
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
      <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  )
}

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
    <footer className="bg-[#FF7261] text-[#333] font-footer mt-auto">
      <div className="max-w-site mx-auto px-6 py-14 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#4a4a4a] text-white text-sm font-semibold font-footer">
                Q
              </span>
              <span className="font-display font-bold text-xl text-white tracking-tight">Quni</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed max-w-xs">
              Premium student accommodation in Macquarie Park and Ryde. Professional, stable, and
              student-focused.
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-lg text-white mb-4">For Students</h2>
            <ul className="space-y-2.5">
              <li>
                <Link to="/student-accommodation" className={linkClass}>
                  Student accommodation guides →
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
                <Link to="/services" className={linkClass}>
                  Services
                </Link>
              </li>
              <li>
                <Link to="/services/landlord-partnerships" className={linkClass}>
                  For landlords
                </Link>
              </li>
              <li>
                <Link to="/landlords/ai" className={linkClass}>
                  AI listing tools
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
                  Student Accommodation
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
                <IconLocation className="w-5 h-5 shrink-0 mt-0.5 text-[#333]" />
                <span>Macquarie Park &amp; Ryde Precincts, Sydney NSW</span>
              </li>
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

        <div className="mt-12 border-t border-[#333]/35 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs sm:text-sm text-[#333]">
          <p>© {new Date().getFullYear()} Quni. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/privacy" className={`${linkClass} text-xs sm:text-sm`}>
              Privacy Policy
            </Link>
            <Link to="/terms" className={`${linkClass} text-xs sm:text-sm`}>
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
