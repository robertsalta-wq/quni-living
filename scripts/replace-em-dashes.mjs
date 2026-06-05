/**
 * Replace em dashes (U+2014) with human-style punctuation.
 * Run: node scripts/replace-em-dashes.mjs
 * Check: node scripts/replace-em-dashes.mjs --check
 */
import fs from 'node:fs'
import path from 'node:path'

const EM = '\u2014'
const ROOT = path.resolve(import.meta.dirname, '..')
const CHECK_ONLY = process.argv.includes('--check')

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.vercel',
  'coverage',
  'scripts/test-official-form-spike',
])

const TEXT_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.html',
  '.css',
  '.sql',
  '.mjs',
  '.cjs',
  '.toml',
  '.txt',
])

function shouldSkipDir(name) {
  return SKIP_DIRS.has(name)
}

function transform(content) {
  if (!content.includes(EM)) return content

  let out = content

  // Empty / missing-value placeholders: '-' or "-"
  out = out.replaceAll(`'${EM}'`, "'-'")
  out = out.replaceAll(`"${EM}"`, '"-"')

  // Prose and headings: spaced em dash → spaced hyphen
  out = out.replaceAll(` ${EM} `, ' - ')

  // Comment / label suffix without trailing space (e.g. "Foo - bar\n")
  out = out.replaceAll(`${EM} `, '- ')

  // Prefix glued to next token (e.g. "PART A-Title")
  out = out.replaceAll(`${EM}`, '-')

  return out
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const allowDotfile = entry.name === '.env.example' || entry.name === '.gitignore'
    if (entry.name.startsWith('.') && !allowDotfile && entry.name !== '.cursor') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue
      walk(full, files)
      continue
    }
    const ext = path.extname(entry.name).toLowerCase()
    if (!TEXT_EXT.has(ext)) continue
    files.push(full)
  }
  return files
}

const files = walk(ROOT)
let changed = 0
let remaining = 0
const remainingFiles = []

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8')
  if (!raw.includes(EM)) continue

  const next = transform(raw)
  if (next !== raw) {
    changed++
    if (!CHECK_ONLY) fs.writeFileSync(file, next, 'utf8')
  }

  if (next.includes(EM)) {
    remaining++
    remainingFiles.push(path.relative(ROOT, file))
  }
}

if (CHECK_ONLY) {
  if (remaining > 0) {
    console.error(`Found em dashes in ${remaining} file(s):`)
    for (const f of remainingFiles.slice(0, 20)) console.error(`  ${f}`)
    if (remainingFiles.length > 20) console.error(`  ... and ${remainingFiles.length - 20} more`)
    process.exit(1)
  }
  console.log('No em dashes found.')
} else {
  console.log(`Updated ${changed} file(s).`)
  if (remaining > 0) {
    console.warn(`Still contains em dashes: ${remainingFiles.join(', ')}`)
  }
}
