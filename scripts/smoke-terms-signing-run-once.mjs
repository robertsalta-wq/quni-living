/**
 * One-shot orchestrator for the disposable QLD residential co-tenant smoke.
 * Creates booking → terms → regenerate → prints sign links.
 *
 * Usage:
 *   node scripts/run-with-env.mjs node scripts/smoke-terms-signing-run-once.mjs
 *
 * Requires interactive confirmation via SMOKE_CONFIRM_PROD_WRITE=1 already set below
 * only when invoked with --confirm.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAdmin, writeArtifact } from './smoke-terms-signing-lib.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const confirm = process.argv.includes('--confirm')

// Free QLD residential (Form18a path) — only free residential inventory as of 2026-07-22.
const PROPERTY_ID = 'a61bc272-70e7-419c-a721-f69f50a09346'
const LANDLORD_PROFILE_ID = 'cb567e3c-7c59-43dd-b704-9653f098ae56'
const STUDENT_PROFILE_ID = '12c09292-6546-4ba0-a476-0620bab453a4' // rob@3thingsatonce.com.au

const admin = createAdmin()
const { data: prop, error } = await admin
  .from('properties')
  .select('id, title, state, property_type, bond, bond_weeks, landlord_id, status')
  .eq('id', PROPERTY_ID)
  .maybeSingle()

if (error || !prop) {
  console.error('Property load failed', error)
  process.exit(1)
}

const plan = {
  phase: 'run-once-plan',
  confirm,
  property: prop,
  studentProfileId: STUDENT_PROFILE_ID,
  landlordProfileId: LANDLORD_PROFILE_ID,
  note:
    'NSW FT6600 inventory is fully occupied by real tenancies; using free QLD residential package which still creates a Co-tenant DocuSeal submitter.',
  coTenantEmail: process.env.SMOKE_CO_TENANT_EMAIL || 'rob+smoke-co@quni.com.au',
}

writeArtifact('run-once-plan.json', plan)
console.log(JSON.stringify(plan, null, 2))

if (!confirm) {
  console.error('\nRe-run with --confirm to execute prod writes.')
  process.exit(0)
}

const env = {
  ...process.env,
  SMOKE_CONFIRM_PROD_WRITE: '1',
  SMOKE_CREATE_BOOKING: '1',
  SMOKE_PROPERTY_ID: PROPERTY_ID,
  SMOKE_STUDENT_PROFILE_ID: STUDENT_PROFILE_ID,
  SMOKE_LANDLORD_PROFILE_ID: LANDLORD_PROFILE_ID,
  SMOKE_MINT_LANDLORD_SESSION: '1',
  SMOKE_CO_TENANT_EMAIL: plan.coTenantEmail,
  SMOKE_CO_TENANT_NAME: process.env.SMOKE_CO_TENANT_NAME || 'Smoke Co-Tenant',
}

const r = spawnSync(process.execPath, [path.join(root, 'scripts/smoke-terms-signing-setup.mjs')], {
  env,
  cwd: root,
  encoding: 'utf8',
})

process.stdout.write(r.stdout || '')
process.stderr.write(r.stderr || '')
process.exit(r.status ?? 1)
