/**
 * VIC on-site licence to occupy (boarder/lodger style) — single PDF, Part A review only.
 * Not wired to confirm flow, DocuSeal, or tenancyGeneratorToApiPath.
 */
import type { ReactNode } from 'react'
import { Document, Page, Text, View } from '@react-pdf/renderer'
import type { OccupancyAgreementProps } from '../../../../api/documents/rtaTypes.js'
import {
  OccupancyMatchFixedHeader,
  OccupancyMatchScheduleTable,
  OccupancyMatchSectionHeading,
  occupancyMatchPdf,
} from '../quniDocumentPdfTheme.js'
import { resolvePlatformLegalEntityName } from '../../platformIdentity.js'
import {
  VIC_LICENCE_ACL_PARAGRAPH,
  VIC_LICENCE_BANK_DETAILS_TEMPLATE,
  VIC_LICENCE_CARE_BULLETS,
  VIC_LICENCE_CONDITION_REPORT_INTRO,
  VIC_LICENCE_CONDITION_REPORT_OUTGOING,
  VIC_LICENCE_CONDITION_REPORT_RETURN,
  VIC_LICENCE_DEFAULT_HOUSE_RULES,
  VIC_LICENCE_DISPUTES_PARAGRAPH,
  VIC_LICENCE_DOC_SUBTITLE,
  VIC_LICENCE_DOC_TITLE,
  VIC_LICENCE_DRAFT_FOOTER,
  VIC_LICENCE_ENTRY_PARAGRAPHS,
  VIC_LICENCE_EXECUTION_INTRO,
  VIC_LICENCE_FEE_FREE_BANK_TRANSFER,
  VIC_LICENCE_NATURE_PARAGRAPHS,
  VIC_LICENCE_PLATFORM_INTRO_PREFIX,
  VIC_LICENCE_PLATFORM_RESIDENT_CARVEOUT,
  VIC_LICENCE_ROOM_SHARED_INTRO,
  VIC_LICENCE_SECURITY_DEPOSIT_BULLETS,
  VIC_LICENCE_SECURITY_DEPOSIT_INTRO,
  VIC_LICENCE_TERMINATION_GROUNDS,
  VIC_LICENCE_TERMINATION_INTRO,
  VIC_LICENCE_TERMINATION_NO_STATUTORY,
  VIC_LICENCE_UTILITIES_DEFAULT,
  licenceTerminationNoticePhrase,
  vicLicenceOwnerServiceFeeParagraph,
} from './occupancyContent.js'

