/** Kebab-case title + short random suffix (unique enough for URLs). */
export function generatePropertySlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base || 'listing'}-${suffix}`
}
