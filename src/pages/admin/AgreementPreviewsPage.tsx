import { useEffect, useMemo, useState } from 'react'
import { AdminPageHeader } from '../../components/admin/primitives'

type SampleEntry = {
  state: 'NSW' | 'QLD' | 'VIC'
  tier: 'T1' | 'T2'
  document: string
  fileName: string
  href: string
}

type AgreementSamplesManifest = {
  generatedAt: string
  watermark: string
  samples: SampleEntry[]
}

export default function AgreementPreviewsPage() {
  const [manifest, setManifest] = useState<AgreementSamplesManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const resp = await fetch('/agreement-samples/manifest.json', { cache: 'no-store' })
        if (!resp.ok) {
          throw new Error('Samples not generated yet. Run npm run generate:agreement-samples.')
        }
        const data = (await resp.json()) as AgreementSamplesManifest
        setManifest(data)
      } catch (err) {
        setManifest(null)
        setError(err instanceof Error ? err.message : 'Could not load agreement sample manifest.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const grouped = useMemo(() => {
    const root: Record<string, Record<string, SampleEntry[]>> = {}
    for (const s of manifest?.samples ?? []) {
      if (!root[s.state]) root[s.state] = {}
      if (!root[s.state][s.tier]) root[s.state][s.tier] = []
      root[s.state][s.tier].push(s)
    }
    return root
  }, [manifest])

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Agreement previews"
        subtitle="Read-only sample documents generated from live templates across state and tier."
      />

      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
        <p>
          Watermark: <span className="font-semibold">{manifest?.watermark ?? 'SAMPLE - not for execution'}</span>
        </p>
        <p className="mt-1">
          Regenerate: <code>npm run generate:agreement-samples</code>
        </p>
        {manifest?.generatedAt ? (
          <p className="mt-1 text-gray-500">Generated at: {new Date(manifest.generatedAt).toLocaleString('en-AU')}</p>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>
      ) : null}

      {!loading &&
        !error &&
        Object.entries(grouped).map(([state, tiers]) => (
          <section key={state} className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{state}</h2>
            {Object.entries(tiers).map(([tier, docs]) => (
              <div key={`${state}-${tier}`} className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">{tier}</h3>
                <div className="space-y-6">
                  {docs.map((doc) => (
                    <article key={doc.fileName} className="rounded-lg border border-gray-100 p-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-gray-900">{doc.document}</h4>
                        <div className="flex gap-2">
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
                      </div>
                      <div className="overflow-hidden rounded-md border border-gray-200">
                        <iframe
                          title={`${state} ${tier} ${doc.document}`}
                          src={doc.href}
                          className="h-[560px] w-full"
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
    </div>
  )
}
