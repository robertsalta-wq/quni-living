/**
 * Batch 2b: named sub-palettes + collapse remaining drift.
 * Run: node scripts/codemod-batch2b-hex.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'src')

/** @type {Record<string, { css: string, admin: string | null }>} */
const MAP = {
  // Trust ramp
  '376256': { css: '--quni-trust', admin: 'admin-trust' },
  '2a4a42': { css: '--quni-trust-hover', admin: 'admin-trust-hover' },
  '8fb9ab': { css: '--quni-trust-soft', admin: 'admin-trust-soft' },
  '5a8f7f': { css: '--quni-trust-text', admin: 'admin-trust-text' },
  f6faf8: { css: '--quni-trust-bg', admin: 'admin-trust-bg' },
  e1eae5: { css: '--quni-trust-bg', admin: 'admin-trust-bg' },
  e3eee9: { css: '--quni-trust-bg', admin: 'admin-trust-bg' },
  e8efe3: { css: '--quni-trust-bg', admin: 'admin-trust-bg' },
  // Rust
  d85a30: { css: '--quni-rust', admin: 'admin-rust' },
  // AI dark by role + accent
  d49ee8: { css: '--quni-ai-accent', admin: 'admin-ai-accent' },
  '0f0d0b': { css: '--quni-ai-dark', admin: 'admin-ai-dark' },
  '171310': { css: '--quni-ai-dark', admin: 'admin-ai-dark' },
  '1b1512': { css: '--quni-ai-dark-2', admin: 'admin-ai-dark-2' },
  '16120f': { css: '--quni-ai-dark-2', admin: 'admin-ai-dark-2' },
  '1a120f': { css: '--quni-ai-dark-2', admin: 'admin-ai-dark-2' },
  '120f0d': { css: '--quni-ai-dark-2', admin: 'admin-ai-dark-2' },
  '2a1713': { css: '--quni-ai-dark-3', admin: 'admin-ai-dark-3' },
  // Collapse greys -> ink
  '1a1a1a': { css: '--quni-ink', admin: 'admin-ink' },
  '222222': { css: '--quni-ink', admin: 'admin-ink' },
  '6b6b6b': { css: '--quni-ink-4', admin: 'admin-ink-4' },
  '6b7280': { css: '--quni-ink-4', admin: 'admin-ink-4' },
  '374151': { css: '--quni-ink-3', admin: 'admin-ink-3' },
  '999999': { css: '--quni-ink-5', admin: 'admin-ink-5' },
  '9a9a9a': { css: '--quni-ink-5', admin: 'admin-ink-5' },
  // Danger strong + bg
  b4322a: { css: '--quni-danger-strong', admin: 'admin-danger-strong' },
  fbebe9: { css: '--quni-danger-bg', admin: 'admin-danger-bg' },
  // Warning golds
  c99a00: { css: '--quni-warning', admin: 'admin-warning' },
  '8a6d00': { css: '--quni-warning-fg', admin: 'admin-warning-fg' },
  // Warm creams
  fbfaf7: { css: '--quni-surface-2', admin: 'admin-surface-2' },
  faf6ee: { css: '--quni-surface-2', admin: 'admin-surface-2' },
  f0efea: { css: '--quni-line-soft', admin: 'admin-line-soft' },
  f5edd8: { css: '--quni-surface-3', admin: 'admin-surface-3' },
  // Cool greys -> line
  c4bfcb: { css: '--quni-line', admin: 'admin-line' },
  e0dce3: { css: '--quni-line', admin: 'admin-line' },
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (p.includes(`${path.sep}lib${path.sep}documents`)) continue
      walk(p, out)
    } else if (
      /\.(tsx|ts)$/.test(ent.name) &&
      !ent.name.endsWith('.test.ts') &&
      !ent.name.endsWith('.test.tsx')
    ) {
      out.push(p)
    }
  }
  return out
}

function replaceArbitrary(content) {
  let n = 0
  const next = content.replace(
    /((?:[\w-]+:)*)([\w-]+)-\[#([0-9A-Fa-f]{6})\](?:\/(\d{1,3}))?/g,
    (full, variants, util, hex, opacity) => {
      const mapped = MAP[hex.toLowerCase()]
      if (!mapped) return full
      n++
      if (opacity != null && opacity !== '') {
        if (mapped.admin) return `${variants}${util}-${mapped.admin}/${opacity}`
        return `${variants}${util}-[var(${mapped.css})]/${opacity}`
      }
      return `${variants}${util}-[var(${mapped.css})]`
    },
  )
  return { content: next, count: n }
}

function replaceBareHex(content) {
  let n = 0
  const next = content.replace(/#([0-9A-Fa-f]{6})\b/g, (m, hex, offset) => {
    const mapped = MAP[hex.toLowerCase()]
    if (!mapped) return m
    const before = content.slice(Math.max(0, offset - 24), offset)
    if (/var\([^)]*$/.test(before)) return m
    n++
    return `var(${mapped.css})`
  })
  return { content: next, count: n }
}

let filesTouched = 0
let replacements = 0
for (const file of walk(SRC)) {
  const original = fs.readFileSync(file, 'utf8')
  let content = original
  let total = 0
  for (const step of [replaceArbitrary, replaceBareHex]) {
    const r = step(content)
    content = r.content
    total += r.count
  }
  if (content !== original) {
    fs.writeFileSync(file, content)
    filesTouched++
    replacements += total
  }
}

console.log(`Batch 2b replacements: ${replacements} across ${filesTouched} files`)
console.log('Mapped hexes:', Object.keys(MAP).length)
