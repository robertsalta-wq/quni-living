import { describe, expect, it } from 'vitest'
import {
  collectFt6600BondClauseStrikeBounds,
  isFt6600NoBondAmount,
  prepareOfficialNswFt6600NoBondStrikeBounds,
} from './officialNswFt6600BondCrossOut.js'
import { loadOfficialNswFt6600Template } from './officialNswFt6600Fill.js'

describe('officialNswFt6600BondCrossOut', () => {
  it('treats null and zero as no-bond', () => {
    expect(isFt6600NoBondAmount(null)).toBe(true)
    expect(isFt6600NoBondAmount(0)).toBe(true)
    expect(isFt6600NoBondAmount(-1)).toBe(true)
    expect(isFt6600NoBondAmount(800)).toBe(false)
  })

  it('collects page-4 bond clause bounds from renamed template widgets', async () => {
    const doc = await loadOfficialNswFt6600Template()
    const bounds = collectFt6600BondClauseStrikeBounds(doc)
    expect(bounds.pageIndex).toBe(3)
    expect(bounds.left).toBe(34)
    expect(bounds.right).toBe(561)
    expect(bounds.top).toBeGreaterThan(bounds.bottom)
    expect(bounds.top).toBeGreaterThan(740)
    expect(bounds.bottom).toBeLessThan(630)
  })

  it('returns null strike prep when bond is present', async () => {
    const doc = await loadOfficialNswFt6600Template()
    expect(prepareOfficialNswFt6600NoBondStrikeBounds(doc, 800)).toBeNull()
    expect(prepareOfficialNswFt6600NoBondStrikeBounds(doc, null)).not.toBeNull()
  })
})
