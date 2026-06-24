import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import {
  prepareVerificationDocForUpload,
  validateVerificationFileSize,
  validateVerificationFileType,
  MAX_VERIFICATION_DOC_BYTES,
} from './verificationDocUpload'

const DOC_BUCKET = 'student-documents'

export type VisaDocUploadResult =
  | { ok: true; filePath: string; submittedAt: string }
  | { ok: false; message: string }

export async function runVisaDocUpload(
  client: SupabaseClient<Database>,
  userId: string,
  file: File,
): Promise<VisaDocUploadResult> {
  const sizeError = validateVerificationFileSize(file, MAX_VERIFICATION_DOC_BYTES)
  if (sizeError) return { ok: false, message: sizeError }

  const typeError = validateVerificationFileType(file)
  if (typeError) return { ok: false, message: typeError }

  let prepared
  try {
    prepared = await prepareVerificationDocForUpload(file)
  } catch (e: unknown) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) }
  }

  const path = `visa/${userId}/visa-document.${prepared.storageExt}`
  const { error: upErr } = await client.storage.from(DOC_BUCKET).upload(path, prepared.blob, {
    upsert: true,
    contentType: prepared.contentType,
  })
  if (upErr) return { ok: false, message: upErr.message }

  const submittedAt = new Date().toISOString()
  const { error: dbErr } = await client
    .from('student_profiles')
    .update({
      visa_doc_url: path,
      visa_submitted_at: submittedAt,
      visa_doc_name: file.name,
      visa_doc_verified_at: null,
      visa_doc_review_status: null,
    })
    .eq('user_id', userId)
  if (dbErr) return { ok: false, message: dbErr.message }

  return { ok: true, filePath: path, submittedAt }
}
