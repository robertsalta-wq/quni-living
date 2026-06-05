/** Drop a leading markdown H1 so the page hero remains the sole H1. */
export function normalizeArticleMarkdown(raw: string): string {
  const trimmed = raw.replace(/^\uFEFF/, '').trimStart()
  const withoutH1 = trimmed.replace(/^#\s+[^\n]+\n+/, '')
  return withoutH1.trimStart()
}
