import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { NswResidentialTenancyAgreementProps } from '../../../api/documents/rtaTypes.js'
import {
  FT6600_AGREEMENT_HEADER,
  FT6600_CLAUSES_1_TO_55,
  FT6600_NOTES,
  FT6600_TITLE_AND_IMPORTANT,
} from './ft6600EmbeddedStrings.js'

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
    lineHeight: 1.45,
    backgroundColor: '#ffffff',
  },
  footerWrap: { position: 'absolute', bottom: 28, left: 40, right: 40 },
  footerRule: { borderTopWidth: 0.5, borderTopColor: '#cccccc', marginBottom: 6 },
  footerText: { fontSize: 7, color: '#666666' },
  block: { marginBottom: 8 },
  scheduleRow: { marginBottom: 5 },
  scheduleLabel: { fontFamily: 'Helvetica-Bold' },
  bullet: { marginLeft: 10, marginBottom: 2 },
  docusealTag: { fontSize: 1, color: '#FFFFFF' },
  sigP: { marginBottom: 5 },
  sigRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 4 },
  sigSpace: {
    marginTop: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1a1a1a',
    marginBottom: 10,
    minHeight: 18,
  },
})

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

function rentAmountForFrequency(
  weeklyRent: number,
  platformFeePercent: number,
  totalWeekly: number,
  freq: 'weekly' | 'fortnightly' | 'monthly',
) {
  if (freq === 'weekly') {
    return {
      rent: weeklyRent,
      platformFee: (weeklyRent * platformFeePercent) / 100,
      total: totalWeekly,
    }
  }
  if (freq === 'fortnightly') {
    return {
      rent: weeklyRent * 2,
      platformFee: ((weeklyRent * platformFeePercent) / 100) * 2,
      total: totalWeekly * 2,
    }
  }
  const m = 52 / 12
  return {
    rent: Math.round(weeklyRent * m * 100) / 100,
    platformFee: Math.round(((weeklyRent * platformFeePercent) / 100) * m * 100) / 100,
    total: Math.round(totalWeekly * m * 100) / 100,
  }
}

function tradeLine(v: string | null) {
  if (v == null || !v.trim()) return '—'
  return v.trim()
}

