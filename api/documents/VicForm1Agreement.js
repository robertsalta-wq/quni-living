// src/lib/documents/vic/form1Generator.tsx
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Document, Image, Page, StyleSheet, Text as Text2, View as View2 } from "@react-pdf/renderer";

// src/lib/documents/vic/form1Content.ts
var FORM1_FORM_REFERENCE = "Form 1 - Residential rental agreement (CAV prescribed form; in-force 25 Nov 2025, Residential Tenancies Regulations 2021 (Vic) Reg 10(1))";
var FORM1_INTRO = "Residential rental agreement   \nno more than 5 years\n\nResidential Tenancies Act 1997 Section 26(1)  \n*Residential Tenancies Regulations 2021* Regulation 10(1)\n\n[EXTRACTION_FLAG: CAV logo/image omitted from prescribed text embed]\n\n- This is your residential rental agreement. It is a binding contract under the *Residential Tenancies Act 1997* (the Act).\n- Parts A, B, C and E are the terms of your agreement. Part D is a summary of your rights and obligations.\n- Do not sign this agreement if there is anything in it that you do not understand. \n- Please refer to *Renters Guide* for details about your rights and responsibility. \n- For further information, visit the renting section of the Consumer Affairs Victoria (CAV) website at www.consumer.vic.gov.au/renting or call 1300 558 181.";
var FORM1_PART_B_THROUGH_E = "Part B \u2013 Standard terms\n\n8	Rental provider\u2019s preferred method of rent payment\n\n- The rental provider must permit a fee-free method (other than the renter\u2019s own bank fees) payment and must allow the renter to use Centrepay or another form of electronic funds transfer.\n- The renter is entitled to receive a receipt from the rental provider confirming payment of rent.\n\n(Rental provider to tick available methods of rent payment)\n\n direct debit	\n\n bank deposit	\n\n cash\n\n cheque or money order\n\n     BPAY \n\n other electronic form of payment, including Centrepay\n\n \n\nPayment details (if applicable)\n\n9	Service of notices and other documents by electronic methods\n\n- Electronic service of documents must be in accordance with the requirements of the *Electronic Transactions (Victoria) Act 2000.*\n- Just because someone responds to an email or other electronic communications, does not mean they have consented to the service of notices and other documents by electronic methods.\n- The renter and rental provider must notify the other party in writing if they no longer wish to receive notices or other documents by electronic methods.\n- The renter and the rental provider must immediately notify the other party in writing if their contact details change.\n\n	9.1	Does the rental provider agree to the service of notices and other documents by electronic methods, such as email?\n\nThe rental provider must complete this section before giving the agreement to the renter.\n\n 	(Rental provider to tick as appropriate)\n\nYes - insert email address, mobile phone number or other electronic contact details\n\nNo\n\n	9.2	Does the renter agree to the service of notices and other documents by electronic methods, such as email?\n\n 	(Renter to tick as appropriate)\n\nRenter 1\n\nYes - insert email address, mobile phone number or other electronic contact details\n\nNo\n\nRenter 2\n\nYes - insert email address, mobile phone number or other electronic contact details\n\nNo\n\nRenter 3\n\nYes - insert email address, mobile phone number or other electronic contact details\n\nNo\n\nRenter 4\n\nYes - insert email address, mobile phone number or other electronic contact details\n\nNo\n\nNote: If there are more than four renters, include details on an extra page.\n\n	\n\n10	Urgent repairs\n\n- The rental provider must ensure that the rental property is provided and maintained in good repair. \n- If there is a need for an urgent repair, the renter should notify the rental provider in writing. \n- For further information on seeking repairs, see Part D below.\n\nDetails of person the renter should contact for an urgent repair (rental provider to insert details).\n\nEmergency contact name\n\nEmergency phone number\n\nEmergency email address\n\n11	Professional cleaning\n\nThe rental provider must not require the renter to arrange professional cleaning or cleaning to a professional standard at the end of the tenancy, unless:\n\n- Professional cleaning or cleaning to a professional standard was carried out to the rented premises immediately before the start of the tenancy and the renter was advised that professional cleaning or cleaning to a professional standard had been carried out to those premises immediately before the start of the tenancy; or\n- Professional cleaning or cleaning to a professional standard is required to restore the rented premises to the same condition they were in immediately before the start of the tenancy, having regard to the condition report and taking into account fair wear and tear.\n\nThe renter must have all or part of the rented premises professionally cleaned or pay the cost of having all or part of the rented premises professionally cleaned, if professional cleaning becomes required to restore the premises to the condition they were in immediately before the start of the tenancy, having regard to the condition report and taking into account fair wear and tear.\n\n12	Owners corporation (formerly body corporate)\n\nDo owners corporation rules apply to the premises? (Rental provider to tick as appropriate)\n\n No\n\n Yes\n\nIf yes, the rental provider must attach a copy of the rules to this agreement.\n\n13	Condition report\n\nThe renter must be given two copies of the condition report (or one emailed copy) on or before the date the renter moves into the rented premises. \n\n(Rental provider to tick as appropriate)\n\n	 The condition report has been provided\n\n The condition report will be provided to the renter on or before the date the agreement starts \n\nPart C \u2013 Safety-related activities\n\n1. Electrical safety activities\n\n- The rental provider must ensure an electrical safety check is conducted every two years by a licensed or registered electrician of all electrical installations, appliances and fittings provided by a rental provider in the rented premises, and must provide the renter with the date of the most recent safety check, in writing, on request of the renter.\n- If an electrical safety check of the rented premises has not been conducted within the last two years at the time the renter occupies the premises, the rental provider must arrange an electrical safety check as soon as practicable.\n\n15	Gas safety activities\n\nThis safety-related activity only applies if the rented premises contains any appliances, fixtures or fittings which use or supply gas.\n\n1. The rental provider must ensure a gas safety check is conducted every two years by a licensed or registered gasfitter of all gas installations and fittings in the rented premises and must provide the renter with the date of the most recent safety check, in writing, on request of the renter.\n2. If a gas safety check has not been conducted within the last two years at the time the renter occupies the premises, the rental provider must arrange a gas safety check as soon as practicable.\n\n16	[Clause revoked by law] \n\n17	Swimming pool barrier safety activities\n\nThese safety-related activities only apply if the rented premises contains a swimming pool.\n\n1. The rental provider must ensure that the pool barrier is maintained in good repair.\n2. The renter must give written notice to the rental provider as soon as practicable after becoming aware that the swimming pool barrier is not in working order. \n3. The rental provider must arrange for a swimming pool barrier to be immediately repaired or replaced as an urgent repair if they are notified by the renter that it is not in working order.\n4. The rental provider must provide the renter with a copy of the most recent certificate of swimming pool barrier compliance issued under the *Building Act 1993* on the request of the renter.\n\n18	Relocatable swimming pool safety activities\n\nThese safety-related activities only apply if a relocatable swimming pool is erected, or is intended to be erected, at the rented premises.  \n\n1. The renter must not put up a relocatable swimming pool without giving written notice to the rental provider before erecting the pool. \n2. The renter must obtain any necessary approvals before erecting a relocatable swimming pool.\n\nNote: Regulations made under *Building Act 1993* apply to any person erecting a relocatable swimming pool.   \n\nThis safety-related activity only applies to swimming pools or spas that can hold water deeper than 300 mm. \n\n19	Bushfire prone area activities\n\nThis safety-related activity only applies if the rented premises is in a bushfire prone area and is required to have a water tank for bushfire safety.\n\n1. If the rented premises is in a designated bushfire-prone area under section 192A of the *Building Act 1993* and a water tank is required for firefighting purposes, the rental provider must ensure the water tank and any connected infrastructure is maintained in good repair as required.\n2. The water tank must be full and clean at the commencement of the agreement.  \n\nPart D \u2013 Rights and obligations\n\nThis is a summary of selected rights and obligations of renters and rental providers under the *Residential Tenancies Act 1997** *(the Act). Any reference to VCAT refers to the Victorian Civil and Administrative Tribunal.\n\nFor more information, visit www.consumer.vic.gov.au/renting. \n\nUse of the premises\n\nThe renter:\n\n- is entitled to quiet enjoyment of the premises. The rental provider may only enter the premises in accordance with the Act.\n- must not use the premises for illegal purposes. \n- must not cause a nuisance or interfere with the reasonable peace, comfort or privacy of neighbours. \n- must avoid damaging the premises and common areas. Common areas include hallways, driveways, gardens and stairwells. Where damage occurs, the renter must notify the rental provider in writing. \n- must keep the premises reasonably clean. \n\nCondition* *of the premises\n\nThe rental provider:\n\n- must ensure that the premises comply with the rental minimum standards, and is vacant and reasonably clean when the renter moves in. \n- must maintain the premises in good repair and in a fit condition for occupation. \n- agrees to do all the safety-related maintenance and repair activities set out in Part C of the agreement.\n\nThe renter: \n\n- must follow all safety-related activities set out in   \nPart C of the agreement and not remove, deactivate or interfere with safety devices on the premises. \n\nModifications \n\nThe renter: \n\n- may make some modifications without seeking consent. These modifications are listed on the Consumer Affairs website. \n- must seek the rental provider\u2019s consent before installing any other fixtures or additions. \n- may apply to VCAT if they believe that the rental provider has unreasonably refused consent for a modification mentioned in the Act.\n- at the end of the agreement, must restore the premises to the condition it was in before they moved in (excluding fair wear and tear). This includes removing all modifications, unless the parties agree they do not need to be removed.\n\nThe rental provider:\n\n- must not unreasonably refuse consent for certain modifications. \n\nA list of the modifications that the rental provider cannot unreasonably refuse consent for is available on the Consumer Affairs Victoria website at www.consumer.vic.gov.au/renting.\n\nLocks \n\n- The rental provider must ensure the premises:\n- has locks to secure all windows capable of having a lock, and\n- has deadlocks (a deadlock is a deadlatch with at least one cylinder) for external doors that are able to be secured with a functioning deadlock, and\n- meets the rental minimum standards for locks and window locks.\n- External doors which are not able to be secured with a functioning deadlock must at least be fitted with a locking device that:\n- is operated by a key from the outside; and\n- may be unlocked from the inside with or without a key. \n- The renter must obtain consent from the rental provider to change a lock in the master key system. \n- The rental provider must not unreasonably refuse consent for a renter seeking to change a lock in the master key system.\n- The rental provider must not give a key to a person excluded from the premises under a:\n- family violence intervention order; or\n- family violence safety notice; or\n- recognised non-local DVO; or\n- personal safety intervention order.\n\nRepairs\n\n- Only a suitably qualified person must do repairs \u2013 both urgent and non-urgent.\n\nUrgent repairs\n\nSection 3(1) of the Act defines *urgent repairs*. Refer to the Consumer Affairs Victoria website for the full list of urgent repairs and for more information, visit www.consumer.vic.gov.au/urgentrepairs. \n\nUrgent repairs include failure or breakdown of any essential service or appliance provided for hot water, cooking, heating or laundering supplied by the rental provider. \n\nThe rental provider must carry out urgent repairs after being notified.\n\nA renter may arrange for urgent repairs to be done if they have taken reasonable steps to arrange for the rental provider to immediately do the repairs and the rental provider has not carried out the repairs.\n\nIf the renter has arranged for urgent repairs, the renter may be reimbursed directly by the rental provider for the reasonable cost of repairs up to $2,500.\n\nThe renter may apply to VCAT for an order requiring the rental provider to carry out urgent repairs if: \n\n- the renter cannot meet the cost of the repairs; or \n- the cost of repairs is more than $2,500; or\n- the rental provider refuses to pay the cost of repairs if it is carried out by the renter.\n\nNon-urgent repairs\n\n- The renter must notify the rental provider, in writing, as soon as practicable of: \n- damage to the premises.\n- breakdown of facilities, fixtures, furniture or equipment supplied by the rental provider.\n- The rental provider must carry out non-urgent repairs in reasonable time.  \n- The renter can apply to VCAT for an order requiring the rental provider to do the repairs if the rental provider has not carried out the repairs within 14 days of receiving notice of the need for repair.\n\nAssignment or sub-letting\n\nThe renter:\n\n- must not assign (transfer to another person) or sub-let the whole or any part of the premises without the written consent of the rental provider.\n\nThe rental provider may give the renter notice to vacate if the renter assigns or sublets the premises without consent.\n\nThe rental provider:\n\n- cannot unreasonably withhold consent to assign or sub-let the premises. \n- must not demand or receive a fee or payment for consent, other than reasonable expenses incurred by the assignment. \n\nRent\n\n- The rental provider must give the renter at least 90 days\u2019 written notice of a proposed rent increase. \n- Rent cannot be increased more than once every   \n12 months. \n- If the rental provider or agent does not provide a receipt for rent, the renter may request a receipt. \n- The rental provider must not increase the rent under a fixed term agreement unless the agreement provides for an increase.\n\nAccess and entry\n\n- The rental provider may enter the premises: \n- at any time, if the renter has agreed within the last 7 days.\n- to do an inspection but not more than once every 6 months. \n- to comply with the rental provider\u2019s duties under the Act.\n- to show the premises or conduct an open inspection to sell, rent or value the premises.\n- to take images or video for advertising a property that is for sale or rent.\n- if they believe the renter has failed to follow their duties under the Act.\n- to do a pre-termination inspection where the renter has applied to have the agreement terminated because of family violence or personal violence. \n- The renter must allow entry to the premises where the rental provider has followed proper procedure.\n- The renter is entitled to a set amount of compensation for each sales inspection.\n\nPets \n\n- The renter must seek consent from the rental provider before keeping a pet on the premises.\n- The rental provider must not unreasonably refuse a request to keep a pet.\n\nSmoke Alarms\n\n- The rental provider must ensure that any smoke alarm installed in the rented premises is:\n- correctly installed and in working condition; and\n- fitted with batteries or replacement batteries; and\n- tested at least once every 12 months in accordance with any instructions by the manufacturer of the smoke alarm. \n- If a smoke alarm installed in the rented premises does not meet the requirements set out above, the renter may issue a request to the rental provider for urgent repairs to the smoke alarm in accordance with section 72AA of the Act.\n- On receiving notice from the renter under the clause above, the rental provider or the provider\u2019s agent must immediately arrange for the repairs to be carried out.\n- Any testing, repair or replacement of a smoke alarm that is powered by a mains electricity supply must be undertaken by a suitably qualified person.\n\nPart E \u2013 Additional terms\n\n21	Further details (if any)\n\nList any additional terms to this agreement. The terms listed must not exclude, restrict or modify any of the rights and duties included in the Act.\n\nAdditional terms must also comply with the Australian Consumer Law (Victoria). For example, they cannot be unfair terms, which will have no effect. Contact Consumer Affairs Victoria on 1300 55 81 81 for further information or visit unfair contract terms at the Consumer Affairs Victoria website.\n\nNote: If you need extra space, attach a separate sheet. Both the rental provider and renter should sign and date all attachments.\n\n22	Signatures\n\nThis agreement is made under the *Residential Tenancies Act 1997*.\n\nBefore signing you must read Part D \u2013 Rights and obligations in this form.\n\n	Rental provider\n\nSignature of    \nrental provider 1\n\nDate\n\nSignature of   \nrental provider 2\n\nDate\n\n	Renter(s)\n\nAll renters listed must sign this residential rental agreement.\n\nSignature of renter 1\n\nDate\n\nSignature of renter 2\n\nDate\n\nSignature of renter 3\n\nDate\n\nSignature of renter 4\n\nDate\n\nNote: Each renter who is a party to the agreement must sign and date here. If there are more than four renters, include details on an extra page.";

