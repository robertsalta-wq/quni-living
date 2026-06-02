import { useMemo, useState } from 'react'

export type AgreementSampleEntry = {
  state: 'NSW' | 'QLD' | 'VIC'
  tier: 'T1' | 'T2'
  document: string
  fileName: string
  href: string
}

export function AgreementSampleGallery({
  samples,
  showGrouping = true,
}: {
  samples: AgreementSampleEntry[]
  showGrouping?: boolean
}) {
  const [active, setActive] = useState<AgreementSampleEntry | null>(null)

  const grouped = useMemo(() => {
    const root: Record<string, Record<string, AgreementSampleEntry[]>> = {}
    for (const sample of samples) {
      if (!root[sample.state]) root[sample.state] = {}
      if (!root[sample.state][sample.tier]) root[sample.state][sample.tier] = []
      root[sample.state][sample.tier].push(sample)
    }
    return root
  }, [samples])

  const cards = (entries: AgreementSampleEntry[]) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map((doc) => (
        <article key={doc.fileName} className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setActive(doc)}
            className="block w-full p-3 text-left"
          >
            <div className="mb-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                {doc.state}
              </span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                {doc.tier}
              </span>
            </div>
            <h4 className="line-clamp-2 text-sm font-semibold text-gray-900">{doc.document}</h4>
            <div className="mt-3 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
              <iframe title={`${doc.state} ${doc.tier} ${doc.document}`} src={doc.href} className="h-44 w-full pointer-events-none" />
            </div>
          </button>
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-3 py-2">
            <a
              href={doc.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Open
            </a>
            <a
              href={doc.href}
              download={doc.fileName}
              className="rounded-md bg-[#FF6F61] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
            >
              Download
            </a>
          </div>
        </article>
      ))}
    </div>
  )

  return (
    <>
      <div className="space-y-5">
        {showGrouping ? (
          Object.entries(grouped).map(([state, tiers]) => (
            <section key={state} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">{state}</h3>
              {Object.entries(tiers).map(([tier, entries]) => (
                <div key={`${state}-${tier}`} className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-600">{tier}</h4>
                  {cards(entries)}
                </div>
              ))}
            </section>
          ))
        ) : (
          cards(samples)
        )}
      </div>

      {active && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{active.document}</p>
                <p className="text-xs text-gray-500">
                  {active.state} {active.tier}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={active.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Open
                </a>
                <a
                  href={active.href}
                  download={active.fileName}
                  className="rounded-md bg-[#FF6F61] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe title={`${active.state} ${active.tier} ${active.document}`} src={active.href} className="h-full w-full" />
          </div>
        </div>
      )}
    </>
  )
}
