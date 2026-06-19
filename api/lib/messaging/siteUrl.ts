/** Public site origin for deep links in server emails (no trailing slash). */
export function resolvePublicSiteUrl(): string {
  const candidates = [
    process.env.PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.VITE_SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  ]
  for (const raw of candidates) {
    const t = (raw ?? '').trim()
    if (t && /^https?:\/\//i.test(t)) {
      return t.replace(/\/+$/, '')
    }
  }
  return 'https://quni.com.au'
}

export function conversationThreadUrl(conversationId: string): string {
  return `${resolvePublicSiteUrl()}/messages/${encodeURIComponent(conversationId)}`
}
