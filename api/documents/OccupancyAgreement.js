/**
 * Quni Living Residential Occupancy Agreement (React-PDF). Plain .js so Vercel Node ESM
 * resolves the module without a compiled .tsx artifact. Props shape matches `rtaTypes.ts`.
 */
import React from 'react'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

const cream = '#FAF6EE'
const creamLight = '#F5EDD8'
const terracotta = '#C9672A'
const body = '#2C2417'
const grey = '#6B6560'
const greyMuted = '#7A736C'
const white = '#FFFFFF'

const styles = StyleSheet.create({
  page: {
    paddingTop: 88,
    paddingBottom: 72,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: body,
    lineHeight: 1.45,
    backgroundColor: cream,
  },
  headerWrap: {
    position: 'absolute',
    top: 28,
    left: 40,
    right: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandQuni: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: terracotta,
    letterSpacing: 0.3,
  },
  headerRightBlock: { alignItems: 'flex-end', maxWidth: 280 },
  headerDocTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: terracotta,
    textAlign: 'right',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 8,
    color: greyMuted,
    textAlign: 'right',
  },
  headerRule: {
    marginTop: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: terracotta,
    width: '100%',
  },
  footerWrap: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    right: 40,
  },
  footerRule: {
    borderTopWidth: 1.5,
    borderTopColor: terracotta,
    width: '100%',
    marginBottom: 6,
  },
  footerText: {
    fontSize: 7.5,
    color: grey,
  },
  p: { marginBottom: 5, textAlign: 'justify' },
  pTight: { marginBottom: 3, textAlign: 'justify' },
  noteBox: {
    marginTop: 8,
    marginBottom: 10,
    padding: 10,
    backgroundColor: creamLight,
    borderWidth: 0.5,
    borderColor: '#E8DFD0',
  },
  noteItalic: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Oblique',
    color: body,
    lineHeight: 1.5,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 12,
    marginBottom: 6,
  },
  sectionBadge: {
    width: 18,
    height: 18,
    backgroundColor: terracotta,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 1,
  },
  sectionBadgeText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: white,
  },
  sectionTitleCol: { flex: 1 },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: body,
    marginBottom: 4,
  },
  sectionRule: {
    borderBottomWidth: 1,
    borderBottomColor: terracotta,
    width: '100%',
  },
  summaryTable: {
    marginTop: 4,
    borderWidth: 0.5,
    borderColor: '#D4C9B8',
  },
  summaryRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#D4C9B8',
  },
  summaryLabelCell: {
    width: '38%',
    backgroundColor: creamLight,
    paddingVertical: 5,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  summaryLabelText: { fontSize: 8.5, color: grey },
  summaryValueCell: {
    flex: 1,
    backgroundColor: cream,
    paddingVertical: 5,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  summaryValueText: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: body },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#D4C9B8',
  },
  dataRowA: { backgroundColor: cream },
  dataRowB: { backgroundColor: creamLight },
  dataLabelCell: {
    width: '32%',
    paddingVertical: 4,
    paddingHorizontal: 7,
  },
  dataValueCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 7,
  },
  dataLabel: { fontSize: 8, color: grey },
  dataValue: { fontSize: 8, color: body },
  tableWrap: {
    marginTop: 6,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: '#C4B8A8',
  },
  thRow: {
    flexDirection: 'row',
    backgroundColor: terracotta,
    borderBottomWidth: 0.5,
    borderBottomColor: terracotta,
  },
  thCell: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRightWidth: 0.5,
    borderRightColor: white,
  },
  thCellLast: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  thText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: white },
  trRowEven: { flexDirection: 'row', backgroundColor: cream },
  trRowOdd: { flexDirection: 'row', backgroundColor: creamLight },
  tdCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 0.5,
    borderRightColor: '#D4C9B8',
    borderBottomWidth: 0.5,
    borderBottomColor: '#D4C9B8',
  },
  tdCellLast: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#D4C9B8',
  },
  tdText: { fontSize: 7.5, color: body },
  partiesTable: {
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: '#C4B8A8',
  },
  partiesHeaderRow: {
    flexDirection: 'row',
    backgroundColor: terracotta,
  },
  partiesHeaderCell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRightWidth: 0.5,
    borderRightColor: white,
  },
  partiesHeaderCellLast: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  partiesBodyRow: { flexDirection: 'row' },
  partiesCell: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRightWidth: 0.5,
    borderRightColor: '#D4C9B8',
    backgroundColor: cream,
  },
  partiesCellLast: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: creamLight,
  },
  bullet: { flexDirection: 'row', marginBottom: 3, paddingLeft: 2 },
  bulletDot: { width: 14, fontSize: 9 },
  bulletText: { flex: 1, fontSize: 8.5 },
  numList: { flexDirection: 'row', marginBottom: 3 },
  numListMark: { width: 22, fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  numListText: { flex: 1, fontSize: 8.5 },
  sigTable: {
    marginTop: 10,
    borderWidth: 0.5,
    borderColor: '#C4B8A8',
  },
  sigHeaderRow: { flexDirection: 'row', backgroundColor: terracotta },
  sigHeaderCell: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRightWidth: 0.5,
    borderRightColor: white,
  },
  sigHeaderCellLast: { flex: 1, paddingVertical: 7, paddingHorizontal: 10 },
  sigBodyRow: { flexDirection: 'row', minHeight: 120 },
  sigCol: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRightWidth: 0.5,
    borderRightColor: '#D4C9B8',
    backgroundColor: cream,
  },
  sigColLast: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: creamLight,
  },
  sigNameBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: body, marginBottom: 12 },
  sigLabelRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4, flexWrap: 'wrap' },
  sigLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: terracotta },
  sigSpace: {
    marginTop: 18,
    borderBottomWidth: 0.75,
    borderBottomColor: body,
    marginBottom: 14,
    minHeight: 20,
  },
  /** DocuSeal parses {{...}} text tags; white + 1pt keeps them off the printed page. */
  docusealTag: { fontSize: 1, color: '#FFFFFF' },
  h3small: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: body,
    marginTop: 8,
    marginBottom: 4,
  },
})

