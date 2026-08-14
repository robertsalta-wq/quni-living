# NSW Tier 3 Boarding House Occupancy Agreement - build plan

**Status:** Approved to build (14 Aug 2026). v1 scope = hybrid + charges. One PR. Do not start code until this review pass is accepted.
**Canonical wording:** `Quni-NSW-BoardingHouse-Occupancy-Agreement.docx` (delivered 13 Aug). If code and master ever differ, the master wins.
**Follows:** original Cursor brief (13 Aug); Path B; T1/T2 generator pipeline; Rob hybrid+charges approval (14 Aug).
**Not this PR:** NSW T3 compliance attestation gate (separate brief, separate plan).

---

## 1. Verdict

Build a **new** NSW T3 generator on the **existing T1/T2 listing-agreement pipeline**. Same confirm → PDF → `tenancy_documents` → DocuSeal send path. Locked Fair Trading body from the master. Do not fork T1 licence prose or the T2 FT6600 + addendum pair.

v1 fills room description (required), shared-area ticks (at least one), and additional-charge rows with a real Annexure 2 (including extra sign fields when present). Override-notice UI, inventory attachment, and month/year fee period stay deferred as tested seams.

Instruct-to-Send is **not** in this PR. Live on merge. No draft/review/not-valid copy on live PDFs or product UI.

---

## 2. Decision table (locked)

| # | Decision | Locked value |
|---|---|---|
| D1 | Pipeline | Same as T1/T2: `resolveTenancyPackage` → registry `preflight`/`run` → `triggerListingDocumentGeneration` from `confirmListing` with `deferSigning: false` → DocuSeal. |
| D2 | Document family | New generator. Do not reuse T1 occupancy or T2 FT6600/addendum clause text, components, or platform-prose helpers. |
| D3 | Parties on the page | Proprietor and Resident only. Quni is not named as party, agent, signatory, facilitator, or payee. No Quni addendum. |
| D4 | Money | Occupancy fee and security deposit payable to and held by the **proprietor**. No Quni-held deposit, trust, escrow, or RBO lodgement. Extra utilities/charges only via Annexure 2 (Principle 7). |
| D5 | Service tier | NSW T3 **Listing available**. **Managed stays unsupported**. |
| D6 | Deposit cap | Maximum **2 weeks’ occupancy fee**, computed as `2 × weeklyEquivalent` (do not hard-code “must be weekly”). v1 fee is weekly, so equivalent = `weekly_rent`. Enforce at property form, terms editor, invite, and generator preflight. |
| D7 | Occupancy fee period | **Weekly only in v1.** Print `$X per week`. Month/year checkboxes stay unchecked. Cap helper already takes a weekly equivalent so monthly is a later print-only add. |
| D8 | Override notice columns | Always blank in v1. Suggested defaults in column 2 apply. **No override UI.** |
| D9 | Annexure 2 | **In v1.** Operator charge rows `{item, amount, when due, how calculated}` on the T3 listing form. “How calculated” must capture Principle 7 (actual cost + reasonable apportionment). Mount Annexure 2 only when `rows.length >= 1`. When mounted, DocuSeal Proprietor + Resident sign/date on Annexure 2 as well as the main execution block. Snapshot rows onto the document at generate time. |
| D10 | House rules | Always include a **Statement of House Rules** page (master clause 2). Print `properties.house_rules` when set; otherwise leave the statement body blank. Do not invent rules. |
| D11 | Inventory | Furnished tick from `properties.furnished`. **No inventory attachment in v1.** |
| D12 | Instruct-to-Send | **Out.** Same auto-send as T1/T2. |
| D13 | Production | **Live on merge to `main`.** No feature flag. |
| D14 | Compliance gate | **Out of this PR.** Separate brief/plan. Registration number already exists on the rooming-house listing field; the four-attestation warranty gate is not this generator. |
| D15 | No “not valid / in review” copy | Live PDFs and product UI must not say draft, sample, in legal review, not for execution, not available yet, or otherwise not a real occupancy agreement. Do not copy T1’s legal-review watermark. |
| D16 | Dashboard access | `document_type: 'lease'` (same as T1). No new type. Standard landlord Booking-review “Tenancy agreement” + renter `BookingLeasePanel`. No T3-specific screen. |
| D17 | Content split | Legal/copy must not key off `document_type === 'lease'` or treat `pdfKind === 'occupancy_agreement'` as boarder/lodger. `isBoarderLodger` = `tier === 'T1'` only. Explainer, payment, bond cap, emails, NCAT wording from **tier / generator / rules**. |
| D18 | Row identity | `metadata.generator = 'nsw-boarding-house'` on the `lease` row at insert (kept on updates). |
| D19 | NSW only + admin | T3 live for **NSW only**. `/admin/state-workflows`: NSW T3 probe Supported (`nsw-boarding-house`, Listing ✓, Managed ✕). QLD/VIC/other T3 stay Not supported. Do not set NSW T3 Managed to Available. |
| D20 | Room description | **Required** to save a NSW T3 listing and to generate the agreement. Identifies the room. Block with a clear error if empty. Do not fall back to `room_type` or a blank line. |
| D21 | Shared-area ticks | Kitchen / bathroom / common room / laundry / other (free text). **Require at least one** before save and before generate. Do **not** silently default all four common ticks on (that can misstate the agreement). The particulars block is never empty on a live doc. |
| D22 | Routing key | Fire only when `state = NSW` AND `property_type = private_room_landlord_off_site` AND `is_registered_rooming_house = true`. Non-registered, on-site, entire-property, shared-room, and QLD/VIC must not land on `nsw-boarding-house`. Do **not** use `properties.max_occupants` as a 5+ house test (that field is room occupancy, usually 1–2). |

