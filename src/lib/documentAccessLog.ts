import { supabase } from './supabase'
import type { Database } from './database.types'

export type VerificationDocumentType =
  Database['public']['Tables']['document_access_log']['Row']['document_type']

export function verificationDocumentTypeLabel(type: VerificationDocumentType): string {
  switch (type) {
    case 'id_document':
      return 'Photo ID'
    case 'enrolment_doc':
      return 'Enrolment'
    case 'identity_supporting_doc':
      return 'Supporting document'
    case 'visa_doc':
      return 'Visa document'
  }
}

/** Best-effort audit row when a platform admin opens a renter verification document. */
export async function logAdminVerificationDocumentAccess(params: {
  adminUserId: string
  adminEmail: string
  studentProfileId: string
  documentType: VerificationDocumentType
}): Promise<void> {
  try {
    const { error } = await supabase.from('document_access_log').insert({
      admin_user_id: params.adminUserId,
      admin_email: params.adminEmail.trim() || 'unknown',
      student_profile_id: params.studentProfileId,
      document_type: params.documentType,
    })
    if (error) console.error('document_access_log insert failed', error.message)
  } catch (e) {
    console.error('document_access_log insert failed', e)
  }
}
