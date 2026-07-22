/**
 * Booking-bound three-party signing smoke — SETUP
 *
 * Product path: booking-update-terms (add co-tenant) → booking-regenerate-listing-agreement
 * → print three wrapped sign links. Does NOT complete signatures.
 *
 * Usage:
 *   node scripts/run-with-env.mjs node scripts/smoke-terms-signing-setup.mjs
 *
 * Env:
 *   BOOKING_ID                     — existing unsigned Listing bond_pending booking
 *   SMOKE_CREATE_BOOKING=1         — create disposable booking (needs profile/property ids)
 *   SMOKE_PROPERTY_ID / SMOKE_STUDENT_PROFILE_ID / SMOKE_LANDLORD_PROFILE_ID
 *   SMOKE_DISCOVER=1               — print Rob/landlord NSW candidates; no writes
 *   SMOKE_CONFIRM_PROD_WRITE=1     — required for any prod mutation (terms / regenerate / create)
 *   LANDLORD_ACCESS_TOKEN or SMOKE_LANDLORD_EMAIL + SMOKE_LANDLORD_PASSWORD
 *   SMOKE_CO_TENANT_EMAIL / NAME / PHONE / DOB
 *   SMOKE_SKIP_TERMS_PATCH=1       — skip terms API if co-tenant already present
 *   SMOKE_SKIP_REGENERATE=1        — skip regenerate; only mint links for current submission
 *
 * Hard rule: if co-tenant submitter is missing after regenerate, exit non-zero — do not reconcile.
 */
import {
  assertListingNswResidentialEligible,
  assertRegeneratable,
  bookingHasCoTenantSigner,
  classifySubmitterRole,
  createAdmin,
  createDisposableSmokeBooking,
  defaultSmokeCoTenant,
  discoverNswListingProperties,
  envFlag,
  fetchDocusealSubmission,
  loadBookingBundle,
  mintWrappedLinks,
  parseCoTenant,
  postJson,
  resolveLandlordAccessToken,
  smokeTagForToday,
  writeArtifact,
} from './smoke-terms-signing-lib.mjs'

function usageExit(msg) {
  if (msg) console.error(msg)
  console.error(`
Usage (discover):
  node scripts/run-with-env.mjs node scripts/smoke-terms-signing-setup.mjs
  SMOKE_DISCOVER=1 SMOKE_LANDLORD_PROFILE_ID=<uuid>

Usage (bind existing):
  SMOKE_CONFIRM_PROD_WRITE=1 BOOKING_ID=<uuid> \\
    LANDLORD_ACCESS_TOKEN=<jwt> \\
    node scripts/run-with-env.mjs node scripts/smoke-terms-signing-setup.mjs

Usage (create disposable):
  SMOKE_CONFIRM_PROD_WRITE=1 SMOKE_CREATE_BOOKING=1 \\
    SMOKE_PROPERTY_ID=... SMOKE_STUDENT_PROFILE_ID=... SMOKE_LANDLORD_PROFILE_ID=... \\
    LANDLORD_ACCESS_TOKEN=<jwt> \\
    node scripts/run-with-env.mjs node scripts/smoke-terms-signing-setup.mjs
`)
  process.exit(1)
}

async function discover(admin) {
  const landlordId = (process.env.SMOKE_LANDLORD_PROFILE_ID || '').trim()
  if (!landlordId) {
    usageExit('SMOKE_DISCOVER=1 requires SMOKE_LANDLORD_PROFILE_ID')
  }

  const props = await discoverNswListingProperties(admin, landlordId)
  const { data: openBookings } = await admin
    .from('bookings')
    .select(
      'id, status, service_tier_final, property_id, notes, occupant_count, co_tenant, student_id',
    )
    .eq('landlord_id', landlordId)
    .eq('service_tier_final', 'listing')
    .in('status', ['pending_confirmation', 'awaiting_info', 'bond_pending'])
    .order('created_at', { ascending: false })
    .limit(20)

  const report = {
    phase: 'discover',
    ranAt: new Date().toISOString(),
    landlordProfileId: landlordId,
    nswListingPropertyCandidates: props,
    openListingBookings: (openBookings ?? []).map((b) => ({
      ...b,
      hasCoTenantSigner: bookingHasCoTenantSigner(b),
      smokeTagged: typeof b.notes === 'string' && b.notes.includes('[SMOKE three-party'),
    })),
    next: [
      'Pick a NSW non-rooming property (or an unsigned bond_pending booking).',
      'Re-run with SMOKE_CONFIRM_PROD_WRITE=1 and BOOKING_ID or SMOKE_CREATE_BOOKING=1.',
    ],
  }
  const pathOut = writeArtifact(`discover-${landlordId.slice(0, 8)}.json`, report)
  console.log(JSON.stringify(report, null, 2))
  console.error(`\nWrote ${pathOut}`)
}