function R(el, props, ...children) {
  const filtered = children.filter((c) => c != null && c !== false)
  return filtered.length ? React.createElement(el, props, ...filtered) : React.createElement(el, props)
}

function formatMoney(n) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

function furnishedText(v) {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return '—'
}

function SummaryRow({ label, value }) {
  return R(
    View,
    { style: styles.summaryRow },
    R(View, { style: styles.summaryLabelCell }, R(Text, { style: styles.summaryLabelText }, label)),
    R(View, { style: styles.summaryValueCell }, R(Text, { style: styles.summaryValueText }, value)),
  )
}

function SectionHeading({ num, title }) {
  return R(
    View,
    { style: styles.sectionRow, wrap: false },
    R(
      View,
      { style: styles.sectionBadge },
      R(Text, { style: styles.sectionBadgeText }, String(num)),
    ),
    R(
      View,
      { style: styles.sectionTitleCol },
      R(Text, { style: styles.sectionTitle }, title),
      R(View, { style: styles.sectionRule }),
    ),
  )
}

function DataRow({ label, value, alt }) {
  return R(
    View,
    { style: [styles.dataRow, alt ? styles.dataRowB : styles.dataRowA] },
    R(View, { style: styles.dataLabelCell }, R(Text, { style: styles.dataLabel }, label)),
    R(View, { style: styles.dataValueCell }, R(Text, { style: styles.dataValue }, value)),
  )
}

function Bullet({ children }) {
  return R(
    View,
    { style: styles.bullet, wrap: false },
    R(Text, { style: styles.bulletDot }, '•'),
    R(Text, { style: styles.bulletText }, children),
  )
}

function NumItem({ n, children }) {
  return R(
    View,
    { style: styles.numList, wrap: false },
    R(Text, { style: styles.numListMark }, `${n}.`),
    R(Text, { style: styles.numListText }, children),
  )
}

