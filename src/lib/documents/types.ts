/**
 * Shared shape for state-specific prescribed / platform document content.
 * Implementations live under `nsw/` and `vic/` (see scaffold files).
 */

export interface ClauseContent {
  number: string | number
  heading: string
  body: string
  notes?: string[]
}

export interface SectionContent {
  id: string
  heading: string
  /** Clause numbers that belong to this section */
  clauses: string[]
}

export interface DocumentContent {
  jurisdiction: {
    state: string
    legislationName: string
    legislationYear: number
    tribunal: string
    regulator: string
    regulatorPhone: string
    regulatorUrl: string
    bondAuthority: string
    bondAuthorityEmail: string
    bondAuthorityPhone: string
    electronicTransactionsAct: string
    terminology: {
      /** e.g. 'rental provider' (VIC) or 'landlord' (NSW) */
      landlord: string
      /** e.g. 'renter' (VIC) or 'tenant' (NSW) */
      tenant: string
    }
  }
  clauses: Record<string, ClauseContent>
  sections: SectionContent[]
}
