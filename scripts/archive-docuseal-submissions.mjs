import { getDocusealApiBase, getDocusealAuthHeaders } from '../api/lib/docuseal.shared.js'

const ids = process.argv.slice(2).map(Number).filter((n) => n > 0)
const base = getDocusealApiBase()
const h = getDocusealAuthHeaders({ includeContentType: true })
for (const id of ids) {
  const r = await fetch(`${base}/api/submissions/${id}`, { method: 'DELETE', headers: h })
  console.log('delete', id, r.status)
}
