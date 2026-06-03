# NSW FT6600 — official PDF AcroForm mapping

Prescribed form: **Residential Tenancy Agreement (FT6600)** — Fair Trading standard form (publication 19 May 2025; PDF last updated 18 Dec 2025).

| Item | Value |
|------|--------|
| **Stored PDF** | `docs/nsw/residential-tenancy-agreement-form-2025-12.pdf` |
| **Provenance** | `docs/nsw/source.json` (SHA-256, download URL, text verification) |
| **Pages** | 18 (0-based page index 0–17) |
| **AcroForm fields** | 127 (120 fillable text/checkbox + 7 signature widgets) |
| **Clause text baseline** | `docs/ft6600-2025-12-17.txt` |
| **Generator route** | `resolveTenancyPackage` → `nsw-ft6600` → `/api/documents/generate-residential-tenancy` |
| **Types / handler** | `api/documents/rtaTypes.ts` (`NswResidentialTenancyAgreementProps`), `api/documents/generate-residential-tenancy.ts` |
| **Current PDF (to retire for prescribed body)** | `src/lib/documents/NswResidentialTenancyAgreement.tsx` (react-pdf rebuild) |

Fair Trading field hints below are taken from DocuSeal’s import of the raw AcroForm (spike submission 32). **AcroForm internal names (`Text field X.Y`) do not always match tooltip order** — five fields are **spike-verified** on the Dec 2025 PDF; implement the rest with single-field fill tests before production.

---

## Signing (DocuSeal) — implemented

**Modules:** `officialNswFt6600Fill.ts` (schedule fill + flatten) → `officialNswFt6600Signing.ts` (widget tags + margin anchors). Wired in `generate-residential-tenancy.ts`; DocuSeal send when `pdfBufferHasDocusealTags` is true (not gated on fill-only flag). Co-tenant uses same `bookingRequiresCoTenantSignature` + `resolveCoTenantSignerForSubmission` as react-pdf (`Co-tenant` role, distinct email).

**Executed-PDF check (2026-06-03):** `{{...}}` literals on the uploaded PDF are **not** present in the completed download (0 curly braces after both parties signed via API). Source-only cosmetic — margin-anchor recipe ships. Report: `scripts/test-official-form-spike/executed-tag-spike-report.json`.

**Status (2026-06-03):** Signer-view check done via API on `refined-b-v2.pdf` + anchors. **Do not use body anchors** `(40, 600)` / `(40, 500)` on page 16 — they print visible duplicate tag literals over the form body.

### Approved parser anchors

| Anchor | Page (0-based) | PDF coords `(x, y)` | Font | Notes |
|--------|----------------|---------------------|------|--------|
| `{{Landlord Signature;role=First Party;type=signature}}` | **16** | **(12, 18)** | 14pt black | Bottom-left margin of signature spread |
| `{{Tenant Signature;role=Second Party;type=signature}}` | **16** | **(12, 34)** | 14pt black | Below landlord anchor |

DocuSeal **deduplicates** by field name: duplicate landlord/tenant signature tags resolve to **one** field each at the **widget-aligned** positions (~`x` 0.061, `y` 0.18–0.78 on page 16), not at the anchor coordinates. API test: 7 signature/date fields, two submitters — same as body-anchor recipe.

**Rejected:** Page **17** margin anchors → 0 fields (parser does not unlock).

### Production signing recipe

1. Load official template; `pdf-lib` fill schedule fields (this doc § Schedule tables).
2. `form.flatten()` — baked values, **0** residual AcroForm.
3. Overlay **production** DocuSeal tags at pre-flatten signature widget rects (see § Signature widgets): **7pt**, `rgb(0.42, 0.45, 0.5)` / `#6b7280` (refined-b-v2 extraction; same strings as `NswResidentialTenancyAgreement.tsx` `SignaturesBlock`).
4. On page **16**, draw **parser anchors** (table above) — duplicate names intentional; see `TECH_DEBT.md`.
5. `createDocusealSubmissionFromPdf` (`api/lib/docuseal.shared.js`).

**Do not use:** raw AcroForm upload to DocuSeal; 1pt white tags; invisible anchors.

