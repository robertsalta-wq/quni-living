import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { QuniPlatformAddendumProps } from '../../../api/documents/rtaTypes.js'

/** Quni platform URLs and fee copy (fixed; not driven by props). */
const QUNI_PLATFORM_URL = 'https://quni.com.au'
const QUNI_MAINTENANCE_PORTAL_URL = 'https://quni.com.au/maintenance'
const QUNI_MOVE_OUT_FORM_URL = 'https://quni.com.au/move-out'
const LANDLORD_SERVICE_FEE_LABEL = '11% of weekly rent'
const TENANT_PLATFORM_FEES_LABEL = 'None beyond the agreed rent.'

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
  title: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 10 },
  footerWrap: { position: 'absolute', bottom: 28, left: 40, right: 40 },
  footerRule: { borderTopWidth: 0.5, borderTopColor: '#cccccc', marginBottom: 6 },
  footerText: { fontSize: 7, color: '#666666' },
  block: { marginBottom: 8 },
  scheduleRow: { marginBottom: 5 },
  scheduleLabel: { fontFamily: 'Helvetica-Bold' },
  bullet: { marginLeft: 10, marginBottom: 3 },
  sectionHeading: { fontFamily: 'Helvetica-Bold', marginTop: 6, marginBottom: 4 },
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

function FixedFooter({ documentId, generatedAt }: { documentId: string; generatedAt: string }) {
  return (
    <View style={styles.footerWrap} fixed>
      <View style={styles.footerRule} />
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) =>
          `Quni Platform Addendum · Document ID: ${documentId} · Generated: ${generatedAt} · Page ${pageNumber}` +
          (totalPages ? ` of ${totalPages}` : '')
        }
      />
    </View>
  )
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

  return (
    <View style={{ marginTop: 4, marginBottom: 10 }}>
      <Text style={styles.sectionHeading}>Parties and premises (context)</Text>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Signing package: </Text>
          {signingPackageLabel(signingPackage)}
        </Text>
      </View>
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
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Tenant: </Text>
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
          <Text style={styles.scheduleLabel}>Premises (address): </Text>
          {premises.addressLine}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Property type: </Text>
          {premises.propertyType?.trim() || '—'}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Room type: </Text>
          {premises.roomType?.trim() || '—'}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Furnished: </Text>
          {yn(premises.furnished)}
          <Text style={styles.scheduleLabel}> · Linen supplied: </Text>
          {yn(premises.linenSupplied)}
          <Text style={styles.scheduleLabel}> · Weekly cleaning: </Text>
          {yn(premises.weeklyCleaningService)}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Term start: </Text>
          {formatAuDate(term.startDate)}
          <Text style={styles.scheduleLabel}> · Term end: </Text>
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
          <Text style={styles.scheduleLabel}>Agreed weekly rent: </Text>
          {formatMoney(rent.weeklyRent)}
          <Text style={styles.scheduleLabel}> · Payment method: </Text>
          {rent.paymentMethod}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text>
          <Text style={styles.scheduleLabel}>Bond (if applicable): </Text>
          {bondText}
        </Text>
      </View>
      <View style={styles.scheduleRow}>
        <Text style={styles.scheduleLabel}>Utilities / services (summary): </Text>
        <Text>{utilitiesDescription.trim() || '—'}</Text>
      </View>
    </View>
  )
}

function PlatformTermsBlock() {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.sectionHeading}>Quni platform terms</Text>
      <Text style={styles.block}>
        The following applies to the tenancy listed above. URLs and standard platform fees are fixed by Quni.
      </Text>
      <Text style={styles.bullet}>• Platform: {QUNI_PLATFORM_URL}</Text>
      <Text style={styles.bullet}>• Maintenance portal: {QUNI_MAINTENANCE_PORTAL_URL}</Text>
      <Text style={styles.bullet}>• Move-out form: {QUNI_MOVE_OUT_FORM_URL}</Text>
      <Text style={styles.bullet}>• Landlord service fee: {LANDLORD_SERVICE_FEE_LABEL}</Text>
      <Text style={styles.bullet}>• Tenant platform fees: {TENANT_PLATFORM_FEES_LABEL}</Text>
      <Text style={[styles.block, { marginTop: 6 }]}>
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
      <Text style={styles.sectionHeading}>Execution</Text>
      <Text style={styles.block}>
        Signed electronically where permitted. Each party&apos;s signature and date fields below are completed
        through the signing workflow.
      </Text>
      <Text style={styles.block}>Landlord</Text>
      <Text style={styles.sigP}>{landlordDisplay}</Text>
      <View style={styles.sigRow}>
        <Text>Signature: </Text>
        <Text style={styles.docusealTag}>{'{{Addendum Landlord Signature;role=First Party;type=signature}}'}</Text>
      </View>
      <View style={styles.sigSpace} />
      <View style={styles.sigRow}>
        <Text>Date: </Text>
        <Text style={styles.docusealTag}>{'{{Addendum Landlord Date;role=First Party;type=date}}'}</Text>
      </View>
      <View style={styles.sigSpace} />
      <Text style={styles.block}>Tenant</Text>
      <Text style={styles.sigP}>{props.tenant.fullName}</Text>
      <View style={styles.sigRow}>
        <Text>Signature: </Text>
        <Text style={styles.docusealTag}>{'{{Addendum Tenant Signature;role=Second Party;type=signature}}'}</Text>
      </View>
      <View style={styles.sigSpace} />
      <View style={styles.sigRow}>
        <Text>Date: </Text>
        <Text style={styles.docusealTag}>{'{{Addendum Tenant Date;role=Second Party;type=date}}'}</Text>
      </View>
      <View style={styles.sigSpace} />
    </View>
  )
}

export function QuniPlatformAddendum(props: QuniPlatformAddendumProps) {
  const { documentId, generatedAt } = props
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <FixedFooter documentId={documentId} generatedAt={generatedAt} />
        <Text style={styles.title}>Quni Platform Addendum</Text>
        <Text style={styles.block}>
          This addendum records how the Quni platform is used for the tenancy described below. It is intended
          to be signed together with the prescribed residential tenancy agreement in the same package.
        </Text>
        <ScheduleBlock {...props} />
        <PlatformTermsBlock />
      </Page>
      <Page size="A4" style={styles.page}>
        <FixedFooter documentId={documentId} generatedAt={generatedAt} />
        <SignaturesBlock {...props} />
      </Page>
    </Document>
  )
}
