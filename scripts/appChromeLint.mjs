/**
 * App-chrome lint matchers (docs/app-chrome-brief.md).
 * Pure functions — used by the CLI and unit tests.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** @typedef {{ file: string, line: number, id: string, message: string }} ChromeViolation */

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {Set<string>} */
const ARBITRARY_HEX_LEGACY = new Set(
  JSON.parse(readFileSync(join(__dirname, 'arbitraryHexLegacy.json'), 'utf8')).files,
)

/** Sole owner of header geometry (marketing reference). */
export const HEADER_GEOMETRY_ALLOW = new Set(['src/components/ChromeHeaderShell.tsx'])

/** Files allowed to declare the mobile bottom nav / page action bar. */
export const BAR_ALLOW = new Set(['src/components/appShell/AppActionBar.tsx'])

/** @deprecated Prefer HEADER_GEOMETRY_ALLOW */
export const HEADER_ALLOW = HEADER_GEOMETRY_ALLOW

const HEADER_PATTERNS = [
  {
    id: 'brand-header-bg',
    re: /bg-\[var\(--brand-header-bg\)\]/g,
    message: 'bg-[var(--brand-header-bg)] belongs only in ChromeHeaderShell',
  },
  {
    id: 'chrome-header-shell-attr',
    re: /data-chrome-header-shell/g,
    message: 'data-chrome-header-shell belongs only in ChromeHeaderShell',
  },
]

const BAR_PATTERNS = [
  {
    id: 'bottom-bar-brand-border',
    re: /border-t[^"'`\n]*border-\[var\(--brand-header-border\)\][^"'`\n]*sm:hidden|sm:hidden[^"'`\n]*border-t[^"'`\n]*border-\[var\(--brand-header-border\)\]/g,
    message: 'mobile bottom bar with --brand-header-border belongs only in AppActionBar',
  },
  {
    id: 'bottom-bar-placement',
    re: /border-t[^"'`\n]*sm:hidden|sm:hidden[^"'`\n]*border-t/g,
    message: 'border-t + sm:hidden bottom bar belongs only in AppActionBar',
  },
  {
    id: 'deleted-bottom-nav-import',
    re: /from\s+['"][^'"]*(?:LandlordMobileBottomNav|RenterMobileBottomNav)['"]/g,
    message: 'do not reintroduce LandlordMobileBottomNav / RenterMobileBottomNav — use AppActionBar',
  },
]

const SHARED_CHROME_TOKEN = {
  id: 'brand-header-border',
  re: /border-\[var\(--brand-header-border\)\]/g,
  message:
    'border-[var(--brand-header-border)] belongs only in ChromeHeaderShell or AppActionBar',
}

/**
 * Always-on design-token guards.
 * Tailwind arbitrary-hex (border-[#E5E4E7]) slipped past bare-hex checks — ban it here.
 */
export const patterns = [
  {
    id: 'tailwind-arbitrary-hex',
    re: /-\[#[0-9A-Fa-f]{3,8}\]/g,
    message:
      'Tailwind arbitrary-hex colour (e.g. border-[#E5E4E7], bg-[#fff]) is banned — use design tokens (var(--quni-*)) or a class in src/styles/quni-design-tokens.css',
  },
]

/** Batch-1 brand hexes — fully tokenized; must not return as literals in UI code. */
const BATCH1_CANONICAL_HEX = new Set(
  [
    'ff6f61',
    'f2604f',
    'e85d52',
    'e8583a',
    'e85a4f',
    'e86357',
    'cc4a3c',
    '1f2a44',
    '1b2a4a',
    '161e33',
    '08060d',
    '2a2433',
    '4a4253',
    '6b6375',
    '908897',
    'e5e4e7',
    'efede9',
    'fef9e4',
    'e8e0cc',
    '1d9e75',
    '0f6e56',
    'e6f4ee',
  ].map((h) => h.toLowerCase()),
)

const BATCH1_HEX_RE = /#([0-9A-Fa-f]{6})\b/g

const BATCH1_HEX_MESSAGE =
  'canonical brand colour as a literal — use the token (var(--quni-*) / --chart-*) or the admin-* utility'

function isDocumentsPath(relPath) {
  return relPath === 'src/lib/documents' || relPath.startsWith('src/lib/documents/')
}

/** Stripe colorPrimary and <meta name="theme-color"> may keep literal coral. */
function isBatch1HexAllowlistedLine(line) {
  if (/colorPrimary/.test(line)) return true
  if (/name\s*=\s*['"]theme-color['"]/.test(line)) return true
  return false
}

/**
 * @param {string} source
 * @param {string} file
 * @param {ChromeViolation[]} out
 */
function collectBatch1CanonicalHex(source, file, out) {
  if (isDocumentsPath(file)) return
  const lines = source.split(/\r?\n/)
  BATCH1_HEX_RE.lastIndex = 0
  let m
  while ((m = BATCH1_HEX_RE.exec(source))) {
    const hex = m[1].toLowerCase()
    if (!BATCH1_CANONICAL_HEX.has(hex)) continue
    const lineNo = lineOf(source, m.index)
    const line = lines[lineNo - 1] ?? ''
    if (isBatch1HexAllowlistedLine(line)) continue
    out.push({
      file,
      line: lineNo,
      id: 'batch1-canonical-hex',
      message: BATCH1_HEX_MESSAGE,
    })
  }
}

function lineOf(source, index) {
  return source.slice(0, index).split(/\r?\n/).length
}

function collect(source, file, patternList, out) {
  for (const { id, re, message } of patternList) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(source))) {
      out.push({ file, line: lineOf(source, m.index), id, message })
    }
  }
}

function collectHeaderSafeAreaPlacement(source, file, out) {
  const re = /['"`]([^'"`]{0,800})['"`]/g
  let m
  while ((m = re.exec(source))) {
    const s = m[1] ?? ''
    if (!s.includes('pt-safe-top')) continue
    if (!/\bz-50\b/.test(s)) continue
    if (!s.includes('border-b')) continue
    out.push({
      file,
      line: lineOf(source, m.index),
      id: 'header-safe-area-placement',
      message: 'pt-safe-top + z-50 + border-b top chrome belongs only in ChromeHeaderShell',
    })
  }
}

/**
 * @param {string} relPath
 * @param {string} source
 * @returns {ChromeViolation[]}
 */
export function findChromeViolations(relPath, source) {
  /** @type {ChromeViolation[]} */
  const out = []
  const headerOk = HEADER_GEOMETRY_ALLOW.has(relPath)
  const barOk = BAR_ALLOW.has(relPath)

  if (!headerOk) {
    collect(source, relPath, HEADER_PATTERNS, out)
    collectHeaderSafeAreaPlacement(source, relPath, out)
  }

  if (!barOk) {
    collect(source, relPath, BAR_PATTERNS, out)
  }

  if (!headerOk && !barOk) {
    collect(source, relPath, [SHARED_CHROME_TOKEN], out)
  }

  // Design-token guards — always on (not chrome allowlisted).
  // Legacy files are grandfathered until tokenized; new files must not use -[#hex].
  if (!ARBITRARY_HEX_LEGACY.has(relPath)) {
    collect(source, relPath, patterns, out)
  }

  // Batch-1 brand hexes — always on (documents + Stripe/theme-color line allowlist).
  collectBatch1CanonicalHex(source, relPath, out)

  return out
}
