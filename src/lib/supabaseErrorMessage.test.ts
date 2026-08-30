import { describe, expect, it } from 'vitest'
import {
  BROWSER_NETWORK_FAILURE_COPY,
  formatUserFacingRequestError,
  isBrowserNetworkFailure,
} from './supabaseErrorMessage'

describe('isBrowserNetworkFailure', () => {
  it('detects postgrest-js + Sentry fetch wrapping from listing Health', () => {
    expect(
      isBrowserNetworkFailure({
        message: 'TypeError: Failed to fetch (example.supabase.co)',
      }),
    ).toBe(true)
  })

  it('detects a plain Chrome fetch failure', () => {
    expect(isBrowserNetworkFailure(new TypeError('Failed to fetch'))).toBe(true)
  })
})

describe('formatUserFacingRequestError', () => {
  it('maps the listing-hub TypeError dump to connection copy', () => {
    expect(
      formatUserFacingRequestError({
        message: 'TypeError: Failed to fetch (example.supabase.co)',
      }),
    ).toBe(BROWSER_NETWORK_FAILURE_COPY)
  })

  it('keeps listing-not-found copy', () => {
    expect(formatUserFacingRequestError('Listing not found.')).toBe('Listing not found.')
  })

  it('hides supabase hosts that are not fetch failures', () => {
    expect(
      formatUserFacingRequestError('Gateway timeout at https://example.supabase.co/rest/v1/properties', 'Could not load this listing.'),
    ).toBe('Could not load this listing.')
  })

  it('hides bare TypeError prefixes', () => {
    expect(formatUserFacingRequestError('TypeError: undefined is not an object', 'Could not load this listing.')).toBe(
      'Could not load this listing.',
    )
  })
})
