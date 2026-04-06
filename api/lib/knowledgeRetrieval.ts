/**
 * Vector similarity search over public.knowledge_base for AI chat RAG.
 */
import { createClient } from '@supabase/supabase-js'

import { generateEmbedding } from './embeddings.js'

type MatchRow = {
  id: string
  title: string
  content: string
  category: string
  state: string | null
  similarity: number
}

function formatChunks(rows: MatchRow[]): string {
  const parts: string[] = []
  for (const row of rows) {
    const meta = [row.category, row.state ? row.state : 'national/platform'].filter(Boolean).join(' · ')
    parts.push(`### ${row.title} (${meta})\n${row.content.trim()}`)
  }
  return parts.join('\n\n')
}

/**
 * Returns markdown-style text of the top matching chunks, or an empty string if none / misconfigured.
 */
export async function retrieveRelevantKnowledge(
  query: string,
  state?: string,
  limit = 4,
): Promise<string> {
  const q = query.trim()
  if (!q) return ''

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!supabaseUrl || !serviceRole) {
    return ''
  }

  const queryEmbedding = await generateEmbedding(q)
  const admin = createClient(supabaseUrl, serviceRole)

  const stateFilter = state?.trim() || null

  const { data, error } = await admin.rpc('match_knowledge_base', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: limit,
    filter_state: stateFilter,
  })

  if (error) {
    console.error('[knowledgeRetrieval] match_knowledge_base error:', error.message)
    return ''
  }

  const rows = (data ?? []) as MatchRow[]
  if (!rows.length) return ''

  return formatChunks(rows)
}
