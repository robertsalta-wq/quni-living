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
import { buildLicencePlatformEntityDisplay } from '../../platformIdentity.js'
import type { LicenceOccupyContent, LicenceOccupyTerminationBlock } from './contentTypes.js'
import {
  licenceTerminationNoticePhrase,
  ownerServiceFeeParagraphForTier,
  type LicenceOccupyServiceTier,
} from './utils.js'
import {
  LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE,
  LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE,
  LICENCE_OCCUPY_DOCUSEAL_TAG_HIDDEN,
  licenceOccupyDocusealTag,
} from './docusealTags.js'

function formatMoney(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

function formatAuDate(iso: string) {
  const d = iso.slice(0, 10)
  const parts = d.split('-')
  if (parts.length !== 3) return iso
  const [y, m, day] = parts
  if (!y || !m || !day) return iso
  return `${day}/${m}/${y}`
}

function yn(v: boolean | null) {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return '-'
}

function renderTerminationBlocks(blocks: readonly LicenceOccupyTerminationBlock[]) {
  return blocks.map((block, i) => {
    if (block.kind === 'paragraph') {
      return <BodyParagraph key={`tb-p-${i}`}>{block.text}</BodyParagraph>
    }
    return (
      <View key={`tb-b-${i}`}>
        {block.intro ? <BodyParagraph>{block.intro}</BodyParagraph> : null}
        {block.items.map((item, j) => (
          <Bullet key={`tb-b-${i}-${j}`}>{item}</Bullet>
        ))}
      </View>
    )
  })
}

function LicenceFooter({
  content,
  documentId,
  generatedAt,
  footerText,
}: {
  content: LicenceOccupyContent
  documentId: string
  generatedAt: string
  footerText: string
}) {
  return (
    <View style={occupancyMatchPdf.footerWrapOa} fixed>
      <View style={occupancyMatchPdf.footerRuleOa} />
      <View style={occupancyMatchPdf.footerRowOa}>
        <Text style={occupancyMatchPdf.footerLeftCoral}>
          {`Quni Living · ${content.docTitle} · ${documentId} · ${generatedAt}${footerText ? ` · ${footerText}` : ''}`}
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

function DocusealField({
  label,
  tag,
  boxStyle,
  sized,
}: {
  label: string
  tag: string
  boxStyle: typeof occupancyMatchPdf.docusealSignatureFieldBox
  sized: boolean
}) {
  if (sized) {
    return (
      <View style={boxStyle}>
        <Text style={occupancyMatchPdf.sigLabel}>{label}</Text>
        <Text style={LICENCE_OCCUPY_DOCUSEAL_TAG_HIDDEN}>{tag}</Text>
      </View>
    )
  }
  return (
    <View style={boxStyle}>
      <View style={occupancyMatchPdf.sigLabelRow}>
        <Text style={occupancyMatchPdf.sigLabel}>{label} </Text>
        <Text style={occupancyMatchPdf.docusealTagOa}>{tag}</Text>
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
  footerText,
  children,
}: {
  content: LicenceOccupyContent
  documentId: string
  generatedAt: string
  footerText: string
  children: ReactNode
}) {
  return (
    <Page size="A4" style={occupancyMatchPdf.page}>
      <OccupancyMatchFixedHeader
        documentTitle={content.docTitle}
        subtitle={content.docSubtitle}
        watermark={content.watermark}
      />
      <LicenceFooter
        content={content}
        documentId={documentId}
        generatedAt={generatedAt}
        footerText={footerText}
      />
      {children}
    </Page>
  )
}

function ScheduleSummary({
  content,
  props,
  partyLabel,
}: {
  content: LicenceOccupyContent
  props: OccupancyAgreementProps
  partyLabel: string
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
    { label: `${partyLabel}:`, value: ownerDisplay },
    { label: `${partyLabel} email:`, value: landlord.email },
    { label: `${partyLabel} phone:`, value: landlord.phone },
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

  const partyLabel = content.partyLabel ?? 'Owner'
  const partyLabelLower = partyLabel.toLowerCase()
  const headerWatermark = content.watermark
  const footerText = headerWatermark ? '' : content.draftFooter

  const ownerDisplay = landlord.companyName
    ? `${landlord.fullName} (${landlord.companyName})`
    : landlord.fullName

  const platformEntityDisplay = buildLicencePlatformEntityDisplay({
    legalName: props.platformLegalName,
    acn: props.platformAcn,
    tradingName: props.platformTradingName,
  })

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

  const serviceTier: LicenceOccupyServiceTier = props.serviceTier === 'managed' ? 'managed' : 'listing'
  const hasExtraTerms = extraLines.length > 0
  const hasContinuation = (content.continuationParagraphs?.length ?? 0) > 0

  const conditionReportClauseNum = 12
  const continuationClauseNum = hasContinuation ? 13 : null
  const additionalTermsClauseNum = hasContinuation ? 14 : 13
  const executionClauseNum = hasContinuation ? (hasExtraTerms ? 15 : 14) : hasExtraTerms ? 14 : 13

  const entrySectionTitle = content.entrySectionTitle ?? "Owner's right of entry"
  const terminationSectionTitle = content.terminationSectionTitle ?? 'Termination'
  const platformSectionTitle = content.platformSectionTitle ?? 'Quni platform and owner service fee'
  const houseRulesIntro =
    content.houseRulesIntro ??
    `The resident must comply with the following house rules. Additional rules may be notified by the ${partyLabelLower} in writing.`

  const pageShellProps = { content, documentId, generatedAt, footerText }
  const docusealSized = content.docusealSizedSignatureFields === true
  const principalSignatureTag = licenceOccupyDocusealTag(
    `${partyLabel} Signature`,
    'First Party',
    'signature',
    docusealSized ? LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE : undefined,
  )
  const principalDateTag = licenceOccupyDocusealTag(
    `${partyLabel} Sign Date`,
    'First Party',
    'date',
    docusealSized ? LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE : undefined,
  )
  const residentSignatureTag = licenceOccupyDocusealTag(
    'Resident Signature',
    'Second Party',
    'signature',
    docusealSized ? LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE : undefined,
  )
  const residentDateTag = licenceOccupyDocusealTag(
    'Resident Sign Date',
    'Second Party',
    'date',
    docusealSized ? LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE : undefined,
  )

  return (
    <Document>
      <PageShell {...pageShellProps}>
        {!headerWatermark ? (
          <Text style={[occupancyMatchPdf.noteItalicMuted, { marginBottom: 8 }]}>{content.draftFooter}</Text>
        ) : null}
        <ScheduleSummary content={content} props={props} partyLabel={partyLabel} />
        <OccupancyMatchSectionHeading num={1} title="Nature of arrangement" />
        {content.natureParagraphs.map((p, i) => (
          <BodyParagraph key={`n-${i}`}>{p}</BodyParagraph>
        ))}
        <OccupancyMatchSectionHeading num={2} title="Room and shared areas" />
        {content.roomSharedParagraphs
          ? content.roomSharedParagraphs.map((p, i) => <BodyParagraph key={`r-${i}`}>{p}</BodyParagraph>)
          : <BodyParagraph>{content.roomSharedIntro}</BodyParagraph>}
      </PageShell>

      <PageShell {...pageShellProps}>
        <OccupancyMatchSectionHeading num={3} title={entrySectionTitle} />
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
        {content.bond.afterBullets?.map((p, i) => (
          <BodyParagraph key={`ba-${i}`}>{p}</BodyParagraph>
        ))}
      </PageShell>

      <PageShell {...pageShellProps}>
        <OccupancyMatchSectionHeading num={6} title={terminationSectionTitle} />
        {content.terminationBlocks ? (
          <>
            {renderTerminationBlocks(content.terminationBlocks)}
            <BodyParagraph>{content.terminationNoStatutory}</BodyParagraph>
          </>
        ) : (
          <>
            <BodyParagraph>{content.terminationIntro}</BodyParagraph>
            <Bullet>{licenceTerminationNoticePhrase(rent.paymentMethod)}</Bullet>
            <BodyParagraph>Either party may end the licence immediately where:</BodyParagraph>
            {content.terminationGrounds.map((g, i) => (
              <Bullet key={`t-${i}`}>{g}</Bullet>
            ))}
            <BodyParagraph>{content.terminationNoStatutory}</BodyParagraph>
          </>
        )}
        <OccupancyMatchSectionHeading num={7} title="Australian Consumer Law" />
        <BodyParagraph>{content.aclParagraph}</BodyParagraph>
        <OccupancyMatchSectionHeading num={8} title="House rules" />
        <BodyParagraph>{houseRulesIntro}</BodyParagraph>
        {content.houseRulesPrecedenceParagraph ? (
          <BodyParagraph>{content.houseRulesPrecedenceParagraph}</BodyParagraph>
        ) : null}
        {houseRulesLines.map((r, i) => (
          <Bullet key={`h-${i}`}>{r}</Bullet>
        ))}
        <OccupancyMatchSectionHeading num={9} title="Care of room and shared areas" />
        {content.careBullets.map((b, i) => (
          <Bullet key={`c-${i}`}>{b}</Bullet>
        ))}
      </PageShell>

      <PageShell {...pageShellProps}>
        <OccupancyMatchSectionHeading num={10} title="Disputes" />
        {content.disputesParagraphs
          ? content.disputesParagraphs.map((p, i) => <BodyParagraph key={`d-${i}`}>{p}</BodyParagraph>)
          : <BodyParagraph>{content.disputesParagraph}</BodyParagraph>}
        <OccupancyMatchSectionHeading num={11} title={platformSectionTitle} />
        <BodyParagraph>
          {platformEntityDisplay} (the &quot;Platform&quot;) {content.platformIntroPrefix}
        </BodyParagraph>
        {content.platformWarrantyParagraph ? (
          <BodyParagraph>{content.platformWarrantyParagraph}</BodyParagraph>
        ) : null}
        <BodyParagraph>
          {ownerServiceFeeParagraphForTier(
            serviceTier,
            rent.platformFeePercent,
            undefined,
            partyLabel,
          )}
        </BodyParagraph>
        <BodyParagraph>{content.feeFreeBankTransfer}</BodyParagraph>
        <BodyParagraph>{content.bankDetailsTemplate}</BodyParagraph>
      </PageShell>

      <PageShell {...pageShellProps}>
        <OccupancyMatchSectionHeading num={conditionReportClauseNum} title="Condition report" />
        {content.conditionReportParagraphs ? (
          content.conditionReportParagraphs.map((p, i) => <BodyParagraph key={`cr-${i}`}>{p}</BodyParagraph>)
        ) : (
          <>
            <BodyParagraph>{content.conditionReportIntro}</BodyParagraph>
            <BodyParagraph>{content.conditionReportReturn}</BodyParagraph>
            <BodyParagraph>{content.conditionReportOutgoing}</BodyParagraph>
          </>
        )}
        {hasContinuation && content.continuationParagraphs ? (
          <>
            <OccupancyMatchSectionHeading num={continuationClauseNum!} title="Continuation after fixed period" />
            {content.continuationParagraphs.map((p, i) => (
              <BodyParagraph key={`cont-${i}`}>{p}</BodyParagraph>
            ))}
          </>
        ) : null}
        {hasExtraTerms ? (
          <>
            <OccupancyMatchSectionHeading num={additionalTermsClauseNum} title="Additional terms" />
            {extraLines.map((line, i) => (
              <Bullet key={`x-${i}`}>{line}</Bullet>
            ))}
          </>
        ) : null}
        <OccupancyMatchSectionHeading num={executionClauseNum} title="Execution" />
        <BodyParagraph>{content.executionIntro}</BodyParagraph>
        <View style={occupancyMatchPdf.sigTable}>
          <View style={occupancyMatchPdf.sigHeaderRow}>
            <View style={occupancyMatchPdf.sigHeaderCell}>
              <Text style={occupancyMatchPdf.thText}>{partyLabel}</Text>
            </View>
            <View style={occupancyMatchPdf.sigHeaderCellLast}>
              <Text style={occupancyMatchPdf.thText}>Resident</Text>
            </View>
          </View>
          <View style={occupancyMatchPdf.sigBodyRow}>
            <View style={occupancyMatchPdf.sigCol}>
              <Text style={occupancyMatchPdf.sigNameBold}>{ownerDisplay}</Text>
              <DocusealField
                label="Signature"
                tag={principalSignatureTag}
                boxStyle={occupancyMatchPdf.docusealSignatureFieldBox}
                sized={docusealSized}
              />
              <DocusealField
                label="Date"
                tag={principalDateTag}
                boxStyle={occupancyMatchPdf.docusealDateFieldBox}
                sized={docusealSized}
              />
            </View>
            <View style={occupancyMatchPdf.sigColLast}>
              <Text style={occupancyMatchPdf.sigNameBold}>{tenant.fullName}</Text>
              <DocusealField
                label="Signature"
                tag={residentSignatureTag}
                boxStyle={occupancyMatchPdf.docusealSignatureFieldBox}
                sized={docusealSized}
              />
              <DocusealField
                label="Date"
                tag={residentDateTag}
                boxStyle={occupancyMatchPdf.docusealDateFieldBox}
                sized={docusealSized}
              />
            </View>
          </View>
        </View>
      </PageShell>
    </Document>
  )
}
