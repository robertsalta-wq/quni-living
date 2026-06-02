import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AgreementSampleGallery, type AgreementSampleEntry } from '../components/documents/AgreementSampleGallery'
import { useAuthContext } from '../context/AuthContext'
import UserDashboardBreadcrumb from '../components/dashboard/UserDashboardBreadcrumb'
import { userDashboardBreadcrumbs } from '../lib/userDashboardNav'

type AgreementSamplesManifest = {
  generatedAt: string
  watermark: string
  samples: AgreementSampleEntry[]
}

export default function SampleAgreementsPage() {
  const { role } = useAuthContext()
  const [manifest, setManifest] = useState<AgreementSamplesManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const resp = await fetch('/agreement-samples/manifest.json', { cache: 'no-store' })
        if (!resp.ok) throw new Error('Sample agreements are not available right now.')
        const data = (await resp.json()) as AgreementSamplesManifest
        setManifest(data)
      } catch (err) {
        setManifest(null)
        setError(err instanceof Error ? err.message : 'Could not load sample agreements.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const samples = useMemo(() => manifest?.samples ?? [], [manifest])
  const isLandlord = role === 'landlord'
  const homeTo = isLandlord ? '/landlord/dashboard' : '/student-dashboard'

  return (
    <div className="min-h-0 w-full bg-gray-50">
      <div className="mx-auto max-w-site px-4 py-8 sm:px-6 lg:px-8">
        <UserDashboardBreadcrumb
          segments={
            role === 'landlord'
              ? userDashboardBreadcrumbs('landlord', { label: 'Sample agreements' })
              : userDashboardBreadcrumbs('student', { label: 'Sample agreements' })
          }
          className="mb-4"
        />

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Sample agreements</h1>
          <p className="mt-2 text-sm text-gray-600">
            This is a preview library of agreement templates used on Quni. These are read-only samples and are not signed or
            legally executed agreements.
          </p>
          <div className="mt-3 text-sm text-gray-700">
            <p>
              Watermark: <span className="font-semibold">{manifest?.watermark ?? 'SAMPLE - not for execution'}</span>
            </p>
            {manifest?.generatedAt ? (
              <p className="mt-1 text-gray-500">Generated at: {new Date(manifest.generatedAt).toLocaleString('en-AU')}</p>
            ) : null}
          </div>
          <Link to={homeTo} className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-900">
            Back to dashboard
          </Link>
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
    </div>
  )
}
