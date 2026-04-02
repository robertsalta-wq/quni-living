import type { SupabaseClient } from '@supabase/supabase-js'

export const STUDENT_VERIFICATION_DOC_BUCKET = 'student-documents'

async function removeUnderPrefix(client: SupabaseClient, prefix: string): Promise<void> {
  const { data: items, error } = await client.storage
    .from(STUDENT_VERIFICATION_DOC_BUCKET)
    .list(prefix, { limit: 1000 })
  if (error) throw error

  const filePaths: string[] = []
  for (const item of items ?? []) {
    const fullPath = `${prefix}/${item.name}`
    if (item.metadata) {
      filePaths.push(fullPath)
    } else {
      await removeUnderPrefix(client, fullPath)
    }
  }
  if (filePaths.length > 0) {
    const { error: rmErr } = await client.storage.from(STUDENT_VERIFICATION_DOC_BUCKET).remove(filePaths)
    if (rmErr) throw rmErr
  }
}

/**
 * Best-effort removal of all objects under student-documents/{userId}/.
 * No-op if the folder is empty or missing.
 */
export async function removeAllStudentVerificationDocuments(
  client: SupabaseClient,
  userId: string,
): Promise<void> {
  if (!userId.trim()) return
  await removeUnderPrefix(client, userId.trim())
}
