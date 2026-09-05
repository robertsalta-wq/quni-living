import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SCHEDULE_7_RULE_2_1,
  SCHEDULE_7_RULE_3_2,
  SCHEDULE_7_RULE_3_5_SOURCE,
  SCHEDULE_7_RULE_7_2,
  SCHEDULE_7_VERBATIM_STRINGS,
  formatSchedule7Rule35,
} from './schedule7'

function unwrapSchedule7Source(): string {
  const md = readFileSync(join(process.cwd(), 'docs/legal/qld-prescribed-house-rules-sch7.md'), 'utf8')
  const start = md.indexOf('## Schedule 7')
  const end = md.indexOf('## Act,')
  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  const block = md.slice(start, end)
  const unwrapped = block
    .split('\n')
    .map((line) => line.replace(/^>\s?/, ''))
    .join('\n')
  return unwrapped.replace(/\s+/g, ' ')
}

function compact(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

describe('Schedule 7 locked strings', () => {
  it('match the instrument source file after whitespace unwrap', () => {
    const source = unwrapSchedule7Source()
    for (const snippet of SCHEDULE_7_VERBATIM_STRINGS) {
      expect(source, snippet).toContain(compact(snippet))
    }
  })

  it('formats rule 3(5) with the provider insert and keeps the locked prefix', () => {
    expect(formatSchedule7Rule35('kitchen, bathrooms, hallway')).toBe(
      'Common areas in these rental premises include kitchen, bathrooms, hallway.',
    )
    expect(SCHEDULE_7_RULE_3_5_SOURCE.startsWith('Common areas in these rental premises include')).toBe(true)
  })

  it('keeps the working-dog and provider-cleaning carve-outs as locked text', () => {
    expect(SCHEDULE_7_RULE_7_2).toBe('Subsection (1) does not apply to a working dog.')
    expect(SCHEDULE_7_RULE_3_2).toContain('subject to any agreement with the resident')
    expect(compact(SCHEDULE_7_RULE_2_1)).toContain('Residents must maintain their rooms')
  })
})
