/**
 * Supabase Auth `getUser()` when the JWT `sub` is not present in `auth.users`
 * (deleted user, project reset, wrong Supabase project, or stale local storage).
 */
export function isStaleOrInvalidJwtUserError(message: string | null | undefined): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return m.includes('user from sub claim') && m.includes('does not exist')
}
