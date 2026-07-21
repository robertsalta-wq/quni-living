/**
 * Batch 2: map high-value remaining hex + exact rgba tints to tokens.
 *
 * In scope:
 * - Exact matches to existing tokens (surfaces, warning/danger bg, deferred)
 * - #ff6b6b -> coral (AI UI drift)
 * - #0d5c4a -> success-strong (hover drift)
 * - #fff8f0 / #fff5f4 / #fff5f5 -> --quni-coral-soft (new)
 * - #d8d3c7 -> --quni-input-border (new)
 * - Exact rgba(255,111,97 / 31,42,68) tint literals -> tint tokens
 *
 * Out of scope (leave): social/brand logos, marketing one-offs, FT6600 #d85a30,
 * chart palettes, Landlord AI dark theme, test probes, documents.
 *
 * Run: node scripts/codemod-batch2-hex.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'src')

/** @type {Record<string, { css: string, admin: string | null }>} */
const MAP = {
  // Exact existing tokens
  f4f3ec: { css: '--quni-surface-3', admin: 'admin-surface-3' },
  f8f6f1: { css: '--quni-surface-2', admin: 'admin-surface-2' },
  fef3c7: { css: '--quni-warning-bg', admin: 'admin-warning-bg' },
  fef2f2: { css: '--quni-danger-bg', admin: 'admin-danger-bg' },
  f1eeea: { css: '--quni-lifecycle-deferred-bg', admin: null },
  // Drift / high-frequency
  ff6b6b: { css: '--quni-coral', admin: 'admin-coral' },
  '0d5c4a': { css: '--quni-success-strong', admin: 'admin-success-fg' },
  // New tokens
  fff8f0: { css: '--quni-coral-soft', admin: 'admin-coral-soft' },
  fff5f4: { css: '--quni-coral-soft', admin: 'admin-coral-soft' },
  fff5f5: { css: '--quni-coral-soft', admin: 'admin-coral-soft' },
  d8d3c7: { css: '--quni-input-border', admin: 'admin-input-border' },
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (p.includes(`${path.sep}lib${path.sep}documents`)) continue
      walk(p, out)
    } else if (/\.(tsx|ts)$/.test(ent.name) && !ent.name.endsWith('.test.ts') && !ent.name.endsWith('.test.tsx')) {
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

function replaceRgba(content) {
  let n = 0
  let next = content

  const pairs = [
    {
      lit: /rgba\(\s*255\s*,\s*111\s*,\s*97\s*,\s*0\.08\s*\)/gi,
      css: 'var(--quni-coral-tint)',
      bgAdmin: 'admin-coral-tint',
    },
    {
      lit: /rgba\(\s*255\s*,\s*111\s*,\s*97\s*,\s*0\.15\s*\)/gi,
      css: 'var(--quni-coral-tint-15)',
      bgAdmin: 'admin-coral-tint-15',
    },
    {
      lit: /rgba\(\s*255\s*,\s*111\s*,\s*97\s*,\s*0\.25\s*\)/gi,
      css: 'var(--quni-coral-border)',
      bgAdmin: null,
    },
    {
      lit: /rgba\(\s*31\s*,\s*42\s*,\s*68\s*,\s*0\.08\s*\)/gi,
      css: 'var(--quni-navy-tint)',
      bgAdmin: 'admin-navy-tint',
    },
  ]

  for (const { lit, css, bgAdmin } of pairs) {
    // bg-[rgba(...)] -> bg-admin-*-tint
    if (bgAdmin) {
      const bgRe = new RegExp(
        `((?:[\\w-]+:)*)bg-\\[${lit.source}\\]`,
        lit.flags.includes('i') ? 'gi' : 'g',
      )
      next = next.replace(bgRe, (_, variants) => {
        n++
        return `${variants}bg-${bgAdmin}`
      })
    }
    next = next.replace(lit, () => {
      n++
      return css
    })
  }
  return { content: next, count: n }
}


let filesTouched = 0
let replacements = 0
for (const file of walk(SRC)) {
  const original = fs.readFileSync(file, 'utf8')
  let content = original
  let total = 0
  for (const step of [replaceArbitrary, replaceBareHex, replaceRgba]) {
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

console.log(`Batch 2 replacements: ${replacements} across ${filesTouched} files`)
