import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { renderToString } from 'react-dom/server'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter } from 'react-router-dom'
import { AppTree } from '../AppTree'
import { listPrerenderPathnames, pathnameToDistDir } from './routes'

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

/**
 * react-helmet-async v3 emits title/meta/link at the start of the SSR stream and JSON-LD
 * scripts inline in the route tree. Hoist all of those into <head> so the #root body matches
 * what the client renders after Helmet moves tags into document.head.
 */
function hoistHeadTags(body: string): { body: string; head: string } {
  const headParts: string[] = []

  let rest = body
  const headerIdx = rest.indexOf('<header')
  if (headerIdx > 0) {
    headParts.push(rest.slice(0, headerIdx).trim())
    rest = rest.slice(headerIdx)
  }

  return {
    body: stripSuspenseBoundaryComments(rest),
    head: headParts.filter(Boolean).join('\n'),
  }
}

/** React 19 Suspense SSR comments are absent once the guide route is eager on the client. */
function stripSuspenseBoundaryComments(html: string): string {
  return html.replace(/<!--\$[^>]*-->/g, '').replace(/<!--\/\$-->/g, '')
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
  const pathnames = listPrerenderPathnames()

  for (const pathname of pathnames) {
    const { body, head } = renderAppAt(pathname)
    const outDir = pathnameToDistDir(distDir, pathname)
    mkdirSync(outDir, { recursive: true })
    writeFileSync(path.join(outDir, 'index.html'), injectPrerender(template, body, head), 'utf8')
    console.log(`prerender-routes: wrote ${pathname}`)
  }

  console.log(`prerender-routes: ${pathnames.length} route(s) prerendered`)
}