function FixedFooter({ documentId, generatedAt }: { documentId: string; generatedAt: string }) {
  return (
    <View style={styles.footerWrap} fixed>
      <View style={styles.footerRule} />
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) =>
          `FT6600 · Document ID: ${documentId} · Generated: ${generatedAt} · Page ${pageNumber}` +
          (totalPages ? ` of ${totalPages}` : '')
        }
      />
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

  const rentParts = rentAmountForFrequency(
    rent.weeklyRent,
    rent.platformFeePercent,
    rent.totalWeekly,
    rent.rentFrequency,
  )

  const bondText =
    bond.amount != null && Number.isFinite(bond.amount) ? formatMoney(bond.amount) : '—'

  const t2 = additionalTenantNames[0]?.trim() ?? ''
  const t3 = additionalTenantNames[1]?.trim() ?? ''
  const t4 = additionalTenantNames[2]?.trim() ?? ''

  const inclusions =
    additionalPremisesInclusions.length > 0 ? additionalPremisesInclusions : ['—']

  return (
    <View style={{ marginTop: 6, marginBottom: 10 }}>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Landlord: </Text>
          {landlordDisplay}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Landlord address for service: </Text>
          {landlord.addressLine}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Landlord email: </Text>
          {landlord.email}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Landlord phone: </Text>
          {landlord.phone}
        </Text>
      </View>
      {landlordAgent ? (
        <>
          <View style={styles.scheduleRow}>
            <Text>
              <Text style={styles.scheduleLabel}>Landlord&apos;s agent: </Text>
              {landlordAgent.name}
            </Text>
          </View>
          <View style={styles.scheduleRow}>
            <Text>
              <Text style={styles.scheduleLabel}>Agent licence number: </Text>
              {landlordAgent.licenseNumber?.trim() || '—'}
            </Text>
          </View>
          <View style={styles.scheduleRow}>
            <Text>
              <Text style={styles.scheduleLabel}>Agent business address: </Text>
              {landlordAgent.businessAddress}
            </Text>
          </View>
          <View style={styles.scheduleRow}>
            <Text>
              <Text style={styles.scheduleLabel}>Agent phone: </Text>
              {landlordAgent.phone}
            </Text>
          </View>
          <View style={styles.scheduleRow}>
            <Text>
              <Text style={styles.scheduleLabel}>Agent email: </Text>
              {landlordAgent.email?.trim() || '—'}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.scheduleRow}>
          <Text>
            <Text style={styles.scheduleLabel}>Landlord&apos;s agent: </Text>
            Not applicable
          </Text>
        </View>
      )}
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Tenant (1): </Text>
          {tenant.fullName}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Tenant email: </Text>
          {tenant.email}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Tenant phone: </Text>
          {tenant.phone}
        </Text>
      </View>
      {tenant.dateOfBirth ? (
        <View style={styles.scheduleRow}>
          <Text>
            <Text style={styles.scheduleLabel}>Tenant date of birth: </Text>
            {formatAuDate(tenant.dateOfBirth)}
          </Text>
        </View>
      ) : null}
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Tenant (2): </Text>
          {t2 || '—'}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Tenant (3): </Text>
          {t3 || '—'}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Tenant (4): </Text>
          {t4 || '—'}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Residential premises (address): </Text>
          {premises.addressLine}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Part of premises only (if applicable): </Text>
          {premisesPartDescription?.trim() || '—'}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text style={styles.scheduleLabel}>Additional things included with residential premises: </Text>
        {inclusions.map((line, i) => (
          <Text key={i} style={styles.bullet}>
            • {line}
          </Text>
        ))}
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Maximum occupants permitted: </Text>
          {maxOccupantsPermitted != null && Number.isFinite(maxOccupantsPermitted)
            ? String(maxOccupantsPermitted)
            : '—'}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Property type: </Text>
          {premises.propertyType ?? '—'}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Room type: </Text>
          {premises.roomType ?? '—'}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Furnished: </Text>
          {furnishedText(premises.furnished)}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Linen supplied: </Text>
          {furnishedText(premises.linenSupplied)}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Weekly cleaning service: </Text>
          {furnishedText(premises.weeklyCleaningService)}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Commencement date: </Text>
          {formatAuDate(term.startDate)}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>End date (fixed term) / tenancy type: </Text>
          {endDateText}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Lease length (description): </Text>
          {term.leaseLengthDescription}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Rent amount (per {rentFrequencyWord(rent.rentFrequency)}): </Text>
          {formatMoney(rentParts.rent)}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Platform fee ({rent.platformFeePercent}%): </Text>
          {formatMoney(rentParts.platformFee)}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Total payable per {rentFrequencyWord(rent.rentFrequency)}: </Text>
          {formatMoney(rentParts.total)}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Rent payment timing: </Text>
          {rent.paymentTimingDescription}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Rent payment method: </Text>
          {rent.paymentMethod}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Rental bond: </Text>
          {bondText}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Urgent repairs — tradesperson (electrician): </Text>
          {tradeLine(urgentRepairsTradespeople.electrician)}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Urgent repairs — tradesperson (plumber): </Text>
          {tradeLine(urgentRepairsTradespeople.plumber)}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Urgent repairs — tradesperson (other): </Text>
          {tradeLine(urgentRepairsTradespeople.other)}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Landlord email for electronic service of notices: </Text>
          {electronicService.landlordEmail}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Tenant email for electronic service of notices: </Text>
          {electronicService.tenantEmail}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Landlord consents to electronic service (clause 50): </Text>
          {consentText(electronicService.landlordConsentsToEmailService)}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Tenant consents to electronic service (clause 50): </Text>
          {consentText(electronicService.tenantConsentsToEmailService)}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text style={styles.scheduleLabel}>Special conditions (additional terms): </Text>
        {specialConditions.length > 0 ? (
          specialConditions.map((line, i) => (
            <Text key={i} style={styles.bullet}>
              • {line}
            </Text>
          ))
        ) : (
          <Text style={styles.bullet}>—</Text>
        )}
      </View>
      {bookingNotes ? (
        <View style={styles.scheduleRow}>
          <Text>
            <Text style={styles.scheduleLabel}>Booking notes: </Text>
            {bookingNotes}
          </Text>
        </View>
      ) : null}
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

  const sigBanner =
    '========================================\nSIGNATURES\n========================================\n\nSIGNED BY THE LANDLORD\nNote: Section 9 of the Electronic Transactions Act 2000 allows for agreements to be signed electronically in NSW if the parties consent. If an electronic signature is used then it must comply with Division 2 of Part 2 of the Electronic Transactions Act 2000.\n\nName of landlord:'

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
      <Text style={styles.block}>{sigBanner}</Text>
      <Text style={styles.sigP}>{landlordDisplay}</Text>
      <View style={styles.sigRow}>
        <Text>Signature of landlord: </Text>
        <Text style={styles.docusealTag}>{'{{Landlord Signature;role=First Party;type=signature}}'}</Text>
      </View>
      <View style={styles.sigSpace} />
      <View style={styles.sigRow}>
        <Text>Landlord Sign Date </Text>
        <Text style={styles.docusealTag}>{'{{Landlord Sign Date;role=First Party;type=date}}'}</Text>
      </View>
      <View style={styles.sigSpace} />
      <Text style={styles.block}>{lisHeadingAndBody}</Text>
      <View style={styles.sigRow}>
        <Text>{' '}</Text>
        <Text style={styles.docusealTag}>{'{{Landlord LIS Signature;role=First Party;type=signature}}'}</Text>
      </View>
      <View style={styles.sigSpace} />
      <View style={styles.sigRow}>
        <Text>Landlord LIS Date </Text>
        <Text style={styles.docusealTag}>{'{{Landlord LIS Date;role=First Party;type=date}}'}</Text>
      </View>
      <View style={styles.sigSpace} />
      <Text style={styles.block}>{tenant1Banner}</Text>
      <Text style={styles.sigP}>{props.tenant.fullName}</Text>
      <View style={styles.sigRow}>
        <Text>Signature of tenant: </Text>
        <Text style={styles.docusealTag}>{'{{Tenant Signature;role=Second Party;type=signature}}'}</Text>
      </View>
      <View style={styles.sigSpace} />
      <View style={styles.sigRow}>
        <Text>Tenant Sign Date </Text>
        <Text style={styles.docusealTag}>{'{{Tenant Sign Date;role=Second Party;type=date}}'}</Text>
      </View>
      <View style={styles.sigSpace} />
      <Text style={styles.block}>{tenant2Banner}</Text>
      <Text style={styles.sigP}>{t2}</Text>
      <Text style={styles.sigP}>Signature of tenant:</Text>
      <View style={styles.sigSpace} />
      <Text style={styles.block}>{tenant3Banner}</Text>
      <Text style={styles.sigP}>{t3}</Text>
      <Text style={styles.sigP}>Signature of tenant:</Text>
      <View style={styles.sigSpace} />
      <Text style={styles.block}>{tenant4Banner}</Text>
      <Text style={styles.sigP}>{t4}</Text>
      <Text style={styles.sigP}>Signature of tenant:</Text>
      <View style={styles.sigSpace} />
      <Text style={styles.block}>{tisHeadingAndBody}</Text>
      <View style={styles.sigRow}>
        <Text>{' '}</Text>
        <Text style={styles.docusealTag}>{'{{Tenant TIS Signature;role=Second Party;type=signature}}'}</Text>
      </View>
      <View style={styles.sigSpace} />
      <View style={styles.sigRow}>
        <Text>Tenant TIS Date </Text>
        <Text style={styles.docusealTag}>{'{{Tenant TIS Date;role=Second Party;type=date}}'}</Text>
      </View>
      <View style={styles.sigSpace} />
      <Text style={styles.block}>{contactFooter}</Text>
    </View>
  )
}

