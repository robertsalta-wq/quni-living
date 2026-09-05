/**
 * Closed list of additional house-rule subjects a provider may make (RTRA Act s 268(1)(a)-(g)).
 * A regulation may add (h); none has. Writing outside this list is an offence (s 268(4)).
 */

export const QLD_HOUSE_RULE_SUBJECTS = [
  'using_shared_facilities',
  'parking_motor_vehicles',
  'drinking_alcohol_or_illegal_drugs',
  'smoking',
  'making_noise',
  'keeping_pets',
  'guests',
] as const

export type QldHouseRuleSubject = (typeof QLD_HOUSE_RULE_SUBJECTS)[number]

export const QLD_HOUSE_RULE_SUBJECT_SET: ReadonlySet<string> = new Set(QLD_HOUSE_RULE_SUBJECTS)

/** Act s 268(1) wording, used as editor headings and PDF extra-rule titles. */
export const QLD_HOUSE_RULE_SUBJECT_LABELS: Record<QldHouseRuleSubject, string> = {
  using_shared_facilities: 'Using shared facilities',
  parking_motor_vehicles: 'Parking motor vehicles',
  drinking_alcohol_or_illegal_drugs: 'Drinking alcohol or illegally consuming other drugs',
  smoking: 'Smoking',
  making_noise: 'Making noise',
  keeping_pets: 'Keeping pets',
  guests: 'Guests',
}

export type QldHouseRuleExtras = Partial<Record<QldHouseRuleSubject, string>>

export function isQldHouseRuleSubject(value: string): value is QldHouseRuleSubject {
  return QLD_HOUSE_RULE_SUBJECT_SET.has(value)
}

/** Drop unknown keys and blank values. Does not paraphrase. */
export function sanitizeQldHouseRuleExtras(raw: unknown): QldHouseRuleExtras {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: QldHouseRuleExtras = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isQldHouseRuleSubject(key)) continue
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (!trimmed) continue
    out[key] = trimmed
  }
  return out
}
