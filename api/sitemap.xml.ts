/// <reference types="node" />
/**
 * Dynamic sitemap for search discovery.
 * Served at /api/sitemap.xml; rewritten from /sitemap.xml in vercel.json.
 *
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY,
 * optional VITE_SITE_URL (canonical origin).
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { campusUrlSlug } from '../src/lib/slug.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

const SITE_URL = (process.env.VITE_SITE_URL || 'https://quni.com.au').replace(/\/$/, '')

/** Public marketing/content routes (no auth, no redirects, no dynamic segments). */
const STATIC_ROUTES = [
  '/',
  '/guides',
  '/for-universities',
  '/listings',
  '/rent-near-campus',
  '/international',
  '/student-accommodation',
  '/terms',
  '/privacy',
  '/non-discrimination',
  '/landlord-service-agreement',
  '/about',
  '/how-it-works',
  '/refunds',
  '/pricing',
  '/contact',
  '/faq',
  '/verification',
  '/services',
  '/services/student-accommodation',
  '/services/property-management',
  '/services/landlord-partnerships',
  '/services/fully-furnished',
  '/landlords/ai',
] as const

type SitemapEntry = {
  path: string
  lastmod?: string
}

export default async function handler(
  req: { method?: string },
  res: {
    setHeader: (name: string, value: string) => void
    status: (code: number) => { send: (body: string) => void; end: () => void }
    end: () => void
  },
) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).send('Method Not Allowed')
  }

  const staticEntries: SitemapEntry[] = STATIC_ROUTES.map((p) => ({ path: p }))
  const guideEntries = loadGuideEntriesFromManifest()

  let propertyEntries: SitemapEntry[] = []
  let universityEntries: SitemapEntry[] = []
  let campusEntries: SitemapEntry[] = []

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (supabaseUrl && anonKey) {
    try {
      const supabase = createClient(supabaseUrl, anonKey)

      const [
        { data: properties, error: propertiesError },
        { data: universities, error: universitiesError },
        { data: campuses, error: campusesError },
      ] = await Promise.all([
        (() => {
          // Match browse/prerender: active and not past available_to (see propertyListingDateWindow).
          const day = new Date().toISOString().slice(0, 10)
          return supabase
            .from('properties')
            .select('slug, updated_at')
            .eq('status', 'active')
            .or(`available_to.is.null,available_to.gte.${day}`)
            .order('updated_at', { ascending: false })
        })(),
        supabase.from('universities').select('slug').order('slug', { ascending: true }),
        supabase
          .from('campuses')
          .select('name, slug, university_id, universities(slug)')
          .order('name', { ascending: true }),
      ])

      if (!propertiesError && properties) {
        propertyEntries = properties
          .filter(
            (p): p is { slug: string; updated_at: string | null } =>
              typeof p.slug === 'string' && p.slug.trim().length > 0,
          )
          .map((p) => ({
            path: `/listings/${p.slug.trim()}`,
            lastmod: toLastmodDate(p.updated_at),
          }))
      }

      if (!universitiesError && universities) {
        universityEntries = universities
          .filter((u): u is { slug: string } => typeof u.slug === 'string' && u.slug.trim().length > 0)
          .map((u) => ({ path: `/student-accommodation/${u.slug.trim()}` }))
      }

      if (!campusesError && campuses) {
        campusEntries = campuses
          .map((c) => {
            const uniRel = c.universities as { slug?: string } | { slug?: string }[] | null
            const uniSlug = Array.isArray(uniRel) ? uniRel[0]?.slug : uniRel?.slug
            if (!uniSlug || !c.name) return null
            const campusSlug = campusUrlSlug({ slug: c.slug, name: c.name })
            if (!campusSlug) return null
            return { path: `/student-accommodation/${uniSlug.trim()}/${campusSlug}` }
          })
          .filter((e): e is SitemapEntry => e != null)
      }
    } catch (err) {
      console.error('sitemap: database query failed; emitting static + guide URLs only', err)
    }
  } else {
    console.error('sitemap: missing SUPABASE_URL or anon key; emitting static + guide URLs only')
  }

  const allEntries = [
    ...staticEntries,
    ...propertyEntries,
    ...guideEntries,
    ...universityEntries,
    ...campusEntries,
  ]

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries
  .map((entry) => {
    const loc = escapeXml(`${SITE_URL}${entry.path}`)
    const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : ''
    return `  <url>
    <loc>${loc}</loc>${lastmod}
  </url>`
  })
  .join('\n')}
</urlset>
`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  if (req.method === 'HEAD') {
    return res.status(200).end()
  }
  return res.status(200).send(body)
}

function loadGuideEntriesFromManifest(): SitemapEntry[] {
  try {
    const manifestPath = path.join(process.cwd(), 'content/guides/manifest.json')
    const raw = fs.readFileSync(manifestPath, 'utf8')
    const entries = JSON.parse(raw) as unknown
    if (!Array.isArray(entries)) return []
    const out: SitemapEntry[] = []
    for (const e of entries) {
      if (!e || typeof e !== 'object') continue
      const slugRaw = (e as { slug?: unknown }).slug
      if (typeof slugRaw !== 'string') continue
      const slug = slugRaw.trim()
      if (!slug) continue
      const dateModified = (e as { dateModified?: unknown }).dateModified
      const entry: SitemapEntry = { path: `/guides/${slug}` }
      if (typeof dateModified === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateModified)) {
        entry.lastmod = dateModified.slice(0, 10)
      }
      out.push(entry)
    }
    return out
  } catch {
    return []
  }
}

function toLastmodDate(value: string | null | undefined): string | undefined {
  if (!value || typeof value !== 'string') return undefined
  const day = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
