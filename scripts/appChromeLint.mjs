/**
 * App-chrome lint matchers (docs/app-chrome-brief.md).
 * Pure functions — used by the CLI and unit tests.
 */

/** @typedef {{ file: string, line: number, id: string, message: string }} ChromeViolation */

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

  return out
}
