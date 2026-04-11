import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from '@react-pdf/renderer'

/**
 * Shared Quni Living PDF presentation tokens for RTA + Platform Addendum.
 * Uses Helvetica / Helvetica-Bold (react-pdf built-ins) as the sans-serif body face.
 */
export const quniPdf = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 52,
    paddingLeft: 36,
    paddingRight: 44,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#222222',
    lineHeight: 1.5,
    backgroundColor: '#ffffff',
  },
  pageDense: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  wordmark: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#FF6F61',
    marginBottom: 4,
  },
  docTitle: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: '#1B2A4A',
    marginBottom: 4,
  },
  headerItalicMeta: {
    fontSize: 8,
    fontFamily: 'Helvetica',
    fontStyle: 'italic',
    color: '#666666',
    marginBottom: 8,
  },
  headerMetaRight: {
    fontSize: 8,
    color: '#888888',
    textAlign: 'right',
    maxWidth: 200,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  headerRule: {
    borderBottomWidth: 1,
    borderBottomColor: '#FF6F61',
    marginBottom: 12,
  },
  sectionRule: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginTop: 10,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1B2A4A',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 8,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6F61',
    backgroundColor: '#ffffff',
  },
  subSectionHeading: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
    marginTop: 6,
    marginBottom: 4,
  },
  body: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#222222',
  },
  bodyDense: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#222222',
  },
  notesText: {
    fontSize: 9,
    lineHeight: 1.5,
    fontStyle: 'italic',
    color: '#555555',
  },
  fieldBlock: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
    marginBottom: 3,
  },
  fieldBox: {
    borderWidth: 1,
    borderColor: '#cccccc',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 22,
  },
  fieldBoxTall: {
    minHeight: 48,
  },
  fieldValue: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#222222',
  },
  fieldInlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxOuter: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: '#999999',
    backgroundColor: '#ffffff',
    marginRight: 6,
  },
  checkboxLabel: {
    fontSize: 10,
    color: '#222222',
  },
  moreInfoBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFF8F7',
    borderWidth: 1,
    borderColor: '#FFD5CF',
  },
  moreInfoText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#222222',
  },
  footerWrap: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 44,
  },
  footerRule: {
    borderTopWidth: 1,
    borderTopColor: '#FF6F61',
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLeftRta: {
    fontSize: 8,
    color: '#FF6F61',
  },
  footerPageRta: {
    fontSize: 8,
    color: '#999999',
  },
  footerLeftAddendum: {
    fontSize: 8,
    color: '#FF6F61',
  },
  footerRightAddendum: {
    fontSize: 8,
    color: '#FF6F61',
  },
  marginStampWrap: {
    position: 'absolute',
    right: 8,
    top: 200,
    width: 14,
    transform: 'rotate(90deg)',
  },
  marginStampText: {
    fontSize: 7,
    color: '#bbbbbb',
  },
  sigFieldBox: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#cccccc',
    backgroundColor: '#ffffff',
    minHeight: 40,
    marginBottom: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  sigDateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  docusealTag: { fontSize: 1, color: '#FFFFFF' },
  bullet: { marginLeft: 10, marginBottom: 3 },
  clauseColumnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clauseColumn: {
    width: '48%',
  },
})

/**
 * Presentation aligned with `api/documents/OccupancyAgreement.js` (Residential Occupancy Agreement PDF).
 * Used by NSW RTA + Platform Addendum so those documents match the shipped Occupancy Agreement look.
 */
