export type VerificationDocKind = 'id' | 'enrolment' | 'identity_supporting'

export type VerificationUploadedDoc = {
  filePath: string
  submittedAt: string
  displayFileName: string
  previewUrl?: string | null
  pending?: boolean
}

export type VerificationProfileDocFields = {
  url: string | null | undefined
  submittedAt: string | null | undefined
}

export function docFromProfile(
  url: string | null | undefined,
  submittedAt: string | null | undefined,
): VerificationUploadedDoc | null {
  const path = url?.trim() ?? ''
  const at = submittedAt?.trim() ?? ''
  if (!path || !at) return null
  return { filePath: path, submittedAt: at, displayFileName: path.split('/').pop() ?? 'document' }
}

export function resolveUploadedDoc(
  local: VerificationUploadedDoc | undefined,
  profile: VerificationUploadedDoc | null,
): VerificationUploadedDoc | null {
  return local ?? profile
}

export function docStepComplete(doc: VerificationUploadedDoc | null): boolean {
  return Boolean(doc && !doc.pending)
}

export type VerificationProfileSnapshot = {
  idUrl?: string | null
  idSubmittedAt?: string | null
  enrolUrl?: string | null
  enrolSubmittedAt?: string | null
  identitySupportUrl?: string | null
  identitySupportSubmittedAt?: string | null
}

export function profileDocFieldsFromValues(
  kind: VerificationDocKind,
  profile: VerificationProfileSnapshot,
): VerificationProfileDocFields {
  if (kind === 'id') {
    return { url: profile.idUrl, submittedAt: profile.idSubmittedAt }
  }
  if (kind === 'enrolment') {
    return { url: profile.enrolUrl, submittedAt: profile.enrolSubmittedAt }
  }
  return { url: profile.identitySupportUrl, submittedAt: profile.identitySupportSubmittedAt }
}

export function hasUploadedDoc(
  kind: VerificationDocKind,
  uploadedByKind: Partial<Record<VerificationDocKind, VerificationUploadedDoc>>,
  profileFields: VerificationProfileDocFields,
): boolean {
  const local = uploadedByKind[kind]
  if (local?.pending) return false
  if (local?.filePath && local.submittedAt) return true
  const path = profileFields.url?.trim() ?? ''
  const at = profileFields.submittedAt?.trim() ?? ''
  return Boolean(path && at)
}

export function storagePathForVerificationDoc(
  userId: string,
  kind: VerificationDocKind,
  storageExt: string,
): string {
  const base =
    kind === 'id' ? 'id-document' : kind === 'enrolment' ? 'enrolment-doc' : 'identity-supporting-doc'
  return `${userId}/${base}.${storageExt}`
}

export function dbPatchForVerificationDoc(
  kind: VerificationDocKind,
  path: string,
  submittedAt: string,
): Record<string, string> {
  if (kind === 'id') {
    return { id_document_url: path, id_submitted_at: submittedAt }
  }
  if (kind === 'enrolment') {
    return { enrolment_doc_url: path, enrolment_submitted_at: submittedAt }
  }
  return { identity_supporting_doc_url: path, identity_supporting_submitted_at: submittedAt }
}

export type PickVerificationFileResult = {
  uploadedByKind: Partial<Record<VerificationDocKind, VerificationUploadedDoc>>
  rollbackByKind: Partial<Record<VerificationDocKind, VerificationUploadedDoc>>
}

/** Optimistic UI the moment the user picks a file (before network). */
export function pickVerificationFile(
  prevUploaded: Partial<Record<VerificationDocKind, VerificationUploadedDoc>>,
  prevRollback: Partial<Record<VerificationDocKind, VerificationUploadedDoc>>,
  kind: VerificationDocKind,
  file: { name: string },
  profileFields: VerificationProfileDocFields,
  previewUrl: string | null,
  submittedAt: string,
): PickVerificationFileResult {
  const existing = resolveUploadedDoc(prevUploaded[kind], docFromProfile(profileFields.url, profileFields.submittedAt))
  const rollbackByKind = { ...prevRollback }

  if (existing && !existing.pending) {
    rollbackByKind[kind] = {
      filePath: existing.filePath,
      submittedAt: existing.submittedAt,
      displayFileName: existing.displayFileName,
    }
  } else {
    delete rollbackByKind[kind]
  }

  return {
    uploadedByKind: {
      ...prevUploaded,
      [kind]: {
        filePath: existing?.filePath ?? '',
        submittedAt,
        displayFileName: file.name,
        previewUrl,
        pending: true,
      },
    },
    rollbackByKind,
  }
}

export function completeVerificationUpload(
  prevUploaded: Partial<Record<VerificationDocKind, VerificationUploadedDoc>>,
  kind: VerificationDocKind,
  file: { name: string },
  filePath: string,
  submittedAt: string,
): Partial<Record<VerificationDocKind, VerificationUploadedDoc>> {
  return {
    ...prevUploaded,
    [kind]: {
      filePath,
      submittedAt,
      displayFileName: file.name,
      previewUrl: prevUploaded[kind]?.previewUrl ?? null,
      pending: false,
    },
  }
}

export function failVerificationUpload(
  prevUploaded: Partial<Record<VerificationDocKind, VerificationUploadedDoc>>,
  rollbackByKind: Partial<Record<VerificationDocKind, VerificationUploadedDoc>>,
  kind: VerificationDocKind,
): Partial<Record<VerificationDocKind, VerificationUploadedDoc>> {
  const rollback = rollbackByKind[kind]
  if (rollback) {
    return { ...prevUploaded, [kind]: rollback }
  }
  const next = { ...prevUploaded }
  delete next[kind]
  return next
}
