/**
 * Dynamic sitemap from Supabase (active listings, universities, campuses).
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, optional VITE_SITE_URL (canonical origin).
 */
import { createClient } from '@supabase/supabase-js'

const SITE_URL = (process.env.VITE_SITE_URL || 'https://quni-living.vercel.app').replace(
  /\/$/,
  ''
)

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).end()
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRole) {
    console.error('sitemap: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return res.status(500).send('Server misconfigured')
  }

  const supabase = createClient(supabaseUrl, serviceRole)

  const today = new Date().toISOString().slice(0, 10)

  const { data: properties } = await supabase
    .from('properties')
    .select('slug, updated_at')
    .eq('status', 'active')
    .or(`available_to.is.null,available_to.gte.${today}`)
    .order('updated_at', { ascending: false })

  const { data: universities } = await supabase
    .from('universities')
    .select('slug, created_at')
    .order('created_at', { ascending: false })

  const { data: campuses } = await supabase
    .from('campuses')
    .select('id, name, university_id, universities(slug)')

  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/listings', priority: '0.9', changefreq: 'hourly' },
    { url: '/about', priority: '0.6', changefreq: 'monthly' },
    { url: '/pricing', priority: '0.6', changefreq: 'monthly' },
    { url: '/contact', priority: '0.5', changefreq: 'monthly' },
    { url: '/services', priority: '0.6', changefreq: 'monthly' },
    { url: '/services/landlord-partnerships', priority: '0.7', changefreq: 'monthly' },
    { url: '/terms', priority: '0.3', changefreq: 'yearly' },
    { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
    { url: '/landlord-service-agreement', priority: '0.3', changefreq: 'yearly' },
    { url: '/landlord-signup', priority: '0.8', changefreq: 'monthly' },
  ]

  const propertyUrls = (properties || []).map((p) => ({
    url: `/listings/${p.slug}`,
    lastmod: p.updated_at?.split('T')[0],
    priority: '0.8',
    changefreq: 'weekly',
  }))

  const universityUrls = (universities || []).map((u) => ({
    url: `/student-accommodation/${u.slug}`,
    lastmod: u.created_at?.split('T')[0],
    priority: '0.8',
    changefreq: 'weekly',
  }))

  const campusUrls = (campuses || [])
    .map((c) => {
      const uniSlug = c.universities?.slug
      if (!uniSlug || !c.name) return null
      const campusSlug = slugify(c.name)
      if (!campusSlug) return null
      return {
        url: `/student-accommodation/${uniSlug}/${campusSlug}`,
        priority: '0.7',
        changefreq: 'weekly',
      }
    })
    .filter(Boolean)

  const allUrls = [...staticPages, ...propertyUrls, ...universityUrls, ...campusUrls]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (page) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${page.url}`)}</loc>
    ${page.lastmod ? `<lastmod>${escapeXml(page.lastmod)}</lastmod>` : ''}
    <changefreq>${escapeXml(page.changefreq)}</changefreq>
    <priority>${escapeXml(page.priority)}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(sitemap)
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
