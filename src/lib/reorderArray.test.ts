import { describe, expect, it } from 'vitest'
import { moveArrayItem } from './reorderArray'

describe('moveArrayItem', () => {
  it('moves an item forward', () => {
    expect(moveArrayItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })

  it('moves an item backward', () => {
    expect(moveArrayItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })

  it('returns a copy when indices are equal or out of range', () => {
    const src = ['a', 'b']
    expect(moveArrayItem(src, 1, 1)).toEqual(['a', 'b'])
    expect(moveArrayItem(src, -1, 0)).toEqual(['a', 'b'])
    expect(moveArrayItem(src, 0, 5)).toEqual(['a', 'b'])
  })
})