**Local spot-check PDFs (gitignored):** `scripts/test-official-form-spike/refined-b-v2.pdf`, `v2-anchor-margin-p16-bl.pdf`.

### Signature widgets → DocuSeal tags

Collected before flatten (pages **16–17**). Map **top-to-bottom** per page to tags in order:

| Widget | Page | Rect `(x, y, w, h)` | DocuSeal tag |
|--------|------|---------------------|--------------|
| Signature Field 1 | 16 | (34, 572, 181, 37) | `{{Landlord Signature;role=First Party;type=signature}}` |
| Signature Field 2 | 16 | (34, 437, 181, 37) | `{{Landlord Sign Date;role=First Party;type=date}}` |
| Signature Field 3 | 16 | (34, 303, 181, 37) | `{{Landlord LIS Signature;role=First Party;type=signature}}` |
| Signature Field 4 | 16 | (34, 170, 181, 37) | `{{Landlord LIS Date;role=First Party;type=date}}` |
| Signature Field 5 | 17 | (34, 667, 181, 37) | `{{Tenant Signature;role=Second Party;type=signature}}` |
| Signature Field 6 | 17 | (34, 536, 181, 37) | `{{Tenant Sign Date;role=Second Party;type=date}}` |
| Signature Field 7 | 17 | (34, 415, 181, 37) | `{{Tenant TIS Signature;role=Second Party;type=signature}}` |

`{{Tenant TIS Date;role=Second Party;type=date}}` — overlay on Field 7 rect offset or next line (spike: 7 fields without separate TIS date; confirm in DocuSeal UI when implementing).

**Co-tenant (one):** `{{Tenant 2 Signature;role=Co-tenant;type=signature}}` + date at manual coords on page 16 between primary tenant and TIS when `includeCoTenantSignatureTags`. Tenants 3–4 remain schedule-only (no DocuSeal tags).

---

## Spike-verified fill fields

| AcroForm name | Fair Trading hint (DocuSeal) | Schedule label | Platform source | Notes |
|---------------|------------------------------|----------------|-----------------|-------|
| `Text field 1.1` | Landlord 1 name (tooltip order may differ) | Landlord Name (1) | `landlord_profiles` → `fullName` | **Verified** spike fill |
| `Text field 2.1` | Tenant 1 name | Tenant Name (1) | `student_profiles` → `fullName` | **Verified** spike fill |
| `Text field 3.9` | (premises line) | The residential premises are | `properties` address line | **Verified** spike fill |
| `Text field 4.0` | (premises / related line) | Premises (continuation) | Same as `3.9` or part description | **Verified** spike fill |
| `Text field 3.7` | Rent amount / frequency area | The rent is | `bookings.weekly_rent` (formatted AUD) | **Verified** spike fill |

---

## Schedule — agreement header & landlord (section 1.x)

| AcroForm | Fair Trading hint | Schedule label | Platform source | Default / GAP |
|----------|-------------------|----------------|-----------------|---------------|
| `Text field 1.1` | Landlord 1 name | Landlord Name (1) | `landlord.fullName` | — |
| `Text field 1.2` | Agreement made — address line 1 | AT (suburb/address) | Suburb from `premises.addressLine` | — |
| `Text field 1.3` | Agreement made — address line 2 | AT (continuation) | — | Often blank |
| `Text field 1.4` | Landlord 2 name | Second landlord | — | **GAP** — leave blank |
| `Text field 1.5` | Landlord telephone / contact | Landlord telephone | `landlord.phone` | — |
| `Text field 1.6` | Overseas residential address | Overseas address | — | **GAP** — blank unless captured |
| `Text field 1.7` | Additional landlord phone | Extra phone | — | **GAP** |
| `Text field 1.8` | Address for service of notices | Business/residential address for notices | `landlord.addressLine` | — |
| `Text field 1.11` | Suburb | Suburb (landlord service) | Parse from `landlord.addressLine` | **GAP** if not parsed |
| `Text field 1.12` | State | State | Parse | **GAP** |
| `Text field 1.13` | Postcode | Postcode | `landlord_profiles.postcode` | **GAP** if missing |
| `Text field 1.14` | Corporation business address | Corporate address | `landlord.companyName` + address | **GAP** if not corporate |

