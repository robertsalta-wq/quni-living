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
 *
 * --resend, only together with --apply, emails our fully-signed copy once to each
 * party after that repair and a clean qpdf --check. It uses a fresh 7-day storage
 * link and sendBookingEmail, so a later webhook retry will not send it again.
 * Skip a submission with --exclude <id> (repeat the flag, or pass a comma list).
 *
 *   node scripts/run-with-env.mjs npx tsx scripts/repair-signed-pdf-contents.mjs --apply --resend --exclude 174
 */
import dotenv from 'dotenv'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { fetchCoTenantSignerForBooking } from '../api/lib/booking/coTenantSigning.js'
import {
  fullySignedAgreementSubject,
  sendFullySignedAgreementEmails,
} from '../api/lib/booking/sendFullySignedAgreementEmail.ts'
import { qpdfCheckBytes, repairPdfContents } from '../api/lib/documents/repairPdfContents.ts'

const root = process.cwd()
const envFile = ['.env.vercel.production', '.env.vercel', '.env.local'].find((name) =>
  fs.existsSync(`${root}/${name}`),
)
if (envFile) dotenv.config({ path: `${root}/${envFile}` })

const apply = process.argv.includes('--apply')
const resend = process.argv.includes('--resend')

function excludedSubmissionIds(argv) {
  const ids = new Set()
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--exclude') {
      const value = argv[i + 1]
      if (value && !value.startsWith('--')) {
        for (const part of value.split(',')) {
          const id = part.trim()
          if (id) ids.add(id)
        }
        i += 1
      }
      continue
    }
    if (arg.startsWith('--exclude=')) {
      for (const part of arg.slice('--exclude='.length).split(',')) {
        const id = part.trim()
        if (id) ids.add(id)
      }
    }
  }
  return ids
}

const exclude = excludedSubmissionIds(process.argv)

function displayName(row, fallback) {
  const joined = [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim()
  if (joined) return joined
  if (typeof row?.full_name === 'string' && row.full_name.trim()) return row.full_name.trim()
  return fallback
}

function preferredCopyPath(paths) {
  return paths.find((path) => !String(path).includes('addendum')) || paths[0]
}
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
    'id, tenancy_id, document_type, status, file_path, metadata, docuseal_submission_id, tenancies ( booking_id, bookings ( id, lease_length, status, landlord_id, student_id, properties ( address, suburb ), landlord_profiles ( full_name, first_name, last_name, email, fee_exempt ), student_profiles ( full_name, first_name, last_name, email ) ) )',
  )
  .in('status', ['signed', 'archived'])

if (error) {
  console.error(error.message)
  process.exit(1)
}

console.log(
  `env: ${envFile || 'process'}  mode: ${apply ? 'APPLY' : 'dry-run'}${resend ? ' +resend' : ''}  documents: ${(docs ?? []).length}`,
)

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
  const repairedClean = []
  let repairBlocked = false
  let docDirty = 0

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
    docDirty += 1
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
      repairBlocked = true
      continue
    }
    const uploaded = await admin.storage.from('tenancy-documents').upload(path, repaired.bytes, {
      contentType: 'application/pdf',
      upsert: true,
    })
    if (uploaded.error) {
      console.error(`WRITE FAILED ${path}`, uploaded.error.message)
      repairBlocked = true
      continue
    }
    const check = qpdfCheckBytes(repaired.bytes)
    console.log(`APPLIED ${path} qpdf_ok=${check.ok} qpdf_available=${check.available}`)
    if (check.available && check.ok) repairedClean.push(path)
    else repairBlocked = true
  }

  if (!resend || docDirty === 0) continue
  const submission = String(doc.docuseal_submission_id || '')
  if (!apply) {
    console.log(`RESEND SKIPPED ${submission} dry-run does not replace the stored file`)
    continue
  }
  if (exclude.has(submission)) {
    console.log(`RESEND EXCLUDED ${submission}`)
    continue
  }
  if (repairBlocked || repairedClean.length === 0) {
    console.log(`RESEND SKIPPED ${submission} repair or qpdf --check was not clean`)
    continue
  }
  const bookingId = booking?.id || tenancy?.booking_id || ''
  if (!bookingId) {
    console.error(`RESEND SKIPPED ${submission} booking missing`)
    continue
  }
  const copyPath = preferredCopyPath(repairedClean)
  const signed = await admin.storage.from('tenancy-documents').createSignedUrl(copyPath, 60 * 60 * 24 * 7)
  const downloadUrl = signed.data?.signedUrl || ''
  if (!downloadUrl) {
    console.error(`RESEND SKIPPED ${submission} could not create a storage link`)
    continue
  }
  const signingPackage = typeof meta.signing_package === 'string' ? meta.signing_package : ''
  const residential =
    doc.document_type === 'residential_tenancy' || signingPackage.startsWith('residential_tenancy')
  let coTenant = null
  if (residential) {
    const co = await fetchCoTenantSignerForBooking(admin, bookingId)
    if (co?.email) coTenant = { email: co.email, name: co.name }
  }
  try {
    const result = await sendFullySignedAgreementEmails(admin, {
      bookingId,
      submissionId: submission,
      downloadUrl,
      subject: fullySignedAgreementSubject({
        isResidentialTenancyPackage: residential,
        isVicResidentialPackage: signingPackage === 'residential_tenancy_vic',
        isQldResidentialPackage: signingPackage === 'residential_tenancy_qld',
      }),
      downloadLabel: residential
        ? 'Download signed agreement package (7-day link)'
        : 'Download signed lease (7-day link)',
      landlord: {
        email: typeof landlord?.email === 'string' ? landlord.email : '',
        name: displayName(landlord, 'Landlord'),
      },
      renter: {
        email: typeof student?.email === 'string' ? student.email : '',
        name: displayName(student, 'Tenant'),
      },
      coTenant,
      landlordId: booking?.landlord_id || null,
      studentId: booking?.student_id || null,
      actorType: 'system',
      actorLabel: 'repair-signed-pdf-contents',
    })
    console.log(`RESEND ${submission} path=${copyPath} sent=${result.sent.join(',') || '-'} skipped=${result.skipped.join(',') || '-'}`)
  } catch (err) {
    console.error(`RESEND FAILED ${submission}`, err instanceof Error ? err.message : String(err))
  }
}

console.log(`dirty files: ${dirty}`)
if (!apply) console.log('dry-run only. Re-run with --apply to write backups and repaired files.')
if (resend && !apply) console.log('--resend was not sent. It only runs after --apply writes a repaired file that passes qpdf --check.')
