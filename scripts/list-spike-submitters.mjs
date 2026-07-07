import { getDocusealApiBase, getDocusealAuthHeaders } from '../api/lib/docuseal.shared.js'

const base = getDocusealApiBase()
const h = getDocusealAuthHeaders()
const res = await fetch(`${base}/api/submitters?q=spike.nsw.ft6600&limit=20`, { headers: h })
const body = await res.json()
console.log(JSON.stringify(body.data?.map((s) => ({
  id: s.id,
  submission_id: s.submission_id,
  role: s.role,
  status: s.status,
  email: s.email,
})), null, 2))
