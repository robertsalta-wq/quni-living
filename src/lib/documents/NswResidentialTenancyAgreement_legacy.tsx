import type { ReactNode } from 'react'
import { Document, Page, Text, View } from '@react-pdf/renderer'
import type { NswResidentialTenancyAgreementProps } from '../../../api/documents/rtaTypes.js'
import {
  FT6600_CLAUSES_1_TO_55,
  FT6600_NOTES,
  FT6600_TITLE_AND_IMPORTANT,
} from './ft6600EmbeddedStrings.js'
import {
  OccupancyMatchClauseChunk,
  OccupancyMatchFixedHeader,
  OccupancyMatchFooter,
  OccupancyMatchScheduleTable,
  OccupancyMatchSectionHeading,
  QuniRtaMarginStamp,
  occupancyMatchPdf,
} from './quniDocumentPdfTheme.js'

function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length)
    if (end < text.length) {
      const cut = text.lastIndexOf('\n\n', end)
      if (cut > start) end = cut
      else {
        const cut2 = text.lastIndexOf('\n', end)
        if (cut2 > start) end = cut2
      }
    }
    chunks.push(text.slice(start, end))
    start = end
  }
  return chunks
}

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

function furnishedText(v: boolean | null) {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return '—'
}

function consentText(v: boolean) {
  return v ? 'Yes' : 'No'
}

function rentFrequencyWord(freq: 'weekly' | 'fortnightly' | 'monthly') {
  if (freq === 'weekly') return 'week'
  if (freq === 'fortnightly') return 'fortnight'
  return 'month'
}

function rentAmountForFrequency(weeklyRent: number, freq: 'weekly' | 'fortnightly' | 'monthly') {
  if (freq === 'weekly') return weeklyRent
  if (freq === 'fortnightly') return weeklyRent * 2
  const m = 52 / 12
  return Math.round(weeklyRent * m * 100) / 100
}

function tradeLine(v: string | null) {
  if (v == null || !v.trim()) return '—'
  return v.trim()
}

/** FT6600 embeds ASCII `===` banners; replace with Occupancy-style section headings in the PDF. */
const FT6600_ASCII_BANNER_SPLIT =
  /\r?\n\r?\n=+\r?\nIMPORTANT INFORMATION\r?\n=+\r?\n\r?\n/i

function splitTitleAndImportant(raw: string): { preamble: string; importantBody: string } {
  const parts = raw.split(FT6600_ASCII_BANNER_SPLIT)
  if (parts.length >= 2 && parts[0] != null && parts[1] != null) {
    return { preamble: parts[0].trimEnd(), importantBody: parts[1] }
  }
  return { preamble: raw, importantBody: '' }
}

function stripLeadingNotesAsciiBanner(s: string): string {
  return s.replace(/^=+\r?\nNOTES\r?\n=+\r?\n\r?\n/i, '')
}

function rtaScheduleTenantNamePopulated(raw: string): boolean {
  const t = raw.trim()
  return t.length > 0 && t !== '—'
}

function RtaUnnumberedSectionHeading({ title }: { title: string }) {
  return (
    <View style={occupancyMatchPdf.sectionRow} wrap={false}>
      <View style={occupancyMatchPdf.sectionBadge} />
      <View style={occupancyMatchPdf.sectionTitleCol}>
        <Text style={occupancyMatchPdf.sectionTitle}>{title}</Text>
        <View style={occupancyMatchPdf.sectionHeadingRule} />
      </View>
    </View>
  )
}

function bulletValue(lines: string[]) {
  return (
    <View>
      {lines.map((line, i) => (
        <Text key={i} style={occupancyMatchPdf.dataValueBold}>
          • {line}
        </Text>
      ))}
    </View>
  )
}

