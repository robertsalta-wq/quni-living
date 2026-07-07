import { Text, View } from '@react-pdf/renderer'
import { occupancyMatchPdf } from './quniDocumentPdfTheme.js'
import { platformAddendumDocusealTag } from './platformAddendumDocusealTags.js'

/** Co-tenant name on addendum summary when `additionalTenantNames[0]` is set. */
export function coTenantNameFromAddendumProps(additionalTenantNames?: string[]): string {
  return additionalTenantNames?.[0]?.trim() ?? ''
}

/** DocuSeal signature + date fields for co-tenant on the Quni platform addendum (role=Co-tenant). */
export function AddendumCoTenantSignatureBlock({ coTenantName }: { coTenantName: string }) {
  if (!coTenantName) return null
  return (
    <View
      style={{
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 0.5,
        borderTopColor: '#C4B8A8',
      }}
    >
      <Text style={[occupancyMatchPdf.thText, { marginBottom: 4 }]}>Co-tenant</Text>
      <Text style={occupancyMatchPdf.sigNameBold}>{coTenantName}</Text>
      <View style={[occupancyMatchPdf.docusealSignatureFieldBox, { marginTop: 6 }]}>
        <View style={occupancyMatchPdf.sigLabelRow}>
          <Text style={occupancyMatchPdf.sigLabel}>Signature </Text>
          <Text style={occupancyMatchPdf.docusealTagOa}>
            {platformAddendumDocusealTag('Addendum Co-tenant Signature', 'Co-tenant', 'signature')}
          </Text>
        </View>
      </View>
      <View style={occupancyMatchPdf.docusealDateFieldBox}>
        <View style={occupancyMatchPdf.sigLabelRow}>
          <Text style={occupancyMatchPdf.sigLabel}>Date </Text>
          <Text style={occupancyMatchPdf.docusealTagOa}>
            {platformAddendumDocusealTag('Addendum Co-tenant Date', 'Co-tenant', 'date')}
          </Text>
        </View>
      </View>
    </View>
  )
}
