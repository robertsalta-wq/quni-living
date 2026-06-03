/** State-specific narrative for on-site licence-to-occupy PDFs (T1 boarder/lodger). */
export type LicenceOccupyContent = {
  docTitle: string
  docSubtitle: string
  draftFooter: string
  natureParagraphs: readonly string[]
  roomSharedIntro: string
  entryParagraphs: readonly string[]
  utilitiesDefault: string
  bond: {
    scheduleLabel: string
    sectionTitle: string
    intro: string
    bullets: readonly string[]
  }
  terminationIntro: string
  terminationGrounds: readonly string[]
  terminationNoStatutory: string
  aclParagraph: string
  defaultHouseRules: readonly string[]
  careBullets: readonly string[]
  disputesParagraph: string
  conditionReportIntro: string
  conditionReportReturn: string
  conditionReportOutgoing: string
  feeFreeBankTransfer: string
  bankDetailsTemplate: string
  platformIntroPrefix: string
  executionIntro: string
}
