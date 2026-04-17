import Seo from '../components/Seo'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'

const PW = 'Project Warehouse'

export default function About() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-white">
      <Seo
        siteName={PW}
        title="About Project Warehouse"
        description="Project Warehouse is Australia's free directory for spare warehouse and industrial storage space."
        canonicalPath="/about"
      />
      <div className={`${SITE_CONTENT_MAX_CLASS} py-14 md:py-16`}>
        <h1 className="font-display text-3xl font-bold text-gray-900">About Project Warehouse</h1>
        <div className="prose prose-gray mt-6 max-w-2xl text-gray-600">
          <p>
            {PW} helps businesses list spare pallet positions, cool rooms, yards, and warehouse space at no cost,
            and helps other operators find capacity when they need it.
          </p>
          <p className="mt-4">
            The platform is designed for organic discovery: state and suburb guides grow in search value as more
            listings are added over time.
          </p>
        </div>
      </div>
    </div>
  )
}
