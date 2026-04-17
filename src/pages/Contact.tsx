import Seo from '../components/Seo'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'

const PW = 'Project Warehouse'

export default function Contact() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-white">
      <Seo
        siteName={PW}
        title="Contact Project Warehouse"
        description="Get in touch with Project Warehouse for listing support, partnerships, or general enquiries."
        canonicalPath="/contact"
      />
      <div className={`${SITE_CONTENT_MAX_CLASS} py-14 md:py-16`}>
        <h1 className="font-display text-3xl font-bold text-gray-900">Contact Project Warehouse</h1>
        <p className="mt-4 max-w-xl text-gray-600">
          For enquiries, email{' '}
          <a className="font-medium text-teal-dark underline hover:text-brand-black" href="mailto:hello@projectwarehouse.com.au">
            hello@projectwarehouse.com.au
          </a>
          .
        </p>
      </div>
    </div>
  )
}
