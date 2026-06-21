import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { logAdminVerificationDocumentAccess, type VerificationDocumentType } from '../../lib/documentAccessLog'
import { STUDENT_VERIFICATION_DOC_BUCKET } from '../../lib/studentDocumentsStorage'
import { formatDate } from '../../pages/admin/adminUi'

const SIGNED_URL_TTL_SEC = 3600

type Props = {
  label: string
  filePath: string | null | undefined
  submittedAt: string | null | undefined
  studentProfileId: string
  documentType: VerificationDocumentType
}

/**
 * Admin-only open control for renter verification documents.
 * Signed URLs require storage SELECT on `student-documents` where
 * `bucket_id = 'student-documents' AND public.is_platform_admin()` (platform_staff table).
 */
export function AdminVerificationDocLink({
  label,
  filePath,
  submittedAt,
  studentProfileId,
  documentType,
}: Props) {
  const path = filePath?.trim() ?? ''
  const hasDoc = path.length > 0 && submittedAt != null && String(submittedAt).trim() !== ''

  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState(false)

  async function handleOpen() {
    if (!hasDoc || opening) return
    setOpening(true)
    setOpenError(false)

    try {
      const { data, error } = await supabase.storage
        .from(STUDENT_VERIFICATION_DOC_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SEC)

      if (error || !data?.signedUrl) {
        setOpenError(true)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.id) {
        void logAdminVerificationDocumentAccess({
          adminUserId: user.id,
          adminEmail: user.email ?? 'unknown',
          studentProfileId,
          documentType,
        })
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="rounded-admin-sm border border-admin-line bg-admin-surface-2 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[13px] font-medium text-admin-ink-2">{label}</p>
          {hasDoc && submittedAt ? (
            <p className="m-0 mt-0.5 text-[12px] text-admin-ink-5">Submitted {formatDate(submittedAt)}</p>
          ) : null}
        </div>
        {!hasDoc ? (
          <span className="shrink-0 text-[12px] text-admin-ink-5">Not submitted</span>
        ) : openError ? (
          <button
            type="button"
            onClick={() => void handleOpen()}
            className="shrink-0 text-[12px] font-medium text-admin-danger-fg hover:underline"
          >
            Retry
          </button>
        ) : (
          <button
            type="button"
            disabled={opening}
            onClick={() => void handleOpen()}
            className="shrink-0 rounded-admin-sm border border-admin-line bg-white px-2.5 py-1 text-[12px] font-semibold text-indigo-800 hover:bg-indigo-50 disabled:opacity-60"
          >
            {opening ? 'Opening…' : 'Open'}
          </button>
        )}
      </div>
    </div>
  )
}
