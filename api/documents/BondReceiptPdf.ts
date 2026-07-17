// @ts-nocheck - Vercel API TS graph; createElement form so NFT resolves .js ? .ts (not .tsx)
import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
const coral = "#FF6F61";
const cream = "#FEF9E4";
const ink = "#1a1a1a";
const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 52,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: ink,
    lineHeight: 1.5,
    backgroundColor: "#fff"
  },
  header: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 20,
    borderRadius: 4,
    overflow: "hidden"
  },
  headerBrand: {
    backgroundColor: coral,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: "center"
  },
  headerBrandText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Helvetica-Bold"
  },
  headerSub: {
    flex: 1,
    backgroundColor: cream,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: "center"
  },
  headerSubText: {
    fontSize: 9,
    color: "#444"
  },
  title: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: coral,
    marginBottom: 14
  },
  row: { marginBottom: 8 },
  label: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#555", marginBottom: 2 },
  value: { fontSize: 10 },
  amount: { fontSize: 13, fontFamily: "Helvetica-Bold", color: ink },
  statement: {
    marginTop: 16,
    padding: 12,
    backgroundColor: cream,
    borderLeftWidth: 3,
    borderLeftColor: coral,
    fontSize: 9,
    lineHeight: 1.45
  },
  ack: {
    marginTop: 20,
    fontSize: 10,
    fontFamily: "Helvetica-Bold"
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 44,
    right: 44,
    fontSize: 8,
    color: "#666",
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    paddingTop: 8
  }
});
function BondReceiptPdf({
  receiptNumber,
  dateReceivedDisplay,
  propertyAddress,
  landlordName,
  landlordEmail,
  tenantName,
  amountDisplay,
  paymentMethod,
  notes,
  acknowledgementName
}) {
  return /* @__PURE__ */ React.createElement(Document, null, /* @__PURE__ */ React.createElement(Page, { size: "A4", style: styles.page }, /* @__PURE__ */ React.createElement(View, { style: styles.header }, /* @__PURE__ */ React.createElement(View, { style: styles.headerBrand }, /* @__PURE__ */ React.createElement(Text, { style: styles.headerBrandText }, "Quni Living")), /* @__PURE__ */ React.createElement(View, { style: styles.headerSub }, /* @__PURE__ */ React.createElement(Text, { style: styles.headerSubText }, "Student accommodation \xB7 quni.com.au"))), /* @__PURE__ */ React.createElement(Text, { style: styles.title }, "Bond Receipt - Boarding/Lodger Arrangement"), /* @__PURE__ */ React.createElement(View, { style: styles.row }, /* @__PURE__ */ React.createElement(Text, { style: styles.label }, "Receipt number"), /* @__PURE__ */ React.createElement(Text, { style: styles.value }, receiptNumber)), /* @__PURE__ */ React.createElement(View, { style: styles.row }, /* @__PURE__ */ React.createElement(Text, { style: styles.label }, "Date received"), /* @__PURE__ */ React.createElement(Text, { style: styles.value }, dateReceivedDisplay)), /* @__PURE__ */ React.createElement(View, { style: styles.row }, /* @__PURE__ */ React.createElement(Text, { style: styles.label }, "Property address"), /* @__PURE__ */ React.createElement(Text, { style: styles.value }, propertyAddress)), /* @__PURE__ */ React.createElement(View, { style: styles.row }, /* @__PURE__ */ React.createElement(Text, { style: styles.label }, "Landlord"), /* @__PURE__ */ React.createElement(Text, { style: styles.value }, landlordName, "\n", landlordEmail)), /* @__PURE__ */ React.createElement(View, { style: styles.row }, /* @__PURE__ */ React.createElement(Text, { style: styles.label }, "Tenant"), /* @__PURE__ */ React.createElement(Text, { style: styles.value }, tenantName)), /* @__PURE__ */ React.createElement(View, { style: styles.row }, /* @__PURE__ */ React.createElement(Text, { style: styles.label }, "Amount received"), /* @__PURE__ */ React.createElement(Text, { style: styles.amount }, amountDisplay)), /* @__PURE__ */ React.createElement(View, { style: styles.row }, /* @__PURE__ */ React.createElement(Text, { style: styles.label }, "Payment method"), /* @__PURE__ */ React.createElement(Text, { style: styles.value }, paymentMethod)), notes ? /* @__PURE__ */ React.createElement(View, { style: styles.row }, /* @__PURE__ */ React.createElement(Text, { style: styles.label }, "Notes"), /* @__PURE__ */ React.createElement(Text, { style: styles.value }, notes)) : null, /* @__PURE__ */ React.createElement(View, { style: styles.statement }, /* @__PURE__ */ React.createElement(Text, null, "This receipt confirms receipt of bond payment for the above boarding/lodger arrangement. This arrangement is not governed by the Residential Tenancies Act 2010 (NSW).")), /* @__PURE__ */ React.createElement(Text, { style: styles.ack }, "Acknowledged by: ", acknowledgementName), /* @__PURE__ */ React.createElement(Text, { style: styles.footer, fixed: true }, "Generated by Quni Living - quni.com.au")));
}
export {
  BondReceiptPdf
};
