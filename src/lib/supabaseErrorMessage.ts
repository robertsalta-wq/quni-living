/** Supabase/PostgREST errors are plain objects with `message`, not always `instanceof Error`. */
export function messageFromSupabaseError(err: unknown): string {
  if (err == null) return 'Unknown error'
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message
  }
  return 'Something went wrong.'
}

/** Typical PostgREST message when a column is not in the exposed schema. */
export function looksLikeMissingDbColumn(err: unknown): boolean {
  const m = messageFromSupabaseError(err).toLowerCase()
  return (
    m.includes('schema cache') ||
    m.includes('could not find') ||
    (m.includes('column') && (m.includes('does not exist') || m.includes('unknown')))
  )
}
