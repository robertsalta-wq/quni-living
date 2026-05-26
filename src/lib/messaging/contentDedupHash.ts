import type { MaskType } from './conversationTypes.js'

/** Normalize a detected substring for dedup stats (not privacy-preserving). */
export function normalizeForDedupHash(match: string, maskType: MaskType): string {
  const m = match.trim().toLowerCase()
  if (maskType === 'phone') {
    return m.replace(/\D/g, '')
  }
  if (maskType === 'email') {
    return m
  }
  if (maskType === 'url') {
    return m.replace(/\/+$/, '')
  }
  return m.replace(/\s+/g, ' ')
}

export async function contentDedupHash(normalized: string): Promise<string> {
  const data = new TextEncoder().encode(normalized)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
