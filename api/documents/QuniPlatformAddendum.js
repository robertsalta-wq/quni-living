// src/lib/documents/QuniPlatformAddendum.tsx
import { Document, Page, Text as Text2, View as View2 } from "@react-pdf/renderer";

// src/lib/documents/quniDocumentPdfTheme.tsx
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { jsx, jsxs } from "react/jsx-runtime";
var quniPdf = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 52,
    paddingLeft: 36,
    paddingRight: 44,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#222222",
    lineHeight: 1.5,
    backgroundColor: "#ffffff"
  },
  pageDense: {
    fontSize: 10,
    lineHeight: 1.5
  },
  wordmark: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#FF6F61",
    marginBottom: 4
  },
  docTitle: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
    marginBottom: 4
  },
  headerItalicMeta: {
    fontSize: 8,
    fontFamily: "Helvetica",
    fontStyle: "italic",
    color: "#666666",
    marginBottom: 8
  },
  headerMetaRight: {
    fontSize: 8,
    color: "#888888",
    textAlign: "right",
    maxWidth: 200
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2
  },
  headerRule: {
    borderBottomWidth: 1,
    borderBottomColor: "#FF6F61",
    marginBottom: 12
  },
  sectionRule: {
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    marginTop: 10,
    marginBottom: 10
  },
  sectionHeading: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 8,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#FF6F61",
    backgroundColor: "#ffffff"
  },
  subSectionHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#333333",
    marginTop: 6,
    marginBottom: 4
  },
  body: {
    fontSize: 11,
    lineHeight: 1.5,
    color: "#222222"
  },
  bodyDense: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#222222"
  },
  notesText: {
    fontSize: 9,
    lineHeight: 1.5,
    fontStyle: "italic",
    color: "#555555"
  },
  fieldBlock: {
    marginBottom: 8
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#333333",
    marginBottom: 3
  },
  fieldBox: {
    borderWidth: 1,
    borderColor: "#cccccc",
    backgroundColor: "#ffffff",
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 22
  },
  fieldBoxTall: {
    minHeight: 48
  },
  fieldValue: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#222222"
  },
  fieldInlineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 8
  },
  checkboxOuter: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: "#999999",
    backgroundColor: "#ffffff",
    marginRight: 6
  },
  checkboxLabel: {
    fontSize: 10,
    color: "#222222"
  },
  moreInfoBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#FFF8F7",
    borderWidth: 1,
    borderColor: "#FFD5CF"
  },
  moreInfoText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#222222"
  },
  footerWrap: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 44
  },
  footerRule: {
    borderTopWidth: 1,
    borderTopColor: "#FF6F61",
    marginBottom: 6
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end"
  },
  footerLeftRta: {
    fontSize: 8,
    color: "#FF6F61"
  },
  footerPageRta: {
    fontSize: 8,
    color: "#999999"
  },
  footerLeftAddendum: {
    fontSize: 8,
    color: "#FF6F61"
  },
  footerRightAddendum: {
    fontSize: 8,
    color: "#FF6F61"
  },
  marginStampWrap: {
    position: "absolute",
    right: 8,
    top: 200,
    width: 14,
    transform: "rotate(90deg)"
  },
  marginStampText: {
    fontSize: 7,
    color: "#bbbbbb"
  },
  sigFieldBox: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#cccccc",
    backgroundColor: "#ffffff",
    minHeight: 40,
    marginBottom: 10,
    paddingHorizontal: 6,
    paddingVertical: 4
  },
  sigDateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    marginBottom: 4
  },
  docusealTag: { fontSize: 1, color: "#FFFFFF" },
  bullet: { marginLeft: 10, marginBottom: 3 },
  clauseColumnsRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  clauseColumn: {
    width: "48%"
  }
});
var occupancyMatchPdf = StyleSheet.create({
  page: {
    paddingTop: 88,
    paddingBottom: 72,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#2C2417",
    lineHeight: 1.45,
    backgroundColor: "#FAF6EE"
  },
  headerWrap: {
    position: "absolute",
    top: 28,
    left: 40,
    right: 40
  },
  oaHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  brandQuni: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#C9672A",
    letterSpacing: 0.3
  },
  headerRightBlock: { alignItems: "flex-end", maxWidth: 280 },
  headerDocTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#C9672A",
    textAlign: "right",
    marginBottom: 2
  },
  headerSubtitle: {
    fontSize: 8,
    color: "#7A736C",
    textAlign: "right"
  },
  oaHeaderRule: {
    marginTop: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: "#C9672A",
    width: "100%"
  },
  footerWrapOa: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40
  },
  footerRuleOa: {
    borderTopWidth: 1.5,
    borderTopColor: "#C9672A",
    width: "100%",
    marginBottom: 6
  },
  footerRowOa: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end"
  },
  footerLeftCoral: {
    fontSize: 7.5,
    color: "#C9672A",
    flex: 1,
    paddingRight: 8
  },
  footerPageCoral: {
    fontSize: 7.5,
    color: "#C9672A"
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 12,
    marginBottom: 6
  },
  sectionBadge: {
    width: 18,
    height: 18,
    backgroundColor: "#C9672A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginTop: 1
  },
  sectionBadgeText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF"
  },
  sectionTitleCol: { flex: 1 },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#2C2417",
    marginBottom: 4
  },
  sectionHeadingRule: {
    borderBottomWidth: 1,
    borderBottomColor: "#C9672A",
    width: "100%"
  },
  bodyParagraph: {
    marginBottom: 5,
    textAlign: "justify"
  },
  hRuleLight: {
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    width: "100%",
    marginTop: 8,
    marginBottom: 8
  },
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#D4C9B8"
  },
  dataRowA: { backgroundColor: "#FAF6EE" },
  dataRowB: { backgroundColor: "#F5EDD8" },
  dataLabelCell: {
    width: "32%",
    paddingVertical: 4,
    paddingHorizontal: 7
  },
  dataValueCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 7
  },
  dataLabel: { fontSize: 8, color: "#6B6560" },
  dataValueBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#2C2417" },
  tableWrap: {
    marginTop: 6,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: "#C4B8A8"
  },
  thRow: {
    flexDirection: "row",
    backgroundColor: "#C9672A",
    borderBottomWidth: 0.5,
    borderBottomColor: "#C9672A"
  },
  thCell: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRightWidth: 0.5,
    borderRightColor: "#FFFFFF"
  },
  thCellLast: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 6
  },
  thText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  noteBox: {
    marginTop: 8,
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#F5EDD8",
    borderWidth: 0.5,
    borderColor: "#E8DFD0"
  },
  noteItalic: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Oblique",
    color: "#2C2417",
    lineHeight: 1.5
  },
  noteItalicMuted: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Oblique",
    color: "#555555",
    lineHeight: 1.5
  },
  clauseLine: { marginBottom: 3, textAlign: "justify" },
  clauseSectionCaps: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#2C2417",
    marginTop: 6,
    marginBottom: 3
  },
  checkboxOuter: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: "#999999",
    backgroundColor: "#FFFFFF",
    marginRight: 6
  },
  checkboxLabel: { fontSize: 8.5, color: "#2C2417" },
  sigTable: {
    marginTop: 10,
    borderWidth: 0.5,
    borderColor: "#C4B8A8"
  },
  sigHeaderRow: { flexDirection: "row", backgroundColor: "#C9672A" },
  sigHeaderCell: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRightWidth: 0.5,
    borderRightColor: "#FFFFFF"
  },
  sigHeaderCellLast: { flex: 1, paddingVertical: 7, paddingHorizontal: 10 },
  sigBodyRow: { flexDirection: "row", minHeight: 220 },
  sigCol: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRightWidth: 0.5,
    borderRightColor: "#D4C9B8",
    backgroundColor: "#FAF6EE"
  },
  sigColLast: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#F5EDD8"
  },
  sigNameBold: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#2C2417", marginBottom: 12 },
  sigLabelRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 4, flexWrap: "wrap" },
  sigLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#C9672A" },
  sigSpace: {
    marginTop: 18,
    borderBottomWidth: 0.75,
    borderBottomColor: "#2C2417",
    marginBottom: 14,
    minHeight: 20
  },
  sigBorderBox: {
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: "#C4B8A8",
    backgroundColor: "#FAF6EE",
    minHeight: 40,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 8
  },
  /** DocuSeal field regions — minimum heights for comfortable signing (react-pdf px). */
  docusealSignatureFieldBox: {
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: "#C4B8A8",
    backgroundColor: "#FAF6EE",
    minHeight: 100,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 8
  },
  docusealDateFieldBox: {
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: "#C4B8A8",
    backgroundColor: "#FAF6EE",
    minHeight: 60,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 8
  },
  docusealTagOa: { fontSize: 1, color: "#FFFFFF" }
});
function OccupancyMatchFixedHeader({
  documentTitle,
  subtitle
}) {
  return /* @__PURE__ */ jsxs(View, { style: occupancyMatchPdf.headerWrap, fixed: true, children: [
    /* @__PURE__ */ jsxs(View, { style: occupancyMatchPdf.oaHeaderRow, children: [
      /* @__PURE__ */ jsx(Text, { style: occupancyMatchPdf.brandQuni, children: "Quni" }),
      /* @__PURE__ */ jsxs(View, { style: occupancyMatchPdf.headerRightBlock, children: [
        /* @__PURE__ */ jsx(Text, { style: occupancyMatchPdf.headerDocTitle, children: documentTitle }),
        /* @__PURE__ */ jsx(Text, { style: occupancyMatchPdf.headerSubtitle, children: subtitle })
      ] })
    ] }),
    /* @__PURE__ */ jsx(View, { style: occupancyMatchPdf.oaHeaderRule })
  ] });
}
function OccupancyMatchFooter({
  documentId,
  generatedAt,
  variant
}) {
  const left = variant === "rta" ? `Quni Living \xB7 Residential Tenancy Agreement \xB7 Document ID: ${documentId} \xB7 Generated: ${generatedAt}` : `Quni Living \xB7 Platform Addendum \xB7 Document ID: ${documentId} \xB7 Generated: ${generatedAt}`;
  return /* @__PURE__ */ jsxs(View, { style: occupancyMatchPdf.footerWrapOa, fixed: true, children: [
    /* @__PURE__ */ jsx(View, { style: occupancyMatchPdf.footerRuleOa }),
    /* @__PURE__ */ jsxs(View, { style: occupancyMatchPdf.footerRowOa, children: [
      /* @__PURE__ */ jsx(Text, { style: occupancyMatchPdf.footerLeftCoral, children: left }),
      /* @__PURE__ */ jsx(
        Text,
        {
          style: occupancyMatchPdf.footerPageCoral,
          render: ({ pageNumber, totalPages }) => `Page ${pageNumber}${totalPages ? ` of ${totalPages}` : ""}`
        }
      )
    ] })
  ] });
}
function OccupancyMatchSectionHeading({ num, title }) {
  return /* @__PURE__ */ jsxs(View, { style: occupancyMatchPdf.sectionRow, wrap: false, children: [
    /* @__PURE__ */ jsx(View, { style: occupancyMatchPdf.sectionBadge, children: /* @__PURE__ */ jsx(Text, { style: occupancyMatchPdf.sectionBadgeText, children: String(num) }) }),
    /* @__PURE__ */ jsxs(View, { style: occupancyMatchPdf.sectionTitleCol, children: [
      /* @__PURE__ */ jsx(Text, { style: occupancyMatchPdf.sectionTitle, children: title }),
      /* @__PURE__ */ jsx(View, { style: occupancyMatchPdf.sectionHeadingRule })
    ] })
  ] });
}
function OccupancyMatchScheduleTable({
  rows
}) {
  return /* @__PURE__ */ jsxs(View, { style: occupancyMatchPdf.tableWrap, children: [
    /* @__PURE__ */ jsxs(View, { style: occupancyMatchPdf.thRow, children: [
      /* @__PURE__ */ jsx(View, { style: occupancyMatchPdf.thCell, children: /* @__PURE__ */ jsx(Text, { style: occupancyMatchPdf.thText, children: "Item" }) }),
      /* @__PURE__ */ jsx(View, { style: occupancyMatchPdf.thCellLast, children: /* @__PURE__ */ jsx(Text, { style: occupancyMatchPdf.thText, children: "Particulars" }) })
    ] }),
    rows.map((r, i) => /* @__PURE__ */ jsxs(
      View,
      {
        style: [
          occupancyMatchPdf.dataRow,
          i % 2 === 0 ? occupancyMatchPdf.dataRowA : occupancyMatchPdf.dataRowB
        ],
        children: [
          /* @__PURE__ */ jsx(View, { style: occupancyMatchPdf.dataLabelCell, children: /* @__PURE__ */ jsx(Text, { style: occupancyMatchPdf.dataLabel, children: r.label.trim() === "" ? " " : r.label }) }),
          /* @__PURE__ */ jsx(View, { style: occupancyMatchPdf.dataValueCell, children: typeof r.value === "string" ? /* @__PURE__ */ jsx(Text, { style: occupancyMatchPdf.dataValueBold, children: r.value }) : /* @__PURE__ */ jsx(View, { children: r.value }) })
        ]
      },
      i
    ))
  ] });
}

