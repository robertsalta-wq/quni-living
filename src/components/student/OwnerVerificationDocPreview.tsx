import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { STUDENT_VERIFICATION_DOC_BUCKET } from '../../lib/studentDocumentsStorage'
import { formatDate } from '../../pages/admin/adminUi'

const SIGNED_URL_TTL_SEC = 3600

function isPdfPath(path: string): boolean {
  return path.toLowerCase().endsWith('.pdf')
}

function displayFileName(path: string): string {
  return path.split('/').pop() ?? 'document'
}

/**
 * Owner-only preview of a verification document the renter uploaded.
 * RLS allows read on student-documents/{auth.uid()}/… only — use only on the owner's profile view.
 */
export function OwnerVerificationDocPreview({
  filePath,
  /** Changes on each upload even when storage path is unchanged (upsert replace). */
  submittedAt,
}: {
  filePath: string
  submittedAt?: string | null
}) {
  const path = filePath.trim()
  const refreshKey = submittedAt?.trim() || path
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!path) {
      setSignedUrl(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setSignedUrl(null)

    let cancelled = false
    void (async () => {
      const { data, error } = await supabase.storage
        .from(STUDENT_VERIFICATION_DOC_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SEC)
      if (cancelled) return
      if (!error && data?.signedUrl) setSignedUrl(data.signedUrl)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [path, refreshKey])

  if (loading) {
    return <p className="text-xs text-gray-500 mt-3">Loading preview…</p>
  }
  if (!signedUrl) return null

  if (isPdfPath(path)) {
    return (
      <div className="mt-3 flex items-center gap-3">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-2xl"
          aria-hidden
        >
          📄
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{displayFileName(path)}</p>
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[#FF6F61] hover:underline mt-0.5 inline-block"
          >
            Open
          </a>
        </div>
      </div>
    )
  }

  const previewSrc =
    refreshKey && signedUrl.includes('?')
      ? `${signedUrl}&v=${encodeURIComponent(refreshKey)}`
      : signedUrl

  return (
    <div className="mt-3">
      <img
        key={refreshKey}
        src={previewSrc}
        alt="Your uploaded document"
        className="max-h-24 max-w-full rounded-lg border border-stone-200 object-contain bg-white"
      />
      <a
        href={signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-semibold text-[#FF6F61] hover:underline mt-2 inline-block"
      >
        Open full size
      </a>
    </div>
  )
}

type OwnerSubmittedVerificationDocProps = {
  icon: string
  title: string
  submittedAt: string | null | undefined
  filePath: string | null | undefined
  reviewNote?: string
}

/** Confirms what the owner submitted, with a small preview of their own upload only. */
export function OwnerSubmittedVerificationDoc({
  icon,
  title,
  submittedAt,
  filePath,
  reviewNote,
}: OwnerSubmittedVerificationDocProps) {
  const path = filePath?.trim() ?? ''

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-gray-800">
      <p className="font-semibold">
        <span aria-hidden>{icon}</span> {title}
      </p>
      {submittedAt ? <p className="text-gray-600 mt-1">Submitted {formatDate(submittedAt)}</p> : null}
      {reviewNote ? <p className="text-xs text-gray-500 mt-2">{reviewNote}</p> : null}
      {path ? <OwnerVerificationDocPreview filePath={path} submittedAt={submittedAt} /> : null}
    </div>
  )
}
