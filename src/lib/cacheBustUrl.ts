/** Append a cache-buster so replaced files at the same public URL render immediately. */
export function cacheBustUrl(url: string, token?: string | number): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  const sep = trimmed.includes('?') ? '&' : '?'
  return `${trimmed}${sep}t=${encodeURIComponent(String(token ?? Date.now()))}`
}