// src/lib/documents/vic/vicForm1ClauseRender.tsx
import { Text, View } from "@react-pdf/renderer";
import { jsx, jsxs } from "react/jsx-runtime";
function chunkText(text, maxChars) {
  if (text.length <= maxChars) return [text];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const cut = text.lastIndexOf("\n\n", end);
      if (cut > start) end = cut;
      else {
        const cut2 = text.lastIndexOf("\n", end);
        if (cut2 > start) end = cut2;
      }
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}
function isPartHeading(line) {
  const t = line.trim();
  return /^PART [A-F]-/i.test(t) || /^Part [A-F] –/.test(t);
}
function isTodoLine(line) {
  return line.includes("[TODO(VIC-FORM1");
}
function VicForm1ClauseLine({ line, styles: styles2 }) {
  const raw = line;
  const t = raw.trimEnd();
  if (!t.trim()) return /* @__PURE__ */ jsx(View, { style: { height: 3 } });
  if (isTodoLine(t)) {
    return /* @__PURE__ */ jsx(Text, { style: styles2.todoLine, children: t });
  }
  if (isPartHeading(t)) {
    return /* @__PURE__ */ jsx(Text, { style: styles2.clauseSectionTitle, children: t });
  }
  if (/^note\s:/i.test(t.trim())) {
    return /* @__PURE__ */ jsx(Text, { style: styles2.clauseNote, children: t });
  }
  const numbered = /^(\d+(?:\.\d+)*[A-Z]?\.?)\s+(.+)$/.exec(t.trim());
  if (numbered && /^\d/.test(numbered[1])) {
    return /* @__PURE__ */ jsxs(Text, { style: styles2.bodyTight, children: [
      /* @__PURE__ */ jsxs(Text, { style: { fontFamily: "Helvetica-Bold" }, children: [
        numbered[1],
        " "
      ] }),
      numbered[2]
    ] });
  }
  const subLetter = /^\(([a-z])\)\s+(.+)$/.exec(t.trim());
  if (subLetter) {
    return /* @__PURE__ */ jsxs(Text, { style: styles2.bodyTight, children: [
      /* @__PURE__ */ jsxs(Text, { style: { fontFamily: "Helvetica-Bold" }, children: [
        "(",
        subLetter[1],
        ") "
      ] }),
      subLetter[2]
    ] });
  }
  const subRoman = /^\(([ivx]+)\)\s+(.+)$/i.exec(t.trim());
  if (subRoman) {
    return /* @__PURE__ */ jsxs(Text, { style: styles2.bodyTight, children: [
      /* @__PURE__ */ jsxs(Text, { style: { fontFamily: "Helvetica-Bold" }, children: [
        "(",
        subRoman[1],
        ") "
      ] }),
      subRoman[2]
    ] });
  }
  if (t.startsWith("\u2022")) {
    return /* @__PURE__ */ jsx(Text, { style: [styles2.bodyTight, { paddingLeft: 8 }], children: t });
  }
  return /* @__PURE__ */ jsx(Text, { style: styles2.bodyTight, children: raw });
}
function VicForm1ClauseChunkBody({ text, styles: styles2 }) {
  const lines = text.split("\n");
  return /* @__PURE__ */ jsx(View, { children: lines.map((line, i) => /* @__PURE__ */ jsx(VicForm1ClauseLine, { line, styles: styles2 }, i)) });
}

