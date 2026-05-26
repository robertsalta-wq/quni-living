const cardClass = 'rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse'

/** Layout placeholder while dashboard data loads (profile may already be in auth context). */
export default function DashboardPageSkeleton() {
  return (
    <div className="max-w-site mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-9 w-64 max-w-full rounded-lg bg-gray-200 mb-3" />
      <div className="h-4 w-96 max-w-full rounded bg-gray-100 mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cardClass}>
            <div className="h-3 w-20 rounded bg-gray-200" />
            <div className="h-8 w-12 rounded bg-gray-200 mt-3" />
          </div>
        ))}
      </div>
      <div className={`${cardClass} h-48`} />
    </div>
  )
}
