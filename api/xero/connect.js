/**
 * Placeholder — Xero OAuth (future).
 */
export const config = { runtime: 'edge' }

export default async function handler() {
  return new Response(
    JSON.stringify({ error: 'Not Implemented', message: 'Xero integration coming soon' }),
    {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}
