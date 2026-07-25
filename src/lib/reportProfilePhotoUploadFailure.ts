import * as Sentry from '@sentry/react'
import { messageFromSupabaseError } from './supabaseErrorMessage'

type PhotoUploadContext = {
  /** Call site label for Sentry tags, e.g. renter-personal-section. */
  surface: string
  file?: Pick<File, 'name' | 'type' | 'size'>
}

/**
 * Surface a real error string for the UI and always send the failure to Sentry.
 * Profile photo catches previously swallowed Storage/API plain objects as
 * "Upload failed." with no monitoring.
 */
export function reportProfilePhotoUploadFailure(err: unknown, context: PhotoUploadContext): string {
  const message = messageFromSupabaseError(err)
  const exception = err instanceof Error ? err : new Error(message)

  Sentry.captureException(exception, {
    tags: {
      operation: 'profile_photo_upload',
      surface: context.surface,
    },
    extra: {
      message,
      fileName: context.file?.name,
      fileType: context.file?.type || '(empty)',
      fileSize: context.file?.size,
      errKind: err == null ? 'null' : typeof err,
      errConstructor: err instanceof Error ? err.constructor.name : undefined,
    },
  })

  return message.trim() || 'Upload failed.'
}
