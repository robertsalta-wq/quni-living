/**
 * Booking-bound three-party signing smoke — VERIFY (read-only)
 *
 * Exit 0 only when tenancy_documents is cleanly fully signed via webhooks:
 *   status=signed + landlord_signed_at + student_signed_at + co_tenant_signed_at
 * and booking_events includes document.fully_signed.
 *
 * Never reconciles. On failure prints diagnosis and refuses patch advice beyond "fix the webhook path".
 *
 * Usage:
 *   node scripts/run-with-env.mjs node scripts/smoke-terms-signing-verify.mjs <bookingId>
 */
import {
  bookingHasCoTenantSigner,
  classifySubmitterRole,
  createAdmin,
  fetchDocusealSubmission,
  loadBookingBundle,
  loadRecentBookingEvents,
  writeArtifact,
} from './smoke-terms-signing-lib.mjs'

const bookingId = (process.argv[2] || process.env.BOOKING_ID || '').trim()
if (!bookingId) {
  console.error('Usage: smoke-terms-signing-verify.mjs <bookingId>')
  process.exit(1)
}

const admin = createAdmin()
const bundle = await loadBookingBundle(admin, bookingId)
const doc = bundle.doc
const events = await loadRecentBookingEvents(admin, bookingId, 40)

const coRequired = bookingHasCoTenantSigner(bundle.booking)

const checks = {
  hasTenancyDocument: Boolean(doc),
  statusSigned: doc?.status === 'signed',
  landlordSignedAt: Boolean(doc?.landlord_signed_at),
  studentSignedAt: Boolean(doc?.student_signed_at),
  coTenantRequired: coRequired,
  coTenantSignedAt: Boolean(doc?.co_tenant_signed_at),
  fullySignedEvent: events.some((e) => e.event_type === 'document.fully_signed'),
  signatureRecordedEvents: events.filter((e) => e.event_type === 'document.signature_recorded').length,
}

let docuseal = null
let submitterRoles = []
if (doc?.docuseal_submission_id) {
  try {
    docuseal = await fetchDocusealSubmission(doc.docuseal_submission_id)
    submitterRoles = (docuseal.submitters ?? []).map((s) => ({
      id: s.id,
      role: s.role,
      party: classifySubmitterRole(s.role),
      email: s.email,
      status: s.status,
      completed_at: s.completed_at ?? null,
    }))
  } catch (e) {
    docuseal = { error: e instanceof Error ? e.message : String(e) }
  }
}

// This smoke always requires a co-tenant party — landlord+student alone is not a pass.
const pass =
  checks.hasTenancyDocument &&
  checks.statusSigned &&
  checks.landlordSignedAt &&
  checks.studentSignedAt &&
  checks.coTenantRequired &&
  checks.coTenantSignedAt &&
  checks.fullySignedEvent

const failures = []
if (!checks.hasTenancyDocument) failures.push('no_tenancy_document')
if (!checks.statusSigned) failures.push(`status_not_signed:${doc?.status ?? 'null'}`)
if (!checks.landlordSignedAt) failures.push('landlord_signed_at_null')
if (!checks.studentSignedAt) failures.push('student_signed_at_null')
if (!checks.coTenantRequired) failures.push('co_tenant_not_required_on_booking_fix_terms_first')
if (checks.coTenantRequired && !checks.coTenantSignedAt) failures.push('co_tenant_signed_at_null')
if (!checks.fullySignedEvent) failures.push('missing_booking_events_document.fully_signed')

const report = {
  phase: 'verify',
  ranAt: new Date().toISOString(),
  bookingId,
  bookingStatus: bundle.booking.status,
  coTenantOnBooking: bundle.booking.co_tenant,
  occupantCount: bundle.booking.occupant_count,
  tenancyDocument: doc
    ? {
        id: doc.id,
        status: doc.status,
        document_type: doc.document_type,
        docuseal_submission_id: doc.docuseal_submission_id,
        landlord_signed_at: doc.landlord_signed_at,
        student_signed_at: doc.student_signed_at,
        co_tenant_signed_at: doc.co_tenant_signed_at,
        signing_package: doc.metadata?.signing_package ?? null,
        updated_at: doc.updated_at,
      }
    : null,
  checks,
  failures: pass ? [] : failures,
  recentEvents: events.slice(0, 15).map((e) => ({
    event_type: e.event_type,
    occurred_at: e.occurred_at,
    outcome: e.outcome,
    document_id: e.document_id,
  })),
  docusealSubmitters: submitterRoles,
  pass,
  refuse: pass
    ? null
    : 'DO NOT run reconcile-historical-docuseal-signatures or manually patch *_signed_at. Fix webhook / co-tenant path, then re-sign on a fresh regenerate.',
}

const out = writeArtifact(`verify-${bookingId}-${pass ? 'PASS' : 'FAIL'}.json`, report)
console.log(JSON.stringify(report, null, 2))
console.error(`\nWrote ${out}`)

if (!pass) {
  console.error('\nVERIFY FAILED — see failures[]. Refusing reconcile.')
  process.exit(1)
}

console.error('\nVERIFY PASSED — clean fully signed via webhooks (no reconcile).')
process.exit(0)
