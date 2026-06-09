/**
 * Generate api/lib/documents/qldForm18aRenamedFields.ts from the corrected field map.
 * Run: node scripts/generate-qld-form18a-renamed-fields.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const mapPath = path.join(root, 'docs', 'qld', 'qld-form18a-corrected-field-map.json')
const outPath = path.join(root, 'api', 'lib', 'documents', 'qldForm18aRenamedFields.ts')

const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
const dataFields = map.fields.filter((f) => f.action !== 'exclude')

function toKey(name) {
  return name
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/_(\d)/g, '$1')
    .replace(/^_+/, '')
}

const lines = []
lines.push('/**')
lines.push(' * AcroForm /T names on docs/qld/form18a-renamed.pdf.')
lines.push(' * Generated from docs/qld/qld-form18a-corrected-field-map.json (133 data fields).')
lines.push(' * Regenerate: node scripts/generate-qld-form18a-renamed-fields.mjs')
lines.push(' */')
lines.push('')
lines.push(`export const QLD_FORM18A_ACTION_BUTTONS = ['Reset form', 'Print form'] as const`)
lines.push('')
lines.push('export const QLD_FORM18A_RENAMED_FIELDS = {')

for (const f of dataFields) {
  const key = f.action === 'rename' ? f.correct_name : toKey(f.correct_name)
  const safeKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : toKey(f.correct_name)
  const escaped = f.correct_name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  lines.push(`  ${safeKey}: '${escaped}',`)
}

lines.push('} as const')
lines.push('')
lines.push('export type QldForm18aRenamedFieldName = (typeof QLD_FORM18A_RENAMED_FIELDS)[keyof typeof QLD_FORM18A_RENAMED_FIELDS]')
lines.push('')

fs.writeFileSync(outPath, lines.join('\n'))
console.log('wrote', outPath, 'entries', dataFields.length)
