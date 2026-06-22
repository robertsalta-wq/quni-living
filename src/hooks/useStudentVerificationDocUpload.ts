import { useCallback, useState } from 'react'
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
  onVerificationDocUploaded: (kind: VerificationDocKind, filePath: string, submittedAt: string) => void,
) {
  const [uploadedByKind, setUploadedByKind] = useState<Partial<Record<VerificationDocKind, VerificationUploadedDoc>>>({})
  const [idUploadError, setIdUploadError] = useState<string | null>(null)
  const [enrolUploadError, setEnrolUploadError] = useState<string | null>(null)
  const [identitySupportUploadError, setIdentitySupportUploadError] = useState<string | null>(null)
  const [idUploading, setIdUploading] = useState(false)
  const [enrolUploading, setEnrolUploading] = useState(false)
  const [identitySupportUploading, setIdentitySupportUploading] = useState(false)
  // TEMP DIAGNOSTIC: surfaces the live upload step so a failing device shows the
  // real reason on screen instead of "nothing happens". Remove once resolved.
  const [diag, setDiag] = useState<string | null>(null)

  const idDoc = profile
    ? resolveUploadedDoc(
        uploadedByKind.id,
        docFromProfile(profile.id_document_url, profile.id_submitted_at),
      )
    : null
  const enrolDoc = profile
    ? resolveUploadedDoc(
        uploadedByKind.enrolment,
        docFromProfile(profile.enrolment_doc_url, profile.enrolment_submitted_at),
      )
    : null
  const identitySupportDoc = profile
    ? resolveUploadedDoc(
        uploadedByKind.identity_supporting,
        docFromProfile(profile.identity_supporting_doc_url, profile.identity_supporting_submitted_at),
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
      setDiag(
        `[${kind}] picked: name=${file.name || '(none)'} type=${file.type || '(none)'} size=${file.size}b`,
      )
      console.warn('[verif-upload] picked', { kind, name: file.name, type: file.type, size: file.size })

      if (!profile || !userId) {
        setDiag(`[${kind}] blocked before upload: profile=${!!profile} userId=${!!userId}`)
        setErr('Not ready yet — reload the page and try again.')
        return
      }

      setErr(null)

      const profileFields = profileDocFields(profile, kind)
      const profileDoc = docFromProfile(profileFields.url, profileFields.submittedAt)
      let rollback: VerificationUploadedDoc | null = null

      const instantPreview = isVerificationPdf(file) ? null : URL.createObjectURL(file)

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

      const sizeError = validateVerificationFileSize(file, MAX_VERIFICATION_DOC_BYTES)
      if (sizeError) {
        setDiag(`[${kind}] rejected (size): ${sizeError}`)
        revertDocUpload(kind, instantPreview, rollback)
        setErr(sizeError)
        setBusy(false)
        return
      }
      const typeError = validateVerificationFileType(file)
      if (typeError) {
        setDiag(`[${kind}] rejected (type): file.type="${file.type || '(none)'}" name="${file.name || '(none)'}"`)
        revertDocUpload(kind, instantPreview, rollback)
        setErr(typeError)
        setBusy(false)
        return
      }

      try {
        setDiag(`[${kind}] uploading to storage…`)
        const result = await runVerificationDocUpload(supabase, userId, kind, file)
        if (!result.ok) {
          throw new Error(result.message)
        }
        setDiag(`[${kind}] saved OK -> ${result.filePath}`)

        setUploadedByKind((prev) => {
          // Drop the instant blob and load the actual stored file via signed URL.
          // The blob may be an un-renderable HEIC; the stored file is JPEG/PDF.
          revokeBlobUrl(prev[kind]?.previewUrl ?? instantPreview)
          return {
            ...prev,
            [kind]: {
              filePath: result.filePath,
              submittedAt: result.submittedAt,
              displayFileName: file.name,
              previewUrl: null,
              pending: false,
            },
          }
        })
        onVerificationDocUploaded(kind, result.filePath, result.submittedAt)
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
        setDiag(`[${kind}] ERROR: ${msg}`)
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
    diag,
    setDiag,
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
