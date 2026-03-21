/**
 * Title-case each whitespace-separated word for display
 * (e.g. "QUINN LEE" → "Quinn Lee"). Does not handle special cases like "McDonald".
 */
export function formatDisplayName(raw: string | null | undefined): string {
  if (!raw?.trim()) return ''
  return raw
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return ''
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}
