/**
 * Print DocuSeal template field names (for DOCUSEAL_LEASE_FIELD_MAP).
 *
 * Requires .env.local with DOCUSEAL_API_URL, DOCUSEAL_API_TOKEN, DOCUSEAL_LEASE_TEMPLATE_ID
 *
 *   node scripts/list-docuseal-template-fields.mjs
 */
import dotenv from 'dotenv'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(root, '.env.local')
if (!fs.existsSync(envPath)) {
  console.error(`Missing ${envPath}`)
  process.exit(1)
}
dotenv.config({ path: envPath })

function apiBase() {
  const raw = (process.env.DOCUSEAL_API_URL || '').trim().replace(/\/$/, '')
  return raw.replace(/\/api$/i, '')
}

const token = (process.env.DOCUSEAL_API_TOKEN || '').trim()
const idRaw = (process.env.DOCUSEAL_LEASE_TEMPLATE_ID || '').trim()
const id = Number(idRaw)

if (!token || !Number.isFinite(id) || id <= 0) {
  console.error('Set DOCUSEAL_API_TOKEN and DOCUSEAL_LEASE_TEMPLATE_ID in .env.local')
  process.exit(1)
}

const base = apiBase()
const url = `${base}/api/templates/${id}`
const res = await fetch(url, { headers: { 'X-Auth-Token': token } })
const text = await res.text()
if (!res.ok) {
  console.error(`${res.status} ${url}\n${text}`)
  process.exit(1)
}

let data
try {
  data = JSON.parse(text)
} catch {
  console.error('Non-JSON response:', text.slice(0, 500))
  process.exit(1)
}

const fields = Array.isArray(data.fields) ? data.fields : []
const submitters = Array.isArray(data.submitters) ? data.submitters : []
const uuidToRole = new Map(submitters.map((s) => [s.uuid, s.name || s.role || s.uuid]))

console.log('Template:', data.name || id, '(id', data.id ?? id, ')')
console.log('--- fields (name, type, role) ---')
for (const f of fields) {
  if (!f || typeof f !== 'object') continue
  const role = f.submitter_uuid ? uuidToRole.get(f.submitter_uuid) || '(unknown role)' : '(no role)'
  console.log(`- ${JSON.stringify(f.name)}  type=${f.type}  role=${role}`)
}
console.log('---')
console.log('Build DOCUSEAL_LEASE_FIELD_MAP JSON mapping internal keys → exact "name" above.')
console.log('Internal keys: see api/lib/docusealLeasePrefill.js (DEFAULT_FIELD_NAMES).')
