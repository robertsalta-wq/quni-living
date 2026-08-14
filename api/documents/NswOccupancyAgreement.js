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
  /** DocuSeal field regions - minimum heights for comfortable signing (react-pdf px). */
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
  subtitle,
  watermark
}) {
  return /* @__PURE__ */ jsxs(View, { style: occupancyMatchPdf.headerWrap, fixed: true, children: [
    /* @__PURE__ */ jsxs(View, { style: occupancyMatchPdf.oaHeaderRow, children: [
      /* @__PURE__ */ jsx(Text, { style: occupancyMatchPdf.brandQuni, children: "Quni" }),
      /* @__PURE__ */ jsxs(View, { style: occupancyMatchPdf.headerRightBlock, children: [
        /* @__PURE__ */ jsx(Text, { style: occupancyMatchPdf.headerDocTitle, children: documentTitle }),
        /* @__PURE__ */ jsx(Text, { style: occupancyMatchPdf.headerSubtitle, children: subtitle }),
        watermark ? /* @__PURE__ */ jsx(Text, { style: occupancyMatchPdf.noteItalicMuted, children: watermark }) : null
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
var PLATFORM_LEGAL_ENTITY_NOT_CONFIGURED = "platform legal entity not configured in Business settings";
function buildLicencePlatformEntityDisplay(fields) {
  const legal = typeof fields.legalName === "string" ? fields.legalName.trim() : "";
  if (!legal) throw new Error(PLATFORM_LEGAL_ENTITY_NOT_CONFIGURED);
  const acn = typeof fields.acn === "string" ? fields.acn.trim() : "";
  const trading = typeof fields.tradingName === "string" ? fields.tradingName.trim() : "";
  let display = legal;
  if (acn) display = `${legal} (ACN ${acn})`;
  if (trading) display = `${display} trading as ${trading}`;
  return display;
}

// api/lib/tenancy/rules/nsw.ts
var NSW_T1_BOND = {
  schemeApplies: false,
  maxBondCopy: null,
  authority: null,
  authorityUrl: null,
  maxBondMonths: null,
  lodgementDays: null,
  lodgementDaysUnit: null,
  receiptDays: null,
  authorityPublicLabel: null,
  landlordAckAuthorityName: "NSW Fair Trading"
};
var NSW_T2_BOND = {
  schemeApplies: true,
  maxBondCopy: "Under NSW law, bond cannot exceed 4 weeks rent.",
  authority: "NSW Fair Trading",
  authorityUrl: "https://www.nsw.gov.au/housing-and-construction/renting",
  maxBondMonths: 1,
  lodgementDays: 10,
  lodgementDaysUnit: "business",
  receiptDays: 15,
  authorityPublicLabel: "NSW Fair Trading (Rental Bonds Online)",
  landlordAckAuthorityName: null
};
var NSW_T3_BOND = {
  schemeApplies: false,
  maxBondCopy: null,
  authority: null,
  authorityUrl: null,
  maxBondMonths: null,
  lodgementDays: null,
  lodgementDaysUnit: null,
  receiptDays: null,
  authorityPublicLabel: null,
  landlordAckAuthorityName: "NSW Fair Trading"
};
function nswTenancyRules(tier) {
  if (tier === "T1") return { bond: NSW_T1_BOND };
  if (tier === "T3") return { bond: NSW_T3_BOND };
  return { bond: NSW_T2_BOND };
}

// api/lib/tenancy/rules/qld.ts
var QLD_T1_BOND = {
  schemeApplies: true,
  maxBondCopy: "Under Queensland law, bond cannot exceed 4 weeks rent.",
  authority: "Residential Tenancies Authority (RTA Queensland)",
  authorityUrl: "https://www.rta.qld.gov.au/",
  maxBondMonths: 1,
  lodgementDays: 10,
  lodgementDaysUnit: "calendar",
  receiptDays: 15,
  authorityPublicLabel: "Residential Tenancies Authority (RTA)",
  landlordAckAuthorityName: null
};
var QLD_T2_BOND = {
  schemeApplies: true,
  maxBondCopy: "Under Queensland law, bond cannot exceed 4 weeks rent.",
  authority: "Residential Tenancies Authority (RTA Queensland)",
  authorityUrl: "https://www.rta.qld.gov.au/",
  maxBondMonths: 1,
  lodgementDays: 10,
  lodgementDaysUnit: "calendar",
  receiptDays: 15,
  authorityPublicLabel: "Residential Tenancies Authority (RTA)",
  landlordAckAuthorityName: null
};
function qldTenancyRules(tier) {
  return {
    bond: tier === "T1" ? QLD_T1_BOND : QLD_T2_BOND
  };
}

// api/lib/tenancy/rules/vic.ts
var VIC_T1_BOND = {
  schemeApplies: false,
  maxBondCopy: null,
  authority: null,
  authorityUrl: null,
  maxBondMonths: null,
  lodgementDays: null,
  lodgementDaysUnit: null,
  receiptDays: null,
  authorityPublicLabel: null,
  landlordAckAuthorityName: "Residential Tenancies Bond Authority (RTBA)"
};
var VIC_T2_BOND = {
  schemeApplies: true,
  maxBondCopy: null,
  authority: "RTBA",
  authorityUrl: "https://www.rtba.vic.gov.au/",
  maxBondMonths: 1,
  lodgementDays: 10,
  lodgementDaysUnit: "business",
  receiptDays: 15,
  authorityPublicLabel: "Residential Tenancies Bond Authority (RTBA)",
  landlordAckAuthorityName: null
};
function vicTenancyRules(tier) {
  return {
    bond: tier === "T1" ? VIC_T1_BOND : VIC_T2_BOND
  };
}

// api/lib/resolveTenancyPackage.ts
var T3_DEFERRED_REASON = "Rooming/boarding house (T3) tenancy agreements are not available on the platform yet.";
function nswFt6600Paths() {
  return {
    draft: "nsw_residential_tenancy_agreement_draft.pdf",
    signed: "nsw_residential_tenancy_agreement_signed.pdf"
  };
}
function qldForm18aPaths() {
  return {
    draft: "qld_form18a_general_tenancy_agreement_draft.pdf",
    signed: "qld_form18a_general_tenancy_agreement_signed.pdf"
  };
}
function vicForm1Paths() {
  return {
    draft: "vic_residential_rental_agreement_draft.pdf",
    signed: "vic_residential_rental_agreement_signed.pdf"
  };
}
function vicOccupancyPaths() {
  return {
    draft: "vic_occupancy_agreement_draft.pdf",
    signed: "vic_occupancy_agreement_signed.pdf"
  };
}
function qldOccupancyPaths() {
  return {
    draft: "qld_occupancy_agreement_draft.pdf",
    signed: "qld_occupancy_agreement_signed.pdf"
  };
}
function unsupportedBase(tier, reason, ragState) {
  return {
    tier,
    supported: false,
    generator: null,
    pdfKind: null,
    rules: null,
    signingPackageName: null,
    storagePaths: null,
    ragState,
    unsupportedReason: reason
  };
}
function resolveTenancyPackage(input) {
  void input.date;
  const stateRaw = typeof input.state === "string" ? input.state.trim().toUpperCase() : "";
  const propertyType = typeof input.property_type === "string" ? input.property_type.trim() : "";
  const isRooming = Boolean(input.is_registered_rooming_house);
  if (stateRaw !== "NSW" && stateRaw !== "VIC" && stateRaw !== "QLD") {
    return unsupportedBase("T2", "unsupported_state", null);
  }
  const state = stateRaw;
  const ragState = state;
  if (!propertyType) {
    return unsupportedBase("T2", "unknown_property_type", ragState);
  }
  const knownTypes = /* @__PURE__ */ new Set([
    "private_room_landlord_on_site",
    "private_room_landlord_off_site",
    "entire_property",
    "shared_room"
  ]);
  if (!knownTypes.has(propertyType)) {
    return unsupportedBase("T2", "unknown_property_type", ragState);
  }
  if (isRooming && propertyType !== "private_room_landlord_off_site") {
    return unsupportedBase(
      "T2",
      "Registered rooming house is only valid for private room (landlord off-site) listings.",
      ragState
    );
  }
  if (propertyType === "private_room_landlord_off_site" && isRooming) {
    if (state === "NSW") {
      const rules = nswTenancyRules("T3");
      return {
        tier: "T3",
        supported: true,
        generator: "nsw-boarding-house",
        pdfKind: "occupancy_agreement",
        rules,
        signingPackageName: "NSW Standard Occupancy Agreement (boarding house)",
        storagePaths: {
          draft: "nsw_boarding_house_occupancy_draft.pdf",
          signed: "nsw_boarding_house_occupancy_signed.pdf"
        },
        ragState,
        unsupportedReason: null
      };
    }
    return unsupportedBase("T3", T3_DEFERRED_REASON, ragState);
  }
  if (propertyType === "private_room_landlord_on_site" && !isRooming) {
    if (state === "NSW") {
      const rules2 = nswTenancyRules("T1");
      return {
        tier: "T1",
        supported: true,
        generator: "nsw-occupancy",
        pdfKind: "occupancy_agreement",
        rules: rules2,
        signingPackageName: "NSW Residential Occupancy Agreement",
        storagePaths: null,
        ragState,
        unsupportedReason: null
      };
    }
    if (state === "QLD") {
      const rules2 = qldTenancyRules("T1");
      return {
        tier: "T1",
        supported: true,
        generator: "qld-occupancy",
        pdfKind: "occupancy_agreement",
        rules: rules2,
        signingPackageName: "QLD occupancy agreement",
        storagePaths: qldOccupancyPaths(),
        ragState,
        unsupportedReason: null
      };
    }
    const rules = vicTenancyRules("T1");
    return {
      tier: "T1",
      supported: true,
      generator: "vic-occupancy",
      pdfKind: "occupancy_agreement",
      rules,
      signingPackageName: "VIC Licence to Occupy",
      storagePaths: vicOccupancyPaths(),
      ragState,
      unsupportedReason: null
    };
  }
  if ((propertyType === "private_room_landlord_off_site" || propertyType === "entire_property" || propertyType === "shared_room") && !isRooming) {
    if (state === "NSW") {
      const rules2 = nswTenancyRules("T2");
      return {
        tier: "T2",
        supported: true,
        generator: "nsw-ft6600",
        pdfKind: "residential_tenancy_agreement",
        rules: rules2,
        signingPackageName: "NSW Residential Tenancy Agreement (FT6600)",
        storagePaths: nswFt6600Paths(),
        ragState,
        unsupportedReason: null
      };
    }
    if (state === "QLD") {
      const rules2 = qldTenancyRules("T2");
      return {
        tier: "T2",
        supported: true,
        generator: "qld-form18a",
        pdfKind: "residential_tenancy_agreement",
        rules: rules2,
        signingPackageName: "QLD Form 18a - General Tenancy Agreement",
        storagePaths: qldForm18aPaths(),
        ragState,
        unsupportedReason: null
      };
    }
    const rules = vicTenancyRules("T2");
    return {
      tier: "T2",
      supported: true,
      generator: "vic-form1",
      pdfKind: "residential_rental_agreement",
      rules,
      signingPackageName: "VIC Form 1 - Residential rental agreement",
      storagePaths: vicForm1Paths(),
      ragState,
      unsupportedReason: null
    };
  }
  return unsupportedBase("T2", "unknown_property_type", ragState);
}

// api/lib/tenancy/jurisdictionCopy.ts
function normalizeAuStateCode(state) {
  return (state ?? "").trim().toUpperCase();
}

// api/lib/tenancy/qldBondRemittance.ts
function effectiveQldBondRemittancePreference(raw) {
  return raw ?? "tenant_choice";
}

// api/lib/tenancy/qldRtaBondCopy.ts
var QLD_RTA_LODGEMENT_STEPS = [
  "Record bond receipt on Quni (this is not RTA lodgement).",
  "Lodge with RTA Web Services (Queensland Digital Identity required) or paper Form 2 - see rta.qld.gov.au.",
  "Once payment clears, RTA issues an Acknowledgement of Rental Bond (bond number) to both parties - keep this confirmation."
];

// src/lib/propertyPayoutDetails.ts
function propertyPayoutDetailsComplete(p) {
  return Boolean(p?.account_name?.trim() && p?.bsb?.trim() && p?.account_number?.trim());
}
function formatPropertyPayoutBsbDisplay(raw) {
  const digits = (raw ?? "").replace(/[\s-]/g, "");
  if (digits.length !== 6) return raw.trim();
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

// api/lib/tenancy/listingBondPaymentCopy.ts
function lodgementDeadlinePhrase(bond) {
  const unit = bond.lodgementDaysUnit === "calendar" ? "days" : "business days";
  return `${bond.lodgementDays} ${unit}`;
}
var NSW_TENANT_RBO_URL = "https://www.nsw.gov.au/housing-and-construction/renting/rental-bonds";
function hostPayeeFieldsFromOptions(options) {
  const p = options?.payee;
  if (!p || !propertyPayoutDetailsComplete(p)) {
    return {
      hostPayeeAccountName: null,
      hostPayeeBsbDisplay: null,
      hostPayeeAccountNumber: null,
      paymentReference: null
    };
  }
  return {
    hostPayeeAccountName: p.account_name.trim(),
    hostPayeeBsbDisplay: formatPropertyPayoutBsbDisplay(p.bsb),
    hostPayeeAccountNumber: p.account_number.trim(),
    paymentReference: options?.paymentReference?.trim() || null
  };
}
function buildHostStepProse(g) {
  const prefSuffix = g.preferLandlordCollection ? " (your host's stated preference)" : "";
  let content = `Pay your host directly${prefSuffix}`;
  if (g.hostPayeeAccountName && g.hostPayeeBsbDisplay && g.hostPayeeAccountNumber && g.paymentReference) {
    content += ` by fee-free bank transfer: Account name: ${g.hostPayeeAccountName}; BSB: ${g.hostPayeeBsbDisplay}; Account number: ${g.hostPayeeAccountNumber}; Reference: ${g.paymentReference}.`;
  } else {
    content += " (bank transfer, cash, or as agreed)";
  }
  content += ` They must lodge with ${g.authorityLabel} within ${g.lodgementDeadlinePhrase} and give you a receipt.`;
  if (g.hostPayeeAccountName && g.paymentReference) {
    content += " You may also pay by cash or another method as agreed with your host.";
  }
  return content;
}
function buildAuthorityStepProse(g) {
  const offeredFirst = g.preferLandlordCollection ? "" : " (offered first)";
  return `Pay through ${g.authorityLabel}${offeredFirst}: ${g.directPayLinkLabel} (${g.directPayLinkUrl}).`;
}
function listingBondPaymentOccupancyProse(bond, stateCode, options) {
  const g = listingBondPaymentTenantGuidance(bond, stateCode, options);
  if (!g) return null;
  const hostStep = buildHostStepProse(g);
  const authorityStep = buildAuthorityStepProse(g);
  const routeBullets = g.preferLandlordCollection ? [hostStep, authorityStep] : [authorityStep, hostStep];
  const paragraphs = [];
  if (g.directPayNote && (g.preferLandlordCollection || g.stateLabel === "QLD")) {
    paragraphs.push(g.directPayNote);
  }
  if (g.stateLabel === "QLD") {
    paragraphs.push("QLD - after bond is received or paid:");
  }
  const qldLodgementBullets = g.stateLabel === "QLD" ? [...QLD_RTA_LODGEMENT_STEPS] : [];
  const offenceNote = g.stateLabel === "QLD" ? "Not lodging bond within 10 days, or keeping it in a personal account, is an offence under Queensland law. A bond is not compulsory - rent in advance is a lawful alternative." : void 0;
  return {
    paragraphs,
    bullets: [...routeBullets, ...qldLodgementBullets],
    offenceNote
  };
}
function listingBondPaymentTenantGuidance(bond, stateCode, options) {
  if (!bond.schemeApplies) return null;
  const st = normalizeAuStateCode(stateCode) || "NSW";
  const qldPref = st === "QLD" ? effectiveQldBondRemittancePreference(options?.qldBondRemittancePreference) : null;
  const preferLandlordCollection = qldPref === "landlord_collects_remits";
  const directPayNote = st === "NSW" ? "For Rental Bonds Online, your host must send you an RBO invitation email first. You can then pay by card or BPAY. Your host cannot require you to use RBO only." : st === "QLD" ? preferLandlordCollection ? "Your host prefers to collect bond and lodge with the RTA on your behalf within 10 days. You can still lodge directly with the RTA (Web Services / QDI or Form 2) if you prefer - Quni does not block that." : "You can lodge and pay bond through the RTA web service (QDI required) or paper Form 2, or pay your host directly - it is your choice." : "You can pay bond through the state bond authority\u2019s online service where available, or pay your host directly - it is your choice.";
  return {
    schemeApplies: true,
    stateLabel: st,
    authorityLabel: bond.authorityPublicLabel,
    authorityUrl: bond.authorityUrl,
    lodgementDeadlinePhrase: lodgementDeadlinePhrase(bond),
    directPayNote,
    directPayLinkLabel: st === "NSW" ? "NSW Rental Bonds Online (tenants)" : bond.authorityPublicLabel,
    directPayLinkUrl: st === "NSW" ? NSW_TENANT_RBO_URL : bond.authorityUrl,
    qldRemittancePreference: qldPref,
    preferLandlordCollection,
    ...hostPayeeFieldsFromOptions(options)
  };
}
function listingLandlordHeldPayeeOccupancyLines(payee, paymentReference) {
  if (!propertyPayoutDetailsComplete(payee)) return null;
  return [
    `Account name: ${payee.account_name.trim()}`,
    `BSB: ${formatPropertyPayoutBsbDisplay(payee.bsb)}`,
    `Account number: ${payee.account_number.trim()}`,
    `Reference: ${paymentReference.trim()}`,
    "Method: Fee-free bank transfer."
  ];
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
var LISTING_TIER_ACCEPTANCE_FEE_DISPLAY = "$99";
function formatManagedFeePercent(percent) {
  const n = Number(percent);
  if (!Number.isFinite(n) || n <= 0) return "7%";
  return `${n.toLocaleString("en-AU", { maximumFractionDigits: 2 })}%`;
}
function ownerServiceFeeParagraphForTier(tier, managedFeePercent, listingFeeDisplay = LISTING_TIER_ACCEPTANCE_FEE_DISPLAY, partyLabel = "Owner") {
  const party = partyLabel === "Principal" ? "Principal" : partyLabel.toLowerCase();
  if (tier === "managed") {
    const pct = formatManagedFeePercent(managedFeePercent);
    return `Quni facilitates payment of the weekly licence fee through the Platform. A Managed service fee of ${pct} of the gross weekly licence fee is deducted from amounts payable to the ${party} before payout to the ${party}, as disclosed in the ${party} service agreement and listing terms.`;
  }
  return `The ${party} has accepted this booking under the Quni Listing service tier. A one-off platform fee of ${listingFeeDisplay} (AUD) is charged to the ${party} separately when the booking is accepted - it is not deducted from the weekly licence fee. The weekly licence fee is paid directly to the ${party} by the resident, fee-free.`;
}
function occupancyClause11BankDetailsIntro(content, props) {
  if (!props.payout || !props.paymentReference?.trim()) {
    return content.bankDetailsTemplate;
  }
  const scope = props.schemeApplies === true ? "the weekly licence fee" : "the weekly licence fee and security deposit";
  return `Direct credit details for payment of ${scope} are set out below and are also shown on the Platform and in booking correspondence.`;
}
function occupancyClause11PayeeLines(props) {
  if (!props.payout || !props.paymentReference?.trim()) return [];
  return listingLandlordHeldPayeeOccupancyLines(props.payout, props.paymentReference) ?? [];
}
function occupancyFinancialTermsPayeeNote(props) {
  if (!props.payout) return null;
  return "The weekly licence fee is paid to the account set out in clause 11.";
}
function occupancyBondSectionPayeeNote(props) {
  if (!props.payout || props.schemeApplies === true) return null;
  return "Any security deposit under this licence is paid to the same account set out in clause 11.";
}
function occupancyQldBondPaymentSupplement(props) {
  if (props.schemeApplies !== true) return null;
  if (props.bond.amount == null || !Number.isFinite(props.bond.amount) || props.bond.amount <= 0) {
    return null;
  }
  const propertyType = props.premises.propertyType ?? "";
  const pkg = resolveTenancyPackage({
    state: "QLD",
    property_type: propertyType,
    is_registered_rooming_house: false,
    date: props.term.startDate || void 0
  });
  if (!pkg.supported) return null;
  return listingBondPaymentOccupancyProse(pkg.rules.bond, "QLD", {
    qldBondRemittancePreference: props.qldBondRemittancePreference ?? void 0,
    payee: props.payout ?? void 0,
    paymentReference: props.paymentReference
  });
}

// src/lib/documents/licenceOccupy/docusealTags.ts
var LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE = { width: 220, height: 72 };
var LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE = { width: 120, height: 28 };
var LICENCE_OCCUPY_DOCUSEAL_TAG_HIDDEN = {
  fontSize: 1,
  color: "#FAF6EE"
};
function licenceOccupyDocusealTag(fieldName, role, type, size) {
  const base = `${fieldName};role=${role};type=${type}`;
  if (!size) return `{{${base}}}`;
  return `{{${base};width=${size.width};height=${size.height}}}`;
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
  return `${day}/${m}/${y}`;
}
function yn(v) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "-";
}
function renderTerminationBlocks(blocks) {
  return blocks.map((block, i) => {
    if (block.kind === "paragraph") {
      return /* @__PURE__ */ jsx2(BodyParagraph, { children: block.text }, `tb-p-${i}`);
    }
    return /* @__PURE__ */ jsxs2(View2, { children: [
      block.intro ? /* @__PURE__ */ jsx2(BodyParagraph, { children: block.intro }) : null,
      block.items.map((item, j) => /* @__PURE__ */ jsx2(Bullet, { children: item }, `tb-b-${i}-${j}`))
    ] }, `tb-b-${i}`);
  });
}
function LicenceFooter({
  content,
  documentId,
  generatedAt,
  footerText
}) {
  return /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.footerWrapOa, fixed: true, children: [
    /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.footerRuleOa }),
    /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.footerRowOa, children: [
      /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.footerLeftCoral, children: `Quni Living \xB7 ${content.docTitle} \xB7 ${documentId} \xB7 ${generatedAt}${footerText ? ` \xB7 ${footerText}` : ""}` }),
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
function DocusealField({
  label,
  tag,
  boxStyle,
  sized
}) {
  if (sized) {
    return /* @__PURE__ */ jsxs2(View2, { style: boxStyle, children: [
      /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigLabel, children: label }),
      /* @__PURE__ */ jsx2(Text2, { style: LICENCE_OCCUPY_DOCUSEAL_TAG_HIDDEN, children: tag })
    ] });
  }
  return /* @__PURE__ */ jsx2(View2, { style: boxStyle, children: /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigLabelRow, children: [
    /* @__PURE__ */ jsxs2(Text2, { style: occupancyMatchPdf.sigLabel, children: [
      label,
      " "
    ] }),
    /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.docusealTagOa, children: tag })
  ] }) });
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
  footerText,
  children
}) {
  return /* @__PURE__ */ jsxs2(Page, { size: "A4", style: occupancyMatchPdf.page, children: [
    /* @__PURE__ */ jsx2(
      OccupancyMatchFixedHeader,
      {
        documentTitle: content.docTitle,
        subtitle: content.docSubtitle,
        watermark: content.watermark
      }
    ),
    /* @__PURE__ */ jsx2(
      LicenceFooter,
      {
        content,
        documentId,
        generatedAt,
        footerText
      }
    ),
    children
  ] });
}
function ScheduleSummary({
  content,
  props,
  partyLabel
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
    { label: `${partyLabel}:`, value: ownerDisplay },
    { label: `${partyLabel} email:`, value: landlord.email },
    { label: `${partyLabel} phone:`, value: landlord.phone },
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
  const partyLabel = content.partyLabel ?? "Owner";
  const partyLabelLower = partyLabel.toLowerCase();
  const headerWatermark = content.watermark;
  const footerText = headerWatermark ? "" : content.draftFooter;
  const ownerDisplay = landlord.companyName ? `${landlord.fullName} (${landlord.companyName})` : landlord.fullName;
  const platformEntityDisplay = buildLicencePlatformEntityDisplay({
    legalName: props.platformLegalName,
    acn: props.platformAcn,
    tradingName: props.platformTradingName
  });
  const bondAmountLine = bond.amount != null && Number.isFinite(bond.amount) ? `The agreed ${content.bond.scheduleLabel.toLowerCase()} is ${formatMoney(bond.amount)}.` : `No ${content.bond.scheduleLabel.toLowerCase()} is required unless otherwise agreed in writing.`;
  const houseRulesLines = houseRules?.trim() ? houseRules.trim().split(/\n+/).map((line) => line.trim()).filter(Boolean) : [...content.defaultHouseRules];
  const extraLines = [
    ...specialConditions.filter((c) => c.trim()),
    ...bookingNotes?.trim() ? [bookingNotes.trim()] : []
  ];
  const serviceTier = props.serviceTier === "managed" ? "managed" : "listing";
  const hasExtraTerms = extraLines.length > 0;
  const hasContinuation = (content.continuationParagraphs?.length ?? 0) > 0;
  const financialTermsPayeeNote = occupancyFinancialTermsPayeeNote(props);
  const bondSectionPayeeNote = occupancyBondSectionPayeeNote(props);
  const clause11BankIntro = occupancyClause11BankDetailsIntro(content, props);
  const clause11PayeeLines = occupancyClause11PayeeLines(props);
  const qldBondSupplement = occupancyQldBondPaymentSupplement(props);
  const conditionReportClauseNum = 12;
  const continuationClauseNum = hasContinuation ? 13 : null;
  const additionalTermsClauseNum = hasContinuation ? 14 : 13;
  const executionClauseNum = hasContinuation ? hasExtraTerms ? 15 : 14 : hasExtraTerms ? 14 : 13;
  const entrySectionTitle = content.entrySectionTitle ?? "Owner's right of entry";
  const terminationSectionTitle = content.terminationSectionTitle ?? "Termination";
  const platformSectionTitle = content.platformSectionTitle ?? "Quni platform and owner service fee";
  const houseRulesIntro = content.houseRulesIntro ?? `The resident must comply with the following house rules. Additional rules may be notified by the ${partyLabelLower} in writing.`;
  const pageShellProps = { content, documentId, generatedAt, footerText };
  const docusealSized = content.docusealSizedSignatureFields === true;
  const principalSignatureTag = licenceOccupyDocusealTag(
    `${partyLabel} Signature`,
    "First Party",
    "signature",
    docusealSized ? LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE : void 0
  );
  const principalDateTag = licenceOccupyDocusealTag(
    `${partyLabel} Sign Date`,
    "First Party",
    "date",
    docusealSized ? LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE : void 0
  );
  const residentSignatureTag = licenceOccupyDocusealTag(
    "Resident Signature",
    "Second Party",
    "signature",
    docusealSized ? LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE : void 0
  );
  const residentDateTag = licenceOccupyDocusealTag(
    "Resident Sign Date",
    "Second Party",
    "date",
    docusealSized ? LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE : void 0
  );
  return /* @__PURE__ */ jsxs2(Document, { children: [
    /* @__PURE__ */ jsxs2(PageShell, { ...pageShellProps, children: [
      !headerWatermark ? /* @__PURE__ */ jsx2(Text2, { style: [occupancyMatchPdf.noteItalicMuted, { marginBottom: 8 }], children: content.draftFooter }) : null,
      /* @__PURE__ */ jsx2(ScheduleSummary, { content, props, partyLabel }),
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 1, title: "Nature of arrangement" }),
      content.natureParagraphs.map((p, i) => /* @__PURE__ */ jsx2(BodyParagraph, { children: p }, `n-${i}`)),
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 2, title: "Room and shared areas" }),
      content.roomSharedParagraphs ? content.roomSharedParagraphs.map((p, i) => /* @__PURE__ */ jsx2(BodyParagraph, { children: p }, `r-${i}`)) : /* @__PURE__ */ jsx2(BodyParagraph, { children: content.roomSharedIntro })
    ] }),
    /* @__PURE__ */ jsxs2(PageShell, { ...pageShellProps, children: [
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 3, title: entrySectionTitle }),
      content.entryParagraphs.map((p, i) => /* @__PURE__ */ jsx2(BodyParagraph, { children: p }, `e-${i}`)),
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 4, title: "Financial terms" }),
      /* @__PURE__ */ jsxs2(BodyParagraph, { children: [
        "The resident must pay the weekly licence fee of ",
        formatMoney(rent.weeklyRent),
        " in advance, by the payment method stated in the schedule: ",
        rent.paymentMethod
      ] }),
      financialTermsPayeeNote ? /* @__PURE__ */ jsx2(BodyParagraph, { children: financialTermsPayeeNote }) : null,
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.utilitiesDefault }),
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 5, title: content.bond.sectionTitle }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.bond.intro }),
      bondSectionPayeeNote ? /* @__PURE__ */ jsx2(BodyParagraph, { children: bondSectionPayeeNote }) : null,
      /* @__PURE__ */ jsx2(BodyParagraph, { children: bondAmountLine }),
      content.bond.bullets.map((b, i) => /* @__PURE__ */ jsx2(Bullet, { children: b }, `b-${i}`)),
      content.bond.afterBullets?.map((p, i) => /* @__PURE__ */ jsx2(BodyParagraph, { children: p }, `ba-${i}`)),
      qldBondSupplement ? /* @__PURE__ */ jsxs2(Fragment, { children: [
        /* @__PURE__ */ jsx2(BodyParagraph, { children: "Bond payment - your choice:" }),
        qldBondSupplement.bullets.slice(0, 2).map((b, i) => /* @__PURE__ */ jsx2(Bullet, { children: b }, `qld-route-${i}`)),
        qldBondSupplement.paragraphs.map((p, i) => /* @__PURE__ */ jsx2(BodyParagraph, { children: p }, `qld-p-${i}`)),
        qldBondSupplement.bullets.slice(2).map((b, i) => /* @__PURE__ */ jsx2(Bullet, { children: b }, `qld-step-${i}`)),
        qldBondSupplement.offenceNote ? /* @__PURE__ */ jsx2(BodyParagraph, { children: qldBondSupplement.offenceNote }) : null
      ] }) : null
    ] }),
    /* @__PURE__ */ jsxs2(PageShell, { ...pageShellProps, children: [
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 6, title: terminationSectionTitle }),
      content.terminationBlocks ? /* @__PURE__ */ jsxs2(Fragment, { children: [
        renderTerminationBlocks(content.terminationBlocks),
        /* @__PURE__ */ jsx2(BodyParagraph, { children: content.terminationNoStatutory })
      ] }) : /* @__PURE__ */ jsxs2(Fragment, { children: [
        /* @__PURE__ */ jsx2(BodyParagraph, { children: content.terminationIntro }),
        /* @__PURE__ */ jsx2(Bullet, { children: licenceTerminationNoticePhrase(rent.paymentMethod) }),
        /* @__PURE__ */ jsx2(BodyParagraph, { children: "Either party may end the licence immediately where:" }),
        content.terminationGrounds.map((g, i) => /* @__PURE__ */ jsx2(Bullet, { children: g }, `t-${i}`)),
        /* @__PURE__ */ jsx2(BodyParagraph, { children: content.terminationNoStatutory })
      ] }),
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 7, title: "Australian Consumer Law" }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.aclParagraph }),
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 8, title: "House rules" }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: houseRulesIntro }),
      content.houseRulesPrecedenceParagraph ? /* @__PURE__ */ jsx2(BodyParagraph, { children: content.houseRulesPrecedenceParagraph }) : null,
      houseRulesLines.map((r, i) => /* @__PURE__ */ jsx2(Bullet, { children: r }, `h-${i}`)),
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 9, title: "Care of room and shared areas" }),
      content.careBullets.map((b, i) => /* @__PURE__ */ jsx2(Bullet, { children: b }, `c-${i}`))
    ] }),
    /* @__PURE__ */ jsxs2(PageShell, { ...pageShellProps, children: [
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 10, title: "Disputes" }),
      content.disputesParagraphs ? content.disputesParagraphs.map((p, i) => /* @__PURE__ */ jsx2(BodyParagraph, { children: p }, `d-${i}`)) : /* @__PURE__ */ jsx2(BodyParagraph, { children: content.disputesParagraph }),
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: 11, title: platformSectionTitle }),
      /* @__PURE__ */ jsxs2(BodyParagraph, { children: [
        platformEntityDisplay,
        ' (the "Platform") ',
        content.platformIntroPrefix
      ] }),
      content.platformWarrantyParagraph ? /* @__PURE__ */ jsx2(BodyParagraph, { children: content.platformWarrantyParagraph }) : null,
      /* @__PURE__ */ jsx2(BodyParagraph, { children: ownerServiceFeeParagraphForTier(
        serviceTier,
        rent.platformFeePercent,
        void 0,
        partyLabel
      ) }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.feeFreeBankTransfer }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: clause11BankIntro }),
      clause11PayeeLines.map((line, i) => /* @__PURE__ */ jsx2(BodyParagraph, { children: line }, `payee-${i}`))
    ] }),
    /* @__PURE__ */ jsxs2(PageShell, { ...pageShellProps, children: [
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: conditionReportClauseNum, title: "Condition report" }),
      content.conditionReportParagraphs ? content.conditionReportParagraphs.map((p, i) => /* @__PURE__ */ jsx2(BodyParagraph, { children: p }, `cr-${i}`)) : /* @__PURE__ */ jsxs2(Fragment, { children: [
        /* @__PURE__ */ jsx2(BodyParagraph, { children: content.conditionReportIntro }),
        /* @__PURE__ */ jsx2(BodyParagraph, { children: content.conditionReportReturn }),
        /* @__PURE__ */ jsx2(BodyParagraph, { children: content.conditionReportOutgoing })
      ] }),
      hasContinuation && content.continuationParagraphs ? /* @__PURE__ */ jsxs2(Fragment, { children: [
        /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: continuationClauseNum, title: "Continuation after fixed period" }),
        content.continuationParagraphs.map((p, i) => /* @__PURE__ */ jsx2(BodyParagraph, { children: p }, `cont-${i}`))
      ] }) : null,
      hasExtraTerms ? /* @__PURE__ */ jsxs2(Fragment, { children: [
        /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: additionalTermsClauseNum, title: "Additional terms" }),
        extraLines.map((line, i) => /* @__PURE__ */ jsx2(Bullet, { children: line }, `x-${i}`))
      ] }) : null,
      /* @__PURE__ */ jsx2(OccupancyMatchSectionHeading, { num: executionClauseNum, title: "Execution" }),
      /* @__PURE__ */ jsx2(BodyParagraph, { children: content.executionIntro }),
      /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigTable, children: [
        /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigHeaderRow, children: [
          /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.sigHeaderCell, children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.thText, children: partyLabel }) }),
          /* @__PURE__ */ jsx2(View2, { style: occupancyMatchPdf.sigHeaderCellLast, children: /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.thText, children: "Resident" }) })
        ] }),
        /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigBodyRow, children: [
          /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigCol, children: [
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigNameBold, children: ownerDisplay }),
            /* @__PURE__ */ jsx2(
              DocusealField,
              {
                label: "Signature",
                tag: principalSignatureTag,
                boxStyle: occupancyMatchPdf.docusealSignatureFieldBox,
                sized: docusealSized
              }
            ),
            /* @__PURE__ */ jsx2(
              DocusealField,
              {
                label: "Date",
                tag: principalDateTag,
                boxStyle: occupancyMatchPdf.docusealDateFieldBox,
                sized: docusealSized
              }
            )
          ] }),
          /* @__PURE__ */ jsxs2(View2, { style: occupancyMatchPdf.sigColLast, children: [
            /* @__PURE__ */ jsx2(Text2, { style: occupancyMatchPdf.sigNameBold, children: tenant.fullName }),
            /* @__PURE__ */ jsx2(
              DocusealField,
              {
                label: "Signature",
                tag: residentSignatureTag,
                boxStyle: occupancyMatchPdf.docusealSignatureFieldBox,
                sized: docusealSized
              }
            ),
            /* @__PURE__ */ jsx2(
              DocusealField,
              {
                label: "Date",
                tag: residentDateTag,
                boxStyle: occupancyMatchPdf.docusealDateFieldBox,
                sized: docusealSized
              }
            )
          ] })
        ] })
      ] })
    ] })
  ] });
}

