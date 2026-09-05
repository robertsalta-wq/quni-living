import { classifyQldArrangement } from '../qldClassification.js'

export type QldPublicHouseRulesAccess = 'ask' | 'generate' | 'stop'

/**
 * Public generator gate. Same classifier as listings, no property row.
 * Assumes rooms with shared facilities (this page is the rooming generator).
 * Cite docs/legal/qld-classification-rule.md. Do not restate the test.
 */
export function qldPublicHouseRulesAccess(input: {
  providerLivesAtPremises: boolean | null
  roomsLetToResidents: number | null
}): QldPublicHouseRulesAccess {
  if (input.providerLivesAtPremises === null) return 'ask'
  if (input.providerLivesAtPremises === true && input.roomsLetToResidents == null) return 'ask'
  const outcome = classifyQldArrangement({
    whatIsLet: 'room_with_shared_facilities',
    providerLivesAtPremises: input.providerLivesAtPremises,
    roomsOccupiedOrAvailableToResidents: input.providerLivesAtPremises
      ? input.roomsLetToResidents
      : null,
  })
  return outcome === 'rooming' ? 'generate' : 'stop'
}
