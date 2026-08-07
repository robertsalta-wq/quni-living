/**
 * Structured open-items backlog for the Living Console (`/admin/open-items`).
 * Keep `docs/open-items.md` aligned when you add or close rows.
 */

export type OpenItemPriority = 'P0' | 'P1' | 'P2' | 'P3'

export type OpenItemSectionId = 'product' | 'tech' | 'ops'

export type OpenItem = {
  id: string
  what: string
  whyParked: string
  whenToDo: string
  where: string
  priority: OpenItemPriority
  section: OpenItemSectionId
}

export type DoneOpenItem = {
  id: string
  what: string
  closed: string
  notes: string
}

export const OPEN_ITEM_SECTIONS: {
  id: OpenItemSectionId
  label: string
  description: string
}[] = [
  {
    id: 'product',
    label: 'Product decisions',
    description: 'Choices that need a deliberate go / no-go, not just code.',
  },
  {
    id: 'tech',
    label: 'Tech debt / latent',
    description: 'Known residual code risk that is not on fire.',
  },
  {
    id: 'ops',
    label: 'Ops / follow-ups',
    description: 'Monitoring and process habits, not product features.',
  },
]

/** Active unfinished items (newest workstream first within each section is fine). */
export const OPEN_ITEMS: OpenItem[] = [
  {
    id: 'LEGAL-4',
    what: 'Enforce locked legal name before signing / bond docs / tenancy generation',
    whyParked:
      'Flag exists and is off so verification rollout does not hard-block signing',
    whenToDo:
      'After admin Photo ID legal-name capture is routine and support can unlock mistakes',
    where:
      'platform_config.legal_name_signing_gate_enabled · api/lib/booking/assertStudentLegalNameForSigning.ts',
    priority: 'P2',
    section: 'product',
  },
  {
    id: 'MSG-1',
    what: 'Decide whether renters can message landlords before full verification (book still gated)',
    whyParked:
      'Listing CTA treats incomplete readiness as a full block for message and book',
    whenToDo: 'When reviewing renter conversion vs verification strictness',
    where:
      'src/pages/PropertyDetail.tsx (studentListingActionsOk / canRequestBooking) · src/lib/renterReadiness.ts',
    priority: 'P2',
    section: 'product',
  },
  {
    id: 'OPS-1',
    what: 'Re-pull Sentry unresolved issues (last 7d) by events + users for renter routes',
    whyParked: 'MCP/Sentry agent tools failed during July triage',
    whenToDo: 'Next production incident triage or monthly health check',
    where:
      'Sentry org quni · project javascript-react · routes /listings, /booking, /messages, /student-profile, /student-dashboard',
    priority: 'P3',
    section: 'ops',
  },
]

/**
 * Note shown under Tech debt when that section has no open rows.
 * Keep in docs/open-items.md as well.
 */
export const OPEN_ITEMS_TECH_EMPTY_NOTE =
  'No latent tech debt from the legal-name / onboarding residual (as of 2026-08-08). Onboarding no longer writes first_name/last_name when locked (#268). Profile personal section already skipped those fields when locked (Phase 3d).'

export const OPEN_ITEMS_DONE: DoneOpenItem[] = [
  {
    id: 'LEGAL-1–3a',
    what: 'Schema: preferred_name, legal lock columns, lock trigger',
    closed: '2026-07',
    notes: 'Manual prod apply + migration files',
  },
  {
    id: 'LEGAL-3b–3c',
    what: 'Admin ID verify captures + locks legal name',
    closed: '2026-07',
    notes: 'API + admin Photo ID UI',
  },
  {
    id: 'LEGAL-3d',
    what: 'Renter profile: legal read-only when locked; preferred editable',
    closed: '2026-07',
    notes: 'RenterProfilePersonalSection',
  },
  {
    id: 'BOOK-1',
    what: 'Restore attachBookingToConversationOnCreate import',
    closed: '2026-07',
    notes: '43720c9',
  },
  {
    id: 'LEGAL-ONB',
    what: 'Onboarding skip legal name writes when locked',
    closed: '2026-08-08',
    notes: '#268',
  },
  {
    id: 'BOOK-UX-1',
    what: 'Managed booking: surface verification_required (not generic payment fail)',
    closed: '2026-08-08',
    notes: '#268',
  },
]

export function openItemsForSection(section: OpenItemSectionId): OpenItem[] {
  return OPEN_ITEMS.filter((item) => item.section === section)
}

export function priorityLabel(priority: OpenItemPriority): string {
  switch (priority) {
    case 'P0':
      return 'P0 fire'
    case 'P1':
      return 'P1 soon'
    case 'P2':
      return 'P2 product'
    case 'P3':
      return 'P3 nice'
  }
}
