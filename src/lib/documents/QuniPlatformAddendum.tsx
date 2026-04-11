import type { ReactNode } from 'react'
import { Document, Page, Text, View } from '@react-pdf/renderer'
import type { QuniPlatformAddendumProps } from '../../../api/documents/rtaTypes.js'
import {
  OccupancyMatchFixedHeader,
  OccupancyMatchFooter,
  OccupancyMatchScheduleTable,
  OccupancyMatchSectionHeading,
  occupancyMatchPdf,
} from './quniDocumentPdfTheme.js'

/** Quni platform URLs and fee copy (fixed; not driven by props). */
const QUNI_PLATFORM_URL = 'https://quni.com.au'
const QUNI_MAINTENANCE_PORTAL_URL = 'https://quni.com.au/maintenance'
const QUNI_MOVE_OUT_FORM_URL = 'https://quni.com.au/move-out'
const LANDLORD_SERVICE_FEE_LABEL = '10% of weekly rent'
const TENANT_PLATFORM_FEES_LABEL = 'None beyond the agreed rent.'

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
  return '—'
}

function signingPackageLabel(pkg: QuniPlatformAddendumProps['signingPackage']) {
  if (pkg === 'residential_tenancy') return 'NSW residential tenancy agreement package'
  return pkg
}

function ScheduleBlock(props: QuniPlatformAddendumProps) {
  const { landlord, tenant, premises, term, rent, bond, utilitiesDescription, signingPackage } = props
  const landlordDisplay = landlord.companyName
    ? `${landlord.fullName} (${landlord.companyName})`
    : landlord.fullName
  const endDateText =
    term.periodic || !term.endDate ? 'Periodic tenancy (no fixed end date)' : formatAuDate(term.endDate)
  const bondText =
    bond.amount != null && Number.isFinite(bond.amount) ? formatMoney(bond.amount) : '—'

  const furnishInline: ReactNode = (
    <Text style={occupancyMatchPdf.dataValueBold}>
      <Text style={occupancyMatchPdf.dataLabel}>Furnished: </Text>
      {yn(premises.furnished)}
      <Text style={occupancyMatchPdf.dataLabel}> · Linen supplied: </Text>
      {yn(premises.linenSupplied)}
      <Text style={occupancyMatchPdf.dataLabel}> · Weekly cleaning: </Text>
      {yn(premises.weeklyCleaningService)}
    </Text>
  )

  const termInline: ReactNode = (
    <Text style={occupancyMatchPdf.dataValueBold}>
      <Text style={occupancyMatchPdf.dataLabel}>Term start: </Text>
      {formatAuDate(term.startDate)}
      <Text style={occupancyMatchPdf.dataLabel}> · Term end: </Text>
      {endDateText}
    </Text>
  )

  const rentInline: ReactNode = (
    <Text style={occupancyMatchPdf.dataValueBold}>
      <Text style={occupancyMatchPdf.dataLabel}>Agreed weekly rent: </Text>
      {formatMoney(rent.weeklyRent)}
      <Text style={occupancyMatchPdf.dataLabel}> · Payment method: </Text>
      {rent.paymentMethod}
    </Text>
  )

  const rows: { label: string; value: ReactNode }[] = [
    { label: 'Signing package:', value: signingPackageLabel(signingPackage) },
    { label: 'Landlord:', value: landlordDisplay },
    { label: 'Landlord address for service:', value: landlord.addressLine },
    { label: 'Landlord email:', value: landlord.email },
    { label: 'Landlord phone:', value: landlord.phone },
    { label: 'Tenant:', value: tenant.fullName },
    { label: 'Tenant email:', value: tenant.email },
    { label: 'Tenant phone:', value: tenant.phone },
  ]

  if (tenant.dateOfBirth) {
    rows.push({ label: 'Tenant date of birth:', value: formatAuDate(tenant.dateOfBirth) })
  }

  rows.push(
    { label: 'Premises (address):', value: premises.addressLine },
    { label: 'Room type:', value: premises.roomType?.trim() || '—' },
    { label: '', value: furnishInline },
    { label: '', value: termInline },
    { label: 'Lease length (description):', value: term.leaseLengthDescription },
    { label: '', value: rentInline },
    { label: 'Bond (if applicable):', value: bondText },
    {
      label: 'Utilities / services (summary):',
      value: utilitiesDescription.trim() || '—',
    },
  )

  return (
    <View style={{ marginTop: 4, marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={1} title="Parties and premises (context)" />
      <OccupancyMatchScheduleTable rows={rows} />
    </View>
  )
}

function PlatformTermsBlock() {
  return (
    <View style={{ marginBottom: 8 }}>
      <OccupancyMatchSectionHeading num={2} title="Quni platform terms" />
      <Text style={occupancyMatchPdf.bodyParagraph}>
        The following applies to the tenancy listed above. URLs and standard platform fees are fixed by Quni.
      </Text>
      <View style={occupancyMatchPdf.noteBox}>
        <Text style={occupancyMatchPdf.noteItalicMuted}>• Platform: {QUNI_PLATFORM_URL}</Text>
        <Text style={occupancyMatchPdf.noteItalicMuted}>• Maintenance portal: {QUNI_MAINTENANCE_PORTAL_URL}</Text>
        <Text style={occupancyMatchPdf.noteItalicMuted}>• Move-out form: {QUNI_MOVE_OUT_FORM_URL}</Text>
        <Text style={occupancyMatchPdf.noteItalicMuted}>• Landlord service fee: {LANDLORD_SERVICE_FEE_LABEL}</Text>
        <Text style={occupancyMatchPdf.noteItalicMuted}>• Tenant platform fees: {TENANT_PLATFORM_FEES_LABEL}</Text>
      </View>
      <Text style={occupancyMatchPdf.bodyParagraph}>
        The parties acknowledge they have read this addendum and agree to use the Quni platform as described,
        in addition to the main residential tenancy agreement in this signing package.
      </Text>
    </View>
  )
}

function SignaturesBlock(props: QuniPlatformAddendumProps) {
  const landlordDisplay = props.landlord.companyName
    ? `${props.landlord.fullName} (${props.landlord.companyName})`
    : props.landlord.fullName

  return (
    <View>
      <OccupancyMatchSectionHeading num={3} title="Execution" />
      <Text style={occupancyMatchPdf.bodyParagraph}>
        Signed electronically where permitted. Each party&apos;s signature and date fields below are completed
        through the signing workflow.
      </Text>
      <View style={occupancyMatchPdf.sigTable}>
        <View style={occupancyMatchPdf.sigHeaderRow}>
          <View style={occupancyMatchPdf.sigHeaderCell}>
            <Text style={occupancyMatchPdf.thText}>Landlord</Text>
          </View>
          <View style={occupancyMatchPdf.sigHeaderCellLast}>
            <Text style={occupancyMatchPdf.thText}>Tenant</Text>
          </View>
        </View>
        <View style={occupancyMatchPdf.sigBodyRow}>
          <View style={occupancyMatchPdf.sigCol}>
            <Text style={occupancyMatchPdf.sigNameBold}>{landlordDisplay}</Text>
            <View style={occupancyMatchPdf.docusealSignatureFieldBox}>
              <View style={occupancyMatchPdf.sigLabelRow}>
                <Text style={occupancyMatchPdf.sigLabel}>Signature </Text>
                <Text style={occupancyMatchPdf.docusealTagOa}>
                  {'{{Addendum Landlord Signature;role=First Party;type=signature}}'}
                </Text>
              </View>
            </View>
            <View style={occupancyMatchPdf.docusealDateFieldBox}>
              <View style={occupancyMatchPdf.sigLabelRow}>
                <Text style={occupancyMatchPdf.sigLabel}>Date </Text>
                <Text style={occupancyMatchPdf.docusealTagOa}>
                  {'{{Addendum Landlord Date;role=First Party;type=date}}'}
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
                  {'{{Addendum Tenant Signature;role=Second Party;type=signature}}'}
                </Text>
              </View>
            </View>
            <View style={occupancyMatchPdf.docusealDateFieldBox}>
              <View style={occupancyMatchPdf.sigLabelRow}>
                <Text style={occupancyMatchPdf.sigLabel}>Date </Text>
                <Text style={occupancyMatchPdf.docusealTagOa}>
                  {'{{Addendum Tenant Date;role=Second Party;type=date}}'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

export function QuniPlatformAddendum(props: QuniPlatformAddendumProps) {
  const { documentId, generatedAt } = props
  return (
    <Document>
      <Page size="A4" style={occupancyMatchPdf.page}>
        <OccupancyMatchFixedHeader
          documentTitle="Platform Addendum"
          subtitle="Supplementary to the Residential Tenancy Agreement"
        />
        <OccupancyMatchFooter documentId={documentId} generatedAt={generatedAt} variant="addendum" />
        <Text style={occupancyMatchPdf.bodyParagraph}>
          This addendum records how the Quni platform is used for the tenancy described below. It is intended
          to be signed together with the prescribed residential tenancy agreement in the same package.
        </Text>
        <ScheduleBlock {...props} />
        <PlatformTermsBlock />
      </Page>
      <Page size="A4" style={occupancyMatchPdf.page}>
        <OccupancyMatchFixedHeader
          documentTitle="Platform Addendum"
          subtitle="Supplementary to the Residential Tenancy Agreement"
        />
        <OccupancyMatchFooter documentId={documentId} generatedAt={generatedAt} variant="addendum" />
        <SignaturesBlock {...props} />
      </Page>
    </Document>
  )
}
