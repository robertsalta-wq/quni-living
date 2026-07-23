/**
 * Fire-and-forget: ask the server to queue a Vercel redeploy (listing prerender refresh).
 * Uses the caller's Supabase session — no deploy secrets in the browser.
 */
import { supabase, isSupabaseConfigured } from './supabase'

export function requestSiteRebuild(): void {
  if (!isSupabaseConfigured) return
  if (typeof window === 'undefined') return

  void (async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token?.trim()
      if (!token) return

      await fetch('/api/internal/trigger-rebuild', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
    } catch {
      /* ignore — rebuild is best-effort */
    }
  })()
}
