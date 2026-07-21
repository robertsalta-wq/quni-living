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

/** @type {Set<string>} */
const CONTAINER_LEGACY = new Set(
  JSON.parse(readFileSync(join(__dirname, 'containerLegacy.json'), 'utf8')).files,
)

/** @type {Set<string>} */
const MODAL_LEGACY = new Set(
  JSON.parse(readFileSync(join(__dirname, 'modalLegacy.json'), 'utf8')).files,
)

/**
 * React wrappers that own `.quni-card` composition (tone/pad/sticky on top).
 * CSS definition lives in quni-design-tokens.css (not scanned by this CLI).
 */
export const CONTAINER_PRIMITIVE_ALLOW = new Set([
  'src/components/ui/Section.tsx',
  'src/components/booking/review/BookingReviewSummaryStrip.tsx',
  'src/components/booking/review/BookingReviewActionCard.tsx',
])

/**
 * React wrappers that own `.quni-modal` composition (mobile un-elevate, etc.).
 * CSS definition lives in quni-design-tokens.css (not scanned by this CLI).
 */
export const MODAL_PRIMITIVE_ALLOW = new Set([
  'src/components/legal/LegalDocumentModal.tsx',
])

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

/** Tokenized brand hexes — must not return as literals in UI code. */
const CANONICAL_BRAND_HEX = new Set(
  [
    // Batch 1
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
    // Batch 2
    'ff6b6b',
    'f4f3ec',
    'f8f6f1',
    'fef3c7',
    'fef2f2',
    'f1eeea',
    '0d5c4a',
    'fff8f0',
    'fff5f4',
    'fff5f5',
    'd8d3c7',
    // Batch 2b — trust / rust / ai-dark / collapse
    '376256',
    '2a4a42',
    '8fb9ab',
    '5a8f7f',
    'f6faf8',
    'e1eae5',
    'e3eee9',
    'e8efe3',
    'd85a30',
    'd49ee8',
    '0f0d0b',
    '171310',
    '1b1512',
    '16120f',
    '1a120f',
    '120f0d',
    '2a1713',
    '1a1a1a',
    '222222',
    '6b6b6b',
    '6b7280',
    '374151',
    '999999',
    '9a9a9a',
    'b4322a',
    'fbebe9',
    'c99a00',
    '8a6d00',
    'fbfaf7',
    'faf6ee',
    'f0efea',
    'f5edd8',
    'c4bfcb',
    'e0dce3',
  ].map((h) => h.toLowerCase()),
)

const CANONICAL_HEX_RE = /#([0-9A-Fa-f]{6})\b/g

const CANONICAL_HEX_MESSAGE =
  'canonical brand colour as a literal — use the token (var(--quni-*) / --chart-*) or the admin-* utility'

function isDocumentsPath(relPath) {
  return relPath === 'src/lib/documents' || relPath.startsWith('src/lib/documents/')
}

