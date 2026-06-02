/**
 * VIC Form 1 — Residential rental agreement (≤5 years).
 *
 * Part A scope: T2 residential only (off-site room, entire property, shared room).
 * T1 on-site boarder/lodger uses `occupancyGenerator.tsx` (licence to occupy).
 *
 * Prescribed clause text: `form1Content.ts` (Schedule 1, Residential Tenancies Regulations 2021 (Vic)).
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { QldGeneralTenancyAgreementProps } from '../../../../api/documents/rtaTypes.js'
import { FORM1_FORM_REFERENCE, FORM1_INTRO, FORM1_PART_B_THROUGH_E } from './form1Content.js'
import {
  chunkText,
  VicForm1ClauseChunkBody,
  type VicForm1ClauseStyles,
} from './vicForm1ClauseRender.js'

/** Reuses the QLD/NSW residential schedule prop bag — no VIC-specific types. */
export type VicResidentialRentalAgreementForm1Props = QldGeneralTenancyAgreementProps

const QUNI_RENT_PORTAL_URL = 'https://quni.com.au'

function rentDueWeekdayFromCommencement(isoDate: string): string {
  const raw = isoDate.slice(0, 10)
  const [y, m, d] = raw.split('-').map(Number)
  if (!y || !m || !d) return 'Monday'
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toLocaleDateString('en-AU', { weekday: 'long', timeZone: 'UTC' })
}

function formatBsbDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return raw.trim()
}

/** Item 8 — rental provider preferred payment methods (fee-free EFT required). */
export function item8RentPaymentDetails(
  preference: 'bank_transfer' | 'quni_platform' | null,
  bank: QldGeneralTenancyAgreementProps['rentPaymentBankDetails'],
): string {
  const acct = bank?.accountNumber?.trim()
  const bsb = bank?.bsb?.trim() ? formatBsbDisplay(bank.bsb) : ''
  const name = bank?.accountName?.trim() ?? ''
  const bankLine =
    acct && bsb && name
      ? `Direct deposit — Account name: ${name}; BSB: ${bsb}; Account number: ${acct}.`
      : 'Direct deposit (bank deposit) — account details to be provided by the rental provider.'

  if (preference === 'quni_platform') {
    return `${bankLine} Recurring rent may also be paid via the Quni Living platform (${QUNI_RENT_PORTAL_URL}) using the payment facility activated in the renter's Quni account.`
  }
  return bankLine
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 44,
    paddingHorizontal: 42,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
    lineHeight: 1.55,
    backgroundColor: '#ffffff',
  },
  quniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 0.75,
    borderBottomColor: '#c9d2e0',
  },
  logo: { width: 72, height: 22, objectFit: 'contain', marginRight: 14 },
  headerTitleCol: { flex: 1, alignItems: 'flex-end' },
  headerTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0f2744',
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#3d4f63',
    textAlign: 'right',
    marginTop: 2,
  },
  docMetaLine: {
    fontSize: 8,
    color: '#4a5568',
    marginTop: 6,
    textAlign: 'right',
  },
  formRefLine: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f2744',
    marginTop: 4,
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f2744',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 10,
    marginBottom: 6,
  },
  subHeading: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f2744',
    marginTop: 8,
    marginBottom: 4,
  },
  body: { fontSize: 10, lineHeight: 1.55, textAlign: 'justify' },
  labelBold: { fontFamily: 'Helvetica-Bold', color: '#111827' },
  value: { fontFamily: 'Helvetica', color: '#1a1a1a' },
  fieldRow: { marginBottom: 5, flexDirection: 'row', flexWrap: 'wrap' },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 },
  checkboxBox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: '#374151',
    marginRight: 6,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1,
  },
  footerRow: {
    position: 'absolute',
    bottom: 18,
    left: 42,
    right: 42,
    fontSize: 7.5,
    color: '#6b7280',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    paddingTop: 4,
  },
  sigBox: {
    borderWidth: 1,
    borderColor: '#9ca3af',
    minHeight: 36,
    marginTop: 4,
    marginBottom: 8,
    padding: 6,
  },
  sigHint: { fontSize: 7, color: '#6b7280' },
})

const clausePdfStyles: VicForm1ClauseStyles = {
  bodyTight: { fontSize: 10, lineHeight: 1.45, marginBottom: 4, textAlign: 'justify' },
  clauseSectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f2744',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  clauseNote: {
    fontSize: 9,
    fontFamily: 'Helvetica-Oblique',
    color: '#374151',
    marginBottom: 4,
    marginLeft: 6,
    textAlign: 'justify',
  },
  todoLine: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#b45309',
    backgroundColor: '#fffbeb',
    padding: 6,
    marginBottom: 6,
    borderWidth: 0.75,
    borderColor: '#fcd34d',
  },
}

