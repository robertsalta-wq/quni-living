/**
 * Queensland Form 18a — General tenancy agreement (prescribed Part 2 verbatim).
 *
 * Part 2 standard terms: `qld/form18aStandardTerms.ts` (RTA Queensland PDF v23 Sep25).
 * Source PDF: https://www.rta.qld.gov.au/sites/default/files/2021-06/Form-18a-General-tenancy-agreement.pdf
 * Retrieved for embedding: 2026 (see docs/form18a-v23-sep25-extracted.txt).
 *
 * Quni branding applies to headers and schedule (Part 1) only — prescribed clauses are not edited.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { QldGeneralTenancyAgreementProps } from '../../../api/documents/rtaTypes.js'
import { FORM18A_PART2_STANDARD_TERMS } from './qld/form18aStandardTerms.js'
import {
  chunkText,
  Form18aClauseChunkBody,
  type Form18aClauseStyles,
} from './qld/qldForm18aClauseRender.js'

/** Weekly billing aligns with `api/create-rent-subscription.js`. */
function rentDueWeekdayFromCommencement(isoDate: string): string {
  const raw = isoDate.slice(0, 10)
  const [y, m, d] = raw.split('-').map(Number)
  if (!y || !m || !d) return 'Monday'
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toLocaleDateString('en-AU', { weekday: 'long', timeZone: 'UTC' })
}

const FORM_REFERENCE_LINE =
  'Form 18a — General tenancy agreement (RTA Queensland; PDF v23 Sep25). Prescribed standard terms in Part 2 are reproduced verbatim from the published form.'

const QUNI_RENT_PORTAL_URL = 'https://quni.com.au'

/**
 * Item 9 must name at least two ways to pay rent (Standard term 8(3); s.83 RTRA Act).
 * Wording is tied to `bookings.rent_payment_method` — no payment rail is described that the booking does not use.
 */
export function item9RentPaymentMethodPair(preference: 'bank_transfer' | 'quni_platform' | null): {
  method1: string
  method2: string
} {
  if (preference === 'quni_platform') {
    return {
      method1: `Scheduled rent payments via the Quni Living platform (${QUNI_RENT_PORTAL_URL}) using the card or other payment facility activated for this tenancy in the tenant's Quni account.`,
      method2: 'Direct credit (electronic funds transfer) to the account details below.',
    }
  }
  return {
    method1: 'Electronic funds transfer (internet or mobile banking) to the account details below.',
    method2:
      'Over-the-counter deposit at a branch of the nominated financial institution, or any other channel your bank provides to pay into this BSB and account number.',
  }
}

/** Verbatim — Form 18a Part 3 (final page of RTA PDF). */
const FORM18A_PART3_FORM17A_NOTICE = [
  'The tenant/s must receive a copy of the information statement (Form 17a) and a copy of any applicable by-laws if copies have not',
  'previously been given to the tenant/s. Do not send to the RTA—give this form to the tenant/s, keep a copy for your records.',
].join(' ')

const FORM18A_PART3_INTERPRETER_LINE =
  'Other languages: You can access a free interpreter service by calling the RTA on 1300 366 311 (Monday to Friday, 8:30am to 5:00pm).'

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
  bodyTight: { fontSize: 10, lineHeight: 1.45, marginBottom: 4, textAlign: 'justify' },
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
  },
  checkboxMark: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1,
  },
  clauseSectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f2744',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  divisionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f2744',
    marginTop: 8,
    marginBottom: 4,
  },
  clauseNote: {
    fontSize: 9,
    fontFamily: 'Helvetica-Oblique',
    color: '#374151',
    marginBottom: 4,
    marginLeft: 6,
    textAlign: 'justify',
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

const clausePdfStyles: Form18aClauseStyles = {
  bodyTight: styles.bodyTight,
  clauseSectionTitle: styles.clauseSectionTitle,
  clauseNote: styles.clauseNote,
  divisionTitle: styles.divisionTitle,
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

function suburbFromAddressLine(addressLine: string): string {
  const t = addressLine.trim()
  if (!t || t === '—') return t || '—'
  const parts = t.split(',').map((s) => s.trim()).filter(Boolean)
  const stateIdx = parts.findIndex((p) => /^(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)$/i.test(p))
  if (stateIdx > 0) return parts[stateIdx - 1] ?? parts[0] ?? t
  if (parts.length >= 2) return parts[parts.length - 2] ?? t
  return parts[0] ?? t
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.fieldRow} wrap={false}>
      <Text style={styles.body}>
        <Text style={styles.labelBold}>{label}</Text> <Text style={styles.value}>{children}</Text>
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
      <Text style={styles.body}>
        <Text style={styles.value}>{label}</Text>
      </Text>
    </View>
  )
}

