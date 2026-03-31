// @ts-nocheck — Vercel's isolated API TypeScript pass uses Node16 resolution without this project's jsx/tsconfig.api graph.
import type { ReactNode } from 'react'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { ResidentialTenancyAgreementProps } from './rtaTypes'

const navy = '#1B3A6B'
const gold = '#C9A84C'

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#111',
    lineHeight: 1.45,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: gold,
  },
  brandMark: {
    width: 36,
    height: 36,
    backgroundColor: navy,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandMarkText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  headerTitles: { flex: 1 },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: navy,
    marginBottom: 4,
  },
  subtitle: { fontSize: 9, color: '#444' },
  metaRow: {
    marginTop: 8,
    fontSize: 8,
    color: '#555',
  },
  h2: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: navy,
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    paddingBottom: 3,
  },
  p: { marginBottom: 6 },
  bullet: { flexDirection: 'row', marginBottom: 4, paddingLeft: 4 },
  bulletDot: { width: 12, fontSize: 10 },
  bulletText: { flex: 1 },
  sigBlock: {
    marginTop: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    minHeight: 72,
  },
  sigLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: '#999', marginTop: 24, marginBottom: 4 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 48,
    right: 48,
    fontSize: 8,
    color: '#666',
    borderTopWidth: 0.5,
    borderTopColor: '#ddd',
    paddingTop: 6,
  },
})

function formatMoney(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <View style={styles.bullet} wrap={false}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  )
}

