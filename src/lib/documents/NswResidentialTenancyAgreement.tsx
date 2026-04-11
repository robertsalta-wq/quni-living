import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { NswResidentialTenancyAgreementProps } from '../../../api/documents/rtaTypes.js'
import {
  FT6600_CLAUSES_1_TO_55,
  FT6600_NOTES,
  FT6600_TITLE_AND_IMPORTANT,
} from './ft6600EmbeddedStrings.js'

/** Weekly Stripe billing anchors to the tenancy commencement date (see `api/create-rent-subscription.js`). */
function rentDueWeekdayFromCommencement(isoDate: string): string {
  const raw = isoDate.slice(0, 10)
  const [y, m, d] = raw.split('-').map(Number)
  if (!y || !m || !d) return 'Monday'
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toLocaleDateString('en-AU', { weekday: 'long', timeZone: 'UTC' })
}

const CONDITION_REPORT_VERBATIM =
  'A condition report relating to the condition of the premises must be completed by or on behalf of the landlord before or when this agreement is given to the tenant for signing.'

const TENANCY_LAWS_VERBATIM =
  'The Residential Tenancies Act 2010 and the Residential Tenancies Regulation 2019 apply to this agreement. Both the landlord and the tenant must comply with these laws.'

const FT_FORM_REFERENCE = 'FT6600_171225 — NSW Fair Trading — Standard form from 19 May 2025'

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
  importantIntro: { fontSize: 10, marginBottom: 6 },
  numberedPoint: { fontSize: 10, marginBottom: 5, textAlign: 'justify' },
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

function resolveQuniLogoPath(): string | null {
  const p = join(process.cwd(), 'public', 'quni-logo.png')
  return existsSync(p) ? p : null
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

function extractImportantFourPoints(): string {
  const marker = 'Please read this before completing'
  const i = FT6600_TITLE_AND_IMPORTANT.indexOf(marker)
  return i >= 0 ? FT6600_TITLE_AND_IMPORTANT.slice(i) : FT6600_TITLE_AND_IMPORTANT
}

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

function stripNotesAsciiBanner(s: string): string {
  return s.replace(/^=+\r?\nNOTES\r?\n=+\r?\n\r?\n/i, '')
}

function isSectionHeadingLine(line: string): boolean {
  const t = line.trim()
  if (t.length < 4 || t.length > 90) return false
  if (/^\d/.test(t)) return false
  if (/^note/i.test(t)) return false
  if (t !== t.toUpperCase()) return false
  if (!/^[A-Z0-9][A-Z0-9 '\-#&,]+$/.test(t)) return false
  return true
}

function isCrossedOutClauseLine(line: string): boolean {
  const s = line.trimStart()
  return (
    /^38\.\s/.test(s) ||
    /^39\.\s/.test(s) ||
    /^45\.\s/.test(s) ||
    /^46(\.\s|\.\d+\s)/.test(s)
  )
}

function ClauseLine({ line }: { line: string }) {
  const raw = line
  const t = raw.trimEnd()
  if (!t) return <View style={{ height: 3 }} />

  if (isSectionHeadingLine(t)) {
    return <Text style={styles.clauseSectionTitle}>{t}</Text>
  }

  if (/^note/i.test(t.trim())) {
    return <Text style={styles.clauseNote}>{t}</Text>
  }

  const m = /^(\s*)(\d+(?:\.\d+)*\.?)(\s+)(.*)$/.exec(t)
  if (m) {
    const [, indent, num, sp, rest] = m
    if (isCrossedOutClauseLine(t)) {
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 4 }} wrap={false}>
          <Text style={{ ...styles.bodyTight, textDecoration: 'line-through', flex: 1, paddingRight: 6 }}>
            {indent}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{num}</Text>
            {sp}
            {rest}
          </Text>
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Oblique', color: '#4b5563', marginTop: 1 }}>
            not applicable
          </Text>
        </View>
      )
    }
    return (
      <Text style={styles.bodyTight}>
        {indent}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{num}</Text>
        {sp}
        {rest}
      </Text>
    )
  }

  return <Text style={styles.bodyTight}>{raw}</Text>
}