// src/lib/documents/QuniPlatformAddendum.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var QUNI_MAINTENANCE_PORTAL_URL = "https://quni.com.au/maintenance";
var QUNI_MOVE_OUT_FORM_URL = "https://quni.com.au/move-out";
function formatMoney(n) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}
function formatAuDate(iso) {
  const d = iso.slice(0, 10);
  const parts = d.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, day] = parts;
  if (!y || !m || !day) return iso;
  return `${day}/${m}/${y}`;
}
function yn(v) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "\u2014";
}
function formatBsbDisplay(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return raw.trim();
}
function Section1TenancySummary(props) {
  const { landlord, tenant, premises, term, rent, bond, utilitiesDescription } = props;
  const landlordDisplay = landlord.companyName ? `${landlord.fullName} (${landlord.companyName})` : landlord.fullName;
  const endDateText = term.periodic || !term.endDate ? "Periodic tenancy (no fixed end date)" : formatAuDate(term.endDate);
  const bondText = bond.amount != null && Number.isFinite(bond.amount) ? formatMoney(bond.amount) : "\u2014";
  const rows = [
    { label: "Property address:", value: premises.addressLine },
    { label: "Room type:", value: premises.roomType?.trim() || "\u2014" },
    { label: "Landlord:", value: landlordDisplay },
    { label: "Landlord email:", value: landlord.email },
    { label: "Landlord phone:", value: landlord.phone },
    { label: "Tenant:", value: tenant.fullName },
    { label: "Tenant email:", value: tenant.email },
    { label: "Tenant phone:", value: tenant.phone }
  ];
  if (tenant.dateOfBirth) {
    rows.push({ label: "Tenant date of birth:", value: formatAuDate(tenant.dateOfBirth) });
  }
  rows.push(
    { label: "Tenancy start date:", value: formatAuDate(term.startDate) },
    { label: "Tenancy end date:", value: endDateText },
    { label: "Lease length:", value: term.leaseLengthDescription },
    { label: "Weekly rent:", value: formatMoney(rent.weeklyRent) },
    { label: "Payment method (as stated in the agreement):", value: rent.paymentMethod },
    { label: "Bond amount:", value: bondText },
    { label: "Furnished:", value: yn(premises.furnished) },
    { label: "Linen supplied:", value: yn(premises.linenSupplied) },
    { label: "Weekly cleaning service:", value: yn(premises.weeklyCleaningService) },
    {
      label: "Utilities / services (summary):",
      value: utilitiesDescription.trim() || "\u2014"
    }
  );
  return /* @__PURE__ */ jsxs2(View2, { style: { marginTop: 4, marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 1, title: "Tenancy summary" }),
    /* @__PURE__ */ jsx2(OccupancyMatchScheduleTable, { rows })
  ] });
}
function Section2QuniPlatformAndFee(props) {
  const { rent, rentPaymentMethod, bankDetails } = props;
  const bsb = formatBsbDisplay(bankDetails.bsb.trim());
  const acct = bankDetails.accountNumber.trim();
  const name = bankDetails.accountName.trim();
  const bankName = bankDetails.bankName.trim();
  const bankRows = [
    { label: "Account name:", value: name || "\u2014" },
    { label: "BSB:", value: bsb || "\u2014" },
    { label: "Account number:", value: acct || "\u2014" },
    { label: "Bank:", value: bankName || "\u2014" }
  ];
  const cardDomestic = "1.7% + $0.30 per transaction (domestic cards)";
  const cardInternational = "3.5% + $0.30 per transaction (international cards)";
  return /* @__PURE__ */ jsxs2(View2, { style: { marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 2, title: "Quni platform & service fee" }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: 'Quni Living Pty Ltd (the "Platform") operates an online marketplace and payment facilitation service. The Platform is not the landlord, property manager, or agent for the residential premises unless separately appointed in writing. The landlord remains responsible for managing the tenancy and the premises in accordance with the Residential Tenancies Act 2010 (NSW) and the standard form agreement.' }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "A service fee of 10% of the gross weekly rent is deducted from amounts payable to the landlord through the Platform before payout to the landlord, as disclosed in the landlord service agreement and listing terms. The tenant's agreed weekly rent is not increased by this fee." }),
    /* @__PURE__ */ jsx2(Text2, { style: [occupancyMatchPdf.bodyParagraph, { marginTop: 6 }], children: "Rent is payable by direct bank transfer using the following account details (reference your name and the property address when transferring):" }),
    /* @__PURE__ */ jsx2(OccupancyMatchScheduleTable, { rows: bankRows.map((r) => ({ label: r.label, value: r.value })) }),
    rentPaymentMethod === "quni_platform" ? /* @__PURE__ */ jsx2(View2, { style: [occupancyMatchPdf.noteBox, { marginTop: 6 }], children: /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.noteItalicMuted, children: [
      "The tenant has elected (where available) to pay recurring rent via card through the Quni platform. Card payments incur a payment processing surcharge passed through at Stripe's actual cost \u2014 typically",
      " ",
      cardDomestic,
      ", or ",
      cardInternational,
      ". The agreed rent amount is unchanged; the surcharge is shown separately at checkout."
    ] }) }) : null,
    /* @__PURE__ */ jsx2(Text2, { style: [occupancyMatchPdf.bodyParagraph, { marginTop: 6 }], children: "A fee-free bank transfer option remains available at all times for recurring rent in accordance with the Residential Tenancies Act 2010 (NSW) (including section 35 where applicable)." }),
    /* @__PURE__ */ jsxs2(Text2, { style: [occupancyMatchPdf.bodyParagraph, { marginTop: 4 }], children: [
      "The payment method summary in the tenancy agreement (Section 1 above) remains part of the agreed rent arrangements: ",
      rent.paymentMethod
    ] })
  ] });
}
function Section3CommunicationChannels(props) {
  const { emergencyContact, rentEnquiriesEmail, generalEnquiriesEmail, houseCommunicationsChannel } = props;
  const rows = [
    { label: "Maintenance portal (non-urgent requests):", value: QUNI_MAINTENANCE_PORTAL_URL },
    { label: "Emergency contact (urgent repairs):", value: emergencyContact.trim() || "\u2014" },
    { label: "Move-out notice form:", value: QUNI_MOVE_OUT_FORM_URL },
    { label: "Rent account enquiries:", value: rentEnquiriesEmail.trim() || "\u2014" },
    { label: "General enquiries:", value: generalEnquiriesEmail.trim() || "\u2014" },
    { label: "House communications:", value: houseCommunicationsChannel.trim() || "\u2014" }
  ];
  return /* @__PURE__ */ jsxs2(View2, { style: { marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 3, title: "Communication channels" }),
    /* @__PURE__ */ jsx2(Text2, { style: [occupancyMatchPdf.bodyParagraph, { marginBottom: 6 }], children: "The tenant should use the channels below for requests, notices and day-to-day communication. Urgent safety issues should be directed to the emergency contact immediately." }),
    /* @__PURE__ */ jsx2(OccupancyMatchScheduleTable, { rows: rows.map((r) => ({ label: r.label, value: r.value })) })
  ] });
}
function Section4MaintenanceAndRepairs(_props) {
  return /* @__PURE__ */ jsxs2(View2, { style: { marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 4, title: "Maintenance & repairs" }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "Non-urgent maintenance requests (for example dripping taps, minor appliance faults, or common-area cleaning issues) must be lodged through the maintenance portal listed in Section 3. The tenant should include a clear description, photos where helpful, and safe access notes." }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "Urgent repairs that affect health, safety, or security \u2014 including burst pipes, electrical hazards, gas smells, serious leaks, or a failure of essential services \u2014 must be reported immediately using the emergency contact in Section 3. If the emergency contact cannot be reached and there is an immediate risk to persons or property, the tenant should also follow any emergency services guidance (including 000 where appropriate)." }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "The landlord (or their authorised tradesperson) will use reasonable endeavours to respond to urgent items without undue delay. Response times for non-urgent items depend on severity, parts availability, and access; the parties agree to communicate promptly through the portal where additional information is required." }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "The tenant is responsible for damage caused by the tenant, their guests, or invitees (including through misuse, negligence, or failure to report issues promptly). Fair wear and tear is excluded. Where damage is tenant caused, the landlord may seek reimbursement in accordance with the Residential Tenancies Act 2010 (NSW) and the standard form agreement, including via bond claim processes where applicable." })
  ] });
}
function Section5UtilitiesAndBills(props) {
  return /* @__PURE__ */ jsxs2(View2, { style: { marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 5, title: "Utilities & bills" }),
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      "Rent is calculated on an all-inclusive basis covering ",
      props.utilitiesDescription.toLowerCase(),
      "."
    ] }),
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      "A utilities allowance of ",
      formatMoney(props.utilitiesCap),
      " per quarter applies. Usage within this allowance is included in rent."
    ] }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "Usage in excess of the quarterly allowance must be paid by the tenant within 14 days of invoice (or as otherwise agreed in writing). Evidence of usage may be supplied as utility account summaries, meter readings, or other reasonable records consistent with how similar properties are typically managed through the platform." }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "The tenant must not deliberately waste utilities or circumvent metering. Where excessive usage is clearly tenant-caused, the landlord may request reimbursement in addition to any excess-usage amount, acting reasonably and with supporting information where practicable." }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "Where internet is included, connection or resumption of service may depend on supplier processes. The tenant must not reconfigure network equipment in a way that could impair other occupants or security devices. Personal streaming, gaming, or study use within ordinary household norms is expected; commercial server hosting or resale of bandwidth is not permitted unless agreed in writing." })
  ] });
}
function Section6HouseRules(props) {
  const raw = props.houseRules.trim();
  const blocks = raw ? raw.split(/\n{2,}/) : [];
  return /* @__PURE__ */ jsxs2(View2, { style: { marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 6, title: "House rules" }),
    blocks.length === 0 ? /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "House rules recorded for this property on the Quni platform apply for the duration of the tenancy, subject to the Residential Tenancies Act 2010 (NSW) and the standard form agreement." }) : blocks.map((block, i) => {
      const lines = block.split("\n");
      const first = (lines[0] ?? "").trim();
      const looksLikeCapsHeading = first.length > 0 && first.length <= 72 && first === first.toUpperCase() && /^[A-Z0-9][A-Z0-9 &,.()/\-]+$/.test(first);
      const rest = looksLikeCapsHeading ? lines.slice(1).join("\n").trim() : block.trim();
      return /* @__PURE__ */ jsxs2(View2, { wrap: false, style: { marginBottom: 6 }, children: [
        looksLikeCapsHeading ? /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.clauseSectionCaps, children: first }) : null,
        rest ? /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: rest }) : looksLikeCapsHeading ? null : /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: block.trim() })
      ] }, i);
    })
  ] });
}
function Section7MouldPrevention(_props) {
  return /* @__PURE__ */ jsxs2(View2, { style: { marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 7, title: "Mould prevention" }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "The tenant must keep the premises reasonably ventilated, including by using exhaust fans or opening windows when cooking, showering, or drying laundry indoors, where safe and consistent with security." }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "Condensation on windows or walls should be wiped dry promptly. The tenant must not block fixed ventilation grilles, subfloor vents, or weep holes, and must not store belongings or materials in a way that traps moisture against walls, floors, or joinery." }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "Any visible mould, persistent damp smell, water ingress, or bubbling paint or plaster must be reported through the maintenance portal without delay. Early reporting helps limit damage and repair cost." }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "The tenant is responsible for day-to-day cleaning of surfaces they use (including bathrooms and kitchen areas) in line with ordinary household standards. Where mould arises from lack of ventilation or cleaning that a reasonable tenant would undertake, the tenant may be responsible for remediation costs acting reasonably and in accordance with the Residential Tenancies Act 2010 (NSW)." })
  ] });
}
function Section8ConditionReport(_props) {
  return /* @__PURE__ */ jsxs2(View2, { style: { marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 8, title: "Condition report" }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "The parties acknowledge that an ingoing condition report may be prepared for the premises (or the rented part of the premises) in accordance with the Residential Tenancies Act 2010 (NSW) and the standard form agreement. The tenant will be given a reasonable opportunity to review and comment on the report and to attach photographs where appropriate." }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "The tenant should return a signed copy (or written comments) within the timeframe notified by the landlord or the platform, failing which the report may be taken as accepted except for manifest errors or items the tenant could not reasonably have inspected." }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "At the end of the tenancy, an outgoing condition report may be used to compare the state of the premises with the ingoing report, fair wear and tear excepted. The tenant should attend any scheduled inspection where practicable and should lodge final meter readings or other handover items through the move-out workflow when requested." })
  ] });
}
function Section9MoveOutProcedures(props) {
  const dailyRent = props.rent.weeklyRent / 7;
  const feeRows = [
    {
      label: "Cleaning (if not to standard)",
      value: "$150 per hour, minimum charge $150"
    },
    {
      label: "Removal of personal items / rubbish left behind",
      value: "$250 per hour, minimum charge $250"
    },
    {
      label: "Late checkout (after 10:00am on vacate date)",
      value: "$50 flat fee"
    },
    {
      label: "Late checkout (still occupying after midnight on vacate date)",
      value: `Full day rent (${formatMoney(dailyRent)} \u2014 one-seventh of the agreed weekly rent)`
    },
    {
      label: "Linen replacement if significantly damaged",
      value: "Replacement cost (charged at actual cost)"
    },
    {
      label: "International bank transfer administration (bond refund)",
      value: "$50 flat fee"
    }
  ];
  return /* @__PURE__ */ jsxs2(View2, { style: { marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 9, title: "Move-out procedures" }),
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      "To end the tenancy, the tenant must give notice in accordance with the Residential Tenancies Act 2010 (NSW), the standard form agreement, and any agreed notice period. Where the platform collects a move-out notice, the tenant should complete the move-out notice form at ",
      QUNI_MOVE_OUT_FORM_URL,
      " and keep a copy of any confirmation received."
    ] }),
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      "Unless otherwise agreed in writing, the tenant must vacate and return possession by",
      " ",
      /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: "Helvetica-Bold" }, children: "10:00am" }),
      " on the agreed vacate date. If the tenant remains after 10:00am, a ",
      /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: "Helvetica-Bold" }, children: "$50" }),
      " late checkout flat fee applies. If the tenant is still occupying the room after midnight on the vacate date, the tenant agrees that",
      " ",
      /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: "Helvetica-Bold" }, children: "full day rent" }),
      " applies for that day, calculated as one day's rent (one-seventh of the agreed weekly rent), currently ",
      formatMoney(dailyRent),
      " per day, in addition to any other amounts lawfully payable."
    ] }),
    /* @__PURE__ */ jsx2(Text2, { style: [occupancyMatchPdf.bodyParagraph, { marginTop: 4, fontFamily: "Helvetica-Bold" }], children: "Cleaning checklist \u2014 the tenant must leave the room in the following condition:" }),
    /* @__PURE__ */ jsx2(View2, { style: { marginBottom: 6, paddingLeft: 4 }, children: /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      "\u2022 Vacuum and mop all floors including under bed and furniture",
      "\n",
      "\u2022 Wipe walls, skirting boards, windowsills, and windows",
      "\n",
      "\u2022 Clean all cupboards, drawers, and storage used by the tenant",
      "\n",
      "\u2022 Clean bathroom and toilet thoroughly",
      "\n",
      "\u2022 Remove all personal items from the room, bathroom, kitchen, and communal areas",
      "\n",
      "\u2022 Wash and return all provided linen clean",
      "\n",
      "\u2022 Ensure all light fittings have working globes",
      "\n",
      "\u2022 Remove food from the fridge and clean the tenant's allocated fridge space",
      "\n",
      "\u2022 Return all keys as directed"
    ] }) }),
    /* @__PURE__ */ jsx2(Text2, { style: [occupancyMatchPdf.bodyParagraph, { marginTop: 4, fontFamily: "Helvetica-Bold" }], children: "Fee schedule (indicative \u2014 charged where applicable and lawfully recoverable):" }),
    /* @__PURE__ */ jsx2(OccupancyMatchScheduleTable, { rows: feeRows.map((r) => ({ label: r.label, value: r.value })) }),
    /* @__PURE__ */ jsx2(Text2, { style: [occupancyMatchPdf.bodyParagraph, { marginTop: 4 }], children: "The tenant should supply a forwarding address and contact details for bond and correspondence. Bond release (if applicable) will follow NSW Fair Trading requirements and any instructions given through the signing or bond workflow. The parties agree to cooperate promptly with reasonable requests for information needed to finalise the tenancy." })
  ] });
}
function Section10Bond(props) {
  const bond = props.bond.amount;
  return /* @__PURE__ */ jsxs2(View2, { style: { marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 10, title: "Bond" }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "Any bond paid or held for this tenancy is dealt with in accordance with the Residential Tenancies Act 2010 (NSW), the standard form agreement, and NSW Fair Trading requirements (including any applicable residential bond scheme rules)." }),
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      "The bond amount recorded in the tenancy agreement is",
      " ",
      bond != null && Number.isFinite(bond) && bond > 0 ? formatMoney(bond) : "as stated in the tenancy agreement",
      ". The parties agree to complete any bond lodgement, variation, or claim steps notified through the platform or the landlord's agent, and to provide accurate bank details for refunds where required."
    ] }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "Where an international bank transfer administration fee applies to a bond refund (as set out in the move-out fee schedule), that fee is separate from the bond amount and is payable only where applicable and lawfully recoverable." })
  ] });
}
function Section11InspectionsAndAccess(_props) {
  const noticeRows = [
    { purpose: "Emergency repairs", notice: "No notice required" },
    { purpose: "Non-urgent repairs", notice: "24 hours" },
    {
      purpose: "Routine inspection",
      notice: "7 days written notice (maximum 4 per year)"
    },
    {
      purpose: "Show premises to prospective tenant",
      notice: "24 hours (last 14 days of agreement only)"
    },
    {
      purpose: "Property valuation",
      notice: "7 days (maximum 1 per year)"
    }
  ];
  return /* @__PURE__ */ jsxs2(View2, { style: { marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 11, title: "Inspections & access" }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "The landlord (or their authorised agent) may enter the premises to carry out inspections, repairs, maintenance, or compliance activities in accordance with the Residential Tenancies Act 2010 (NSW) and the standard form agreement, including the rules about notice and reasonable grounds." }),
    /* @__PURE__ */ jsxs2(View2, { style: [occupancyMatchPdf.tableWrap, { marginTop: 6, marginBottom: 8 }], children: [
      /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.thRow, children: [
        /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.thCell, children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.thText, children: "Purpose" }) }),
        /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.thCellLast, children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.thText, children: "Minimum notice required" }) })
      ] }),
      noticeRows.map((r, i) => /* @__PURE__ */ jsxs2(
        View2,
        {
          style: [
            occupancyMatchPdf.dataRow,
            i % 2 === 0 ? occupancyMatchPdf.dataRowA : occupancyMatchPdf.dataRowB
          ],
          children: [
            /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.dataLabelCell, children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.dataLabel, children: r.purpose }) }),
            /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.dataValueCell, children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.dataValueBold, children: r.notice }) })
          ]
        },
        i
      ))
    ] }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "Unless an emergency applies, entry should be arranged with reasonable written notice (or as otherwise required by law) and at a reasonable time. The tenant should not unreasonably withhold access where entry is lawful. Where the tenant cannot attend, they may propose an alternative reasonable time within the constraints of tradespeople or scheduled works." }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "Photographs or short videos taken during lawful inspections or maintenance visits must not capture unrelated private areas of the tenant's room beyond what is reasonably necessary for the stated purpose. Marketing or listing photography should not be taken in the tenant's private room without prior agreement consistent with the Act and any house rules." }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "The tenant must not change locks or security devices without consent except where permitted by law. Any keys, fobs, or access devices issued must be returned at the end of the tenancy as directed." })
  ] });
}
function Section12Termination(props) {
  const w = props.rent.weeklyRent;
  const breakRows = [
    { elapsed: "Less than 25% of the fixed term", fee: `4 weeks rent (${formatMoney(w * 4)})` },
    { elapsed: "25% to less than 50% of the fixed term", fee: `3 weeks rent (${formatMoney(w * 3)})` },
    { elapsed: "50% to less than 75% of the fixed term", fee: `2 weeks rent (${formatMoney(w * 2)})` },
    { elapsed: "75% or more of the fixed term", fee: `1 week rent (${formatMoney(w * 1)})` }
  ];
  return /* @__PURE__ */ jsxs2(View2, { style: { marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 12, title: "Termination" }),
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      "From ",
      /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: "Helvetica-Bold" }, children: "19 May 2025" }),
      ", 'no grounds' terminations by landlords were abolished for most residential tenancies in NSW. This addendum does not override the Residential Tenancies Act 2010 (NSW) or the prescribed standard form agreement."
    ] }),
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: "Helvetica-Bold" }, children: "Tenant pathways (summary):" }),
      " end a periodic tenancy by giving notice in the form and for the period required by the Act and agreement; end a fixed-term tenancy at expiry by vacating in accordance with notice rules; leave early where permitted (for example mutual consent, an order of the NSW Civil and Administrative Tribunal (NCAT), hardship provisions where they apply, or a break fee if a valid break-fee clause applies to a qualifying fixed term)."
    ] }),
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: "Helvetica-Bold" }, children: "Landlord pathways (summary):" }),
      " end a tenancy only on grounds and by procedures permitted by the Act (including prescribed termination notices, breach processes where applicable, serious non-compliance pathways, sale or demolition provisions where they apply, and tribunal orders). Mutual agreement to end can be recorded in writing at any time where the parties choose that path."
    ] }),
    /* @__PURE__ */ jsx2(Text2, { style: [occupancyMatchPdf.bodyParagraph, { marginTop: 4, fontFamily: "Helvetica-Bold" }], children: "Break fee (fixed-term break) \u2014 where a compliant break-fee term applies under the Act:" }),
    /* @__PURE__ */ jsxs2(View2, { style: [occupancyMatchPdf.tableWrap, { marginTop: 4, marginBottom: 6 }], children: [
      /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.thRow, children: [
        /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.thCell, children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.thText, children: "Period of fixed term elapsed" }) }),
        /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.thCellLast, children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.thText, children: "Break fee" }) })
      ] }),
      breakRows.map((r, i) => /* @__PURE__ */ jsxs2(
        View2,
        {
          style: [
            occupancyMatchPdf.dataRow,
            i % 2 === 0 ? occupancyMatchPdf.dataRowA : occupancyMatchPdf.dataRowB
          ],
          children: [
            /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.dataLabelCell, children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.dataLabel, children: r.elapsed }) }),
            /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.dataValueCell, children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.dataValueBold, children: r.fee }) })
          ]
        },
        i
      ))
    ] }),
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      "A break fee of this kind applies only to ",
      /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: "Helvetica-Bold" }, children: "fixed terms of 3 years or less" }),
      " where the tenancy agreement includes a compliant break-fee clause as permitted by the Act. It does not apply to periodic agreements or to fixed terms longer than 3 years unless the law and the agreement expressly provide otherwise."
    ] }),
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      "If anything in this addendum is inconsistent with the Residential Tenancies Act 2010 (NSW) or the standard form residential tenancy agreement, the ",
      /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: "Helvetica-Bold" }, children: "Act and the standard form agreement prevail" }),
      "."
    ] })
  ] });
}
function Section13Disputes(_props) {
  return /* @__PURE__ */ jsxs2(View2, { style: { marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 13, title: "Disputes" }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "The parties should attempt to resolve disagreements about this tenancy or the use of the Quni platform directly, promptly, and in good faith before escalating matters." }),
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      "Quni Living may assist with facilitation or information exchange where appropriate and where all parties agree. For facilitation enquiries, contact ",
      /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: "Helvetica-Bold" }, children: "info@quni.com.au" }),
      ". Quni Living does not provide legal advice and is not a substitute for independent legal advice where needed."
    ] }),
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      "Either party may apply to the NSW Civil and Administrative Tribunal (NCAT) for orders in accordance with the Residential Tenancies Act 2010 (NSW) and tribunal rules. Quni Living is",
      " ",
      /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: "Helvetica-Bold" }, children: "not a party" }),
      " to NCAT proceedings between the landlord and tenant and ",
      /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: "Helvetica-Bold" }, children: "cannot represent" }),
      " either party before NCAT."
    ] })
  ] });
}
function Section14Privacy(_props) {
  return /* @__PURE__ */ jsxs2(View2, { style: { marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 14, title: "Privacy" }),
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      "Quni Living handles personal information in accordance with the",
      " ",
      /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: "Helvetica-Bold" }, children: "Privacy Act 1988 (Cth)" }),
      " and applicable Australian privacy principles, including information collected to facilitate this tenancy and to operate the Quni platform (for example identity, contact, tenancy, and payment-related details where relevant)."
    ] }),
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      "You may request access to, or correction of, personal information Quni Living holds about you by writing to",
      " ",
      /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: "Helvetica-Bold" }, children: "info@quni.com.au" }),
      ". Further detail is set out in the privacy policy at ",
      /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: "Helvetica-Bold" }, children: "https://quni.com.au/privacy" }),
      "."
    ] })
  ] });
}
function Section15ElectronicExecution(_props) {
  return /* @__PURE__ */ jsxs2(View2, { style: { marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 15, title: "Electronic execution" }),
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      "The parties agree that this addendum may be signed electronically where permitted by the",
      " ",
      /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: "Helvetica-Bold" }, children: "Electronic Transactions Act 2000 (NSW)" }),
      " and other applicable laws. Electronic signatures have the same effect as handwritten signatures when applied through an agreed signing workflow."
    ] }),
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: [
      "Each party consents to electronic signing, including the use of signature and date fields completed through the DocuSeal workflow at ",
      /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: "Helvetica-Bold" }, children: "https://sign.quni.com.au" }),
      "."
    ] })
  ] });
}
function Section16SpecialConditions(_props) {
  return /* @__PURE__ */ jsxs2(View2, { style: { marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 16, title: "Special conditions" }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "No special conditions apply unless recorded below or in an attachment signed by both parties." }),
    /* @__PURE__ */ jsx2(
      View2,
      {
        style: {
          marginTop: 8,
          minHeight: 96,
          borderWidth: 0.75,
          borderColor: "#C4B8A8",
          borderStyle: "dashed",
          paddingHorizontal: 10,
          paddingVertical: 8,
          backgroundColor: "#FFFFFF"
        },
        children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.noteItalicMuted, children: "Space for typed or handwritten special conditions (if any)." })
      }
    )
  ] });
}
function Section17Execution(props) {
  const landlordDisplay = props.landlord.companyName ? `${props.landlord.fullName} (${props.landlord.companyName})` : props.landlord.fullName;
  return /* @__PURE__ */ jsxs2(View2, { children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 17, title: "Execution" }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "Signed electronically where permitted. Each party's signature and date fields below are completed through the signing workflow." }),
    /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigTable, children: [
      /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigHeaderRow, children: [
        /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.sigHeaderCell, children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.thText, children: "Landlord" }) }),
        /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.sigHeaderCellLast, children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.thText, children: "Tenant" }) })
      ] }),
      /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigBodyRow, children: [
        /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigCol, children: [
          /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigNameBold, children: landlordDisplay }),
          /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.docusealSignatureFieldBox, children: /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigLabelRow, children: [
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigLabel, children: "Signature " }),
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.docusealTagOa, children: "{{Addendum Landlord Signature;role=First Party;type=signature}}" })
          ] }) }),
          /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.docusealDateFieldBox, children: /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigLabelRow, children: [
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigLabel, children: "Date " }),
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.docusealTagOa, children: "{{Addendum Landlord Date;role=First Party;type=date}}" })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigColLast, children: [
          /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigNameBold, children: props.tenant.fullName }),
          /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.docusealSignatureFieldBox, children: /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigLabelRow, children: [
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigLabel, children: "Signature " }),
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.docusealTagOa, children: "{{Addendum Tenant Signature;role=Second Party;type=signature}}" })
          ] }) }),
          /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.docusealDateFieldBox, children: /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigLabelRow, children: [
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigLabel, children: "Date " }),
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.docusealTagOa, children: "{{Addendum Tenant Date;role=Second Party;type=date}}" })
          ] }) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx2(Text2, { style: [occupancyMatchPdf.noteItalicMuted, { marginTop: 8 }], children: "Signatures and dates are collected using DocuSeal (https://sign.quni.com.au). DocuSeal is a third-party e-signing service; Quni Living does not control DocuSeal's infrastructure beyond selecting it as the signing provider for this package." })
  ] });
}
function QuniPlatformAddendum(props) {
  const { documentId, generatedAt } = props;
  return /* @__PURE__ */ jsxs2(Document, { children: [
    /* @__PURE__ */ jsxs2(Page, { size: "A4", style: occupancyMatchPdf.page, children: [
      /* @__PURE__ */ jsx2(
        OccupancyMatchFixedHeader,
        {
          documentTitle: "Platform Addendum",
          subtitle: "Supplementary to the Residential Tenancy Agreement"
        }
      ),
      /* @__PURE__ */ jsx2(OccupancyMatchFooter, { documentId, generatedAt, variant: "addendum" }),
      /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "This addendum records how the Quni platform is used for the tenancy described below. It is intended to be signed together with the prescribed residential tenancy agreement in the same package." }),
      /* @__PURE__ */ jsx2(Section1TenancySummary, { ...props }),
      /* @__PURE__ */ jsx2(Section2QuniPlatformAndFee, { ...props }),
      /* @__PURE__ */ jsx2(Section3CommunicationChannels, { ...props }),
      /* @__PURE__ */ jsx2(Section4MaintenanceAndRepairs, { ...props })
    ] }),
    /* @__PURE__ */ jsxs2(Page, { size: "A4", style: occupancyMatchPdf.page, children: [
      /* @__PURE__ */ jsx2(
        OccupancyMatchFixedHeader,
        {
          documentTitle: "Platform Addendum",
          subtitle: "Supplementary to the Residential Tenancy Agreement"
        }
      ),
      /* @__PURE__ */ jsx2(OccupancyMatchFooter, { documentId, generatedAt, variant: "addendum" }),
      /* @__PURE__ */ jsx2(Section5UtilitiesAndBills, { ...props }),
      /* @__PURE__ */ jsx2(Section6HouseRules, { ...props }),
      /* @__PURE__ */ jsx2(Section7MouldPrevention, { ...props }),
      /* @__PURE__ */ jsx2(Section8ConditionReport, { ...props }),
      /* @__PURE__ */ jsx2(Section9MoveOutProcedures, { ...props }),
      /* @__PURE__ */ jsx2(Section10Bond, { ...props }),
      /* @__PURE__ */ jsx2(Section11InspectionsAndAccess, { ...props }),
      /* @__PURE__ */ jsx2(Section12Termination, { ...props }),
      /* @__PURE__ */ jsx2(Section13Disputes, { ...props }),
      /* @__PURE__ */ jsx2(Section14Privacy, { ...props }),
      /* @__PURE__ */ jsx2(Section15ElectronicExecution, { ...props }),
      /* @__PURE__ */ jsx2(Section16SpecialConditions, { ...props }),
      /* @__PURE__ */ jsx2(Section17Execution, { ...props })
    ] })
  ] });
}
export {
  QuniPlatformAddendum
};
