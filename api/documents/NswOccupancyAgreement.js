// src/lib/documents/licenceOccupy/LicenceOccupyDocument.tsx
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

// src/lib/platformIdentity.ts
var DEFAULT_PLATFORM_LEGAL_NAME = "Quni Living Pty Ltd";
function resolvePlatformLegalEntityName(legalName) {
  const t = typeof legalName === "string" ? legalName.trim() : "";
  return t || DEFAULT_PLATFORM_LEGAL_NAME;
}

// src/lib/documents/licenceOccupy/utils.ts
function licenceTerminationNoticePhrase(paymentMethod) {
  const m = paymentMethod.toLowerCase();
  if (m.includes("fortnight")) {
    return "where the licence fee is payable fortnightly, at least two weeks' written notice;";
  }
  if (m.includes("month")) {
    return "where the licence fee is payable monthly, at least one calendar month's written notice;";
  }
  return "where the licence fee is payable weekly, at least one week's written notice;";
}
function ownerServiceFeeParagraph(template, feePercent) {
  return template.replace("{feePercent}", feePercent);
}

// src/lib/documents/licenceOccupy/LicenceOccupyDocument.tsx
import { Fragment, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function formatMoney(n) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}
function formatAuDate(iso) {
  const d = iso.slice(0, 10);
  const parts = d.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, day] = parts;
  if (!y || !m || !day) return iso;
  return `${day}/${m}/${day}`;
}
function yn(v) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "\u2014";
}
function LicenceFooter({
  content,
  documentId,
  generatedAt
}) {
  return /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.footerWrapOa, fixed: true, children: [
    /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.footerRuleOa }),
    /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.footerRowOa, children: [
      /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.footerLeftCoral, children: `Quni Living \xB7 ${content.docTitle} \xB7 ${documentId} \xB7 ${generatedAt} \xB7 ${content.draftFooter}` }),
      /* @__PURE__ */ jsx2(
        Text2,
        {
          style: occupancyMatchPdf.footerPageCoral,
          render: ({ pageNumber, totalPages }) => `Page ${pageNumber}${totalPages ? ` of ${totalPages}` : ""}`
        }
      )
    ] })
  ] });
}
function BodyParagraph({ children }) {
  return /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.bodyParagraph, children });
}
function Bullet({ children }) {
  return /* @__PURE__ */ jsxs2(Text2, { style: [occupancyMatchPdf.bodyParagraph, { paddingLeft: 10 }], children: [
    "\u2022 ",
    children
  ] });
}
function PageShell({
  content,
  documentId,
  generatedAt,
  children
}) {
  return /* @__PURE__ */ jsxs2(Page, { size: "A4", style: occupancyMatchPdf.page, children: [
    /* @__PURE__ */ jsx2(OccupancyMatchFixedHeader, { documentTitle: content.docTitle, subtitle: content.docSubtitle }),
    /* @__PURE__ */ jsx2(LicenceFooter, { content, documentId, generatedAt }),
    children
  ] });
}
function ScheduleSummary({
  content,
  props
}) {
  const { landlord, tenant, premises, term, rent, bond } = props;
  const ownerDisplay = landlord.companyName ? `${landlord.fullName} (${landlord.companyName})` : landlord.fullName;
  const endDateText = term.periodic || !term.endDate ? "Open-ended (continues until ended under this licence)" : formatAuDate(term.endDate);
  const depositText = bond.amount != null && Number.isFinite(bond.amount) ? formatMoney(bond.amount) : "None agreed";
  const rows = [
    { label: "Property address:", value: premises.addressLine },
    { label: "Allocated room:", value: premises.roomType?.trim() || "Bedroom as described on listing" },
    ...premises.roomsRentedToResidents != null && premises.roomsRentedToResidents >= 1 ? [
      {
        label: "Rooms for residents in premises:",
        value: String(premises.roomsRentedToResidents)
      }
    ] : [],
    { label: "Owner:", value: ownerDisplay },
    { label: "Owner email:", value: landlord.email },
    { label: "Owner phone:", value: landlord.phone },
    { label: "Resident:", value: tenant.fullName },
    { label: "Resident email:", value: tenant.email },
    { label: "Resident phone:", value: tenant.phone },
    { label: "Licence starts:", value: formatAuDate(term.startDate) },
    { label: "Licence ends:", value: endDateText },
    { label: "Licence period:", value: term.leaseLengthDescription },
    { label: "Weekly licence fee:", value: formatMoney(rent.weeklyRent) },
    { label: "Payment method:", value: rent.paymentMethod },
    { label: `${content.bond.scheduleLabel}:`, value: depositText },
    { label: "Furnished:", value: yn(premises.furnished) },
    { label: "Linen supplied:", value: yn(premises.linenSupplied) },
    { label: "Weekly cleaning:", value: yn(premises.weeklyCleaningService) }
  ];
  return /* @__PURE__ */ jsxs2(View2, { style: { marginTop: 4, marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx2(Text2, { style: [occupancyMatchPdf.sectionTitle, { marginBottom: 6 }], children: "Schedule" }),
    /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.sectionHeadingRule }),
    /* @__PURE__ */ jsx2(OccupancyMatchScheduleTable, { rows })
  ] });
}
function LicenceOccupyDocument({
  content,
  props
}) {
  const { documentId, generatedAt, landlord, tenant, rent, bond, houseRules, specialConditions, bookingNotes } = props;
  const ownerDisplay = landlord.companyName ? `${landlord.fullName} (${landlord.companyName})` : landlord.fullName;
  const entityName = resolvePlatformLegalEntityName(null);
  const bondAmountLine = bond.amount != null && Number.isFinite(bond.amount) ? `The agreed ${content.bond.scheduleLabel.toLowerCase()} is ${formatMoney(bond.amount)}.` : `No ${content.bond.scheduleLabel.toLowerCase()} is required unless otherwise agreed in writing.`;
  const houseRulesLines = houseRules?.trim() ? houseRules.trim().split(/\n+/).map((line) => line.trim()).filter(Boolean) : [...content.defaultHouseRules];
  const extraLines = [
    ...specialConditions.filter((c) => c.trim()),
    ...bookingNotes?.trim() ? [bookingNotes.trim()] : []
  ];
  return /* @__PURE__ */ jsxs2(Document, { children: [
    /* @__PURE__ */ jsxs2(PageShell, { content, documentId, generatedAt, children: [
      /* @__PURE__ */ jsx2(Text2, { style: [occupancyMatchPdf.noteItalicMuted, { marginBottom: 8 }], children: content.draftFooter }),
      /* @__PURE__ */ jsx2(ScheduleSummary, { content, props }),
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 1, title: "Nature of arrangement" }),
      content.natureParagraphs.map((p, i) => /* @__PURE__ */ jsx2(BodyParagraph, { children: p }, `n-${i}`)),
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 2, title: "Room and shared areas" }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.roomSharedIntro })
    ] }),
    /* @__PURE__ */ jsxs2(PageShell, { content, documentId, generatedAt, children: [
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 3, title: "Owner's right of entry" }),
      content.entryParagraphs.map((p, i) => /* @__PURE__ */ jsx2(BodyParagraph, { children: p }, `e-${i}`)),
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 4, title: "Financial terms" }),
      /* @__PURE__ */ jsxs2(BodyParagraph, { children: [
        "The resident must pay the weekly licence fee of ",
        formatMoney(rent.weeklyRent),
        " in advance, by the payment method stated in the schedule: ",
        rent.paymentMethod
      ] }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.utilitiesDefault }),
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 5, title: content.bond.sectionTitle }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.bond.intro }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: bondAmountLine }),
      content.bond.bullets.map((b, i) => /* @__PURE__ */ jsx2(Bullet, { children: b }, `b-${i}`))
    ] }),
    /* @__PURE__ */ jsxs2(PageShell, { content, documentId, generatedAt, children: [
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 6, title: "Termination" }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.terminationIntro }),
      /* @__PURE__ */ jsx2(Bullet, { children: licenceTerminationNoticePhrase(rent.paymentMethod) }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: "Either party may end the licence immediately where:" }),
      content.terminationGrounds.map((g, i) => /* @__PURE__ */ jsx2(Bullet, { children: g }, `t-${i}`)),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.terminationNoStatutory }),
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 7, title: "Australian Consumer Law" }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.aclParagraph }),
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 8, title: "House rules" }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: "The resident must comply with the following house rules. Additional rules may be notified by the owner in writing." }),
      houseRulesLines.map((r, i) => /* @__PURE__ */ jsx2(Bullet, { children: r }, `h-${i}`)),
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 9, title: "Care of room and shared areas" }),
      content.careBullets.map((b, i) => /* @__PURE__ */ jsx2(Bullet, { children: b }, `c-${i}`))
    ] }),
    /* @__PURE__ */ jsxs2(PageShell, { content, documentId, generatedAt, children: [
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 10, title: "Disputes" }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.disputesParagraph }),
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 11, title: "Quni platform and owner service fee" }),
      /* @__PURE__ */ jsxs2(BodyParagraph, { children: [
        entityName,
        ' (the "Platform") ',
        content.platformIntroPrefix
      ] }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: ownerServiceFeeParagraph(content.platformOwnerFeeTemplate, content.ownerServiceFeeDefault) }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.platformResidentCarveout }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.feeFreeBankTransfer }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.bankDetailsTemplate }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.conditionReportIntro }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.conditionReportReturn }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.conditionReportOutgoing })
    ] }),
    /* @__PURE__ */ jsxs2(PageShell, { content, documentId, generatedAt, children: [
      extraLines.length > 0 ? /* @__PURE__ */ jsxs2(Fragment, { children: [
        /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 12, title: "Additional terms" }),
        extraLines.map((line, i) => /* @__PURE__ */ jsx2(Bullet, { children: line }, `x-${i}`))
      ] }) : null,
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 13, title: "Execution" }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.executionIntro }),
      /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigTable, children: [
        /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigHeaderRow, children: [
          /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.sigHeaderCell, children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.thText, children: "Owner" }) }),
          /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.sigHeaderCellLast, children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.thText, children: "Resident" }) })
        ] }),
        /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigBodyRow, children: [
          /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigCol, children: [
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigNameBold, children: ownerDisplay }),
            /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.docusealSignatureFieldBox, children: /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigLabelRow, children: [
              /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigLabel, children: "Signature " }),
              /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.docusealTagOa, children: "{{Owner Signature;role=First Party;type=signature}}" })
            ] }) }),
            /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.docusealDateFieldBox, children: /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigLabelRow, children: [
              /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigLabel, children: "Date " }),
              /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.docusealTagOa, children: "{{Owner Sign Date;role=First Party;type=date}}" })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigColLast, children: [
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigNameBold, children: tenant.fullName }),
            /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.docusealSignatureFieldBox, children: /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigLabelRow, children: [
              /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigLabel, children: "Signature " }),
              /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.docusealTagOa, children: "{{Resident Signature;role=Second Party;type=signature}}" })
            ] }) }),
            /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.docusealDateFieldBox, children: /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigLabelRow, children: [
              /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigLabel, children: "Date " }),
              /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.docusealTagOa, children: "{{Resident Sign Date;role=Second Party;type=date}}" })
            ] }) })
          ] })
        ] })
      ] })
    ] })
  ] });
}

