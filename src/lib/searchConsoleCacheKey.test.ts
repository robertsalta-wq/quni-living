import { describe, expect, it } from 'vitest'
import { buildSearchConsoleCacheKey } from '../../api/lib/searchConsoleCache.js'
import { SEARCH_CONSOLE_SITE_URL, searchConsoleRange28d } from '../../api/lib/googleSearchConsole.js'

describe('buildSearchConsoleCacheKey', () => {
  it('uses summary agg/n-a tokens and the 28d window', () => {
    const { startDate, endDate } = searchConsoleRange28d()
    expect(buildSearchConsoleCacheKey('summary')).toBe(
      `searchconsole:v1:summary:${SEARCH_CONSOLE_SITE_URL}:${startDate}:${endDate}:agg:n-a`,
    )
  })

  it('includes dimension and rowLimit for queries and pages', () => {
    const { startDate, endDate } = searchConsoleRange28d()
    expect(buildSearchConsoleCacheKey('queries')).toBe(
      `searchconsole:v1:queries:${SEARCH_CONSOLE_SITE_URL}:${startDate}:${endDate}:query:250`,
    )
    expect(buildSearchConsoleCacheKey('pages')).toBe(
      `searchconsole:v1:pages:${SEARCH_CONSOLE_SITE_URL}:${startDate}:${endDate}:page:250`,
    )
  })
})