async function ensureCoTenantViaProductApi(booking, studentEmail, landlordToken) {
  if (envFlag('SMOKE_SKIP_TERMS_PATCH') && bookingHasCoTenantSigner(booking)) {
    return { skipped: true, reason: 'already_present' }
  }

  const co = defaultSmokeCoTenant(studentEmail)
  const tag = smokeTagForToday()
  const patch = {
    occupant_count: Math.max(2, Math.floor(Number(booking.occupant_count)) || 2),
    co_tenant: co,
    notes: `${tag} co-tenant attached for webhook smoke`,
  }

  const res = await postJson(
    '/api/booking-update-terms',
    {
      bookingId: booking.id,
      patch,
      reason: `${tag} attach co-tenant for three-party signing smoke`,
    },
    landlordToken,
  )

  if (!res.ok) {
    throw new Error(`booking-update-terms failed (${res.status}): ${JSON.stringify(res.json)}`)
  }
  return { skipped: false, patch, response: res.json }
}

async function regenerateViaProductApi(bookingId, landlordToken) {
  if (envFlag('SMOKE_SKIP_REGENERATE')) {
    return { skipped: true }
  }
  const res = await postJson(
    '/api/booking-regenerate-listing-agreement',
    { bookingId },
    landlordToken,
  )
  if (!res.ok) {
    throw new Error(
      `booking-regenerate-listing-agreement failed (${res.status}): ${JSON.stringify(res.json)}`,
    )
  }
  return { skipped: false, response: res.json }
}

async function buildSignLinks(doc) {
  const submissionId = doc?.docuseal_submission_id
  if (!submissionId) {
    throw new Error('No docuseal_submission_id on tenancy document after regenerate')
  }

  const submission = await fetchDocusealSubmission(submissionId)
  const submitters = Array.isArray(submission?.submitters) ? submission.submitters : []
  const byParty = { landlord: null, tenant: null, co_tenant: null }
  for (const s of submitters) {
    const party = classifySubmitterRole(s.role)
    if (party !== 'unknown' && !byParty[party]) {
      byParty[party] = s
    }
  }

  if (!byParty.co_tenant) {
    const err = {
      error: 'co_tenant_submitter_missing',
      message:
        'DocuSeal submission has no Co-tenant submitter after regenerate. STOP — do not reconcile. Diagnose bookingRequiresCoTenantSignature / includeCoTenantSignatureTags / send path.',
      submissionId,
      roles: submitters.map((s) => ({ id: s.id, role: s.role, email: s.email, status: s.status })),
    }
    writeArtifact(`FAIL-co-tenant-missing-${submissionId}.json`, err)
    console.error(JSON.stringify(err, null, 2))
    process.exit(2)
  }

  const ids = [byParty.landlord, byParty.tenant, byParty.co_tenant]
    .map((s) => Number(s?.id))
    .filter((n) => Number.isFinite(n) && n > 0)

  const links = await mintWrappedLinks(ids)

  return {
    submissionId,
    submissionStatus: submission.status,
    parties: {
      landlord: {
        role: byParty.landlord.role,
        email: byParty.landlord.email,
        submitterId: byParty.landlord.id,
        wrapped_sign_url: links[String(byParty.landlord.id)] ?? null,
        instruction: 'Sign FIRST as landlord',
      },
      tenant: {
        role: byParty.tenant.role,
        email: byParty.tenant.email,
        submitterId: byParty.tenant.id,
        wrapped_sign_url: links[String(byParty.tenant.id)] ?? null,
        instruction: 'Sign SECOND as primary tenant',
      },
      co_tenant: {
        role: byParty.co_tenant.role,
        email: byParty.co_tenant.email,
        submitterId: byParty.co_tenant.id,
        wrapped_sign_url: links[String(byParty.co_tenant.id)] ?? null,
        instruction: 'Sign THIRD as co-tenant',
      },
    },
  }
}