### v1 particulars

| Form field | v1 behaviour |
|---|---|
| Proprietor name, address, contact | From `landlord_profiles` (legal/company name as Proprietor). ABN if present, else blank. |
| Resident name, contact | Student legal name + email/phone. Keep the legal-name signing gate. |
| Premises address | From `properties`. |
| Room number/description | New `properties.room_description`. **Required.** Block if empty. |
| Furnished / unfurnished | From `properties.furnished`. If null, both boxes unchecked. |
| Other areas | Required: at least one of kitchen / bathroom / common room / laundry / other. |
| Commencement / term | Booking move-in + lease length / periodic. |
| Occupancy fee | Weekly amount. Period checkbox: week only. |
| To be paid | Payment day blank (no field yet). Method: proprietor payout BSB/account when complete; else blank. No “via Quni”. |
| Clause 8 security deposit | From booking bond. Block if `> 2 × weeklyEquivalent`. Nil allowed. |
| Clause 5 / 11 overrides | Blank. |
| Annexure 2 | Present iff >=1 charge row. Extra Proprietor + Resident sign/date on that schedule. |
| Emergency contact | Name + phone from student profile. Relationship and address blank. |
| Main signatures | DocuSeal Proprietor + Resident + dates. |

---

## 3. Why T1/T2 “the same way” is the pipeline, not the PDF body

T1 and T2 already differ in PDF technique (T1 = Quni-authored React-PDF licence; T2 = official FT6600 fill + Quni addendum). What they share, and what T3 must share:

1. Router picks a generator id.
2. Listing tenancy module `preflight` + `run`.
3. PDF uploaded to `tenancy-documents`.
4. Row on `tenancy_documents`.
5. Confirm listing sends for signing immediately.
6. Sample PDF in `scripts/generate-agreement-samples.mjs` + `public/agreement-samples/`.

T3 package shape is **T1-like** (occupancy-family `lease` row, two signers, proprietor-held deposit, skip co-tenant, no Quni addendum). T3 form technique is **T2-like** (locked statutory text, fill particulars only). Closest in-repo PDF pattern: VIC Form 1 (React-PDF from a locked extract).

**Do not copy**

- T1 NCAT / Principal / “facilitated through Quni” prose
- T1 `LICENCE_OCCUPY_WATERMARK`
- T2 FT6600 + `QuniPlatformAddendum`
- DocuSeal filename `Quni Licence to Occupy.pdf`
- `MAX_BOND_WEEKS = 4` as the T3 cap

T1 says NCAT does not apply. T3 clause 9 says either party may apply to NCAT about Occupancy Principles.

