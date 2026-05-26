import { describe, expect, it } from 'vitest'

import { extractCompletedAt } from './docuseal.js'

describe('extractCompletedAt (Phase 3 / Task J)', () => {
  it('returns the per-role completed_at when present in payload.submitters', () => {
    const payload = {
      submitters: [
        { role: 'Landlord', completed_at: '2026-05-09T10:00:00Z' },
        { role: 'Tenant', completed_at: null },
      ],
    }
    expect(extractCompletedAt(payload, 'landlord')).toBe('2026-05-09T10:00:00Z')
  })

  it('returns the per-role completed_at when nested under data.submitters', () => {
    const payload = {
      event_type: 'form.completed',
      data: {
        submitters: [{ role: 'tenant', completed_at: '2026-05-09T11:00:00Z' }],
      },
    }
    expect(extractCompletedAt(payload, 'tenant')).toBe('2026-05-09T11:00:00Z')
  })

  it('returns null when role is in submitters but completed_at is missing or empty', () => {
    expect(
      extractCompletedAt({ submitters: [{ role: 'tenant' }] }, 'tenant'),
    ).toBeNull()
    expect(
      extractCompletedAt({ submitters: [{ role: 'tenant', completed_at: '' }] }, 'tenant'),
    ).toBeNull()
  })

  it('returns null when the role is not represented in submitters at all (no fake fallback)', () => {
    /**
     * This is the Task J fix: previously this returned `new Date().toISOString()` even
     * when the role was missing, which caused both signed_at columns to populate on
     * single-party webhooks and let the "Download signed agreement" button appear early.
     */
    expect(
      extractCompletedAt({ submitters: [{ role: 'landlord', completed_at: '2026-05-09T10:00:00Z' }] }, 'tenant'),
    ).toBeNull()
  })

  it('returns null when payload is missing the submitters array', () => {
    expect(extractCompletedAt({}, 'landlord')).toBeNull()
    expect(extractCompletedAt(null, 'landlord')).toBeNull()
    expect(extractCompletedAt({ data: {} }, 'tenant')).toBeNull()
  })

  it('matches role substring case-insensitively (e.g. "Property landlord")', () => {
    const payload = {
      submitters: [{ role: 'Property Landlord', completed_at: '2026-05-09T10:00:00Z' }],
    }
    expect(extractCompletedAt(payload, 'landlord')).toBe('2026-05-09T10:00:00Z')
  })

  it('extracts co-tenant completed_at without matching primary tenant', () => {
    const payload = {
      submitters: [
        { role: 'Second Party', completed_at: '2026-05-09T11:00:00Z' },
        { role: 'Co-tenant', completed_at: '2026-05-09T12:00:00Z' },
      ],
    }
    expect(extractCompletedAt(payload, 'co_tenant')).toBe('2026-05-09T12:00:00Z')
    expect(extractCompletedAt(payload, 'tenant')).toBe('2026-05-09T11:00:00Z')
  })

  it('does not treat Co-tenant role as primary tenant', () => {
    const payload = {
      submitters: [{ role: 'Co-tenant', completed_at: '2026-05-09T12:00:00Z' }],
    }
    expect(extractCompletedAt(payload, 'tenant')).toBeNull()
    expect(extractCompletedAt(payload, 'co_tenant')).toBe('2026-05-09T12:00:00Z')
  })
})
