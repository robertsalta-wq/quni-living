import { useMemo } from 'react'
import type { Database } from '../../../lib/database.types'
import { StudentUniEmailVerification } from '../StudentUniEmailVerification'
import { StudentWorkEmailVerification } from '../StudentWorkEmailVerification'
import { StudentVerificationDocPick } from '../StudentVerificationDocPick'
import { docStepComplete, type VerificationDocKind, type VerificationUploadedDoc } from '../../../lib/verificationDocSlot'
import {
  situationShowsVerificationEmail,
  verificationEmailFieldLabel,
} from '../../../lib/renterVerificationEmail'
import { verificationDocRowSlot } from '../../../lib/verificationItemState'
import type { useStudentVerificationDocUpload } from '../../../hooks/useStudentVerificationDocUpload'
import { useHoistedVerificationFileInputs } from '../../../hooks/useHoistedVerificationFileInputs'
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
  onPickClick: () => void
}

function VerificationDocField({
  profile,
  kind,
  doc,
  fileName,
  uploading,
  error,
  onPickClick,
}: DocRowProps) {
  const complete = docStepComplete(doc)
  const slot = complete && fileName ? verificationDocRowSlot(profile, kind) : null

  return (
    <>
      {complete && fileName && slot ? (
        <RenterProfileVerificationRow
          value={fileName}
          rightSlot={slot}
          onAction={slot.kind === 'action' ? onPickClick : undefined}
          actionDisabled={uploading}
        />
      ) : (
        <StudentVerificationDocPick
          busy={uploading}
          label="Upload file"
          onPickClick={onPickClick}
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

  const pickSlots = useMemo(
    () => [
      { kind: 'id' as const, pick: pickIdFile },
      { kind: 'identity_supporting' as const, pick: pickIdentitySupportFile },
    ],
    [pickIdFile, pickIdentitySupportFile],
  )

  const { hoistedFileInputs, openPicker } = useHoistedVerificationFileInputs(pickSlots)

  const showEmail = situationShowsVerificationEmail(situation)

  return (
    <div className="renter-profile-form-grid renter-profile-form-grid--stack">
      {hoistedFileInputs}
      <div className="renter-profile-field">
        <span className="renter-profile-field-label">Government photo ID</span>
        <VerificationDocField
          profile={profile}
          kind="id"
          doc={idDoc}
          fileName={uploadFileName(idDoc)}
          uploading={idUploading}
          error={idUploadError}
          onPickClick={openPicker('id')}
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
          onPickClick={openPicker('identity_supporting')}
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