---

## Schedule — tenant & agent (section 2.x)

| AcroForm | Fair Trading hint | Schedule label | Platform source | Default / GAP |
|----------|-------------------|----------------|-----------------|---------------|
| `Text field 2.1` | Tenant 1 name | Tenant Name (1) | `tenant.fullName` | — |
| `Text field 2.2`–`2.3` | Suburb / state / postcode | Tenant service address parts | `tenant.addressForServiceLine` | **GAP** — split or omit |
| `Text field 2.4` | Tenant 2 name | Tenant Name (2) | `additionalTenantNames[0]` | Empty if none |
| `Text field 2.5` | Tenant 3 name | Tenant Name (3) | `additionalTenantNames[1]` | Empty if none |
| `Text field 2.6` | Tenant 4 / other tenants | Tenant Name (4) | `additionalTenantNames[2]` | Empty if none |
| `Text field 2.7` | All other tenants | Other tenants | — | Blank |
| `Text field 2.8`–`2.11` | Tenant service address | Address for service of notices | `tenant.addressForServiceLine` | Omit lines if null |
| `Text field 2.12` | Contact details | Contact details | `tenant.phone`, `tenant.email` | — |
| `Text field 2.13`–`2.18` | Agent (first block) | Landlord's agent | `landlordAgent` | N/A rows blank when null |
| `Text field 2.19`–`2.24` | Agent (second block) | Second agent | — | **GAP** — blank |
| `Text field 2.25` | Agreement end date | Ending on (dd/mm/yyyy) | `term.endDate` | Blank if periodic |
| `Text field 2.26` | Premises address | Residential premises are | `premises.addressLine` | — |

---

## Schedule — term, premises, rent (section 3.x / 4.x text)

| AcroForm | Fair Trading hint | Schedule label | Platform source | Default / GAP |
|----------|-------------------|----------------|-----------------|---------------|
| `Check Box 3.8` | 6 months | Term: 6 months | `term.leaseLengthDescription` | — |
| `Check Box 3.14` | 12 months | Term: 12 months | — | — |
| `Check Box 3.15` | 2 years | Term: 2 years | — | — |
| `Check Box 3.16` | 3 years | Term: 5 years / 3 years | — | Match handler `termCheckState` |
| `Check Box 3.20` | 5 years | Term: 5 years | — | — |
| `Check Box 3.21` | Other | Term: other | `term.leaseLengthDescription` | When not standard length |
| `Check Box 3.22` | Periodic | Periodic (no end date) | `term.periodic` | — |
| `Check Box 3.1`–`3.6` | Inclusions / rent / due date / method | Various schedule lines | See react-pdf p2 | Map in implementation pass |
| `Text field 3.7` | Rent amount | The rent is | `rent.weeklyRent` | **Verified** |
| `Text field 3.9` | Premises / inclusions | Premises / include | `premises` + `additionalPremisesInclusions` | **Verified** (premises) |
| `Text field 3.10`–`3.13` | Rent frequency & payment method | Rent per week / payment | `rent.rentFrequency`, `rent.paymentMethod` | Checkboxes + details |
| `Text field 3.17` | Max occupants | Maximum occupants | `maxOccupantsPermitted` | — |
| `Text field 3.18`–`3.19` | Electrical repairer | Urgent repairs — electrical | `urgentRepairsTradespeople.electrician` | — |
| `Text field 3.23` | Plumbing repairer | Urgent repairs — plumbing | `urgentRepairsTradespeople.plumber` | — |
| `Text field 4.0`–`4.5` | Other repairs / phones | Urgent repairs — other | `urgentRepairsTradespeople.other` | **Verified** `4.0` in spike |
| `Text field 4.6`–`4.7` | Smoke alarm battery type | Smoke alarms | Static: battery operated | Match react-pdf |
| `Text field 4.8`–`4.10` | Rental bond paid to | Rental bond recipient | Static checkboxes | Match react-pdf (landlord, not RBO) |
| `Text field 4.18` | Water usage charges | Water usage | Static: No | — |
| `Text field 4.21` | Embedded electricity | Embedded network (elec) | Static: No | — |

