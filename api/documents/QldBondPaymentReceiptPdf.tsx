// @ts-nocheck - Vercel API TS graph; JSX for @react-pdf/renderer
import React from 'react'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

const coral = '#FF6F61'
const cream = '#FEF9E4'
const ink = '#1a1a1a'

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 52,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: ink,
    lineHeight: 1.5,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 20,
    borderRadius: 4,
    overflow: 'hidden',
  },
  headerBrand: {
    backgroundColor: coral,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  headerBrandText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },
  headerSub: {
    flex: 1,
    backgroundColor: cream,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  headerSubText: {
    fontSize: 9,
    color: '#444',
  },
  title: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: coral,
    marginBottom: 14,
  },
  row: { marginBottom: 8 },
  label: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#555', marginBottom: 2 },
  value: { fontSize: 10 },
  amount: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: ink },
  statement: {
    marginTop: 16,
    padding: 12,
    backgroundColor: cream,
    borderLeftWidth: 3,
    borderLeftColor: coral,
    fontSize: 9,
    lineHeight: 1.45,
  },
  statementPara: { marginBottom: 8 },
  ack: {
    marginTop: 20,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 44,
    right: 44,
    fontSize: 8,
    color: '#666',
    borderTopWidth: 0.5,
    borderTopColor: '#ddd',
    paddingTop: 8,
  },
})

export type QldBondPaymentReceiptPdfProps = {
  receiptNumber: string
  dateReceivedDisplay: string
  propertyAddress: string
  landlordName: string
  landlordEmail: string
  tenantName: string
  amountDisplay: string
  paymentMethod: string
  notes: string | null
  acknowledgementName: string
}

/** QLD boarder/lodger: payment receipt only — not RTA lodgement confirmation. */
export function QldBondPaymentReceiptPdf({
  receiptNumber,
  dateReceivedDisplay,
  propertyAddress,
  landlordName,
  landlordEmail,
  tenantName,
  amountDisplay,
  paymentMethod,
  notes,
  acknowledgementName,
}: QldBondPaymentReceiptPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <Text style={styles.headerBrandText}>Quni Living</Text>
          </View>
          <View style={styles.headerSub}>
            <Text style={styles.headerSubText}>Student accommodation · quni.com.au</Text>
          </View>
        </View>

        <Text style={styles.title}>Bond Payment Receipt — Queensland Boarder/Lodger</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Receipt number</Text>
          <Text style={styles.value}>{receiptNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date received</Text>
          <Text style={styles.value}>{dateReceivedDisplay}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Property address</Text>
          <Text style={styles.value}>{propertyAddress}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Received by (landlord)</Text>
          <Text style={styles.value}>
            {landlordName}
            {'\n'}
            {landlordEmail}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Paid by (tenant)</Text>
          <Text style={styles.value}>{tenantName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Amount received</Text>
          <Text style={styles.amount}>{amountDisplay}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payment method</Text>
          <Text style={styles.value}>{paymentMethod}</Text>
        </View>
        {notes ? (
          <View style={styles.row}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.value}>{notes}</Text>
          </View>
        ) : null}

        <View style={styles.statement}>
          <Text style={styles.statementPara}>
            I, {landlordName}, acknowledge receipt of bond payment of {amountDisplay} from {tenantName} for the
            property at {propertyAddress} on {dateReceivedDisplay}.
          </Text>
          <Text style={styles.statementPara}>
            This document is a payment receipt only. It is not confirmation of lodgement with the Residential Tenancies
            Authority (RTA Queensland).
          </Text>
          <Text style={styles.statementPara}>
            Under Queensland law, bond must be lodged with the RTA within 10 calendar days of receipt. Bond must not be
            kept in a personal account. The RTA Acknowledgement of Rental Bond is the official lodgement confirmation
            issued to both parties once payment clears.
          </Text>
          <Text>
            Lodgement: RTA Web Services (Queensland Digital Identity required) or paper Form 2 — see rta.qld.gov.au.
          </Text>
        </View>

        <Text style={styles.ack}>Acknowledged by: {acknowledgementName}</Text>

        <Text style={styles.footer} fixed>
          Generated by Quni Living - quni.com.au
        </Text>
      </Page>
    </Document>
  )
}
