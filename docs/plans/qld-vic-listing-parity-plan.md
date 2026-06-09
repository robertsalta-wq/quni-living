# Plan 1 — QLD & VIC Listing tier to NSW parity

**Goal:** All three states (NSW, QLD, VIC) run the same Listing-tier cycle at production confidence:

`list → book → deposit → accept → listing fee → bond window → DocuSeal sign → confirmed`

**Scope:** Listing tier only. Managed stays gated. T3 rooming house stays deferred in all states.

**Last updated:** 9 Jun 2026

---

## Current state (codebase audit)

| Area | NSW | QLD | VIC |
|------|-----|-----|-----|
| Listing tier bookable | Yes | Yes | Yes |
| Doc routing (`resolveTenancyPackage`) | `nsw-ft6600` / `nsw-occupancy` | `qld-form18a` / `qld-occupancy` | `vic-form1` / `vic-occupancy` |
| PDF generation path | **Official AcroForm fill** + widget tag overlay | **Official AcroForm fill** (`officialQldForm18aFill.ts` → `docs/qld/form18a-renamed.pdf`) | **react-pdf** from CAV .docx extract |
| Automated PDF tests | Extensive (fill, burn-in, signing, e2e) | Marker smoke only (`QldGeneralTenancyAgreement.test.ts`) | **None** for Form 1 |
| Property/accept compliance gate | FT6600 fields required at accept | None | None |
| DocuSeal signing | Renamed AcroForm widget allowlist + regression suite | Embedded `{{...;type=signature}}` text tags in PDF | Same text-tag approach |
| Bond copy/emails | RBO-specific links + deadline copy | RTA generic | RTBA generic |
| Listing creation gated? | No (NSW extras are FT6600 UI only) | **No — VIC/QLD listings can be created today** | **No** |

**Important corrections vs earlier assumptions:**

1. **VIC Form 1 does not ship literal `[TODO(VIC-FORM1…)]` strings** in `form1Content.ts`. Gaps are tracked in `docs/vic/form-1-extraction-flags.json` (checkbox grids flattened, CAV logo omitted, renters 3–4 empty, Part B items as schedule highlights).
2. **QLD Form 18a is not the same AcroForm pipeline as NSW.** It is a full react-pdf rebuild. NSW’s 131-field rename / `/signature/i` widget regression applies to official FT6600 only.
3. **Nothing blocks a landlord from creating a VIC or QLD listing today.** Only T3 is hard-blocked. For multi-state launch, either verify forms first or add a per-state “transactions enabled” gate.

---

## Bond model decision (gates all states)

**Decision required before real bonds move:**

| Option | Pros | Cons |
|--------|------|------|
| **A — Landlord-direct (recommended for Listing launch)** | Matches current code: Quni facilitates, landlord collects/lodges; no RTA/RTBA/RBO API build | Landlord must lodge; Quni provides instructions only |
| **B — Quni collects and lodges** | Full platform control | Three authority integrations (RBO, RTBA, RTA), statutory timeframes, trust accounting |

**Current code assumes Option A** for Listing tier:

- `api/lib/tenancy/bondCopy.ts`, `listingBondPaymentCopy.ts` — state-aware authority names and deadlines
- `ListingBondPaymentGuidance.tsx` — NSW RBO deep link; QLD/VIC authority homepages only
- `api/booking-mark-bond-received.ts` — landlord marks received → `confirmed`
- **No `bonds` DB row on Listing confirm** (Managed only)
- Trust checklist #49 still open: bond reference field + post-signing instruction email

**Deliverable:** Written bond SOP per state + implement #49 (reference field + instruction email) once, configured per authority.

---

## Work streams

### Stream 0 — Shared: DocuSeal signing verification (do first)

NSW and react-pdf states use **different signing mechanisms**. Fix/verify each:

| State | Mechanism | Action |
|-------|-----------|--------|
| NSW | Official PDF AcroForm → flatten → widget tag overlay (`officialNswFt6600Signing.ts`, `ft6600RenamedFields.ts`) | Run existing regression suite; confirm renamed-field `/signature/i` allowlist still passes on current template |
| QLD | Text tags in `QldGeneralTenancyAgreement.tsx` + `QuniPlatformAddendumQld.tsx` | **New:** test-mode DocuSeal E2E — generate PDF → submit → confirm signature fields detected |
| VIC | Text tags in `form1Generator.tsx` + `addendumGenerator.tsx` | **New:** same DocuSeal E2E as QLD |

**Files:** `api/lib/docuseal.ts`, `api/lib/docuseal.shared.js`, `scripts/test-official-form-docuseal-spike.mjs`, per-state generators.

**Exit criteria:** One successful test-mode signing submission per state (T2 path: main agreement + addendum).

---

### Stream 1 — QLD Form 18a to verified standard

**Reference:** `docs/form18a-field-mapping.md`, `api/lib/documents/officialQldForm18aFill.ts`, `api/documents/generate-qld-residential-tenancy.ts`

| # | Task | Priority |
|---|------|----------|
| 1.1 | Confirm embedded RTA template version (v23 Sep25) is still current prescribed form | Blocker |
| 1.2 | Resolve documented **GAP** fields: landlord ABN, co-tenants, repair orders, last rent increase | High |
| 1.3 | Add PDF regression tests beyond marker smoke (field values, bond amount, dates, parties) | High |
| 1.4 | Add `triggerListingDocumentGeneration` integration test for QLD (mirror NSW if exists) | Medium |
| 1.5 | Generate sample PDFs; human review against official Form 18a | Blocker |
| 1.6 | QLD test-mode E2E: list → book → accept → fee → bond window → DocuSeal → confirmed | Blocker |

