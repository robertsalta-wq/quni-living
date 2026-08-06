import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { renderToString } from 'react-dom/server'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter } from 'react-router-dom'
import { AppTree } from '../AppTree'
import {
  fetchPublishedListingDetails,
  listingPrerenderPaths,
} from '../lib/publishedListings'
import { writePropertyDetailCache } from '../lib/propertyDetailCache'
import { hoistHeadTags } from './headTags'
import { listPrerenderPathnames, pathnameToDistDir } from './routes'
import NotFoundPage from '../pages/NotFoundPage'

function renderNotFoundBody(): { body: string; head: string } {
  const body = renderToString(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/__not-found__']} initialIndex={0}>
        <NotFoundPage />
      </MemoryRouter>
    </HelmetProvider>,
  )
  return hoistHeadTags(body)
}

function renderAppAt(pathname: string): { body: string; head: string } {
  const body = renderToString(
    <HelmetProvider>
      <MemoryRouter initialEntries={[pathname]} initialIndex={0}>
        <AppTree />
      </MemoryRouter>
    </HelmetProvider>,
  )
  return hoistHeadTags(body)
}

/** Remove default homepage SEO from the SPA shell so prerendered tags are authoritative. */
function stripDefaultSeoHead(html: string): string {
  return html
    .replace(/<title[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/>\s*/gi, '')
    .replace(/<meta\s+property="og:[^"]+"[\s\S]*?\/>\s*/gi, '')
    .replace(/<meta\s+name="twitter:[^"]+"[\s\S]*?\/>\s*/gi, '')
}

function injectPrerender(template: string, body: string, head: string): string {
  let page = template.replace('<div id="root"></div>', `<div id="root">${body}</div>`)
  page = stripDefaultSeoHead(page)
  page = page.replace('</head>', `${head}\n</head>`)
  return page
}

export async function prerenderRoutes(distDir: string): Promise<void> {
  const templatePath = path.join(distDir, 'index.html')
  const template = readFileSync(templatePath, 'utf8')
  // Keep an empty SPA shell for client-routed paths (vercel rewrite → spa.html).
  writeFileSync(path.join(distDir, 'spa.html'), template, 'utf8')

  const listings = await fetchPublishedListingDetails()
  for (const row of listings) {
    writePropertyDetailCache(row.slug.trim(), row)
  }
  const listingPaths = listingPrerenderPaths(listings.map((r) => r.slug))
  console.log(`prerender-routes: seeded ${listings.length} listing(s) for SSR`)

  const pathnames = listPrerenderPathnames(listingPaths)

  for (const pathname of pathnames) {
    const { body, head } = renderAppAt(pathname)
    // PageRouteFallback uses an ellipsis (…). Nested lazy islands may emit
    // "Switched to client rendering" without failing the page - only reject the route shell.
    if (body.includes('Loading page…')) {
      throw new Error(
        `prerender-routes: ${pathname} rendered Suspense route fallback - make the route eager in App.tsx`,
      )
    }
    const outDir = pathnameToDistDir(distDir, pathname)
    mkdirSync(outDir, { recursive: true })
    writeFileSync(path.join(outDir, 'index.html'), injectPrerender(template, body, head), 'utf8')
    console.log(`prerender-routes: wrote ${pathname}`)
  }

  // Root 404.html for Edge middleware (HTTP 404) - NotFoundPage without full chrome.
  {
    const { body, head } = renderNotFoundBody()
    const html = injectPrerender(template, body, head)
    writeFileSync(path.join(distDir, '404.html'), html, 'utf8')
    console.log('prerender-routes: wrote /404.html')
  }

  console.log(`prerender-routes: ${pathnames.length} route(s) prerendered`)
}
