/**
 * Shared React-PDF generator for on-site licence-to-occupy (T1 boarder/lodger).
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
import type { LicenceOccupyContent } from './contentTypes.js'
import { licenceTerminationNoticePhrase, ownerServiceFeeParagraph } from './utils.js'

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

function LicenceFooter({
  content,
  documentId,
  generatedAt,
}: {
  content: LicenceOccupyContent
  documentId: string
  generatedAt: string
}) {
  return (
    <View style={occupancyMatchPdf.footerWrapOa} fixed>
      <View style={occupancyMatchPdf.footerRuleOa} />
      <View style={occupancyMatchPdf.footerRowOa}>
        <Text style={occupancyMatchPdf.footerLeftCoral}>
          {`Quni Living · ${content.docTitle} · ${documentId} · ${generatedAt} · ${content.draftFooter}`}
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
  content,
  documentId,
  generatedAt,
  children,
}: {
  content: LicenceOccupyContent
  documentId: string
  generatedAt: string
  children: ReactNode
}) {
  return (
    <Page size="A4" style={occupancyMatchPdf.page}>
      <OccupancyMatchFixedHeader documentTitle={content.docTitle} subtitle={content.docSubtitle} />
      <LicenceFooter content={content} documentId={documentId} generatedAt={generatedAt} />
      {children}
    </Page>
  )
}

function ScheduleSummary({
  content,
  props,
}: {
  content: LicenceOccupyContent
  props: OccupancyAgreementProps
}) {
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
    ...(premises.roomsRentedToResidents != null && premises.roomsRentedToResidents >= 1
      ? [
          {
            label: 'Rooms for residents in premises:',
            value: String(premises.roomsRentedToResidents),
          },
        ]
      : []),
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
    { label: `${content.bond.scheduleLabel}:`, value: depositText },
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

export function LicenceOccupyDocument({
  content,
  props,
}: {
  content: LicenceOccupyContent
  props: OccupancyAgreementProps
}) {
  const { documentId, generatedAt, landlord, tenant, rent, bond, houseRules, specialConditions, bookingNotes } =
    props

  const ownerDisplay = landlord.companyName
    ? `${landlord.fullName} (${landlord.companyName})`
    : landlord.fullName

  const entityName = resolvePlatformLegalEntityName(null)

  const bondAmountLine =
    bond.amount != null && Number.isFinite(bond.amount)
      ? `The agreed ${content.bond.scheduleLabel.toLowerCase()} is ${formatMoney(bond.amount)}.`
      : `No ${content.bond.scheduleLabel.toLowerCase()} is required unless otherwise agreed in writing.`

  const houseRulesLines = houseRules?.trim()
    ? houseRules.trim().split(/\n+/).map((line) => line.trim()).filter(Boolean)
    : [...content.defaultHouseRules]

  const extraLines = [
    ...specialConditions.filter((c) => c.trim()),
    ...(bookingNotes?.trim() ? [bookingNotes.trim()] : []),
  ]

  return (
    <Document>
      <PageShell content={content} documentId={documentId} generatedAt={generatedAt}>
        <Text style={[occupancyMatchPdf.noteItalicMuted, { marginBottom: 8 }]}>{content.draftFooter}</Text>
        <ScheduleSummary content={content} props={props} />
        <OccupancyMatchSectionHeading num={1} title="Nature of arrangement" />
        {content.natureParagraphs.map((p, i) => (
          <BodyParagraph key={`n-${i}`}>{p}</BodyParagraph>
        ))}
        <OccupancyMatchSectionHeading num={2} title="Room and shared areas" />
        <BodyParagraph>{content.roomSharedIntro}</BodyParagraph>
      </PageShell>

      <PageShell content={content} documentId={documentId} generatedAt={generatedAt}>
        <OccupancyMatchSectionHeading num={3} title="Owner's right of entry" />
        {content.entryParagraphs.map((p, i) => (
          <BodyParagraph key={`e-${i}`}>{p}</BodyParagraph>
        ))}
        <OccupancyMatchSectionHeading num={4} title="Financial terms" />
        <BodyParagraph>
          The resident must pay the weekly licence fee of {formatMoney(rent.weeklyRent)} in advance, by the payment
          method stated in the schedule: {rent.paymentMethod}
        </BodyParagraph>
        <BodyParagraph>{content.utilitiesDefault}</BodyParagraph>
        <OccupancyMatchSectionHeading num={5} title={content.bond.sectionTitle} />
        <BodyParagraph>{content.bond.intro}</BodyParagraph>
        <BodyParagraph>{bondAmountLine}</BodyParagraph>
        {content.bond.bullets.map((b, i) => (
          <Bullet key={`b-${i}`}>{b}</Bullet>
        ))}
      </PageShell>

      <PageShell content={content} documentId={documentId} generatedAt={generatedAt}>
        <OccupancyMatchSectionHeading num={6} title="Termination" />
        <BodyParagraph>{content.terminationIntro}</BodyParagraph>
        <Bullet>{licenceTerminationNoticePhrase(rent.paymentMethod)}</Bullet>
        <BodyParagraph>Either party may end the licence immediately where:</BodyParagraph>
        {content.terminationGrounds.map((g, i) => (
          <Bullet key={`t-${i}`}>{g}</Bullet>
        ))}
        <BodyParagraph>{content.terminationNoStatutory}</BodyParagraph>
        <OccupancyMatchSectionHeading num={7} title="Australian Consumer Law" />
        <BodyParagraph>{content.aclParagraph}</BodyParagraph>
        <OccupancyMatchSectionHeading num={8} title="House rules" />
        <BodyParagraph>
          The resident must comply with the following house rules. Additional rules may be notified by the owner in
          writing.
        </BodyParagraph>
        {houseRulesLines.map((r, i) => (
          <Bullet key={`h-${i}`}>{r}</Bullet>
        ))}
        <OccupancyMatchSectionHeading num={9} title="Care of room and shared areas" />
        {content.careBullets.map((b, i) => (
          <Bullet key={`c-${i}`}>{b}</Bullet>
        ))}
      </PageShell>

      <PageShell content={content} documentId={documentId} generatedAt={generatedAt}>
        <OccupancyMatchSectionHeading num={10} title="Disputes" />
        <BodyParagraph>{content.disputesParagraph}</BodyParagraph>
        <OccupancyMatchSectionHeading num={11} title="Quni platform and owner service fee" />
        <BodyParagraph>
          {entityName} (the &quot;Platform&quot;) {content.platformIntroPrefix}
        </BodyParagraph>
        <BodyParagraph>
          {ownerServiceFeeParagraph(content.platformOwnerFeeTemplate, content.ownerServiceFeeDefault)}
        </BodyParagraph>
        <BodyParagraph>{content.platformResidentCarveout}</BodyParagraph>
        <BodyParagraph>{content.feeFreeBankTransfer}</BodyParagraph>
        <BodyParagraph>{content.bankDetailsTemplate}</BodyParagraph>
        <BodyParagraph>{content.conditionReportIntro}</BodyParagraph>
        <BodyParagraph>{content.conditionReportReturn}</BodyParagraph>
        <BodyParagraph>{content.conditionReportOutgoing}</BodyParagraph>
      </PageShell>

      <PageShell content={content} documentId={documentId} generatedAt={generatedAt}>
        {extraLines.length > 0 ? (
          <>
            <OccupancyMatchSectionHeading num={12} title="Additional terms" />
            {extraLines.map((line, i) => (
              <Bullet key={`x-${i}`}>{line}</Bullet>
            ))}
          </>
        ) : null}
        <OccupancyMatchSectionHeading num={13} title="Execution" />
        <BodyParagraph>{content.executionIntro}</BodyParagraph>
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
              <Text style={occupancyMatchPdf.sigNameBold}>{tenant.fullName}</Text>
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
      </PageShell>
    </Document>
  )
}
