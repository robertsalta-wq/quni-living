export function getBaseUrl(): string {
  return (process.env.BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '')
}

export function getSupabaseUrl(): string {
  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim()
  if (!url) {
    throw new Error(
      'Missing SUPABASE_URL (or VITE_SUPABASE_URL). Set in .env.local or CI secrets.',
    )
  }
  return url
}

export function getSupabaseServiceRoleKey(): string {
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. Set in .env.local or CI secrets — never commit.')
  }
  return key
}
