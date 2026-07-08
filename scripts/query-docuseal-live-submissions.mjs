/**
 * Read-only: list tenancy_documents with DocuSeal submission ids (prod Supabase).
 * Usage: node scripts/run-with-env.mjs node scripts/query-docuseal-live-submissions.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = (process.env.SUPABASE_URL || '').trim()
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, key)

const { data, error } = await admin
  .from('tenancy_documents')
  .select(
    'id, status, docuseal_submission_id, created_at, metadata, tenancies!inner(booking_id, bookings!inner(id, status, student_id, landlord_id))',
  )
  .not('docuseal_submission_id', 'is', null)
  .order('created_at', { ascending: false })

if (error) {
  console.error(error)
  process.exit(1)
}

function embedLinks(meta) {
  const dr = meta?.docuseal_response
  const submitters = Array.isArray(dr?.submitters) ? dr.submitters : []
  return submitters.map((s) => ({
    role: s?.role,
    id: s?.id,
    embed_src: typeof s?.embed_src === 'string' ? s.embed_src : null,
    raw_s_link: typeof s?.embed_src === 'string' && s.embed_src.includes('/s/') && !s.embed_src.includes('/api/sign/'),
    wrapped: typeof s?.embed_src === 'string' && s.embed_src.includes('/api/sign/'),
  }))
}

const rows = (data ?? []).map((row) => {
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
  const booking = row.tenancies?.bookings
  return {
    tenancy_document_id: row.id,
    docuseal_submission_id: row.docuseal_submission_id,
    doc_status: row.status,
    created_at: row.created_at,
    booking_id: row.tenancies?.booking_id,
    booking_status: booking?.status,
    signing_package: meta.signing_package ?? null,
    submitters: embedLinks(meta),
  }
})

console.log(JSON.stringify(rows, null, 2))
