/**
 * App-chrome lint matchers (docs/app-chrome-brief.md §6).
 * Pure functions — used by the CLI and unit tests. Zero colour literals.
 */

/** @typedef {{ file: string, line: number, id: string, message: string }} ChromeViolation */

/** Files allowed to declare sticky/cream app or marketing header chrome. */
export const HEADER_ALLOW = new Set([
  'src/components/appShell/AppHeader.tsx',
  'src/components/Header.tsx',
])

/** Files allowed to declare the mobile bottom nav / task action bar. */
export const BAR_ALLOW = new Set(['src/components/appShell/AppActionBar.tsx'])

const HEADER_PATTERNS = [
  {
    id: 'brand-header-bg',
    re: /bg-\[var\(--brand-header-bg\)\]/g,
    message: 'bg-[var(--brand-header-bg)] belongs only in AppHeader (or marketing Header)',
  },
  {
    id: 'data-app-shell-header',
    re: /data-app-shell-header/g,
    message: 'data-app-shell-header belongs only in AppHeader',
  },
]

const BAR_PATTERNS = [
  {
    id: 'bottom-bar-brand-border',
    re: /border-t[^"'`\n]*border-\[var\(--brand-header-border\)\][^"'`\n]*sm:hidden|sm:hidden[^"'`\n]*border-t[^"'`\n]*border-\[var\(--brand-header-border\)\]/g,
    message: 'mobile bottom bar with --brand-header-border belongs only in AppActionBar',
  },
  /**
   * Placement: classic mobile bottom chrome shape (border-t + sm:hidden) outside the shell.
   * Property Apply bar uses md:hidden — intentionally not matched.
   */
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
    'border-[var(--brand-header-border)] belongs only in AppHeader, AppActionBar, or marketing Header',
}

function lineOf(source, index) {
  return source.slice(0, index).split(/\r?\n/).length
}

function collect(source, file, patterns, out) {
  for (const { id, re, message } of patterns) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(source))) {
      out.push({ file, line: lineOf(source, m.index), id, message })
    }
  }
}

/**
 * Placement: quoted class strings that combine pt-safe-top + z-50 + border-b
 * (order-independent). Skips ConversationHeader (no pt-safe-top/z-50) and
 * marketing AI landings (no pt-safe-top).
 */
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
      message:
        'pt-safe-top + z-50 + border-b top chrome belongs only in AppHeader (or marketing Header)',
    })
  }
}

/**
 * Find chrome-guard violations in one file.
 * @param {string} relPath posix path from repo root (e.g. src/components/Foo.tsx)
 * @param {string} source file contents
 * @returns {ChromeViolation[]}
 */
export function findChromeViolations(relPath, source) {
  /** @type {ChromeViolation[]} */
  const out = []
  const headerOk = HEADER_ALLOW.has(relPath)
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

  return out
}
