/**
 * Fail CI if dated Anthropic snapshot model IDs creep back into the repo.
 * Usage: node scripts/check-anthropic-model-ids.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SCAN_DIRS = ['api', 'supabase/functions', 'src']
const DATED_MODEL_RE = /claude-[a-z0-9.-]+-20[0-9]{6}/gi

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      walk(full, files)
    } else if (/\.(ts|tsx|js|mjs)$/.test(name)) {
      files.push(full)
    }
  }
  return files
}

const hits = []
for (const rel of SCAN_DIRS) {
  for (const file of walk(path.join(ROOT, rel))) {
    const text = fs.readFileSync(file, 'utf8')
    const matches = text.match(DATED_MODEL_RE)
    if (matches) {
      hits.push({ file: path.relative(ROOT, file), models: [...new Set(matches)] })
    }
  }
}

if (hits.length > 0) {
  console.error('Found deprecated dated Anthropic model IDs:')
  for (const h of hits) {
    console.error(`  ${h.file}: ${h.models.join(', ')}`)
  }
  console.error('\nUse ANTHROPIC_SONNET_MODEL from api/lib/anthropicModel.ts instead.')
  process.exit(1)
}

console.log('OK: no dated Anthropic model snapshot IDs in api/, supabase/functions/, or src/')