---

## 4. Scope

**In this PR**

- NSW T3 generator + locked strings + golden `pdf-parse` test + one dummy sample PDF.
- Router / registry / NSW T3 bond rules / Listing-only matrix. Live on merge.
- Room description (required), shared-area ticks (at least one), additional-charge rows + Annexure 2 + conditional Annexure 2 DocuSeal fields.
- 2-week cap via weekly-equivalent helper at every T3 write site.
- T3 payment-instruction and signing-explainer copy (Boarding Houses Act 2012).
- Statement of House Rules page.
- `isBoarderLodger = tier === 'T1'` fix in listing emails.
- Admin State workflows NSW T3 probe copy.
- Deferred-item seam tests (see §8).

**Out of this PR**

- QLD T3 / VIC T3.
- Compliance attestation gate (registration warranty, DA, AFSS, head-lessor consent). See `docs/plans/nsw-t3-compliance-attestation-gate-plan.md`.
- Instruct-to-Send.
- Clause 5/11 override UI.
- Inventory attachment.
- Month/year occupancy-fee period (print).
- Managed for NSW T3.
- Edits to T1/T2 **generators** (shared router/registry/bond-helper branches are allowed).
- Resident-facing verified/registered/compliant badge.
- Using `max_occupants` as a 5+ boarding-house size gate.

---

## 5. Architecture

```text
confirmListing / prepare-listing-agreement / regenerate
        → triggerListingDocumentGeneration
        → resolveListingTenancyGenerator
        → resolveTenancyPackage  (NSW + off-site + rooming house → nsw-boarding-house)
        → preflight: room_description, >=1 shared area, deposit cap, legal name
        → build PDF (React-PDF, locked strings; Annexure 2 iff charge rows)
        → storage tenancy-documents
        → tenancy_documents row (document_type lease, metadata.generator, snapshot of charges)
        → sendForSigning (Proprietor + Resident; skip co-tenant; extra Annexure 2 tags when present)
```

### New / changed modules (names may shift slightly at impl)

| Piece | Change |
|---|---|
| `api/lib/resolveTenancyPackage.ts` | NSW T3 → `nsw-boarding-house`. QLD/VIC T3 stay deferred. `pdfKind` may be `occupancy_agreement`. Do not let that mean boarder/lodger. |
| `api/lib/tenancy/rules/nsw.ts` | `nswTenancyRules('T1' \| 'T2' \| 'T3')`. T3: `schemeApplies: false`, 2-week cap copy, proprietor-held. |
| `api/lib/serviceTier/nsw.ts` | T3: `{ listing: 'available', managed: 'unsupported' }`. |
| `api/lib/booking/bookingBondAmount.js` (or T3 helper beside it) | `occupancyFeeWeeklyEquivalentAud` + `assertT3SecurityDepositCap` (`2 × weeklyEquivalent`). T1/T2 still use `MAX_BOND_WEEKS = 4`. |
| Listing tenancy registry | Register `nsw-boarding-house`. |
| `nswBoardingHouse.ts` | New. Mirror occupancy **structure**. `document_type: 'lease'`, `metadata.generator`, charge snapshot. |
| `src/lib/documents/nsw/boardingHouse/` | Locked strings + React-PDF. Annexure 2 + extra sign tags only when rows exist. |
| `docs/nsw/boarding-house-occupancy-master.txt` | Checked-in extract for the golden diff. |
| Property form (T3 NSW only) | Required room description; shared-area ticks; additional-charge row editor. |
| Properties schema | `room_description`, shared-area flags (or jsonb), `additional_charges` jsonb (or child table). Snapshot charges onto `tenancy_documents.metadata` at generate. |
| Explainer / payment / emails | T3 Boarding Houses Act copy. `isBoarderLodger` = T1 only. |
| `AdminStateWorkflows.tsx` | `nsw-t3` intent no longer deferred. |

Generator id: **`nsw-boarding-house`**.

Signing package name: **NSW Standard Occupancy Agreement (boarding house)**.

Storage paths: `nsw_boarding_house_occupancy_draft.pdf` / `nsw_boarding_house_occupancy_signed.pdf`.

