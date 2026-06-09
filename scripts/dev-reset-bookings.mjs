/**
 * Dev-only: reset test bookings and related tenancy rows (scoped by explicit booking ids).
 *
 * The SQL helper `dev_reset_bookings` is created at run time and dropped on exit — it is
 * NOT shipped via supabase/migrations.
 *
 * Usage:
 *   node scripts/run-with-env.mjs node scripts/dev-reset-bookings.mjs \
 *     --booking-ids <uuid>[,<uuid>...] [--storage] [--execute]
 *
 *   node scripts/run-with-env.mjs node scripts/dev-reset-bookings.mjs \
 *     --storage-only --storage-paths <path>[,<path>...]
 *
 * Defaults to dry-run (preview counts only). Pass --execute to apply DB deletes, then
 * --storage to remove collected Storage objects after the DB RPC returns a confirmed result.
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const BUCKET = 'tenancy-documents'
const REMOVE_BATCH = 100
const METADATA_PATH_KEYS = [
  'addendum_file_path',
  'signed_rta_file_path',
  'signed_addendum_file_path',
]

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const rel of ['.env.vercel', '.env.local']) {
  const p = path.join(root, rel)
  if (fs.existsSync(p)) dotenv.config({ path: p, override: rel === '.env.local' })
}

const sqlDir = path.join(root, 'scripts', 'sql')

function supabaseUrl() {
  return (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim()
}

function parseArgs(argv) {
  let bookingIds = []
  let storagePaths = []
  let execute = false
  let storage = false
  let storageOnly = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--execute') {
      execute = true
    } else if (arg === '--storage') {
      storage = true
    } else if (arg === '--storage-only') {
      storageOnly = true
    } else if (arg === '--booking-ids') {
      const raw = argv[i + 1]
      if (!raw) throw new Error('--booking-ids requires a comma-separated uuid list')
      bookingIds = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      i += 1
    } else if (arg === '--storage-paths') {
      const raw = argv[i + 1]
      if (!raw) throw new Error('--storage-paths requires a comma-separated path list')
      storagePaths = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      i += 1
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (storageOnly) {
    if (storagePaths.length === 0) {
      throw new Error('--storage-only requires --storage-paths')
    }
    return { bookingIds: [], storagePaths, execute: true, storage: true, storageOnly }
  }

  if (bookingIds.length === 0) {
    throw new Error('--booking-ids is required (comma-separated uuids)')
  }

  for (const id of bookingIds) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new Error(`Invalid booking uuid: ${id}`)
    }
  }

  return { bookingIds, storagePaths, execute, storage, storageOnly: false }
}

function printHelp() {
  console.log(`Usage:
  node scripts/run-with-env.mjs node scripts/dev-reset-bookings.mjs \\
    --booking-ids <uuid>[,<uuid>...] [--storage] [--execute]

Options:
  --booking-ids     Explicit booking ids to reset (no wider filter).
  --execute         Apply DB deletes (default: dry-run preview only).
  --storage         After confirmed DB RPC result, remove collected Storage paths
                    (preview listed on dry-run too).
  --storage-only    Skip DB; remove explicit Storage paths only (orphan cleanup).
  --storage-paths   Comma-separated bucket paths (required with --storage-only).
`)
}

/**
 * @param {string} fileName
 * @returns {string}
 */
function readSqlFile(fileName) {
  return fs.readFileSync(path.join(sqlDir, fileName), 'utf8')
}

/**
 * @param {string} sql
 * @returns {unknown[]}
 */
function runLinkedSql(sql) {
  const tmpFile = path.join(os.tmpdir(), `quni-dev-reset-${Date.now()}-${Math.random().toString(36).slice(2)}.sql`)
  fs.writeFileSync(tmpFile, sql, 'utf8')
  try {
    const result = spawnSync(
      'npx',
      ['supabase', 'db', 'query', '--linked', '-o', 'json', '-f', tmpFile],
      {
        cwd: root,
        encoding: 'utf8',
        shell: process.platform === 'win32',
      },
    )

    if (result.status !== 0) {
      const msg = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
      throw new Error(msg || `supabase db query failed (exit ${result.status})`)
    }

    const raw = (result.stdout || '').trim()
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.rows) ? parsed.rows : []
  } finally {
    try {
      fs.unlinkSync(tmpFile)
    } catch {
      // ignore temp cleanup failures
    }
  }
}

