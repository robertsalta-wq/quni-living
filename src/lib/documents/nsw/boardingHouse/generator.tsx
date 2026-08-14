/**
 * NSW Fair Trading Standard Occupancy Agreement (boarding houses).
 * Locked clause text: lockedText.ts. No Quni branding, party, or payee.
 */
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import {
  LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE,
  LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE,
  LICENCE_OCCUPY_DOCUSEAL_TAG_HIDDEN,
  licenceOccupyDocusealTag,
} from '../../licenceOccupy/docusealTags.js'
import type { NswT3AdditionalCharge, NswT3SharedAreas } from '../../../tenancy/nswT3ListingFields.js'
import {
  BH_ACCESS_ROWS,
  BH_ANNEXURE_1_INTRO,
  BH_ANNEXURE_1_TITLE,
  BH_ANNEXURE_2_INTRO,
  BH_ANNEXURE_2_TITLE,
  BH_CLAUSE_1_BODY,
  BH_CLAUSE_1_HEADING,
  BH_CLAUSE_2_BODY,
  BH_CLAUSE_2_HEADING,
  BH_CLAUSE_3_BODY,
  BH_CLAUSE_3_HEADING,
  BH_CLAUSE_4_BODY,
  BH_CLAUSE_4_HEADING,
  BH_CLAUSE_5_FOOTNOTE,
  BH_CLAUSE_5_HEADING,
  BH_CLAUSE_5_INTRO_1,
  BH_CLAUSE_5_INTRO_2,
  BH_CLAUSE_6_BODY,
  BH_CLAUSE_6_HEADING,
  BH_CLAUSE_7_BODY_1,
  BH_CLAUSE_7_BODY_2,
  BH_CLAUSE_7_HEADING,
  BH_CLAUSE_8_BODY_PREFIX,
  BH_CLAUSE_8_BODY_SUFFIX,
  BH_CLAUSE_8_BULLETS,
  BH_CLAUSE_8_HEADING,
  BH_CLAUSE_9_BODY,
  BH_CLAUSE_9_HEADING,
  BH_CLAUSE_10_BODY,
  BH_CLAUSE_10_HEADING,
  BH_CLAUSE_11_HEADING,
  BH_CLAUSE_11_INTRO_1,
  BH_CLAUSE_11_INTRO_2,
  BH_CLAUSE_11_PROP_FOOTNOTE,
  BH_CLAUSE_12_BODY,
  BH_CLAUSE_12_HEADING,
  BH_BETWEEN_PROPRIETOR,
  BH_CROWN,
  BH_EMERGENCY_CONTACT_NAME,
  BH_FOR_ROOM,
  BH_HOUSE_RULES_INTRO,
  BH_HOUSE_RULES_TITLE,
  BH_NOTE,
  BH_PRINCIPLES,
  BH_PROP_TERM_ROWS,
  BH_RES_TERM_ROWS,
  BH_SUBTITLE,
  BH_TITLE,
} from './lockedText.js'
import type { NswBoardingHouseAgreementProps } from './types.js'

export type { NswBoardingHouseAgreementProps } from './types.js'
export { NSW_BOARDING_HOUSE_FORBIDDEN_MARKERS } from './types.js'
export { NSW_BOARDING_HOUSE_PDF_MARKERS } from './lockedText.js'

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 42,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: '#111111',
    lineHeight: 1.45,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  heading: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginTop: 8,
    marginBottom: 3,
  },
  body: {
    fontSize: 9.5,
    marginBottom: 4,
    textAlign: 'justify',
  },
  note: {
    fontSize: 9,
    fontFamily: 'Helvetica-Oblique',
    marginTop: 8,
    marginBottom: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  label: {
    fontFamily: 'Helvetica-Bold',
    width: 132,
    fontSize: 9,
  },
  value: {
    flex: 1,
    fontSize: 9.5,
  },
  tickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 4,
  },
  tickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 3,
  },
  box: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: '#111111',
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxMark: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    borderWidth: 0.75,
    borderColor: '#111111',
    backgroundColor: '#f3f3f3',
  },
  tableRow: {
    flexDirection: 'row',
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: '#111111',
  },
  th: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    padding: 4,
  },
  td: {
    fontSize: 8,
    padding: 4,
  },
  colReason: { width: '46%' },
  colSuggested: { width: '27%' },
  colOverride: { width: '27%' },
  bullet: {
    fontSize: 9.5,
    marginLeft: 12,
    marginBottom: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 42,
    right: 42,
    fontSize: 7.5,
    color: '#444444',
    borderTopWidth: 0.5,
    borderTopColor: '#cccccc',
    paddingTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sigRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  sigCol: {
    flex: 1,
  },
  sigBox: {
    borderWidth: 1,
    borderColor: '#9ca3af',
    minHeight: 40,
    marginTop: 4,
    padding: 4,
  },
  hiddenTag: {
    fontSize: LICENCE_OCCUPY_DOCUSEAL_TAG_HIDDEN.fontSize,
    color: LICENCE_OCCUPY_DOCUSEAL_TAG_HIDDEN.color,
  },
})