export const occupancyMatchPdf = StyleSheet.create({
  page: {
    paddingTop: 88,
    paddingBottom: 72,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#2C2417',
    lineHeight: 1.45,
    backgroundColor: '#FAF6EE',
  },
  headerWrap: {
    position: 'absolute',
    top: 28,
    left: 40,
    right: 40,
  },
  oaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandQuni: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#C9672A',
    letterSpacing: 0.3,
  },
  headerRightBlock: { alignItems: 'flex-end', maxWidth: 280 },
  headerDocTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#C9672A',
    textAlign: 'right',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 8,
    color: '#7A736C',
    textAlign: 'right',
  },
  oaHeaderRule: {
    marginTop: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#C9672A',
    width: '100%',
  },
  footerWrapOa: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    right: 40,
  },
  footerRuleOa: {
    borderTopWidth: 1.5,
    borderTopColor: '#C9672A',
    width: '100%',
    marginBottom: 6,
  },
  footerRowOa: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLeftCoral: {
    fontSize: 7.5,
    color: '#C9672A',
    flex: 1,
    paddingRight: 8,
  },
  footerPageCoral: {
    fontSize: 7.5,
    color: '#C9672A',
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
    backgroundColor: '#C9672A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 1,
  },
  sectionBadgeText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
  },
  sectionTitleCol: { flex: 1 },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: '#2C2417',
    marginBottom: 4,
  },
  sectionHeadingRule: {
    borderBottomWidth: 1,
    borderBottomColor: '#C9672A',
    width: '100%',
  },
  bodyParagraph: {
    marginBottom: 5,
    textAlign: 'justify',
  },
  hRuleLight: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#D4C9B8',
  },
  dataRowA: { backgroundColor: '#FAF6EE' },
  dataRowB: { backgroundColor: '#F5EDD8' },
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
  dataLabel: { fontSize: 8, color: '#6B6560' },
  dataValueBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#2C2417' },
  tableWrap: {
    marginTop: 6,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: '#C4B8A8',
  },
  thRow: {
    flexDirection: 'row',
    backgroundColor: '#C9672A',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C9672A',
  },
  thCell: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRightWidth: 0.5,
    borderRightColor: '#FFFFFF',
  },
  thCellLast: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  thText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  noteBox: {
    marginTop: 8,
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#F5EDD8',
    borderWidth: 0.5,
    borderColor: '#E8DFD0',
  },
  noteItalic: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Oblique',
    color: '#2C2417',
    lineHeight: 1.5,
  },
  noteItalicMuted: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Oblique',
    color: '#555555',
    lineHeight: 1.5,
  },
  clauseLine: { marginBottom: 3, textAlign: 'justify' },
  clauseSectionCaps: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#2C2417',
    marginTop: 6,
    marginBottom: 3,
  },
  checkboxOuter: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: '#999999',
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  checkboxLabel: { fontSize: 8.5, color: '#2C2417' },
  sigTable: {
    marginTop: 10,
    borderWidth: 0.5,
    borderColor: '#C4B8A8',
  },
  sigHeaderRow: { flexDirection: 'row', backgroundColor: '#C9672A' },
  sigHeaderCell: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRightWidth: 0.5,
    borderRightColor: '#FFFFFF',
  },
  sigHeaderCellLast: { flex: 1, paddingVertical: 7, paddingHorizontal: 10 },
  sigBodyRow: { flexDirection: 'row', minHeight: 220 },
  sigCol: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRightWidth: 0.5,
    borderRightColor: '#D4C9B8',
    backgroundColor: '#FAF6EE',
  },
  sigColLast: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#F5EDD8',
  },
  sigNameBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#2C2417', marginBottom: 12 },
  sigLabelRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4, flexWrap: 'wrap' },
  sigLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#C9672A' },
  sigSpace: {
    marginTop: 18,
    borderBottomWidth: 0.75,
    borderBottomColor: '#2C2417',
    marginBottom: 14,
    minHeight: 20,
  },
  sigBorderBox: {
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: '#C4B8A8',
    backgroundColor: '#FAF6EE',
    minHeight: 40,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 8,
  },
  /** DocuSeal field regions — minimum heights for comfortable signing (react-pdf px). */
  docusealSignatureFieldBox: {
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: '#C4B8A8',
    backgroundColor: '#FAF6EE',
    minHeight: 100,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 8,
  },
  docusealDateFieldBox: {
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: '#C4B8A8',
    backgroundColor: '#FAF6EE',
    minHeight: 60,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 8,
  },
  docusealTagOa: { fontSize: 1, color: '#FFFFFF' },
})

const TENANCY_AGREEMENT_BOLD_OPENERS: readonly string[] = [
  'The landlord and the tenant agree that',
  'The landlord and the tenant agree',
  'The landlord agrees that',
  'The landlord agrees to',
  'The landlord agrees:',
  'The tenant agrees that',
  'The tenant agrees to',
  'The tenant agrees:',
]

