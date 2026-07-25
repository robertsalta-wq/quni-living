/**
 * Static HTML verification for prerendered routes (no JS execution).
 * Run after `npm run build` with: node scripts/verify-prerender-static.mjs
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const dist = path.join(root, 'dist')

const failures = []

function assert(condition, message) {
  if (!condition) failures.push(message)
}

/** @param {string} relPath path under dist, e.g. pricing/index.html */
function loadDistHtml(relPath) {
  const full = path.join(dist, relPath)
  assert(existsSync(full), `missing ${relPath}`)
  if (!existsSync(full)) return ''
  return readFileSync(full, 'utf8')
}

function assertPrerenderedPage(relPath, { bodySnippet, titleSnippet } = {}) {
  const html = loadDistHtml(relPath)
  if (!html) return
  assert(/<title[^>]*>[\s\S]*?<\/title>/i.test(html), `${relPath}: missing <title>`)
  assert(/<meta\s+name="description"\s+content="[^"]+"/i.test(html), `${relPath}: missing meta description`)
  assert(/<link\s+rel="canonical"\s+href="[^"]+"/i.test(html), `${relPath}: missing canonical link`)
  assert(html.includes('data-beasties-container') || html.includes('application/ld+json'), `${relPath}: looks like SPA shell (no beasties/ld+json)`)
  assert(!/<div id="root"><\/div>\s*<script/i.test(html) || html.includes('data-beasties-container'), `${relPath}: empty #root SPA shell`)
  if (bodySnippet) {
    assert(html.includes(bodySnippet), `${relPath}: missing body text "${bodySnippet}"`)
  }
  if (titleSnippet) {
    assert(html.includes(titleSnippet), `${relPath}: missing title snippet "${titleSnippet}"`)
  }
}

// Long-standing campus marketing page check
{
  const html = loadDistHtml('for-universities/index.html')
  if (html) {
    assert(/<meta\s+property="og:image"\s+content="[^"]+"/i.test(html), 'for-universities: missing og:image')
    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
    const ogImage = ogImageMatch?.[1] ?? ''
    assert(/^https:\/\//.test(ogImage), `for-universities: og:image is not absolute https: ${ogImage || '(empty)'}`)
    assert(html.includes('A fair, verified place'), 'for-universities: missing body text "A fair, verified place"')
    console.log('Static prerender check: dist/for-universities/index.html')
    console.log(`  og:image = ${ogImage}`)
  }
}

// Item Zero: marketing routes that used to fall through to spa.html
assertPrerenderedPage('pricing/index.html', { titleSnippet: 'Pricing' })
assertPrerenderedPage('faq/index.html', { titleSnippet: 'FAQ' })
assertPrerenderedPage('landlords/ai/index.html', { titleSnippet: 'Landlord AI' })
assertPrerenderedPage('guides/index.html')
assertPrerenderedPage('services/landlord-partnerships/index.html')

const llms = path.join(dist, 'llms.txt')
assert(existsSync(llms), 'missing dist/llms.txt (copy from public/)')
if (existsSync(llms)) {
  const text = readFileSync(llms, 'utf8')
  assert(text.includes('Sitemap: https://quni.com.au/sitemap.xml'), 'llms.txt: missing sitemap line')
  assert(!text.includes('<!doctype html>'), 'llms.txt: HTML leaked into text file')
}

if (failures.length > 0) {
  console.error('\nStatic prerender verification FAILED:')
  for (const f of failures) console.error(`- ${f}`)
  process.exit(1)
}

console.log('\nStatic prerender verification passed.')