function QldTopHeader({
  documentId,
  generatedAt,
  logoPath,
}: {
  documentId: string
  generatedAt: string
  logoPath: string | null
}) {
  return (
    <View style={styles.quniHeader}>
      {logoPath ? (
        <Image src={logoPath} style={styles.logo} />
      ) : (
        <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f2744', marginRight: 12 }}>Quni</Text>
      )}
      <View style={styles.headerTitleCol}>
        <Text style={styles.headerTitle}>General tenancy agreement</Text>
        <Text style={styles.headerSubtitle}>QLD · Residential Tenancies and Rooming Accommodation Act 2008</Text>
        <Text style={styles.docMetaLine}>
          Document ID: {documentId} · Generated {generatedAt}
        </Text>
      </View>
    </View>
  )
}

function PageFooter({ documentId, pageNumber }: { documentId: string; pageNumber: number }) {
  return (
    <View style={styles.footerRow}>
      <Text>
        {documentId} · Page {pageNumber}
      </Text>
    </View>
  )
}

function rentFrequencyNoun(freq: 'weekly' | 'fortnightly' | 'monthly'): string {
  if (freq === 'fortnightly') return 'fortnight'
  if (freq === 'monthly') return 'month'
  return 'week'
}

function Form18aSignaturesBlock(props: QldGeneralTenancyAgreementProps) {
  const electronicNote =
    'Note: The Electronic Transactions (Queensland) Act 2001 recognises electronic signatures where parties consent to electronic communication for this agreement.'

  const landlordName = props.landlord.fullName
  const tenant2 = props.additionalTenantNames[0]?.trim()
  const tenant3 = props.additionalTenantNames[1]?.trim()

  return (
    <View>
      <Text style={styles.sectionHeading}>Signatures</Text>
      <Text style={styles.body}>{electronicNote}</Text>

      <Text style={{ ...styles.subHeading, marginTop: 10 }}>Signature of lessor/agent</Text>
      <Text style={styles.body}>
        <Text style={styles.labelBold}>Name/trading name: </Text>
        {landlordName}
      </Text>
      <View style={styles.sigBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.body}>Signature: </Text>
          <Text style={styles.sigHint}>{'{{Landlord Signature;role=First Party;type=signature}}'}</Text>
        </View>
      </View>
      <View style={{ ...styles.sigBox, minHeight: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sigHint}>Date </Text>
          <Text style={styles.sigHint}>{'{{Landlord Sign Date;role=First Party;type=date}}'}</Text>
        </View>
      </View>

      <Text style={{ ...styles.subHeading, marginTop: 8 }}>Signature of tenant 1</Text>
      <Text style={styles.body}>
        <Text style={styles.labelBold}>Print name: </Text>
        {props.tenant.fullName}
      </Text>
      <View style={styles.sigBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.body}>Signature: </Text>
          <Text style={styles.sigHint}>{'{{Tenant Signature;role=Second Party;type=signature}}'}</Text>
        </View>
      </View>
      <View style={{ ...styles.sigBox, minHeight: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sigHint}>Date </Text>
          <Text style={styles.sigHint}>{'{{Tenant Sign Date;role=Second Party;type=date}}'}</Text>
        </View>
      </View>

      {tenant2 ? (
        <>
          <Text style={{ ...styles.subHeading, marginTop: 8 }}>Signature of tenant 2</Text>
          <Text style={styles.body}>
            <Text style={styles.labelBold}>Print name: </Text>
            {tenant2}
          </Text>
          <View style={styles.sigBox}>
            <Text style={styles.sigHint}>{'{{Tenant 2 Signature;role=Co-tenant;type=signature}}'}</Text>
          </View>
          <View style={{ ...styles.sigBox, minHeight: 28 }}>
            <Text style={styles.sigHint}>{'{{Tenant 2 Sign Date;role=Co-tenant;type=date}}'}</Text>
          </View>
        </>
      ) : null}

      {tenant3 ? (
        <>
          <Text style={{ ...styles.subHeading, marginTop: 8 }}>Signature of tenant 3</Text>
          <Text style={styles.body}>
            <Text style={styles.labelBold}>Print name: </Text>
            {tenant3}
          </Text>
          <View style={styles.sigBox}>
            <Text style={styles.sigHint}>{'{{Tenant 3 Signature;role=Second Party;type=signature}}'}</Text>
          </View>
          <View style={{ ...styles.sigBox, minHeight: 28 }}>
            <Text style={styles.sigHint}>{'{{Tenant 3 Sign Date;role=Second Party;type=date}}'}</Text>
          </View>
        </>
      ) : null}
    </View>
  )
}

export function QldGeneralTenancyAgreement(props: QldGeneralTenancyAgreementProps) {
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
    premisesInclusionsLine,
    lastRentIncreaseDate,
    landlordPostcode,
    premisesPostcode,
    rentPaymentBankDetails,
    rentPaymentPreference,
    specialConditions,
    bookingNotes,
  } = props

  const item9Methods = item9RentPaymentMethodPair(rentPaymentPreference)

  const madeOn = agreementMadeOnFromGeneratedAt(generatedAt)
  const atSuburb = suburbFromAddressLine(premises.addressLine)
  const rentWeekday = rentDueWeekdayFromCommencement(term.startDate)
  const weeklyRentDisplay = formatMoney(rent.weeklyRent)
  const bondDisplay = bond.amount != null && Number.isFinite(bond.amount) ? formatMoney(bond.amount) : null
  const freq = rent.rentFrequency
  const periodWord = rentFrequencyNoun(freq)

  const elecLine = (v: string | null) => (v && v.trim() ? v.trim() : '')
  const endDateText = term.periodic || !term.endDate ? null : formatAuDate(term.endDate)

  const incLine =
    premisesInclusionsLine && premisesInclusionsLine.trim() ? premisesInclusionsLine.trim() : '—'

  const maxOcc =
    props.maxOccupantsPermitted != null && Number.isFinite(props.maxOccupantsPermitted)
      ? String(props.maxOccupantsPermitted)
      : null

  const clauseChunks = chunkText(FORM18A_PART2_STANDARD_TERMS, 2600)

  let pageNum = 0
  const nextPage = () => {
    pageNum += 1
    return pageNum
  }

  const pages: ReactNode[] = []

  pages.push(
    <Page key="p-part1-1" size="A4" style={styles.page}>
      <QldTopHeader documentId={documentId} generatedAt={generatedAt} logoPath={logoPath} />
      <Text style={styles.formRefLine}>{FORM_REFERENCE_LINE}</Text>
      <Text style={styles.sectionHeading}>Part 1 Tenancy information</Text>

      <Text style={styles.body}>
        <Text style={styles.labelBold}>THIS AGREEMENT WAS MADE ON: </Text>
        {madeOn}
        <Text style={styles.labelBold}> AT: </Text>
        {atSuburb}
      </Text>

      <Text style={styles.subHeading}>Item 1 — Lessor</Text>
      <Field label="1.1 Name/trading name:" children={landlord.fullName} />
      <Field label="Address:" children={landlord.addressLine} />
      <Field label="Postcode:" children={landlordPostcode.trim() || '—'} />
      <Field
        label="1.2 Phone / Mobile / ABN (optional) / Email:"
        children={`Phone: ${landlord.phone} · Email: ${landlord.email}`}
      />

      <Text style={styles.subHeading}>Item 2 — Tenant/s</Text>
      <Field label="2.1 (1) Full name/s:" children={tenant.fullName} />
      <Field label="Phone / Email:" children={`${tenant.phone} · ${tenant.email}`} />
      <Field
        label="Emergency contact full name/s / phone / email:"
        children={
          tenant.emergencyContactName || tenant.emergencyContactPhone
            ? `${tenant.emergencyContactName ?? '—'} · ${tenant.emergencyContactPhone ?? '—'}`
            : '—'
        }
      />
      {props.additionalTenantNames[0]?.trim() ? (
        <>
          <Field label="2.1 (2) Full name/s:" children={props.additionalTenantNames[0].trim()} />
          <Field label="Phone / Email:" children="—" />
          <Field label="Emergency contact full name/s / phone / email:" children="—" />
        </>
      ) : null}
      {props.additionalTenantNames[1]?.trim() ? (
        <>
          <Field label="2.1 (3) Full name/s:" children={props.additionalTenantNames[1].trim()} />
          <Field label="Phone / Email:" children="—" />
          <Field label="Emergency contact full name/s / phone / email:" children="—" />
        </>
      ) : null}
      <Field
        label="2.2 Address for service (if different from premises):"
        children={tenant.addressForServiceLine?.trim() ? tenant.addressForServiceLine.trim() : 'Same as premises — Item 5.1'}
      />

      <Text style={styles.subHeading}>Item 3 — Lessor’s agent</Text>
      {landlordAgent ? (
        <>
          <Field label="3.1 Full name/trading name:" children={landlordAgent.name} />
          <Field label="Address:" children={landlordAgent.businessAddress} />
          <Field label="Postcode:" children="—" />
          <Field
            label="3.2 Phone / Mobile / ABN (optional) / Email:"
            children={`Phone: ${landlordAgent.phone}${landlordAgent.email ? ` · Email: ${landlordAgent.email}` : ''}`}
          />
        </>
      ) : (
        <Field label="Agent:" children="Not applicable" />
      )}
      <PageFooter documentId={documentId} pageNumber={nextPage()} />
    </Page>,
  )

  pages.push(
    <Page key="p-part1-2" size="A4" style={styles.page}>
      <QldTopHeader documentId={documentId} generatedAt={generatedAt} logoPath={logoPath} />
      <Text style={styles.subHeading}>Item 4 — Notices may be given to</Text>
      <Field
        label="4.1 Lessor — consent to email / text / facsimile:"
        children={`Email: ${electronicService.landlordConsentsToEmailService ? 'Yes' : 'No'} (${electronicService.landlordEmail})`}
      />
      <Field
        label="4.2 Tenant/s — consent to email / text / facsimile:"
        children={`Email: ${electronicService.tenantConsentsToEmailService ? 'Yes' : 'No'} (${electronicService.tenantEmail})`}
      />
      <Field label="4.3 Agent:" children={landlordAgent ? 'As per Item 3' : 'Not applicable'} />

      <Text style={styles.subHeading}>Item 5 — Rental premises</Text>
      <Field label="5.1 Address of the rental premises:" children={premises.addressLine} />
      <Field label="Postcode:" children={premisesPostcode.trim() || '—'} />
      <Field label="5.2 Inclusions provided:" children={incLine} />
      <Field label="5.3 Details of current repair orders:" children="None stated" />

      <Text style={styles.subHeading}>Item 6 — Term</Text>
      <CheckboxLine checked={Boolean(!term.periodic && term.endDate)} label="fixed term agreement" />
      <CheckboxLine checked={term.periodic} label="periodic agreement" />
      <Field label="6.2 Starting on:" children={formatAuDate(term.startDate)} />
      {endDateText ? <Field label="6.3 Ending on:" children={endDateText} /> : null}

      <Text style={styles.subHeading}>Items 7–8 — Rent</Text>
      <Field label="Item 7 Rent:" children={`${weeklyRentDisplay} (${freq})`} />
      <CheckboxLine checked={freq === 'weekly'} label="weekly" />
      <CheckboxLine checked={freq === 'fortnightly'} label="fortnightly" />
      <CheckboxLine checked={freq === 'monthly'} label="monthly" />
      <Field
        label="Item 8 Rent must be paid on (day of each period):"
        children={`${rentWeekday} of each ${periodWord}`}
      />

      <Text style={styles.subHeading}>Item 9 — Methods of rent payment</Text>
      <Field label="Method 1:" children={item9Methods.method1} />
      <Field label="Method 2:" children={item9Methods.method2} />
      {rentPaymentBankDetails ? (
        <>
          <Field label="BSB no.:" children={rentPaymentBankDetails.bsb} />
          <Field label="Bank/building society/credit union:" children={rentPaymentBankDetails.bankName} />
          <Field label="Account no.:" children={rentPaymentBankDetails.accountNumber} />
          <Field label="Account name:" children={rentPaymentBankDetails.accountName} />
          <Field label="Payment reference:" children={`Booking ${documentId.slice(0, 8)}…`} />
        </>
      ) : (
        <Field label="Direct credit details:" children="—" />
      )}

      <Text style={styles.subHeading}>Item 10 — Place of rent payment</Text>
      <Field label="Place (optional):" children="As agreed — electronic transfer" />

      <Text style={styles.subHeading}>Item 11 — Day of last rent increase</Text>
      <Field
        label="Date:"
        children={lastRentIncreaseDate ? formatAuDate(lastRentIncreaseDate) : 'Not stated — new tenancy / unknown'}
      />

      <PageFooter documentId={documentId} pageNumber={nextPage()} />
    </Page>,
  )

  pages.push(
    <Page key="p-part1-3" size="A4" style={styles.page}>
      <QldTopHeader documentId={documentId} generatedAt={generatedAt} logoPath={logoPath} />
      <Text style={styles.subHeading}>Item 12 — Rental bond</Text>
      {bondDisplay ? (
        <Field label="Rental bond amount:" children={`${bondDisplay} (payable as required under the Act)`} />
      ) : (
        <Field label="Rental bond amount:" children="—" />
      )}

      <Text style={styles.subHeading}>Item 13 — Services supplied for which tenant must pay</Text>
      <Field
        label="13.1 Electricity / gas / phone / other:"
        children="As summarised in the Quni Platform Addendum — rent may include utilities subject to fair use."
      />
      <Field label="13.2 Tenant to pay for water supplied to the premises:" children="No — unless stated in special terms" />

      <Text style={styles.subHeading}>Items 14–15 — Service costs</Text>
      <Field label="Item 14 Apportionment (if not individually metered):" children="See platform addendum / fair use" />
      <Field label="Item 15 How services must be paid for:" children="As described in the Quni Platform Addendum" />

      <Text style={styles.subHeading}>Item 16 — Number of persons allowed to reside</Text>
      {maxOcc ? <Field label="Maximum occupants:" children={maxOcc} /> : <Field label="Maximum occupants:" children="—" />}

      <Text style={styles.subHeading}>Item 17 — Body corporate by-laws</Text>
      <Field label="17.1 By-laws applicable?" children="No" />
      <Field label="17.2 Copy given?" children="Not applicable" />

      <Text style={styles.subHeading}>Item 18 — Nominated repairers (urgent / emergency)</Text>
      {elecLine(urgentRepairsTradespeople.electrician) ? (
        <Field label="Electrical repairs / phone:" children={urgentRepairsTradespeople.electrician} />
      ) : null}
      {elecLine(urgentRepairsTradespeople.plumber) ? (
        <Field label="Plumbing repairs / phone:" children={urgentRepairsTradespeople.plumber} />
      ) : null}
      {elecLine(urgentRepairsTradespeople.other) ? (
        <Field label="Other repairs / phone:" children={urgentRepairsTradespeople.other} />
      ) : null}
      {!elecLine(urgentRepairsTradespeople.electrician) &&
      !elecLine(urgentRepairsTradespeople.plumber) &&
      !elecLine(urgentRepairsTradespeople.other) ? (
        <Field
          label="Lessor contact for emergency repairs (Item 18):"
          children={`${landlord.fullName} — ${landlord.phone}`}
        />
      ) : null}
      <Field
        label="18.2 Nominated repairers first point of contact for emergency repairs?"
        children="Yes — otherwise contact lessor using details in Item 1"
      />

      <Text style={styles.subHeading}>Item 19 — Pets</Text>
      <Field label="Type / number approved:" children="None unless agreed in writing by the lessor" />

      {bookingNotes ? (
        <>
          <Text style={styles.subHeading}>Booking notes (reference only)</Text>
          <Text style={styles.body}>{bookingNotes}</Text>
        </>
      ) : null}

      <PageFooter documentId={documentId} pageNumber={nextPage()} />
    </Page>,
  )

  clauseChunks.forEach((chunk, i) => {
    pages.push(
      <Page key={`part2-${i}`} size="A4" style={styles.page}>
        <QldTopHeader documentId={documentId} generatedAt={generatedAt} logoPath={logoPath} />
        {i === 0 ? <Text style={styles.sectionHeading}>Part 2 Standard Terms</Text> : null}
        <Form18aClauseChunkBody text={chunk} styles={clausePdfStyles} />
        <PageFooter documentId={documentId} pageNumber={nextPage()} />
      </Page>,
    )
  })

  pages.push(
    <Page key="part3" size="A4" style={styles.page}>
      <QldTopHeader documentId={documentId} generatedAt={generatedAt} logoPath={logoPath} />
      {/* Match RTA Form 18a caption (do not uppercase — Part 3 is not a Quni banner). */}
      <Text style={{ ...styles.subHeading, textTransform: 'none' }}>Part 3 Special terms</Text>
      <Text style={styles.body}>
        Insert any special terms here and/or attach a separate list if required. See clause 2(3) to 2(5).
      </Text>
      {specialConditions.length > 0 ? (
        <View style={{ marginTop: 8 }}>
          {specialConditions.map((line, i) => (
            <Text key={i} style={{ ...styles.bodyTight, marginBottom: 4 }}>
              {line}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={{ ...styles.bodyTight, marginTop: 6 }}>Nil additional special terms at execution.</Text>
      )}
      <Text style={{ ...styles.body, marginTop: 14 }}>{FORM18A_PART3_FORM17A_NOTICE}</Text>
      <Text style={{ ...styles.body, marginTop: 8 }}>{FORM18A_PART3_INTERPRETER_LINE}</Text>
      <Form18aSignaturesBlock {...props} />
      <PageFooter documentId={documentId} pageNumber={nextPage()} />
    </Page>,
  )

  return <Document>{pages}</Document>
}