export function OccupancyMatchFixedHeader({
  documentTitle,
  subtitle,
}: {
  documentTitle: string
  subtitle: string
}) {
  return (
    <View style={occupancyMatchPdf.headerWrap} fixed>
      <View style={occupancyMatchPdf.oaHeaderRow}>
        <Text style={occupancyMatchPdf.brandQuni}>Quni</Text>
        <View style={occupancyMatchPdf.headerRightBlock}>
          <Text style={occupancyMatchPdf.headerDocTitle}>{documentTitle}</Text>
          <Text style={occupancyMatchPdf.headerSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={occupancyMatchPdf.oaHeaderRule} />
    </View>
  )
}

export function OccupancyMatchFooter({
  documentId,
  generatedAt,
  variant,
}: {
  documentId: string
  generatedAt: string
  variant: 'rta' | 'addendum'
}) {
  const left =
    variant === 'rta'
      ? `Quni Living · Residential Tenancy Agreement · Document ID: ${documentId} · Generated: ${generatedAt}`
      : `Quni Living · Platform Addendum · Document ID: ${documentId} · Generated: ${generatedAt}`
  return (
    <View style={occupancyMatchPdf.footerWrapOa} fixed>
      <View style={occupancyMatchPdf.footerRuleOa} />
      <View style={occupancyMatchPdf.footerRowOa}>
        <Text style={occupancyMatchPdf.footerLeftCoral}>{left}</Text>
        <Text
          style={occupancyMatchPdf.footerPageCoral}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber}${totalPages ? ` of ${totalPages}` : ''}`
          }
        />
      </View>
    </View>
  )
}

export function OccupancyMatchSectionHeading({ num, title }: { num: number; title: string }) {
  return (
    <View style={occupancyMatchPdf.sectionRow} wrap={false}>
      <View style={occupancyMatchPdf.sectionBadge}>
        <Text style={occupancyMatchPdf.sectionBadgeText}>{String(num)}</Text>
      </View>
      <View style={occupancyMatchPdf.sectionTitleCol}>
        <Text style={occupancyMatchPdf.sectionTitle}>{title}</Text>
        <View style={occupancyMatchPdf.sectionHeadingRule} />
      </View>
    </View>
  )
}

export function OccupancyMatchScheduleTable({
  rows,
}: {
  rows: { label: string; value: ReactNode }[]
}) {
  return (
    <View style={occupancyMatchPdf.tableWrap}>
      <View style={occupancyMatchPdf.thRow}>
        <View style={occupancyMatchPdf.thCell}>
          <Text style={occupancyMatchPdf.thText}>Item</Text>
        </View>
        <View style={occupancyMatchPdf.thCellLast}>
          <Text style={occupancyMatchPdf.thText}>Particulars</Text>
        </View>
      </View>
      {rows.map((r, i) => (
        <View
          key={i}
          style={[
            occupancyMatchPdf.dataRow,
            i % 2 === 0 ? occupancyMatchPdf.dataRowA : occupancyMatchPdf.dataRowB,
          ]}
        >
          <View style={occupancyMatchPdf.dataLabelCell}>
            <Text style={occupancyMatchPdf.dataLabel}>{r.label.trim() === '' ? ' ' : r.label}</Text>
          </View>
          <View style={occupancyMatchPdf.dataValueCell}>
            {typeof r.value === 'string' ? (
              <Text style={occupancyMatchPdf.dataValueBold}>{r.value}</Text>
            ) : (
              <View>{r.value}</View>
            )}
          </View>
        </View>
      ))}
    </View>
  )
}

function isAllCapsSectionTitle(line: string): boolean {
  const t = line.trim()
  if (t.length < 3) return false
  if (/^=+$/.test(t)) return false
  if (/^\d+\.\d/.test(t)) return false
  if (!/[A-Z]/.test(t)) return false
  return t === t.toUpperCase()
}

function ClauseLineText({ line }: { line: string }) {
  const raw = line
  if (!raw.trim()) {
    return <Text style={occupancyMatchPdf.clauseLine}> </Text>
  }
  const leadingSpaces = raw.length - raw.trimStart().length
  const trimmed = raw.trimStart()
  const pad = leadingSpaces * 2

  if (/^Note(?:\s+\d+)?:/i.test(trimmed)) {
    return (
      <Text style={[occupancyMatchPdf.clauseLine, { paddingLeft: pad }]}>
        <Text style={occupancyMatchPdf.noteItalicMuted}>{raw.trim()}</Text>
      </Text>
    )
  }

  if (isAllCapsSectionTitle(trimmed) && !trimmed.includes('=')) {
    return (
      <Text style={[occupancyMatchPdf.clauseSectionCaps, { paddingLeft: pad }]}>{raw.trim()}</Text>
    )
  }

  const subClause = /^\d+\.\d/.test(trimmed)
  if (subClause) {
    return (
      <Text style={[occupancyMatchPdf.clauseLine, { paddingLeft: pad + 14 }]} wrap>
        {raw.trim()}
      </Text>
    )
  }

  const main = trimmed.match(/^(\d+\.\s+)([\s\S]*)$/)
  if (main && main[1] && main[2] != null) {
    const rest = main[2]
    for (const prefix of TENANCY_AGREEMENT_BOLD_OPENERS) {
      if (rest.startsWith(prefix)) {
        return (
          <Text style={[occupancyMatchPdf.clauseLine, { paddingLeft: pad }]}>
            <Text>{main[1]}</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{prefix}</Text>
            <Text>{rest.slice(prefix.length)}</Text>
          </Text>
        )
      }
    }
  }

  return (
    <Text style={[occupancyMatchPdf.clauseLine, { paddingLeft: pad }]} wrap>
      {raw.trim()}
    </Text>
  )
}

/** Renders prescribed FT6600 clause / notes text in Occupancy-style body (single column). */
export function OccupancyMatchClauseChunk({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <View>
      {lines.map((line, i) => (
        <ClauseLineText key={i} line={line} />
      ))}
    </View>
  )
}

export function QuniRtaBrandedHeader({ showRightMeta }: { showRightMeta?: boolean }) {
  return (
    <View style={{ marginBottom: 4 }} wrap={false}>
      <View style={quniPdf.headerRow}>
        <View>
          <Text style={quniPdf.wordmark}>Quni Living</Text>
          <Text style={quniPdf.docTitle}>Residential Tenancy Agreement</Text>
          <Text style={quniPdf.headerItalicMeta}>
            Residential Tenancies Regulation 2019 Schedule 1 Standard Form Agreement (Clause 4(1))
          </Text>
        </View>
        {showRightMeta ? (
          <Text style={quniPdf.headerMetaRight}>Standard form from 19 May 2025 · FT6600</Text>
        ) : null}
      </View>
      <View style={quniPdf.headerRule} />
    </View>
  )
}

export function QuniAddendumBrandedHeader() {
  return (
    <View style={{ marginBottom: 4 }} wrap={false}>
      <Text style={quniPdf.wordmark}>Quni Living</Text>
      <Text style={quniPdf.docTitle}>Platform Addendum</Text>
      <Text style={quniPdf.headerItalicMeta}>Supplementary to the Residential Tenancy Agreement</Text>
      <View style={quniPdf.headerRule} />
    </View>
  )
}

export function QuniRtaPdfFooter() {
  return (
    <View style={quniPdf.footerWrap} fixed>
      <View style={quniPdf.footerRule} />
      <View style={quniPdf.footerRow}>
        <Text style={quniPdf.footerLeftRta}>Residential Tenancy Agreement · Quni Living</Text>
        <Text
          style={quniPdf.footerPageRta}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages != null && totalPages > 0 ? totalPages : '—'}`
          }
        />
      </View>
    </View>
  )
}

export function QuniAddendumPdfFooter() {
  return (
    <View style={quniPdf.footerWrap} fixed>
      <View style={quniPdf.footerRule} />
      <View style={quniPdf.footerRow}>
        <Text style={quniPdf.footerLeftAddendum}>Quni Living Platform Addendum</Text>
        <Text style={quniPdf.footerRightAddendum}>quni.com.au</Text>
      </View>
    </View>
  )
}

export function QuniRtaMarginStamp() {
  return (
    <View style={quniPdf.marginStampWrap} fixed>
      <Text style={quniPdf.marginStampText}>FT6600_171225</Text>
    </View>
  )
}
