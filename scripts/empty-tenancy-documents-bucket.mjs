/**
 * One-off: delete every object under the private storage bucket `tenancy-documents`.
 *
 * Requires SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.
 * Run: node scripts/run-with-env.mjs node scripts/empty-tenancy-documents-bucket.mjs
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BUCKET = 'tenancy-documents'
const LIST_LIMIT = 1000
const REMOVE_BATCH = 100

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const rel of ['.env.vercel', '.env.local']) {
  const p = path.join(root, rel)
  if (fs.existsSync(p)) dotenv.config({ path: p, override: rel === '.env.local' })
}

function supabaseUrl() {
  return (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim()
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} prefix
 * @returns {Promise<string[]>}
 */
async function collectFilePaths(admin, prefix) {
  const out = []
  let offset = 0
  for (;;) {
    const { data: items, error } = await admin.storage.from(BUCKET).list(prefix, {
      limit: LIST_LIMIT,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw error
    if (!items?.length) break

    for (const item of items) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) {
        const nested = await collectFilePaths(admin, fullPath)
        out.push(...nested)
      } else {
        out.push(fullPath)
      }
    }

    if (items.length < LIST_LIMIT) break
    offset += LIST_LIMIT
  }
  return out
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string[]} paths
 */
async function removeBatches(admin, paths) {
  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const batch = paths.slice(i, i + REMOVE_BATCH)
    const { error } = await admin.storage.from(BUCKET).remove(batch)
    if (error) throw error
  }
}

async function main() {
  const url = supabaseUrl()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY.')
    console.error('Tip: node scripts/run-with-env.mjs node scripts/empty-tenancy-documents-bucket.mjs')
    process.exit(1)
  }

  const admin = createClient(url, key)
  console.log(`Bucket: ${BUCKET}`)
  console.log(`Listing all objects (recursive)…`)

  const paths = await collectFilePaths(admin, '')
  console.log(`Found ${paths.length} object(s).`)

  if (paths.length === 0) {
    console.log('Nothing to delete.')
    return
  }

  for (const p of paths) {
    console.log(`  delete: ${p}`)
  }

  await removeBatches(admin, paths)
  console.log(`Removed ${paths.length} object(s) from ${BUCKET}.`)

  const verify = await collectFilePaths(admin, '')
  if (verify.length > 0) {
    console.error(`Verify failed: still ${verify.length} object(s) listed.`)
    process.exit(1)
  }
  console.log('Verify: bucket listing is empty (no file objects).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