export function ResidentialTenancyAgreement(props: ResidentialTenancyAgreementProps) {
  const {
    documentId,
    generatedAt,
    landlord,
    tenant,
    premises,
    term,
    rent,
    bond,
    specialConditions,
    bookingNotes,
  } = props

  const landlordDisplay = landlord.companyName
    ? `${landlord.fullName} (${landlord.companyName})`
    : landlord.fullName

  const bondText =
    bond.amount != null && Number.isFinite(bond.amount)
      ? formatMoney(bond.amount)
      : 'As agreed (see bond schedule)'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Quni Living — quni.com.au — hello@quni.com.au    Page ${pageNumber} of ${totalPages}`
          }
        />

        <View style={styles.headerBar}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>Q</Text>
          </View>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>Residential Tenancy Agreement</Text>
            <Text style={styles.subtitle}>
              NSW — Residential Tenancies Act 2010 (standard terms apply as prescribed)
            </Text>
          </View>
        </View>
        <Text style={styles.metaRow}>
          Document ID: {documentId} · Generated: {generatedAt}
        </Text>

        <Text style={styles.h2}>1. Parties</Text>
        <Text style={styles.p}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Landlord: </Text>
          {landlordDisplay}
        </Text>
        <Text style={styles.p}>Address: {landlord.addressLine}</Text>
        <Text style={styles.p}>Email: {landlord.email}</Text>
        <Text style={styles.p}>Phone: {landlord.phone}</Text>
        <Text style={styles.p}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Tenant: </Text>
          {tenant.fullName}
        </Text>
        <Text style={styles.p}>Address for service: {premises.addressLine}</Text>
        <Text style={styles.p}>Email: {tenant.email}</Text>
        <Text style={styles.p}>Phone: {tenant.phone}</Text>
        {tenant.dateOfBirth ? (
          <Text style={styles.p}>Date of birth: {tenant.dateOfBirth}</Text>
        ) : null}

        <Text style={styles.h2}>2. Premises</Text>
        <Text style={styles.p}>
          The landlord lets and the tenant takes the residential premises at:{' '}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{premises.addressLine}</Text>
        </Text>
        <Text style={styles.p}>
          Property type: {premises.propertyType ?? '—'} · Room type: {premises.roomType ?? '—'} · Furnished:{' '}
          {premises.furnished === true ? 'Yes' : premises.furnished === false ? 'No' : '—'}
        </Text>
        <Text style={styles.p}>Inclusions:</Text>
        {premises.linenSupplied === true ? <Bullet>Linen supplied</Bullet> : null}
        {premises.weeklyCleaningService === true ? <Bullet>Weekly cleaning service</Bullet> : null}
        {premises.linenSupplied !== true && premises.weeklyCleaningService !== true ? (
          <Text style={styles.p}>None specified beyond standard inclusions.</Text>
        ) : null}

        <Text style={styles.h2}>3. Term</Text>
        <Text style={styles.p}>Start date: {term.startDate}</Text>
        <Text style={styles.p}>
          End date:{' '}
          {term.periodic || !term.endDate ? 'Periodic tenancy (no fixed end date)' : term.endDate}
        </Text>
        <Text style={styles.p}>Lease length (as agreed at booking): {term.leaseLengthDescription}</Text>

        <Text style={styles.h2}>4. Rent</Text>
        <Text style={styles.p}>Weekly rent: {formatMoney(rent.weeklyRent)}</Text>
        <Text style={styles.p}>
          Quni platform fee (student contribution): {rent.platformFeePercent}% of weekly rent (
          {formatMoney(rent.weeklyRent * (rent.platformFeePercent / 100))})
        </Text>
        <Text style={styles.p}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Total weekly payment: </Text>
          {formatMoney(rent.totalWeekly)}
        </Text>
        <Text style={styles.p}>Payment method: {rent.paymentMethod}</Text>
        <Text style={styles.p}>Rent is payable weekly in advance unless otherwise agreed in writing.</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Quni Living — quni.com.au — hello@quni.com.au    Page ${pageNumber} of ${totalPages}`
          }
        />

        <Text style={styles.h2}>5. Bond</Text>
        <Text style={styles.p}>Bond amount: {bondText}</Text>
        <Text style={styles.p}>
          Bond must be lodged with NSW Fair Trading via MyBond within 10 business days of receipt, as required
          by law.
        </Text>
        <Text style={styles.p}>MyBond / Fair Trading: www.fairtrading.nsw.gov.au</Text>

        <Text style={styles.h2}>6. Landlord obligations</Text>
        <Bullet>Provide the premises in a reasonable state of cleanliness and fit for habitation.</Bullet>
        <Bullet>Ensure the premises are reasonably secure.</Bullet>
        <Bullet>Carry out repairs within a reasonable time after notice (urgent repairs as required by law).</Bullet>
        <Bullet>Not interfere unreasonably with the tenant{"'"}s quiet enjoyment of the premises.</Bullet>
        <Bullet>Comply with all obligations under the Residential Tenancies Act 2010 (NSW) and regulations.</Bullet>

        <Text style={styles.h2}>7. Tenant obligations</Text>
        <Bullet>Pay rent on time and in the manner agreed.</Bullet>
        <Bullet>Keep the premises reasonably clean, having regard to their condition at the start of the tenancy.</Bullet>
        <Bullet>Not intentionally or negligently cause damage; not cause nuisance or interfere with neighbours.</Bullet>
        <Bullet>Not make alterations or additions without the landlord{"'"}s consent (except as allowed by law).</Bullet>
        <Bullet>Allow the landlord access for inspections and repairs with proper notice (minimum 24 hours, unless urgent).</Bullet>
        <Bullet>Report damage and necessary repairs promptly.</Bullet>
        <Bullet>Comply with all obligations under the Residential Tenancies Act 2010 (NSW) and regulations.</Bullet>

        <Text style={styles.h2}>8. Special conditions</Text>
        {specialConditions.map((line, i) => (
          <Bullet key={i}>{line}</Bullet>
        ))}
        {bookingNotes ? (
          <Text style={styles.p}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Additional notes from booking: </Text>
            {bookingNotes}
          </Text>
        ) : null}

        <Text style={styles.h2}>9. Signatures</Text>
        <Text style={styles.p}>
          The parties intend to sign this agreement electronically. Signature fields may be completed via the
          nominated e-signing workflow.
        </Text>
        <View style={styles.sigBlock}>
          <Text style={styles.sigLabel}>Landlord</Text>
          <Text>Name: {landlordDisplay}</Text>
          <Text style={styles.sigLine} />
          <Text>Signature</Text>
          <Text style={{ marginTop: 8 }}>Date: _______________</Text>
        </View>
        <View style={styles.sigBlock}>
          <Text style={styles.sigLabel}>Tenant</Text>
          <Text>Name: {tenant.fullName}</Text>
          <Text style={styles.sigLine} />
          <Text>Signature</Text>
          <Text style={{ marginTop: 8 }}>Date: _______________</Text>
        </View>
        <Text style={{ ...styles.p, marginTop: 10, fontSize: 9 }}>
          This agreement may be executed electronically in accordance with the Electronic Transactions Act 1999
          (Cth) and applicable NSW law.
        </Text>
      </Page>
    </Document>
  )
}
