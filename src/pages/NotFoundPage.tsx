import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'

/** Client + prerender 404 UI. HTTP status is set by Edge middleware for unknown path shapes. */
export default function NotFoundPage() {
  return (
    <>
      <Seo
        title="Page not found"
        description="This page does not exist on Quni Living."
        noindex
        canonicalPath="/"
      />
      <div className={`${SITE_CONTENT_MAX_CLASS} py-16 sm:py-24`}>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Page not found</h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-600 sm:text-base">
          That link does not match a page on Quni Living. It may have been mistyped or removed.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block text-sm font-medium text-[var(--quni-coral)] hover:underline"
        >
          Back to home
        </Link>
      </div>
    </>
  )
}
