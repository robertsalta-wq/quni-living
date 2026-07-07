/**
 * Complete an existing spike submission using stored field map + burn-in values.
 * Usage: node scripts/run-with-env.mjs node scripts/complete-spike-submission.mjs <submissionId> <fieldsJsonPath>
 */
import fs from 'node:fs'
import { getDocusealApiBase, getDocusealAuthHeaders } from '../api/lib/docuseal.shared.js'

const submissionId = Number(process.argv[2])
const fieldsPath = process.argv[3]
if (!submissionId || !fieldsPath) {
  console.error('usage: complete-spike-submission.mjs <submissionId> <fieldsJsonPath>')
  process.exit(1)
}

const EXPLICIT_AU_DATE = '06/07/2026'
const TYPED_TEST_SIGNATURE = 'Spike Test Sig'
const base = getDocusealApiBase()
const h = { ...getDocusealAuthHeaders(), 'Content-Type': 'application/json' }

async function jfetch(path, init) {
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...h, ...init?.headers } })
  const text = await res.text()
  if (!res.ok) throw new Error(`${init?.method || 'GET'} ${path} ${res.status}: ${text.slice(0, 500)}`)
  return text ? JSON.parse(text) : null
}

const snap = JSON.parse(fs.readFileSync(fieldsPath, 'utf8'))
const sm = await jfetch(`/api/submissions/${submissionId}`)
const fields = snap.fields ?? []
const submitters = sm.submitters ?? []

function payloadFor(uuid, explicitDates) {
  const mine = fields.filter((f) => f.submitter_uuid === uuid)
  const payloadFields = []
  for (const f of mine) {
    if (f.type === 'signature' || f.type === 'initials') {
      payloadFields.push({ name: f.name, default_value: TYPED_TEST_SIGNATURE, readonly: true })
    } else if (f.type === 'date' && explicitDates) {
      payloadFields.push({ name: f.name, default_value: EXPLICIT_AU_DATE, readonly: true })
    }
  }
  return { fields: payloadFields, completed: true }
}

const landlord = submitters.find((s) => s.role === 'First Party')
const tenant = submitters.find((s) => s.role === 'Second Party')
console.log('completing', submissionId, landlord?.id, tenant?.id)
console.log(await jfetch(`/api/submitters/${landlord.id}`, { method: 'PUT', body: JSON.stringify(payloadFor(landlord.uuid, true)) }))
await new Promise((r) => setTimeout(r, 2000))
console.log(await jfetch(`/api/submitters/${tenant.id}`, { method: 'PUT', body: JSON.stringify(payloadFor(tenant.uuid, false)) }))

for (let i = 0; i < 15; i++) {
  const done = await jfetch(`/api/submissions/${submissionId}`)
  if (done.combined_document_url) {
    console.log('combined', done.combined_document_url)
    break
  }
  try {
    const docs = await jfetch(`/api/submissions/${submissionId}/documents?merge=true`)
    if (docs.documents?.[0]?.url) {
      console.log('merged', docs.documents[0].url)
      break
    }
  } catch {
    /* */
  }
  await new Promise((r) => setTimeout(r, 2000))
}
