import { useCallback, useState } from 'react'
import { flushSync } from 'react-dom'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import { messageFromSupabaseError } from '../lib/supabaseErrorMessage'
import { runVerificationDocUpload } from '../lib/runVerificationDocUpload'
import {
  isVerificationPdf,
  MAX_VERIFICATION_DOC_BYTES,
  validateVerificationFileSize,
  validateVerificationFileType,
} from '../lib/verificationDocUpload'
import {
  docFromProfile,
  profileDocFieldsFromValues,
  resolveUploadedDoc,
  type VerificationDocKind,
  type VerificationUploadedDoc,
} from '../lib/verificationDocSlot'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

/** sessionStorage key for the post-reload "uploaded" confirmation banner. */
export const VERIF_UPLOAD_FLASH_KEY = 'verifUploadFlash'

const UPLOAD_LABELS: Record<VerificationDocKind, string> = {
  id: 'Photo ID',
  enrolment: 'Enrolment document',
  identity_supporting: 'Supporting document',
}

function revokeBlobUrl(url: string | null | undefined) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

function profileDocFields(profile: StudentRow, kind: VerificationDocKind) {
  return profileDocFieldsFromValues(kind, {
    idUrl: profile.id_document_url,
    idSubmittedAt: profile.id_submitted_at,
    enrolUrl: profile.enrolment_doc_url,
    enrolSubmittedAt: profile.enrolment_submitted_at,
    identitySupportUrl: profile.identity_supporting_doc_url,
    identitySupportSubmittedAt: profile.identity_supporting_submitted_at,
  })
}

