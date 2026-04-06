/**
 * OpenAI text embeddings for RAG (text-embedding-3-small, 1536 dims).
 * Requires OPENAI_API_KEY (Vercel env).
 */

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings'
const MODEL = 'text-embedding-3-small'

type OpenAIEmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>
  error?: { message?: string }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const key = (process.env.OPENAI_API_KEY || '').trim()
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const input = text.trim().slice(0, 32000)
  if (!input) {
    throw new Error('Cannot embed empty text')
  }

  const res = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      input,
    }),
  })

  const json = (await res.json()) as OpenAIEmbeddingResponse

  if (!res.ok) {
    const msg = json?.error?.message || res.statusText || 'OpenAI embeddings request failed'
    throw new Error(msg)
  }

  const emb = json.data?.[0]?.embedding
  if (!emb || !Array.isArray(emb) || emb.length !== 1536) {
    throw new Error('Invalid embedding response from OpenAI')
  }

  return emb
}
