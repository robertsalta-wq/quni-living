/**
 * One-off: list signed agreements whose page /Contents arrays contain null or non-stream entries.
 *
 * Dry run is the default. It does not write storage.
 *
 *   node scripts/run-with-env.mjs npx tsx scripts/repair-signed-pdf-contents.mjs
 *
 * After this PR is on production and you have decided to repair stored files:
 *
 *   node scripts/run-with-env.mjs npx tsx scripts/repair-signed-pdf-contents.mjs --apply
 *
 * --apply saves a backup next to each file (same path + .bak-before-contents-repair),
 * writes the repaired PDF to the original path, then runs qpdf --check.
 */
import dotenv from 'dotenv'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { qpdfCheckBytes, repairPdfContents } from '../api/lib/documents/repairPdfContents.ts'

const root = process.cwd()
const envFile = ['.env.vercel.production', '.env.vercel', '.env.local'].find((name) =>
  fs.existsSync(`${root}/${name}`),
)
if (envFile) dotenv.config({ path: `${root}/${envFile}` })

const apply = process.argv.includes('--apply')
const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, key)

function looksLikeTest(row) {
  const emails = `${row.landlord_email || ''} ${row.student_email || ''}`.toLowerCase()
  return /e2e|example\.com|\+test|quni-e2e/.test(emails)
}

function party(name, email) {
  return [name, email].filter(Boolean).join(' <') + (email ? '>' : '')
}

const { data: docs, error } = await admin
  .from('tenancy_documents')
  .select(
    'id, tenancy_id, document_type, status, file_path, metadata, docuseal_submission_id, tenancies ( booking_id, bookings ( id, lease_length, status, properties ( address, suburb ), landlord_profiles ( full_name, email, fee_exempt ), student_profiles ( full_name, email ) ) )',
  )
  .in('status', ['signed', 'archived'])

if (error) {
  console.error(error.message)
  process.exit(1)
}

console.log(`env: ${envFile || 'process'}  mode: ${apply ? 'APPLY' : 'dry-run'}  documents: ${(docs ?? []).length}`)

let dirty = 0
for (const doc of docs ?? []) {
  const meta = doc.metadata && typeof doc.metadata === 'object' ? doc.metadata : {}
  const paths = [
    doc.file_path,
    meta.signed_rta_file_path,
    meta.signed_addendum_file_path,
  ].filter((value, index, all) => typeof value === 'string' && value.trim() && all.indexOf(value) === index)

  const tenancy = doc.tenancies && typeof doc.tenancies === 'object' ? doc.tenancies : null
  const booking = tenancy?.bookings && typeof tenancy.bookings === 'object' ? tenancy.bookings : null
  const property = booking?.properties && typeof booking.properties === 'object' ? booking.properties : null
  const landlord = booking?.landlord_profiles && typeof booking.landlord_profiles === 'object' ? booking.landlord_profiles : null
  const student = booking?.student_profiles && typeof booking.student_profiles === 'object' ? booking.student_profiles : null
  const address = [property?.address, property?.suburb].filter(Boolean).join(', ')

  for (const path of paths) {
    const downloaded = await admin.storage.from('tenancy-documents').download(path)
    if (downloaded.error || !downloaded.data) {
      console.log(`SKIP ${path} download failed`)
      continue
    }
    const bytes = new Uint8Array(await downloaded.data.arrayBuffer())
    const repaired = await repairPdfContents(bytes)
    if (repaired.removed === 0) continue
    dirty += 1
    const row = {
      booking_id: booking?.id || tenancy?.booking_id || '',
      submission: doc.docuseal_submission_id || '',
      address,
      landlord: party(landlord?.full_name, landlord?.email),
      renter: party(student?.full_name, student?.email),
      test: looksLikeTest({
        landlord_email: landlord?.email,
        student_email: student?.email,
      }),
      fee_exempt_landlord: landlord?.fee_exempt === true,
      path,
      removed: repaired.removed,
      booking_status: booking?.status || '',
    }
    console.log(JSON.stringify(row))

    if (!apply) continue
    const backupPath = `${path}.bak-before-contents-repair`
    const backup = await admin.storage.from('tenancy-documents').upload(backupPath, bytes, {
      contentType: 'application/pdf',
      upsert: false,
    })
    if (backup.error && !/already exists/i.test(backup.error.message)) {
      console.error(`BACKUP FAILED ${path}`, backup.error.message)
      continue
    }
    const uploaded = await admin.storage.from('tenancy-documents').upload(path, repaired.bytes, {
      contentType: 'application/pdf',
      upsert: true,
    })
    if (uploaded.error) {
      console.error(`WRITE FAILED ${path}`, uploaded.error.message)
      continue
    }
    const check = qpdfCheckBytes(repaired.bytes)
    console.log(`APPLIED ${path} qpdf_ok=${check.ok} qpdf_available=${check.available}`)
  }
}

console.log(`dirty files: ${dirty}`)
if (!apply) console.log('dry-run only. Re-run with --apply to write backups and repaired files.')
