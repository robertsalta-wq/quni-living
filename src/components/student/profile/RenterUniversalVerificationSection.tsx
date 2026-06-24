import { useCallback, useEffect, useRef, type RefObject } from 'react'
import type { Database } from '../../../lib/database.types'
import { StudentUniEmailVerification } from '../StudentUniEmailVerification'
import { StudentWorkEmailVerification } from '../StudentWorkEmailVerification'
import { StudentVerificationDocPick } from '../StudentVerificationDocPick'
import { VERIFICATION_ID_FILE_ACCEPT } from '../../../lib/verificationDocUpload'
import { docStepComplete, type VerificationDocKind, type VerificationUploadedDoc } from '../../../lib/verificationDocSlot'
import {
  situationShowsVerificationEmail,
  verificationEmailFieldLabel,
} from '../../../lib/renterVerificationEmail'
import { verificationDocRowSlot } from '../../../lib/verificationItemState'
import type { useStudentVerificationDocUpload } from '../../../hooks/useStudentVerificationDocUpload'
import type { RenterSituation } from '../../../lib/renterSituation'
import { RenterProfileVerificationRow } from './RenterProfileVerificationRow'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']
type DocUploadApi = ReturnType<typeof useStudentVerificationDocUpload>

type Props = {
  profile: StudentRow
  userId: string
  situation: RenterSituation
  onRefresh: () => Promise<void>
  onProfilePatch?: (patch: Partial<StudentRow>) => void
  docUpload: DocUploadApi
}

function uploadFileName(doc: { displayFileName?: string } | null): string | null {
  const name = doc?.displayFileName?.trim()
  return name || null
}

type DocRowProps = {
  profile: StudentRow
  kind: VerificationDocKind
  doc: VerificationUploadedDoc | null
  fileName: string | null
  uploading: boolean
  error: string | null
  inputRef: RefObject<HTMLInputElement | null>
}

function VerificationDocField({
  profile,
  kind,
  doc,
  fileName,
  uploading,
  error,
  inputRef,
}: DocRowProps) {
  const complete = docStepComplete(doc)
  const slot = complete && fileName ? verificationDocRowSlot(profile, kind) : null

  return (
    <>
      <input ref={inputRef} type="file" accept={kind === 'id' ? VERIFICATION_ID_FILE_ACCEPT : 'image/*,application/pdf'} className="sr-only" />
      {complete && fileName && slot ? (
        <RenterProfileVerificationRow
          value={fileName}
          rightSlot={slot}
          onAction={slot.kind === 'action' ? () => inputRef.current?.click() : undefined}
          actionDisabled={uploading}
        />
      ) : (
        <StudentVerificationDocPick
          busy={uploading}
          label="Upload file"
          onPickClick={() => inputRef.current?.click()}
          error={error}
          variant="renter-profile"
        />
      )}
    </>
  )
}

export function RenterUniversalVerificationSection({
  profile,
  userId,
  situation,
  onRefresh,
  onProfilePatch,
  docUpload,
}: Props) {
  const {
    idDoc,
    identitySupportDoc,
    idUploading,
    identitySupportUploading,
    idUploadError,
    identitySupportUploadError,
    pickIdFile,
    pickIdentitySupportFile,
  } = docUpload

  const idInputRef = useRef<HTMLInputElement>(null)
  const supportInputRef = useRef<HTMLInputElement>(null)

  const bindPick = useCallback(
    (ref: RefObject<HTMLInputElement | null>, pick: (f: File) => void) => {
      const el = ref.current
      if (!el) return
      const handler = () => {
        const file = el.files?.[0]
        el.value = ''
        if (file) pick(file)
      }
      el.addEventListener('change', handler)
      return () => el.removeEventListener('change', handler)
    },
    [],
  )

  useEffect(() => bindPick(idInputRef, pickIdFile), [bindPick, pickIdFile])
  useEffect(() => bindPick(supportInputRef, pickIdentitySupportFile), [
    bindPick,
    pickIdentitySupportFile,
  ])

  const showEmail = situationShowsVerificationEmail(situation)

  return (
    <div className="renter-profile-form-grid renter-profile-form-grid--stack">
      <div className="renter-profile-field">
        <span className="renter-profile-field-label">Government photo ID</span>
        <VerificationDocField
          profile={profile}
          kind="id"
          doc={idDoc}
          fileName={uploadFileName(idDoc)}
          uploading={idUploading}
          error={idUploadError}
          inputRef={idInputRef}
        />
      </div>

      <div className="renter-profile-field">
        <span className="renter-profile-field-label">Supporting document</span>
        <VerificationDocField
          profile={profile}
          kind="identity_supporting"
          doc={identitySupportDoc}
          fileName={uploadFileName(identitySupportDoc)}
          uploading={identitySupportUploading}
          error={identitySupportUploadError}
          inputRef={supportInputRef}
        />
      </div>

      {showEmail ? (
        <div className="renter-profile-field">
          <span className="renter-profile-field-label">{verificationEmailFieldLabel(situation)}</span>
          {situation === 'student' ? (
            <StudentUniEmailVerification
              profile={profile}
              onVerified={onRefresh}
              onProfilePatch={onProfilePatch}
              variant="renter-profile"
              hideFieldLabel
            />
          ) : (
            <StudentWorkEmailVerification
              profile={profile}
              userId={userId}
              onVerified={onRefresh}
              onProfilePatch={onProfilePatch}
              required
              variant="renter-profile"
              hideFieldLabel
            />
          )}
        </div>
      ) : null}
    </div>
  )
}
