/**
 * PR B: map brand hex literals to design tokens.
 *
 * - Tailwind util-[#HEX]/N -> util-admin-TOKEN/N (opacity-safe after PR A)
 * - Tailwind util-[#HEX] -> util-[var(--quni-TOKEN)]
 * - Bare / style / SVG hex strings -> var(--quni-TOKEN) (or --chart-* where noted)
 *
 * Scope: src ts/tsx except src/lib/documents
 * Does not touch quni-design-tokens.css or long-tail / #ff6b6b.
 *
 * Run: node scripts/codemod-hex-to-tokens.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'src')

/** @type {Record<string, { css: string, admin: string | null }>} */
const MAP = {
  ff6f61: { css: '--quni-coral', admin: 'admin-coral' },
  f2604f: { css: '--quni-coral-hover', admin: 'admin-coral-hover' },
  e85d52: { css: '--quni-coral-hover', admin: 'admin-coral-hover' },
  e8583a: { css: '--quni-coral-hover', admin: 'admin-coral-hover' },
  e85a4f: { css: '--quni-coral-hover', admin: 'admin-coral-hover' },
  e86357: { css: '--quni-coral-hover', admin: 'admin-coral-hover' },
  cc4a3c: { css: '--quni-coral-active', admin: 'admin-coral-active' },
  '1f2a44': { css: '--quni-navy', admin: 'admin-navy' },
  '1b2a4a': { css: '--quni-navy', admin: 'admin-navy' },
  '161e33': { css: '--quni-navy-hover', admin: null },
  '08060d': { css: '--quni-ink', admin: 'admin-ink' },
  '2a2433': { css: '--quni-ink-2', admin: 'admin-ink-2' },
  '4a4253': { css: '--quni-ink-3', admin: 'admin-ink-3' },
  '6b6375': { css: '--quni-ink-4', admin: 'admin-ink-4' },
  '908897': { css: '--quni-ink-5', admin: 'admin-ink-5' },
  e5e4e7: { css: '--quni-line', admin: 'admin-line' },
  efede9: { css: '--quni-line-soft', admin: 'admin-line-soft' },
  fef9e4: { css: '--quni-cream', admin: 'admin-cream' },
  e8e0cc: { css: '--quni-cream-border', admin: 'admin-cream-border' },
  '1d9e75': { css: '--quni-success', admin: 'admin-success' },
  '0f6e56': { css: '--quni-success-strong', admin: 'admin-success-fg' },
  e6f4ee: { css: '--quni-success-bg', admin: 'admin-success-bg' },
}

const KEEP_HEX = new Set([
  // Stripe + theme-color — var() unreliable
  'src/pages/Booking.tsx::colorPrimary',
  'src/components/landlord/LandlordListingPaymentModal.tsx::colorPrimary',
  'src/components/Seo.tsx::theme-color',
])

/** Chart overrides: file → hex → replacement string (including quotes if needed) */
const CHART = {
  'src/components/admin/primitives/Sparkline.tsx': {
    ff6f61: "'var(--chart-1)'",
    '1f2a44': "'var(--chart-2)'",
  },
  'src/pages/admin/AdminPayments.tsx': {
    ff6f61: '"var(--chart-1)"',
  },
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (p.includes(`${path.sep}lib${path.sep}documents`)) continue
      walk(p, out)
    } else if (/\.(tsx|ts)$/.test(ent.name)) out.push(p)
  }
  return out
}

function relPosix(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/')
}

