/**
 * Remove all objects under student-documents/{userId}/ (recursive).
 * Uses a service-role Supabase client (Edge Functions).
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const BUCKET = 'student-documents'

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

async function removeUnderPrefix(admin: SupabaseClient, prefix: string): Promise<number> {
  const { data: items, error } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000 })
  if (error) {
    console.error('student-documents list failed', prefix, error.message)
    throw error
  }
  let removed = 0
  const filePaths: string[] = []
  for (const item of items ?? []) {
    const fullPath = `${prefix}/${item.name}`
    if (item.metadata) {
      filePaths.push(fullPath)
    } else {
      removed += await removeUnderPrefix(admin, fullPath)
    }
  }
  if (filePaths.length > 0) {
    const { error: rmErr } = await admin.storage.from(BUCKET).remove(filePaths)
    if (rmErr) {
      console.error('student-documents remove failed', rmErr.message)
      throw rmErr
    }
    removed += filePaths.length
  }
  return removed
}

export async function removeAllStudentDocuments(admin: SupabaseClient, userId: string): Promise<number> {
  if (!userId?.trim() || !isUuid(userId)) {
    console.warn('removeAllStudentDocuments: skip invalid user id')
    return 0
  }
  return removeUnderPrefix(admin, userId.trim())
}
