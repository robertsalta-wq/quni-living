/**
 * Build src/lib/documents/vic/form1Content.ts from the official CAV Form 1 Word document.
 *
 * Source: docs/vic/form-1-residential-rental-agreement.docx
 * (Consumer Affairs Victoria — in-force prescribed form, updated 25 Nov 2025 reforms)
 *
 * Run: node scripts/build-vic-form1-content.mjs [path-to.docx]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mammoth from 'mammoth'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const defaultDocx = join(root, 'docs/vic/form-1-residential-rental-agreement.docx')

const MARKER_PART_A = 'Part A – Basic terms'
const MARKER_PART_B = 'Part B – Standard terms'
const MARKER_HELP = 'Help or further information'

const docxPath = process.argv[2] || defaultDocx
const extractionFlags = []

/** Markdown → plain text for PDF clause bodies (preserve prescribed wording). */
function markdownToPlain(md) {
  let t = md
  t = t.replace(/!\[[^\]]*]\([^)]+\)/g, '[EXTRACTION_FLAG: CAV logo/image omitted from prescribed text embed]')
  t = t.replace(/\[([^\]]+)]\((?:https?:\/\/|mailto:)[^)]+\)/g, '$1')
  t = t.replace(/<a id="[^"]*"><\/a>/g, '')
  t = t.replace(/^#{1,6}\s+/gm, '')
  t = t.replace(/\*\*/g, '')
  t = t.replace(/__/g, '')
  t = t.replace(/\\([\\.()$\[\]-])/g, '$1')
  t = t.replace(/\\-/g, '-')
  t = t.replace(/<a id="Check\d+"><\/a>\s*/g, '[ ] ')
  if (/\n\s*z\s*\n/.test(t)) {
    extractionFlags.push({
      section: 'Part A item 5 (Length of agreement)',
      issue: 'Stray "z" character from Word form field — removed from extract; verify against CAV PDF.',
    })
    t = t.replace(/\n\s*z\s*\n/g, '\n')
  }
  t = t.replace(/\n{3,}/g, '\n\n')
  return t.trim()
}

function tsStringLiteral(value) {
  return JSON.stringify(value)
}

const buf = readFileSync(docxPath)
const { value: md, messages } = await mammoth.convertToMarkdown({ buffer: buf })
mkdirSync(join(root, 'docs/vic'), { recursive: true })
writeFileSync(join(root, 'docs/vic/form-1-extracted-from-cav.md'), md)

for (const m of messages) {
  extractionFlags.push({ section: 'mammoth', issue: `${m.type}: ${m.message}` })
}

const plain = markdownToPlain(md)

const idxPartA = plain.indexOf(MARKER_PART_A)
const idxPartB = plain.indexOf(MARKER_PART_B)
const idxHelp = plain.indexOf(MARKER_HELP)

if (idxPartA < 0) extractionFlags.push({ section: MARKER_PART_A, issue: 'Start marker not found' })
if (idxPartB < 0) extractionFlags.push({ section: MARKER_PART_B, issue: 'Start marker not found' })
if (idxHelp < 0) extractionFlags.push({ section: MARKER_HELP, issue: 'End marker not found — using full tail after Part B' })

const intro = idxPartA >= 0 ? plain.slice(0, idxPartA).trim() : ''
const partAStatic =
  idxPartA >= 0 && idxPartB >= 0 ? plain.slice(idxPartA, idxPartB).trim() : ''
const partBThroughE =
  idxPartB >= 0
    ? plain.slice(idxPartB, idxHelp >= 0 ? idxHelp : plain.length).trim()
    : ''

extractionFlags.push({
  section: 'Part A fields 1–7',
  issue:
    'Address/postcode/phone/email and tick-box rows are table cells in the .docx; mammoth emits labels on separate lines. Populated values are rendered in the PDF schedule (form1Generator.tsx), not by filling [insert] tokens in this extract.',
})
extractionFlags.push({
  section: 'Part B item 8 (payment methods)',
  issue:
    'Checkbox list (direct debit, bank deposit, cash, etc.) extracts as separate lines; PDF schedule ticks bank deposit + electronic payment explicitly.',
})
extractionFlags.push({
  section: 'Part B items 9.1 / 9.2 (electronic service)',
  issue:
    'Per-renter Yes/No checkbox grids are multi-column tables; extract has sequential Yes/No lines — schedule uses consolidated Yes/No with emails.',
})
extractionFlags.push({
  section: 'Part C item 16',
  issue:
    'Official Nov 2025 form states "16 [Clause revoked by law]" — smoke alarm obligations moved to Part D heading "Smoke Alarms" (not a numbered Part C clause).',
})
extractionFlags.push({
  section: 'Part D',
  issue:
    'Rights summary uses section titles (Use of the premises, Rent, etc.) in source; numbered clauses 20–30 from older AustLII Form 1 are NOT in this CAV revision.',
})
extractionFlags.push({
  section: 'Part E item 21',
  issue: 'Free-text "Further details" area is a large empty table cell — not extracted as fillable lines.',
})
extractionFlags.push({
  section: 'Help or further information + interpreter pages',
  issue: 'Excluded from FORM1_PART_B_THROUGH_E (not prescribed agreement terms).',
})

const reportPath = join(root, 'docs/vic/form-1-extraction-flags.json')
writeFileSync(reportPath, JSON.stringify(extractionFlags, null, 2))

const out = `/**
 * VIC Form 1 (Residential rental agreement of no more than 5 years) — prescribed text.
 * Source: Consumer Affairs Victoria Form 1 (.docx), in-force from 25 Nov 2025 (Victorian rental reforms).
 * Regenerate: node scripts/build-vic-form1-content.mjs
 * Extraction flags: docs/vic/form-1-extraction-flags.json
 * Do not paraphrase — update only from the official CAV .docx when the form changes.
 */

export const FORM1_FORM_REFERENCE =
  'Form 1 — Residential rental agreement (CAV prescribed form; in-force 25 Nov 2025, Residential Tenancies Regulations 2021 (Vic) Reg 10(1))'

/** Cover / explanatory pages before Part A (verbatim from CAV .docx). */
export const FORM1_INTRO = ${tsStringLiteral(intro)}

/**
 * Part A field labels and notes (verbatim). Schedule values are filled in form1Generator.tsx.
 */
export const FORM1_PART_A_STATIC = ${tsStringLiteral(partAStatic)}

/** Parts B–E prescribed terms through item 22 Signatures (excludes help/interpreter annex). */
export const FORM1_PART_B_THROUGH_E = ${tsStringLiteral(partBThroughE)}
`

const dest = join(root, 'src/lib/documents/vic/form1Content.ts')
writeFileSync(dest, out)
console.log('Wrote', dest)
console.log('  intro chars:', intro.length)
console.log('  part A chars:', partAStatic.length)
console.log('  part B–E chars:', partBThroughE.length)
console.log('Wrote', reportPath)
console.log('Flags:', extractionFlags.length)
