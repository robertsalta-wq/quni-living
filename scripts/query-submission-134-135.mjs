import { createClient } from '@supabase/supabase-js'

const url = (process.env.SUPABASE_URL || '').trim()
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
const admin = createClient(url, key)

const ids = ['134', '135']
for (const sid of ids) {
  const { data } = await admin
    .from('tenancy_documents')
    .select('id, status, docuseal_submission_id, created_at, metadata, tenancies(booking_id, bookings(status))')
    .eq('docuseal_submission_id', sid)
  console.log('submission', sid, JSON.stringify(data, null, 2))
}
