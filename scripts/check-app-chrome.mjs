/**
 * App-chrome lint guard CLI (docs/app-chrome-brief.md §6).
 * Blocking CI: `npm run lint:app-chrome`.
 *
 * Scans src for hand-rolled chrome outside AppHeader / AppActionBar.
 * Matching logic lives in ./appChromeLint.mjs (unit-tested).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { findChromeViolations } from './appChromeLint.mjs'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')

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

const violations = []
for (const abs of walk(SRC)) {
  const rel = toPosix(relative(ROOT, abs))
  const source = readFileSync(abs, 'utf8')
  violations.push(...findChromeViolations(rel, source))
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