DocuSeal PDF name: **Standard Occupancy Agreement.pdf**.

Roles: map Proprietor → existing landlord submitter role, Resident → tenant role. Skip co-tenant. When Annexure 2 is present, extra signature/date tags for the same two roles on that page.

### `document_type: 'lease'` vs generator id (D16–D18)

Plumbing may key off `lease`. Legal copy may not. T3 writes `metadata.generator = 'nsw-boarding-house'`.

Close the existing leak: `listingTransactionalEmails.js` `isBoarderLodger = tenancyPackageUsesOccupancyAgreement(pkg)` must become `pkg.tier === 'T1'`.

---

## 6. Document construction

1. Extract static text from the master into `docs/nsw/boarding-house-occupancy-master.txt` and a TypeScript strings module (12 terms, both tables, NOTE, Annexure 1, Annexure 2 structure, Crown copyright).
2. React-PDF: particulars + locked body. Fill-ins are the only variables.
3. Do not reword statutory clauses or occupancy principles.
4. Master em dashes stay in **this document only**.
5. Golden test: `pdf-parse`, whitespace-normalised. Every locked paragraph present. Forbidden markers absent, including `Principal` as a party label, `NCAT does not apply`, `Quni`, facilitated-through, RBO, T1 licence titles, legal-review / draft / not-for-execution. Clause 9 NCAT-applies text **must** be present.
6. Annexure 2 mounted iff `additionalCharges.length >= 1`. Extra DocuSeal tags only then.
7. No validity caveats on the live PDF. Fair Trading NOTE stays (statutory).

Required to generate: proprietor identity, resident legal name, premises address, commencement, occupancy fee, **room_description**, **>=1 shared area**. Security deposit may be nil. Charge rows optional (Annexure 2 omitted if none).

---

## 7. Deposit cap

Statute: security deposit **no more than two weeks’ occupancy fee**.

```text
weeklyEquivalent = occupancyFeeWeeklyEquivalentAud(amount, period)
  v1: period is always week → weeklyEquivalent = amount
cap = roundBondAud(2 * weeklyEquivalent)
block if deposit > cap
```

Touch every T3 write of `bond` / `bond_weeks`: property form, terms editor, agreed rent, tenant invite, generator preflight.

Do not change the T1/T2 four-week cap.

---

## 8. Deferred seams (not v1 UI; must be tested)

Each item is deferred **only** because it can be added later without rewriting the locked Fair Trading body or replacing the listing pipeline.

| Deferred | v1 lock | How it is added later without touching locked body or pipeline | Seam test now |
|---|---|---|---|
| Clause 5 / 11 override UI | Third column always `''`. Printed government defaults apply. | Pass optional `noticeOverride` strings into the existing table cells. No new clauses. | Render with empty overrides → column 3 blank, column 2 defaults present. Fixture with a dummy override string still renders inside the same cell (unit test only; no UI). |
| Inventory attachment | Furnished tick only. | Later: extra PDF in the DocuSeal package (same pattern as T2 addendum file), not new statutory text. | Furnished true/false ticks correctly; PDF has no inventory schedule; generate still succeeds with no attachment. |
| Month/year fee period | Week checkbox only. Cap already uses weeklyEquivalent. | Later: tick month/year and print the converted amount. Cap call stays `2 × weeklyEquivalent`. Locked terms unchanged. | v1 PDF has week checked, month/year unchecked. Helper: monthly amount → weeklyEquivalent → cap is 2× that, not 2× the monthly figure. |

If a later change needed a new agreement family or a new send path, it would not be a clean seam. These three do not.

---

## 9. Live on merge (no flag)

NSW T3 is live when this PR merges to `main` and Production deploys that SHA.

- No `nsw_t3_boarding_house_agreements` flag.
- Strip NSW T3 “not available on the platform yet” product strings. QLD/VIC T3 may still say not available.
- `/admin/state-workflows`: NSW T3 Supported, Listing ✓, Managed ✕.

**Forbidden on live PDF / product UI:** `Subject to final legal review`, `Draft for legal review`, `not for execution`, `terms may be updated with written notice`, T3-not-available-yet (NSW), preview/unverified badges.

