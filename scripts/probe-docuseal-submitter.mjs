import { getDocusealApiBase, getDocusealAuthHeaders } from '../api/lib/docuseal.shared.js'

const id = Number(process.argv[2] || 227)
const base = getDocusealApiBase()
const h = getDocusealAuthHeaders()
const sub = await fetch(`${base}/api/submitters/${id}`, { headers: h }).then((r) => r.json())
console.log('submitter', JSON.stringify(sub, null, 2).slice(0, 4000))
const sid = process.argv[3] || sub.submission_id
const sm = await fetch(`${base}/api/submissions/${sid}`, { headers: h }).then((r) => r.json())
console.log('submission fields?', sm.fields?.length, sm.fields?.map((f) => f.name))
