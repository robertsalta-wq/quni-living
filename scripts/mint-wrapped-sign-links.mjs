/**
 * Mint production wrapped signing links for submitter ids.
 * Usage: node scripts/run-with-env.mjs node scripts/mint-wrapped-sign-links.mjs 267 268
 */
const ids = process.argv.slice(2).map((s) => Number.parseInt(s, 10)).filter((n) => Number.isFinite(n) && n > 0)
if (!ids.length) {
  console.error('Usage: mint-wrapped-sign-links.mjs <submitterId> [more...]')
  process.exit(1)
}

const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
const base = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://quni.com.au').replace(/\/$/, '')
if (!key) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const res = await fetch(`${base}/api/dev/mint-sign-links`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify({ submitter_ids: ids, refresh_dates: true }),
})

const j = await res.json()
if (!res.ok) {
  console.error(j)
  process.exit(1)
}
console.log(JSON.stringify(j, null, 2))
