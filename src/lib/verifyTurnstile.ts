/**
 * POST token to same-origin `/api/verify-turnstile` (Vercel) or optional absolute URL for local dev.
 * Set VITE_TURNSTILE_VERIFY_URL=https://your-deployment.vercel.app/api/verify-turnstile when using `vite` only.
 */
export async function verifyTurnstileToken(
  token: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!token?.trim()) {
    return { ok: false, message: 'Please complete the verification challenge.' }
  }

  const override = (import.meta.env.VITE_TURNSTILE_VERIFY_URL ?? '').trim()
  const url = override || '/api/verify-turnstile'

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = (await r.json()) as { ok?: boolean; error?: string }
    if (!r.ok || !data.ok) {
      return { ok: false, message: data.error || 'Verification failed. Please try again.' }
    }
    return { ok: true }
  } catch {
    return {
      ok: false,
      message:
        'Could not reach the verification service. If you are on localhost, set VITE_TURNSTILE_VERIFY_URL to your deployed /api/verify-turnstile URL or run `vercel dev`.',
    }
  }
}

export function isTurnstileSiteKeyConfigured(): boolean {
  return Boolean((import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim())
}
