/**
 * Call production admin regenerate-listing-bond-receipt for a booking.
 * Mints a short-lived magic-link session for a platform_staff user (service role),
 * then POSTs to the live route with reEmail:false by default.
 *
 * Usage:
 *   node scripts/run-with-env.mjs npx tsx scripts/run-admin-regenerate-listing-bond-receipt.mjs \
 *     <bookingId> [--reEmail=false] [--force=true]
 */
import { createClient } from '@supabase/supabase-js'

const bookingId = (process.argv[2] || '').trim()
if (!bookingId) {
  console.error('Usage: … run-admin-regenerate-listing-bond-receipt.mjs <bookingId>')
  process.exit(1)
}

const force = !process.argv.includes('--force=false')
const reEmail = process.argv.includes('--reEmail=true')

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
if (!url || !serviceKey || !anonKey) {
  console.error('Missing SUPABASE_URL / SERVICE_ROLE / ANON')
  process.exit(1)
}

const admin = createClient(url, serviceKey)

const { data: staff, error: staffErr } = await admin
  .from('platform_staff')
  .select('email, user_id')
  .order('email')
  .limit(5)

if (staffErr || !staff?.length) {
  console.error('Could not load platform_staff', staffErr)
  process.exit(1)
}

const staffEmail = typeof staff[0].email === 'string' ? staff[0].email.trim() : ''
if (!staffEmail) {
  console.error('No platform_staff email')
  process.exit(1)
}

console.log('minting session for', staffEmail)

const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: staffEmail,
})
if (linkErr || !linkData?.properties?.email_otp) {
  console.error('generateLink failed', linkErr, linkData)
  process.exit(1)
}

const authClient = createClient(url, anonKey)
const { data: otpData, error: otpErr } = await authClient.auth.verifyOtp({
  email: staffEmail,
  token: linkData.properties.email_otp,
  type: 'email',
})
if (otpErr || !otpData.session?.access_token) {
  console.error('verifyOtp failed', otpErr)
  process.exit(1)
}

const token = otpData.session.access_token
console.log('admin session ok; calling production endpoint')

const res = await fetch('https://quni.com.au/api/documents/regenerate-listing-bond-receipt', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ bookingId, force, reEmail }),
})
const text = await res.text()
let body
try {
  body = JSON.parse(text)
} catch {
  body = { raw: text }
}
console.log('http', res.status, JSON.stringify(body, null, 2))

const { data: tenancy } = await admin
  .from('tenancies')
  .select('id, booking_id, tenancy_documents(id, document_type, file_path, status, metadata)')
  .eq('booking_id', bookingId)
  .maybeSingle()

const docs = Array.isArray(tenancy?.tenancy_documents) ? tenancy.tenancy_documents : []
const receipt = docs.find((d) => d.document_type === 'bond_receipt')
const { data: booking } = await admin
  .from('bookings')
  .select('id, status, service_tier_final')
  .eq('id', bookingId)
  .maybeSingle()

console.log(
  JSON.stringify(
    {
      verified_receipt: receipt
        ? { id: receipt.id, file_path: receipt.file_path, status: receipt.status }
        : null,
      booking,
      renter_download_cta_visible:
        Boolean(receipt?.id) &&
        ['confirmed', 'active', 'completed'].includes(String(booking?.status || '')),
    },
    null,
    2,
  ),
)

if (!res.ok || !receipt) process.exit(2)
