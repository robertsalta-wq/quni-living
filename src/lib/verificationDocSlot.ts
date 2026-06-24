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
  name?: string | null | undefined,
): VerificationUploadedDoc | null {
  const path = url?.trim() ?? ''
  const at = submittedAt?.trim() ?? ''
  if (!path || !at) return null
  const displayFileName = name?.trim() || path.split('/').pop() || 'document'
  return { filePath: path, submittedAt: at, displayFileName }
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
  displayName?: string,
): Record<string, string | null> {
  const name = displayName?.trim() ?? ''
  if (kind === 'id') {
    return {
      id_document_url: path,
      id_submitted_at: submittedAt,
      id_document_name: name,
      id_document_verified_at: null,
      id_document_review_status: null,
    }
  }
  if (kind === 'enrolment') {
    return {
      enrolment_doc_url: path,
      enrolment_submitted_at: submittedAt,
      enrolment_doc_name: name,
      enrolment_doc_verified_at: null,
      enrolment_doc_review_status: null,
    }
  }
  return {
    identity_supporting_doc_url: path,
    identity_supporting_submitted_at: submittedAt,
    identity_supporting_doc_name: name,
    identity_supporting_doc_verified_at: null,
    identity_supporting_doc_review_status: null,
  }
}

/** Clears a verification doc from the profile when the user starts a replace upload. */
export function dbClearPatchForVerificationDoc(kind: VerificationDocKind): Record<string, null> {
  if (kind === 'id') {
    return {
      id_document_url: null,
      id_submitted_at: null,
      id_document_name: null,
      id_document_verified_at: null,
      id_document_review_status: null,
    }
  }
  if (kind === 'enrolment') {
    return {
      enrolment_doc_url: null,
      enrolment_submitted_at: null,
      enrolment_doc_name: null,
      enrolment_doc_verified_at: null,
      enrolment_doc_review_status: null,
    }
  }
  return {
    identity_supporting_doc_url: null,
    identity_supporting_submitted_at: null,
    identity_supporting_doc_name: null,
    identity_supporting_doc_verified_at: null,
    identity_supporting_doc_review_status: null,
  }
}

/** True when the doc counts as verified/on-file (not mid-replace). */
export function isVerificationDocVerified(doc: VerificationUploadedDoc | null): boolean {
  return docStepComplete(doc)
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
  previewUrl?: string | null,
): Partial<Record<VerificationDocKind, VerificationUploadedDoc>> {
  return {
    ...prevUploaded,
    [kind]: {
      filePath,
      submittedAt,
      displayFileName: file.name,
      previewUrl: previewUrl ?? null,
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
