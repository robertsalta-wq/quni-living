/**
 * One-off / refresh: reads docs/form18a-v23-sep25-extracted.txt (from pdf-parse of RTA PDF),
 * extracts Part 2 Standard Terms verbatim, strips running PDF headers, writes TS module.
 *
 * Source PDF: https://www.rta.qld.gov.au/sites/default/files/2021-06/Form-18a-General-tenancy-agreement.pdf
 * (Extracted text header shows v23 Sep25.)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const rawPath = path.join(root, 'docs', 'form18a-v23-sep25-extracted.txt')
const outPath = path.join(root, 'src', 'lib', 'documents', 'qld', 'form18aStandardTerms.ts')

const raw = fs.readFileSync(rawPath, 'utf8')
const start = raw.indexOf('Part 2 Standard Terms')
const end = raw.indexOf('Part 3 Special terms')
if (start < 0 || end < 0 || end <= start) {
  console.error('Could not find Part 2 / Part 3 boundaries')
  process.exit(1)
}
let part2 = raw.slice(start, end)

// Strip page-break banners and repeated RTA letterheads (not part of clause text).
part2 = part2.replace(/\r\n/g, '\n')
part2 = part2.replace(/\n-- \d+ of \d+ --\n/g, '\n')
part2 = part2.replace(
  /\nGeneral tenancy agreement \(Form 18a\)\nResidential Tenancies and Rooming Accommodation Act 2008\nPage \d+ of[\s\S]*?rta\.qld\.gov\.au\n/g,
  '\n',
)
part2 = part2.replace(/\nPage \d+ of[\s\S]*?rta\.qld\.gov\.au\n/g, '\n')
part2 = part2.trim()

const escaped = part2.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')

const header = `/**
 * Form 18a — Part 2 Standard Terms only (verbatim).
 *
 * Source: RTA Queensland "General tenancy agreement (Form 18a)" PDF.
 * Retrieved from https://www.rta.qld.gov.au/sites/default/files/2021-06/Form-18a-General-tenancy-agreement.pdf
 * Extracted text identifies version v23 Sep25.
 *
 * Do not edit prescribed wording — regenerate from PDF via scripts/generate-form18a-standard-terms.mjs if RTA updates the form.
 */

`

const body = `export const FORM18A_PART2_STANDARD_TERMS = \`${escaped}\`
`

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, header + body, 'utf8')
console.log('Wrote', outPath, 'length', part2.length)