export function useStudentVerificationDocUpload(
  profile: StudentRow | null,
  userId: string | undefined,
  onVerificationDocUploaded: (
    kind: VerificationDocKind,
    filePath: string,
    submittedAt: string,
    displayName: string,
  ) => void,
) {
  const [uploadedByKind, setUploadedByKind] = useState<Partial<Record<VerificationDocKind, VerificationUploadedDoc>>>({})
  const [idUploadError, setIdUploadError] = useState<string | null>(null)
  const [enrolUploadError, setEnrolUploadError] = useState<string | null>(null)
  const [identitySupportUploadError, setIdentitySupportUploadError] = useState<string | null>(null)
  const [idUploading, setIdUploading] = useState(false)
  const [enrolUploading, setEnrolUploading] = useState(false)
  const [identitySupportUploading, setIdentitySupportUploading] = useState(false)

  const idDoc = profile
    ? resolveUploadedDoc(
        uploadedByKind.id,
        docFromProfile(profile.id_document_url, profile.id_submitted_at, profile.id_document_name),
      )
    : null
  const enrolDoc = profile
    ? resolveUploadedDoc(
        uploadedByKind.enrolment,
        docFromProfile(profile.enrolment_doc_url, profile.enrolment_submitted_at, profile.enrolment_doc_name),
      )
    : null
  const identitySupportDoc = profile
    ? resolveUploadedDoc(
        uploadedByKind.identity_supporting,
        docFromProfile(
          profile.identity_supporting_doc_url,
          profile.identity_supporting_submitted_at,
          profile.identity_supporting_doc_name,
        ),
      )
    : null

  const revertDocUpload = useCallback(
    (kind: VerificationDocKind, previewUrl: string | null, rollback: VerificationUploadedDoc | null) => {
      revokeBlobUrl(previewUrl)
      setUploadedByKind((prev) => {
        if (rollback) return { ...prev, [kind]: rollback }
        const next = { ...prev }
        delete next[kind]
        return next
      })
    },
    [],
  )

  const uploadDoc = useCallback(
    async (
      file: File,
      kind: VerificationDocKind,
      setErr: (s: string | null) => void,
      setBusy: (b: boolean) => void,
    ) => {
      if (!profile || !userId) return

      setErr(null)

      const profileFields = profileDocFields(profile, kind)
      const profileDoc = docFromProfile(profileFields.url, profileFields.submittedAt)
      let rollback: VerificationUploadedDoc | null = null

      const instantPreview = isVerificationPdf(file) ? null : URL.createObjectURL(file)

      // flushSync: this runs from a native addEventListener-triggered flow; on
      // Android Chrome after the file picker returns, React schedules the update
      // but the browser doesn't repaint until the next interaction. flushSync
      // forces a synchronous commit + layout/paint so the UI updates immediately.
      flushSync(() => {
        setBusy(true)
        setUploadedByKind((prev) => {
          const existing = resolveUploadedDoc(prev[kind], profileDoc)
          if (existing && !existing.pending) {
            rollback = {
              filePath: existing.filePath,
              submittedAt: existing.submittedAt,
              displayFileName: existing.displayFileName,
            }
          }
          revokeBlobUrl(prev[kind]?.previewUrl)
          return {
            ...prev,
            [kind]: {
              filePath: existing?.filePath ?? '',
              submittedAt: new Date().toISOString(),
              displayFileName: file.name,
              previewUrl: instantPreview,
              pending: true,
            },
          }
        })
      })

      const sizeError = validateVerificationFileSize(file, MAX_VERIFICATION_DOC_BYTES)
      if (sizeError) {
        revertDocUpload(kind, instantPreview, rollback)
        setErr(sizeError)
        setBusy(false)
        return
      }
      const typeError = validateVerificationFileType(file)
      if (typeError) {
        revertDocUpload(kind, instantPreview, rollback)
        setErr(typeError)
        setBusy(false)
        return
      }

      try {
        const result = await runVerificationDocUpload(supabase, userId, kind, file)
        if (!result.ok) {
          throw new Error(result.message)
        }

        // The card does not reliably repaint after this native-upload flow on some
        // Android browsers (MIUI/Xiaomi): React commits the state but the device
        // defers painting until the next interaction, so the user can't see it
        // worked. A full reload always shows the saved state (it's what a manual
        // refresh does). Flag a success message to show after reload, then refresh.
        revokeBlobUrl(instantPreview)
        try {
          sessionStorage.setItem(VERIF_UPLOAD_FLASH_KEY, `${UPLOAD_LABELS[kind]} uploaded`)
        } catch {
          /* ignore storage errors */
        }
        window.location.reload()
        return
      } catch (err: unknown) {
        console.error('Verification document upload failed', { kind, fileName: file.name, error: err })
        revertDocUpload(kind, instantPreview, rollback)
        let msg = err instanceof Error ? err.message : messageFromSupabaseError(err)
        if (msg === 'Something went wrong.' || msg === 'Unknown error') {
          msg = String(err)
        }
        if (msg.includes('Bucket not found') || msg.includes('not found')) {
          msg =
            'Document storage is not set up yet. Ask the team to run supabase/student_verification.sql and create the student-documents bucket.'
        }
        setErr(msg)
      } finally {
        setBusy(false)
      }
    },
    [profile, userId, onVerificationDocUploaded, revertDocUpload],
  )

  const pickIdFile = useCallback(
    (file: File) => void uploadDoc(file, 'id', setIdUploadError, setIdUploading),
    [uploadDoc],
  )
  const pickEnrolFile = useCallback(
    (file: File) => void uploadDoc(file, 'enrolment', setEnrolUploadError, setEnrolUploading),
    [uploadDoc],
  )
  const pickIdentitySupportFile = useCallback(
    (file: File) => void uploadDoc(file, 'identity_supporting', setIdentitySupportUploadError, setIdentitySupportUploading),
    [uploadDoc],
  )

  return {
    uploadedByKind,
    idDoc,
    enrolDoc,
    identitySupportDoc,
    idUploading,
    enrolUploading,
    identitySupportUploading,
    idUploadError,
    enrolUploadError,
    identitySupportUploadError,
    pickIdFile,
    pickEnrolFile,
    pickIdentitySupportFile,
  }
}
