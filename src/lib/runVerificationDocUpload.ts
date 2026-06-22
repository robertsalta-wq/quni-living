import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import {
  dbPatchForVerificationDoc,
  storagePathForVerificationDoc,
  type VerificationDocKind,
} from './verificationDocSlot'
import { prepareVerificationDocForUpload, validateVerificationFileSize, validateVerificationFileType, MAX_VERIFICATION_DOC_BYTES } from './verificationDocUpload'

const DOC_BUCKET = 'student-documents'

export type VerificationDocUploadResult =
  | { ok: true; filePath: string; submittedAt: string }
  | { ok: false; message: string }

export async function runVerificationDocUpload(
  client: SupabaseClient<Database>,
  userId: string,
  kind: VerificationDocKind,
  file: File,
): Promise<VerificationDocUploadResult> {
  const sizeError = validateVerificationFileSize(file, MAX_VERIFICATION_DOC_BYTES)
  if (sizeError) return { ok: false, message: sizeError }

  const typeError = validateVerificationFileType(file)
  if (typeError) return { ok: false, message: typeError }

  let prepared
  try {
    prepared = await prepareVerificationDocForUpload(file)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, message: msg }
  }

  const path = storagePathForVerificationDoc(userId, kind, prepared.storageExt)

  const { error: upErr } = await client.storage.from(DOC_BUCKET).upload(path, prepared.blob, {
    upsert: true,
    contentType: prepared.contentType,
  })
  if (upErr) return { ok: false, message: upErr.message }

  const submittedAt = new Date().toISOString()
  const patch = dbPatchForVerificationDoc(kind, path, submittedAt)

  const { error: dbErr } = await client.from('student_profiles').update(patch).eq('user_id', userId)
  if (dbErr) return { ok: false, message: dbErr.message }

  return { ok: true, filePath: path, submittedAt }
}
