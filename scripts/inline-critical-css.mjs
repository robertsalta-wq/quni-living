/**
 * Post-prerender critical CSS for marketing HTML only.
 * Leaves spa.html untouched (empty client shell — deferring CSS there would FOUC app routes).
 * Does not inline/preload fonts (Phase-1 self-hosted faces stay as-is).
 * Does not prune the full stylesheet (non-prerendered routes still need the complete CSS).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Beasties from 'beasties'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const distDir = path.join(root, 'dist')

if (process.env.CAPACITOR_BUILD === 'true') {
  console.log('inline-critical-css: skipped (Capacitor build)')
  process.exit(0)
}

const SKIP_DIRS = new Set(['assets', 'fonts', 'hero', 'icons', 'images'])

/** Collect prerendered index.html files under dist; never spa.html. */
function collectPrerenderedHtml(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    if (name === 'spa.html') continue
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue
      out.push(...collectPrerenderedHtml(full))
      continue
    }
    if (name === 'index.html') out.push(full)
  }
  return out
}

const htmlFiles = collectPrerenderedHtml(distDir)
if (htmlFiles.length === 0) {
  console.error('inline-critical-css: no prerendered index.html files found under dist/')
  process.exit(1)
}

const beasties = new Beasties({
  path: distDir,
  publicPath: '/',
  external: true,
  pruneSource: false,
  inlineFonts: false,
  preloadFonts: false,
  fonts: false,
  preload: 'media',
  noscriptFallback: true,
  compress: true,
  logLevel: 'warn',
})

let ok = 0
for (const file of htmlFiles) {
  const before = readFileSync(file, 'utf8')
  if (!/<link[^>]+rel=["']stylesheet["']/i.test(before)) {
    console.warn(`inline-critical-css: skip (no stylesheet link): ${path.relative(distDir, file)}`)
    continue
  }
  const after = await beasties.process(before)
  writeFileSync(file, after, 'utf8')
  ok += 1
  console.log(`inline-critical-css: ${path.relative(distDir, file)}`)
}

console.log(`inline-critical-css: processed ${ok} prerendered page(s); spa.html left blocking`)
