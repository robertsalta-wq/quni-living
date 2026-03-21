import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div id="about" className="flex-1 w-full max-w-3xl mx-auto px-6 py-10 scroll-mt-24">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
        Quni Living
      </h1>
      <p className="mt-3 text-gray-600 dark:text-gray-400 leading-relaxed">
        Home — student accommodation. Browse listings or continue building out this page.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/listings"
          className="inline-flex items-center rounded-lg bg-gray-900 dark:bg-gray-100 px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 hover:opacity-90"
        >
          View listings
        </Link>
        <Link
          to="/search"
          className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          Search
        </Link>
      </div>
    </div>
  )
}
