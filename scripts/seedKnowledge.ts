/**
 * Seed public.knowledge_base from scripts/knowledgeData.json (OpenAI embeddings + Supabase upsert).
 *
 * Run from repo root (loads .env.vercel then .env.local like other tooling):
 *   node scripts/run-with-env.mjs npx tsx scripts/seedKnowledge.ts
 *
 * Or: npx tsx scripts/seedKnowledge.ts  (if env is already in process)
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { generateEmbedding } from '../api/lib/embeddings.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(root, '.env.vercel') })
dotenv.config({ path: path.join(root, '.env.local'), override: true })

function resolveSupabaseUrl(): string {
  return (
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .trim()
  )
}

type KnowledgeSeed = {
  id: string
  title: string
  content: string
  category: string
  state: string | null
}

function readSeedFile(): KnowledgeSeed[] {
  const p = path.join(__dirname, 'knowledgeData.json')
  const raw = fs.readFileSync(p, 'utf8')
  const data = JSON.parse(raw) as unknown
  if (!Array.isArray(data)) {
    throw new Error('knowledgeData.json must be a JSON array')
  }
  return data as KnowledgeSeed[]
}

async function main() {
  const supabaseUrl = resolveSupabaseUrl()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!supabaseUrl || !serviceRole) {
    console.error(
      'Missing Supabase URL or service role key. Set SUPABASE_URL (or VITE_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY. Tip: run via `node scripts/run-with-env.mjs npx tsx scripts/seedKnowledge.ts`',
    )
    process.exit(1)
  }

  if (!(process.env.OPENAI_API_KEY || '').trim()) {
    console.error('Missing OPENAI_API_KEY')
    process.exit(1)
  }

  const entries = readSeedFile()
  const admin = createClient(supabaseUrl, serviceRole)

  console.log(`Seeding ${entries.length} knowledge_base rows…`)

  for (let i = 0; i < entries.length; i++) {
    const row = entries[i]
    const { id, title, content, category, state } = row
    if (!id || !title || !content || !category) {
      throw new Error(`Entry ${i + 1}: id, title, content, and category are required`)
    }

    process.stdout.write(`  [${i + 1}/${entries.length}] ${title.slice(0, 60)}… `)
    const embedding = await generateEmbedding(`${title}\n\n${content}`)
    const { error } = await admin.from('knowledge_base').upsert(
      {
        id,
        title,
        content,
        category,
        state: state && String(state).trim() ? String(state).trim() : null,
        embedding,
      },
      { onConflict: 'id' },
    )
    if (error) {
      console.error('\nUpsert failed:', error.message)
      process.exit(1)
    }
    console.log('ok')
  }

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