function shouldKeepLiteral(rel, line) {
  if (/colorPrimary\s*:\s*['"]#[0-9A-Fa-f]{6}/.test(line) && KEEP_HEX.has(`${rel}::colorPrimary`)) {
    return true
  }
  if (
    /name=["']theme-color["']/.test(line) &&
    /content=["']#[0-9A-Fa-f]{6}/.test(line) &&
    KEEP_HEX.has(`${rel}::theme-color`)
  ) {
    return true
  }
  return false
}

/**
 * Replace Tailwind arbitrary hex utilities.
 * e.g. hover:bg-[#FF6F61]/30 → hover:bg-admin-coral/30
 *      text-[#6B6375] → text-[var(--quni-ink-4)]
 */
function replaceArbitrary(content) {
  let n = 0
  const next = content.replace(
    /((?:[\w-]+:)*)([\w-]+)-\[#([0-9A-Fa-f]{6})\](?:\/(\d{1,3}))?/g,
    (full, variants, util, hex, opacity) => {
      const key = hex.toLowerCase()
      const mapped = MAP[key]
      if (!mapped) return full
      n++
      if (opacity != null && opacity !== '') {
        if (mapped.admin) {
          return `${variants}${util}-${mapped.admin}/${opacity}`
        }
        // No admin alias (e.g. navy-hover) — fall back to broken form is bad;
        // use color-mix arbitrary instead.
        return `${variants}${util}-[color-mix(in_srgb,var(${mapped.css})_calc(100%*${Number(opacity) / 100}),transparent)]`
      }
      return `${variants}${util}-[var(${mapped.css})]`
    },
  )
  return { content: next, count: n }
}

/**
 * Replace remaining #HEX in string/attr contexts (not already var()).
 * Skips keep-literal lines; applies chart overrides.
 */
function replaceBareHex(content, rel) {
  let n = 0
  const lines = content.split(/(\r?\n)/)
  const chart = CHART[rel]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\r?\n$/.test(line)) continue
    if (shouldKeepLiteral(rel, line)) continue

    let updated = line

    // Chart-specific first (exact hex → chart token)
    if (chart) {
      updated = updated.replace(/#([0-9A-Fa-f]{6})\b/g, (m, hex) => {
        const key = hex.toLowerCase()
        if (!(key in chart)) return m
        // Only replace when it's a quoted/attr value still using hex
        n++
        const rep = chart[key]
        // If match is inside quotes already, chart[key] includes quotes — strip surrounding
        return m
      })
      // More precise: replace '#HEX' or "#HEX" or ="#HEX"
      for (const [hex, rep] of Object.entries(chart)) {
        const re = new RegExp(`(['"])#${hex}\\1`, 'gi')
        updated = updated.replace(re, () => {
          n++
          // rep already quoted
          return rep
        })
        const reAttr = new RegExp(`(fill|stroke)=["']#${hex}["']`, 'gi')
        updated = updated.replace(reAttr, (_, attr) => {
          n++
          const inner = rep.replace(/^['"]|['"]$/g, '')
          return `${attr}="${inner}"`
        })
      }
    }

    updated = updated.replace(/#([0-9A-Fa-f]{6})\b/g, (m, hex, offset) => {
      const key = hex.toLowerCase()
      const mapped = MAP[key]
      if (!mapped) return m
      // Skip if already part of var(--…) or color-mix
      const before = updated.slice(Math.max(0, offset - 20), offset)
      if (/var\([^)]*$/.test(before)) return m
      if (/\[var\(/.test(before)) return m
      // Skip inside Tailwind arbitrary we already converted (shouldn't remain)
      if (/-\[[^\]]*$/.test(before) && !/color-mix/.test(before)) {
        // still hex in arbitrary — leave for safety (shouldn't happen)
      }
      // Skip comments that only document the token file? Still replace for cleanliness.
      n++
      return `var(${mapped.css})`
    })

    // Fix over-replacement: var() inside already-quoted strings that became
    // 'var(--x)' from '#x' is correct. But CSS-in-JS `color: #E8583A` → `color: var(...)` OK.
    // Problem: `content="#FF6F61"` kept by shouldKeepLiteral.
    // Problem: hex in URLs? unlikely for these values.

    // Undo if we replaced inside a keep scenario that spans oddly
    if (shouldKeepLiteral(rel, updated) && updated !== line) {
      // restore original hex on that line if keep
      continue
    }

    // Fix double-var: if we had '#FF6F61' → replacement produced var() without quotes
    // when original was quoted: '#FF6F61' → 'var(--quni-coral)' needs the quotes preserved.
    // Current replace of #HEX inside '#FF6F61' gives 'var(--quni-coral)' — good.
    // Unquoted #HEX in CSS `color: #E8583A` → `color: var(--quni-coral-hover)` — good.

    lines[i] = updated
  }

  return { content: lines.join(''), count: n }
}

function transformFile(file) {
  const rel = relPosix(file)
  const original = fs.readFileSync(file, 'utf8')
  let content = original
  let total = 0

  const a = replaceArbitrary(content)
  content = a.content
  total += a.count

  const b = replaceBareHex(content, rel)
  content = b.content
  total += b.count

  if (content !== original) {
    fs.writeFileSync(file, content)
  }
  return total
}

const files = walk(SRC)
let filesTouched = 0
let replacements = 0
for (const f of files) {
  const n = transformFile(f)
  if (n > 0) {
    filesTouched++
    replacements += n
  }
}

console.log(`Replacements: ${replacements} across ${filesTouched} files`)
