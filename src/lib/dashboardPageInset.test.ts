import { describe, expect, it } from 'vitest'
import {
  dashboardPageInsetClass,
  dashboardProfileMobilePadClass,
  dashboardProfilePageInsetClass,
} from './dashboardPageInset'

describe('dashboardPageInset', () => {
  it('non-profile inset keeps landlord gutter scale', () => {
    expect(dashboardPageInsetClass).toContain('max-w-site')
    expect(dashboardPageInsetClass).toContain('px-3.5')
    expect(dashboardPageInsetClass).toContain('sm:px-4')
    expect(dashboardPageInsetClass).toContain('lg:px-8')
    expect(dashboardPageInsetClass).toContain('py-3')
    expect(dashboardPageInsetClass).toContain('sm:py-6')
    expect(dashboardPageInsetClass).toContain('lg:pb-14')
  })

  it('profile inset is flush on mobile and padded from sm', () => {
    expect(dashboardProfilePageInsetClass).toContain('max-sm:contents')
    expect(dashboardProfilePageInsetClass).toContain('sm:px-4')
    expect(dashboardProfilePageInsetClass).toContain('lg:px-8')
    expect(dashboardProfilePageInsetClass).not.toContain('px-3.5')
  })

  it('profile mobile pad matches hub gutters', () => {
    expect(dashboardProfileMobilePadClass).toBe('max-sm:px-3.5 max-sm:py-3')
  })
})
