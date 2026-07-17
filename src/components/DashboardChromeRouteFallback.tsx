/** Soft Suspense placeholder for dashboard mobile chrome routes (no "Loading page…" flash). */
export default function DashboardChromeRouteFallback() {
  return (
    <div className="min-h-[40vh] w-full flex-1 bg-gray-50 px-4 py-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="mx-auto w-full max-w-site space-y-3 animate-pulse">
        <div className="h-4 w-1/3 rounded bg-stone-200/80" />
        <div className="h-24 rounded-2xl border border-stone-100 bg-white" />
        <div className="h-24 rounded-2xl border border-stone-100 bg-white" />
      </div>
    </div>
  )
}
