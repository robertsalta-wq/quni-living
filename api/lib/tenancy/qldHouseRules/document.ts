import {
  formatSchedule7Rule35,
  SCHEDULE_7_RULES,
  SCHEDULE_7_RULE_3_2,
  SCHEDULE_7_RULE_7_2,
  type Schedule7Rule,
} from './schedule7.js'
import {
  QLD_HOUSE_RULE_SUBJECTS,
  QLD_HOUSE_RULE_SUBJECT_LABELS,
  sanitizeQldHouseRuleExtras,
  type QldHouseRuleExtras,
  type QldHouseRuleSubject,
} from './subjects.js'

export const QLD_HOUSE_RULES_COMMON_AREAS_REQUIRED =
  'Describe the common areas at these rental premises. Schedule 7 rule 3(5) needs that insert before a copy can be generated.'

export const QLD_HOUSE_RULES_COMMON_AREAS_MAX = 2000
export const QLD_HOUSE_RULES_EXTRA_MAX = 2000
export const QLD_HOUSE_RULES_PREMISES_LINE_MAX = 300

export const QLD_HOUSE_RULES_VARIANTS = ['resident', 'wall'] as const
export type QldHouseRulesVariant = (typeof QLD_HOUSE_RULES_VARIANTS)[number]

export function isQldHouseRulesVariant(value: string): value is QldHouseRulesVariant {
  return value === 'resident' || value === 'wall'
}

export type QldHouseRulesInput = {
  commonAreas: string
  extras?: QldHouseRuleExtras | Record<string, unknown>
  premisesLine?: string | null
}

export type QldHouseRulesRenderedClause = {
  id: string
  text: string
}

export type QldHouseRulesRenderedRule = {
  number: number
  title: string
  clauses: QldHouseRulesRenderedClause[]
}

export type QldHouseRulesExtraBlock = {
  subject: QldHouseRuleSubject
  heading: string
  text: string
}

export type QldHouseRulesDocument = {
  premisesLine: string | null
  prescribedRules: QldHouseRulesRenderedRule[]
  extraRules: QldHouseRulesExtraBlock[]
}

export type QldHouseRulesBuildResult =
  | { ok: true; document: QldHouseRulesDocument }
  | { ok: false; error: string }

function clip(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max)
}

function renderPrescribedRules(commonAreas: string): QldHouseRulesRenderedRule[] {
  const rule35: QldHouseRulesRenderedClause = {
    id: '3(5)',
    text: formatSchedule7Rule35(commonAreas),
  }
  return SCHEDULE_7_RULES.map((rule: Schedule7Rule) => {
    if (rule.number !== 3) {
      return {
        number: rule.number,
        title: rule.title,
        clauses: rule.clauses.map((c) => ({ id: c.id, text: c.text })),
      }
    }
    return {
      number: rule.number,
      title: rule.title,
      clauses: [...rule.clauses.map((c) => ({ id: c.id, text: c.text })), rule35],
    }
  })
}

function extraBlocks(extras: QldHouseRuleExtras): QldHouseRulesExtraBlock[] {
  const blocks: QldHouseRulesExtraBlock[] = []
  for (const subject of QLD_HOUSE_RULE_SUBJECTS) {
    const text = extras[subject]
    if (!text) continue
    blocks.push({
      subject,
      heading: QLD_HOUSE_RULE_SUBJECT_LABELS[subject],
      text: clip(text, QLD_HOUSE_RULES_EXTRA_MAX),
    })
  }
  return blocks
}

export function buildQldHouseRulesDocument(input: QldHouseRulesInput): QldHouseRulesBuildResult {
  const commonAreas = typeof input.commonAreas === 'string' ? input.commonAreas.trim() : ''
  if (!commonAreas) {
    return { ok: false, error: QLD_HOUSE_RULES_COMMON_AREAS_REQUIRED }
  }
  if (commonAreas.length > QLD_HOUSE_RULES_COMMON_AREAS_MAX) {
    return {
      ok: false,
      error: `Common areas description must be ${QLD_HOUSE_RULES_COMMON_AREAS_MAX} characters or fewer.`,
    }
  }

  const extras = sanitizeQldHouseRuleExtras(input.extras)
  for (const subject of QLD_HOUSE_RULE_SUBJECTS) {
    const text = extras[subject]
    if (text && text.length > QLD_HOUSE_RULES_EXTRA_MAX) {
      return {
        ok: false,
        error: `The ${QLD_HOUSE_RULE_SUBJECT_LABELS[subject].toLowerCase()} rule must be ${QLD_HOUSE_RULES_EXTRA_MAX} characters or fewer.`,
      }
    }
  }

  const premisesRaw = typeof input.premisesLine === 'string' ? input.premisesLine.trim() : ''
  if (premisesRaw.length > QLD_HOUSE_RULES_PREMISES_LINE_MAX) {
    return {
      ok: false,
      error: `Premises line must be ${QLD_HOUSE_RULES_PREMISES_LINE_MAX} characters or fewer.`,
    }
  }

  return {
    ok: true,
    document: {
      premisesLine: premisesRaw || null,
      prescribedRules: renderPrescribedRules(commonAreas),
      extraRules: extraBlocks(extras),
    },
  }
}

/** Flatten for golden / negative tests. */
export function qldHouseRulesDocumentPlainText(doc: QldHouseRulesDocument): string {
  const parts: string[] = []
  if (doc.premisesLine) parts.push(doc.premisesLine)
  for (const rule of doc.prescribedRules) {
    parts.push(`${rule.number} ${rule.title}`)
    for (const clause of rule.clauses) {
      parts.push(clause.text)
    }
  }
  for (const extra of doc.extraRules) {
    parts.push(extra.heading)
    parts.push(extra.text)
  }
  return parts.join('\n')
}

export function qldHouseRulesHasWorkingDogCarveOut(doc: QldHouseRulesDocument): boolean {
  return qldHouseRulesDocumentPlainText(doc).includes(SCHEDULE_7_RULE_7_2)
}

export function qldHouseRulesHasProviderCleaningCarveOut(doc: QldHouseRulesDocument): boolean {
  return qldHouseRulesDocumentPlainText(doc).includes(SCHEDULE_7_RULE_3_2)
}

/** Quni must not invent an all-residents common-area cleaning assignment. R18 cl 16(2) is later. */
export const QLD_HOUSE_RULES_FORBIDDEN_ALL_RESIDENTS_CLEANING =
  'All residents must clean the common areas'
