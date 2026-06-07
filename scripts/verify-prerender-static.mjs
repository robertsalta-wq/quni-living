/**
 * Static HTML verification for prerendered routes (no JS execution).
 * Run after `npm run build` with: node scripts/verify-prerender-static.mjs
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const html = readFileSync(path.join(root, 'dist', 'for-universities', 'index.html'), 'utf8')
const failures = []

function assert(condition, message) {
  if (!condition) failures.push(message)
}

assert(/<title[^>]*>[\s\S]*?<\/title>/i.test(html), 'missing <title>')
assert(/<meta\s+name="description"\s+content="[^"]+"/i.test(html), 'missing meta description')
assert(/<link\s+rel="canonical"\s+href="[^"]+"/i.test(html), 'missing canonical link')
assert(/<meta\s+property="og:url"\s+content="[^"]+"/i.test(html), 'missing og:url')
assert(/<meta\s+property="og:image"\s+content="[^"]+"/i.test(html), 'missing og:image')

const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
const ogImage = ogImageMatch?.[1] ?? ''
assert(/^https:\/\//.test(ogImage), `og:image is not an absolute https URL: ${ogImage || '(empty)'}`)

assert(html.includes('A fair, verified place'), 'missing body text "A fair, verified place"')

console.log('Static prerender check: dist/for-universities/index.html')
console.log(`  og:image = ${ogImage}`)

if (failures.length > 0) {
  console.error('\nStatic prerender verification FAILED:')
  for (const f of failures) console.error(`- ${f}`)
  process.exit(1)
}

console.log('\nStatic prerender verification passed.')
