import { useEffect, useMemo, useState } from 'react'
import { AdminPageHeader } from '../../components/admin/primitives'
import { AgreementSampleGallery, type AgreementSampleEntry } from '../../components/documents/AgreementSampleGallery'

type AgreementSamplesManifest = {
  generatedAt: string
  watermark: string
  samples: AgreementSampleEntry[]
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

  const samples = useMemo(() => manifest?.samples ?? [], [manifest])

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

      {!loading && !error && <AgreementSampleGallery samples={samples} showGrouping />}
    </div>
  )
}
