/**
 * Admin CRUD for AI RAG knowledge_base (embeddings via OpenAI).
 * GET: list rows (no embedding vector). POST: create/update + embed. DELETE: by id.
 */
import { createClient } from '@supabase/supabase-js'

import { requireAdminUser } from '../lib/adminAuth.js'
import { generateEmbedding } from '../lib/embeddings.js'

export const config = { runtime: 'edge' }

type KnowledgeRow = {
  id: string
  title: string
  content: string
  category: string
  state: string | null
  created_at: string
  updated_at: string
}

function json(body: unknown, status = 200, origin: string) {
  const allowOrigin = origin || '*'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'no-store',
    },
  })
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
  const openaiKey = (process.env.OPENAI_API_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
  }

  const authResult = await requireAdminUser(request, supabaseUrl, anonKey)
  if ('error' in authResult) {
    return json({ error: authResult.error }, authResult.status, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)

  try {
    if (request.method === 'GET') {
      const { data, error } = await admin
        .from('knowledge_base')
        .select('id, title, content, category, state, created_at, updated_at')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('[api/admin/knowledge] GET', error.message)
        return json({ error: error.message }, 500, origin)
      }
      return json({ entries: (data ?? []) as KnowledgeRow[] }, 200, origin)
    }

    if (request.method === 'POST') {
      if (!openaiKey) {
        return json({ error: 'OPENAI_API_KEY is not configured on the server' }, 500, origin)
      }

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return json({ error: 'Invalid JSON' }, 400, origin)
      }
      if (!body || typeof body !== 'object') {
        return json({ error: 'Invalid body' }, 400, origin)
      }
      const b = body as Record<string, unknown>
      const idRaw = typeof b.id === 'string' ? b.id.trim() : ''
      const title = typeof b.title === 'string' ? b.title.trim() : ''
      const content = typeof b.content === 'string' ? b.content.trim() : ''
      const category = typeof b.category === 'string' ? b.category.trim() : ''
      const stateVal = typeof b.state === 'string' ? b.state.trim() : ''
      const state = stateVal.length ? stateVal.toUpperCase().slice(0, 8) : null

      if (!title || !content || !category) {
        return json({ error: 'title, content, and category are required' }, 400, origin)
      }

      const embedText = `${title}\n\n${content}`
      const embedding = await generateEmbedding(embedText)

      if (idRaw) {
        if (!isUuid(idRaw)) {
          return json({ error: 'Invalid id' }, 400, origin)
        }
        const { data, error } = await admin
          .from('knowledge_base')
          .update({
            title,
            content,
            category,
            state,
            embedding,
          })
          .eq('id', idRaw)
          .select('id, title, content, category, state, created_at, updated_at')
          .maybeSingle()

        if (error) {
          console.error('[api/admin/knowledge] UPDATE', error.message)
          return json({ error: error.message }, 500, origin)
        }
        if (!data) {
          return json({ error: 'Entry not found' }, 404, origin)
        }
        return json({ entry: data as KnowledgeRow }, 200, origin)
      }

      const { data, error } = await admin
        .from('knowledge_base')
        .insert({
          title,
          content,
          category,
          state,
          embedding,
        })
        .select('id, title, content, category, state, created_at, updated_at')
        .single()

      if (error) {
        console.error('[api/admin/knowledge] INSERT', error.message)
        return json({ error: error.message }, 500, origin)
      }
      return json({ entry: data as KnowledgeRow }, 201, origin)
    }

    if (request.method === 'DELETE') {
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return json({ error: 'Invalid JSON' }, 400, origin)
      }
      if (!body || typeof body !== 'object') {
        return json({ error: 'Invalid body' }, 400, origin)
      }
      const id = typeof (body as { id?: unknown }).id === 'string' ? (body as { id: string }).id.trim() : ''
      if (!id || !isUuid(id)) {
        return json({ error: 'id is required and must be a UUID' }, 400, origin)
      }

      const { error } = await admin.from('knowledge_base').delete().eq('id', id)
      if (error) {
        console.error('[api/admin/knowledge] DELETE', error.message)
        return json({ error: error.message }, 500, origin)
      }
      return json({ ok: true }, 200, origin)
    }

    return json({ error: 'Method not allowed' }, 405, origin)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unexpected error'
    console.error('[api/admin/knowledge]', e)
    return json({ error: msg }, 500, origin)
  }
}
