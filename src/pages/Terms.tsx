import Seo from '../components/Seo'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'

const PW = 'Project Warehouse'

export default function Terms() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-white">
      <Seo siteName={PW} title="Terms of Use" description="Terms of use for Project Warehouse." canonicalPath="/terms" />
      <div className={`${SITE_CONTENT_MAX_CLASS} py-14 md:py-16`}>
        <h1 className="font-display text-3xl font-bold text-gray-900">Terms of Use</h1>
        <p className="mt-4 text-gray-600">Terms of use coming soon.</p>
      </div>
    </div>
  )
}