function resolveQuniLogoPath(): string | null {
  const pdf = join(process.cwd(), 'public', 'quni-logo-pdf.png')
  if (existsSync(pdf)) return pdf
  const fallback = join(process.cwd(), 'public', 'quni-logo.png')
  return existsSync(fallback) ? fallback : null
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

function agreementMadeOnFromGeneratedAt(generatedAt: string): string {
  const idx = generatedAt.indexOf(',')
  if (idx > 0) return generatedAt.slice(0, idx).trim()
  return generatedAt.trim()
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.fieldRow} wrap={false}>
      <Text style={styles.body}>
        <Text style={styles.labelBold}>{label} </Text>
        <Text style={styles.value}>{children}</Text>
      </Text>
    </View>
  )
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={styles.checkboxBox}>
      {checked ? <Text style={styles.checkboxMark}>X</Text> : null}
    </View>
  )
}

function CheckboxLine({ checked, label }: { checked: boolean; label: string }) {
  return (
    <View style={styles.checkboxRow} wrap={false}>
      <Checkbox checked={checked} />
      <Text style={styles.body}>{label}</Text>
    </View>
  )
}

function QuniTopHeader({
  documentId,
  generatedAt,
  logoPath,
}: {
  documentId: string
  generatedAt: string
  logoPath: string | null
}) {
  return (
    <View style={styles.quniHeader} fixed>
      {logoPath ? <Image style={styles.logo} src={logoPath} /> : <View style={{ width: 72, marginRight: 14 }} />}
      <View style={styles.headerTitleCol}>
        <Text style={styles.headerTitle}>Residential Rental Agreement</Text>
        <Text style={styles.headerSubtitle}>Victoria — Form 1 (T2 residential)</Text>
        <Text style={styles.docMetaLine}>
          Doc {documentId} · Generated {generatedAt}
        </Text>
      </View>
    </View>
  )
}

function PageFooter({ documentId, pageNumber }: { documentId: string; pageNumber: number }) {
  return (
    <View style={styles.footerRow} fixed>
      <Text>
        Quni Living · VIC Form 1 · {documentId} · Page {pageNumber}
      </Text>
    </View>
  )
}

