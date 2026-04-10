import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  FT6600_AGREEMENT_HEADER,
  FT6600_CLAUSES_1_TO_55,
  FT6600_NOTES,
  FT6600_TITLE_AND_IMPORTANT
} from "./ft6600EmbeddedStrings.js";
const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    lineHeight: 1.45,
    backgroundColor: "#ffffff"
  },
  footerWrap: { position: "absolute", bottom: 28, left: 40, right: 40 },
  footerRule: { borderTopWidth: 0.5, borderTopColor: "#cccccc", marginBottom: 6 },
  footerText: { fontSize: 7, color: "#666666" },
  block: { marginBottom: 8 },
  scheduleRow: { marginBottom: 5 },
  scheduleLabel: { fontFamily: "Helvetica-Bold" },
  bullet: { marginLeft: 10, marginBottom: 2 },
  docusealTag: { fontSize: 1, color: "#FFFFFF" },
  sigP: { marginBottom: 5 },
  sigRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", marginBottom: 4 },
  sigSpace: {
    marginTop: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1a1a1a",
    marginBottom: 10,
    minHeight: 18
  }
});
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
function furnishedText(v) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "\u2014";
}
function consentText(v) {
  return v ? "Yes" : "No";
}
function rentFrequencyWord(freq) {
  if (freq === "weekly") return "week";
  if (freq === "fortnightly") return "fortnight";
  return "month";
}
function rentAmountForFrequency(weeklyRent, platformFeePercent, totalWeekly, freq) {
  if (freq === "weekly") {
    return {
      rent: weeklyRent,
      platformFee: weeklyRent * platformFeePercent / 100,
      total: totalWeekly
    };
  }
  if (freq === "fortnightly") {
    return {
      rent: weeklyRent * 2,
      platformFee: weeklyRent * platformFeePercent / 100 * 2,
      total: totalWeekly * 2
    };
  }
  const m = 52 / 12;
  return {
    rent: Math.round(weeklyRent * m * 100) / 100,
    platformFee: Math.round(weeklyRent * platformFeePercent / 100 * m * 100) / 100,
    total: Math.round(totalWeekly * m * 100) / 100
  };
}
function tradeLine(v) {
  if (v == null || !v.trim()) return "\u2014";
  return v.trim();
}
function FixedFooter({ documentId, generatedAt }) {
  return /* @__PURE__ */ jsxs(View, { style: styles.footerWrap, fixed: true, children: [
    /* @__PURE__ */ jsx(View, { style: styles.footerRule }),
    /* @__PURE__ */ jsx(
      Text,
      {
        style: styles.footerText,
        render: ({ pageNumber, totalPages }) => `FT6600 \xB7 Document ID: ${documentId} \xB7 Generated: ${generatedAt} \xB7 Page ${pageNumber}` + (totalPages ? ` of ${totalPages}` : "")
      }
    )
  ] });
}
function ScheduleBlock(props) {
  const {
    landlord,
    tenant,
    additionalTenantNames,
    premises,
    premisesPartDescription,
    additionalPremisesInclusions,
    maxOccupantsPermitted,
    term,
    rent,
    bond,
    landlordAgent,
    urgentRepairsTradespeople,
    electronicService,
    specialConditions,
    bookingNotes
  } = props;
  const landlordDisplay = landlord.companyName ? `${landlord.fullName} (${landlord.companyName})` : landlord.fullName;
  const endDateText = term.periodic || !term.endDate ? "Periodic tenancy (no fixed end date)" : formatAuDate(term.endDate);
  const rentParts = rentAmountForFrequency(
    rent.weeklyRent,
    rent.platformFeePercent,
    rent.totalWeekly,
    rent.rentFrequency
  );
  const bondText = bond.amount != null && Number.isFinite(bond.amount) ? formatMoney(bond.amount) : "\u2014";
  const t2 = additionalTenantNames[0]?.trim() ?? "";
  const t3 = additionalTenantNames[1]?.trim() ?? "";
  const t4 = additionalTenantNames[2]?.trim() ?? "";
  const inclusions = additionalPremisesInclusions.length > 0 ? additionalPremisesInclusions : ["\u2014"];
  return /* @__PURE__ */ jsxs(View, { style: { marginTop: 6, marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Landlord: " }),
      landlordDisplay
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Landlord address for service: " }),
      landlord.addressLine
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Landlord email: " }),
      landlord.email
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Landlord phone: " }),
      landlord.phone
    ] }) }),
    landlordAgent ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Landlord's agent: " }),
        landlordAgent.name
      ] }) }),
      /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Agent licence number: " }),
        landlordAgent.licenseNumber?.trim() || "\u2014"
      ] }) }),
      /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Agent business address: " }),
        landlordAgent.businessAddress
      ] }) }),
      /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Agent phone: " }),
        landlordAgent.phone
      ] }) }),
      /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Agent email: " }),
        landlordAgent.email?.trim() || "\u2014"
      ] }) })
    ] }) : /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Landlord's agent: " }),
      "Not applicable"
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Tenant (1): " }),
      tenant.fullName
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Tenant email: " }),
      tenant.email
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Tenant phone: " }),
      tenant.phone
    ] }) }),
    tenant.dateOfBirth ? /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Tenant date of birth: " }),
      formatAuDate(tenant.dateOfBirth)
    ] }) }) : null,
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Tenant (2): " }),
      t2 || "\u2014"
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Tenant (3): " }),
      t3 || "\u2014"
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Tenant (4): " }),
      t4 || "\u2014"
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Residential premises (address): " }),
      premises.addressLine
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Part of premises only (if applicable): " }),
      premisesPartDescription?.trim() || "\u2014"
    ] }) }),
    /* @__PURE__ */ jsxs(View, { style: styles.scheduleRow, children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Additional things included with residential premises: " }),
      inclusions.map((line, i) => /* @__PURE__ */ jsxs(Text, { style: styles.bullet, children: [
        "\u2022 ",
        line
      ] }, i))
    ] }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Maximum occupants permitted: " }),
      maxOccupantsPermitted != null && Number.isFinite(maxOccupantsPermitted) ? String(maxOccupantsPermitted) : "\u2014"
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Property type: " }),
      premises.propertyType ?? "\u2014"
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Room type: " }),
      premises.roomType ?? "\u2014"
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Furnished: " }),
      furnishedText(premises.furnished)
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Linen supplied: " }),
      furnishedText(premises.linenSupplied)
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Weekly cleaning service: " }),
      furnishedText(premises.weeklyCleaningService)
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Commencement date: " }),
      formatAuDate(term.startDate)
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "End date (fixed term) / tenancy type: " }),
      endDateText
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Lease length (description): " }),
      term.leaseLengthDescription
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsxs(Text, { style: styles.scheduleLabel, children: [
        "Rent amount (per ",
        rentFrequencyWord(rent.rentFrequency),
        "): "
      ] }),
      formatMoney(rentParts.rent)
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsxs(Text, { style: styles.scheduleLabel, children: [
        "Platform fee (",
        rent.platformFeePercent,
        "%): "
      ] }),
      formatMoney(rentParts.platformFee)
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsxs(Text, { style: styles.scheduleLabel, children: [
        "Total payable per ",
        rentFrequencyWord(rent.rentFrequency),
        ": "
      ] }),
      formatMoney(rentParts.total)
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Rent payment timing: " }),
      rent.paymentTimingDescription
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Rent payment method: " }),
      rent.paymentMethod
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Rental bond: " }),
      bondText
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Urgent repairs \u2014 tradesperson (electrician): " }),
      tradeLine(urgentRepairsTradespeople.electrician)
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Urgent repairs \u2014 tradesperson (plumber): " }),
      tradeLine(urgentRepairsTradespeople.plumber)
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Urgent repairs \u2014 tradesperson (other): " }),
      tradeLine(urgentRepairsTradespeople.other)
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Landlord email for electronic service of notices: " }),
      electronicService.landlordEmail
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Tenant email for electronic service of notices: " }),
      electronicService.tenantEmail
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Landlord consents to electronic service (clause 50): " }),
      consentText(electronicService.landlordConsentsToEmailService)
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Tenant consents to electronic service (clause 50): " }),
      consentText(electronicService.tenantConsentsToEmailService)
    ] }) }),
    /* @__PURE__ */ jsxs(View, { style: styles.scheduleRow, children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Special conditions (additional terms): " }),
      specialConditions.length > 0 ? specialConditions.map((line, i) => /* @__PURE__ */ jsxs(Text, { style: styles.bullet, children: [
        "\u2022 ",
        line
      ] }, i)) : /* @__PURE__ */ jsx(Text, { style: styles.bullet, children: "\u2014" })
    ] }),
    bookingNotes ? /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Booking notes: " }),
      bookingNotes
    ] }) }) : null
  ] });
}
function SignaturesBlock(props) {
  const landlordDisplay = props.landlord.companyName ? `${props.landlord.fullName} (${props.landlord.companyName})` : props.landlord.fullName;
  const t2 = props.additionalTenantNames[0]?.trim() ?? "";
  const t3 = props.additionalTenantNames[1]?.trim() ?? "";
  const t4 = props.additionalTenantNames[2]?.trim() ?? "";
  const sigBanner = "========================================\nSIGNATURES\n========================================\n\nSIGNED BY THE LANDLORD\nNote: Section 9 of the Electronic Transactions Act 2000 allows for agreements to be signed electronically in NSW if the parties consent. If an electronic signature is used then it must comply with Division 2 of Part 2 of the Electronic Transactions Act 2000.\n\nName of landlord:";
  const lisHeadingAndBody = "LANDLORD INFORMATION STATEMENT\nThe landlord acknowledges that, at or before the time of signing this residential tenancy agreement, the landlord has read and understood the contents of the Landlord Information Statement published by NSW Fair Trading that sets out the landlord's rights and obligations.\n\nSignature of landlord:";
  const tenant1Banner = "\nSIGNED BY THE TENANT (1)\nName of tenant:";
  const tenant2Banner = "\nSIGNED BY THE TENANT (2)\nName of tenant:";
  const tenant3Banner = "\nSIGNED BY THE TENANT (3)\nName of tenant:";
  const tenant4Banner = "\nSIGNED BY THE TENANT (4)\nName of tenant:";
  const tisHeadingAndBody = "TENANT INFORMATION STATEMENT\nThe tenant acknowledges that, at or before the time of signing this residential tenancy agreement, the tenant was given a copy of the Tenant Information Statement published by NSW Fair Trading.\n\nSignature of tenant:";
  const contactFooter = "For information about your rights and obligations as a landlord or tenant, contact:\n(a) NSW Fair Trading on 13 32 20 or nsw.gov.au/fair-trading or\n(b) Law Access NSW on 1300 888 529 or lawaccess.nsw.gov.au or\n(c) your local Tenants Advice and Advocacy Service at tenants.org.au";
  return /* @__PURE__ */ jsxs(View, { children: [
    /* @__PURE__ */ jsx(Text, { style: styles.block, children: sigBanner }),
    /* @__PURE__ */ jsx(Text, { style: styles.sigP, children: landlordDisplay }),
    /* @__PURE__ */ jsxs(View, { style: styles.sigRow, children: [
      /* @__PURE__ */ jsx(Text, { children: "Signature of landlord: " }),
      /* @__PURE__ */ jsx(Text, { style: styles.docusealTag, children: "{{Landlord Signature;role=First Party;type=signature}}" })
    ] }),
    /* @__PURE__ */ jsx(View, { style: styles.sigSpace }),
    /* @__PURE__ */ jsxs(View, { style: styles.sigRow, children: [
      /* @__PURE__ */ jsx(Text, { children: "Landlord Sign Date " }),
      /* @__PURE__ */ jsx(Text, { style: styles.docusealTag, children: "{{Landlord Sign Date;role=First Party;type=date}}" })
    ] }),
    /* @__PURE__ */ jsx(View, { style: styles.sigSpace }),
    /* @__PURE__ */ jsx(Text, { style: styles.block, children: lisHeadingAndBody }),
    /* @__PURE__ */ jsxs(View, { style: styles.sigRow, children: [
      /* @__PURE__ */ jsx(Text, { children: " " }),
      /* @__PURE__ */ jsx(Text, { style: styles.docusealTag, children: "{{Landlord LIS Signature;role=First Party;type=signature}}" })
    ] }),
    /* @__PURE__ */ jsx(View, { style: styles.sigSpace }),
    /* @__PURE__ */ jsxs(View, { style: styles.sigRow, children: [
      /* @__PURE__ */ jsx(Text, { children: "Landlord LIS Date " }),
      /* @__PURE__ */ jsx(Text, { style: styles.docusealTag, children: "{{Landlord LIS Date;role=First Party;type=date}}" })
    ] }),
    /* @__PURE__ */ jsx(View, { style: styles.sigSpace }),
    /* @__PURE__ */ jsx(Text, { style: styles.block, children: tenant1Banner }),
    /* @__PURE__ */ jsx(Text, { style: styles.sigP, children: props.tenant.fullName }),
    /* @__PURE__ */ jsxs(View, { style: styles.sigRow, children: [
      /* @__PURE__ */ jsx(Text, { children: "Signature of tenant: " }),
      /* @__PURE__ */ jsx(Text, { style: styles.docusealTag, children: "{{Tenant Signature;role=Second Party;type=signature}}" })
    ] }),
    /* @__PURE__ */ jsx(View, { style: styles.sigSpace }),
    /* @__PURE__ */ jsxs(View, { style: styles.sigRow, children: [
      /* @__PURE__ */ jsx(Text, { children: "Tenant Sign Date " }),
      /* @__PURE__ */ jsx(Text, { style: styles.docusealTag, children: "{{Tenant Sign Date;role=Second Party;type=date}}" })
    ] }),
    /* @__PURE__ */ jsx(View, { style: styles.sigSpace }),
    /* @__PURE__ */ jsx(Text, { style: styles.block, children: tenant2Banner }),
    /* @__PURE__ */ jsx(Text, { style: styles.sigP, children: t2 }),
    /* @__PURE__ */ jsx(Text, { style: styles.sigP, children: "Signature of tenant:" }),
    /* @__PURE__ */ jsx(View, { style: styles.sigSpace }),
    /* @__PURE__ */ jsx(Text, { style: styles.block, children: tenant3Banner }),
    /* @__PURE__ */ jsx(Text, { style: styles.sigP, children: t3 }),
    /* @__PURE__ */ jsx(Text, { style: styles.sigP, children: "Signature of tenant:" }),
    /* @__PURE__ */ jsx(View, { style: styles.sigSpace }),
    /* @__PURE__ */ jsx(Text, { style: styles.block, children: tenant4Banner }),
    /* @__PURE__ */ jsx(Text, { style: styles.sigP, children: t4 }),
    /* @__PURE__ */ jsx(Text, { style: styles.sigP, children: "Signature of tenant:" }),
    /* @__PURE__ */ jsx(View, { style: styles.sigSpace }),
    /* @__PURE__ */ jsx(Text, { style: styles.block, children: tisHeadingAndBody }),
    /* @__PURE__ */ jsxs(View, { style: styles.sigRow, children: [
      /* @__PURE__ */ jsx(Text, { children: " " }),
      /* @__PURE__ */ jsx(Text, { style: styles.docusealTag, children: "{{Tenant TIS Signature;role=Second Party;type=signature}}" })
    ] }),
    /* @__PURE__ */ jsx(View, { style: styles.sigSpace }),
    /* @__PURE__ */ jsxs(View, { style: styles.sigRow, children: [
      /* @__PURE__ */ jsx(Text, { children: "Tenant TIS Date " }),
      /* @__PURE__ */ jsx(Text, { style: styles.docusealTag, children: "{{Tenant TIS Date;role=Second Party;type=date}}" })
    ] }),
    /* @__PURE__ */ jsx(View, { style: styles.sigSpace }),
    /* @__PURE__ */ jsx(Text, { style: styles.block, children: contactFooter })
  ] });
}
function NswResidentialTenancyAgreement(props) {
  const { documentId, generatedAt } = props;
  const clauseChunks = chunkText(FT6600_CLAUSES_1_TO_55, 2700);
  const notesChunks = chunkText(FT6600_NOTES, 3200);
  return /* @__PURE__ */ jsxs(Document, { children: [
    /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx(FixedFooter, { documentId, generatedAt }),
      /* @__PURE__ */ jsx(Text, { style: styles.block, children: FT6600_TITLE_AND_IMPORTANT }),
      /* @__PURE__ */ jsx(ScheduleBlock, { ...props })
    ] }),
    /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx(FixedFooter, { documentId, generatedAt }),
      /* @__PURE__ */ jsx(Text, { style: styles.block, children: FT6600_AGREEMENT_HEADER }),
      /* @__PURE__ */ jsx(Text, { style: styles.block, children: clauseChunks[0] })
    ] }),
    clauseChunks.slice(1).map((chunk, i) => /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx(FixedFooter, { documentId, generatedAt }),
      /* @__PURE__ */ jsx(Text, { style: styles.block, children: chunk })
    ] }, `clause-${i}`)),
    notesChunks.map((chunk, i) => /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx(FixedFooter, { documentId, generatedAt }),
      /* @__PURE__ */ jsx(Text, { style: styles.block, children: chunk })
    ] }, `notes-${i}`)),
    /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx(FixedFooter, { documentId, generatedAt }),
      /* @__PURE__ */ jsx(SignaturesBlock, { ...props })
    ] })
  ] });
}
export {
  NswResidentialTenancyAgreement
};
