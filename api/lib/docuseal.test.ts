import { describe, expect, it } from 'vitest'

import { extractCompletedAt, extractSubmissionIdFromWebhook } from './docuseal.js'

describe('extractSubmissionIdFromWebhook', () => {
  it('prefers data.submission.id over data.id for form.completed (data.id is submitter id)', () => {
    const payload = {
      event_type: 'form.completed',
      data: {
        id: 279,
        role: 'First Party',
        completed_at: '2026-07-12T08:12:51.867Z',
        submission: { id: 165, status: 'pending' },
      },
    }
    expect(extractSubmissionIdFromWebhook(payload)).toBe('165')
  })

  it('still reads submission id from data.id for submission.completed', () => {
    const payload = {
      event_type: 'submission.completed',
      data: {
        id: 165,
        status: 'completed',
        submitters: [],
      },
    }
    expect(extractSubmissionIdFromWebhook(payload)).toBe('165')
  })
})

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

  it('reads form.completed single-submitter data.role / data.completed_at', () => {
    const payload = {
      event_type: 'form.completed',
      data: {
        id: 279,
        role: 'First Party',
        completed_at: '2026-07-12T08:12:51.867Z',
        submission: { id: 165 },
      },
    }
    expect(extractCompletedAt(payload, 'landlord')).toBe('2026-07-12T08:12:51.867Z')
    expect(extractCompletedAt(payload, 'tenant')).toBeNull()
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

  it('returns null when payload is missing the submitters array and is not a form submitter', () => {
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
