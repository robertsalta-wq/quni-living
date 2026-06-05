/**
 * Sync docs/feature-inventory.md → scripts/knowledgeData.json (platform_policy chunks for AI RAG).
 *
 * Run after updating the feature inventory:
 *   npx tsx scripts/syncFeatureInventoryKnowledge.ts
 *   npm run seed:knowledge
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

/** Stable IDs - do not change (upsert keys in Supabase). */
export const INVENTORY_KNOWLEDGE_IDS = {
  shared: '6fad4b80-0020-4000-8000-000000000020',
  students: '6fad4b80-0021-4000-8000-000000000021',
  landlords: '6fad4b80-0022-4000-8000-000000000022',
  routes: '6fad4b80-0023-4000-8000-000000000023',
} as const

type KnowledgeSeed = {
  id: string
  title: string
  content: string
  category: string
  state: string | null
}

const PREAMBLE =
  'Source: docs/feature-inventory.md (living product inventory). Live = shipped end-to-end. UI only = shown in the app but not fully backed - say "coming soon" if asked. Deprecated = replaced. Do not invent features or routes not listed here.\n\n'

function extractSection(md: string, startHeading: string, endHeading: string | null): string {
  const startIdx = md.indexOf(startHeading)
  if (startIdx < 0) {
    throw new Error(`Missing section heading: ${startHeading}`)
  }
  const from = startIdx + startHeading.length
  const endIdx = endHeading ? md.indexOf(endHeading, from) : md.length
  if (endIdx < 0) throw new Error(`Missing end heading: ${endHeading}`)
  return md.slice(from, endIdx).trim()
}

/** Light cleanup for embedding-friendly text while keeping routes and bullets. */
function normalizeInventoryText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function readInventoryMarkdown(): string {
  const p = path.join(root, 'docs', 'feature-inventory.md')
  return fs.readFileSync(p, 'utf8')
}

function buildInventoryEntries(md: string): KnowledgeSeed[] {
  const shared = normalizeInventoryText(extractSection(md, '## Shared (both students and landlords)', '## Students'))
  const students = normalizeInventoryText(extractSection(md, '## Students', '## Landlords'))
  const landlords = normalizeInventoryText(extractSection(md, '## Landlords', '## Quick route map'))
  const routes = normalizeInventoryText(extractSection(md, '## Quick route map', '## Related docs'))

  return [
    {
      id: INVENTORY_KNOWLEDGE_IDS.shared,
      title: 'Quni shared product features (students and landlords)',
      category: 'platform_policy',
      state: null,
      content: PREAMBLE + shared,
    },
    {
      id: INVENTORY_KNOWLEDGE_IDS.students,
      title: 'Quni student and renter product features and routes',
      category: 'platform_policy',
      state: null,
      content: PREAMBLE + students,
    },
    {
      id: INVENTORY_KNOWLEDGE_IDS.landlords,
      title: 'Quni landlord product features and routes',
      category: 'platform_policy',
      state: null,
      content: PREAMBLE + landlords,
    },
    {
      id: INVENTORY_KNOWLEDGE_IDS.routes,
      title: 'Quni route map (student and landlord dashboards)',
      category: 'platform_policy',
      state: null,
      content: PREAMBLE + routes,
    },
  ]
}

function readKnowledgeData(): KnowledgeSeed[] {
  const p = path.join(__dirname, 'knowledgeData.json')
  const data = JSON.parse(fs.readFileSync(p, 'utf8')) as unknown
  if (!Array.isArray(data)) throw new Error('knowledgeData.json must be an array')
  return data as KnowledgeSeed[]
}

function writeKnowledgeData(rows: KnowledgeSeed[]): void {
  const p = path.join(__dirname, 'knowledgeData.json')
  fs.writeFileSync(p, `${JSON.stringify(rows, null, 2)}\n`, 'utf8')
}

export function syncFeatureInventoryToKnowledgeJson(): { replaced: number; total: number } {
  const inventoryIds = new Set(Object.values(INVENTORY_KNOWLEDGE_IDS))
  const md = readInventoryMarkdown()
  const newEntries = buildInventoryEntries(md)
  const existing = readKnowledgeData()
  const kept = existing.filter((row) => !inventoryIds.has(row.id))
  const merged = [...kept, ...newEntries]
  writeKnowledgeData(merged)
  return { replaced: newEntries.length, total: merged.length }
}

const { replaced, total } = syncFeatureInventoryToKnowledgeJson()
console.log(`Synced ${replaced} feature-inventory chunks into knowledgeData.json (${total} rows total).`)
console.log('Next: npm run seed:knowledge')
