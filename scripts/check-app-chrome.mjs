/**
 * App-chrome lint guard (docs/app-chrome-brief.md §6).
 *
 * Forbids hand-rolled authenticated chrome outside AppHeader / AppActionBar.
 * Targets chrome *tokens and placement*, not every <header> (ConversationHeader,
 * in-hub titles, etc. stay allowed).
 *
 * Marketing Header.tsx is allowlisted — it is outside the app-shell system but
 * shares the brand-header tokens by design.
 *
 * Exit 0 = clean. Exit 1 = violations (blocking in CI).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')

/** Files allowed to declare sticky/cream app or marketing header chrome. */
const HEADER_ALLOW = new Set([
  'src/components/appShell/AppHeader.tsx',
  'src/components/appShell/AppShellHeader.tsx',
  'src/components/Header.tsx',
])

/** Files allowed to declare the mobile bottom nav / task action bar. */
const BAR_ALLOW = new Set(['src/components/appShell/AppActionBar.tsx'])

const HEADER_PATTERNS = [
  {
    id: 'brand-header-bg',
    re: /bg-\[var\(--brand-header-bg\)\]/,
    message: 'bg-[var(--brand-header-bg)] belongs only in AppHeader (or marketing Header)',
  },
  {
    id: 'data-app-shell-header',
    re: /data-app-shell-header/,
    message: 'data-app-shell-header belongs only in AppHeader',
  },
]

const BAR_PATTERNS = [
  {
    id: 'bottom-bar-brand-border',
    re: /border-t[^"'`\n]*border-\[var\(--brand-header-border\)\][^"'`\n]*sm:hidden|sm:hidden[^"'`\n]*border-t[^"'`\n]*border-\[var\(--brand-header-border\)\]/,
    message: 'mobile bottom bar with --brand-header-border belongs only in AppActionBar',
  },
  {
    id: 'bottom-bar-raw-hex',
    re: /border-t[^"'`\n]*border-\[#(?:E8E0CC|e8e0cc)\][^"'`\n]*sm:hidden|sm:hidden[^"'`\n]*border-t[^"'`\n]*border-\[#(?:E8E0CC|e8e0cc)\]/,
    message: 'mobile bottom bar with raw #E8E0CC belongs only in AppActionBar (prefer --brand-header-border)',
  },
  {
    id: 'deleted-bottom-nav-import',
    re: /from\s+['"][^'"]*(?:LandlordMobileBottomNav|RenterMobileBottomNav)['"]/,
    message: 'do not reintroduce LandlordMobileBottomNav / RenterMobileBottomNav — use AppActionBar',
  },
]

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(tsx|ts)$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')) {
      out.push(p)
    }
  }
  return out
}

function toPosix(rel) {
  return rel.split(sep).join('/')
}

function lineOf(source, index) {
  return source.slice(0, index).split(/\r?\n/).length
}

const files = walk(SRC)
const violations = []

for (const abs of files) {
  const rel = toPosix(relative(ROOT, abs))
  const source = readFileSync(abs, 'utf8')

  if (!HEADER_ALLOW.has(rel)) {
    for (const { id, re, message } of HEADER_PATTERNS) {
      re.lastIndex = 0
      let m
      while ((m = re.exec(source))) {
        violations.push({ file: rel, line: lineOf(source, m.index), id, message })
      }
    }
  }

  if (!BAR_ALLOW.has(rel)) {
    for (const { id, re, message } of BAR_PATTERNS) {
      re.lastIndex = 0
      let m
      while ((m = re.exec(source))) {
        violations.push({ file: rel, line: lineOf(source, m.index), id, message })
      }
    }
  }
}

if (violations.length) {
  console.error('App chrome lint guard failed (docs/app-chrome-brief.md §6):\n')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.id}] ${v.message}`)
  }
  console.error(`\n${violations.length} violation(s). Chrome must live in AppHeader / AppActionBar only.`)
  process.exit(1)
}

console.log('App chrome lint guard: ok')
