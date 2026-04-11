import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { getValidAccessTokenForFunctions } from '../../lib/supabaseEdgeInvoke'
import { readSupabaseFunctionInvokeError } from '../../lib/readSupabaseFunctionInvokeError'
import { adminTableWrapClass, adminTdClass, adminThClass, formatDate } from './adminUi'

const DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/u/2/folders/13u7rROY2ztVnvxqSpVESGEE74TgsqQOy'

type DriveFileRow = {
  id: string
  name: string
  mimeType: string
  modifiedTime?: string
  size?: string
  webViewLink?: string
}

type DriveDocumentsResponse = { files?: DriveFileRow[]; error?: string }

function fileLink(row: DriveFileRow): string {
  if (row.webViewLink?.trim()) return row.webViewLink.trim()
  return `https://drive.google.com/file/d/${row.id}/view`
}

function mimeLabel(mimeType: string): { icon: string; label: string } {
  switch (mimeType) {
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return { icon: '📄', label: 'Word' }
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return { icon: '📊', label: 'Excel' }
    case 'application/pdf':
      return { icon: '📋', label: 'PDF' }
    case 'application/vnd.google-apps.document':
      return { icon: '📄', label: 'Google Doc' }
    case 'application/vnd.google-apps.spreadsheet':
      return { icon: '📊', label: 'Google Sheet' }
    default:
      return { icon: '📁', label: 'File' }
  }
}

function formatFileSize(sizeRaw: string | undefined, mimeType: string): string {
  if (!sizeRaw?.trim()) return ''
  const n = Number(sizeRaw)
  if (!Number.isFinite(n) || n < 0) return ''
  if (mimeType.startsWith('application/vnd.google-apps.')) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`
  return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export default function DocumentsPage() {
  const [files, setFiles] = useState<DriveFileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const auth = await getValidAccessTokenForFunctions()
    if ('error' in auth) {
      setError(auth.error)
      setLoading(false)
      return
    }
    const { data, error: fnError } = await supabase.functions.invoke<DriveDocumentsResponse>('drive-documents', {
      method: 'GET',
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    if (fnError) {
      setError(await readSupabaseFunctionInvokeError(data, fnError))
      setFiles([])
    } else if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' && data.error) {
      setError(data.error)
      setFiles([])
    } else {
      setFiles(Array.isArray(data?.files) ? data.files : [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openHref(href: string) {
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Document Register</h1>
          <p className="text-sm text-gray-500 mt-1">Live view of the Quni Living Google Drive folder</p>
        </div>
        <a
          href={DRIVE_FOLDER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#FF6F61] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61]"
          aria-label="Open Quni Living folder in Google Drive"
        >
          <ExternalLinkIcon className="h-4 w-4" />
          Open folder
        </a>
      </div>

      {error && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      )}

      <div className={adminTableWrapClass}>
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={adminThClass}>Type</th>
                <th className={adminThClass}>Name</th>
                <th className={adminThClass}>Last modified</th>
                <th className={adminThClass}>Size</th>
                <th className={adminThClass} />
              </tr>
            </thead>
            <tbody>
              {files.map((row) => {
                const href = fileLink(row)
                const { icon, label } = mimeLabel(row.mimeType)
                const sizeStr = formatFileSize(row.size, row.mimeType)
                return (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openHref(href)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openHref(href)
                      }
                    }}
                    className="border-t border-gray-100 cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className={`${adminTdClass} whitespace-nowrap`}>
                      <span className="inline-flex items-center gap-2">
                        <span className="text-base" aria-hidden>
                          {icon}
                        </span>
                        <span className="text-gray-600">{label}</span>
                      </span>
                    </td>
                    <td className={adminTdClass}>
                      <span className="font-semibold text-gray-900">{row.name}</span>
                    </td>
                    <td className={`${adminTdClass} text-gray-600 whitespace-nowrap`}>
                      {row.modifiedTime ? formatDate(row.modifiedTime) : '—'}
                    </td>
                    <td className={`${adminTdClass} text-gray-600 whitespace-nowrap`}>{sizeStr || '—'}</td>
                    <td className={`${adminTdClass} text-right whitespace-nowrap`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openHref(href)
                        }}
                        className="inline-flex items-center justify-center rounded-lg bg-[#FF6F61] p-2 text-white shadow-sm hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61]"
                        aria-label={`Open ${row.name}`}
                      >
                        <ExternalLinkIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!loading && files.length === 0 && !error && (
          <p className="p-8 text-sm text-gray-500 text-center">No documents found in the Quni Living folder.</p>
        )}
      </div>
    </div>
  )
}
