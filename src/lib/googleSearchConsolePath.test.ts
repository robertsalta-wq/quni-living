import { describe, expect, it } from 'vitest'
import {
  aggregatePageAnalyticsRows,
  classifyPagePath,
  compareByImpressionsThenClicks,
  pageUrlToDisplayPath,
} from '../../api/lib/googleSearchConsole.js'

describe('pageUrlToDisplayPath', () => {
  it('strips scheme and www so apex and www collapse', () => {
    expect(pageUrlToDisplayPath('https://quni.com.au/')).toBe('/')
    expect(pageUrlToDisplayPath('https://www.quni.com.au/')).toBe('/')
    expect(pageUrlToDisplayPath('http://www.quni.com.au/faq')).toBe('/faq')
    expect(pageUrlToDisplayPath('https://quni.com.au/student-accommodation/anu/acton-campus')).toBe(
      '/student-accommodation/anu/acton-campus',
    )
  })

  it('keeps path if already relative and strips trailing slash', () => {
    expect(pageUrlToDisplayPath('/guides')).toBe('/guides')
    expect(pageUrlToDisplayPath('/guides/')).toBe('/guides')
  })
})

describe('classifyPagePath', () => {
  it('matches brief patterns in order (campus before university)', () => {
    expect(classifyPagePath('/')).toBe('home')
    expect(classifyPagePath('/student-accommodation/anu/acton-campus')).toBe('campus')
    expect(classifyPagePath('/student-accommodation/anu')).toBe('university')
    expect(classifyPagePath('/listings')).toBe('listings')
    expect(classifyPagePath('/listings/foo-bar')).toBe('listings')
    expect(classifyPagePath('/guides')).toBe('guide')
    expect(classifyPagePath('/guides/bond')).toBe('guide')
    expect(classifyPagePath('/for-landlords')).toBe('landlord')
    expect(classifyPagePath('/landlord-dashboard')).toBe('landlord')
    expect(classifyPagePath('/landlords/foo')).toBe('landlord')
    expect(classifyPagePath('/services/managed')).toBe('landlord')
    expect(classifyPagePath('/for-universities')).toBe('universities')
    expect(classifyPagePath('/international')).toBe('audience')
    expect(classifyPagePath('/rent-near-campus')).toBe('audience')
    expect(classifyPagePath('/faq')).toBe('company')
    expect(classifyPagePath('/about')).toBe('company')
    expect(classifyPagePath('/unknown-thing')).toBe('other')
  })
})

describe('aggregatePageAnalyticsRows', () => {
  it('merges www and apex with impression-weighted position', () => {
    const rows = aggregatePageAnalyticsRows([
      {
        keys: ['https://quni.com.au/'],
        clicks: 2,
        impressions: 4,
        position: 19.8,
      },
      {
        keys: ['https://www.quni.com.au/'],
        clicks: 2,
        impressions: 49,
        position: 9.8,
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].pagePath).toBe('/')
    expect(rows[0].clicks).toBe(4)
    expect(rows[0].impressions).toBe(53)
    expect(rows[0].ctr).toBeCloseTo(4 / 53)
    // (19.8*4 + 9.8*49) / 53 = 559.4 / 53 ≈ 10.55 → 10.6
    expect(rows[0].position).toBe(10.6)
    expect(rows[0].kind).toBe('home')
    expect(rows[0].sourceUrls).toEqual([
      'https://quni.com.au/',
      'https://www.quni.com.au/',
    ])
  })

  it('sorts by impressions then clicks', () => {
    const rows = aggregatePageAnalyticsRows([
      { keys: ['https://quni.com.au/a'], clicks: 5, impressions: 10, position: 1 },
      { keys: ['https://quni.com.au/b'], clicks: 1, impressions: 100, position: 2 },
      { keys: ['https://quni.com.au/c'], clicks: 9, impressions: 100, position: 3 },
    ])
    expect(rows.map((r) => r.pagePath)).toEqual(['/c', '/b', '/a'])
  })
})

describe('compareByImpressionsThenClicks', () => {
  it('orders higher impressions first', () => {
    const rows = [
      { impressions: 10, clicks: 9 },
      { impressions: 50, clicks: 0 },
    ].sort(compareByImpressionsThenClicks)
    expect(rows[0].impressions).toBe(50)
  })
})
