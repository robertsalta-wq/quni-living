export const FT6600_BOND_UNRESOLVED_CODE = 'ft6600_bond_unresolved'

export const FT6600_BOND_UNRESOLVED_MESSAGE =
  'Bond amount must be resolved before generating the NSW residential tenancy agreement (FT6600, s.159).'

export class Ft6600BondUnresolvedError extends Error {
  readonly code = FT6600_BOND_UNRESOLVED_CODE

  constructor(message = FT6600_BOND_UNRESOLVED_MESSAGE) {
    super(message)
    this.name = 'Ft6600BondUnresolvedError'
  }
}

export function isFt6600BondResolved(bondNum: number | null | undefined): bondNum is number {
  return bondNum != null && Number.isFinite(bondNum) && bondNum > 0
}

/** Fail loud before FT6600 render — prescribed form must not emit with null bond / unticked RBO (s.159). */
export function assertFt6600BondResolved(bondNum: number | null | undefined): asserts bondNum is number {
  if (!isFt6600BondResolved(bondNum)) {
    throw new Ft6600BondUnresolvedError()
  }
}