async function main() {
  const admin = createAdmin()

  if (envFlag('SMOKE_DISCOVER')) {
    await discover(admin)
    return
  }

  const confirmWrite = envFlag('SMOKE_CONFIRM_PROD_WRITE')
  let bookingId = (process.env.BOOKING_ID || '').trim()

  if (envFlag('SMOKE_CREATE_BOOKING')) {
    if (!confirmWrite) {
      usageExit('Creating a booking requires SMOKE_CONFIRM_PROD_WRITE=1')
    }
    const propertyId = (process.env.SMOKE_PROPERTY_ID || '').trim()
    const studentProfileId = (process.env.SMOKE_STUDENT_PROFILE_ID || '').trim()
    const landlordProfileId = (process.env.SMOKE_LANDLORD_PROFILE_ID || '').trim()
    if (!propertyId || !studentProfileId || !landlordProfileId) {
      usageExit('SMOKE_CREATE_BOOKING needs SMOKE_PROPERTY_ID, SMOKE_STUDENT_PROFILE_ID, SMOKE_LANDLORD_PROFILE_ID')
    }
    const { data: propRow } = await admin
      .from('properties')
      .select('id, bond, bond_weeks, rent_per_week')
      .eq('id', propertyId)
      .maybeSingle()
    bookingId = await createDisposableSmokeBooking(admin, {
      propertyId,
      studentProfileId,
      landlordProfileId,
      weeklyRent: propRow?.rent_per_week != null ? Number(propRow.rent_per_week) : 350,
      bondAmount: propRow?.bond != null ? Number(propRow.bond) : 1400,
    })
    console.error(`Created disposable booking ${bookingId}`)
  }

  if (!bookingId) usageExit('BOOKING_ID required (or SMOKE_CREATE_BOOKING=1 / SMOKE_DISCOVER=1)')

  let bundle = await loadBookingBundle(admin, bookingId)
  assertListingNswResidentialEligible(bundle.booking)

  const termsNeeded = !bookingHasCoTenantSigner(bundle.booking)
  const willMutate =
    (termsNeeded && !envFlag('SMOKE_SKIP_TERMS_PATCH')) || !envFlag('SMOKE_SKIP_REGENERATE')

  if (willMutate && !confirmWrite) {
    const preview = {
      phase: 'preview',
      bookingId,
      status: bundle.booking.status,
      hasCoTenant: bookingHasCoTenantSigner(bundle.booking),
      docStatus: bundle.doc?.status ?? null,
      submissionId: bundle.doc?.docuseal_submission_id ?? null,
      would: {
        termsPatch: termsNeeded && !envFlag('SMOKE_SKIP_TERMS_PATCH'),
        regenerate: !envFlag('SMOKE_SKIP_REGENERATE'),
      },
      message: 'Re-run with SMOKE_CONFIRM_PROD_WRITE=1 to execute product POSTs against live prod.',
    }
    writeArtifact(`preview-${bookingId}.json`, preview)
    console.log(JSON.stringify(preview, null, 2))
    process.exit(0)
  }

  assertRegeneratable(bundle.booking, bundle.doc)

  const { data: landlordProfile } = await admin
    .from('landlord_profiles')
    .select('id, email')
    .eq('id', bundle.booking.landlord_id)
    .maybeSingle()

  const landlordToken = await resolveLandlordAccessToken(
    admin,
    (process.env.SMOKE_LANDLORD_EMAIL || landlordProfile?.email || '').trim() || undefined,
  )
  const studentEmail = bundle.student?.email ?? null

  const termsResult = await ensureCoTenantViaProductApi(bundle.booking, studentEmail, landlordToken)
  if (!termsResult.skipped) {
    bundle = await loadBookingBundle(admin, bookingId)
    if (!bookingHasCoTenantSigner(bundle.booking)) {
      throw new Error('co_tenant still missing after booking-update-terms — STOP')
    }
  }

  const oldSubmissionId = bundle.doc?.docuseal_submission_id ?? null
  const regenResult = await regenerateViaProductApi(bookingId, landlordToken)

  // Generation can take a few seconds; poll briefly for new submission id.
  for (let i = 0; i < 12; i++) {
    bundle = await loadBookingBundle(admin, bookingId)
    if (
      bundle.doc?.docuseal_submission_id &&
      (regenResult.skipped || bundle.doc.docuseal_submission_id !== oldSubmissionId)
    ) {
      break
    }
    await new Promise((r) => setTimeout(r, 2500))
  }

  if (!bundle.doc?.docuseal_submission_id) {
    throw new Error('No docuseal_submission_id after regenerate — STOP (do not reconcile)')
  }

  const signing = await buildSignLinks(bundle.doc)
  const co = parseCoTenant(bundle.booking.co_tenant)

  const report = {
    phase: 'setup',
    ranAt: new Date().toISOString(),
    smokeTag: smokeTagForToday(),
    bookingId,
    bookingStatus: bundle.booking.status,
    tenancyDocumentId: bundle.doc.id,
    documentStatus: bundle.doc.status,
    signingPackage: bundle.doc.metadata?.signing_package ?? null,
    oldSubmissionId,
    newSubmissionId: signing.submissionId,
    coTenant: co,
    termsResult,
    regenResult,
    signingLinks: signing.parties,
    humanChecklist: [
      'Confirm DocuSeal webhook: https://quni.com.au/api/webhooks/docuseal (form.completed + submission.completed).',
      'Open landlord wrapped_sign_url → sign.',
      'Open tenant wrapped_sign_url → sign.',
      'Open co_tenant wrapped_sign_url → sign.',
      `Then: node scripts/run-with-env.mjs node scripts/smoke-terms-signing-verify.mjs ${bookingId}`,
      'On failure: STOP — do not run reconcile scripts or patch timestamps.',
      'After pass: cancel/tear down this smoke booking.',
    ],
  }

  const out = writeArtifact(`setup-${bookingId}.json`, report)
  console.log(JSON.stringify(report, null, 2))
  console.error(`\nWrote ${out}`)
  console.error('\nSign in order: landlord → tenant → co_tenant, then run verify.')
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : e)
  process.exit(1)
})
