// src/lib/documents/nsw/boardingHouse/generator.tsx
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

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

// src/lib/documents/nsw/boardingHouse/lockedText.ts
var BH_TITLE = "STANDARD OCCUPANCY AGREEMENT";
var BH_SUBTITLE = "For general boarding houses under the Boarding Houses Act 2012";
var BH_BETWEEN_PROPRIETOR = "Between \u2014 Proprietor";
var BH_FOR_ROOM = "For \u2014 Room";
var BH_EMERGENCY_CONTACT_NAME = "Emergency contact \u2014 Name:";
var BH_CLAUSE_1_HEADING = "1. Condition of the Premises (occupancy principle 1)";
var BH_CLAUSE_1_BODY = "The proprietor agrees to provide and maintain the premises so that they are in a reasonable state of repair, are reasonably clean and reasonably secure.";
var BH_CLAUSE_2_HEADING = "2. House Rules (occupancy principle 2)";
var BH_CLAUSE_2_BODY = "The resident agrees to comply with the House Rules of the boarding house, which are listed on the attached \u201CStatement of House Rules.\u201D House rules may not be inconsistent with the Occupancy Principles stated in Annexure 1, and are not enforceable if they are inconsistent.";
var BH_CLAUSE_3_HEADING = "3. No Penalties (occupancy principle 3)";
var BH_CLAUSE_3_BODY = "The resident is not required to pay a penalty for a breach of this Occupancy Agreement or the House Rules.";
var BH_CLAUSE_4_HEADING = "4. Quiet Enjoyment (occupancy principle 4)";
var BH_CLAUSE_4_BODY = "The proprietor agrees to take all reasonable steps to enable the resident\u2019s quiet enjoyment of the premises.";
var BH_CLAUSE_5_HEADING = "5. Inspections and Access (occupancy principle 5)";
var BH_CLAUSE_5_INTRO_1 = "The proprietor may inspect boarding house common areas at any reasonable time. Repairs, cleaning and maintenance of common areas can be carried out at reasonable times.";
var BH_CLAUSE_5_INTRO_2 = "The proprietor may only enter the resident\u2019s room, at a reasonable time, with reasonable notice and on reasonable grounds. Agreed access and notice periods are set out below. If the third column is left blank, the suggested notice periods in the second column apply.";
var BH_CLAUSE_5_FOOTNOTE = "* Immediate access is likely to be necessary in this situation for safety reasons.";
var BH_ACCESS_ROWS = [
  { reason: "In an emergency, or to carry out emergency repairs or inspections", suggested: "Immediate access*" },
  { reason: "To clean the premises", suggested: "24 hours" },
  { reason: "To carry out repairs", suggested: "24 hours" },
  { reason: "To show the room to a prospective resident", suggested: "24 hours" },
  { reason: "To carry out inspections", suggested: "48 hours" }
];
var BH_CLAUSE_6_HEADING = "6. Notice of Fee Increase (occupancy principle 6)";
var BH_CLAUSE_6_BODY = "The resident is entitled to 4 weeks written notice of any increase in the occupancy fee.";
var BH_CLAUSE_7_HEADING = "7. Utility Charges (occupancy principle 7)";
var BH_CLAUSE_7_BODY_1 = "The proprietor may charge an additional amount for utilities if the resident is made aware of this on signing this agreement. Details of the charge, including how the charge will be calculated, are included in Annexure 2, and Annexure 2 must be signed and dated by the resident and the proprietor.";
var BH_CLAUSE_7_BODY_2 = "Charges for utilities must be based on the cost to the proprietor of providing the utility and a reasonable measure or estimate of the resident\u2019s use of that utility.";
var BH_CLAUSE_8_HEADING = "8. Security Deposit (occupancy principle 8)";
var BH_CLAUSE_8_BODY_PREFIX = "A security deposit of ";
var BH_CLAUSE_8_BODY_SUFFIX = " is payable to the proprietor, this amount being no more than the sum of two (2) weeks occupancy fee. The security deposit is payable on the day the agreement is signed or on the following day. The security deposit will be repaid to the resident (or the resident\u2019s authorised representative) within 14 days after the end of this agreement, less any amount necessary to cover:";
var BH_CLAUSE_8_BULLETS = [
  "the reasonable cost of repairs to the boarding house or goods within the boarding house, as a result of damage (other than fair wear or tear) caused by the resident or their guest;",
  "any occupancy fee or other charges owing and payable under this Agreement or the Boarding Houses Act;",
  "the reasonable cost of cleaning any part of the premises occupied by the resident and not left reasonably clean by the resident, having regard to the condition of that part of the premises at the commencement of the occupancy; and",
  "the reasonable cost of replacing locks or other security devices altered, removed or added by the resident without the consent of the proprietor."
];
var BH_CLAUSE_9_HEADING = "9. Dispute Resolution (occupancy principle 11)";
var BH_CLAUSE_9_BODY = "The proprietor and the resident agree to use their best endeavours to informally resolve any disputes between them through reasonable discussion and negotiation. Either party may apply to the NSW Civil and Administrative Tribunal (NCAT) to resolve a dispute about the Occupancy Principles (see Annexure 1).";
var BH_CLAUSE_10_HEADING = "10. Written Receipts (occupancy principle 12)";
var BH_CLAUSE_10_BODY = "The proprietor agrees to provide the resident with a written receipt for all money paid to the proprietor, including money paid for occupancy fees, a security deposit and for any utility charges. The receipt should be provided within a reasonable time period after the payment is received.";
var BH_CLAUSE_11_HEADING = "11. Termination (occupancy principles 9 and 10)";
var BH_CLAUSE_11_INTRO_1 = "The resident is entitled to know why and how this Occupancy Agreement may be terminated, and how much notice will be given before termination. The resident may not be evicted without reasonable written notice from the proprietor.";
var BH_CLAUSE_11_INTRO_2 = "This Agreement can also be terminated by the resident by written notice given to the proprietor. Agreed reasons for termination and notice periods are set out below. If the third column is left blank, the suggested notice periods in the second column apply.";
var BH_CLAUSE_11_PROP_FOOTNOTE = "* Immediate termination is likely to be necessary in this situation in order to protect other residents and employees.";
var BH_PROP_TERM_ROWS = [
  {
    reason: "Violence or threats of violence towards anyone living or working in or visiting the premises",
    suggested: "Immediate*"
  },
  {
    reason: "Wilfully causing damage to the premises, or using the premises for an illegal purpose",
    suggested: "1 day"
  },
  {
    reason: "Continued and serious breach of this Agreement or the house rules, following a written warning",
    suggested: "3 days"
  },
  {
    reason: "Continued minor breach of this Agreement or the house rules, following a written warning",
    suggested: "1 week"
  },
  { reason: "Non-payment of the occupancy fee", suggested: "2 weeks" },
  {
    reason: "Any other reason, including vacant possession required and \u201Cno grounds\u201D termination",
    suggested: "4 weeks"
  }
];
var BH_RES_TERM_ROWS = [
  { reason: "Serious breach of Agreement by proprietor", suggested: "1 day" },
  { reason: "Minor breach of agreement by proprietor", suggested: "1 week" },
  { reason: "No grounds / any other reason", suggested: "1 week" }
];
var BH_CLAUSE_12_HEADING = "12. Use of the Premises";
var BH_CLAUSE_12_BODY = "The resident agrees not to wilfully or negligently cause damage to the premises or to use the premises for an illegal purpose and to respect other residents\u2019 rights to quiet enjoyment of the premises.";
var BH_NOTE = "NOTE: Any term of this Agreement is not enforceable if it is inconsistent with the Occupancy Principles set out in Schedule 1 of the Boarding Houses Act 2012. The Occupancy Principles are attached at Annexure 1.";
var BH_CROWN = "\xA9 State of New South Wales through NSW Fair Trading.";
var BH_ANNEXURE_1_TITLE = "Annexure 1 \u2014 Occupancy Principles";
var BH_ANNEXURE_1_INTRO = "These principles are contained in Schedule 1 of the Boarding Houses Act 2012 and apply to residents of NSW boarding houses covered by the Act.";
var BH_PRINCIPLES = [
  "1. State of premises \u2014 A resident is entitled to live in premises that are: (a) reasonably clean, (b) in a reasonable state of repair, and (c) reasonably secure.",
  "2. Rules of the boarding house \u2014 A resident is entitled to know the rules of the registrable boarding house before moving in.",
  "3. Penalties for breaches prohibited \u2014 A resident may not be required to pay a penalty for a breach of the occupancy agreement or the rules of the boarding house.",
  "4. Quiet enjoyment \u2014 A resident is entitled to quiet enjoyment of the premises.",
  "5. Inspections and repairs \u2014 A proprietor is entitled to enter the premises at a reasonable time on reasonable grounds to carry out inspections or repairs and for other reasonable purposes.",
  "6. Notice of increase of occupancy fee \u2014 A resident is entitled to 4 weeks written notice before the proprietor increases the occupancy fee.",
  "7. Utility charges \u2014 The proprietor may charge a resident an additional amount for a utility (electricity, gas, oil, water, or another prescribed service) only if the resident was notified before or when entering the agreement, and the amount is based on the proprietor\u2019s cost of providing the utility and a reasonable measure or estimate of the resident\u2019s use.",
  "8. Payment of security deposits \u2014 A security deposit may be required only if it does not exceed 2 weeks occupancy fee and is payable on or after the day the resident enters the agreement. Within 14 days after the end of the agreement the proprietor must repay it, less amounts necessary to cover: reasonable repair of damage (beyond fair wear and tear) by the resident or an invitee; occupancy fees or charges owing; reasonable cleaning; and reasonable cost of replacing locks/security devices altered without consent. The proprietor may retain the whole deposit if those costs equal or exceed it.",
  "9. Information about occupancy termination \u2014 A resident is entitled to know why and how the occupancy may be terminated, including how much notice will be given before eviction.",
  "10. Notice of eviction \u2014 A resident must not be evicted without reasonable written notice. In determining reasonable notice, the proprietor may take into account the safety of other residents, the proprietor and the manager (this does not limit other relevant circumstances).",
  "11. Use of alternative dispute resolution \u2014 A proprietor and resident should try to resolve disputes using reasonable dispute resolution processes.",
  "12. Provision of written receipts \u2014 A resident must be given a written receipt for any money paid to the proprietor or a person on behalf of the proprietor."
];
var BH_ANNEXURE_2_TITLE = "Annexure 2 \u2014 Schedule of Additional Charges";
var BH_ANNEXURE_2_INTRO = "For use only if there are fees or charges in addition to the occupancy fee. This schedule forms part of the Occupancy Agreement when signed and dated by both parties. A receipt must be provided to the resident for all such payments within a reasonable time. Utility charges must comply with Occupancy Principle 7.";
var BH_HOUSE_RULES_TITLE = "Statement of House Rules";
var BH_HOUSE_RULES_INTRO = "The resident agrees to comply with the House Rules of the boarding house. House rules may not be inconsistent with the Occupancy Principles stated in Annexure 1, and are not enforceable if they are inconsistent.";
var NSW_BOARDING_HOUSE_PDF_MARKERS = [
  BH_TITLE,
  BH_SUBTITLE,
  BH_CLAUSE_1_BODY,
  BH_CLAUSE_2_BODY,
  BH_CLAUSE_3_BODY,
  BH_CLAUSE_4_BODY,
  BH_CLAUSE_5_INTRO_2,
  BH_CLAUSE_6_BODY,
  BH_CLAUSE_7_BODY_2,
  "this amount being no more than the sum of two (2) weeks occupancy fee",
  BH_CLAUSE_9_BODY,
  BH_CLAUSE_10_BODY,
  BH_CLAUSE_11_INTRO_1,
  BH_CLAUSE_12_BODY,
  BH_NOTE,
  BH_CROWN,
  BH_ANNEXURE_1_INTRO,
  BH_PRINCIPLES[0],
  BH_PRINCIPLES[10],
  BH_HOUSE_RULES_TITLE
];