function installDevResetFunction() {
  runLinkedSql(readSqlFile('dev-reset-bookings.sql'))
}

function dropDevResetFunction() {
  try {
    runLinkedSql(readSqlFile('dev-reset-bookings-drop.sql'))
  } catch (err) {
    console.warn('[dev-reset-bookings] warning: could not drop dev_reset_bookings:', err.message)
  }
}

/**
 * @param {unknown} data
 * @param {boolean} expectedDryRun
 * @returns {{ dry_run: boolean, booking_ids: string[], counts: Record<string, number> }}
 */
function parseDevResetResult(data, expectedDryRun) {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('dev_reset_bookings returned no result')
  }

  const result = /** @type {Record<string, unknown>} */ (data)
  if (typeof result.dry_run !== 'boolean') {
    throw new Error('dev_reset_bookings result missing dry_run flag')
  }
  if (result.dry_run !== expectedDryRun) {
    throw new Error(
      `dev_reset_bookings dry_run mismatch: expected ${expectedDryRun}, got ${result.dry_run}`,
    )
  }
  if (!result.counts || typeof result.counts !== 'object' || Array.isArray(result.counts)) {
    throw new Error('dev_reset_bookings result missing counts')
  }

  return /** @type {{ dry_run: boolean, booking_ids: string[], counts: Record<string, number> }} */ (
    result
  )
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string[]} bookingIds
 * @param {boolean} dryRun
 */
async function callDevResetBookings(admin, bookingIds, dryRun) {
  const { data, error } = await admin.rpc('dev_reset_bookings', {
    p_booking_ids: bookingIds,
    p_dry_run: dryRun,
  })

  if (error) {
    throw new Error(`dev_reset_bookings RPC failed: ${error.message}`)
  }

  return parseDevResetResult(data, dryRun)
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function pathFromValue(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * @param {unknown} metadata
 * @returns {string[]}
 */
function pathsFromMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return []
  /** @type {string[]} */
  const out = []
  for (const key of METADATA_PATH_KEYS) {
    const p = pathFromValue(/** @type {Record<string, unknown>} */ (metadata)[key])
    if (p) out.push(p)
  }
  return out
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} prefix
 * @returns {Promise<string[]>}
 */
async function collectBucketPaths(admin, prefix) {
  const out = []
  let offset = 0
  const limit = 1000
  for (;;) {
    const { data: items, error } = await admin.storage.from(BUCKET).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw error
    if (!items?.length) break

    for (const item of items) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) {
        const nested = await collectBucketPaths(admin, fullPath)
        out.push(...nested)
      } else {
        out.push(fullPath)
      }
    }

    if (items.length < limit) break
    offset += limit
  }
  return out
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string[]} bookingIds
 * @returns {Promise<{ paths: string[], tenancyIds: string[] }>}
 */
async function collectStoragePaths(admin, bookingIds) {
  const { data: tenancies, error: tErr } = await admin
    .from('tenancies')
    .select('id')
    .in('booking_id', bookingIds)

  if (tErr) throw tErr

  const tenancyIds = (tenancies ?? []).map((t) => t.id)
  /** @type {Set<string>} */
  const paths = new Set()

  if (tenancyIds.length > 0) {
    const { data: docs, error: dErr } = await admin
      .from('tenancy_documents')
      .select('file_path, metadata')
      .in('tenancy_id', tenancyIds)

    if (dErr) throw dErr

    for (const doc of docs ?? []) {
      const primary = pathFromValue(doc.file_path)
      if (primary) paths.add(primary)
      for (const p of pathsFromMetadata(doc.metadata)) paths.add(p)
    }

    for (const tenancyId of tenancyIds) {
      const listed = await collectBucketPaths(admin, tenancyId)
      for (const p of listed) paths.add(p)
    }
  }

  return { paths: [...paths].sort(), tenancyIds }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string[]} bookingIds
 */