function TableHeader({ cells }) {
  return R(
    View,
    { style: styles.thRow },
    ...cells.map((c, i) =>
      R(
        View,
        { key: i, style: i === cells.length - 1 ? styles.thCellLast : styles.thCell },
        R(Text, { style: styles.thText }, c),
      ),
    ),
  )
}

function TableRow({ cells, odd }) {
  const rowStyle = odd ? styles.trRowOdd : styles.trRowEven
  return R(
    View,
    { style: rowStyle },
    ...cells.map((c, i) =>
      R(
        View,
        { key: i, style: i === cells.length - 1 ? styles.tdCellLast : styles.tdCell },
        R(Text, { style: styles.tdText }, c),
      ),
    ),
  )
}

function FixedHeader() {
  return R(
    View,
    { style: styles.headerWrap, fixed: true },
    R(
      View,
      { style: styles.headerRow },
      R(Text, { style: styles.brandQuni }, 'Quni'),
      R(
        View,
        { style: styles.headerRightBlock },
        R(Text, { style: styles.headerDocTitle }, 'Residential Occupancy Agreement'),
        R(Text, { style: styles.headerSubtitle }, 'NSW · Residential Tenancies Act 2010'),
      ),
    ),
    R(View, { style: styles.headerRule }),
  )
}

function FixedFooter({ documentId, generatedAt }) {
  return R(
    View,
    { style: styles.footerWrap, fixed: true },
    R(View, { style: styles.footerRule }),
    R(Text, {
      style: styles.footerText,
      render: ({ pageNumber, totalPages }) =>
        `Quni Living · Residential Occupancy Agreement · Document ID: ${documentId} · Generated: ${generatedAt} · Page ${pageNumber}` +
        (totalPages ? ` of ${totalPages}` : ''),
    }),
  )
}

