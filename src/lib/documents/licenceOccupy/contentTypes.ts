/** State-specific narrative for on-site licence-to-occupy PDFs (T1 boarder/lodger). */
export type LicenceOccupyTerminationBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; intro?: string; items: readonly string[] }

export type LicenceOccupyContent = {
  docTitle: string
  docSubtitle: string
  draftFooter: string
  /** Schedule, signature block, and DocuSeal field label (default Owner). */
  partyLabel?: string
  /** Shown in the fixed header and title block when set (falls back to draftFooter). */
  watermark?: string
  natureParagraphs: readonly string[]
  roomSharedIntro: string
  /** When set, renders instead of roomSharedIntro (multiple paragraphs). */
  roomSharedParagraphs?: readonly string[]
  /** Section 3 heading (default Owner's right of entry). */
  entrySectionTitle?: string
  entryParagraphs: readonly string[]
  utilitiesDefault: string
  bond: {
    scheduleLabel: string
    sectionTitle: string
    intro: string
    bullets: readonly string[]
    /** Extra paragraphs after bond bullets (e.g. deposit-return terms). */
    afterBullets?: readonly string[]
  }
  terminationIntro: string
  terminationGrounds: readonly string[]
  terminationNoStatutory: string
  /** Section 6 heading (default Termination). */
  terminationSectionTitle?: string
  /** When set, replaces terminationIntro, grounds, and payment-aligned notice phrase. */
  terminationBlocks?: readonly LicenceOccupyTerminationBlock[]
  aclParagraph: string
  defaultHouseRules: readonly string[]
  /** Intro before house rules list (default references owner). */
  houseRulesIntro?: string
  houseRulesPrecedenceParagraph?: string
  careBullets: readonly string[]
  disputesParagraph: string
  /** When set, renders instead of disputesParagraph. */
  disputesParagraphs?: readonly string[]
  conditionReportIntro: string
  conditionReportReturn: string
  conditionReportOutgoing: string
  /** When set, renders instead of the three condition-report fields. */
  conditionReportParagraphs?: readonly string[]
  /** Clause 13 — continuation after fixed period (NSW). */
  continuationParagraphs?: readonly string[]
  feeFreeBankTransfer: string
  bankDetailsTemplate: string
  platformIntroPrefix: string
  /** Section 11 heading (default Quni platform and owner service fee). */
  platformSectionTitle?: string
  platformWarrantyParagraph?: string
  executionIntro: string
}
