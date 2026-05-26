/** Shown while lazy route chunks load (Suspense). */
export default function PageRouteFallback() {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center px-6" role="status" aria-live="polite">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-stone-200 border-t-stone-800" aria-hidden />
      <p className="mt-3 text-sm text-stone-500">Loading page…</p>
    </div>
  )
}
