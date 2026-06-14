import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { getValidAccessTokenForFunctions } from '../../lib/supabaseEdgeInvoke'
import { readSupabaseFunctionInvokeError } from '../../lib/readSupabaseFunctionInvokeError'
import { adminTableWrapClass, adminTdClass, adminThClass, formatDate } from './adminUi'
import { AdminPageHeader } from '../../components/admin/primitives'

const DRIVE_FOLDER_ID = '13u7rROY2ztVnvxqSpVESGEE74TgsqQOy'
const DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`

type DriveFileRow = {
  id: string
  name: string
  mimeType: string
  modifiedTime?: string
  size?: string
  webViewLink?: string
}

type DriveDocumentsResponse = { files?: DriveFileRow[]; error?: string }

function filePreviewUrl(row: DriveFileRow): string {
  switch (row.mimeType) {
    case 'application/vnd.google-apps.document':
      return `https://docs.google.com/document/d/${row.id}/preview`
    case 'application/vnd.google-apps.spreadsheet':
      return `https://docs.google.com/spreadsheets/d/${row.id}/preview`
    case 'application/vnd.google-apps.presentation':
      return `https://docs.google.com/presentation/d/${row.id}/preview`
    default:
      return `https://drive.google.com/file/d/${row.id}/preview`
  }
}

function fileExternalUrl(row: DriveFileRow): string {
  const link = row.webViewLink?.trim()
  if (link) return link.replace(/\/drive\/u\/\d+\//, '/drive/')
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

function EyeIcon({ className }: { className?: string }) {
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

type DocumentPreviewModalProps = {
  file: DriveFileRow | null
  onClose: () => void
}

function DocumentPreviewModal({ file, onClose }: DocumentPreviewModalProps) {
  useEffect(() => {
    if (!file) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [file, onClose])

  if (!file) return null

  const { label } = mimeLabel(file.mimeType)
  const previewUrl = filePreviewUrl(file)
  const externalUrl = fileExternalUrl(file)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-preview-title"
        className="relative z-10 flex h-[min(92vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id="document-preview-title" className="truncate text-lg font-semibold text-gray-900">
              {file.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {label}
              {file.modifiedTime ? ` · Last modified ${formatDate(file.modifiedTime)}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ExternalLinkIcon className="h-4 w-4" />
              Open in Drive
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Close"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-gray-100">
          <iframe
            title={`Preview of ${file.name}`}
            src={previewUrl}
            className="h-full w-full border-0 bg-white"
            allow="autoplay"
          />
        </div>
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const [files, setFiles] = useState<DriveFileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<DriveFileRow | null>(null)

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

  function openPreview(row: DriveFileRow) {
    setPreviewFile(row)
  }

  return (
    <div>
      <AdminPageHeader
        title="Document Register"
        subtitle="Browse and preview documents from the Quni Living register"
      />

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
                const { icon, label } = mimeLabel(row.mimeType)
                const sizeStr = formatFileSize(row.size, row.mimeType)
                return (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openPreview(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openPreview(row)
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
                      {row.modifiedTime ? formatDate(row.modifiedTime) : '-'}
                    </td>
                    <td className={`${adminTdClass} text-gray-600 whitespace-nowrap`}>{sizeStr || '-'}</td>
                    <td className={`${adminTdClass} text-right whitespace-nowrap`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openPreview(row)
                        }}
                        className="inline-flex items-center justify-center rounded-lg bg-[#FF6F61] p-2 text-white shadow-sm hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61]"
                        aria-label={`Preview ${row.name}`}
                      >
                        <EyeIcon className="h-4 w-4" />
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

      <DocumentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      <p className="mt-4 text-center text-xs text-gray-400">
        Documents are synced from{' '}
        <a href={DRIVE_FOLDER_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
          Google Drive
        </a>
        . Use &ldquo;Open in Drive&rdquo; in the preview if a file does not load here.
      </p>
    </div>
  )
}