async function warnStripePaymentIntents(admin, bookingIds) {
  const { data: bookings, error } = await admin
    .from('bookings')
    .select('id, status, stripe_payment_intent_id, stripe_subscription_id, listing_fee_stripe_payment_intent_id')
    .in('id', bookingIds)

  if (error) throw error

  console.log('\nStripe (warn only — not cancelled by this script):')
  for (const b of bookings ?? []) {
    const bits = []
    if (pathFromValue(b.stripe_payment_intent_id)) bits.push(`deposit PI ${b.stripe_payment_intent_id}`)
    if (pathFromValue(b.listing_fee_stripe_payment_intent_id)) {
      bits.push(`listing fee PI ${b.listing_fee_stripe_payment_intent_id}`)
    }
    if (pathFromValue(b.stripe_subscription_id)) bits.push(`subscription ${b.stripe_subscription_id}`)
    console.log(
      `  ${b.id} [${b.status}]: ${bits.length > 0 ? bits.join('; ') : '(no Stripe ids on row)'}`,
    )
  }
}

/**
 * @param {Record<string, number>} counts
 */
function printCounts(counts) {
  console.log('\nRows that would be / were deleted:')
  const order = [
    'qase_messages',
    'qase_tickets',
    'tenancy_documents',
    'tenancies',
    'service_tier_events',
    'payments',
    'ai_matching_compliance_audit',
    'booking_messages',
    'bonds',
    'bookings',
  ]
  for (const key of order) {
    if (counts[key] != null) console.log(`  ${key}: ${counts[key]}`)
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string[]} paths
 */
async function removeStoragePaths(admin, paths) {
  if (paths.length === 0) {
    console.log('\nStorage: nothing to remove.')
    return
  }

  console.log('\nStorage removals:')
  for (const p of paths) console.log(`  remove: ${p}`)

  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const batch = paths.slice(i, i + REMOVE_BATCH)
    const { error } = await admin.storage.from(BUCKET).remove(batch)
    if (error) throw error
  }

  console.log(`Storage: removed ${paths.length} object(s) from ${BUCKET}.`)
}

async function main() {
  const { bookingIds, storagePaths: explicitStoragePaths, execute, storage, storageOnly } =
    parseArgs(process.argv.slice(2))

  const url = supabaseUrl()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY.')
    console.error('Tip: node scripts/run-with-env.mjs node scripts/dev-reset-bookings.mjs ...')
    process.exit(1)
  }

  const admin = createClient(url, key)

  if (storageOnly) {
    console.log('Mode: STORAGE-ONLY (orphan cleanup)')
    console.log(`Storage paths (${explicitStoragePaths.length}):`)
    for (const p of explicitStoragePaths) console.log(`  path: ${p}`)
    await removeStoragePaths(admin, explicitStoragePaths)
    return
  }

  let functionInstalled = false

  try {
    console.log(`Mode: ${execute ? 'EXECUTE' : 'DRY-RUN'}`)
    console.log(`Booking ids (${bookingIds.length}): ${bookingIds.join(', ')}`)

    installDevResetFunction()
    functionInstalled = true

    await warnStripePaymentIntents(admin, bookingIds)

    const { paths: storagePaths, tenancyIds } = await collectStoragePaths(admin, bookingIds)
    console.log(`\nTenancy ids in scope: ${tenancyIds.length > 0 ? tenancyIds.join(', ') : '(none)'}`)
    console.log(`Storage paths collected: ${storagePaths.length}`)
    for (const p of storagePaths) console.log(`  path: ${p}`)

    const result = await callDevResetBookings(admin, bookingIds, !execute)
    printCounts(result.counts ?? {})

    if (!execute) {
      console.log('\nDry-run complete. Re-run with --execute to apply DB deletes.')
      if (storage) {
        console.log('With --execute --storage, DB deletes run first, then Storage paths above are removed.')
      }
      return
    }

    if (result.dry_run !== false) {
      throw new Error('Refusing storage cleanup: DB execute did not return dry_run=false')
    }

    console.log('\nDB reset confirmed via dev_reset_bookings RPC (dry_run=false).')

    if (storage) {
      await removeStoragePaths(admin, storagePaths)
    } else {
      console.log('\nStorage: skipped (pass --storage to remove collected paths after DB delete).')
      if (storagePaths.length > 0) {
        console.warn(
          `Warning: ${storagePaths.length} Storage object(s) may now be orphaned (DB rows deleted).`,
        )
      }
    }
  } finally {
    if (functionInstalled) dropDevResetFunction()
  }
}

main().catch((err) => {
  console.error('\n[dev-reset-bookings] failed:', err.message || err)
  process.exit(1)
})
