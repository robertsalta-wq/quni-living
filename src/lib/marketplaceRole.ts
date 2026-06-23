/** JWT marketplace renter on the role axis (expand phase: legacy + new values). */
export function isRenterRole(role: unknown): boolean {
  return role === 'student' || role === 'renter'
}
