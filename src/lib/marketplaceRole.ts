/** JWT marketplace renter on the role axis (expand phase: legacy + new values). */
export function isRenterRole(role: unknown): boolean {
  return role === 'student' || role === 'renter'
}

/** Canonical marketplace role for JWT / storage writes (contract phase). */
export function marketplaceRoleForWrite(
  role: unknown,
): 'renter' | 'landlord' | 'admin' | null | undefined {
  if (role === 'student' || role === 'renter') return 'renter'
  if (role === 'landlord' || role === 'admin') return role
  return role as null | undefined
}
