import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { QldHouseRulesDocument, QldHouseRulesVariant } from '../lib/tenancy/qldHouseRules/document.js'
import { SCHEDULE_7_INSTRUMENT_CITATION } from '../lib/tenancy/qldHouseRules/schedule7.js'

const ink = '#1a1a1a'

const residentStyles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: ink,
    lineHeight: 1.45,
  },
  banner: {
    backgroundColor: '#FEF9E4',
    borderLeftWidth: 3,
    borderLeftColor: '#FF6F61',
    padding: 10,
    marginBottom: 14,
    fontSize: 9,
    lineHeight: 1.4,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  premises: {
    fontSize: 10,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginTop: 10,
    marginBottom: 6,
  },
  ruleTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginTop: 8,
    marginBottom: 3,
  },
  clause: {
    fontSize: 10,
    marginBottom: 3,
  },
  extraText: {
    fontSize: 10,
    marginBottom: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 44,
    right: 44,
    fontSize: 8,
    color: '#555',
    borderTopWidth: 0.5,
    borderTopColor: '#ddd',
    paddingTop: 6,
  },
  meta: {
    fontSize: 8,
    color: '#555',
    marginBottom: 10,
    lineHeight: 1.35,
  },
})

const wallStyles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 44,
    paddingHorizontal: 36,
    fontSize: 13,
    fontFamily: 'Helvetica',
    color: ink,
    lineHeight: 1.4,
  },
  banner: {
    backgroundColor: '#FEF9E4',
    borderLeftWidth: 4,
    borderLeftColor: '#FF6F61',
    padding: 12,
    marginBottom: 14,
    fontSize: 11,
    lineHeight: 1.35,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  premises: {
    fontSize: 13,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginTop: 12,
    marginBottom: 8,
  },
  ruleTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginTop: 10,
    marginBottom: 4,
  },
  clause: {
    fontSize: 13,
    marginBottom: 4,
  },
  extraText: {
    fontSize: 13,
    marginBottom: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 36,
    right: 36,
    fontSize: 9,
    color: '#555',
    borderTopWidth: 0.5,
    borderTopColor: '#ddd',
    paddingTop: 6,
  },
  meta: {
    fontSize: 10,
    color: '#555',
    marginBottom: 12,
    lineHeight: 1.35,
  },
})

const RESIDENT_BANNER =
  'Give this copy to the proposed resident before entering into a rooming accommodation agreement. Residential Tenancies and Rooming Accommodation Act 2008 s 275.'

const WALL_BANNER =
  'Display this copy at a place in the rental premises where it is likely to be seen by the residents. Residential Tenancies and Rooming Accommodation Act 2008 s 276.'

const PLATFORM_ENTITY = 'Quinnvestments Pty Ltd trading as Quni Living'

const FOOTER = `${PLATFORM_ENTITY} is not the provider or the provider's agent. This is not legal advice. Additional rules, if any, are limited to the subjects in the Act s 268(1).`

function clauseDisplayPrefix(id: string): string {
  const m = /^\d+\((.+)\)$/.exec(id)
  return m ? `(${m[1]}) ` : ''
}

export type QldHouseRulesPdfProps = {
  variant: QldHouseRulesVariant
  document: QldHouseRulesDocument
  generatedAtLabel: string
}

export function QldHouseRulesPdf({ variant, document, generatedAtLabel }: QldHouseRulesPdfProps) {
  const styles = variant === 'wall' ? wallStyles : residentStyles
  const title = variant === 'wall' ? 'HOUSE RULES' : 'House rules for rooming accommodation'
  const banner = variant === 'wall' ? WALL_BANNER : RESIDENT_BANNER

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.banner}>
          <Text>{banner}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>
          Source: {SCHEDULE_7_INSTRUMENT_CITATION}.{'\n'}
          Generated: {generatedAtLabel} (Australia/Brisbane).
        </Text>
        {document.premisesLine ? <Text style={styles.premises}>{document.premisesLine}</Text> : null}
        <Text style={styles.sectionHeading}>Prescribed house rules</Text>
        {document.prescribedRules.map((rule) => (
          <View key={rule.number}>
            <Text style={styles.ruleTitle}>
              {rule.number} {rule.title}
            </Text>
            {rule.clauses.map((clause) =>
              clause.text.split('\n').map((line, lineIdx) => (
                <Text key={`${clause.id}-${lineIdx}`} style={styles.clause}>
                  {lineIdx === 0 ? `${clauseDisplayPrefix(clause.id)}${line}` : line}
                </Text>
              )),
            )}
          </View>
        ))}
        {document.extraRules.length > 0 ? (
          <View>
            <Text style={styles.sectionHeading}>Additional house rules made by the provider</Text>
            {document.extraRules.map((extra) => (
              <View key={extra.subject}>
                <Text style={styles.ruleTitle}>{extra.heading}</Text>
                <Text style={styles.extraText}>{extra.text}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text style={styles.footer}>{FOOTER}</Text>
      </Page>
    </Document>
  )
}

export const QLD_HOUSE_RULES_PDF_MARKERS = {
  residentBanner: RESIDENT_BANNER,
  wallBanner: WALL_BANNER,
  footer: FOOTER,
  platformEntity: PLATFORM_ENTITY,
  prescribedHeading: 'Prescribed house rules',
  extrasHeading: 'Additional house rules made by the provider',
  instrumentCitation: SCHEDULE_7_INSTRUMENT_CITATION,
} as const
