/**
 * Matches `supabase/campus_slugs.sql`:
 * trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')))
 */
export function slugifyCampusName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}

export function campusUrlSlug(row: { slug?: string | null; name: string }): string {
  const s = row.slug?.trim()
  if (s) return s.toLowerCase()
  return slugifyCampusName(row.name)
}
