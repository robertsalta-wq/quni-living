/**
 * Listings browse latency + Supabase region hints.
 * Usage: node scripts/check-supabase-listings-latency.mjs
 */
import { readFileSync, existsSync } from 'fs'

const PROD_SITE = 'https://quni-living.vercel.app'

const PROPERTY_CARD_LIST_SELECT = [
  'id',
  'title',
  'slug',
  'rent_per_week',
  'featured',
  'created_at',
  'landlord_profiles(id,full_name,avatar_url,verified)',
  'universities(id,name,slug)',
  'campuses(id,name,slug)',
].join(',')

function loadEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 1) continue
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return out
}

async function keysFromProdBundle() {
  const html = await (await fetch(`${PROD_SITE}/`)).text()
  const assets = [...html.matchAll(/\/assets\/[^"']+\.js/g)].map((m) => m[0])
  let bundle = ''
  for (const a of assets.slice(0, 12)) {
    bundle += await (await fetch(`${PROD_SITE}${a}`)).text()
  }
  const url = bundle.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0]
  const key =
    bundle.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0] ??
    bundle.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0]
  return { url, key }
}

function buildPostgrestUrl(supabaseUrl, listingDay) {
  const base = supabaseUrl.replace(/\/$/, '')
  const params = new URLSearchParams()
  params.set('select', PROPERTY_CARD_LIST_SELECT)
  params.set('status', 'eq.active')
  params.set('or', `(available_to.is.null,available_to.gte.${listingDay})`)
  params.append('order', 'featured.desc')
  params.append('order', 'created_at.desc')
  return `${base}/rest/v1/properties?${params.toString()}`
}

function ms(start) {
  return Math.round(performance.now() - start)
}

async function timeFetch(label, url, headers) {
  const t0 = performance.now()
  const res = await fetch(url, { headers })
  const elapsed = ms(t0)
  const body = await res.text()
  return { label, elapsed, status: res.status, bytes: body.length, ok: res.ok }
}

async function main() {
  const fileEnv = loadEnvFile('.env.local')
  const env = { ...fileEnv, ...process.env }
  let supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim()
  let anonKey = (env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !anonKey) {
    const fromProd = await keysFromProdBundle()
    supabaseUrl = supabaseUrl || fromProd.url || ''
    anonKey = anonKey || fromProd.key || ''
  }

  if (!supabaseUrl || !anonKey) {
    console.error('Missing Supabase URL/anon key')
    process.exit(1)
  }

  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? 'unknown'
  const listingDay = new Date().toISOString().slice(0, 10)

  console.log('=== Supabase listings latency check ===\n')
  console.log('Project ref:', projectRef)
  console.log('Supabase URL:', supabaseUrl)
  console.log(
    'Region: Supabase Dashboard → Project Settings → General → Region.',
  )
  console.log(
    'For AU users: ap-southeast-2 (Sydney) is ideal; ap-southeast-1 (Singapore) adds ~100–150ms.\n',
  )

  const postgrestUrl = buildPostgrestUrl(supabaseUrl, listingDay)
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Accept: 'application/json',
  }

  const runs = []
  for (let i = 0; i < 3; i++) {
    runs.push(await timeFetch(`PostgREST direct #${i + 1}`, postgrestUrl, headers))
  }

  try {
    const edgeUrl = `${PROD_SITE}/api/listings-browse?listing_day=${listingDay}`
    runs.push(
      await timeFetch('Vercel /api/listings-browse', edgeUrl, { Accept: 'application/json' }),
    )
    runs.push(
      await timeFetch(
        'Vercel edge (2nd hit, cache)',
        edgeUrl,
        { Accept: 'application/json' },
      ),
    )
  } catch (e) {
    runs.push({ label: 'Vercel edge API', error: String(e) })
  }

  console.log('Timings:')
  for (const r of runs) {
    if (r.error) {
      console.log(`  ${r.label}: ${r.error}`)
    } else {
      console.log(
        `  ${r.label}: ${r.elapsed}ms status=${r.status} bytes=${r.bytes} ok=${r.ok}`,
      )
    }
  }

  const timed = runs.filter((r) => r.elapsed != null)
  const avg = timed.reduce((a, r) => a + r.elapsed, 0) / Math.max(1, timed.length)
  console.log(`\nAverage (all runs): ~${Math.round(avg)}ms`)
  const direct = runs.filter((r) => r.label?.includes('PostgREST'))
  const directAvg =
    direct.reduce((a, r) => a + r.elapsed, 0) / Math.max(1, direct.length)
  console.log(`PostgREST direct average: ~${Math.round(directAvg)}ms`)

  console.log('\n=== EXPLAIN (paste in Supabase SQL Editor) ===\n')
  console.log(`-- Project ref: ${projectRef}
EXPLAIN (ANALYZE, BUFFERS)
SELECT p.*
FROM public.properties p
WHERE p.status = 'active'
  AND (p.available_to IS NULL OR p.available_to >= '${listingDay}'::date)
ORDER BY p.featured DESC NULLS LAST, p.created_at DESC NULLS LAST;

-- Embeds (landlord_profiles, universities, campuses) add PostgREST join cost.
-- If you see Seq Scan on properties, consider:
-- CREATE INDEX IF NOT EXISTS idx_properties_active_browse
--   ON public.properties (featured DESC, created_at DESC)
--   WHERE status = 'active';
`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