/** Stripe colorPrimary and <meta name="theme-color"> may keep literal coral. */
function isCanonicalHexAllowlistedLine(line) {
  if (/colorPrimary/.test(line)) return true
  if (/name\s*=\s*['"]theme-color['"]/.test(line)) return true
  return false
}

/**
 * @param {string} source
 * @param {string} file
 * @param {ChromeViolation[]} out
 */
function collectCanonicalBrandHex(source, file, out) {
  if (isDocumentsPath(file)) return
  const lines = source.split(/\r?\n/)
  CANONICAL_HEX_RE.lastIndex = 0
  let m
  while ((m = CANONICAL_HEX_RE.exec(source))) {
    const hex = m[1].toLowerCase()
    if (!CANONICAL_BRAND_HEX.has(hex)) continue
    const lineNo = lineOf(source, m.index)
    const line = lines[lineNo - 1] ?? ''
    if (isCanonicalHexAllowlistedLine(line)) continue
    out.push({
      file,
      line: lineNo,
      id: 'canonical-brand-hex',
      message: CANONICAL_HEX_MESSAGE,
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

const HAND_ROLLED_CARD_MESSAGE =
  'Hand-rolled card chrome (rounded + border + white/surface + shadow + padding) is banned — use .quni-card (or .quni-modal / admin Card). See container system C2/C-lint.'

/**
 * True when a class string looks like a hand-rolled elevated content card.
 * Requires a block-padding tell (`p-*` / `px-*` / …) to reduce button/input noise.
 * @param {string} s
 */
export function classLooksLikeHandRolledCard(s) {
  if (/\bquni-card\b/.test(s) || /\bquni-dashboard-panel\b/.test(s) || /\bquni-modal\b/.test(s)) {
    return false
  }
  if (!/\brounded-/.test(s)) return false
  if (!/\bborder\b/.test(s)) return false
  if (
    !/\bbg-white\b/.test(s) &&
    !/\bbg-\[var\(--quni-surface-1\)\]/.test(s) &&
    !/\bbg-admin-surface-1\b/.test(s)
  ) {
    return false
  }
  if (!/\bshadow(?:-|\b|\[)/.test(s)) return false
  // Container tell: padding utility (not bare `p` in other words).
  if (!/(?:^|[\s:])(?:sm:|md:|lg:|xl:)?p(?:[xytbrl])?(?:-\d|-\[[^\]]+\])/.test(s)) return false
  return true
}

function collectHandRolledCard(source, file, out) {
  const re = /['"`]([^'"`]{0,900})['"`]/g
  let m
  while ((m = re.exec(source))) {
    const s = m[1] ?? ''
    if (!classLooksLikeHandRolledCard(s)) continue
    out.push({
      file,
      line: lineOf(source, m.index),
      id: 'hand-rolled-card',
      message: HAND_ROLLED_CARD_MESSAGE,
    })
  }
}

const HAND_ROLLED_MODAL_MESSAGE =
  'Hand-rolled modal chrome (rounded + border + white/surface + shadow-xl|2xl|admin-modal + z-10/max-w) is banned — use .quni-modal. See container system C3 / modal lint.'

/**
 * True when a class string looks like a hand-rolled dialog panel (heavier than a card).
 * Dialog tell: `z-10` or `max-w-*` — reduces dropdown/drawer noise.
 * @param {string} s
 */
export function classLooksLikeHandRolledModal(s) {
  if (/\bquni-modal\b/.test(s) || /\bquni-card\b/.test(s) || /\bquni-dashboard-panel\b/.test(s)) {
    return false
  }
  if (!/\brounded-/.test(s)) return false
  if (!/\bborder\b/.test(s)) return false
  if (
    !/\bbg-white\b/.test(s) &&
    !/\bbg-\[var\(--quni-surface-1\)\]/.test(s) &&
    !/\bbg-admin-surface-1\b/.test(s)
  ) {
    return false
  }
  if (!/\bshadow-(?:xl|2xl|admin-modal)\b/.test(s)) return false
  if (!/\bz-10\b/.test(s) && !/\bmax-w-/.test(s)) return false
  return true
}

function collectHandRolledModal(source, file, out) {
  const re = /['"`]([^'"`]{0,900})['"`]/g
  let m
  while ((m = re.exec(source))) {
    const s = m[1] ?? ''
    if (!classLooksLikeHandRolledModal(s)) continue
    out.push({
      file,
      line: lineOf(source, m.index),
      id: 'hand-rolled-modal',
      message: HAND_ROLLED_MODAL_MESSAGE,
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

  // Canonical brand hexes — always on (documents + Stripe/theme-color line allowlist).
  collectCanonicalBrandHex(source, relPath, out)

  // Container system — hand-rolled cards banned outside primitives + grandfather list.
  if (!CONTAINER_PRIMITIVE_ALLOW.has(relPath) && !CONTAINER_LEGACY.has(relPath)) {
    collectHandRolledCard(source, relPath, out)
  }

  // Container system — hand-rolled modal panels banned outside .quni-modal + grandfather list.
  if (!MODAL_PRIMITIVE_ALLOW.has(relPath) && !MODAL_LEGACY.has(relPath)) {
    collectHandRolledModal(source, relPath, out)
  }

  return out
}