---

## Schedule — smoke, strata, electronic service (section 4.x checkboxes)

| AcroForm | Fair Trading hint | Schedule label | Platform source | Default / GAP |
|----------|-------------------|----------------|-----------------|---------------|
| `Check Box 4.1` | Gas embedded network | Gas embedded network | Static: No | — |
| `Check Box 4.2` | Hardwired smoke alarms | Smoke alarm type | Static: battery | — |
| `Check Box 4.3` | Battery smoke alarms | Smoke alarm type | Checked | — |
| `Check Box 4.8`–`4.12` | Smoke alarm maintenance | Battery / strata repair | Static per react-pdf | — |
| `Check Box 4.13` / `4.19` | Strata by-laws | Strata by-laws | Static: No | — |
| `Check Box 4.20` / `4.22` | Landlord e-service consent | Electronic service — landlord | `electronicService.landlordConsentsToEmailService` | — |
| `Check Box 4.23` / `5.1` | Tenant e-service consent | Electronic service — tenant | `electronicService.tenantConsentsToEmailService` | — |
| `Check Box 5.12` / `5.3` | Email for service | Landlord / tenant email | `electronicService.*Email` | — |
| `Check Box 5.4` | Additional terms | Special conditions | `specialConditions` + `bookingNotes` | **GAP** — attach sheet if long |
| `Check Box 5.6`–`5.7` | Pets / agent name | Pets / agent | Static / agent name | Pets: none unless agreed |

---

## Signature block text fields (sections 15 / 17 / 18) — leave blank

Printed name/date rows on pages 16–17 (`Text field 5.5`, `5.8`, `15.x`, `17.x`, `18.x`) are **filled by DocuSeal** (signature + date fields). Do not pre-fill with `pdf-lib` except where platform requires printed names before sign (defer to implementation).

| AcroForm group | Purpose |
|----------------|---------|
| `Text field 5.5`, `5.8`, `15.1`, `15.2` | Landlord sign date parts |
| `Text field 17.1`–`17.15` | Tenant 1–2 sign dates / printed names |
| `Text field 18.1`–`18.11` | Tenant 3–4 / TIS dates |

---

## Platform defaults (aligned with react-pdf generator)

| Schedule topic | Behaviour when missing |
|----------------|------------------------|
| Co-tenants 2–4 | Empty name fields; no extra DocuSeal co-tenant role yet |
| Landlord agent | Agent block blank; “Not applicable” equivalent |
| Bond | `properties.bond` or 4× weekly rent |
| Rent payment | `buildRtaRentPaymentMethodLine` + `rent_payment_method` |
| Water / embedded networks | “No” (same as current generator) |
| TIS / LIS delivery | Operational process — not AcroForm fields; separate compliance doc **GAP** |
| Special conditions | Blank or short text; long text → addendum / attachment **GAP** |

---

## Storage & package

| Artifact | Basename |
|----------|----------|
| Draft FT6600 | `nsw_ft6600_residential_tenancy_agreement_draft.pdf` |
| Signed FT6600 | `nsw_ft6600_residential_tenancy_agreement_signed.pdf` |
| Addendum (unchanged) | `quni_platform_addendum_*.pdf` |

Path: `{tenancy_id}/residential_tenancy/` in `tenancy-documents` bucket.

---

## Implementation sequence

1. **This doc** — schedule fill mapping.
2. **`officialNswFt6600Fill.ts`** — pdf-lib fill + flatten.
3. **`officialNswFt6600Signing.ts`** — tag overlay + margin anchors; `pdfBufferHasDocusealTags` send guard.
4. **`generate-residential-tenancy.ts`** — official PDF default; `NSW_USE_OFFICIAL_FT6600_REACT_PDF_FALLBACK=1` escape hatch.
5. Retain react-pdf sample under `public/agreement-samples/` for regression only.

---

## References

- QLD mapping template: `docs/form18a-field-mapping.md`
- Spike artifacts: `scripts/test-official-form-spike/` (gitignored)
- DocuSeal fragility: `TECH_DEBT.md`
