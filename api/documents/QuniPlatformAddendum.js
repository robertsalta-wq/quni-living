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
  sigBodyRow: { flexDirection: "row", minHeight: 120 },
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
var QUNI_PLATFORM_URL = "https://quni.com.au";
var QUNI_MAINTENANCE_PORTAL_URL = "https://quni.com.au/maintenance";
var QUNI_MOVE_OUT_FORM_URL = "https://quni.com.au/move-out";
var LANDLORD_SERVICE_FEE_LABEL = "10% of weekly rent";
var TENANT_PLATFORM_FEES_LABEL = "None beyond the agreed rent.";
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
function signingPackageLabel(pkg) {
  if (pkg === "residential_tenancy") return "NSW residential tenancy agreement package";
  return pkg;
}
function ScheduleBlock(props) {
  const { landlord, tenant, premises, term, rent, bond, utilitiesDescription, signingPackage } = props;
  const landlordDisplay = landlord.companyName ? `${landlord.fullName} (${landlord.companyName})` : landlord.fullName;
  const endDateText = term.periodic || !term.endDate ? "Periodic tenancy (no fixed end date)" : formatAuDate(term.endDate);
  const bondText = bond.amount != null && Number.isFinite(bond.amount) ? formatMoney(bond.amount) : "\u2014";
  const furnishInline = /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.dataValueBold, children: [
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.dataLabel, children: "Furnished: " }),
    yn(premises.furnished),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.dataLabel, children: " \xB7 Linen supplied: " }),
    yn(premises.linenSupplied),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.dataLabel, children: " \xB7 Weekly cleaning: " }),
    yn(premises.weeklyCleaningService)
  ] });
  const termInline = /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.dataValueBold, children: [
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.dataLabel, children: "Term start: " }),
    formatAuDate(term.startDate),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.dataLabel, children: " \xB7 Term end: " }),
    endDateText
  ] });
  const rentInline = /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.dataValueBold, children: [
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.dataLabel, children: "Agreed weekly rent: " }),
    formatMoney(rent.weeklyRent),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.dataLabel, children: " \xB7 Payment method: " }),
    rent.paymentMethod
  ] });
  const rows = [
    { label: "Signing package:", value: signingPackageLabel(signingPackage) },
    { label: "Landlord:", value: landlordDisplay },
    { label: "Landlord address for service:", value: landlord.addressLine },
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
    { label: "Premises (address):", value: premises.addressLine },
    { label: "Room type:", value: premises.roomType?.trim() || "\u2014" },
    { label: "", value: furnishInline },
    { label: "", value: termInline },
    { label: "Lease length (description):", value: term.leaseLengthDescription },
    { label: "", value: rentInline },
    { label: "Bond (if applicable):", value: bondText },
    {
      label: "Utilities / services (summary):",
      value: utilitiesDescription.trim() || "\u2014"
    }
  );
  return /* @__PURE__ */ jsxs2(View2, { style: { marginTop: 4, marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 1, title: "Parties and premises (context)" }),
    /* @__PURE__ */ jsx2(OccupancyMatchScheduleTable, { rows })
  ] });
}
function PlatformTermsBlock() {
  return /* @__PURE__ */ jsxs2(View2, { style: { marginBottom: 8 }, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 2, title: "Quni platform terms" }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "The following applies to the tenancy listed above. URLs and standard platform fees are fixed by Quni." }),
    /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.noteBox, children: [
      /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.noteItalicMuted, children: [
        "\u2022 Platform: ",
        QUNI_PLATFORM_URL
      ] }),
      /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.noteItalicMuted, children: [
        "\u2022 Maintenance portal: ",
        QUNI_MAINTENANCE_PORTAL_URL
      ] }),
      /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.noteItalicMuted, children: [
        "\u2022 Move-out form: ",
        QUNI_MOVE_OUT_FORM_URL
      ] }),
      /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.noteItalicMuted, children: [
        "\u2022 Landlord service fee: ",
        LANDLORD_SERVICE_FEE_LABEL
      ] }),
      /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.noteItalicMuted, children: [
        "\u2022 Tenant platform fees: ",
        TENANT_PLATFORM_FEES_LABEL
      ] })
    ] }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "The parties acknowledge they have read this addendum and agree to use the Quni platform as described, in addition to the main residential tenancy agreement in this signing package." })
  ] });
}
function SignaturesBlock(props) {
  const landlordDisplay = props.landlord.companyName ? `${props.landlord.fullName} (${props.landlord.companyName})` : props.landlord.fullName;
  return /* @__PURE__ */ jsxs2(View2, { children: [
    /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 3, title: "Execution" }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children: "Signed electronically where permitted. Each party's signature and date fields below are completed through the signing workflow." }),
    /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigTable, children: [
      /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigHeaderRow, children: [
        /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.sigHeaderCell, children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.thText, children: "Landlord" }) }),
        /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.sigHeaderCellLast, children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.thText, children: "Tenant" }) })
      ] }),
      /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigBodyRow, children: [
        /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigCol, children: [
          /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigNameBold, children: landlordDisplay }),
          /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigLabelRow, children: [
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigLabel, children: "Signature " }),
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.docusealTagOa, children: "{{Addendum Landlord Signature;role=First Party;type=signature}}" })
          ] }),
          /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.sigSpace }),
          /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigLabelRow, children: [
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigLabel, children: "Date " }),
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.docusealTagOa, children: "{{Addendum Landlord Date;role=First Party;type=date}}" })
          ] }),
          /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.sigSpace })
        ] }),
        /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigColLast, children: [
          /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigNameBold, children: props.tenant.fullName }),
          /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigLabelRow, children: [
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigLabel, children: "Signature " }),
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.docusealTagOa, children: "{{Addendum Tenant Signature;role=Second Party;type=signature}}" })
          ] }),
          /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.sigSpace }),
          /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigLabelRow, children: [
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigLabel, children: "Date " }),
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.docusealTagOa, children: "{{Addendum Tenant Date;role=Second Party;type=date}}" })
          ] }),
          /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.sigSpace })
        ] })
      ] })
    ] })
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
      /* @__PURE__ */ jsx2(ScheduleBlock, { ...props }),
      /* @__PURE__ */ jsx2(PlatformTermsBlock, {})
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
      /* @__PURE__ */ jsx2(SignaturesBlock, { ...props })
    ] })
  ] });
}
export {
  QuniPlatformAddendum
};
