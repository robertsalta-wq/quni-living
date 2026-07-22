/**
 * Cancel a disposable smoke booking so the property is no longer reserved.
 * Usage: SMOKE_CONFIRM_PROD_WRITE=1 node scripts/run-with-env.mjs node scripts/smoke-terms-signing-teardown.mjs <bookingId>
 */
import { createAdmin, envFlag, loadBookingBundle, smokeTagForToday, writeArtifact } from './smoke-terms-signing-lib.mjs'

const bookingId = (process.argv[2] || '').trim()
if (!bookingId) {
  console.error('Usage: smoke-terms-signing-teardown.mjs <bookingId>')
  process.exit(1)
}
if (!envFlag('SMOKE_CONFIRM_PROD_WRITE')) {
  console.error('Requires SMOKE_CONFIRM_PROD_WRITE=1')
  process.exit(1)
}

const admin = createAdmin()
const bundle = await loadBookingBundle(admin, bookingId)
const notes = String(bundle.booking.notes || '')
if (!notes.includes('[SMOKE three-party')) {
  console.error('Refusing teardown: booking notes are not smoke-tagged')
  process.exit(1)
}

const { error } = await admin
  .from('bookings')
  .update({
    status: 'cancelled',
    notes: `${notes} | cancelled after smoke ${smokeTagForToday()}`,
  })
  .eq('id', bookingId)

if (error) {
  console.error(error)
  process.exit(1)
}

const report = {
  phase: 'teardown',
  ranAt: new Date().toISOString(),
  bookingId,
  previousStatus: bundle.booking.status,
  newStatus: 'cancelled',
}
writeArtifact(`teardown-${bookingId}.json`, report)
console.log(JSON.stringify(report, null, 2))