/** NSW Occupancy Agreement PDF root (props shape matches `rtaTypes.ts`). */
export function OccupancyAgreement(props) {
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
    houseRules,
  } = props

  const houseRulesText =
    typeof houseRules === 'string' && houseRules.trim().length > 0 ? houseRules : null

  const landlordDisplay = landlord.companyName
    ? `${landlord.fullName} (${landlord.companyName})`
    : landlord.fullName

  const bondText =
    bond.amount != null && Number.isFinite(bond.amount)
      ? formatMoney(bond.amount)
      : 'As agreed (see bond schedule)'

  const endDateText = term.periodic || !term.endDate ? 'Periodic tenancy (no fixed end date)' : term.endDate

  const platformFeeAmount = rent.weeklyRent * (rent.platformFeePercent / 100)

  const preamble =
    'This Residential Occupancy Agreement is made under the Residential Tenancies Act 2010 (NSW). The standard terms prescribed by regulation form part of this agreement. ' +
    'This document records the agreed particulars between the landlord/provider and the tenant, including rent, bond, term, and any special conditions set out below. ' +
    'Where this agreement is executed electronically, the parties intend that method of signing to be valid and binding.'

  const pageProps = { size: 'A4', style: styles.page }

  return R(
    Document,
    null,
    /* —— Page 1 —— */
    R(
      Page,
      pageProps,
      R(FixedHeader, null),
      R(FixedFooter, { documentId, generatedAt }),
      R(
        View,
        { style: styles.summaryTable },
        R(SummaryRow, { label: 'Property', value: premises.addressLine }),
        R(SummaryRow, { label: 'Room', value: premises.roomType ?? '—' }),
        R(SummaryRow, { label: 'Tenant', value: tenant.fullName }),
        R(SummaryRow, { label: 'Landlord / Provider', value: landlordDisplay }),
        R(SummaryRow, { label: 'Start date', value: term.startDate }),
        R(SummaryRow, { label: 'End date', value: endDateText }),
        R(SummaryRow, { label: 'Lease length', value: term.leaseLengthDescription }),
        R(SummaryRow, { label: 'Weekly rent', value: formatMoney(rent.weeklyRent) }),
        R(SummaryRow, {
          label: 'Platform fee',
          value: `${rent.platformFeePercent}% (${formatMoney(platformFeeAmount)})`,
        }),
        R(SummaryRow, { label: 'Total weekly payment', value: formatMoney(rent.totalWeekly) }),
        R(SummaryRow, { label: 'Bond', value: bondText }),
        R(SummaryRow, { label: 'Furnished', value: furnishedText(premises.furnished) }),
      ),
      R(
        View,
        { style: styles.noteBox },
        R(Text, { style: styles.noteItalic }, preamble),
      ),
      R(SectionHeading, { num: 1, title: 'Parties' }),
      R(
        View,
        { style: styles.partiesTable },
        R(
          View,
          { style: styles.partiesHeaderRow },
          R(View, { style: styles.partiesHeaderCell }, R(Text, { style: styles.thText }, 'Landlord / Provider')),
          R(View, { style: styles.partiesHeaderCellLast }, R(Text, { style: styles.thText }, 'Tenant')),
        ),
        R(
          View,
          { style: styles.partiesBodyRow },
          R(
            View,
            { style: styles.partiesCell },
            R(Text, { style: styles.dataValue }, landlordDisplay),
            R(Text, { style: styles.pTight }, `Address: ${landlord.addressLine}`),
            R(Text, { style: styles.pTight }, `Email: ${landlord.email}`),
            R(Text, { style: styles.pTight }, `Phone: ${landlord.phone}`),
          ),
          R(
            View,
            { style: styles.partiesCellLast },
            R(Text, { style: styles.dataValue }, tenant.fullName),
            R(Text, { style: styles.pTight }, `Address for service: ${premises.addressLine}`),
            R(Text, { style: styles.pTight }, `Email: ${tenant.email}`),
            R(Text, { style: styles.pTight }, `Phone: ${tenant.phone}`),
            tenant.dateOfBirth
              ? R(Text, { style: styles.pTight }, `Date of birth: ${tenant.dateOfBirth}`)
              : null,
          ),
        ),
      ),
    ),
    /* —— Page 2 —— */
    R(
      Page,
      pageProps,
      R(FixedHeader, null),
      R(FixedFooter, { documentId, generatedAt }),
      R(SectionHeading, { num: 2, title: 'Premises' }),
      R(
        Text,
        { style: styles.p },
        'The landlord lets and the tenant takes the residential premises for use as a residence only, at the address shown in the summary. The tenancy includes the room and shared areas as described in the listing and on inspection, consistent with the Residential Tenancies Act 2010 (NSW).',
      ),
      R(
        View,
        { style: styles.tableWrap },
        R(TableHeader, { cells: ['Particular', 'Detail'] }),
        R(DataRow, { label: 'Property type', value: premises.propertyType ?? '—', alt: false }),
        R(DataRow, { label: 'Room type', value: premises.roomType ?? '—', alt: true }),
        R(DataRow, { label: 'Furnished', value: furnishedText(premises.furnished), alt: false }),
        R(DataRow, {
          label: 'Inclusions',
          value:
            [
              premises.linenSupplied ? 'Linen supplied' : null,
              premises.weeklyCleaningService ? 'Weekly cleaning service' : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'As per standard listing / inspection',
          alt: true,
        }),
      ),
      R(SectionHeading, { num: 3, title: 'Term' }),
      R(
        Text,
        { style: styles.p },
        'The tenancy commences on the start date in the summary and continues for the agreed lease length unless ended earlier in accordance with this agreement and the Act.',
      ),
      R(
        View,
        { style: styles.tableWrap },
        R(TableHeader, { cells: ['Item', 'Agreed terms'] }),
        R(DataRow, { label: 'Start date', value: term.startDate, alt: false }),
        R(DataRow, { label: 'End date', value: endDateText, alt: true }),
        R(DataRow, { label: 'Lease length', value: term.leaseLengthDescription, alt: false }),
        R(DataRow, {
          label: 'Periodic after fixed term',
          value: term.periodic
            ? 'Yes — tenancy may continue as periodic after any fixed term, as allowed by law.'
            : 'As per Act if applicable.',
          alt: true,
        }),
      ),
      R(SectionHeading, { num: 4, title: 'Rent and payments' }),
      R(
        Text,
        { style: styles.p },
        'Rent is payable in advance at the frequency and by the method agreed. The tenant must pay the total weekly amount shown in the summary, comprising rent and any stated platform fee component.',
      ),
      R(
        View,
        { style: styles.tableWrap },
        R(TableHeader, { cells: ['Description', 'Amount'] }),
        R(DataRow, { label: 'Weekly rent', value: formatMoney(rent.weeklyRent), alt: false }),
        R(DataRow, {
          label: `Platform fee (${rent.platformFeePercent}% of weekly rent)`,
          value: formatMoney(platformFeeAmount),
          alt: true,
        }),
        R(DataRow, { label: 'Total weekly payment', value: formatMoney(rent.totalWeekly), alt: false }),
        R(DataRow, { label: 'Payment method', value: rent.paymentMethod, alt: true }),
      ),
    ),
    /* —— Page 3 —— */
    R(
      Page,
      pageProps,
      R(FixedHeader, null),
      R(FixedFooter, { documentId, generatedAt }),
      R(
        Text,
        { style: styles.p },
        'If rent is not paid on time, the landlord may take steps allowed by the Act, including issuing a termination notice where grounds exist. Rent increases must follow the Act and any required notice period.',
      ),
      R(SectionHeading, { num: 5, title: 'Bond' }),
      R(
        Text,
        { style: styles.p },
        'The bond amount is set out in the summary. Bond must be lodged with NSW Fair Trading (Rental Bonds Online / MyBond) as required by law, within the statutory period after receipt.',
      ),
      R(
        View,
        { style: styles.noteBox },
        R(
          Text,
          { style: styles.noteItalic },
          'Fair Trading NSW provides information on bond lodgment and claims. The tenant should retain evidence of payment and lodgment references.',
        ),
      ),
      R(SectionHeading, { num: 6, title: 'Tenant obligations' }),
      R(Bullet, null, 'Pay rent on time and in the agreed manner.'),
      R(
        Bullet,
        null,
        'Keep the premises reasonably clean, having regard to their condition at the start of the tenancy.',
      ),
      R(Bullet, null, 'Not intentionally or negligently cause damage; not cause nuisance or interfere with neighbours.'),
      R(
        Bullet,
        null,
        "Not make alterations or additions without the landlord's written consent (except as allowed by law).",
      ),
      R(
        Bullet,
        null,
        'Allow access for inspections and repairs with proper notice (minimum 24 hours for non-urgent matters, unless otherwise agreed or urgent).',
      ),
      R(Bullet, null, 'Report damage and necessary repairs promptly.'),
      R(Bullet, null, 'Comply with reasonable strata or building rules notified to the tenant.'),
      R(Bullet, null, 'Comply with the Residential Tenancies Act 2010 (NSW), regulations, and this agreement.'),
      R(SectionHeading, { num: 7, title: 'Landlord obligations' }),
      R(Bullet, null, 'Provide the premises in a reasonable state of cleanliness and fit for habitation.'),
      R(Bullet, null, 'Ensure the premises are reasonably secure.'),
      R(
        Bullet,
        null,
        'Carry out repairs within a reasonable time after notice (including urgent repairs as required by law).',
      ),
      R(Bullet, null, "Not interfere unreasonably with the tenant's quiet enjoyment."),
      R(Bullet, null, 'Comply with the Act, regulations, and this agreement.'),
    ),
    /* —— Page 4 —— */
    R(
      Page,
      pageProps,
      R(FixedHeader, null),
      R(FixedFooter, { documentId, generatedAt }),
      R(SectionHeading, { num: 8, title: 'Services and utilities' }),
      R(
        Text,
        { style: styles.p },
        'Unless otherwise agreed in writing, utilities and services are allocated as commonly advertised for the premises (e.g. shared utilities in co-living). The tenant is responsible for charges they expressly agree to pay.',
      ),
      R(
        View,
        { style: styles.tableWrap },
        R(TableHeader, { cells: ['Matter', 'Position'] }),
        R(DataRow, {
          label: 'Water / electricity / gas / internet',
          value: 'As per listing and move-in information unless varied in writing.',
          alt: false,
        }),
        R(DataRow, {
          label: 'Smoke alarms / safety',
          value: 'Landlord to comply with statutory obligations; tenant to report faults.',
          alt: true,
        }),
      ),
      R(SectionHeading, { num: 9, title: 'Use of premises' }),
      R(
        Text,
        { style: styles.p },
        'The premises must be used only as a residential dwelling. The tenant must not use the premises for illegal purposes, exceed occupancy limits agreed or imposed by law, or run a business from the premises without written consent.',
      ),
      R(NumItem, { n: 1, children: 'The tenant may invite guests for short stays subject to house rules and reasonable notice to housemates where applicable.' }),
      R(NumItem, {
        n: 2,
        children:
          "Subletting or assignment requires the landlord's prior written consent unless the Act provides otherwise.",
      }),
      R(NumItem, { n: 3, children: 'Pets are only permitted where agreed in writing or as stated in the listing.' }),
    ),
    /* —— Page 5 —— */
    R(
      Page,
      pageProps,
      R(FixedHeader, null),
      R(FixedFooter, { documentId, generatedAt }),
      R(SectionHeading, { num: 10, title: 'Access and inspections' }),
      R(
        Text,
        { style: styles.p },
        'The landlord may enter the premises only on lawful grounds and with required notice, except in an emergency or as the Act allows.',
      ),
      R(
        View,
        { style: styles.tableWrap },
        R(TableHeader, { cells: ['Purpose', 'Minimum notice', 'Notes'] }),
        R(TableRow, {
          cells: ['Routine inspection / condition report', 'At least 7 days', 'Frequency as Act allows'],
          odd: false,
        }),
        R(TableRow, {
          cells: ['Carrying out repairs (non-urgent)', 'At least 24 hours', 'Reasonable date/time'],
          odd: true,
        }),
        R(TableRow, {
          cells: ['Showing premises to prospective tenant/buyer', 'As per Act', 'Limited periods before termination'],
          odd: false,
        }),
        R(TableRow, { cells: ['Urgent repairs', 'No notice if necessary', 'Tenant to cooperate'], odd: true }),
      ),
      R(SectionHeading, { num: 11, title: 'Repairs and maintenance' }),
      R(
        Text,
        { style: styles.p },
        'The tenant must notify the landlord of needed repairs. Urgent repairs may be arranged as permitted by the Act. Non-urgent repairs should be addressed within a reasonable time.',
      ),
      R(
        View,
        { style: styles.noteBox },
        R(
          Text,
          { style: styles.noteItalic },
          "Tenants should use the landlord's nominated maintenance channel where provided. False or vexatious reports may breach this agreement.",
        ),
      ),
    ),
    /* —— Page 6 —— */
    R(
      Page,
      pageProps,
      R(FixedHeader, null),
      R(FixedFooter, { documentId, generatedAt }),
      R(SectionHeading, { num: 12, title: 'Termination' }),
      R(
        Text,
        { style: styles.p },
        'Termination must follow the Residential Tenancies Act 2010 (NSW). The tables below summarise common pathways; they do not replace the Act or regulations.',
      ),
      R(Text, { style: styles.h3small }, 'Termination by tenant'),
      R(
        View,
        { style: styles.tableWrap },
        R(TableHeader, { cells: ['Scenario', 'Notice / action', 'Reference'] }),
        R(TableRow, {
          cells: ['End of fixed term (tenant vacating)', 'Tenant gives termination notice as Act requires', 'Act & standard terms'],
          odd: false,
        }),
        R(TableRow, {
          cells: ['Periodic tenancy', 'Tenant gives minimum notice under Act', 'Act & standard terms'],
          odd: true,
        }),
        R(TableRow, {
          cells: ['Breach by landlord', 'Tenant may apply to Tribunal if grounds exist', 'Act'],
          odd: false,
        }),
        R(TableRow, {
          cells: ['Break during fixed term', 'Break fee may apply (see Section 13)', 'This agreement'],
          odd: true,
        }),
      ),
      R(Text, { style: styles.h3small }, 'Termination by landlord'),
      R(
        View,
        { style: styles.tableWrap },
        R(TableHeader, { cells: ['Scenario', 'Notice / action', 'Reference'] }),
        R(TableRow, {
          cells: ['End of fixed term (no renewal)', 'Landlord notice as Act requires', 'Act & standard terms'],
          odd: false,
        }),
        R(TableRow, {
          cells: ['Periodic tenancy', 'Landlord notice on prescribed grounds', 'Act'],
          odd: true,
        }),
        R(TableRow, {
          cells: ['Breach by tenant', 'Landlord may issue termination notice if grounds exist', 'Act'],
          odd: false,
        }),
        R(TableRow, {
          cells: ['Serious breach / non-payment', 'Follow statutory notices and Tribunal orders', 'Act'],
          odd: true,
        }),
      ),
      R(SectionHeading, { num: 13, title: 'Break fee schedule (fixed term)' }),
      R(
        Text,
        { style: styles.pTight },
        'If the tenant ends a fixed term early without lawful grounds, a break fee may apply as prescribed by regulation (standard terms). Indicative schedule:',
      ),
      R(
        View,
        { style: styles.tableWrap },
        R(TableHeader, { cells: ['Portion of fixed term elapsed', 'Break fee'] }),
        R(TableRow, { cells: ['Not more than 25%', '4 weeks rent'], odd: false }),
        R(TableRow, { cells: ['More than 25% but not more than 50%', '3 weeks rent'], odd: true }),
        R(TableRow, { cells: ['More than 50% but not more than 75%', '2 weeks rent'], odd: false }),
        R(TableRow, { cells: ['More than 75%', '1 week rent'], odd: true }),
      ),
      R(
        View,
        { style: styles.noteBox },
        R(
          Text,
          { style: styles.noteItalic },
          'The statutory break fee provisions in the standard terms prevail. This schedule is a summary only.',
        ),
      ),
    ),
    /* —— Page 7 —— */
    R(
      Page,
      pageProps,
      R(FixedHeader, null),
      R(FixedFooter, { documentId, generatedAt }),
      R(SectionHeading, { num: 14, title: 'Transfer and subletting' }),
      R(
        Text,
        { style: styles.p },
        "The tenant must not transfer or sublet the whole or part of the premises without the landlord's written consent. Consent must not be unreasonably withheld where the Act requires.",
      ),
      R(SectionHeading, { num: 15, title: 'Schedule of fees and bond deductions' }),
      R(
        Text,
        { style: styles.pTight },
        'The following schedule records common fees and bond deduction categories. Amounts are indicative unless fixed in the summary or special conditions.',
      ),
      R(
        View,
        { style: styles.tableWrap },
        R(TableHeader, { cells: ['Item', 'Amount / basis', 'When charged'] }),
        R(TableRow, {
          cells: ['Rent', formatMoney(rent.totalWeekly) + ' (weekly)', 'In advance per payment cycle'],
          odd: false,
        }),
        R(TableRow, { cells: ['Bond', bondText, 'Prior to / at commencement'], odd: true }),
        R(TableRow, {
          cells: ['Platform fee component', `${rent.platformFeePercent}% of rent`, 'Included in weekly total'],
          odd: false,
        }),
        R(TableRow, {
          cells: ['Lost keys / security devices', 'Reasonable replacement cost', 'If tenant responsible'],
          odd: true,
        }),
        R(TableRow, {
          cells: ['Cleaning (if beyond fair wear)', 'Reasonable cost', 'End of tenancy if applicable'],
          odd: false,
        }),
        R(TableRow, {
          cells: ['Damage beyond fair wear', 'Reasonable repair cost', 'End of tenancy if applicable'],
          odd: true,
        }),
      ),
      R(SectionHeading, { num: 16, title: 'Disputes' }),
      R(
        Text,
        { style: styles.p },
        'Parties should attempt to resolve disputes in good faith. Either party may apply to NSW Civil and Administrative Tribunal (NCAT) for orders under the Act.',
      ),
      R(SectionHeading, { num: 17, title: 'Privacy' }),
      R(
        Text,
        { style: styles.p },
        'Personal information collected in connection with this tenancy is handled in accordance with applicable privacy law and Quni’s privacy notice provided at onboarding.',
      ),
      R(SectionHeading, { num: 18, title: 'Notices and electronic communications' }),
      R(
        Text,
        { style: styles.p },
        'Notices may be given by email to the addresses in Section 1 unless a party provides a different address for service in writing. The parties agree that the Electronic Transactions Act 2000 (NSW) applies to electronic records and signatures where permitted.',
      ),
      R(SectionHeading, { num: 19, title: 'Special conditions and general' }),
      R(
        Text,
        { style: styles.p },
        'The following special conditions apply in addition to the standard terms. If there is inconsistency, the Act and standard terms prevail to the extent required by law.',
      ),
      specialConditions.length
        ? R(View, null, ...specialConditions.map((line, i) => R(Bullet, { key: i }, line)))
        : R(Text, { style: styles.p }, 'No additional special conditions are recorded in this document.'),
      bookingNotes
        ? R(
            View,
            { style: styles.noteBox },
            R(Text, { style: styles.noteItalic }, `Booking notes: ${bookingNotes}`),
          )
        : null,
    ),
    /* —— Page 8 —— */
    R(
      Page,
      pageProps,
      R(FixedHeader, null),
      R(FixedFooter, { documentId, generatedAt }),
      houseRulesText
        ? R(
            View,
            null,
            R(SectionHeading, { num: 20, title: 'House rules' }),
            R(
              View,
              null,
              ...houseRulesText.split(/\r?\n/).flatMap((rawLine, idx) => {
                const t = rawLine.trim()
                if (!t) return []
                return [R(Text, { key: `hr-${idx}`, style: styles.p }, t)]
              }),
            ),
          )
        : null,
      R(SectionHeading, { num: houseRulesText ? 21 : 20, title: 'Signatures' }),
      R(
        Text,
        { style: styles.p },
        'The parties execute this agreement on the dates shown below. Electronic execution is intended to be valid under applicable law.',
      ),
      R(
        View,
        { style: styles.sigTable },
        R(
          View,
          { style: styles.sigHeaderRow },
          R(View, { style: styles.sigHeaderCell }, R(Text, { style: styles.thText }, 'Landlord / Provider')),
          R(View, { style: styles.sigHeaderCellLast }, R(Text, { style: styles.thText }, 'Tenant')),
        ),
        R(
          View,
          { style: styles.sigBodyRow },
          R(
            View,
            { style: styles.sigCol },
            R(Text, { style: styles.sigNameBold }, `Full name: ${landlordDisplay}`),
            R(
              View,
              { style: styles.sigLabelRow },
              R(Text, { style: styles.sigLabel }, 'Landlord Signature '),
              R(Text, { style: styles.docusealTag }, '{{Landlord Signature;role=First Party;type=signature}}'),
            ),
            R(View, { style: styles.sigSpace }),
            R(
              View,
              { style: styles.sigLabelRow },
              R(Text, { style: styles.sigLabel }, 'Landlord Sign Date '),
              R(Text, { style: styles.docusealTag }, '{{Landlord Sign Date;role=First Party;type=date}}'),
            ),
            R(View, { style: styles.sigSpace }),
          ),
          R(
            View,
            { style: styles.sigColLast },
            R(Text, { style: styles.sigNameBold }, `Full name: ${tenant.fullName}`),
            R(
              View,
              { style: styles.sigLabelRow },
              R(Text, { style: styles.sigLabel }, 'Tenant Signature '),
              R(Text, { style: styles.docusealTag }, '{{Tenant Signature;role=Second Party;type=signature}}'),
            ),
            R(View, { style: styles.sigSpace }),
            R(
              View,
              { style: styles.sigLabelRow },
              R(Text, { style: styles.sigLabel }, 'Tenant Sign Date '),
              R(Text, { style: styles.docusealTag }, '{{Tenant Sign Date;role=Second Party;type=date}}'),
            ),
            R(View, { style: styles.sigSpace }),
          ),
        ),
      ),
    ),
  )
}
