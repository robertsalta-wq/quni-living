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
import {
  renterFieldWrapClass,
  renterFormGridStackClass,
  renterLabelClass,
} from '../../../lib/renterProfileFormClasses'

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
  labelId: string
  pickId: string
  doc: VerificationUploadedDoc | null
  fileName: string | null
  uploading: boolean
  error: string | null
  onPickClick: () => void
}

function VerificationDocField({
  profile,
  kind,
  labelId,
  pickId,
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
        <div role="group" aria-labelledby={labelId}>
          <RenterProfileVerificationRow
            value={fileName}
            rightSlot={slot}
            onAction={slot.kind === 'action' ? onPickClick : undefined}
            actionDisabled={uploading}
          />
        </div>
      ) : (
        <StudentVerificationDocPick
          busy={uploading}
          label="Upload file"
          onPickClick={onPickClick}
          error={error}
          variant="renter-profile"
          pickId={pickId}
          ariaLabelledBy={labelId}
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
  const idLabelId = 'renter-verify-id-label'
  const supportLabelId = 'renter-verify-support-label'
  const emailLabelId = 'renter-verify-email-label'

  return (
    <div className={renterFormGridStackClass}>
      {hoistedFileInputs}
      <div className={renterFieldWrapClass}>
        <span id={idLabelId} className={renterLabelClass}>
          Government photo ID
        </span>
        <VerificationDocField
          profile={profile}
          kind="id"
          labelId={idLabelId}
          pickId="renter-verify-id-pick"
          doc={idDoc}
          fileName={uploadFileName(idDoc)}
          uploading={idUploading}
          error={idUploadError}
          onPickClick={openPicker('id')}
        />
      </div>

      <div className={renterFieldWrapClass}>
        <span id={supportLabelId} className={renterLabelClass}>
          Supporting document
        </span>
        <VerificationDocField
          profile={profile}
          kind="identity_supporting"
          labelId={supportLabelId}
          pickId="renter-verify-support-pick"
          doc={identitySupportDoc}
          fileName={uploadFileName(identitySupportDoc)}
          uploading={identitySupportUploading}
          error={identitySupportUploadError}
          onPickClick={openPicker('identity_supporting')}
        />
      </div>

      {showEmail ? (
        <div className={renterFieldWrapClass}>
          <span id={emailLabelId} className={renterLabelClass}>
            {verificationEmailFieldLabel(situation)}
          </span>
          {situation === 'student' ? (
            <StudentUniEmailVerification
              profile={profile}
              onVerified={onRefresh}
              onProfilePatch={onProfilePatch}
              variant="renter-profile"
              hideFieldLabel
              labelledBy={emailLabelId}
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
              labelledBy={emailLabelId}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}
