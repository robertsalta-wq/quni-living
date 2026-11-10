/**
 * Read-only: write corrected addendum PDFs for the four signed bookings.
 * Does not call DocuSeal and does not email anyone.
 *
 * node scripts/run-with-env.mjs npx tsx scripts/generate-corrected-addenda.ts
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { buildCorrectedPayeeAddendumPdf, coTenantFromBooking } from '../api/lib/documents/correctedPayeeAddendum.ts'

const BOOKINGS = [
  'd414f981-4f27-4baf-8ad2-a55df9fdc65d',
  '771acf77-e7cd-420b-8b01-0535e08deed9',
  '1b07c4e6-245e-4c51-87ed-b7a5a769405c',
  'ffbbdb02-10b5-47ca-adab-238d63fe61d9',
]

const url = (process.env.SUPABASE_URL || '').trim()
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, key)
const outDir = path.join(process.cwd(), 'tmp', 'corrected-addenda')
await mkdir(outDir, { recursive: true })

for (const bookingId of BOOKINGS) {
  const { data: booking, error } = await admin
    .from('bookings')
    .select('id, landlord_id, student_id, property_id, co_tenant, properties ( title, address, suburb, state )')
    .eq('id', bookingId)
    .maybeSingle()
  if (error || !booking) {
    console.error('missing', bookingId, error?.message)
    continue
  }
  const [{ data: landlord }, { data: renter }, { data: payout }] = await Promise.all([
    admin.from('landlord_profiles').select('full_name, company_name').eq('id', booking.landlord_id).maybeSingle(),
    admin.from('student_profiles').select('full_name').eq('id', booking.student_id).maybeSingle(),
    admin
      .from('property_payout_details')
      .select('account_name, bsb, account_number, bank_name')
      .eq('property_id', booking.property_id)
      .maybeSingle(),
  ])
  const prop = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties
  const co = coTenantFromBooking(booking.co_tenant)
  const pdf = await buildCorrectedPayeeAddendumPdf({
    bookingReference: booking.id.slice(0, 8),
    propertyLine: [prop?.title, prop?.address, prop?.suburb, prop?.state].filter(Boolean).join(', ') || 'Room',
    landlordName: (landlord?.full_name || landlord?.company_name || 'Landlord').trim(),
    renterName: (renter?.full_name || 'Renter').trim(),
    coTenantName: co?.fullName ?? null,
    accountName: payout?.account_name ?? null,
    bsb: payout?.bsb ?? null,
    accountNumber: payout?.account_number ?? null,
    bankName: payout?.bank_name ?? null,
  })
  const file = path.join(outDir, `${booking.id.slice(0, 8)}.pdf`)
  await writeFile(file, pdf)
  console.log('wrote', file, 'payee', Boolean(payout?.account_number))
}