function formatMoney(n: number): string {
  return `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatIsoDateAu(iso: string): string {
  const raw = iso.slice(0, 10)
  const [y, m, d] = raw.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function formatBsb(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return raw.trim()
}

function Tick({ checked, label }: { checked: boolean; label: string }) {
  return (
    <View style={styles.tickItem}>
      <View style={styles.box}>{checked ? <Text style={styles.boxMark}>X</Text> : null}</View>
      <Text>{label}</Text>
    </View>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || ' '}</Text>
    </View>
  )
}

function NoticeTable({
  rows,
  reasonHeader,
  overrides,
}: {
  rows: Array<{ reason: string; suggested: string }>
  reasonHeader: string
  overrides?: Array<string | null>
}) {
  return (
    <View wrap={false} style={{ marginBottom: 6, marginTop: 4 }}>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.colReason]}>{reasonHeader}</Text>
        <Text style={[styles.th, styles.colSuggested]}>Suggested notice period (applies if next column left blank)</Text>
        <Text style={[styles.th, styles.colOverride]}>Notice under this agreement (if different)</Text>
      </View>
      {rows.map((row, i) => (
        <View key={row.reason} style={styles.tableRow}>
          <Text style={[styles.td, styles.colReason]}>{row.reason}</Text>
          <Text style={[styles.td, styles.colSuggested]}>{row.suggested}</Text>
          <Text style={[styles.td, styles.colOverride]}>{overrides?.[i]?.trim() || ' '}</Text>
        </View>
      ))}
    </View>
  )
}

function Footer({ documentId }: { documentId: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{BH_CROWN}</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `${documentId}  ·  Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  )
}

function proprietorDisplayName(props: NswBoardingHouseAgreementProps): string {
  const company = props.proprietor.companyName?.trim()
  if (company) return company
  return props.proprietor.fullName.trim() || ' '
}

function occupancyFeePaymentLines(props: NswBoardingHouseAgreementProps): string {
  const payout = props.payout
  if (!payout) return 'Direct credit to the proprietor.'
  const parts = [
    `Direct credit to the proprietor. Account name: ${payout.account_name.trim()}`,
    `BSB: ${formatBsb(payout.bsb)}`,
    `Account number: ${payout.account_number.trim()}`,
  ]
  if (props.paymentReference.trim()) parts.push(`Reference: ${props.paymentReference.trim()}`)
  return parts.join('. ') + '.'
}

function SharedAreaTicks({ areas }: { areas: NswT3SharedAreas }) {
  return (
    <View>
      <Text style={[styles.body, { marginBottom: 2 }]}>Other areas of the premises available for the resident’s use:</Text>
      <View style={styles.tickRow}>
        <Tick checked={areas.kitchen} label="Kitchen/s" />
        <Tick checked={areas.bathroom} label="Bathroom/s" />
        <Tick checked={areas.commonRoom} label="Common room" />
        <Tick checked={areas.laundry} label="Laundry" />
        <Tick checked={areas.other.trim().length > 0} label={`Other: ${areas.other.trim() || '________________'}`} />
      </View>
    </View>
  )
}

