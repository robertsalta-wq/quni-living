import { sanitizeQldHouseRuleExtras, type QldHouseRuleExtras } from './subjects.js'

export const QLD_ROOMING_HOUSE_RULES_COLUMN = 'qld_rooming_house_rules'

export type QldRoomingHouseRulesStored = {
  commonAreas: string
  extras: QldHouseRuleExtras
}

export function parseQldRoomingHouseRulesStored(raw: unknown): QldRoomingHouseRulesStored {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { commonAreas: '', extras: {} }
  }
  const o = raw as Record<string, unknown>
  const commonAreas = typeof o.commonAreas === 'string' ? o.commonAreas : ''
  return {
    commonAreas,
    extras: sanitizeQldHouseRuleExtras(o.extras),
  }
}

export function toQldRoomingHouseRulesStored(
  commonAreas: string,
  extras: unknown,
): QldRoomingHouseRulesStored {
  return {
    commonAreas: typeof commonAreas === 'string' ? commonAreas.trim() : '',
    extras: sanitizeQldHouseRuleExtras(extras),
  }
}

export function isMissingQldRoomingHouseRulesColumn(error: { message?: string } | null | undefined): boolean {
  const msg = (error?.message ?? '').toLowerCase()
  return msg.includes('qld_rooming_house_rules') && msg.includes('does not exist')
}
