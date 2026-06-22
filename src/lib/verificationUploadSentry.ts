import * as Sentry from '@sentry/react'
import {
  isVerificationHeicOrHeif,
  isVerificationPdf,
  verificationExtensionFromFilename,
} from './verificationDocUpload'

export type VerificationUploadDocType = 'id' | 'enrolment' | 'identity-supporting'
export type VerificationUploadRoute = 'student' | 'non-student'
export type VerificationUploadStage = 'validation' | 'conversion' | 'storage' | 'db'
export type VerificationUploadValidationReason = 'file_size' | 'file_type'

const FEATURE_TAG = 'verification_upload'

function isSentryEnabled(): boolean {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  return typeof dsn === 'string' && dsn.trim() !== ''
}

function bundleReleaseContext(): Record<string, string> {
  const sha = import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA
  if (typeof sha === 'string' && sha.trim()) {
    return { commitSha: sha.trim() }
  }
  return {}
}

export function verificationUploadDocTypeFromKind(
  kind: 'id' | 'enrolment' | 'identity_supporting',
): VerificationUploadDocType {
  if (kind === 'identity_supporting') return 'identity-supporting'
  return kind
}

export function buildVerificationUploadSentryMeta(
  file: File,
  kind: 'id' | 'enrolment' | 'identity_supporting',
  route: VerificationUploadRoute,
  userId: string,
): Record<string, string | number | boolean> {
  const extension = verificationExtensionFromFilename(file.name)
  return {
    ...bundleReleaseContext(),
    docType: verificationUploadDocTypeFromKind(kind),
    route,
    userId,
    fileType: file.type || '(empty)',
    fileSizeBytes: file.size,
    extension: extension || '(none)',
    heicConversion: isVerificationHeicOrHeif(file) && !isVerificationPdf(file),
  }
}

function tagsForStage(stage: VerificationUploadStage): Record<string, string> {
  return { feature: FEATURE_TAG, stage }
}

export function addVerificationUploadStartBreadcrumb(meta: Record<string, string | number | boolean>): void {
  if (!isSentryEnabled()) return
  Sentry.addBreadcrumb({
    category: 'verification-upload',
    message: 'Verification document upload started',
    level: 'info',
    data: meta,
  })
}

export function addVerificationFileInputChangeBreadcrumb(
  docType: VerificationUploadDocType,
  hasFile: boolean,
): void {
  if (!isSentryEnabled()) return
  Sentry.addBreadcrumb({
    category: 'verification-upload',
    message: 'Verification file input change',
    level: 'info',
    data: { docType, hasFile, ...bundleReleaseContext() },
  })
}

export function captureVerificationUploadValidationReject(
  reason: VerificationUploadValidationReason,
  meta: Record<string, string | number | boolean>,
  message: string,
): void {
  if (!isSentryEnabled()) return
  Sentry.captureMessage(`verification_upload_${reason}`, {
    level: 'warning',
    tags: tagsForStage('validation'),
    extra: { ...meta, reason, message },
  })
}

export function captureVerificationUploadException(
  error: unknown,
  stage: Exclude<VerificationUploadStage, 'validation'>,
  meta: Record<string, string | number | boolean>,
): void {
  if (!isSentryEnabled()) return
  Sentry.captureException(error, {
    tags: tagsForStage(stage),
    extra: { ...meta, stage },
  })
}