function formatMoney(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

function formatAuDate(iso: string) {
  const d = iso.slice(0, 10)
  const parts = d.split('-')
  if (parts.length !== 3) return iso
  const [y, m, day] = parts
  if (!y || !m || !day) return iso
  return `${day}/${m}/${day}`
}

function yn(v: boolean | null) {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return '—'
}

function LicenceMatchFooter({
  documentId,
  generatedAt,
}: {
  documentId: string
  generatedAt: string
}) {
  return (
    <View style={occupancyMatchPdf.footerWrapOa} fixed>
      <View style={occupancyMatchPdf.footerRuleOa} />
      <View style={occupancyMatchPdf.footerRowOa}>
        <Text style={occupancyMatchPdf.footerLeftCoral}>
          {`Quni Living · ${VIC_LICENCE_DOC_TITLE} · ${documentId} · ${generatedAt} · ${VIC_LICENCE_DRAFT_FOOTER}`}
        </Text>
        <Text
          style={occupancyMatchPdf.footerPageCoral}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber}${totalPages ? ` of ${totalPages}` : ''}`
          }
        />
      </View>
    </View>
  )
}

function BodyParagraph({ children }: { children: ReactNode }) {
  return <Text style={occupancyMatchPdf.bodyParagraph}>{children}</Text>
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <Text style={[occupancyMatchPdf.bodyParagraph, { paddingLeft: 10 }]}>
      • {children}
    </Text>
  )
}

function PageShell({
  documentId,
  generatedAt,
  children,
}: {
  documentId: string
  generatedAt: string
  children: ReactNode
}) {
  return (
    <Page size="A4" style={occupancyMatchPdf.page}>
      <OccupancyMatchFixedHeader documentTitle={VIC_LICENCE_DOC_TITLE} subtitle={VIC_LICENCE_DOC_SUBTITLE} />
      <LicenceMatchFooter documentId={documentId} generatedAt={generatedAt} />
      {children}
    </Page>
  )
}

function ScheduleSummary(props: OccupancyAgreementProps) {
  const { landlord, tenant, premises, term, rent, bond } = props
  const ownerDisplay = landlord.companyName
    ? `${landlord.fullName} (${landlord.companyName})`
    : landlord.fullName
  const endDateText =
    term.periodic || !term.endDate
      ? 'Open-ended (continues until ended under this licence)'
      : formatAuDate(term.endDate)
  const depositText =
    bond.amount != null && Number.isFinite(bond.amount) ? formatMoney(bond.amount) : 'None agreed'

  const rows: { label: string; value: ReactNode }[] = [
    { label: 'Property address:', value: premises.addressLine },
    { label: 'Allocated room:', value: premises.roomType?.trim() || 'Bedroom as described on listing' },
    { label: 'Owner:', value: ownerDisplay },
    { label: 'Owner email:', value: landlord.email },
    { label: 'Owner phone:', value: landlord.phone },
    { label: 'Resident:', value: tenant.fullName },
    { label: 'Resident email:', value: tenant.email },
    { label: 'Resident phone:', value: tenant.phone },
    { label: 'Licence starts:', value: formatAuDate(term.startDate) },
    { label: 'Licence ends:', value: endDateText },
    { label: 'Licence period:', value: term.leaseLengthDescription },
    { label: 'Weekly licence fee:', value: formatMoney(rent.weeklyRent) },
    { label: 'Payment method:', value: rent.paymentMethod },
    { label: 'Security deposit:', value: depositText },
    { label: 'Furnished:', value: yn(premises.furnished) },
    { label: 'Linen supplied:', value: yn(premises.linenSupplied) },
    { label: 'Weekly cleaning:', value: yn(premises.weeklyCleaningService) },
  ]

  return (
    <View style={{ marginTop: 4, marginBottom: 10 }}>
      <Text style={[occupancyMatchPdf.sectionTitle, { marginBottom: 6 }]}>Schedule</Text>
      <View style={occupancyMatchPdf.sectionHeadingRule} />
      <OccupancyMatchScheduleTable rows={rows} />
    </View>
  )
}

function SectionNature() {
  return (
    <View>
      <OccupancyMatchSectionHeading num={1} title="Nature of arrangement" />
      {VIC_LICENCE_NATURE_PARAGRAPHS.map((p, i) => (
        <BodyParagraph key={i}>{p}</BodyParagraph>
      ))}
    </View>
  )
}

function SectionRoom() {
  return (
    <View>
      <OccupancyMatchSectionHeading num={2} title="Room and shared areas" />
      <BodyParagraph>{VIC_LICENCE_ROOM_SHARED_INTRO}</BodyParagraph>
    </View>
  )
}

function SectionEntry() {
  return (
    <View>
      <OccupancyMatchSectionHeading num={3} title="Owner's right of entry" />
      {VIC_LICENCE_ENTRY_PARAGRAPHS.map((p, i) => (
        <BodyParagraph key={i}>{p}</BodyParagraph>
      ))}
    </View>
  )
}

function SectionFinancial(props: OccupancyAgreementProps) {
  const { rent } = props

  return (
    <View>
      <OccupancyMatchSectionHeading num={4} title="Financial terms" />
      <BodyParagraph>
        The resident must pay the weekly licence fee of {formatMoney(rent.weeklyRent)} in advance, by the payment
        method stated in the schedule: {rent.paymentMethod}
      </BodyParagraph>
      <BodyParagraph>{VIC_LICENCE_UTILITIES_DEFAULT}</BodyParagraph>
    </View>
  )
}

function SectionSecurityDeposit(props: OccupancyAgreementProps) {
  const { bond } = props
  const amountLine =
    bond.amount != null && Number.isFinite(bond.amount)
      ? `The agreed security deposit is ${formatMoney(bond.amount)}.`
      : 'No security deposit is required unless otherwise agreed in writing.'

  return (
    <View>
      <OccupancyMatchSectionHeading num={5} title="Security deposit" />
      <BodyParagraph>{VIC_LICENCE_SECURITY_DEPOSIT_INTRO}</BodyParagraph>
      <BodyParagraph>{amountLine}</BodyParagraph>
      {VIC_LICENCE_SECURITY_DEPOSIT_BULLETS.map((b, i) => (
        <Bullet key={i}>{b}</Bullet>
      ))}
    </View>
  )
}

function SectionTermination(props: OccupancyAgreementProps) {
  const notice = licenceTerminationNoticePhrase(props.rent.paymentMethod)
  return (
    <View>
      <OccupancyMatchSectionHeading num={6} title="Termination" />
      <BodyParagraph>{VIC_LICENCE_TERMINATION_INTRO}</BodyParagraph>
      <Bullet>{notice}</Bullet>
      <BodyParagraph>Either party may end the licence immediately where:</BodyParagraph>
      {VIC_LICENCE_TERMINATION_GROUNDS.map((g, i) => (
        <Bullet key={i}>{g}</Bullet>
      ))}
      <BodyParagraph>{VIC_LICENCE_TERMINATION_NO_STATUTORY}</BodyParagraph>
    </View>
  )
}

function SectionAcl() {
  return (
    <View>
      <OccupancyMatchSectionHeading num={7} title="Australian Consumer Law" />
      <BodyParagraph>{VIC_LICENCE_ACL_PARAGRAPH}</BodyParagraph>
    </View>
  )
}

function SectionHouseRules(props: OccupancyAgreementProps) {
  const custom = props.houseRules?.trim()
  const rules = custom
    ? custom.split(/\n+/).map((line) => line.trim()).filter(Boolean)
    : [...VIC_LICENCE_DEFAULT_HOUSE_RULES]

  return (
    <View>
      <OccupancyMatchSectionHeading num={8} title="House rules" />
      <BodyParagraph>
        The resident must comply with the following house rules. Additional rules may be notified by the owner in
        writing.
      </BodyParagraph>
      {rules.map((r, i) => (
        <Bullet key={i}>{r}</Bullet>
      ))}
    </View>
  )
}

function SectionCare() {
  return (
    <View>
      <OccupancyMatchSectionHeading num={9} title="Care of room and shared areas" />
      {VIC_LICENCE_CARE_BULLETS.map((b, i) => (
        <Bullet key={i}>{b}</Bullet>
      ))}
    </View>
  )
}

function SectionDisputes() {
  return (
    <View>
      <OccupancyMatchSectionHeading num={10} title="Disputes" />
      <BodyParagraph>{VIC_LICENCE_DISPUTES_PARAGRAPH}</BodyParagraph>
    </View>
  )
}

function SectionPlatform() {
  const entityName = resolvePlatformLegalEntityName(null)

  return (
    <View>
      <OccupancyMatchSectionHeading num={11} title="Quni platform and owner service fee" />
      <BodyParagraph>
        {entityName} (the &quot;Platform&quot;) {VIC_LICENCE_PLATFORM_INTRO_PREFIX}
      </BodyParagraph>
      <BodyParagraph>{vicLicenceOwnerServiceFeeParagraph()}</BodyParagraph>
      <BodyParagraph>{VIC_LICENCE_PLATFORM_RESIDENT_CARVEOUT}</BodyParagraph>
      <BodyParagraph>{VIC_LICENCE_FEE_FREE_BANK_TRANSFER}</BodyParagraph>
      <BodyParagraph>{VIC_LICENCE_BANK_DETAILS_TEMPLATE}</BodyParagraph>
      <BodyParagraph>{VIC_LICENCE_CONDITION_REPORT_INTRO}</BodyParagraph>
      <BodyParagraph>{VIC_LICENCE_CONDITION_REPORT_RETURN}</BodyParagraph>
      <BodyParagraph>{VIC_LICENCE_CONDITION_REPORT_OUTGOING}</BodyParagraph>
    </View>
  )
}

function SectionSpecialConditions(props: OccupancyAgreementProps) {
  const { specialConditions, bookingNotes } = props
  const lines = [
    ...specialConditions.filter((c) => c.trim()),
    ...(bookingNotes?.trim() ? [bookingNotes.trim()] : []),
  ]
  if (lines.length === 0) return null

  return (
    <View>
      <OccupancyMatchSectionHeading num={12} title="Additional terms" />
      {lines.map((line, i) => (
        <Bullet key={i}>{line}</Bullet>
      ))}
    </View>
  )
}

function SectionExecution(props: OccupancyAgreementProps) {
  const ownerDisplay = props.landlord.companyName
    ? `${props.landlord.fullName} (${props.landlord.companyName})`
    : props.landlord.fullName

  return (
    <View>
      <OccupancyMatchSectionHeading num={13} title="Execution" />
      <BodyParagraph>{VIC_LICENCE_EXECUTION_INTRO}</BodyParagraph>
      <View style={occupancyMatchPdf.sigTable}>
        <View style={occupancyMatchPdf.sigHeaderRow}>
          <View style={occupancyMatchPdf.sigHeaderCell}>
            <Text style={occupancyMatchPdf.thText}>Owner</Text>
          </View>
          <View style={occupancyMatchPdf.sigHeaderCellLast}>
            <Text style={occupancyMatchPdf.thText}>Resident</Text>
          </View>
        </View>
        <View style={occupancyMatchPdf.sigBodyRow}>
          <View style={occupancyMatchPdf.sigCol}>
            <Text style={occupancyMatchPdf.sigNameBold}>{ownerDisplay}</Text>
            <View style={occupancyMatchPdf.docusealSignatureFieldBox}>
              <View style={occupancyMatchPdf.sigLabelRow}>
                <Text style={occupancyMatchPdf.sigLabel}>Signature </Text>
                <Text style={occupancyMatchPdf.docusealTagOa}>
                  {'{{Owner Signature;role=First Party;type=signature}}'}
                </Text>
              </View>
            </View>
            <View style={occupancyMatchPdf.docusealDateFieldBox}>
              <View style={occupancyMatchPdf.sigLabelRow}>
                <Text style={occupancyMatchPdf.sigLabel}>Date </Text>
                <Text style={occupancyMatchPdf.docusealTagOa}>
                  {'{{Owner Sign Date;role=First Party;type=date}}'}
                </Text>
              </View>
            </View>
          </View>
          <View style={occupancyMatchPdf.sigColLast}>
            <Text style={occupancyMatchPdf.sigNameBold}>{props.tenant.fullName}</Text>
            <View style={occupancyMatchPdf.docusealSignatureFieldBox}>
              <View style={occupancyMatchPdf.sigLabelRow}>
                <Text style={occupancyMatchPdf.sigLabel}>Signature </Text>
                <Text style={occupancyMatchPdf.docusealTagOa}>
                  {'{{Resident Signature;role=Second Party;type=signature}}'}
                </Text>
              </View>
            </View>
            <View style={occupancyMatchPdf.docusealDateFieldBox}>
              <View style={occupancyMatchPdf.sigLabelRow}>
                <Text style={occupancyMatchPdf.sigLabel}>Date </Text>
                <Text style={occupancyMatchPdf.docusealTagOa}>
                  {'{{Resident Sign Date;role=Second Party;type=date}}'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

export function VicLicenceToOccupyOnSite(props: OccupancyAgreementProps) {
  const { documentId, generatedAt } = props

  return (
    <Document>
      <PageShell documentId={documentId} generatedAt={generatedAt}>
        <Text style={[occupancyMatchPdf.noteItalicMuted, { marginBottom: 8 }]}>{VIC_LICENCE_DRAFT_FOOTER}</Text>
        <ScheduleSummary {...props} />
        <SectionNature />
        <SectionRoom />
      </PageShell>
      <PageShell documentId={documentId} generatedAt={generatedAt}>
        <SectionEntry />
        <SectionFinancial {...props} />
        <SectionSecurityDeposit {...props} />
      </PageShell>
      <PageShell documentId={documentId} generatedAt={generatedAt}>
        <SectionTermination {...props} />
        <SectionAcl />
        <SectionHouseRules {...props} />
        <SectionCare />
      </PageShell>
      <PageShell documentId={documentId} generatedAt={generatedAt}>
        <SectionDisputes />
        <SectionPlatform />
      </PageShell>
      <PageShell documentId={documentId} generatedAt={generatedAt}>
        <SectionSpecialConditions {...props} />
        <SectionExecution {...props} />
      </PageShell>
    </Document>
  )
}

export default VicLicenceToOccupyOnSite