// src/lib/documents/nsw/occupancyContent.ts
var NSW_LICENCE_OCCUPY_CONTENT = {
  docTitle: "Licence to Occupy",
  docSubtitle: "New South Wales \u2014 Licence to occupy (on-site accommodation)",
  draftFooter: "Draft for legal review \u2014 not for execution",
  ownerServiceFeeDefault: "10%",
  natureParagraphs: [
    "This document is a common-law licence to occupy a specified room within residential premises in New South Wales. It is not a residential tenancy agreement under the Residential Tenancies Act 2010 (NSW).",
    "The owner named in the schedule resides on the premises and retains overall control, possession and management of the whole property, including shared areas and the allocated room.",
    "The resident is granted permission to occupy only the allocated room described in the schedule and to use the shared areas on the terms below. The resident is not granted exclusive possession of the premises or any part of the premises.",
    "The Residential Tenancies Act 2010 (NSW) does not apply to this boarder/lodger arrangement. Any security deposit is held directly by the owner and is not lodged with NSW Fair Trading or Rental Bonds Online."
  ],
  roomSharedIntro: "The resident is licensed to occupy the allocated bedroom at the property address in the schedule. Unless otherwise agreed in writing, the kitchen, bathroom, laundry and living areas are shared with the owner and any other occupants the owner permits on the premises.",
  entryParagraphs: [
    "Because the resident does not have exclusive possession, the owner may enter the allocated room at reasonable times for cleaning, maintenance, inspection or to fulfil the owner's obligations under this licence, without the notice requirements that apply to residential tenancies.",
    "The owner retains keys or other means of access to the allocated room. The resident must not change locks or security devices without the owner's prior written consent.",
    "The resident must not represent that they have sole or exclusive occupation of the premises or exclude the owner from the allocated room or shared areas."
  ],
  utilitiesDefault: "Unless otherwise agreed in writing or stated in the schedule, electricity, gas, water, internet and waste services for the premises are as described on the property listing or in move-in information. Shared utilities are allocated fairly between occupants as the owner directs.",
  bond: {
    scheduleLabel: "Security deposit",
    sectionTitle: "Security deposit",
    intro: "Where a security deposit is agreed, it is held directly by the owner and is not lodged with NSW Fair Trading or any statutory bond service.",
    bullets: [
      "The owner must give the resident a written receipt when the security deposit is paid.",
      "The security deposit may be applied against amounts owing under this licence, damage beyond fair wear and tear, or cleaning required to restore the allocated room and the resident's share of shared areas, subject to any agreement between the parties.",
      "Unused amounts of the security deposit must be returned to the resident within a reasonable time after the licence ends and the resident has vacated, less lawful deductions."
    ]
  },
  terminationIntro: "Either party may end this licence by giving the other party written notice. The notice period must be reasonable and aligned to how the weekly licence fee is paid:",
  terminationGrounds: [
    "Non-payment of the licence fee or other agreed charges after written reminder.",
    "Serious breach of this licence or the house rules (including damage, nuisance, or unsafe conduct).",
    "Mutual agreement in writing.",
    "Where the owner requires the premises for genuine change of circumstances, subject to the agreed notice period."
  ],
  terminationNoStatutory: "This licence is not governed by the Residential Tenancies Act 2010 (NSW). The parties do not rely on prescribed residential tenancy notice periods or NCAT pathways under that Act.",
  aclParagraph: "Although the Residential Tenancies Act 2010 (NSW) does not apply, this licence is a consumer contract for the purposes of the Australian Consumer Law (Cth) as applied in New South Wales. Terms that are unfair within the meaning of that law may be void. Neither party may engage in misleading or deceptive conduct in connection with this licence.",
  defaultHouseRules: [
    "Guests and overnight visitors: reasonable notice to the owner; no guest may stay more than 7 consecutive nights without the owner's written consent.",
    "Noise: respect quiet hours (typically 10:00 pm \u2013 7:00 am) and other occupants.",
    "Cleaning: keep the allocated room clean; leave shared areas tidy after use; follow any weekly cleaning arrangement stated in the schedule.",
    "Smoking: only where permitted by the owner and outside shared enclosed areas unless otherwise agreed.",
    "Pets: only with the owner's prior written consent.",
    "Common areas: shared fairly; do not monopolise kitchen, bathroom or living areas.",
    "Utilities: use services responsibly; report faults promptly to the owner."
  ],
  careBullets: [
    "Keep the allocated room and shared areas the resident uses in a reasonably clean condition.",
    "Report damage, maintenance needs or safety concerns to the owner promptly.",
    "Must not intentionally or negligently damage the premises or cause nuisance to the owner or other occupants."
  ],
  disputesParagraph: "The parties will attempt to resolve any dispute about this licence in good faith. If the dispute is not resolved within 14 days, either party may refer the matter to a court of New South Wales with jurisdiction. Nothing in this clause requires application to NCAT under the Residential Tenancies Act 2010 (NSW).",
  conditionReportIntro: "The parties acknowledge that an ingoing condition report may be prepared for the allocated room and shared areas. The resident will be given a reasonable opportunity to review and comment on the report and to attach photographs where appropriate.",
  conditionReportReturn: "The resident should return a signed copy or written comments within the timeframe notified by the owner or the platform, failing which the report may be taken as accepted except for manifest errors or items the resident could not reasonably have inspected.",
  conditionReportOutgoing: "At the end of the licence, an outgoing condition report may be used to compare the state of the allocated room and shared areas with the ingoing report, fair wear and tear excepted.",
  feeFreeBankTransfer: "A fee-free direct bank transfer option remains available at all times for payment of the weekly licence fee. The resident is not required to pay Quni platform fees, booking fees or resident service fees, and the agreed weekly licence fee is not increased by the owner-side service fee described below.",
  bankDetailsTemplate: "Direct credit details for payment of the weekly licence fee will be provided by the owner (account name, BSB and account number). Use your name and the property address as the payment reference.",
  platformIntroPrefix: "operates an online marketplace and payment facilitation service. The Platform is not the owner, property manager or agent for the premises unless separately appointed in writing. The owner remains responsible for the allocated room, shared areas and this licence.",
  platformOwnerFeeTemplate: "A service fee of {feePercent} of the gross weekly licence fee is deducted from amounts payable to the owner through the Platform before payout to the owner, as disclosed in the owner service agreement and listing terms.",
  platformResidentCarveout: "The resident pays no Quni platform fee, booking fee or resident service fee. The agreed weekly licence fee shown in the schedule is not increased by the owner-side service fee.",
  executionIntro: "The parties intend that electronic signing, where used, is valid and binding under the Electronic Transactions Act 2000 (NSW) and related law. Signature and date fields may be completed through the signing workflow."
};
var NSW_OCCUPANCY_PDF_MARKERS = [
  "Licence to Occupy",
  "Weekly licence fee",
  "Security deposit",
  "Residential Tenancies Act 2010",
  "not lodged with NSW Fair Trading",
  "The resident pays no Quni platform fee"
];

// src/lib/documents/nsw/occupancyGenerator.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
function NswLicenceToOccupyOnSite(props) {
  return /* @__PURE__ */ jsx3(LicenceOccupyDocument, { content: NSW_LICENCE_OCCUPY_CONTENT, props });
}
function OccupancyAgreement(props) {
  return NswLicenceToOccupyOnSite(props);
}
var occupancyGenerator_default = NswLicenceToOccupyOnSite;
export {
  NSW_OCCUPANCY_PDF_MARKERS,
  NswLicenceToOccupyOnSite,
  OccupancyAgreement,
  occupancyGenerator_default as default
};