// src/lib/documents/vic/form1Generator.tsx
import { Fragment, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var QUNI_RENT_PORTAL_URL = "https://quni.com.au";
function rentDueWeekdayFromCommencement(isoDate) {
  const raw = isoDate.slice(0, 10);
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return "Monday";
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-AU", { weekday: "long", timeZone: "UTC" });
}
function formatBsbDisplay(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return raw.trim();
}
function item8RentPaymentDetails(preference, bank) {
  const acct = bank?.accountNumber?.trim();
  const bsb = bank?.bsb?.trim() ? formatBsbDisplay(bank.bsb) : "";
  const name = bank?.accountName?.trim() ?? "";
  const bankLine = acct && bsb && name ? `Direct deposit - Account name: ${name}; BSB: ${bsb}; Account number: ${acct}.` : "Direct deposit (bank deposit) - account details to be provided by the rental provider.";
  if (preference === "quni_platform") {
    return `${bankLine} Recurring rent may also be paid via the Quni Living platform (${QUNI_RENT_PORTAL_URL}) using the payment facility activated in the renter's Quni account.`;
  }
  return bankLine;
}
var styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 44,
    paddingHorizontal: 42,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    lineHeight: 1.55,
    backgroundColor: "#ffffff"
  },
  quniHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 0.75,
    borderBottomColor: "#c9d2e0"
  },
  logo: { width: 72, height: 22, objectFit: "contain", marginRight: 14 },
  headerTitleCol: { flex: 1, alignItems: "flex-end" },
  headerTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0f2744",
    textAlign: "right"
  },
  headerSubtitle: {
    fontSize: 9,
    color: "#3d4f63",
    textAlign: "right",
    marginTop: 2
  },
  docMetaLine: {
    fontSize: 8,
    color: "#4a5568",
    marginTop: 6,
    textAlign: "right"
  },
  formRefLine: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f2744",
    marginTop: 4,
    marginBottom: 8
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f2744",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 10,
    marginBottom: 6
  },
  subHeading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f2744",
    marginTop: 8,
    marginBottom: 4
  },
  body: { fontSize: 10, lineHeight: 1.55, textAlign: "justify" },
  labelBold: { fontFamily: "Helvetica-Bold", color: "#111827" },
  value: { fontFamily: "Helvetica", color: "#1a1a1a" },
  fieldRow: { marginBottom: 5, flexDirection: "row", flexWrap: "wrap" },
  checkboxRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 3 },
  checkboxBox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: "#374151",
    marginRight: 6,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  checkboxMark: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1
  },
  footerRow: {
    position: "absolute",
    bottom: 18,
    left: 42,
    right: 42,
    fontSize: 7.5,
    color: "#6b7280",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 4
  },
  sigBox: {
    borderWidth: 1,
    borderColor: "#9ca3af",
    minHeight: 36,
    marginTop: 4,
    marginBottom: 8,
    padding: 6
  },
  sigHint: { fontSize: 7, color: "#6b7280" }
});
var clausePdfStyles = {
  bodyTight: { fontSize: 10, lineHeight: 1.45, marginBottom: 4, textAlign: "justify" },
  clauseSectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f2744",
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: 0.3
  },
  clauseNote: {
    fontSize: 9,
    fontFamily: "Helvetica-Oblique",
    color: "#374151",
    marginBottom: 4,
    marginLeft: 6,
    textAlign: "justify"
  },
  todoLine: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#b45309",
    backgroundColor: "#fffbeb",
    padding: 6,
    marginBottom: 6,
    borderWidth: 0.75,
    borderColor: "#fcd34d"
  }
};
function resolveQuniLogoPath() {
  const pdf = join(process.cwd(), "public", "quni-logo-pdf.png");
  if (existsSync(pdf)) return pdf;
  const fallback = join(process.cwd(), "public", "quni-logo.png");
  return existsSync(fallback) ? fallback : null;
}
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
function agreementMadeOnFromGeneratedAt(generatedAt) {
  const idx = generatedAt.indexOf(",");
  if (idx > 0) return generatedAt.slice(0, idx).trim();
  return generatedAt.trim();
}
function Field({ label, children }) {
  return /* @__PURE__ */ jsx2(View2, { style: styles.fieldRow, wrap: false, children: /* @__PURE__ */ jsxs2(Text2, { style: styles.body, children: [
    /* @__PURE__ */ jsxs2(Text2, { style: styles.labelBold, children: [
      label,
      " "
    ] }),
    /* @__PURE__ */ jsx2(Text2, { style: styles.value, children })
  ] }) });
}
function Checkbox({ checked }) {
  return /* @__PURE__ */ jsx2(View2, { style: styles.checkboxBox, children: checked ? /* @__PURE__ */ jsx2(Text2, { style: styles.checkboxMark, children: "X" }) : null });
}
function CheckboxLine({ checked, label }) {
  return /* @__PURE__ */ jsxs2(View2, { style: styles.checkboxRow, wrap: false, children: [
    /* @__PURE__ */ jsx2(Checkbox, { checked }),
    /* @__PURE__ */ jsx2(Text2, { style: styles.body, children: label })
  ] });
}
function QuniTopHeader({
  documentId,
  generatedAt,
  logoPath
}) {
  return /* @__PURE__ */ jsxs2(View2, { style: styles.quniHeader, fixed: true, children: [
    logoPath ? /* @__PURE__ */ jsx2(Image, { style: styles.logo, src: logoPath }) : /* @__PURE__ */ jsx2(View2, { style: { width: 72, marginRight: 14 } }),
    /* @__PURE__ */ jsxs2(View2, { style: styles.headerTitleCol, children: [
      /* @__PURE__ */ jsx2(Text2, { style: styles.headerTitle, children: "Residential Rental Agreement" }),
      /* @__PURE__ */ jsx2(Text2, { style: styles.headerSubtitle, children: "Victoria - Form 1 (T2 residential)" }),
      /* @__PURE__ */ jsxs2(Text2, { style: styles.docMetaLine, children: [
        "Doc ",
        documentId,
        " \xB7 Generated ",
        generatedAt
      ] })
    ] })
  ] });
}
function PageFooter({ documentId, pageNumber }) {
  return /* @__PURE__ */ jsx2(View2, { style: styles.footerRow, fixed: true, children: /* @__PURE__ */ jsxs2(Text2, { children: [
    "Quni Living \xB7 VIC Form 1 \xB7 ",
    documentId,
    " \xB7 Page ",
    pageNumber
  ] }) });
}
function SignaturesBlock(props) {
  const { landlord, tenant } = props;
  const tenant2 = props.additionalTenantNames[0]?.trim() ?? "";
  return /* @__PURE__ */ jsxs2(View2, { children: [
    /* @__PURE__ */ jsx2(Text2, { style: styles.sectionHeading, children: "22. Signatures" }),
    /* @__PURE__ */ jsx2(Text2, { style: styles.body, children: "This agreement is made under the Residential Tenancies Act 1997 (Vic). Before signing you must read Part D - Rights and obligations in this form. Signatures are collected electronically where permitted." }),
    /* @__PURE__ */ jsx2(Text2, { style: { ...styles.subHeading, marginTop: 8 }, children: "Rental provider" }),
    /* @__PURE__ */ jsx2(Field, { label: "Name:", children: landlord.fullName }),
    /* @__PURE__ */ jsx2(View2, { style: styles.sigBox, children: /* @__PURE__ */ jsxs2(View2, { style: { flexDirection: "row", alignItems: "center" }, children: [
      /* @__PURE__ */ jsx2(Text2, { style: styles.sigHint, children: "Signature " }),
      /* @__PURE__ */ jsx2(Text2, { style: styles.sigHint, children: "{{Rental Provider Signature;role=First Party;type=signature}}" })
    ] }) }),
    /* @__PURE__ */ jsx2(View2, { style: { ...styles.sigBox, minHeight: 28 }, children: /* @__PURE__ */ jsxs2(View2, { style: { flexDirection: "row", alignItems: "center" }, children: [
      /* @__PURE__ */ jsx2(Text2, { style: styles.sigHint, children: "Dated " }),
      /* @__PURE__ */ jsx2(Text2, { style: styles.sigHint, children: "{{Rental Provider Sign Date;role=First Party;type=date}}" })
    ] }) }),
    /* @__PURE__ */ jsx2(Text2, { style: { ...styles.subHeading, marginTop: 8 }, children: "Renter" }),
    /* @__PURE__ */ jsx2(Field, { label: "Name:", children: tenant.fullName }),
    /* @__PURE__ */ jsx2(View2, { style: styles.sigBox, children: /* @__PURE__ */ jsxs2(View2, { style: { flexDirection: "row", alignItems: "center" }, children: [
      /* @__PURE__ */ jsx2(Text2, { style: styles.sigHint, children: "Signature " }),
      /* @__PURE__ */ jsx2(Text2, { style: styles.sigHint, children: "{{Renter Signature;role=Second Party;type=signature}}" })
    ] }) }),
    /* @__PURE__ */ jsx2(View2, { style: { ...styles.sigBox, minHeight: 28 }, children: /* @__PURE__ */ jsxs2(View2, { style: { flexDirection: "row", alignItems: "center" }, children: [
      /* @__PURE__ */ jsx2(Text2, { style: styles.sigHint, children: "Dated " }),
      /* @__PURE__ */ jsx2(Text2, { style: styles.sigHint, children: "{{Renter Sign Date;role=Second Party;type=date}}" })
    ] }) }),
    tenant2 ? /* @__PURE__ */ jsxs2(Fragment, { children: [
      /* @__PURE__ */ jsx2(Text2, { style: { ...styles.subHeading, marginTop: 8 }, children: "Renter (2)" }),
      /* @__PURE__ */ jsx2(Field, { label: "Name:", children: tenant2 }),
      /* @__PURE__ */ jsx2(View2, { style: styles.sigBox, children: /* @__PURE__ */ jsx2(Text2, { style: styles.sigHint, children: "{{Renter 2 Signature;role=Co-tenant;type=signature}}" }) }),
      /* @__PURE__ */ jsx2(View2, { style: { ...styles.sigBox, minHeight: 28 }, children: /* @__PURE__ */ jsx2(Text2, { style: styles.sigHint, children: "{{Renter 2 Sign Date;role=Co-tenant;type=date}}" }) })
    ] }) : null
  ] });
}
function VicResidentialRentalAgreementForm1(props) {
  const logoPath = resolveQuniLogoPath();
  const {
    documentId,
    generatedAt,
    landlord,
    tenant,
    premises,
    term,
    rent,
    bond,
    landlordAgent,
    urgentRepairsTradespeople,
    electronicService,
    rentPaymentBankDetails,
    rentPaymentPreference,
    specialConditions,
    bookingNotes
  } = props;
  const madeOn = agreementMadeOnFromGeneratedAt(generatedAt);
  const rentWeekday = rentDueWeekdayFromCommencement(term.startDate);
  const weeklyRentDisplay = formatMoney(rent.weeklyRent);
  const bondDisplay = bond.amount != null && Number.isFinite(bond.amount) ? formatMoney(bond.amount) : null;
  const endDateText = term.periodic || !term.endDate ? null : formatAuDate(term.endDate);
  const paymentDetails = item8RentPaymentDetails(rentPaymentPreference, rentPaymentBankDetails);
  const freq = rent.rentFrequency;
  const clauseChunks = chunkText(FORM1_PART_B_THROUGH_E, 2600);
  let pageNum = 0;
  const nextPage = () => {
    pageNum += 1;
    return pageNum;
  };
  const pages = [];
  pages.push(
    /* @__PURE__ */ jsxs2(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx2(QuniTopHeader, { documentId, generatedAt, logoPath }),
      /* @__PURE__ */ jsx2(Text2, { style: styles.formRefLine, children: FORM1_FORM_REFERENCE }),
      FORM1_INTRO.split("\n").slice(0, 12).map((line, i) => /* @__PURE__ */ jsx2(Text2, { style: [styles.body, { marginBottom: i < 11 ? 3 : 8 }], children: line.trim() || " " }, `intro-${i}`)),
      /* @__PURE__ */ jsx2(Text2, { style: styles.sectionHeading, children: "Part A \u2013 Basic terms" }),
      /* @__PURE__ */ jsx2(Field, { label: "1. Date of agreement:", children: madeOn }),
      /* @__PURE__ */ jsx2(Text2, { style: [styles.body, { marginBottom: 6 }], children: "If the agreement is signed by the parties on different days, the date of the agreement is the date the last person signs the agreement." }),
      /* @__PURE__ */ jsx2(Field, { label: "2. Address of premises:", children: premises.addressLine }),
      /* @__PURE__ */ jsx2(Text2, { style: styles.subHeading, children: "3. Rental provider's details" }),
      /* @__PURE__ */ jsx2(Field, { label: "Full name or company name:", children: landlord.fullName }),
      /* @__PURE__ */ jsx2(Field, { label: "Address:", children: landlord.addressLine }),
      /* @__PURE__ */ jsx2(Field, { label: "Phone number:", children: landlord.phone }),
      /* @__PURE__ */ jsx2(Field, { label: "Email address:", children: landlord.email }),
      /* @__PURE__ */ jsx2(Text2, { style: styles.subHeading, children: "Rental provider's agent's details" }),
      landlordAgent ? /* @__PURE__ */ jsxs2(Fragment, { children: [
        /* @__PURE__ */ jsx2(Field, { label: "Full name:", children: landlordAgent.name }),
        /* @__PURE__ */ jsx2(Field, { label: "Address:", children: landlordAgent.businessAddress }),
        /* @__PURE__ */ jsx2(Field, { label: "Phone number:", children: landlordAgent.phone }),
        landlordAgent.email ? /* @__PURE__ */ jsx2(Field, { label: "Email address:", children: landlordAgent.email }) : null
      ] }) : /* @__PURE__ */ jsx2(Field, { label: "Agent:", children: "Not applicable" }),
      /* @__PURE__ */ jsx2(Text2, { style: styles.subHeading, children: "4. Renter's details" }),
      /* @__PURE__ */ jsx2(Field, { label: "Full name of renter:", children: tenant.fullName }),
      /* @__PURE__ */ jsx2(
        Field,
        {
          label: "Current address:",
          children: tenant.addressForServiceLine?.trim() || "-"
        }
      ),
      /* @__PURE__ */ jsx2(Field, { label: "Phone number:", children: tenant.phone }),
      /* @__PURE__ */ jsx2(Field, { label: "Email address:", children: tenant.email }),
      props.additionalTenantNames[0]?.trim() ? /* @__PURE__ */ jsx2(Field, { label: "Full name of renter (2):", children: props.additionalTenantNames[0].trim() }) : null,
      /* @__PURE__ */ jsx2(Text2, { style: styles.subHeading, children: "5. Length of the agreement" }),
      /* @__PURE__ */ jsx2(CheckboxLine, { checked: !term.periodic, label: "Fixed term agreement" }),
      /* @__PURE__ */ jsx2(Field, { label: "Start date:", children: formatAuDate(term.startDate) }),
      endDateText ? /* @__PURE__ */ jsx2(Field, { label: "End date:", children: endDateText }) : null,
      /* @__PURE__ */ jsx2(CheckboxLine, { checked: term.periodic, label: "Periodic agreement (monthly)" }),
      term.periodic ? /* @__PURE__ */ jsx2(Field, { label: "Start date:", children: formatAuDate(term.startDate) }) : null,
      /* @__PURE__ */ jsx2(PageFooter, { documentId, pageNumber: nextPage() })
    ] }, "p1")
  );
  pages.push(
    /* @__PURE__ */ jsxs2(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx2(QuniTopHeader, { documentId, generatedAt, logoPath }),
      /* @__PURE__ */ jsx2(Text2, { style: styles.subHeading, children: "6. Rent" }),
      /* @__PURE__ */ jsx2(Field, { label: "Rent amount ($):", children: weeklyRentDisplay }),
      /* @__PURE__ */ jsx2(Text2, { style: { ...styles.body, marginTop: 4, marginBottom: 2 }, children: "To be paid per (tick one box only):" }),
      /* @__PURE__ */ jsx2(CheckboxLine, { checked: freq === "weekly", label: "week" }),
      /* @__PURE__ */ jsx2(CheckboxLine, { checked: freq === "fortnightly", label: "fortnight" }),
      /* @__PURE__ */ jsx2(CheckboxLine, { checked: freq === "monthly", label: "calendar month" }),
      /* @__PURE__ */ jsx2(Field, { label: "Day rent is to be paid:", children: rentWeekday }),
      /* @__PURE__ */ jsx2(Field, { label: "Date first rent payment due:", children: formatAuDate(term.startDate) }),
      bondDisplay ? /* @__PURE__ */ jsxs2(Fragment, { children: [
        /* @__PURE__ */ jsx2(Text2, { style: styles.subHeading, children: "7. Bond" }),
        /* @__PURE__ */ jsx2(Field, { label: "Bond amount ($):", children: bondDisplay }),
        /* @__PURE__ */ jsx2(Field, { label: "Date bond payment due:", children: formatAuDate(term.startDate) })
      ] }) : null,
      /* @__PURE__ */ jsx2(Text2, { style: styles.subHeading, children: "Part B - Standard terms (schedule highlights)" }),
      /* @__PURE__ */ jsx2(Text2, { style: { ...styles.body, marginBottom: 4 }, children: "8. Rental provider's preferred methods of payment" }),
      /* @__PURE__ */ jsx2(CheckboxLine, { checked: true, label: "bank deposit" }),
      /* @__PURE__ */ jsx2(CheckboxLine, { checked: rentPaymentPreference === "quni_platform", label: "other electronic form of payment, including Centrepay" }),
      /* @__PURE__ */ jsx2(Field, { label: "Payment details:", children: paymentDetails }),
      /* @__PURE__ */ jsx2(Text2, { style: { ...styles.body, marginTop: 6, fontFamily: "Helvetica-Bold" }, children: "9. Electronic service of notices" }),
      /* @__PURE__ */ jsx2(CheckboxLine, { checked: electronicService.landlordConsentsToEmailService, label: `Rental provider - yes (${electronicService.landlordEmail})` }),
      /* @__PURE__ */ jsx2(CheckboxLine, { checked: !electronicService.landlordConsentsToEmailService, label: "Rental provider - no" }),
      /* @__PURE__ */ jsx2(CheckboxLine, { checked: electronicService.tenantConsentsToEmailService, label: `Renter - yes (${electronicService.tenantEmail})` }),
      /* @__PURE__ */ jsx2(CheckboxLine, { checked: !electronicService.tenantConsentsToEmailService, label: "Renter - no" }),
      /* @__PURE__ */ jsx2(Text2, { style: { ...styles.body, marginTop: 6, fontFamily: "Helvetica-Bold" }, children: "10. Urgent repairs contact" }),
      /* @__PURE__ */ jsx2(Field, { label: "Emergency contact name:", children: urgentRepairsTradespeople.electrician?.split("-")[0]?.trim() ?? landlord.fullName }),
      /* @__PURE__ */ jsx2(Field, { label: "Emergency contact phone:", children: landlord.phone }),
      /* @__PURE__ */ jsx2(Field, { label: "Emergency contact email:", children: landlord.email }),
      /* @__PURE__ */ jsx2(CheckboxLine, { checked: false, label: "12. Owners corporation rules apply - yes" }),
      /* @__PURE__ */ jsx2(CheckboxLine, { checked: true, label: "12. Owners corporation rules apply - no" }),
      /* @__PURE__ */ jsx2(CheckboxLine, { checked: false, label: "13. Condition report has been provided" }),
      /* @__PURE__ */ jsx2(CheckboxLine, { checked: true, label: "13. Condition report will be provided on or before the agreement start date" }),
      /* @__PURE__ */ jsx2(PageFooter, { documentId, pageNumber: nextPage() })
    ] }, "p2")
  );
  clauseChunks.forEach((chunk, i) => {
    pages.push(
      /* @__PURE__ */ jsxs2(Page, { size: "A4", style: styles.page, children: [
        /* @__PURE__ */ jsx2(QuniTopHeader, { documentId, generatedAt, logoPath }),
        i === 0 ? /* @__PURE__ */ jsx2(Text2, { style: styles.sectionHeading, children: "Prescribed standard terms" }) : null,
        /* @__PURE__ */ jsx2(VicForm1ClauseChunkBody, { text: chunk, styles: clausePdfStyles }),
        /* @__PURE__ */ jsx2(PageFooter, { documentId, pageNumber: nextPage() })
      ] }, `clause-${i}`)
    );
  });
  if (specialConditions.length > 0 || bookingNotes && bookingNotes.trim()) {
    pages.push(
      /* @__PURE__ */ jsxs2(Page, { size: "A4", style: styles.page, children: [
        /* @__PURE__ */ jsx2(QuniTopHeader, { documentId, generatedAt, logoPath }),
        /* @__PURE__ */ jsx2(Text2, { style: styles.sectionHeading, children: "21. Further details (if any)" }),
        specialConditions.map((c, i) => /* @__PURE__ */ jsx2(Text2, { style: [styles.body, { marginBottom: 4 }], children: c }, i)),
        bookingNotes?.trim() ? /* @__PURE__ */ jsx2(Text2, { style: [styles.body, { marginTop: 4 }], children: bookingNotes.trim() }) : null,
        /* @__PURE__ */ jsx2(PageFooter, { documentId, pageNumber: nextPage() })
      ] }, "additional")
    );
  }
  pages.push(
    /* @__PURE__ */ jsxs2(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx2(QuniTopHeader, { documentId, generatedAt, logoPath }),
      /* @__PURE__ */ jsx2(SignaturesBlock, { ...props }),
      /* @__PURE__ */ jsx2(PageFooter, { documentId, pageNumber: nextPage() })
    ] }, "sig")
  );
  return /* @__PURE__ */ jsx2(Document, { children: pages });
}
function VicForm1Generator(props) {
  return VicResidentialRentalAgreementForm1(props);
}
export {
  VicResidentialRentalAgreementForm1,
  VicForm1Generator as default,
  item8RentPaymentDetails
};