function ScheduleBlock(props: NswResidentialTenancyAgreementProps) {
  const {
    landlord,
    tenant,
    additionalTenantNames,
    premises,
    premisesPartDescription,
    additionalPremisesInclusions,
    maxOccupantsPermitted,
    term,
    rent,
    bond,
    landlordAgent,
    urgentRepairsTradespeople,
    electronicService,
    specialConditions,
    bookingNotes,
  } = props

  const landlordDisplay = landlord.companyName
    ? `${landlord.fullName} (${landlord.companyName})`
    : landlord.fullName

  const endDateText =
    term.periodic || !term.endDate ? 'Periodic tenancy (no fixed end date)' : formatAuDate(term.endDate)

  const rentForFrequency = rentAmountForFrequency(rent.weeklyRent, rent.rentFrequency)

  const bondText =
    bond.amount != null && Number.isFinite(bond.amount) ? formatMoney(bond.amount) : '—'

  const t2 = additionalTenantNames[0]?.trim() ?? ''
  const t3 = additionalTenantNames[1]?.trim() ?? ''
  const t4 = additionalTenantNames[2]?.trim() ?? ''

  const inclusions =
    additionalPremisesInclusions.length > 0 ? additionalPremisesInclusions : ['—']

  const partiesRows: { label: string; value: ReactNode }[] = [
    { label: 'Landlord:', value: landlordDisplay },
    { label: 'Landlord address for service:', value: landlord.addressLine },
    { label: 'Landlord email:', value: landlord.email },
    { label: 'Landlord phone:', value: landlord.phone },
  ]

  if (landlordAgent) {
    partiesRows.push(
      { label: "Landlord's agent:", value: landlordAgent.name },
      { label: 'Agent licence number:', value: landlordAgent.licenseNumber?.trim() || '—' },
      { label: 'Agent business address:', value: landlordAgent.businessAddress },
      { label: 'Agent phone:', value: landlordAgent.phone },
      { label: 'Agent email:', value: landlordAgent.email?.trim() || '—' },
    )
  } else {
    partiesRows.push({ label: "Landlord's agent:", value: 'Not applicable' })
  }

  partiesRows.push(
    { label: 'Tenant (1):', value: tenant.fullName },
    { label: 'Tenant email:', value: tenant.email },
    { label: 'Tenant phone:', value: tenant.phone },
  )
  if (tenant.dateOfBirth) {
    partiesRows.push({ label: 'Tenant date of birth:', value: formatAuDate(tenant.dateOfBirth) })
  }
  partiesRows.push(
    { label: 'Tenant (2):', value: t2 || '—' },
    { label: 'Tenant (3):', value: t3 || '—' },
    { label: 'Tenant (4):', value: t4 || '—' },
  )

  const premisesRows: { label: string; value: ReactNode }[] = [
    { label: 'Residential premises (address):', value: premises.addressLine },
    { label: 'Part of premises only (if applicable):', value: premisesPartDescription?.trim() || '—' },
    {
      label: 'Additional things included with residential premises:',
      value: bulletValue(inclusions),
    },
    {
      label: 'Maximum occupants permitted:',
      value:
        maxOccupantsPermitted != null && Number.isFinite(maxOccupantsPermitted)
          ? String(maxOccupantsPermitted)
          : '—',
    },
    { label: 'Room type:', value: premises.roomType ?? '—' },
    { label: 'Furnished:', value: furnishedText(premises.furnished) },
    { label: 'Linen supplied:', value: furnishedText(premises.linenSupplied) },
    { label: 'Weekly cleaning service:', value: furnishedText(premises.weeklyCleaningService) },
  ]

  const termRentRows: { label: string; value: string }[] = [
    { label: 'Commencement date:', value: formatAuDate(term.startDate) },
    { label: 'End date (fixed term) / tenancy type:', value: endDateText },
    { label: 'Lease length (description):', value: term.leaseLengthDescription },
    {
      label: `Rent amount (per ${rentFrequencyWord(rent.rentFrequency)}):`,
      value: formatMoney(rentForFrequency),
    },
    { label: 'Rent payment timing:', value: rent.paymentTimingDescription },
    { label: 'Rent payment method:', value: rent.paymentMethod },
    { label: 'Rental bond:', value: bondText },
  ]

  const consentCheckbox = (checked: boolean) => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={occupancyMatchPdf.checkboxOuter} />
      <Text style={occupancyMatchPdf.checkboxLabel}>{consentText(checked)}</Text>
    </View>
  )

  const otherRows: { label: string; value: ReactNode }[] = [
    {
      label: 'Urgent repairs — tradesperson (electrician):',
      value: tradeLine(urgentRepairsTradespeople.electrician),
    },
    {
      label: 'Urgent repairs — tradesperson (plumber):',
      value: tradeLine(urgentRepairsTradespeople.plumber),
    },
    {
      label: 'Urgent repairs — tradesperson (other):',
      value: tradeLine(urgentRepairsTradespeople.other),
    },
    {
      label: 'Landlord email for electronic service of notices:',
      value: electronicService.landlordEmail,
    },
    {
      label: 'Tenant email for electronic service of notices:',
      value: electronicService.tenantEmail,
    },
    {
      label: 'Landlord consents to electronic service (clause 50):',
      value: consentCheckbox(electronicService.landlordConsentsToEmailService),
    },
    {
      label: 'Tenant consents to electronic service (clause 50):',
      value: consentCheckbox(electronicService.tenantConsentsToEmailService),
    },
    {
      label: 'Special conditions (additional terms):',
      value:
        specialConditions.length > 0 ? (
          bulletValue(specialConditions)
        ) : (
          <Text style={occupancyMatchPdf.dataValueBold}>—</Text>
        ),
    },
  ]

  if (bookingNotes) {
    otherRows.push({ label: 'Booking notes:', value: bookingNotes })
  }

  return (
    <View style={{ marginTop: 4, marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={1} title="Parties" />
      <OccupancyMatchScheduleTable rows={partiesRows} />
      <OccupancyMatchSectionHeading num={2} title="Premises" />
      <OccupancyMatchScheduleTable rows={premisesRows} />
      <OccupancyMatchSectionHeading num={3} title="Term, rent and bond" />
      <OccupancyMatchScheduleTable rows={termRentRows} />
      <OccupancyMatchSectionHeading num={4} title="Contacts, consent and special conditions" />
      <OccupancyMatchScheduleTable rows={otherRows} />
    </View>
  )
}

function SignaturesBlock(props: NswResidentialTenancyAgreementProps) {
  const landlordDisplay = props.landlord.companyName
    ? `${props.landlord.fullName} (${props.landlord.companyName})`
    : props.landlord.fullName

  const t2 = props.additionalTenantNames[0]?.trim() ?? ''
  const t3 = props.additionalTenantNames[1]?.trim() ?? ''
  const t4 = props.additionalTenantNames[2]?.trim() ?? ''

  const landlordSignIntro =
    'SIGNED BY THE LANDLORD\nNote: Section 9 of the Electronic Transactions Act 2000 allows for agreements to be signed electronically in NSW if the parties consent. If an electronic signature is used then it must comply with Division 2 of Part 2 of the Electronic Transactions Act 2000.\n\nName of landlord:'

  const lisHeadingAndBody =
    'LANDLORD INFORMATION STATEMENT\nThe landlord acknowledges that, at or before the time of signing this residential tenancy agreement, the landlord has read and understood the contents of the Landlord Information Statement published by NSW Fair Trading that sets out the landlord\'s rights and obligations.\n\nSignature of landlord:'

  const tenant1Banner = '\nSIGNED BY THE TENANT (1)\nName of tenant:'
  const tenant2Banner = '\nSIGNED BY THE TENANT (2)\nName of tenant:'
  const tenant3Banner = '\nSIGNED BY THE TENANT (3)\nName of tenant:'
  const tenant4Banner = '\nSIGNED BY THE TENANT (4)\nName of tenant:'

  const tisHeadingAndBody =
    'TENANT INFORMATION STATEMENT\nThe tenant acknowledges that, at or before the time of signing this residential tenancy agreement, the tenant was given a copy of the Tenant Information Statement published by NSW Fair Trading.\n\nSignature of tenant:'

  const contactFooter =
    'For information about your rights and obligations as a landlord or tenant, contact:\n(a) NSW Fair Trading on 13 32 20 or nsw.gov.au/fair-trading or\n(b) Law Access NSW on 1300 888 529 or lawaccess.nsw.gov.au or\n(c) your local Tenants Advice and Advocacy Service at tenants.org.au'

  return (
    <View>
      <RtaUnnumberedSectionHeading title="Signatures" />
      <Text style={occupancyMatchPdf.bodyParagraph}>{landlordSignIntro}</Text>
      <Text style={occupancyMatchPdf.dataValueBold}>{landlordDisplay}</Text>
      <View style={occupancyMatchPdf.docusealSignatureFieldBox}>
        <View style={occupancyMatchPdf.sigLabelRow}>
          <Text style={occupancyMatchPdf.bodyParagraph}>Signature of landlord: </Text>
          <Text style={occupancyMatchPdf.docusealTagOa}>
            {'{{Landlord Signature;role=First Party;type=signature}}'}
          </Text>
        </View>
      </View>
      <View style={occupancyMatchPdf.docusealDateFieldBox}>
        <View style={occupancyMatchPdf.sigLabelRow}>
          <Text style={occupancyMatchPdf.sigLabel}>Landlord Sign Date </Text>
          <Text style={occupancyMatchPdf.docusealTagOa}>
            {'{{Landlord Sign Date;role=First Party;type=date}}'}
          </Text>
        </View>
      </View>
      <Text style={occupancyMatchPdf.bodyParagraph}>{lisHeadingAndBody}</Text>
      <View style={occupancyMatchPdf.docusealSignatureFieldBox}>
        <View style={occupancyMatchPdf.sigLabelRow}>
          <Text>{' '}</Text>
          <Text style={occupancyMatchPdf.docusealTagOa}>
            {'{{Landlord LIS Signature;role=First Party;type=signature}}'}
          </Text>
        </View>
      </View>
      <View style={occupancyMatchPdf.docusealDateFieldBox}>
        <View style={occupancyMatchPdf.sigLabelRow}>
          <Text style={occupancyMatchPdf.sigLabel}>Landlord LIS Date </Text>
          <Text style={occupancyMatchPdf.docusealTagOa}>
            {'{{Landlord LIS Date;role=First Party;type=date}}'}
          </Text>
        </View>
      </View>
      <Text style={occupancyMatchPdf.bodyParagraph}>{tenant1Banner}</Text>
      <Text style={occupancyMatchPdf.dataValueBold}>{props.tenant.fullName}</Text>
      <View style={occupancyMatchPdf.docusealSignatureFieldBox}>
        <View style={occupancyMatchPdf.sigLabelRow}>
          <Text style={occupancyMatchPdf.bodyParagraph}>Signature of tenant: </Text>
          <Text style={occupancyMatchPdf.docusealTagOa}>
            {'{{Tenant Signature;role=Second Party;type=signature}}'}
          </Text>
        </View>
      </View>
      <View style={occupancyMatchPdf.docusealDateFieldBox}>
        <View style={occupancyMatchPdf.sigLabelRow}>
          <Text style={occupancyMatchPdf.sigLabel}>Tenant Sign Date </Text>
          <Text style={occupancyMatchPdf.docusealTagOa}>
            {'{{Tenant Sign Date;role=Second Party;type=date}}'}
          </Text>
        </View>
      </View>
      {rtaScheduleTenantNamePopulated(t2) ? (
        <>
          <Text style={occupancyMatchPdf.bodyParagraph}>{tenant2Banner}</Text>
          <Text style={occupancyMatchPdf.dataValueBold}>{t2}</Text>
          <View style={occupancyMatchPdf.sigLabelRow}>
            <Text style={occupancyMatchPdf.sigLabel}>Signature of tenant:</Text>
          </View>
          <View style={occupancyMatchPdf.docusealSignatureFieldBox} />
        </>
      ) : null}
      {rtaScheduleTenantNamePopulated(t3) ? (
        <>
          <Text style={occupancyMatchPdf.bodyParagraph}>{tenant3Banner}</Text>
          <Text style={occupancyMatchPdf.dataValueBold}>{t3}</Text>
          <View style={occupancyMatchPdf.sigLabelRow}>
            <Text style={occupancyMatchPdf.sigLabel}>Signature of tenant:</Text>
          </View>
          <View style={occupancyMatchPdf.docusealSignatureFieldBox} />
        </>
      ) : null}
      {rtaScheduleTenantNamePopulated(t4) ? (
        <>
          <Text style={occupancyMatchPdf.bodyParagraph}>{tenant4Banner}</Text>
          <Text style={occupancyMatchPdf.dataValueBold}>{t4}</Text>
          <View style={occupancyMatchPdf.sigLabelRow}>
            <Text style={occupancyMatchPdf.sigLabel}>Signature of tenant:</Text>
          </View>
          <View style={occupancyMatchPdf.docusealSignatureFieldBox} />
        </>
      ) : null}
      <Text style={occupancyMatchPdf.bodyParagraph}>{tisHeadingAndBody}</Text>
      <View style={occupancyMatchPdf.docusealSignatureFieldBox}>
        <View style={occupancyMatchPdf.sigLabelRow}>
          <Text>{' '}</Text>
          <Text style={occupancyMatchPdf.docusealTagOa}>
            {'{{Tenant TIS Signature;role=Second Party;type=signature}}'}
          </Text>
        </View>
      </View>
      <View style={occupancyMatchPdf.docusealDateFieldBox}>
        <View style={occupancyMatchPdf.sigLabelRow}>
          <Text style={occupancyMatchPdf.sigLabel}>Tenant TIS Date </Text>
          <Text style={occupancyMatchPdf.docusealTagOa}>
            {'{{Tenant TIS Date;role=Second Party;type=date}}'}
          </Text>
        </View>
      </View>
      <View style={occupancyMatchPdf.noteBox}>
        <Text style={occupancyMatchPdf.noteItalicMuted}>{contactFooter}</Text>
      </View>
    </View>
  )
}

export function NswResidentialTenancyAgreement(props: NswResidentialTenancyAgreementProps) {
  const { documentId, generatedAt } = props
  const clauseChunks = chunkText(FT6600_CLAUSES_1_TO_55, 2700)
  const notesChunks = chunkText(FT6600_NOTES, 3200)
  const titleSplit = splitTitleAndImportant(FT6600_TITLE_AND_IMPORTANT)
  const titlePreamble = titleSplit.importantBody ? titleSplit.preamble : FT6600_TITLE_AND_IMPORTANT
  const importantBody = titleSplit.importantBody

  return (
    <Document>
      <Page size="A4" style={occupancyMatchPdf.page}>
        <OccupancyMatchFixedHeader
          documentTitle="Residential Tenancy Agreement"
          subtitle="NSW · Residential Tenancies Act 2010"
        />
        <OccupancyMatchFooter documentId={documentId} generatedAt={generatedAt} variant="rta" />
        <QuniRtaMarginStamp />
        {importantBody ? (
          <>
            <Text style={occupancyMatchPdf.bodyParagraph}>{titlePreamble}</Text>
            <RtaUnnumberedSectionHeading title="Important information" />
            <Text style={occupancyMatchPdf.bodyParagraph}>{importantBody}</Text>
          </>
        ) : (
          <Text style={occupancyMatchPdf.bodyParagraph}>{titlePreamble}</Text>
        )}
        <View style={occupancyMatchPdf.hRuleLight} />
        <ScheduleBlock {...props} />
      </Page>
      <Page size="A4" style={occupancyMatchPdf.page}>
        <OccupancyMatchFixedHeader
          documentTitle="Residential Tenancy Agreement"
          subtitle="NSW · Residential Tenancies Act 2010"
        />
        <OccupancyMatchFooter documentId={documentId} generatedAt={generatedAt} variant="rta" />
        <QuniRtaMarginStamp />
        <RtaUnnumberedSectionHeading title="The agreement" />
        {clauseChunks[0] ? <OccupancyMatchClauseChunk text={clauseChunks[0]} /> : null}
      </Page>
      {clauseChunks.slice(1).map((chunk, i) => (
        <Page key={`clause-${i}`} size="A4" style={occupancyMatchPdf.page}>
          <OccupancyMatchFixedHeader
            documentTitle="Residential Tenancy Agreement"
            subtitle="NSW · Residential Tenancies Act 2010"
          />
          <OccupancyMatchFooter documentId={documentId} generatedAt={generatedAt} variant="rta" />
          <QuniRtaMarginStamp />
          <OccupancyMatchClauseChunk text={chunk} />
        </Page>
      ))}
      {notesChunks.map((chunk, i) => {
        const isFirstNotesPage = i === 0
        const notesText = isFirstNotesPage ? stripLeadingNotesAsciiBanner(chunk) : chunk
        return (
          <Page key={`notes-${i}`} size="A4" style={occupancyMatchPdf.page}>
            <OccupancyMatchFixedHeader
              documentTitle="Residential Tenancy Agreement"
              subtitle="NSW · Residential Tenancies Act 2010"
            />
            <OccupancyMatchFooter documentId={documentId} generatedAt={generatedAt} variant="rta" />
            <QuniRtaMarginStamp />
            {isFirstNotesPage ? <RtaUnnumberedSectionHeading title="Notes" /> : null}
            <View style={occupancyMatchPdf.noteBox}>
              <Text style={occupancyMatchPdf.noteItalicMuted}>{notesText}</Text>
            </View>
          </Page>
        )
      })}
      <Page size="A4" style={occupancyMatchPdf.page}>
        <OccupancyMatchFixedHeader
          documentTitle="Residential Tenancy Agreement"
          subtitle="NSW · Residential Tenancies Act 2010"
        />
        <OccupancyMatchFooter documentId={documentId} generatedAt={generatedAt} variant="rta" />
        <QuniRtaMarginStamp />
        <SignaturesBlock {...props} />
      </Page>
    </Document>
  )
}