export function NswResidentialTenancyAgreement(props: NswResidentialTenancyAgreementProps) {
  const { documentId, generatedAt } = props
  const clauseChunks = chunkText(FT6600_CLAUSES_1_TO_55, 2700)
  const notesChunks = chunkText(FT6600_NOTES, 3200)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <FixedFooter documentId={documentId} generatedAt={generatedAt} />
        <Text style={styles.block}>{FT6600_TITLE_AND_IMPORTANT}</Text>
        <ScheduleBlock {...props} />
      </Page>
      <Page size="A4" style={styles.page}>
        <FixedFooter documentId={documentId} generatedAt={generatedAt} />
        <Text style={styles.block}>{FT6600_AGREEMENT_HEADER}</Text>
        <Text style={styles.block}>{clauseChunks[0]}</Text>
      </Page>
      {clauseChunks.slice(1).map((chunk, i) => (
        <Page key={`clause-${i}`} size="A4" style={styles.page}>
          <FixedFooter documentId={documentId} generatedAt={generatedAt} />
          <Text style={styles.block}>{chunk}</Text>
        </Page>
      ))}
      {notesChunks.map((chunk, i) => (
        <Page key={`notes-${i}`} size="A4" style={styles.page}>
          <FixedFooter documentId={documentId} generatedAt={generatedAt} />
          <Text style={styles.block}>{chunk}</Text>
        </Page>
      ))}
      <Page size="A4" style={styles.page}>
        <FixedFooter documentId={documentId} generatedAt={generatedAt} />
        <SignaturesBlock {...props} />
      </Page>
    </Document>
  )
}