function SignaturesBlock(props: QldGeneralTenancyAgreementProps) {
  const { landlord, tenant } = props
  const tenant2 = props.additionalTenantNames[0]?.trim() ?? ''
  return (
    <View>
      <Text style={styles.sectionHeading}>22. Signatures</Text>
      <Text style={styles.body}>
        This agreement is made under the Residential Tenancies Act 1997 (Vic). Before signing you must read Part D —
        Rights and obligations in this form. Signatures are collected electronically where permitted.
      </Text>
      <Text style={{ ...styles.subHeading, marginTop: 8 }}>Rental provider</Text>
      <Field label="Name:" children={landlord.fullName} />
      <View style={styles.sigBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sigHint}>Signature </Text>
          <Text style={styles.sigHint}>{'{{Rental Provider Signature;role=First Party;type=signature}}'}</Text>
        </View>
      </View>
      <View style={{ ...styles.sigBox, minHeight: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sigHint}>Dated </Text>
          <Text style={styles.sigHint}>{'{{Rental Provider Sign Date;role=First Party;type=date}}'}</Text>
        </View>
      </View>

      <Text style={{ ...styles.subHeading, marginTop: 8 }}>Renter</Text>
      <Field label="Name:" children={tenant.fullName} />
      <View style={styles.sigBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sigHint}>Signature </Text>
          <Text style={styles.sigHint}>{'{{Renter Signature;role=Second Party;type=signature}}'}</Text>
        </View>
      </View>
      <View style={{ ...styles.sigBox, minHeight: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sigHint}>Dated </Text>
          <Text style={styles.sigHint}>{'{{Renter Sign Date;role=Second Party;type=date}}'}</Text>
        </View>
      </View>

      {tenant2 ? (
        <>
          <Text style={{ ...styles.subHeading, marginTop: 8 }}>Renter (2)</Text>
          <Field label="Name:" children={tenant2} />
          <View style={styles.sigBox}>
            <Text style={styles.sigHint}>{'{{Renter 2 Signature;role=Co-tenant;type=signature}}'}</Text>
          </View>
          <View style={{ ...styles.sigBox, minHeight: 28 }}>
            <Text style={styles.sigHint}>{'{{Renter 2 Sign Date;role=Co-tenant;type=date}}'}</Text>
          </View>
        </>
      ) : null}
    </View>
  )
}

export function VicResidentialRentalAgreementForm1(props: QldGeneralTenancyAgreementProps) {
  const logoPath = resolveQuniLogoPath()
  const {
    documentId,
    generatedAt,
    landlord,
    tenant,
    premises,
    term,
    rent,
    bond,
    landlordAgent,
    urgentRepairsTradespeople,
    electronicService,
    rentPaymentBankDetails,
    rentPaymentPreference,
    specialConditions,
    bookingNotes,
  } = props

  const madeOn = agreementMadeOnFromGeneratedAt(generatedAt)
  const rentWeekday = rentDueWeekdayFromCommencement(term.startDate)
  const weeklyRentDisplay = formatMoney(rent.weeklyRent)
  const bondDisplay = bond.amount != null && Number.isFinite(bond.amount) ? formatMoney(bond.amount) : null
  const endDateText = term.periodic || !term.endDate ? null : formatAuDate(term.endDate)
  const paymentDetails = item8RentPaymentDetails(rentPaymentPreference, rentPaymentBankDetails)
  const freq = rent.rentFrequency

  const clauseChunks = chunkText(FORM1_PART_B_THROUGH_E, 2600)

  let pageNum = 0
  const nextPage = () => {
    pageNum += 1
    return pageNum
  }

  const pages: ReactNode[] = []

  pages.push(
    <Page key="p1" size="A4" style={styles.page}>
      <QuniTopHeader documentId={documentId} generatedAt={generatedAt} logoPath={logoPath} />
      <Text style={styles.formRefLine}>{FORM1_FORM_REFERENCE}</Text>
      {FORM1_INTRO.split('\n').slice(0, 12).map((line, i) => (
        <Text key={`intro-${i}`} style={[styles.body, { marginBottom: i < 11 ? 3 : 8 }]}>
          {line.trim() || ' '}
        </Text>
      ))}
      <Text style={styles.sectionHeading}>Part A – Basic terms</Text>

      <Field label="1. Date of agreement:" children={madeOn} />
      <Text style={[styles.body, { marginBottom: 6 }]}>
        If the agreement is signed by the parties on different days, the date of the agreement is the date the last
        person signs the agreement.
      </Text>

      <Field label="2. Address of premises:" children={premises.addressLine} />

      <Text style={styles.subHeading}>3. Rental provider&apos;s details</Text>
      <Field label="Full name or company name:" children={landlord.fullName} />
      <Field label="Address:" children={landlord.addressLine} />
      <Field label="Phone number:" children={landlord.phone} />
      <Field label="Email address:" children={landlord.email} />

      <Text style={styles.subHeading}>Rental provider&apos;s agent&apos;s details</Text>
      {landlordAgent ? (
        <>
          <Field label="Full name:" children={landlordAgent.name} />
          <Field label="Address:" children={landlordAgent.businessAddress} />
          <Field label="Phone number:" children={landlordAgent.phone} />
          {landlordAgent.email ? <Field label="Email address:" children={landlordAgent.email} /> : null}
        </>
      ) : (
        <Field label="Agent:" children="Not applicable" />
      )}

      <Text style={styles.subHeading}>4. Renter&apos;s details</Text>
      <Field label="Full name of renter:" children={tenant.fullName} />
      <Field
        label="Current address:"
        children={tenant.addressForServiceLine?.trim() || '—'}
      />
      <Field label="Phone number:" children={tenant.phone} />
      <Field label="Email address:" children={tenant.email} />
      {props.additionalTenantNames[0]?.trim() ? (
        <Field label="Full name of renter (2):" children={props.additionalTenantNames[0].trim()} />
      ) : null}

      <Text style={styles.subHeading}>5. Length of the agreement</Text>
      <CheckboxLine checked={!term.periodic} label="Fixed term agreement" />
      <Field label="Start date:" children={formatAuDate(term.startDate)} />
      {endDateText ? <Field label="End date:" children={endDateText} /> : null}
      <CheckboxLine checked={term.periodic} label="Periodic agreement (monthly)" />
      {term.periodic ? <Field label="Start date:" children={formatAuDate(term.startDate)} /> : null}

      <PageFooter documentId={documentId} pageNumber={nextPage()} />
    </Page>,
  )

  pages.push(
    <Page key="p2" size="A4" style={styles.page}>
      <QuniTopHeader documentId={documentId} generatedAt={generatedAt} logoPath={logoPath} />
      <Text style={styles.subHeading}>6. Rent</Text>
      <Field label="Rent amount ($):" children={weeklyRentDisplay} />
      <Text style={{ ...styles.body, marginTop: 4, marginBottom: 2 }}>To be paid per (tick one box only):</Text>
      <CheckboxLine checked={freq === 'weekly'} label="week" />
      <CheckboxLine checked={freq === 'fortnightly'} label="fortnight" />
      <CheckboxLine checked={freq === 'monthly'} label="calendar month" />
      <Field label="Day rent is to be paid:" children={rentWeekday} />
      <Field label="Date first rent payment due:" children={formatAuDate(term.startDate)} />

      {bondDisplay ? (
        <>
          <Text style={styles.subHeading}>7. Bond</Text>
          <Field label="Bond amount ($):" children={bondDisplay} />
          <Field label="Date bond payment due:" children={formatAuDate(term.startDate)} />
        </>
      ) : null}

      <Text style={styles.subHeading}>Part B — Standard terms (schedule highlights)</Text>
      <Text style={{ ...styles.body, marginBottom: 4 }}>8. Rental provider&apos;s preferred methods of payment</Text>
      <CheckboxLine checked label="bank deposit" />
      <CheckboxLine checked={rentPaymentPreference === 'quni_platform'} label="other electronic form of payment, including Centrepay" />
      <Field label="Payment details:" children={paymentDetails} />

      <Text style={{ ...styles.body, marginTop: 6, fontFamily: 'Helvetica-Bold' }}>9. Electronic service of notices</Text>
      <CheckboxLine checked={electronicService.landlordConsentsToEmailService} label={`Rental provider — yes (${electronicService.landlordEmail})`} />
      <CheckboxLine checked={!electronicService.landlordConsentsToEmailService} label="Rental provider — no" />
      <CheckboxLine checked={electronicService.tenantConsentsToEmailService} label={`Renter — yes (${electronicService.tenantEmail})`} />
      <CheckboxLine checked={!electronicService.tenantConsentsToEmailService} label="Renter — no" />

      <Text style={{ ...styles.body, marginTop: 6, fontFamily: 'Helvetica-Bold' }}>10. Urgent repairs contact</Text>
      <Field label="Emergency contact name:" children={urgentRepairsTradespeople.electrician?.split('—')[0]?.trim() ?? landlord.fullName} />
      <Field label="Emergency contact phone:" children={landlord.phone} />
      <Field label="Emergency contact email:" children={landlord.email} />

      <CheckboxLine checked={false} label="12. Owners corporation rules apply — yes" />
      <CheckboxLine checked label="12. Owners corporation rules apply — no" />

      <CheckboxLine checked={false} label="13. Condition report has been provided" />
      <CheckboxLine checked label="13. Condition report will be provided on or before the agreement start date" />

      <PageFooter documentId={documentId} pageNumber={nextPage()} />
    </Page>,
  )

  clauseChunks.forEach((chunk, i) => {
    pages.push(
      <Page key={`clause-${i}`} size="A4" style={styles.page}>
        <QuniTopHeader documentId={documentId} generatedAt={generatedAt} logoPath={logoPath} />
        {i === 0 ? <Text style={styles.sectionHeading}>Prescribed standard terms</Text> : null}
        <VicForm1ClauseChunkBody text={chunk} styles={clausePdfStyles} />
        <PageFooter documentId={documentId} pageNumber={nextPage()} />
      </Page>,
    )
  })

  if (specialConditions.length > 0 || (bookingNotes && bookingNotes.trim())) {
    pages.push(
      <Page key="additional" size="A4" style={styles.page}>
        <QuniTopHeader documentId={documentId} generatedAt={generatedAt} logoPath={logoPath} />
        <Text style={styles.sectionHeading}>21. Further details (if any)</Text>
        {specialConditions.map((c: string, i: number) => (
          <Text key={i} style={[styles.body, { marginBottom: 4 }]}>
            {c}
          </Text>
        ))}
        {bookingNotes?.trim() ? (
          <Text style={[styles.body, { marginTop: 4 }]}>{bookingNotes.trim()}</Text>
        ) : null}
        <PageFooter documentId={documentId} pageNumber={nextPage()} />
      </Page>,
    )
  }

  pages.push(
    <Page key="sig" size="A4" style={styles.page}>
      <QuniTopHeader documentId={documentId} generatedAt={generatedAt} logoPath={logoPath} />
      <SignaturesBlock {...props} />
      <PageFooter documentId={documentId} pageNumber={nextPage()} />
    </Page>,
  )

  return <Document>{pages}</Document>
}

/** @deprecated Use VicResidentialRentalAgreementForm1 */
export default function VicForm1Generator(props: QldGeneralTenancyAgreementProps) {
  return VicResidentialRentalAgreementForm1(props)
}