function SignatureBlock() {
  const proprietorSig = licenceOccupyDocusealTag(
    'Proprietor Signature',
    'First Party',
    'signature',
    LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE,
  )
  const proprietorDate = licenceOccupyDocusealTag(
    'Proprietor Sign Date',
    'First Party',
    'date',
    LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE,
  )
  const residentSig = licenceOccupyDocusealTag(
    'Resident Signature',
    'Second Party',
    'signature',
    LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE,
  )
  const residentDate = licenceOccupyDocusealTag(
    'Resident Sign Date',
    'Second Party',
    'date',
    LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE,
  )
  return (
    <View style={styles.sigRow} wrap={false}>
      <View style={[styles.sigCol, { marginRight: 12 }]}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>Signed (Proprietor)</Text>
        <View style={styles.sigBox}>
          <Text style={styles.hiddenTag}>{proprietorSig}</Text>
        </View>
        <Text style={{ fontSize: 8, marginTop: 6 }}>Date</Text>
        <View style={[styles.sigBox, { minHeight: 22 }]}>
          <Text style={styles.hiddenTag}>{proprietorDate}</Text>
        </View>
      </View>
      <View style={[styles.sigCol, { marginRight: 12 }]}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>Signed (Resident)</Text>
        <View style={styles.sigBox}>
          <Text style={styles.hiddenTag}>{residentSig}</Text>
        </View>
        <Text style={{ fontSize: 8, marginTop: 6 }}>Date</Text>
        <View style={[styles.sigBox, { minHeight: 22 }]}>
          <Text style={styles.hiddenTag}>{residentDate}</Text>
        </View>
      </View>
    </View>
  )
}

function Annexure2Signatures() {
  const proprietorSig = licenceOccupyDocusealTag(
    'Annexure 2 Proprietor Signature',
    'First Party',
    'signature',
    LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE,
  )
  const proprietorDate = licenceOccupyDocusealTag(
    'Annexure 2 Proprietor Sign Date',
    'First Party',
    'date',
    LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE,
  )
  const residentSig = licenceOccupyDocusealTag(
    'Annexure 2 Resident Signature',
    'Second Party',
    'signature',
    LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE,
  )
  const residentDate = licenceOccupyDocusealTag(
    'Annexure 2 Resident Sign Date',
    'Second Party',
    'date',
    LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE,
  )
  return (
    <View style={styles.sigRow} wrap={false}>
      <View style={[styles.sigCol, { marginRight: 12 }]}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>Signed (Proprietor)</Text>
        <View style={styles.sigBox}>
          <Text style={styles.hiddenTag}>{proprietorSig}</Text>
        </View>
        <Text style={{ fontSize: 8, marginTop: 6 }}>Date</Text>
        <View style={[styles.sigBox, { minHeight: 22 }]}>
          <Text style={styles.hiddenTag}>{proprietorDate}</Text>
        </View>
      </View>
      <View style={[styles.sigCol, { marginRight: 12 }]}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>Signed (Resident)</Text>
        <View style={styles.sigBox}>
          <Text style={styles.hiddenTag}>{residentSig}</Text>
        </View>
        <Text style={{ fontSize: 8, marginTop: 6 }}>Date</Text>
        <View style={[styles.sigBox, { minHeight: 22 }]}>
          <Text style={styles.hiddenTag}>{residentDate}</Text>
        </View>
      </View>
    </View>
  )
}

function ChargeTable({ rows }: { rows: NswT3AdditionalCharge[] }) {
  return (
    <View style={{ marginTop: 6, marginBottom: 8 }}>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { width: '28%' }]}>Item</Text>
        <Text style={[styles.th, { width: '18%' }]}>Amount</Text>
        <Text style={[styles.th, { width: '22%' }]}>When due to be paid</Text>
        <Text style={[styles.th, { width: '32%' }]}>How calculated</Text>
      </View>
      {rows.map((row, i) => (
        <View key={`${row.item}-${i}`} style={styles.tableRow}>
          <Text style={[styles.td, { width: '28%' }]}>{row.item}</Text>
          <Text style={[styles.td, { width: '18%' }]}>{row.amount}</Text>
          <Text style={[styles.td, { width: '22%' }]}>{row.whenDue}</Text>
          <Text style={[styles.td, { width: '32%' }]}>{row.howCalculated}</Text>
        </View>
      ))}
    </View>
  )
}

