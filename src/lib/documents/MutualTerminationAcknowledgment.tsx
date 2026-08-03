/**
 * Mutual termination acknowledgment (NSW Tier 2).
 * Not a prescribed Fair Trading form; platform-facilitated mutual surrender.
 */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { platformAddendumDocusealTag } from './platformAddendumDocusealTags.js'

export type MutualTerminationAcknowledgmentProps = {
  landlordName: string
  tenantName: string
  premisesLine: string
  agreementDated: string
  agreementCommenced: string
  terminationDate: string
  bondOutcomeLabel: string
  newPremisesLine?: string | null
  continueInSamePremises: boolean
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    lineHeight: 1.45,
  },
  title: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  subtitle: { fontSize: 9, color: '#444', marginBottom: 16 },
  h: { fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 4 },
  p: { marginBottom: 6 },
  sigRow: { marginTop: 18, flexDirection: 'row', gap: 24 },
  sigCol: { flex: 1 },
  sigBox: {
    marginTop: 6,
    minHeight: 72,
    borderWidth: 0.5,
    borderColor: '#999',
    padding: 6,
  },
  dateBox: {
    marginTop: 8,
    minHeight: 28,
    borderWidth: 0.5,
    borderColor: '#999',
    padding: 4,
  },
  label: { fontSize: 8, color: '#555', marginBottom: 2 },
})

export function MutualTerminationAcknowledgment(props: MutualTerminationAcknowledgmentProps) {
  const {
    landlordName,
    tenantName,
    premisesLine,
    agreementDated,
    agreementCommenced,
    terminationDate,
    bondOutcomeLabel,
    newPremisesLine,
    continueInSamePremises,
  } = props

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          MUTUAL TERMINATION OF RESIDENTIAL TENANCY AGREEMENT (BY AGREEMENT)
        </Text>
        <Text style={styles.subtitle}>New South Wales · facilitated via Quni Living</Text>

        <Text style={styles.h}>Parties</Text>
        <Text style={styles.p}>Landlord: {landlordName} ("Landlord")</Text>
        <Text style={styles.p}>Tenant: {tenantName} ("Tenant")</Text>
        <Text style={styles.p}>Premises: {premisesLine}</Text>
        <Text style={styles.p}>
          Existing agreement: Residential Tenancy Agreement (NSW prescribed form) dated{' '}
          {agreementDated}, commenced {agreementCommenced} ("the Agreement").
        </Text>

        <Text style={styles.h}>1. Agreement to end by mutual consent</Text>
        <Text style={styles.p}>
          The Landlord and Tenant agree to end the Agreement early by mutual agreement. Neither
          party is giving notice under, or relying on, the termination provisions of the
          Residential Tenancies Act 2010 (NSW); this is a consensual surrender.
        </Text>

        <Text style={styles.h}>2. Effective date</Text>
        <Text style={styles.p}>
          The Agreement terminates and the Tenant surrenders the Premises at the end of{' '}
          {terminationDate} ("Termination Date"). Until the Termination Date the Agreement
          continues in full — the Tenant remains entitled to occupy the Premises and remains liable
          for rent and their obligations up to that date.
        </Text>

        <Text style={styles.h}>3. Rent and charges</Text>
        <Text style={styles.p}>
          Rent and any agreed charges are payable up to and including the Termination Date. No
          early-termination/break fee is payable, this being a consensual surrender.
        </Text>

        <Text style={styles.h}>4. Bond</Text>
        <Text style={styles.p}>
          The parties agree the rental bond will be dealt with as follows: {bondOutcomeLabel}
          {newPremisesLine ? ` (new tenancy premises: ${newPremisesLine}).` : '.'} Any bond action
          is completed through NSW Fair Trading / Rental Bonds Online; Quni Living does not hold the
          bond.
        </Text>

        <Text style={styles.h}>5. Condition / handover</Text>
        <Text style={styles.p}>
          {continueInSamePremises
            ? 'The Tenant immediately enters a new agreement for the same premises: a fresh ingoing condition report for the new tenancy applies and no vacant handover is required.'
            : 'An outgoing condition report will be completed and the Tenant will return all keys and access devices by the Termination Date.'}
        </Text>

        <Text style={styles.h}>6. Mutual release</Text>
        <Text style={styles.p}>
          From the Termination Date, each party releases the other from further obligations under
          the Agreement, except for obligations that have already accrued (including unpaid rent,
          damage beyond fair wear and tear, and any bond adjustment).
        </Text>

        <Text style={styles.h}>7. Signatures</Text>
        <Text style={styles.p}>
          Electronic signature is valid and binding (Electronic Transactions Act 2000 (NSW)).
        </Text>

        <View style={styles.sigRow}>
          <View style={styles.sigCol}>
            <Text style={styles.label}>Landlord</Text>
            <View style={styles.sigBox}>
              <Text>
                {platformAddendumDocusealTag('LandlordSignature', 'First Party', 'signature')}
              </Text>
            </View>
            <View style={styles.dateBox}>
              <Text>{platformAddendumDocusealTag('LandlordDate', 'First Party', 'date')}</Text>
            </View>
          </View>
          <View style={styles.sigCol}>
            <Text style={styles.label}>Tenant</Text>
            <View style={styles.sigBox}>
              <Text>
                {platformAddendumDocusealTag('TenantSignature', 'Second Party', 'signature')}
              </Text>
            </View>
            <View style={styles.dateBox}>
              <Text>{platformAddendumDocusealTag('TenantDate', 'Second Party', 'date')}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
