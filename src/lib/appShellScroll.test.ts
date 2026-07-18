import { describe, expect, it } from 'vitest'
import {
  clearAppShellScroll,
  readAppShellScroll,
  saveAppShellScroll,
} from './appShellScroll'

describe('appShellScroll store', () => {
  it('stores and restores per section key', () => {
    clearAppShellScroll()
    saveAppShellScroll('/student-dashboard?tab=overview', 120)
    saveAppShellScroll('/student-dashboard?tab=bookings', 40)
    expect(readAppShellScroll('/student-dashboard?tab=overview')).toBe(120)
    expect(readAppShellScroll('/student-dashboard?tab=bookings')).toBe(40)
    clearAppShellScroll('/student-dashboard?tab=overview')
    expect(readAppShellScroll('/student-dashboard?tab=overview')).toBeUndefined()
    expect(readAppShellScroll('/student-dashboard?tab=bookings')).toBe(40)
  })
})
