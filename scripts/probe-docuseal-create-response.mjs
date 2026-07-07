import fs from 'node:fs'
import { createDocusealSubmissionFromPdf } from '../api/lib/docuseal.shared.js'

const pdfPath = process.argv[2]
if (!pdfPath) {
  console.error('usage: node scripts/probe-docuseal-create-response.mjs <pdf>')
  process.exit(1)
}
const b64 = fs.readFileSync(pdfPath).toString('base64')
const submission = await createDocusealSubmissionFromPdf({
  name: 'probe create response',
  pdfBase64: b64,
  landlord: { name: 'L', email: 'spike.nsw.ft6600.landlord.dryrun@example.com' },
  tenant: { name: 'T', email: 'spike.nsw.ft6600.tenant.dryrun@example.com' },
  submitterSignReason: false,
})
console.log('top keys', Object.keys(submission))
console.log('schema?', Array.isArray(submission.schema), submission.schema?.length)
const doc0 = submission.schema?.[0]
console.log('doc0 keys', doc0 ? Object.keys(doc0) : null)
console.log('top-level fields count', submission.fields?.length)
console.log(
  'fields sample',
  submission.fields?.slice(0, 8).map((f) => ({ name: f.name, type: f.type, submitter_uuid: f.submitter_uuid })),
)
console.log('submitters', submission.submitters?.map((s) => ({ id: s.id, role: s.role, uuid: s.uuid })))
if (submission.id) {
  await fetch(
    `${(process.env.DOCUSEAL_API_URL || '').replace(/\/$/, '').replace(/\/api$/i, '')}/api/submissions/${submission.id}`,
    { method: 'DELETE', headers: { 'X-Auth-Token': process.env.DOCUSEAL_API_TOKEN } },
  )
}