export function NswBoardingHouseOccupancyAgreement(props: NswBoardingHouseAgreementProps) {
  const deposit =
    props.securityDepositAud != null && Number.isFinite(props.securityDepositAud)
      ? formatMoney(props.securityDepositAud)
      : formatMoney(0)
  const furnished = props.premises.furnished === true
  const unfurnished = props.premises.furnished === false
  const includeAnnexure2 = props.additionalCharges.length >= 1
  const termLabel = props.term.periodic
    ? 'Periodic'
    : props.term.endDate
      ? `${props.term.leaseLengthDescription} (ends ${formatIsoDateAu(props.term.endDate)})`
      : props.term.leaseLengthDescription
  const proprietorContact = [
    proprietorDisplayName(props),
    props.proprietor.addressLine,
    props.proprietor.phone,
    props.proprietor.email,
    props.proprietor.abn ? `ABN ${props.proprietor.abn}` : '',
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Footer documentId={props.documentId} />
        <Text style={styles.title}>{BH_TITLE}</Text>
        <Text style={styles.subtitle}>{BH_SUBTITLE}</Text>

        <Field label={BH_BETWEEN_PROPRIETOR} value={proprietorDisplayName(props)} />
        <Field label="Resident" value={props.resident.fullName} />
        <Field label={BH_FOR_ROOM} value={props.premises.roomDescription} />
        <Field label="Address" value={props.premises.addressLine} />

        <Text style={[styles.body, { marginTop: 4 }]}>The resident’s room is:</Text>
        <View style={styles.tickRow}>
          <Tick checked={unfurnished} label="unfurnished" />
          <Tick checked={furnished} label="furnished   (if furnished, an inventory can be attached)" />
        </View>
        <SharedAreaTicks areas={props.premises.sharedAreas} />

        <Text style={styles.heading}>Term of Contract</Text>
        <Field label="Commencement Date" value={formatIsoDateAu(props.term.startDate)} />
        <Field label="Term of agreement (if any)" value={termLabel} />

        <Text style={styles.heading}>Occupancy Fee</Text>
        <Field label="To be paid" value={occupancyFeePaymentLines(props)} />
        <Field label="$ per" value={`${formatMoney(props.occupancyFeeWeeklyAud)} per`} />
        <View style={styles.tickRow}>
          <Text>Occupancy fee period:</Text>
          <Tick checked label="week" />
          <Tick checked={false} label="month" />
          <Tick checked={false} label="year" />
        </View>

        <Text style={styles.heading}>Proprietor’s Contact Details:</Text>
        <Text style={styles.body}>{proprietorContact || ' '}</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Footer documentId={props.documentId} />
        <Text style={styles.heading}>AGREEMENT TERMS</Text>
        <Text style={styles.heading}>{BH_CLAUSE_1_HEADING}</Text>
        <Text style={styles.body}>{BH_CLAUSE_1_BODY}</Text>
        <Text style={styles.heading}>{BH_CLAUSE_2_HEADING}</Text>
        <Text style={styles.body}>{BH_CLAUSE_2_BODY}</Text>
        <Text style={styles.heading}>{BH_CLAUSE_3_HEADING}</Text>
        <Text style={styles.body}>{BH_CLAUSE_3_BODY}</Text>
        <Text style={styles.heading}>{BH_CLAUSE_4_HEADING}</Text>
        <Text style={styles.body}>{BH_CLAUSE_4_BODY}</Text>
        <Text style={styles.heading}>{BH_CLAUSE_5_HEADING}</Text>
        <Text style={styles.body}>{BH_CLAUSE_5_INTRO_1}</Text>
        <Text style={styles.body}>{BH_CLAUSE_5_INTRO_2}</Text>
        <NoticeTable
          rows={BH_ACCESS_ROWS}
          reasonHeader="Reason for Access"
          overrides={props.noticeOverrides?.access}
        />
        <Text style={styles.note}>{BH_CLAUSE_5_FOOTNOTE}</Text>
        <Text style={styles.heading}>{BH_CLAUSE_6_HEADING}</Text>
        <Text style={styles.body}>{BH_CLAUSE_6_BODY}</Text>
        <Text style={styles.heading}>{BH_CLAUSE_7_HEADING}</Text>
        <Text style={styles.body}>{BH_CLAUSE_7_BODY_1}</Text>
        <Text style={styles.body}>{BH_CLAUSE_7_BODY_2}</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Footer documentId={props.documentId} />
        <Text style={styles.heading}>{BH_CLAUSE_8_HEADING}</Text>
        <Text style={styles.body}>
          {BH_CLAUSE_8_BODY_PREFIX}
          {deposit}
          {BH_CLAUSE_8_BODY_SUFFIX}
        </Text>
        {BH_CLAUSE_8_BULLETS.map((b, i) => (
          <Text key={b} style={styles.bullet}>
            {`${String.fromCharCode(97 + i)}) ${b}`}
          </Text>
        ))}
        <Text style={styles.heading}>{BH_CLAUSE_9_HEADING}</Text>
        <Text style={styles.body}>{BH_CLAUSE_9_BODY}</Text>
        <Text style={styles.heading}>{BH_CLAUSE_10_HEADING}</Text>
        <Text style={styles.body}>{BH_CLAUSE_10_BODY}</Text>
        <Text style={styles.heading}>{BH_CLAUSE_11_HEADING}</Text>
        <Text style={styles.body}>{BH_CLAUSE_11_INTRO_1}</Text>
        <Text style={styles.body}>{BH_CLAUSE_11_INTRO_2}</Text>
        <NoticeTable
          rows={BH_PROP_TERM_ROWS}
          reasonHeader="Reason for Termination by Proprietor"
          overrides={props.noticeOverrides?.proprietorTermination}
        />
        <Text style={styles.note}>{BH_CLAUSE_11_PROP_FOOTNOTE}</Text>
        <NoticeTable
          rows={BH_RES_TERM_ROWS}
          reasonHeader="Reason for Termination by Resident"
          overrides={props.noticeOverrides?.residentTermination}
        />
        <Text style={styles.heading}>{BH_CLAUSE_12_HEADING}</Text>
        <Text style={styles.body}>{BH_CLAUSE_12_BODY}</Text>
        <Text style={styles.note}>{BH_NOTE}</Text>
        <SignatureBlock />
        <Text style={[styles.body, { marginTop: 10 }]}>{BH_CROWN}</Text>
        <Text style={[styles.heading, { marginTop: 14 }]}>Optional Information</Text>
        <Text style={styles.body}>The resident may provide contact details to be used in an emergency.</Text>
        <Field label="Personal phone no/s:" value={props.resident.phone || ' '} />
        <Field label={BH_EMERGENCY_CONTACT_NAME} value={props.resident.emergencyContactName?.trim() || ' '} />
        <Field label="Relationship:" value=" " />
        <Field
          label="Phone and/or address:"
          value={props.resident.emergencyContactPhone?.trim() || ' '}
        />
      </Page>

      <Page size="A4" style={styles.page}>
        <Footer documentId={props.documentId} />
        <Text style={styles.heading}>{BH_ANNEXURE_1_TITLE}</Text>
        <Text style={styles.body}>{BH_ANNEXURE_1_INTRO}</Text>
        {BH_PRINCIPLES.map((p) => (
          <Text key={p} style={styles.body}>
            {p}
          </Text>
        ))}
      </Page>

      {includeAnnexure2 ? (
        <Page size="A4" style={styles.page}>
          <Footer documentId={props.documentId} />
          <Text style={styles.heading}>{BH_ANNEXURE_2_TITLE}</Text>
          <Text style={styles.body}>{BH_ANNEXURE_2_INTRO}</Text>
          <ChargeTable rows={props.additionalCharges} />
          <Annexure2Signatures />
        </Page>
      ) : null}

      <Page size="A4" style={styles.page}>
        <Footer documentId={props.documentId} />
        <Text style={styles.heading}>{BH_HOUSE_RULES_TITLE}</Text>
        <Text style={styles.body}>{BH_HOUSE_RULES_INTRO}</Text>
        <Text style={[styles.body, { marginTop: 8, minHeight: 120 }]}>
          {props.houseRules?.trim() || ' '}
        </Text>
      </Page>
    </Document>
  )
}

export default NswBoardingHouseOccupancyAgreement
