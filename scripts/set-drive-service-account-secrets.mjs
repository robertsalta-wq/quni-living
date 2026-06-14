#!/usr/bin/env node
/**
 * Upload Google service account credentials to Supabase Edge Function secrets.
 *
 * Usage:
 *   node scripts/set-drive-service-account-secrets.mjs path/to/firebase-service-account.json
 *
 * Downloads the JSON from Firebase Console → Project settings → Service accounts
 * → Generate new private key.
 */
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const jsonPath = process.argv[2]
if (!jsonPath) {
  console.error('Usage: node scripts/set-drive-service-account-secrets.mjs path/to/service-account.json')
  process.exit(1)
}

const absolutePath = resolve(jsonPath)
let sa
try {
  sa = JSON.parse(readFileSync(absolutePath, 'utf8'))
} catch (e) {
  console.error(`Could not read or parse ${absolutePath}:`, e instanceof Error ? e.message : e)
  process.exit(1)
}

const email = sa.client_email?.trim()
const privateKey = sa.private_key?.trim()
if (!email || !privateKey) {
  console.error('Service account JSON is missing client_email or private_key.')
  process.exit(1)
}

const minifiedJson = JSON.stringify(sa)
const privateKeyForSecret = privateKey.replace(/\n/g, '\\n')
const assignments = [
  ['GOOGLE_SERVICE_ACCOUNT_EMAIL', email],
  ['GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', privateKeyForSecret],
  ['FIREBASE_SERVICE_ACCOUNT_JSON', minifiedJson],
]

console.log(`Setting Supabase secrets for ${email} ...`)

for (const [name, value] of assignments) {
  const result = spawnSync('npx', ['supabase@latest', 'secrets', 'set', `${name}=${value}`, '--yes'], {
    stdio: 'inherit',
    shell: true,
  })
  if (result.status !== 0) {
    console.error(`Failed to set ${name}`)
    process.exit(result.status ?? 1)
  }
}

console.log('\nSecrets updated. Redeploy drive-documents:')
console.log('  npx supabase functions deploy drive-documents --no-verify-jwt')
console.log('\nThen share the Quni Living Drive folder with this email as Viewer:')
console.log(`  ${email}`)