Dummy gallery PDFs may keep `SAMPLE - not for execution` like T1/T2 samples. Not on booking PDFs.

---

## 10. Acceptance criteria

1. Golden static-text diff vs checked-in master extract (12 terms, tables, NOTE, Annexure 1). Annexure 2 body present in the PDF only when rows exist.
2. Room description required; empty blocks generate. Shared-area block never empty on a live PDF (>=1 tick).
3. Deposit > `2 × weeklyEquivalent` blocked at form + preflight.
4. Annexure 2 present when >=1 row (with Principle-7 “how calculated” and extra sign/date fields); absent when empty.
5. Override notice columns blank.
6. Quni not a party/agent/signatory/payee. Proprietor + Resident only (plus Annexure 2 of the same two when charges exist).
7. Signable PDF via DocuSeal.
8. Confirm listing produces this package, not T1 occupancy or FT6600. Live after merge.
9. QLD/VIC T3 remain deferred. T1/T2 generators unchanged.
10. Dummy sample PDF in `public/agreement-samples/`. Live PDFs have no SAMPLE/review/draft watermark.
11. `document_type: 'lease'` + `metadata.generator === 'nsw-boarding-house'`. Shared `lease-state` and landlord-list actions resolve. No T3-specific screen.
12. T3 gets Boarding Houses Act explainer + proprietor-held 2-week cap + T3 payment copy. Not T1 licence copy, not RBO, not 4-week cap. `isBoarderLodger` false.
13. Clause 9 NCAT-applies text present. Forbidden: `Principal` as party label, `NCAT does not apply`.
14. Router does not land this generator for non-registered, on-site, entire-property, shared-room, or non-NSW. Does **not** use `max_occupants` as a 5-resident test.
15. `/admin/state-workflows` NSW T3 Supported; QLD/VIC/other T3 Not supported; NSW T3 Managed Unsupported.
16. D15 forbidden phrases absent from live PDF and product UI.
17. Seam tests in §8 pass.

---

## 11. Test plan

- Router: NSW off-site + registered rooming house → `nsw-boarding-house`. Off-site + **not** registered → T2 FT6600. On-site → T1 occupancy. QLD/VIC rooming house still deferred.
- NSW service tier: T3 listing available, managed unsupported.
- Room description empty → preflight/save error. Shared areas none → error. One tick → ok.
- Deposit: 2× weeklyEquivalent allowed; +$1 blocked; 4 weeks blocked on T3 only. Monthly-input helper (no UI) still caps at 2× equivalent, not 2× monthly.
- Annexure 2 omitted with empty charges; included with dummy rows + extra sign tags.
- Override column blank; dummy override string still only fills column 3 in a unit fixture.
- Insert: `lease` + `metadata.generator`.
- Explainer/payment/email split T3 vs T1.
- PDF markers + forbidden list in §6.5 / AC13.
- Sample script emits `nsw-t3-…pdf`.
- `npx tsc -b --noEmit`.

---

## 12. PR shape

One PR:

1. Locked extract + React-PDF + listing generation module.
2. Router, NSW T3 rules, Listing-only matrix.
3. Weekly-equivalent 2-week cap at T3 write sites.
4. Property form: required room description, shared-area ticks, charge rows.
5. Annexure 2 + conditional DocuSeal fields; charge snapshot on the document row.
6. Copy (explainer + payment + email lodger split). Strip NSW T3 “not available yet”.
7. Admin State workflows NSW T3 probe.
8. Tests + sample PDF + golden extract.

Branch off current `origin/main`. Merge to `main` is the live cutover.

---

## 13. Risks (accepted)

- React-PDF will not byte-match Word. Text parity via the golden extract.
- Auto-send on confirm is Path B-incomplete. Accepted for T1/T2 parity.
- Compliance attestation gate is **not** in this PR. A T3 listing can publish and generate once the operator ticks registered rooming house and enters the existing registration-number field. The four-attestation warranty is the next plan.
- `max_occupants` is not a boarding-house headcount. Registrable 5+ is the operator’s legal category, signalled by `is_registered_rooming_house`, not inferred from the room listing.
