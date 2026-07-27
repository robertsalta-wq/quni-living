import { LANDLORD_RULE_MAP_ROWS } from '../../api/lib/tenancy/rules/ruleMapData.js'
import type { RuleMapRow, RuleMapState } from '../../api/lib/tenancy/rules/types.js'
import type { LandlordDeskState } from './forLandlordsState'
import { LANDLORD_STATE_FACTS } from './forLandlordsState'

/** Gate panel Q1 row — law cells empty until Rob verifies. */
export function gatePanelRow(state: LandlordDeskState): RuleMapRow | undefined {
  return LANDLORD_RULE_MAP_ROWS.find((r) => r.id === `Q1-${state}`)
}

export function gatePanelIsVerified(state: LandlordDeskState): boolean {
  const row = gatePanelRow(state)
  return row?.confidence === 'verified' && Boolean(row.rule?.trim())
}

/** Drawer detail — placeholder only; never served as legal fact when unverified. */
export function gatePanelDrawerLines(state: LandlordDeskState): string[] {
  const row = gatePanelRow(state)
  const facts = LANDLORD_STATE_FACTS[state]
  if (!row || row.confidence !== 'verified' || !row.rule?.trim()) {
    return [
      `Room letting rules in ${facts.label} depend on whether you live on-site and how the room is let.`,
      'Verified guidance for this question is being prepared — details will appear here once confirmed.',
    ]
  }
  return [row.rule]
}

export function gatePanelHedge(state: LandlordDeskState): string {
  const authority = LANDLORD_STATE_FACTS[state].authorityShort
  return `Information, not legal advice — confirm with ${authority}.`
}

export function bondSchemeLabel(state: RuleMapState): string {
  return state === 'NSW' ? 'NSW Rental Bonds Online' : 'QLD RTA'
}
