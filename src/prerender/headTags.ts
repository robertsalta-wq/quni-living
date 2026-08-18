/**
 * Splitting SSR output into <head> tags and #root body markup.
 *
 * Kept separate from `entry-server` so it can be unit tested without pulling in
 * the whole app tree.
 */

/** Head-only tags react-helmet-async v3 emits at the start of the SSR stream. */
const LEADING_HEAD_TAG =
  /^\s*((?:<title[\s\S]*?<\/title>|<meta\b[^>]*\/?>|<link\b[^>]*\/?>|<script\b[^>]*type="application\/ld\+json"[\s\S]*?<\/script>)\s*)/i

/** React 19 Suspense SSR comments are absent once the guide route is eager on the client. */
export function stripSuspenseBoundaryComments(html: string): string {
  return html.replace(/<!--\$[^>]*-->/g, '').replace(/<!--\/\$-->/g, '')
}

/**
 * Move the leading Helmet tags into <head> so the #root body matches what the client
 * renders after Helmet relocates them into document.head.
 *
 * Only real head tags may move. Hoisting anything else (e.g. the app's wrapper <div>)
 * makes the HTML parser close <head> early, which strands that markup outside #root
 * where the client render never replaces it - leaving dead, unclickable duplicate
 * chrome such as a second floating Ask AI button on top of the real one.
 */
export function hoistHeadTags(body: string): { body: string; head: string } {
  const headParts: string[] = []

  let rest = body
  for (;;) {
    const match = rest.match(LEADING_HEAD_TAG)
    if (!match) break
    headParts.push(match[1]!.trim())
    rest = rest.slice(match[0].length)
  }

  return {
    body: stripSuspenseBoundaryComments(rest),
    head: headParts.filter(Boolean).join('\n'),
  }
}

/** Remove default homepage SEO from the SPA shell so prerendered tags are authoritative. */
export function stripDefaultSeoHead(html: string): string {
  return html
    .replace(/<title[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/>\s*/gi, '')
    .replace(/<meta\s+property="og:[^"]+"[\s\S]*?\/>\s*/gi, '')
    .replace(/<meta\s+name="twitter:[^"]+"[\s\S]*?\/>\s*/gi, '')
}

/**
 * Insert prerendered Helmet tags early in `<head>` (right after charset).
 *
 * Facebook / WhatsApp use `Range: bytes=0-4095` and often stop at the first 206.
 * Tags before `</head>` after ~20KB of preloads/fonts never reach the crawler, so
 * the share falls back to the homepage OG object (wrong canonical / bare preview).
 */
export function injectHelmetHead(html: string, head: string): string {
  const trimmed = head.trim()
  if (!trimmed) return html

  const charset = html.match(/<meta\s+charset=[^>]*>/i)
  if (charset && charset.index != null) {
    const at = charset.index + charset[0].length
    return `${html.slice(0, at)}\n${trimmed}\n${html.slice(at)}`
  }

  return html.replace(/<head([^>]*)>/i, `<head$1>\n${trimmed}\n`)
}

/** Wire SSR body + Helmet head into the Vite SPA shell for a prerendered route. */
export function injectPrerender(template: string, body: string, head: string): string {
  let page = template.replace('<div id="root"></div>', `<div id="root">${body}</div>`)
  page = stripDefaultSeoHead(page)
  return injectHelmetHead(page, head)
}
