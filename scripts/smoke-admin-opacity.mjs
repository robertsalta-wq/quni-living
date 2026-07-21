/**
 * PR A gate: confirm Tailwind emits alpha for admin-* /opacity utilities.
 * Run: node scripts/_smoke-admin-opacity.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import postcss from 'postcss'

const require = createRequire(import.meta.url)
const tailwindcss = require('tailwindcss')
const ROOT = path.resolve(import.meta.dirname, '..')

const probeHtml = path.join(ROOT, 'scripts/_smoke-admin-opacity.probe.html')
fs.writeFileSync(
  probeHtml,
  `<!doctype html><html><body>
  <div class="bg-admin-coral bg-admin-coral/30 text-admin-coral/50 border-admin-warning/40 ring-admin-coral/50 bg-admin-coral-tint/50"></div>
  <div class="bg-[var(--quni-coral)]/30"></div>
  </body></html>`,
)

const baseConfig = (await import(pathToFileURL(path.join(ROOT, 'tailwind.config.js')).href)).default
const config = {
  ...baseConfig,
  content: [probeHtml.replace(/\\/g, '/')],
  corePlugins: { preflight: false },
}

const css = (
  await postcss([tailwindcss(config)]).process('@tailwind utilities;', { from: undefined })
).css

const rules = [...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)].map((m) => ({
  sel: m[1].trim(),
  body: m[2].trim(),
}))

const pick = (re) => rules.filter((r) => re.test(r.sel))

const report = []
const checks = [
  { name: 'bg-admin-coral', re: /^\.bg-admin-coral$/, needAlpha: false },
  { name: 'bg-admin-coral/30', re: /^\.bg-admin-coral\\\/30$/, needAlpha: true },
  { name: 'text-admin-coral/50', re: /^\.text-admin-coral\\\/50$/, needAlpha: true },
  { name: 'border-admin-warning/40', re: /^\.border-admin-warning\\\/40$/, needAlpha: true },
  { name: 'bg-admin-coral-tint/50', re: /^\.bg-admin-coral-tint\\\/50$/, needAlpha: true },
]

let failed = false
for (const c of checks) {
  const hits = pick(c.re)
  const body = hits.map((h) => h.body.replace(/\s+/g, ' ')).join(' | ') || '(NOT EMITTED)'
  const hasAlpha = /color-mix|\/\s*0\.\d+/.test(body)
  if (!hits.length || (c.needAlpha && !hasAlpha)) {
    failed = true
    report.push(`FAIL ${c.name}: ${body}`)
  } else {
    report.push(`OK   ${c.name}: ${body}`)
  }
}

const brokenArbitrary = pick(/bg-\\\[var/)
report.push(
  `INFO bg-[var(--quni-coral)]/30: ${
    brokenArbitrary.map((h) => h.body.replace(/\s+/g, ' ')).join(' | ') || '(NOT EMITTED — expected on v3)'
  }`,
)

const out = path.join(ROOT, 'scripts/_smoke-admin-opacity.out.css')
fs.writeFileSync(
  out,
  pick(/admin-coral|admin-warning/).map((r) => `${r.sel} {\n  ${r.body}\n}`).join('\n\n'),
)

console.log(report.join('\n'))
console.log(`\nWrote ${out}`)
try {
  fs.unlinkSync(probeHtml)
} catch {
  /* ignore */
}

if (failed) {
  console.error('\nSmoke test FAILED — opacity-safe wiring not confirmed.')
  process.exit(1)
}
console.log('\nSmoke test PASSED.')