// src/lib/documents/nsw/boardingHouse/types.ts
var NSW_BOARDING_HOUSE_FORBIDDEN_MARKERS = [
  "Quni",
  "Principal",
  "NCAT does not apply",
  "facilitated through",
  "Rental Bonds Online",
  "Licence to Occupy",
  "Subject to final legal review",
  "Draft for legal review",
  "not for execution",
  "SAMPLE"
];

// src/lib/documents/nsw/boardingHouse/generator.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 42,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#111111",
    lineHeight: 1.45,
    backgroundColor: "#ffffff"
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    letterSpacing: 0.4,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 9.5,
    textAlign: "center",
    marginBottom: 12
  },
  heading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 8,
    marginBottom: 3
  },
  body: {
    fontSize: 9.5,
    marginBottom: 4,
    textAlign: "justify"
  },
  note: {
    fontSize: 9,
    fontFamily: "Helvetica-Oblique",
    marginTop: 8,
    marginBottom: 8
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start"
  },
  label: {
    fontFamily: "Helvetica-Bold",
    width: 132,
    fontSize: 9
  },
  value: {
    flex: 1,
    fontSize: 9.5
  },
  tickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 4
  },
  tickItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
    marginBottom: 3
  },
  box: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: "#111111",
    marginRight: 4,
    alignItems: "center",
    justifyContent: "center"
  },
  boxMark: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1
  },
  tableHeader: {
    flexDirection: "row",
    borderWidth: 0.75,
    borderColor: "#111111",
    backgroundColor: "#f3f3f3"
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: "#111111"
  },
  th: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    padding: 4
  },
  td: {
    fontSize: 8,
    padding: 4
  },
  colReason: { width: "46%" },
  colSuggested: { width: "27%" },
  colOverride: { width: "27%" },
  bullet: {
    fontSize: 9.5,
    marginLeft: 12,
    marginBottom: 2
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 42,
    right: 42,
    fontSize: 7.5,
    color: "#444444",
    borderTopWidth: 0.5,
    borderTopColor: "#cccccc",
    paddingTop: 4,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sigRow: {
    flexDirection: "row",
    marginTop: 14
  },
  sigCol: {
    flex: 1
  },
  sigBox: {
    borderWidth: 1,
    borderColor: "#9ca3af",
    minHeight: 40,
    marginTop: 4,
    padding: 4
  },
  hiddenTag: {
    fontSize: LICENCE_OCCUPY_DOCUSEAL_TAG_HIDDEN.fontSize,
    color: LICENCE_OCCUPY_DOCUSEAL_TAG_HIDDEN.color
  }
});
function formatMoney(n) {
  return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatIsoDateAu(iso) {
  const raw = iso.slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
function formatBsb(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return raw.trim();
}
function Tick({ checked, label }) {
  return /* @__PURE__ */ jsxs(View, { style: styles.tickItem, children: [
    /* @__PURE__ */ jsx(View, { style: styles.box, children: checked ? /* @__PURE__ */ jsx(Text, { style: styles.boxMark, children: "X" }) : null }),
    /* @__PURE__ */ jsx(Text, { children: label })
  ] });
}
function Field({ label, value }) {
  return /* @__PURE__ */ jsxs(View, { style: styles.fieldRow, children: [
    /* @__PURE__ */ jsx(Text, { style: styles.label, children: label }),
    /* @__PURE__ */ jsx(Text, { style: styles.value, children: value || " " })
  ] });
}
function NoticeTable({
  rows,
  reasonHeader,
  overrides
}) {
  return /* @__PURE__ */ jsxs(View, { wrap: false, style: { marginBottom: 6, marginTop: 4 }, children: [
    /* @__PURE__ */ jsxs(View, { style: styles.tableHeader, children: [
      /* @__PURE__ */ jsx(Text, { style: [styles.th, styles.colReason], children: reasonHeader }),
      /* @__PURE__ */ jsx(Text, { style: [styles.th, styles.colSuggested], children: "Suggested notice period (applies if next column left blank)" }),
      /* @__PURE__ */ jsx(Text, { style: [styles.th, styles.colOverride], children: "Notice under this agreement (if different)" })
    ] }),
    rows.map((row, i) => /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
      /* @__PURE__ */ jsx(Text, { style: [styles.td, styles.colReason], children: row.reason }),
      /* @__PURE__ */ jsx(Text, { style: [styles.td, styles.colSuggested], children: row.suggested }),
      /* @__PURE__ */ jsx(Text, { style: [styles.td, styles.colOverride], children: overrides?.[i]?.trim() || " " })
    ] }, row.reason))
  ] });
}
function Footer({ documentId }) {
  return /* @__PURE__ */ jsxs(View, { style: styles.footer, fixed: true, children: [
    /* @__PURE__ */ jsx(Text, { children: BH_CROWN }),
    /* @__PURE__ */ jsx(
      Text,
      {
        render: ({ pageNumber, totalPages }) => `${documentId}  \xB7  Page ${pageNumber} of ${totalPages}`
      }
    )
  ] });
}
function proprietorDisplayName(props) {
  const company = props.proprietor.companyName?.trim();
  if (company) return company;
  return props.proprietor.fullName.trim() || " ";
}
function occupancyFeePaymentLines(props) {
  const payout = props.payout;
  if (!payout) return "Direct credit to the proprietor.";
  const parts = [
    `Direct credit to the proprietor. Account name: ${payout.account_name.trim()}`,
    `BSB: ${formatBsb(payout.bsb)}`,
    `Account number: ${payout.account_number.trim()}`
  ];
  if (props.paymentReference.trim()) parts.push(`Reference: ${props.paymentReference.trim()}`);
  return parts.join(". ") + ".";
}
function SharedAreaTicks({ areas }) {
  return /* @__PURE__ */ jsxs(View, { children: [
    /* @__PURE__ */ jsx(Text, { style: [styles.body, { marginBottom: 2 }], children: "Other areas of the premises available for the resident\u2019s use:" }),
    /* @__PURE__ */ jsxs(View, { style: styles.tickRow, children: [
      /* @__PURE__ */ jsx(Tick, { checked: areas.kitchen, label: "Kitchen/s" }),
      /* @__PURE__ */ jsx(Tick, { checked: areas.bathroom, label: "Bathroom/s" }),
      /* @__PURE__ */ jsx(Tick, { checked: areas.commonRoom, label: "Common room" }),
      /* @__PURE__ */ jsx(Tick, { checked: areas.laundry, label: "Laundry" }),
      /* @__PURE__ */ jsx(Tick, { checked: areas.other.trim().length > 0, label: `Other: ${areas.other.trim() || "________________"}` })
    ] })
  ] });
}
function SignatureBlock() {
  const proprietorSig = licenceOccupyDocusealTag(
    "Proprietor Signature",
    "First Party",
    "signature",
    LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE
  );
  const proprietorDate = licenceOccupyDocusealTag(
    "Proprietor Sign Date",
    "First Party",
    "date",
    LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE
  );
  const residentSig = licenceOccupyDocusealTag(
    "Resident Signature",
    "Second Party",
    "signature",
    LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE
  );
  const residentDate = licenceOccupyDocusealTag(
    "Resident Sign Date",
    "Second Party",
    "date",
    LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE
  );
  return /* @__PURE__ */ jsxs(View, { style: styles.sigRow, wrap: false, children: [
    /* @__PURE__ */ jsxs(View, { style: [styles.sigCol, { marginRight: 12 }], children: [
      /* @__PURE__ */ jsx(Text, { style: { fontFamily: "Helvetica-Bold", fontSize: 9 }, children: "Signed (Proprietor)" }),
      /* @__PURE__ */ jsx(View, { style: styles.sigBox, children: /* @__PURE__ */ jsx(Text, { style: styles.hiddenTag, children: proprietorSig }) }),
      /* @__PURE__ */ jsx(Text, { style: { fontSize: 8, marginTop: 6 }, children: "Date" }),
      /* @__PURE__ */ jsx(View, { style: [styles.sigBox, { minHeight: 22 }], children: /* @__PURE__ */ jsx(Text, { style: styles.hiddenTag, children: proprietorDate }) })
    ] }),
    /* @__PURE__ */ jsxs(View, { style: [styles.sigCol, { marginRight: 12 }], children: [
      /* @__PURE__ */ jsx(Text, { style: { fontFamily: "Helvetica-Bold", fontSize: 9 }, children: "Signed (Resident)" }),
      /* @__PURE__ */ jsx(View, { style: styles.sigBox, children: /* @__PURE__ */ jsx(Text, { style: styles.hiddenTag, children: residentSig }) }),
      /* @__PURE__ */ jsx(Text, { style: { fontSize: 8, marginTop: 6 }, children: "Date" }),
      /* @__PURE__ */ jsx(View, { style: [styles.sigBox, { minHeight: 22 }], children: /* @__PURE__ */ jsx(Text, { style: styles.hiddenTag, children: residentDate }) })
    ] })
  ] });
}
function Annexure2Signatures() {
  const proprietorSig = licenceOccupyDocusealTag(
    "Annexure 2 Proprietor Signature",
    "First Party",
    "signature",
    LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE
  );
  const proprietorDate = licenceOccupyDocusealTag(
    "Annexure 2 Proprietor Sign Date",
    "First Party",
    "date",
    LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE
  );
  const residentSig = licenceOccupyDocusealTag(
    "Annexure 2 Resident Signature",
    "Second Party",
    "signature",
    LICENCE_OCCUPY_DOCUSEAL_SIGNATURE_SIZE
  );
  const residentDate = licenceOccupyDocusealTag(
    "Annexure 2 Resident Sign Date",
    "Second Party",
    "date",
    LICENCE_OCCUPY_DOCUSEAL_DATE_SIZE
  );
  return /* @__PURE__ */ jsxs(View, { style: styles.sigRow, wrap: false, children: [
    /* @__PURE__ */ jsxs(View, { style: [styles.sigCol, { marginRight: 12 }], children: [
      /* @__PURE__ */ jsx(Text, { style: { fontFamily: "Helvetica-Bold", fontSize: 9 }, children: "Signed (Proprietor)" }),
      /* @__PURE__ */ jsx(View, { style: styles.sigBox, children: /* @__PURE__ */ jsx(Text, { style: styles.hiddenTag, children: proprietorSig }) }),
      /* @__PURE__ */ jsx(Text, { style: { fontSize: 8, marginTop: 6 }, children: "Date" }),
      /* @__PURE__ */ jsx(View, { style: [styles.sigBox, { minHeight: 22 }], children: /* @__PURE__ */ jsx(Text, { style: styles.hiddenTag, children: proprietorDate }) })
    ] }),
    /* @__PURE__ */ jsxs(View, { style: [styles.sigCol, { marginRight: 12 }], children: [
      /* @__PURE__ */ jsx(Text, { style: { fontFamily: "Helvetica-Bold", fontSize: 9 }, children: "Signed (Resident)" }),
      /* @__PURE__ */ jsx(View, { style: styles.sigBox, children: /* @__PURE__ */ jsx(Text, { style: styles.hiddenTag, children: residentSig }) }),
      /* @__PURE__ */ jsx(Text, { style: { fontSize: 8, marginTop: 6 }, children: "Date" }),
      /* @__PURE__ */ jsx(View, { style: [styles.sigBox, { minHeight: 22 }], children: /* @__PURE__ */ jsx(Text, { style: styles.hiddenTag, children: residentDate }) })
    ] })
  ] });
}
function ChargeTable({ rows }) {
  return /* @__PURE__ */ jsxs(View, { style: { marginTop: 6, marginBottom: 8 }, children: [
    /* @__PURE__ */ jsxs(View, { style: styles.tableHeader, children: [
      /* @__PURE__ */ jsx(Text, { style: [styles.th, { width: "28%" }], children: "Item" }),
      /* @__PURE__ */ jsx(Text, { style: [styles.th, { width: "18%" }], children: "Amount" }),
      /* @__PURE__ */ jsx(Text, { style: [styles.th, { width: "22%" }], children: "When due to be paid" }),
      /* @__PURE__ */ jsx(Text, { style: [styles.th, { width: "32%" }], children: "How calculated" })
    ] }),
    rows.map((row, i) => /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
      /* @__PURE__ */ jsx(Text, { style: [styles.td, { width: "28%" }], children: row.item }),
      /* @__PURE__ */ jsx(Text, { style: [styles.td, { width: "18%" }], children: row.amount }),
      /* @__PURE__ */ jsx(Text, { style: [styles.td, { width: "22%" }], children: row.whenDue }),
      /* @__PURE__ */ jsx(Text, { style: [styles.td, { width: "32%" }], children: row.howCalculated })
    ] }, `${row.item}-${i}`))
  ] });
}
function NswBoardingHouseOccupancyAgreement(props) {
  const deposit = props.securityDepositAud != null && Number.isFinite(props.securityDepositAud) ? formatMoney(props.securityDepositAud) : formatMoney(0);
  const furnished = props.premises.furnished === true;
  const unfurnished = props.premises.furnished === false;
  const includeAnnexure2 = props.additionalCharges.length >= 1;
  const termLabel = props.term.periodic ? "Periodic" : props.term.endDate ? `${props.term.leaseLengthDescription} (ends ${formatIsoDateAu(props.term.endDate)})` : props.term.leaseLengthDescription;
  const proprietorContact = [
    proprietorDisplayName(props),
    props.proprietor.addressLine,
    props.proprietor.phone,
    props.proprietor.email,
    props.proprietor.abn ? `ABN ${props.proprietor.abn}` : ""
  ].map((s) => s.trim()).filter(Boolean).join("\n");
  return /* @__PURE__ */ jsxs(Document, { children: [
    /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx(Footer, { documentId: props.documentId }),
      /* @__PURE__ */ jsx(Text, { style: styles.title, children: BH_TITLE }),
      /* @__PURE__ */ jsx(Text, { style: styles.subtitle, children: BH_SUBTITLE }),
      /* @__PURE__ */ jsx(Field, { label: BH_BETWEEN_PROPRIETOR, value: proprietorDisplayName(props) }),
      /* @__PURE__ */ jsx(Field, { label: "Resident", value: props.resident.fullName }),
      /* @__PURE__ */ jsx(Field, { label: BH_FOR_ROOM, value: props.premises.roomDescription }),
      /* @__PURE__ */ jsx(Field, { label: "Address", value: props.premises.addressLine }),
      /* @__PURE__ */ jsx(Text, { style: [styles.body, { marginTop: 4 }], children: "The resident\u2019s room is:" }),
      /* @__PURE__ */ jsxs(View, { style: styles.tickRow, children: [
        /* @__PURE__ */ jsx(Tick, { checked: unfurnished, label: "unfurnished" }),
        /* @__PURE__ */ jsx(Tick, { checked: furnished, label: "furnished   (if furnished, an inventory can be attached)" })
      ] }),
      /* @__PURE__ */ jsx(SharedAreaTicks, { areas: props.premises.sharedAreas }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: "Term of Contract" }),
      /* @__PURE__ */ jsx(Field, { label: "Commencement Date", value: formatIsoDateAu(props.term.startDate) }),
      /* @__PURE__ */ jsx(Field, { label: "Term of agreement (if any)", value: termLabel }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: "Occupancy Fee" }),
      /* @__PURE__ */ jsx(Field, { label: "To be paid", value: occupancyFeePaymentLines(props) }),
      /* @__PURE__ */ jsx(Field, { label: "$ per", value: `${formatMoney(props.occupancyFeeWeeklyAud)} per` }),
      /* @__PURE__ */ jsxs(View, { style: styles.tickRow, children: [
        /* @__PURE__ */ jsx(Text, { children: "Occupancy fee period:" }),
        /* @__PURE__ */ jsx(Tick, { checked: true, label: "week" }),
        /* @__PURE__ */ jsx(Tick, { checked: false, label: "month" }),
        /* @__PURE__ */ jsx(Tick, { checked: false, label: "year" })
      ] }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: "Proprietor\u2019s Contact Details:" }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: proprietorContact || " " })
    ] }),
    /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx(Footer, { documentId: props.documentId }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: "AGREEMENT TERMS" }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: BH_CLAUSE_1_HEADING }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_CLAUSE_1_BODY }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: BH_CLAUSE_2_HEADING }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_CLAUSE_2_BODY }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: BH_CLAUSE_3_HEADING }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_CLAUSE_3_BODY }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: BH_CLAUSE_4_HEADING }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_CLAUSE_4_BODY }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: BH_CLAUSE_5_HEADING }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_CLAUSE_5_INTRO_1 }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_CLAUSE_5_INTRO_2 }),
      /* @__PURE__ */ jsx(
        NoticeTable,
        {
          rows: BH_ACCESS_ROWS,
          reasonHeader: "Reason for Access",
          overrides: props.noticeOverrides?.access
        }
      ),
      /* @__PURE__ */ jsx(Text, { style: styles.note, children: BH_CLAUSE_5_FOOTNOTE }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: BH_CLAUSE_6_HEADING }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_CLAUSE_6_BODY }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: BH_CLAUSE_7_HEADING }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_CLAUSE_7_BODY_1 }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_CLAUSE_7_BODY_2 })
    ] }),
    /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx(Footer, { documentId: props.documentId }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: BH_CLAUSE_8_HEADING }),
      /* @__PURE__ */ jsxs(Text, { style: styles.body, children: [
        BH_CLAUSE_8_BODY_PREFIX,
        deposit,
        BH_CLAUSE_8_BODY_SUFFIX
      ] }),
      BH_CLAUSE_8_BULLETS.map((b, i) => /* @__PURE__ */ jsx(Text, { style: styles.bullet, children: `${String.fromCharCode(97 + i)}) ${b}` }, b)),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: BH_CLAUSE_9_HEADING }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_CLAUSE_9_BODY }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: BH_CLAUSE_10_HEADING }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_CLAUSE_10_BODY }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: BH_CLAUSE_11_HEADING }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_CLAUSE_11_INTRO_1 }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_CLAUSE_11_INTRO_2 }),
      /* @__PURE__ */ jsx(
        NoticeTable,
        {
          rows: BH_PROP_TERM_ROWS,
          reasonHeader: "Reason for Termination by Proprietor",
          overrides: props.noticeOverrides?.proprietorTermination
        }
      ),
      /* @__PURE__ */ jsx(Text, { style: styles.note, children: BH_CLAUSE_11_PROP_FOOTNOTE }),
      /* @__PURE__ */ jsx(
        NoticeTable,
        {
          rows: BH_RES_TERM_ROWS,
          reasonHeader: "Reason for Termination by Resident",
          overrides: props.noticeOverrides?.residentTermination
        }
      ),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: BH_CLAUSE_12_HEADING }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_CLAUSE_12_BODY }),
      /* @__PURE__ */ jsx(Text, { style: styles.note, children: BH_NOTE }),
      /* @__PURE__ */ jsx(SignatureBlock, {}),
      /* @__PURE__ */ jsx(Text, { style: [styles.body, { marginTop: 10 }], children: BH_CROWN }),
      /* @__PURE__ */ jsx(Text, { style: [styles.heading, { marginTop: 14 }], children: "Optional Information" }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: "The resident may provide contact details to be used in an emergency." }),
      /* @__PURE__ */ jsx(Field, { label: "Personal phone no/s:", value: props.resident.phone || " " }),
      /* @__PURE__ */ jsx(Field, { label: BH_EMERGENCY_CONTACT_NAME, value: props.resident.emergencyContactName?.trim() || " " }),
      /* @__PURE__ */ jsx(Field, { label: "Relationship:", value: " " }),
      /* @__PURE__ */ jsx(
        Field,
        {
          label: "Phone and/or address:",
          value: props.resident.emergencyContactPhone?.trim() || " "
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx(Footer, { documentId: props.documentId }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: BH_ANNEXURE_1_TITLE }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_ANNEXURE_1_INTRO }),
      BH_PRINCIPLES.map((p) => /* @__PURE__ */ jsx(Text, { style: styles.body, children: p }, p))
    ] }),
    includeAnnexure2 ? /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx(Footer, { documentId: props.documentId }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: BH_ANNEXURE_2_TITLE }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_ANNEXURE_2_INTRO }),
      /* @__PURE__ */ jsx(ChargeTable, { rows: props.additionalCharges }),
      /* @__PURE__ */ jsx(Annexure2Signatures, {})
    ] }) : null,
    /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx(Footer, { documentId: props.documentId }),
      /* @__PURE__ */ jsx(Text, { style: styles.heading, children: BH_HOUSE_RULES_TITLE }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: BH_HOUSE_RULES_INTRO }),
      /* @__PURE__ */ jsx(Text, { style: [styles.body, { marginTop: 8, minHeight: 120 }], children: props.houseRules?.trim() || " " })
    ] })
  ] });
}
var generator_default = NswBoardingHouseOccupancyAgreement;
export {
  NSW_BOARDING_HOUSE_FORBIDDEN_MARKERS,
  NSW_BOARDING_HOUSE_PDF_MARKERS,
  NswBoardingHouseOccupancyAgreement,
  generator_default as default
};
