/**
 * NSW Residential Tenancy Agreement PDF (React-PDF). Plain .js so Vercel Node ESM
 * resolves the module without a compiled .tsx artifact.
 */
import React from 'react'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

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

function formatMoney(n) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

function Bullet({ children }) {
  return React.createElement(
    View,
    { style: styles.bullet, wrap: false },
    React.createElement(Text, { style: styles.bulletDot }, '•'),
    React.createElement(Text, { style: styles.bulletText }, children),
  )
}

function footerText({ pageNumber, totalPages }) {
  return `Quni Living — quni.com.au — hello@quni.com.au    Page ${pageNumber} of ${totalPages}`
}

/** NSW RTA PDF root component (props shape matches `rtaTypes.ts`). */
export function ResidentialTenancyAgreement(props) {
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

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(Text, {
        style: styles.footer,
        fixed: true,
        render: footerText,
      }),
      React.createElement(
        View,
        { style: styles.headerBar },
        React.createElement(
          View,
          { style: styles.brandMark },
          React.createElement(Text, { style: styles.brandMarkText }, 'Q'),
        ),
        React.createElement(
          View,
          { style: styles.headerTitles },
          React.createElement(Text, { style: styles.title }, 'Residential Tenancy Agreement'),
          React.createElement(
            Text,
            { style: styles.subtitle },
            'NSW — Residential Tenancies Act 2010 (standard terms apply as prescribed)',
          ),
        ),
      ),
      React.createElement(
        Text,
        { style: styles.metaRow },
        `Document ID: ${documentId} · Generated: ${generatedAt}`,
      ),
      React.createElement(Text, { style: styles.h2 }, '1. Parties'),
      React.createElement(
        Text,
        { style: styles.p },
        React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold' } }, 'Landlord: '),
        landlordDisplay,
      ),
      React.createElement(Text, { style: styles.p }, `Address: ${landlord.addressLine}`),
      React.createElement(Text, { style: styles.p }, `Email: ${landlord.email}`),
      React.createElement(Text, { style: styles.p }, `Phone: ${landlord.phone}`),
      React.createElement(
        Text,
        { style: styles.p },
        React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold' } }, 'Tenant: '),
        tenant.fullName,
      ),
      React.createElement(Text, { style: styles.p }, `Address for service: ${premises.addressLine}`),
      React.createElement(Text, { style: styles.p }, `Email: ${tenant.email}`),
      React.createElement(Text, { style: styles.p }, `Phone: ${tenant.phone}`),
      tenant.dateOfBirth
        ? React.createElement(Text, { style: styles.p }, `Date of birth: ${tenant.dateOfBirth}`)
        : null,
      React.createElement(Text, { style: styles.h2 }, '2. Premises'),
      React.createElement(
        Text,
        { style: styles.p },
        'The landlord lets and the tenant takes the residential premises at: ',
        React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold' } }, premises.addressLine),
      ),
      React.createElement(
        Text,
        { style: styles.p },
        `Property type: ${premises.propertyType ?? '—'} · Room type: ${premises.roomType ?? '—'} · Furnished: ${
          premises.furnished === true ? 'Yes' : premises.furnished === false ? 'No' : '—'
        }`,
      ),
      React.createElement(Text, { style: styles.p }, 'Inclusions:'),
      premises.linenSupplied === true ? React.createElement(Bullet, null, 'Linen supplied') : null,
      premises.weeklyCleaningService === true
        ? React.createElement(Bullet, null, 'Weekly cleaning service')
        : null,
      premises.linenSupplied !== true && premises.weeklyCleaningService !== true
        ? React.createElement(Text, { style: styles.p }, 'None specified beyond standard inclusions.')
        : null,
      React.createElement(Text, { style: styles.h2 }, '3. Term'),
      React.createElement(Text, { style: styles.p }, `Start date: ${term.startDate}`),
      React.createElement(
        Text,
        { style: styles.p },
        'End date: ',
        term.periodic || !term.endDate ? 'Periodic tenancy (no fixed end date)' : term.endDate,
      ),
      React.createElement(
        Text,
        { style: styles.p },
        `Lease length (as agreed at booking): ${term.leaseLengthDescription}`,
      ),
      React.createElement(Text, { style: styles.h2 }, '4. Rent'),
      React.createElement(Text, { style: styles.p }, `Weekly rent: ${formatMoney(rent.weeklyRent)}`),
      React.createElement(
        Text,
        { style: styles.p },
        `Quni platform fee (student contribution): ${rent.platformFeePercent}% of weekly rent (${formatMoney(
          rent.weeklyRent * (rent.platformFeePercent / 100),
        )})`,
      ),
      React.createElement(
        Text,
        { style: styles.p },
        React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold' } }, 'Total weekly payment: '),
        formatMoney(rent.totalWeekly),
      ),
      React.createElement(Text, { style: styles.p }, `Payment method: ${rent.paymentMethod}`),
      React.createElement(
        Text,
        { style: styles.p },
        'Rent is payable weekly in advance unless otherwise agreed in writing.',
      ),
    ),
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(Text, {
        style: styles.footer,
        fixed: true,
        render: footerText,
      }),
      React.createElement(Text, { style: styles.h2 }, '5. Bond'),
      React.createElement(Text, { style: styles.p }, `Bond amount: ${bondText}`),
      React.createElement(
        Text,
        { style: styles.p },
        'Bond must be lodged with NSW Fair Trading via MyBond within 10 business days of receipt, as required by law.',
      ),
      React.createElement(Text, { style: styles.p }, 'MyBond / Fair Trading: www.fairtrading.nsw.gov.au'),
      React.createElement(Text, { style: styles.h2 }, '6. Landlord obligations'),
      React.createElement(
        Bullet,
        null,
        'Provide the premises in a reasonable state of cleanliness and fit for habitation.',
      ),
      React.createElement(Bullet, null, 'Ensure the premises are reasonably secure.'),
      React.createElement(
        Bullet,
        null,
        'Carry out repairs within a reasonable time after notice (urgent repairs as required by law).',
      ),
      React.createElement(
        Bullet,
        null,
        "Not interfere unreasonably with the tenant's quiet enjoyment of the premises.",
      ),
      React.createElement(
        Bullet,
        null,
        'Comply with all obligations under the Residential Tenancies Act 2010 (NSW) and regulations.',
      ),
      React.createElement(Text, { style: styles.h2 }, '7. Tenant obligations'),
      React.createElement(Bullet, null, 'Pay rent on time and in the manner agreed.'),
      React.createElement(
        Bullet,
        null,
        'Keep the premises reasonably clean, having regard to their condition at the start of the tenancy.',
      ),
      React.createElement(
        Bullet,
        null,
        'Not intentionally or negligently cause damage; not cause nuisance or interfere with neighbours.',
      ),
      React.createElement(
        Bullet,
        null,
        "Not make alterations or additions without the landlord's consent (except as allowed by law).",
      ),
      React.createElement(
        Bullet,
        null,
        'Allow the landlord access for inspections and repairs with proper notice (minimum 24 hours, unless urgent).',
      ),
      React.createElement(Bullet, null, 'Report damage and necessary repairs promptly.'),
      React.createElement(
        Bullet,
        null,
        'Comply with all obligations under the Residential Tenancies Act 2010 (NSW) and regulations.',
      ),
      React.createElement(Text, { style: styles.h2 }, '8. Special conditions'),
      ...specialConditions.map((line, i) => React.createElement(Bullet, { key: i }, line)),
      bookingNotes
        ? React.createElement(
            Text,
            { style: styles.p },
            React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold' } }, 'Additional notes from booking: '),
            bookingNotes,
          )
        : null,
      React.createElement(Text, { style: styles.h2 }, '9. Signatures'),
      React.createElement(
        Text,
        { style: styles.p },
        'The parties intend to sign this agreement electronically. Signature fields may be completed via the nominated e-signing workflow.',
      ),
      React.createElement(
        View,
        { style: styles.sigBlock },
        React.createElement(Text, { style: styles.sigLabel }, 'Landlord'),
        React.createElement(Text, null, `Name: ${landlordDisplay}`),
        React.createElement(Text, { style: styles.sigLine }),
        React.createElement(Text, null, 'Signature'),
        React.createElement(Text, { style: { marginTop: 8 } }, 'Date: _______________'),
      ),
      React.createElement(
        View,
        { style: styles.sigBlock },
        React.createElement(Text, { style: styles.sigLabel }, 'Tenant'),
        React.createElement(Text, null, `Name: ${tenant.fullName}`),
        React.createElement(Text, { style: styles.sigLine }),
        React.createElement(Text, null, 'Signature'),
        React.createElement(Text, { style: { marginTop: 8 } }, 'Date: _______________'),
      ),
      React.createElement(
        Text,
        { style: { ...styles.p, marginTop: 10, fontSize: 9 } },
        'This agreement may be executed electronically in accordance with the Electronic Transactions Act 1999 (Cth) and applicable NSW law.',
      ),
    ),
  )
}
