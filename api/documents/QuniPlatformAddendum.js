import { jsx, jsxs } from "react/jsx-runtime";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
const QUNI_PLATFORM_URL = "https://quni.com.au";
const QUNI_MAINTENANCE_PORTAL_URL = "https://quni.com.au/maintenance";
const QUNI_MOVE_OUT_FORM_URL = "https://quni.com.au/move-out";
const LANDLORD_SERVICE_FEE_LABEL = "11% of weekly rent";
const TENANT_PLATFORM_FEES_LABEL = "None beyond the agreed rent.";
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
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 10 },
  footerWrap: { position: "absolute", bottom: 28, left: 40, right: 40 },
  footerRule: { borderTopWidth: 0.5, borderTopColor: "#cccccc", marginBottom: 6 },
  footerText: { fontSize: 7, color: "#666666" },
  block: { marginBottom: 8 },
  scheduleRow: { marginBottom: 5 },
  scheduleLabel: { fontFamily: "Helvetica-Bold" },
  bullet: { marginLeft: 10, marginBottom: 3 },
  sectionHeading: { fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 4 },
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
function FixedFooter({ documentId, generatedAt }) {
  return /* @__PURE__ */ jsxs(View, { style: styles.footerWrap, fixed: true, children: [
    /* @__PURE__ */ jsx(View, { style: styles.footerRule }),
    /* @__PURE__ */ jsx(
      Text,
      {
        style: styles.footerText,
        render: ({ pageNumber, totalPages }) => `Quni Platform Addendum \xB7 Document ID: ${documentId} \xB7 Generated: ${generatedAt} \xB7 Page ${pageNumber}` + (totalPages ? ` of ${totalPages}` : "")
      }
    )
  ] });
}
function ScheduleBlock(props) {
  const { landlord, tenant, premises, term, rent, bond, utilitiesDescription, signingPackage } = props;
  const landlordDisplay = landlord.companyName ? `${landlord.fullName} (${landlord.companyName})` : landlord.fullName;
  const endDateText = term.periodic || !term.endDate ? "Periodic tenancy (no fixed end date)" : formatAuDate(term.endDate);
  const bondText = bond.amount != null && Number.isFinite(bond.amount) ? formatMoney(bond.amount) : "\u2014";
  return /* @__PURE__ */ jsxs(View, { style: { marginTop: 4, marginBottom: 10 }, children: [
    /* @__PURE__ */ jsx(Text, { style: styles.sectionHeading, children: "Parties and premises (context)" }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Signing package: " }),
      signingPackageLabel(signingPackage)
    ] }) }),
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
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Tenant: " }),
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
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Premises (address): " }),
      premises.addressLine
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Property type: " }),
      premises.propertyType?.trim() || "\u2014"
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Room type: " }),
      premises.roomType?.trim() || "\u2014"
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Furnished: " }),
      yn(premises.furnished),
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: " \xB7 Linen supplied: " }),
      yn(premises.linenSupplied),
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: " \xB7 Weekly cleaning: " }),
      yn(premises.weeklyCleaningService)
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Term start: " }),
      formatAuDate(term.startDate),
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: " \xB7 Term end: " }),
      endDateText
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Lease length (description): " }),
      term.leaseLengthDescription
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Agreed weekly rent: " }),
      formatMoney(rent.weeklyRent),
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: " \xB7 Payment method: " }),
      rent.paymentMethod
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: styles.scheduleRow, children: /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Bond (if applicable): " }),
      bondText
    ] }) }),
    /* @__PURE__ */ jsxs(View, { style: styles.scheduleRow, children: [
      /* @__PURE__ */ jsx(Text, { style: styles.scheduleLabel, children: "Utilities / services (summary): " }),
      /* @__PURE__ */ jsx(Text, { children: utilitiesDescription.trim() || "\u2014" })
    ] })
  ] });
}
function PlatformTermsBlock() {
  return /* @__PURE__ */ jsxs(View, { style: { marginBottom: 8 }, children: [
    /* @__PURE__ */ jsx(Text, { style: styles.sectionHeading, children: "Quni platform terms" }),
    /* @__PURE__ */ jsx(Text, { style: styles.block, children: "The following applies to the tenancy listed above. URLs and standard platform fees are fixed by Quni." }),
    /* @__PURE__ */ jsxs(Text, { style: styles.bullet, children: [
      "\u2022 Platform: ",
      QUNI_PLATFORM_URL
    ] }),
    /* @__PURE__ */ jsxs(Text, { style: styles.bullet, children: [
      "\u2022 Maintenance portal: ",
      QUNI_MAINTENANCE_PORTAL_URL
    ] }),
    /* @__PURE__ */ jsxs(Text, { style: styles.bullet, children: [
      "\u2022 Move-out form: ",
      QUNI_MOVE_OUT_FORM_URL
    ] }),
    /* @__PURE__ */ jsxs(Text, { style: styles.bullet, children: [
      "\u2022 Landlord service fee: ",
      LANDLORD_SERVICE_FEE_LABEL
    ] }),
    /* @__PURE__ */ jsxs(Text, { style: styles.bullet, children: [
      "\u2022 Tenant platform fees: ",
      TENANT_PLATFORM_FEES_LABEL
    ] }),
    /* @__PURE__ */ jsx(Text, { style: [styles.block, { marginTop: 6 }], children: "The parties acknowledge they have read this addendum and agree to use the Quni platform as described, in addition to the main residential tenancy agreement in this signing package." })
  ] });
}
function SignaturesBlock(props) {
  const landlordDisplay = props.landlord.companyName ? `${props.landlord.fullName} (${props.landlord.companyName})` : props.landlord.fullName;
  return /* @__PURE__ */ jsxs(View, { children: [
    /* @__PURE__ */ jsx(Text, { style: styles.sectionHeading, children: "Execution" }),
    /* @__PURE__ */ jsx(Text, { style: styles.block, children: "Signed electronically where permitted. Each party's signature and date fields below are completed through the signing workflow." }),
    /* @__PURE__ */ jsx(Text, { style: styles.block, children: "Landlord" }),
    /* @__PURE__ */ jsx(Text, { style: styles.sigP, children: landlordDisplay }),
    /* @__PURE__ */ jsxs(View, { style: styles.sigRow, children: [
      /* @__PURE__ */ jsx(Text, { children: "Signature: " }),
      /* @__PURE__ */ jsx(Text, { style: styles.docusealTag, children: "{{Addendum Landlord Signature;role=First Party;type=signature}}" })
    ] }),
    /* @__PURE__ */ jsx(View, { style: styles.sigSpace }),
    /* @__PURE__ */ jsxs(View, { style: styles.sigRow, children: [
      /* @__PURE__ */ jsx(Text, { children: "Date: " }),
      /* @__PURE__ */ jsx(Text, { style: styles.docusealTag, children: "{{Addendum Landlord Date;role=First Party;type=date}}" })
    ] }),
    /* @__PURE__ */ jsx(View, { style: styles.sigSpace }),
    /* @__PURE__ */ jsx(Text, { style: styles.block, children: "Tenant" }),
    /* @__PURE__ */ jsx(Text, { style: styles.sigP, children: props.tenant.fullName }),
    /* @__PURE__ */ jsxs(View, { style: styles.sigRow, children: [
      /* @__PURE__ */ jsx(Text, { children: "Signature: " }),
      /* @__PURE__ */ jsx(Text, { style: styles.docusealTag, children: "{{Addendum Tenant Signature;role=Second Party;type=signature}}" })
    ] }),
    /* @__PURE__ */ jsx(View, { style: styles.sigSpace }),
    /* @__PURE__ */ jsxs(View, { style: styles.sigRow, children: [
      /* @__PURE__ */ jsx(Text, { children: "Date: " }),
      /* @__PURE__ */ jsx(Text, { style: styles.docusealTag, children: "{{Addendum Tenant Date;role=Second Party;type=date}}" })
    ] }),
    /* @__PURE__ */ jsx(View, { style: styles.sigSpace })
  ] });
}
function QuniPlatformAddendum(props) {
  const { documentId, generatedAt } = props;
  return /* @__PURE__ */ jsxs(Document, { children: [
    /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx(FixedFooter, { documentId, generatedAt }),
      /* @__PURE__ */ jsx(Text, { style: styles.title, children: "Quni Platform Addendum" }),
      /* @__PURE__ */ jsx(Text, { style: styles.block, children: "This addendum records how the Quni platform is used for the tenancy described below. It is intended to be signed together with the prescribed residential tenancy agreement in the same package." }),
      /* @__PURE__ */ jsx(ScheduleBlock, { ...props }),
      /* @__PURE__ */ jsx(PlatformTermsBlock, {})
    ] }),
    /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx(FixedFooter, { documentId, generatedAt }),
      /* @__PURE__ */ jsx(SignaturesBlock, { ...props })
    ] })
  ] });
}
export {
  QuniPlatformAddendum
};