function ClauseChunkBody({ text }: { text: string }) {
  const lines = text.split(/\n/)
  return (
    <View>
      {lines.map((line, i) => (
        <ClauseLine key={i} line={line} />
      ))}
    </View>
  )
}

function NotesBody({ text }: { text: string }) {
  const lines = text.split(/\n/)
  return (
    <View>
      {lines.map((line, i) => {
        const t = line.trimEnd()
        if (!t.trim()) return <View key={i} style={{ height: 3 }} />
        const head = /^(\d+)\.\s+(.+)$/.exec(t.trim())
        if (head && head[2] && /^[A-Z]/.test(head[2])) {
          return (
            <Text key={i} style={{ ...styles.bodyTight, marginTop: i > 0 ? 6 : 0 }}>
              <Text style={styles.labelBold}>{`${head[1]}. ${head[2]}`}</Text>
            </Text>
          )
        }
        if (t.trim().startsWith('- ')) {
          return (
            <Text key={i} style={styles.bodyTight}>
              {t}
            </Text>
          )
        }
        return (
          <Text key={i} style={styles.bodyTight}>
            {t}
          </Text>
        )
      })}
    </View>
  )
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

type TermChecks = {
  m6: boolean
  m12: boolean
  y2: boolean
  y3: boolean
  y5: boolean
  periodic: boolean
  other: boolean
  otherText: string | null
}

function normalizeLeaseDescription(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Whole calendar months between start (inclusive) and end (exclusive), UTC date parts. */
function wholeMonthsBetweenStartAndEnd(startIso: string, endIso: string): number | null {
  const a = startIso.slice(0, 10)
  const b = endIso.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return null
  const [y1, m1, d1] = a.split('-').map(Number)
  const [y2, m2, d2] = b.split('-').map(Number)
  if (![y1, m1, d1, y2, m2, d2].every((n) => Number.isFinite(n))) return null
  const t1 = Date.UTC(y1, m1 - 1, d1)
  const t2 = Date.UTC(y2, m2 - 1, d2)
  if (t2 <= t1) return null
  let months = (y2 - y1) * 12 + (m2 - m1)
  if (d2 < d1) months -= 1
  return months >= 1 ? months : 1
}

function termChecksFromMonthBucket(months: number, otherText: string | null): TermChecks {
  const base: TermChecks = {
    m6: false,
    m12: false,
    y2: false,
    y3: false,
    y5: false,
    periodic: false,
    other: false,
    otherText: null,
  }
  if (months <= 3) {
    return {
      ...base,
      other: true,
      otherText: otherText ?? `${months} month${months === 1 ? '' : 's'}`,
    }
  }
  if (months <= 8) return { ...base, m6: true }
  if (months <= 15) return { ...base, m12: true }
  if (months <= 27) return { ...base, y2: true }
  if (months <= 45) return { ...base, y3: true }
  return { ...base, y5: true }
}

function termCheckState(
  periodic: boolean,
  leaseLengthDescription: string,
  startDate: string,
  endDate: string | null,
): TermChecks {
  if (periodic) {
    return {
      m6: false,
      m12: false,
      y2: false,
      y3: false,
      y5: false,
      periodic: true,
      other: false,
      otherText: null,
    }
  }

  const trimmedDesc = leaseLengthDescription.trim()
  const d = normalizeLeaseDescription(trimmedDesc)

  if (/\bperiodic\b/.test(d) || /\bmonth[\s-]*to[\s-]*month\b/.test(d)) {
    return {
      m6: false,
      m12: false,
      y2: false,
      y3: false,
      y5: false,
      periodic: true,
      other: false,
      otherText: null,
    }
  }

  if (/\b5\s*years?\b|\b5\s*yrs?\b|\b60\s*months?\b/.test(d)) {
    return {
      m6: false,
      m12: false,
      y2: false,
      y3: false,
      y5: true,
      periodic: false,
      other: false,
      otherText: null,
    }
  }
  if (/\b3\s*years?\b|\b3\s*yrs?\b|\b36\s*months?\b/.test(d)) {
    return {
      m6: false,
      m12: false,
      y2: false,
      y3: true,
      y5: false,
      periodic: false,
      other: false,
      otherText: null,
    }
  }
  if (/\b2\s*years?\b|\b2\s*yrs?\b|\b24\s*months?\b/.test(d)) {
    return {
      m6: false,
      m12: false,
      y2: true,
      y3: false,
      y5: false,
      periodic: false,
      other: false,
      otherText: null,
    }
  }
  if (/\b12\s*months?\b|\b1\s*year\b|\b1\s*yr\b|\b52\s*weeks?\b/.test(d)) {
    return {
      m6: false,
      m12: true,
      y2: false,
      y3: false,
      y5: false,
      periodic: false,
      other: false,
      otherText: null,
    }
  }
  if (/\b6\s*months?\b|\b26\s*weeks?\b/.test(d)) {
    return {
      m6: true,
      m12: false,
      y2: false,
      y3: false,
      y5: false,
      periodic: false,
      other: false,
      otherText: null,
    }
  }
  if (/\b3\s*months?\b|\b13\s*weeks?\b/.test(d)) {
    return {
      m6: false,
      m12: false,
      y2: false,
      y3: false,
      y5: false,
      periodic: false,
      other: true,
      otherText: trimmedDesc || '3 months',
    }
  }

  const monthsFromDates =
    endDate && startDate ? wholeMonthsBetweenStartAndEnd(startDate, endDate) : null
  if (monthsFromDates != null) {
    return termChecksFromMonthBucket(monthsFromDates, trimmedDesc || null)
  }

  const generic = d === 'as agreed' || d === '' || d === 'fixed term'
  if (generic) {
    return {
      m6: false,
      m12: false,
      y2: false,
      y3: false,
      y5: false,
      periodic: false,
      other: true,
      otherText: trimmedDesc || null,
    }
  }

  return {
    m6: false,
    m12: false,
    y2: false,
    y3: false,
    y5: false,
    periodic: false,
    other: true,
    otherText: trimmedDesc || null,
  }
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
    <View style={styles.quniHeader}>
      {logoPath ? (
        <Image src={logoPath} style={styles.logo} />
      ) : (
        <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f2744', marginRight: 12 }}>Quni</Text>
      )}
      <View style={styles.headerTitleCol}>
        <Text style={styles.headerTitle}>Residential Tenancy Agreement</Text>
        <Text style={styles.headerSubtitle}>NSW · Residential Tenancies Act 2010</Text>
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

function SignaturesBlock(props: NswResidentialTenancyAgreementProps) {
  const landlordName = props.landlord.fullName

  const landlordSignIntro =
    "SIGNED BY THE LANDLORD\nNote: Section 9 of the Electronic Transactions Act 2000 allows for agreements to be signed electronically in NSW if the parties consent. If an electronic signature is used then it must comply with Division 2 of Part 2 of the Electronic Transactions Act 2000.\n\nName of landlord:"

  const lisHeadingAndBody =
    "LANDLORD INFORMATION STATEMENT\nThe landlord acknowledges that, at or before the time of signing this residential tenancy agreement, the landlord has read and understood the contents of the Landlord Information Statement published by NSW Fair Trading that sets out the landlord's rights and obligations.\n\nSignature of landlord:"

  const tenant1Banner = '\nSIGNED BY THE TENANT (1)\nName of tenant:'

  const tisHeadingAndBody =
    'TENANT INFORMATION STATEMENT\nThe tenant acknowledges that, at or before the time of signing this residential tenancy agreement, the tenant was given a copy of the Tenant Information Statement published by NSW Fair Trading.\n\nSignature of tenant:'

  const contactFooter =
    'For information about your rights and obligations as a landlord or tenant, contact:\n(a) NSW Fair Trading on 13 32 20 or nsw.gov.au/fair-trading or\n(b) Law Access NSW on 1300 888 529 or lawaccess.nsw.gov.au or\n(c) your local Tenants Advice and Advocacy Service at tenants.org.au'

  return (
    <View>
      <Text style={styles.sectionHeading}>Signatures</Text>
      <Text style={styles.body}>{landlordSignIntro}</Text>
      <Text style={styles.value}>{landlordName}</Text>
      <View style={styles.sigBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.body}>Signature of landlord: </Text>
          <Text style={styles.sigHint}>{'{{Landlord Signature;role=First Party;type=signature}}'}</Text>
        </View>
      </View>
      <View style={{ ...styles.sigBox, minHeight: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sigHint}>Landlord Sign Date </Text>
          <Text style={styles.sigHint}>{'{{Landlord Sign Date;role=First Party;type=date}}'}</Text>
        </View>
      </View>
      <Text style={styles.body}>{lisHeadingAndBody}</Text>
      <View style={styles.sigBox}>
        <Text style={styles.sigHint}>{'{{Landlord LIS Signature;role=First Party;type=signature}}'}</Text>
      </View>
      <View style={{ ...styles.sigBox, minHeight: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sigHint}>Landlord LIS Date </Text>
          <Text style={styles.sigHint}>{'{{Landlord LIS Date;role=First Party;type=date}}'}</Text>
        </View>
      </View>
      <Text style={styles.body}>{tenant1Banner}</Text>
      <Text style={styles.value}>{props.tenant.fullName}</Text>
      <View style={styles.sigBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.body}>Signature of tenant: </Text>
          <Text style={styles.sigHint}>{'{{Tenant Signature;role=Second Party;type=signature}}'}</Text>
        </View>
      </View>
      <View style={{ ...styles.sigBox, minHeight: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sigHint}>Tenant Sign Date </Text>
          <Text style={styles.sigHint}>{'{{Tenant Sign Date;role=Second Party;type=date}}'}</Text>
        </View>
      </View>
      <Text style={styles.body}>{tisHeadingAndBody}</Text>
      <View style={styles.sigBox}>
        <Text style={styles.sigHint}>{'{{Tenant TIS Signature;role=Second Party;type=signature}}'}</Text>
      </View>
      <View style={{ ...styles.sigBox, minHeight: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sigHint}>Tenant TIS Date </Text>
          <Text style={styles.sigHint}>{'{{Tenant TIS Date;role=Second Party;type=date}}'}</Text>
        </View>
      </View>
      <Text style={{ ...styles.body, marginTop: 12, fontSize: 9, lineHeight: 1.5 }}>{contactFooter}</Text>
    </View>
  )
}

export function NswResidentialTenancyAgreement(props: NswResidentialTenancyAgreementProps) {
  const logoPath = resolveQuniLogoPath()
  const { documentId, generatedAt, landlord, tenant, premises, term, rent, bond, landlordAgent } = props
  const urgent = props.urgentRepairsTradespeople
  const es = props.electronicService
  const importantBody = extractImportantFourPoints()
  const madeOn = agreementMadeOnFromGeneratedAt(generatedAt)
  const atSuburb = suburbFromAddressLine(premises.addressLine)
  const checks = termCheckState(term.periodic, term.leaseLengthDescription, term.startDate, term.endDate)
  const rentWeekday = rentDueWeekdayFromCommencement(term.startDate)
  const weeklyRentDisplay = formatMoney(rent.weeklyRent)
  const bondDisplay =
    bond.amount != null && Number.isFinite(bond.amount) ? formatMoney(bond.amount) : null
  const inclusions =
    props.additionalPremisesInclusions.map((s) => s.trim()).filter(Boolean)
  const maxOcc =
    props.maxOccupantsPermitted != null && Number.isFinite(props.maxOccupantsPermitted)
      ? String(props.maxOccupantsPermitted)
      : null
  const elecLine = (v: string | null) => (v && v.trim() ? v.trim() : '')
  const endDateText =
    term.periodic || !term.endDate ? null : formatAuDate(term.endDate)

  const clauseChunks = chunkText(FT6600_CLAUSES_1_TO_55, 2600)
  const rawNotesChunks = chunkText(FT6600_NOTES, 3000)
  const notesChunks = rawNotesChunks.map((c, i) => (i === 0 ? stripNotesAsciiBanner(c) : c))

  let pageNum = 0
  const nextPage = () => {
    pageNum += 1
    return pageNum
  }

  const pages: ReactNode[] = []

  pages.push(
    <Page key="p1" size="A4" style={styles.page}>
      <QuniTopHeader documentId={documentId} generatedAt={generatedAt} logoPath={logoPath} />
      <Text style={styles.formRefLine}>{FT_FORM_REFERENCE}</Text>
      <Text style={styles.sectionHeading}>Important information</Text>
      <Text style={styles.importantIntro}>{importantBody}</Text>

      <Text style={styles.body}>
        <Text style={styles.labelBold}>THIS AGREEMENT WAS MADE ON: </Text>
        {madeOn}
        <Text style={styles.labelBold}> AT: </Text>
        {atSuburb}
      </Text>

      <Text style={styles.sectionHeading}>Between</Text>
      <Field label="Landlord Name (1):" children={landlord.fullName} />
      <Field
        label="Landlord telephone number or other contact details:"
        children={landlord.phone}
      />
      <Field label="Business or residential address of landlord(s) for service of notices:" children={landlord.addressLine} />

      <Field label="Tenant Name (1):" children={tenant.fullName} />
      {tenant.addressForServiceLine ? (
        <Field label="Tenant's address for service of notices:" children={tenant.addressForServiceLine} />
      ) : null}
      <Field label="Contact details:" children={`Phone: ${tenant.phone} · Email: ${tenant.email}`} />

      {landlordAgent ? (
        <>
          <Text style={styles.subHeading}>Landlord's agent details</Text>
          <Field label="Agent name:" children={landlordAgent.name} />
          <Field label="Business address for service of notices:" children={landlordAgent.businessAddress} />
          <Field
            label="Contact details:"
            children={`Phone: ${landlordAgent.phone}${landlordAgent.email ? ` · Email: ${landlordAgent.email}` : ''}`}
          />
        </>
      ) : (
        <Field label="Landlord's agent:" children="Not applicable" />
      )}
      <PageFooter documentId={documentId} pageNumber={nextPage()} />
    </Page>,
  )

  pages.push(
    <Page key="p2" size="A4" style={styles.page}>
      <QuniTopHeader documentId={documentId} generatedAt={generatedAt} logoPath={logoPath} />
      <Text style={styles.subHeading}>Term of agreement</Text>
      <View style={{ marginBottom: 6 }}>
        <CheckboxLine checked={checks.m6} label="6 months" />
        <CheckboxLine checked={checks.m12} label="12 months" />
        <CheckboxLine checked={checks.y2} label="2 years" />
        <CheckboxLine checked={checks.y3} label="3 years" />
        <CheckboxLine checked={checks.y5} label="5 years" />
        <View style={styles.checkboxRow} wrap={false}>
          <Checkbox checked={checks.other} />
          <Text style={styles.body}>
            <Text style={styles.value}>Other (please specify): </Text>
            {checks.other && checks.otherText ? (
              <Text style={styles.value}>{checks.otherText}</Text>
            ) : null}
          </Text>
        </View>
        <CheckboxLine checked={checks.periodic} label="Periodic (no end date)" />
      </View>
      <Field label="Starting on:" children={formatAuDate(term.startDate)} />
      {endDateText ? <Field label="Ending on:" children={endDateText} /> : null}

      <Text style={styles.subHeading}>Residential premises</Text>
      <Field label="The residential premises are:" children={premises.addressLine} />
      {inclusions.length > 0 ? (
        <Field label="The residential premises include:" children={inclusions.join('; ')} />
      ) : null}

      <Text style={styles.subHeading}>Rent</Text>
      <Field label="The rent is:" children={weeklyRentDisplay} />
      <CheckboxLine checked={rent.rentFrequency === 'weekly'} label="Rent must be paid per: week" />
      <Field label="Day rent must be paid:" children={rentWeekday} />
      <Field label="Date first rent payment is due:" children={formatAuDate(term.startDate)} />
      <Text style={{ ...styles.body, marginTop: 4, marginBottom: 2 }}>Rent must be paid by:</Text>
      <CheckboxLine checked={false} label="approved electronic bank transfer (such as direct debit, bank transfer or BPAY)" />
      <CheckboxLine checked={false} label="Centrepay" />
      <CheckboxLine checked label="Other" />
      <Field label="Details of payment method:" children={rent.paymentMethod} />

      {bondDisplay ? (
        <>
          <Text style={styles.subHeading}>Rental bond</Text>
          <Field label="A rental bond of:" children={`${bondDisplay} must be paid by the tenant on signing this agreement.`} />
          <CheckboxLine
            checked
            label="The tenant provided the rental bond amount to: the landlord or another person"
          />
          <CheckboxLine
            checked={false}
            label="The tenant provided the rental bond amount to: the landlord's agent"
          />
          <CheckboxLine checked={false} label="NSW Fair Trading through Rental Bond Online." />
        </>
      ) : null}

      <Text style={styles.subHeading}>Important information</Text>
      {maxOcc ? (
        <Field
          label="Maximum number of occupants:"
          children={`No more than ${maxOcc} persons may ordinarily live in the premises at any one time.`}
        />
      ) : null}
      <Text style={{ ...styles.body, fontFamily: 'Helvetica-Bold', marginTop: 4 }}>Urgent repairs</Text>
      <Text style={styles.body}>Nominated tradespeople for urgent repairs</Text>
      {elecLine(urgent.electrician) ? (
        <Field label="Electrical repairs:" children={urgent.electrician} />
      ) : null}
      {elecLine(urgent.plumber) ? <Field label="Plumbing repairs:" children={urgent.plumber} /> : null}
      {elecLine(urgent.other) ? <Field label="Other repairs:" children={urgent.other} /> : null}
      <Field label="Will the tenant be required to pay separately for water usage?" children="No" />
      <Field label="Is electricity supplied to the premises from an embedded network?" children="No" />
      <Field label="Is gas supplied to the premises from an embedded network?" children="No" />
      <Field
        label="Smoke alarms:"
        children="Battery operated smoke alarms"
      />
      <Field label="Are there any strata or community scheme by-laws applicable to the residential premises?" children="No" />

      <Text style={{ ...styles.body, fontFamily: 'Helvetica-Bold', marginTop: 8 }}>
        Giving notices and other documents electronically
      </Text>
      <Field label="Landlord — express consent to electronic service?" children={es.landlordConsentsToEmailService ? 'Yes' : 'No'} />
      {es.landlordConsentsToEmailService ? (
        <Field label="Landlord email for electronic service:" children={es.landlordEmail} />
      ) : null}
      <Field label="Tenant — express consent to electronic service?" children={es.tenantConsentsToEmailService ? 'Yes' : 'No'} />
      {es.tenantConsentsToEmailService ? (
        <Field label="Tenant email for electronic service:" children={es.tenantEmail} />
      ) : null}

      <Text style={{ ...styles.subHeading, marginTop: 10 }}>Condition report</Text>
      <Text style={styles.body}>{CONDITION_REPORT_VERBATIM}</Text>
      <Text style={{ ...styles.subHeading, marginTop: 8 }}>Tenancy laws</Text>
      <Text style={styles.body}>{TENANCY_LAWS_VERBATIM}</Text>

      <PageFooter documentId={documentId} pageNumber={nextPage()} />
    </Page>,
  )

  clauseChunks.forEach((chunk, i) => {
    pages.push(
      <Page key={`clause-${i}`} size="A4" style={styles.page}>
        <QuniTopHeader documentId={documentId} generatedAt={generatedAt} logoPath={logoPath} />
        {i === 0 ? <Text style={styles.sectionHeading}>The agreement</Text> : null}
        <ClauseChunkBody text={chunk} />
        <PageFooter documentId={documentId} pageNumber={nextPage()} />
      </Page>,
    )
  })

  notesChunks.forEach((chunk, i) => {
    pages.push(
      <Page key={`notes-${i}`} size="A4" style={styles.page}>
        <QuniTopHeader documentId={documentId} generatedAt={generatedAt} logoPath={logoPath} />
        {i === 0 ? <Text style={styles.sectionHeading}>Notes</Text> : null}
        <NotesBody text={chunk} />
        <PageFooter documentId={documentId} pageNumber={nextPage()} />
      </Page>,
    )
  })

  pages.push(
    <Page key="sig" size="A4" style={styles.page}>
      <QuniTopHeader documentId={documentId} generatedAt={generatedAt} logoPath={logoPath} />
      <SignaturesBlock {...props} />
      <PageFooter documentId={documentId} pageNumber={nextPage()} />
    </Page>,
  )

  return <Document>{pages}</Document>
}
