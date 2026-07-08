import { getDocusealApiBase, getDocusealAuthHeaders } from '../api/lib/docusealClient.js'

const id = process.argv[2] || '267'
const base = getDocusealApiBase()
const r = await fetch(`${base}/api/submitters/${id}`, { headers: getDocusealAuthHeaders() })
console.log('status', r.status)
const j = await r.json()
console.log(JSON.stringify({ status: j.status, completed_at: j.completed_at, embed_src: j.embed_src, slug: j.slug, role: j.role }, null, 2))