**Optional (post-parity):** Migrate QLD to official AcroForm fill if RTA PDF is suitable — not required for launch if react-pdf output passes legal review.

---

### Stream 2 — VIC Form 1 to verified standard

**Reference:** `docs/vic/form-1-extraction-flags.json`, `src/lib/documents/vic/form1Generator.tsx`, `api/documents/generate-vic-residential-rental.ts`

| # | Task | Priority |
|---|------|----------|
| 2.1 | Confirm CAV Form 1 version matches current prescribed form | Blocker |
| 2.2 | Review extraction flags: Part A/B checkbox fidelity, Part E item 21, renters 3–4 | High |
| 2.3 | Add `VicForm1Agreement.test.ts` (PDF marker + key field assertions) | High |
| 2.4 | Add `triggerListingDocumentGeneration` integration test for VIC | Medium |
| 2.5 | Generate sample PDFs; human review against official CAV Form 1 | Blocker |
| 2.6 | VIC test-mode E2E (full Listing cycle) | Blocker |
| 2.7 | T1 occupancy (`generate-vic-occupancy.ts`) — confirm in scope for launch or gate T1 VIC | Scope decision |

---

### Stream 3 — Bond lodgement (Listing tier, all states)

| # | Task | Priority |
|---|------|----------|
| 3.1 | **Decision:** landlord-direct vs Quni lodges (see above) | Blocker |
| 3.2 | Document per-state lodgement rules: NSW RBO (10 days), VIC RTBA (10 business days, T2), QLD RTA (10 calendar days) | Blocker |
| 3.3 | Build bond reference number field (tenant + landlord dashboard) | High |
| 3.4 | Post-signing instruction email triggered at `bond_pending` with state-correct authority steps | High |
| 3.5 | QLD/VIC: add RTA/RTBA deep links if available (NSW already has RBO link) | Medium |

**Files:** `api/lib/booking/listingTransactionalEmails.js`, `ListingBondPaymentGuidance.tsx`, `TrustChecklist.tsx` #49.

---

### Stream 4 — AI chat / RAG state routing

**Current:** `api/chat.ts` line 584 hardcodes `'NSW'` for RAG retrieval.

| # | Task | Priority |
|---|------|----------|
| 4.1 | Detect state from property context, user profile, or explicit user selection | High |
| 4.2 | Route to state-scoped knowledge base entries | High |
| 4.3 | Until VIC/QLD KB seeded: disclaim (“I can help with general Quni features; for VIC/QLD tenancy law, check RTBA/RTA or hello@quni.com.au”) | Minimum viable |
| 4.4 | Seed VIC/QLD tenancy law into pgvector (longer term) | Post-launch |

---

### Stream 5 — State disclosure copy pass

| # | Task | Priority |
|---|------|----------|
| 5.1 | Audit booking flow, acceptance emails, and bond guidance for state-correct authority names | Medium |
| 5.2 | Confirm condition-report obligations copy (VIC RTBA, QLD RTA, NSW Fair Trading) | Medium |
| 5.3 | Review `HeadTenantSubletHelper` — NSW/VIC/QLD letters exist; WA/SA/TAS/ACT/NT still TODO (out of scope unless listing there) | Low |

---

### Stream 6 — Per-state transaction gate (recommended until verified)

Until each state passes its E2E gate, consider:

- `platform_config` or `service_tier_state_matrix` flag: `listing_transactions_enabled` per state
- Property form: allow listing creation everywhere; block booking/accept in unverified states with clear copy
- Or: hard-block publish for VIC/QLD until Stream 1/2 complete

**Prevents:** First real VIC booking generating an unverified lease PDF.

---

## Per-state verification gates (Plan 1 exit)

Each state needs its own **G2-style** run before going hot:

```text
[ ] Sample agreement PDF reviewed against prescribed form
[ ] DocuSeal test-mode signing completes (both docs for T2)
[ ] Full test-mode E2E on production origin
[ ] Bond instruction email received with correct authority/deadline
[ ] Mark bond received → confirmed transition works
```

| State | Can start gate now? | Blocked on |
|-------|-------------------|------------|
| NSW | Yes (after Stream 0 NSW signing check) | Signature regression re-verify |
| QLD | After Stream 1.5 | Field GAPs + PDF tests + E2E |
| VIC | After Stream 2.5 | Extraction fidelity + PDF tests + E2E |

---

## Suggested execution order

```text
Week 1
  ├── Bond model decision (Stream 3.1)
  ├── DocuSeal signing verify all three (Stream 0)
  └── NSW re-verify E2E (baseline)

Week 1–2 (parallel)
  ├── QLD: field GAPs + PDF tests + sample review (Stream 1)
  └── VIC: extraction review + PDF tests + sample review (Stream 2)

Week 2
  ├── Bond reference field + instruction email (Stream 3.3–3.4)
  ├── RAG state routing minimum (Stream 4.3)
  └── QLD + VIC production test-mode E2E (Stream 1.6, 2.6)

→ Hand off to Plan 2 per-state G2/G3 and inventory
```

---

## Handoff to Plan 2

Plan 2 steps 5–7 (G2, G3, inventory) are **per-state**. A state cannot go hot until its Plan 1 gate passes.

See [`multi-state-launch-readiness-plan.md`](./multi-state-launch-readiness-plan.md).
