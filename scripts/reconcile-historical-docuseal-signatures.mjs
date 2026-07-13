/**
 * One-off: pull DocuSeal signature times into tenancy_documents + booking_events
 * for submissions that predate the webhook fix (129, 133, 135 + unsigned peers).
 *
 * Usage:
 *   node scripts/run-with-env.mjs npx tsx scripts/reconcile-historical-docuseal-signatures.mjs
 *   node scripts/run-with-env.mjs npx tsx scripts/reconcile-historical-docuseal-signatures.mjs --dry-run
 *   node scripts/run-with-env.mjs npx tsx scripts/reconcile-historical-docuseal-signatures.mjs --ids=129,133,135
 *
 * Signatures only — does not reinstate expired/cancelled bookings.
 * occurred_at on signature events = DocuSeal completed_at (not reconcile time).
 */
import { createClient } from '@supabase/supabase-js'
import {
  discoverUnsignedLeaseSubmissionIds,
  HISTORICAL_DOCUSEAL_SUBMISSION_IDS,
  reconcileHistoricalDocusealSignatures,
} from '../api/lib/docuseal/historicalSignatureReconcile.ts'

const dryRun = process.argv.includes('--dry-run')
const idsArg = process.argv.find((a) => a.startsWith('--ids='))
const explicitIds = idsArg
  ? idsArg
      .slice('--ids='.length)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : null

const url = (process.env.SUPABASE_URL || '').trim()
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, key)

const seed = explicitIds ?? [...HISTORICAL_DOCUSEAL_SUBMISSION_IDS]
const peers = explicitIds ? [] : await discoverUnsignedLeaseSubmissionIds(admin, 50)
const submissionIds = [...new Set([...seed, ...peers])]

console.log(
  JSON.stringify(
    {
      dryRun,
      submissionIds,
      note: 'Signatures only; booking status not reinstated. Use npx tsx to run.',
    },
    null,
    2,
  ),
)

const results = await reconcileHistoricalDocusealSignatures({
  admin,
  submissionIds,
  dryRun,
  actorLabel: 'historical_docuseal_signature_reconcile',
})

console.log(JSON.stringify({ results }, null, 2))

const failed = results.filter((r) => !r.ok)
process.exit(failed.length ? 1 : 0)
