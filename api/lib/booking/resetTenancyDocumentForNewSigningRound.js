// @ts-nocheck
/**
 * Clear an in-progress tenancy document so generate-* can rebuild PDFs and
 * create a fresh DocuSeal submission (landlord "regenerate agreement").
 */

const TENANCY_DOC_TYPES = ['residential_tenancy', 'lease']

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} bookingId
 * @returns {Promise<
 *   | { ok: true; reset: false; reason: string }
 *   | { ok: true; reset: true; documentId: string; previousStatus: string }
 *   | { ok: false; reason: string }
 * >}
 */
export async function resetTenancyDocumentForNewSigningRound(admin, bookingId) {
  const { data: tenancy, error: tErr } = await admin
    .from('tenancies')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle()

  if (tErr) {
    console.error('[reset-tenancy-doc-signing]', tErr)
    return { ok: false, reason: 'tenancy_lookup_failed' }
  }
  if (!tenancy?.id) {
    return { ok: true, reset: false, reason: 'no_tenancy' }
  }

  const { data: docs, error: dErr } = await admin
    .from('tenancy_documents')
    .select('id, status, metadata, document_type')
    .eq('tenancy_id', tenancy.id)
    .in('document_type', TENANCY_DOC_TYPES)

  if (dErr) {
    console.error('[reset-tenancy-doc-signing]', dErr)
    return { ok: false, reason: 'document_lookup_failed' }
  }

  const doc =
    (docs ?? []).find((d) => d.document_type === 'residential_tenancy') ??
    (docs ?? []).find((d) => d.document_type === 'lease')

  if (!doc?.id) {
    return { ok: true, reset: false, reason: 'no_document' }
  }

  const status = typeof doc.status === 'string' ? doc.status : ''
  if (status === 'signed') {
    return { ok: false, reason: 'already_signed' }
  }

  const meta =
    doc.metadata && typeof doc.metadata === 'object' && !Array.isArray(doc.metadata)
      ? { ...doc.metadata }
      : {}
  delete meta.docuseal_response

  const { error: upErr } = await admin
    .from('tenancy_documents')
    .update({
      status: 'draft',
      docuseal_submission_id: null,
      landlord_signed_at: null,
      student_signed_at: null,
      co_tenant_signed_at: null,
      metadata: meta,
    })
    .eq('id', doc.id)

  if (upErr) {
    console.error('[reset-tenancy-doc-signing] update', upErr)
    return { ok: false, reason: 'update_failed' }
  }

  return { ok: true, reset: true, documentId: doc.id, previousStatus: status || 'unknown' }
}