// src/lib/documents/licenceOccupy/watermark.ts
var LICENCE_OCCUPY_WATERMARK_PRE_SIGNOFF = "Subject to final legal review; terms may be updated with written notice";
var LICENCE_OCCUPY_WATERMARK = LICENCE_OCCUPY_WATERMARK_PRE_SIGNOFF;

// src/lib/documents/nsw/occupancyContent.ts
var NSW_LICENCE_OCCUPY_CONTENT = {
  docTitle: "Licence to Occupy",
  docSubtitle: "New South Wales - Licence to occupy (on-site accommodation)",
  draftFooter: LICENCE_OCCUPY_WATERMARK,
  watermark: LICENCE_OCCUPY_WATERMARK,
  partyLabel: "Principal",
  natureParagraphs: [
    "This document is a common-law licence to occupy a specified room within residential premises in New South Wales. It is not a residential tenancy agreement under the Residential Tenancies Act 2010 (NSW).",
    'In this licence, "Principal" means the person named as Principal in the schedule, being a person who resides on the premises and who either owns the premises or otherwise has a lawful right to grant occupation of the allocated room or space and to retain control of the premises.',
    "The Principal named in the schedule resides on the premises and retains overall control, possession and management of the whole property, including shared areas and the allocated room.",
    "The resident is granted permission to occupy only the allocated room described in the schedule and to use the shared areas on the terms below. The resident is not granted exclusive possession of the premises or any part of the premises.",
    "The Residential Tenancies Act 2010 (NSW) does not apply to this boarder/lodger arrangement. Any security deposit is held directly by the Principal and is not lodged with NSW Fair Trading or Rental Bonds Online."
  ],
  roomSharedIntro: "",
  roomSharedParagraphs: [
    "The resident is licensed to occupy the allocated room or, where the schedule specifies a shared room, the allocated bed or space within that room. Where the room is shared, the resident shares it with other residents the Principal permits, and the Principal may place another resident in the same room.",
    "Unless otherwise agreed in writing, the kitchen, bathroom, laundry and living areas are shared with the Principal and any other occupants the Principal permits on the premises."
  ],
  entrySectionTitle: "Principal's right of entry",
  entryParagraphs: [
    "Because the resident does not have exclusive possession, the Principal may enter the allocated room at reasonable times for cleaning, maintenance, inspection or to fulfil the Principal's obligations under this licence, without the notice requirements that apply to residential tenancies.",
    "The Principal retains keys or other means of access to the allocated room. The resident must not change locks or security devices without the Principal's prior written consent.",
    "The resident must not represent that they have sole or exclusive occupation of the premises or exclude the Principal from the allocated room or shared areas."
  ],
  utilitiesDefault: "Unless otherwise agreed in writing or stated in the schedule, electricity, gas, water, internet and waste services for the premises are as described on the property listing or in move-in information. Shared utilities are allocated fairly between occupants as the Principal directs.",
  bond: {
    scheduleLabel: "Security deposit",
    sectionTitle: "Security deposit",
    intro: "Where a security deposit is agreed, it is held directly by the Principal and is not lodged with NSW Fair Trading or any statutory bond service.",
    bullets: [
      "The Principal must give the resident a written receipt when the security deposit is paid.",
      "The security deposit may be applied against amounts owing under this licence, damage beyond fair wear and tear, or cleaning required to restore the allocated room and the resident's share of shared areas, subject to any agreement between the parties."
    ],
    afterBullets: [
      "The Principal must refund the security deposit (less any amount lawfully applied under this clause) within 14 days after the later of: the date the resident vacates the room or space and returns all keys; or the date the outgoing condition report is completed.",
      "If the Principal proposes to apply any part of the deposit, the Principal must give the resident an itemised written statement of the proposed deductions within 14 days after the later of those same events.",
      "If the resident disputes a proposed deduction, the parties must attempt to resolve the matter in accordance with clause 10."
    ]
  },
  terminationIntro: "",
  terminationGrounds: [],
  terminationSectionTitle: "Term and termination",
  terminationBlocks: [
    {
      kind: "paragraph",
      text: "This licence is for the fixed period stated in the schedule. Subject to the early-termination provisions below, each party commits to the licence for that period."
    },
    {
      kind: "bullets",
      intro: "Either party may end the licence immediately where:",
      items: [
        "the licence fee or other agreed charges remain unpaid and the resident has not paid them within 3 days after a written reminder;",
        "there is a serious breach of this licence or the house rules (including damage, nuisance or unsafe conduct); or",
        "the parties agree in writing."
      ]
    },
    {
      kind: "paragraph",
      text: "Early termination by the resident. The resident may end this licence before the end of the fixed period by giving the Principal at least two weeks' written notice. The resident remains liable for the weekly licence fee until the earlier of the end of that notice period and the date a replacement resident begins paying for the allocated room or space. The Principal must take reasonable steps to re-licence the room or space and must not unreasonably refuse a suitable replacement."
    },
    {
      kind: "paragraph",
      text: "Early termination by the Principal. The Principal may end this licence before the end of the fixed period on at least four weeks' written notice where the Principal requires the premises because of a genuine change of circumstances."
    }
  ],
  terminationNoStatutory: "This licence is not governed by the Residential Tenancies Act 2010 (NSW). The parties do not rely on prescribed residential tenancy notice periods or NCAT pathways under that Act.",
  aclParagraph: "Although the Residential Tenancies Act 2010 (NSW) does not apply, this licence is a consumer contract for the purposes of the Australian Consumer Law (Cth) as applied in New South Wales. Terms that are unfair within the meaning of that law may be void. Neither party may engage in misleading or deceptive conduct in connection with this licence.",
  houseRulesIntro: "The resident must comply with the following house rules. Additional rules may be notified by the Principal in writing.",
  houseRulesPrecedenceParagraph: "The House Rules are operational only. They form part of this licence but are subordinate to its operative clauses, and do not create rights or obligations inconsistent with the licence. If anything in the House Rules conflicts with the operative clauses, the operative clauses prevail.",
  defaultHouseRules: [
    "Guests and overnight visitors: reasonable notice to the Principal; no guest may stay more than 7 consecutive nights without the Principal's written consent.",
    "Noise: respect quiet hours (typically 10:00 pm \u2013 7:00 am) and other occupants.",
    "Cleaning: keep the allocated room clean; leave shared areas tidy after use; follow any weekly cleaning arrangement stated in the schedule.",
    "Smoking: only where permitted by the Principal and outside shared enclosed areas unless otherwise agreed.",
    "Pets: only with the Principal's prior written consent.",
    "Common areas: shared fairly; do not monopolise kitchen, bathroom or living areas.",
    "Utilities: use services responsibly; report faults promptly to the Principal."
  ],
  careBullets: [
    "Keep the allocated room and shared areas the resident uses in a reasonably clean condition.",
    "Report damage, maintenance needs or safety concerns to the Principal promptly.",
    "Must not intentionally or negligently damage the premises or cause nuisance to the Principal or other occupants."
  ],
  disputesParagraph: "",
  disputesParagraphs: [
    "If a dispute arises about this licence, the parties will use their best efforts to resolve it through good faith discussion within 14 days of one party notifying the other in writing.",
    "This licence is not a residential tenancy agreement under the Residential Tenancies Act 2010 (NSW), and neither party may apply to the NSW Civil and Administrative Tribunal in respect of this licence.",
    "Nothing in this clause limits any right a party would otherwise have at law."
  ],
  conditionReportIntro: "",
  conditionReportReturn: "",
  conditionReportOutgoing: "",
  conditionReportParagraphs: [
    "The Principal will prepare an ingoing condition report for the allocated room or space and shared areas, supported by photographs, at or before the start of the licence. The resident will be given a reasonable opportunity to review and comment on the report and to attach their own photographs where appropriate.",
    "The resident should return a signed copy or written comments within the timeframe notified by the Principal or the Platform, failing which the report may be taken as accepted except for manifest errors or items the resident could not reasonably have inspected. At the end of the licence, an outgoing condition report will be used to compare the state of the allocated room or space and shared areas with the ingoing report, fair wear and tear excepted. Any deduction from the security deposit for damage should be supported by these reports."
  ],
  continuationParagraphs: [
    "If neither party gives written notice to end this licence before the expiry of the fixed period, the licence continues on a periodic weekly basis on the same terms and conditions.",
    "During any periodic continuation, either party may end this licence by giving written notice in accordance with clause 6 (two weeks for the resident; four weeks for the Principal).",
    "The weekly licence fee and all other obligations under this licence remain unchanged during any periodic continuation unless varied by written agreement of both parties.",
    "For the avoidance of doubt, during any periodic continuation the resident's liability on termination is limited to the applicable notice period; the mitigation and re-letting obligations in clause 6 apply only during the fixed period."
  ],
  feeFreeBankTransfer: "A fee-free direct bank transfer option remains available at all times for payment of the weekly licence fee. The resident is not required to pay Quni platform fees, booking fees or resident service fees, and the agreed weekly licence fee is not increased by the Principal-side service fee described below.",
  bankDetailsTemplate: "Direct credit details for payment of the weekly licence fee will be provided by the Principal (account name, BSB and account number). Use your name and the property address as the payment reference.",
  platformIntroPrefix: "operates an online marketplace and payment facilitation service. The Platform is not the owner, property manager or agent for the premises unless separately appointed in writing. The Principal remains responsible for the allocated room, shared areas and this licence.",
  platformSectionTitle: "Quni platform, Principal's warranty and service fee",
  platformWarrantyParagraph: "Principal's warranty. The Principal warrants that they have the right to grant this licence and, where they are not the registered proprietor of the premises, that they hold any consent required from the registered owner, any co-owners, or the Principal's own landlord to grant it. The resident acknowledges that their right to occupy depends on the Principal's continuing right to grant it.",
  executionIntro: "The parties intend that electronic signing, where used, is valid and binding under the Electronic Transactions Act 2000 (NSW) and related law. Signature and date fields may be completed through the signing workflow.",
  docusealSizedSignatureFields: true
};
var NSW_OCCUPANCY_PDF_MARKERS = [
  "Licence to Occupy",
  "Weekly licence fee",
  "Security deposit",
  "Residential Tenancies Act 2010",
  "not lodged with NSW Fair Trading",
  "Quni platform fees, booking fees or resident service fees",
  "Subject to final legal review",
  "Principal",
  "Term and termination",
  "Continuation after fixed period"
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
