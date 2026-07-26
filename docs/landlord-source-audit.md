# Landlord knowledge source audit

**Status:** Read-only inventory. No guide content authored here.  
**Date of audit:** 26 July 2026  
**Scope:** What this repository already contains that could support eight landlord “authority” questions (NSW / QLD focus).  
**Method:** Search and quote of repo sources only. No external tenancy-law fill-in.

---

## Inventory snapshot (where we looked)

### `scripts/knowledgeData.json` (RAG seed)

| Category | Count | Rough nature |
| --- | ---: | --- |
| `tenancy_law` | 20 | Mostly NSW residential-tenancy summaries; **1** QLD boarder/lodger bond entry |
| `platform_policy` | 19 | Fees, Stripe, verification, document routing, no-bond Listing flow, feature inventory sync |
| `disclaimer` | 1 | AI / legal disclaimer |

- **NSW `tenancy_law`:** 19 entries (bond, entry, repairs, notices, pets, condition reports, smoke alarms, sub-letting, etc.).
- **QLD `tenancy_law`:** 1 entry (`QLD: boarder/lodger bond and RTA lodgement`).
- **Do not assume** this file is a complete tenancy-law corpus. Platform chunks describe *our* flows and document matrix; they are not a substitute for primary legislation.

Runtime store: Supabase `knowledge_base` (see `docs/ai-knowledge-sync.md`). This audit reports the seed file only.

### Tenancy agreement packages (routing)

Single router: `api/lib/resolveTenancyPackage.ts`.

| Listing shape | NSW | QLD |
| --- | --- | --- |
| `private_room_landlord_on_site` (not rooming) | **T1** `nsw-occupancy` — Licence to Occupy | **T1** `qld-occupancy` — Licence to Occupy |
| `private_room_landlord_off_site` / `entire_property` / `shared_room` (not rooming) | **T2** `nsw-ft6600` — FT6600 + Quni addendum | **T2** `qld-form18a` — Form 18a + Quni addendum |
| Registered rooming house (`is_registered_rooming_house`) | **T3 unsupported** (deferred) | **T3 unsupported** (deferred) |

Sample PDFs: `public/agreement-samples/manifest.json` (generated 2026-06-09). Official PDF refs under `docs/nsw/`, `docs/qld/`.

### Listing-form compliance fields

| Field / flag | What it encodes | When it triggers |
| --- | --- | --- |
| NSW FT6600 compliance block (`smoke_alarm_*`, `water_usage_charged_separately`, `electricity_embedded_network`, `gas_embedded_network`, `strata_oc_responsible_for_alarms`, `strata_bylaws_applicable`) | Schedule answers for prescribed FT6600; accept/generate gate | UI when `state === 'NSW'`; required before accept/lease gen (`api/lib/documents/propertyFt6600Compliance.ts`, `LandlordPropertyFt6600ComplianceFields.tsx`) |
| QLD Form 18a utilities / water | Items 13–15 via `resolvePropertyUtilities` | QLD residential path; see `docs/form18a-field-mapping.md` |
| `is_registered_rooming_house` + registration number | Product flag for T3; **T3 not supported** | Conflict if on-site + rooming (`landlordAccommodationChoice.ts`); off-site + rooming → unsupported package |
| `rooms_rented_to_residents` | QLD on-site s 43 room-count declaration (max **3** rooms in product validation) | QLD `private_room_landlord_on_site` (`src/lib/tenancy/qldBoarderLodger.ts`) |
| `max_occupants` | Listing capacity / Form 18a Item 16 mapping (`housemates_count + 1` in field map) | Product field (cap 10); **not** a statutory 4-vs-5 boarding-house test |
| `house_rules` + `property_house_rules` / `house_rules_ref` | Free text + structured tags into agreements/addenda | Landlord listing form |

**Form 1 (VIC)** exists in generators and samples; outside the eight NSW/QLD guide questions except as parallel inventory.

### Bond assumptions in code (per state / tier)

| Path | Who holds / lodges (as encoded) | Key files |
| --- | --- | --- |
| NSW T1 | Landlord-held; `schemeApplies: false` | `api/lib/tenancy/rules/nsw.ts`, NSW occupancy bond section |
| NSW T2 | Scheme: NSW Fair Trading / RBO; max 4 weeks; lodge in **10 business days**; receipt days 15 | `nsw.ts`, `bondCopy.ts`, `listingBondPaymentCopy.ts` |
| QLD T1 | Scheme still applies: RTA; max 4 weeks; **10 calendar days**; comment: “unlike NSW T1” | `api/lib/tenancy/rules/qld.ts`, `qld/occupancyContent.ts` |
| QLD T2 | Same RTA scheme as T1 bond rules | `qld.ts` |
| Platform | “Quni does not hold bond money for any tenancy” | `src/lib/bondPublicCopy.ts` |

---

## Question-by-question

### 1. Can I rent out a spare room in my own home — and how is that different from letting a whole property?

| | |
| --- | --- |
| **Depth** | `partial` (product classification + agreement framing; not a full “when is this lawful” guide) |
| **Jurisdiction** | both (NSW + QLD paths exist; VIC also) |
| **Currency risk** | Occupancy PDFs marked “Subject to final legal review”; NSW content file header says “lawyer-review draft” |

**Sources found**

- `src/lib/landlordAccommodationChoice.ts` — UI cards: “A room in my home” = “You live on site (boarder or lodger style)” vs whole house / off-site private room / shared room.
- `api/lib/resolveTenancyPackage.ts` — on-site → T1 occupancy; entire / off-site room / shared (non-rooming) → T2 prescribed residential form.
- `src/lib/documents/nsw/occupancyContent.ts`: “It is not a residential tenancy agreement under the Residential Tenancies Act 2010 (NSW).” / “The resident is not granted exclusive possession…”
- `src/lib/documents/qld/occupancyContent.ts`: “It is not a residential tenancy agreement (Form 18a) and is not a rooming accommodation agreement (Form R18)…”
- Knowledge `platform_policy` “Quni tenancy documents by property type and state”: “On-site room with landlord living on premises is often T1… Off-site room, entire property, or shared room without rooming-house registration is often T2…”
- FAQ `BOND_FAQ_HOSTED_VS_PRIVATE` (`src/lib/bondPublicCopy.ts`): hosted = owner on-site; private rooms = standard residential tenancies (bond focus, not full spare-room legality).
- Existing public guide `content/guides/can-a-landlord-refuse-international-students-australia/article.md` briefly notes live-in landlord / shared-home discrimination exception — not a spare-room how-to.

**Honest gap:** No landlord-facing source that walks “can I / should I / when does it stop being a boarder arrangement” beyond product routing and licence framing.

---

### 2. What agreement applies to a room let, in NSW and in QLD? Which form/template, and how do the two states differ?

| | |
| --- | --- |
| **Depth** | `authoritative` for *which package Quni issues* · `partial` for *why the law requires that form* |
| **Jurisdiction** | both |
| **Currency risk** | FT6600 pinned to Fair Trading form (publication 19 May 2025; PDF updated 18 Dec 2025 — `docs/nsw/ft6600-acroform-mapping.md`). Form 18a pinned to **v23 Sep25** (`docs/form18a-field-mapping.md`, `docs/qld/form-18a-general-tenancy-agreement-v23-sep25.pdf`). |

**Sources found**

| Situation | NSW | QLD |
| --- | --- | --- |
| Room in home (landlord on-site) | T1 Licence to Occupy (`nsw-occupancy`); sample `nsw-t1-occupancy-licence.pdf` | T1 Licence to Occupy (`qld-occupancy`); sample `qld-t1-occupancy-agreement.pdf` |
| Room off-site / whole place / shared (not rooming) | T2 FT6600 + Quni addendum | T2 Form 18a + Quni addendum |
| Registered rooming | Unsupported T3 | Unsupported T3 (Form R18 mentioned only as “not this”) |

- Signing explainer headlines: `api/lib/tenancy/jurisdictionCopy.ts` (“Legally binding NSW occupancy agreement” / “Queensland-compliant tenancy agreement”, etc.).
- QLD T1 nature copy cites RTRA Act, Form 18a, Form R18, s 43, s 32 bond (`qld/occupancyContent.ts`).
- NSW T1 explicitly excludes RTA 2010 and Fair Trading bond lodgement (`nsw/occupancyContent.ts`).
- Knowledge entry “Quni sample agreement previews…” points to `/sample-agreements`.

**State difference the repo itself asserts (bond, not form name):** NSW T1 landlord-held security deposit vs QLD T1 bond still lodged with RTA (`qld.ts` comment; knowledge QLD boarder entry; `bondPublicCopy.ts`).

---

### 3. Who lodges the bond, where does it go, and what happens at the end?

| | |
| --- | --- |
| **Depth** | `authoritative` for platform bond *flow and custody claims*; `partial` for end-of-tenancy dispute mechanics (stronger NSW knowledge than QLD) |
| **Jurisdiction** | both (with sharp NSW/QLD T1 split) |
| **Currency risk** | Lodgement windows hardcoded (10 business vs 10 calendar days); knowledge NSW bond-return “14 days” is undated summary prose |

**Sources found**

- Structured rules: `api/lib/tenancy/rules/nsw.ts`, `qld.ts` (authority names, max bond copy, lodgement days/units, receipt days).
- Public FAQ strings: `BOND_FAQ_HOW_HANDLED`, `BOND_FAQ_HOSTED_VS_PRIVATE`, `BOND_FAQ_NO_BOND_REQUIRED` in `src/lib/bondPublicCopy.ts`.
- Knowledge NSW: “NSW rental bond: maximum amount and lodging with Fair Trading”; “NSW bond return after tenancy ends”; “NSW bond deductions and reasonable wear and tear”.
- Knowledge QLD: boarder bond must go to RTA within 10 calendar days; “no lawful landlord-held bond endpoint in QLD”; Form 2 / RTA Web Services; end via RTA refund process (also in `qld/occupancyContent.ts` bond bullets).
- NSW T1 occupancy: Principal holds security deposit; written receipt; refund / itemised deductions within 14 days of vacate/outgoing report (`nsw/occupancyContent.ts`).
- Listing payment guidance: `api/lib/tenancy/listingBondPaymentCopy.ts` (NSW RBO invite-first vs pay landlord; QLD remittance preference).
- Platform: Quni never custodian (`bondPublicCopy.ts`).

---

### 4. How many people can live there before it becomes something else legally? (occupancy limits, the 4-vs-5 line)

| | |
| --- | --- |
| **Depth** | `partial` for **QLD rooms (s 43 ≤ 3 rooms)** · `nothing` / open legal Q for **NSW 4-vs-5 / Boarding Houses Act** |
| **Jurisdiction** | QLD partial; NSW unclear / open |
| **Currency risk** | QLD product constant `QLD_SECTION_43_MAX_ROOMS_FOR_RESIDENTS = 3` — if legislation guidance changes, code and PDF acknowledgements drift together |

**Sources found**

- **QLD (rooms, not people count):** `src/lib/tenancy/qldBoarderLodger.ts` — “owner-occupied premises with at most this many rooms for residents” = 3; validation error if more; callout that more may be rooming accommodation / Form R18; Quni does not support registered rooming yet. PDF acknowledgement via `qldSection43PdfAcknowledgement`.
- **NSW 5+ residents / boarding house:** `docs/legal/questions-for-jenny.md` **Q-020** (Parked): “For 5+ resident properties: what must the T3 occupancy agreement contain…” under *Boarding Houses Act 2012* — **open**, not answered in-repo.
- Admin Trust checklist #48 (`src/pages/admin/TrustChecklist.tsx`): “Determine whether landlords listing multiple rooms on Quni are operating rooming houses under the Boarding Houses Act 2012…” — process reminder, not a rule statement.
- `max_occupants` is a listing/pricing field (capped at 10), not a statutory 4-vs-5 encoder.
- T3 deferred string in `resolveTenancyPackage.ts`: “Rooming/boarding house (T3) tenancy agreements are not available on the platform yet.”

**Honest gap:** No encoded NSW “4 vs 5 residents” line. Closest artefacts are open counsel questions and a trust checklist item.

---

### 5. What are my obligations once someone moves in — entry notice, repairs, safety compliance, records?

| | |
| --- | --- |
| **Depth** | `partial` (T2 addenda + NSW knowledge; T1 entry rules differ and are contractual) |
| **Jurisdiction** | NSW stronger; QLD thinner outside Form 18a / addendum |
| **Currency risk** | NSW addendum pins “From **19 May 2025**” no-grounds termination change; knowledge entry notice “at least 24 hours” / “once in any 7-day period” is soft summary (“always verify against current Fair Trading materials”) |

**Sources found**

- Knowledge NSW: landlord entry; urgent vs non-urgent repairs; condition reports; smoke alarms; locks/keys; rent payment records.
- NSW T2 addendum `QuniPlatformAddendum.tsx` §11 Inspections & access — table: emergency (no notice); non-urgent repairs 24h; routine inspection 7 days written (max 4/year); show premises 24h (last 14 days); valuation 7 days (max 1/year). Condition report, mould, termination summaries in same addendum.
- QLD T2 addendum: Entry notice **Form 9**, condition Forms **1a / 14a**, RTRA Act references (`QuniPlatformAddendumQld.tsx`).
- NSW FT6600 compliance fields: smoke alarm type/batteries, water usage, embedded networks (listing → prescribed form).
- NSW T1 occupancy: Principal may enter “at reasonable times… without the notice requirements that apply to residential tenancies” (`nsw/occupancyContent.ts`) — product/contract framing, not Fair Trading notice table.
- QLD T1: same “no exclusive possession / no general tenancy notice requirements” pattern (`qld/occupancyContent.ts`); condition reports still described for bond claims.

**Honest gap:** No consolidated landlord obligations guide. Repairs/safety beyond smoke-alarm schedule fields and knowledge snippets are incomplete, especially QLD residential.

---

### 6. What can and can't go in house rules?

| | |
| --- | --- |
| **Depth** | `partial` (defaults + “subordinate to agreement / Act”; not a prohibited-terms checklist) |
| **Jurisdiction** | both (shared default lists; T2 addenda say rules must not displace the Act) |
| **Currency risk** | Default quiet hours / guest night caps are product defaults, not cited to a dated statute |

**Sources found**

- T1 default house rules (guests ≤ 7 nights without consent, quiet hours 10pm–7am, cleaning, smoking, pets, common areas, utilities) — identical lists in `nsw/occupancyContent.ts` and `qld/occupancyContent.ts`.
- Precedence: “House Rules are operational only… subordinate to its operative clauses” (both T1 content files).
- T2 addenda §6: free-text `houseRules` from listing; QLD addendum also states nothing displaces mandatory RTRA provisions; photography / locks language references Act + house rules.
- Listing stores `house_rules` and structured `property_house_rules` (`LandlordPropertyFormPage.tsx`).
- Counsel open items on prohibited additional terms / negligence exemption (NSW) in `docs/legal/questions-for-jenny.md` **Q-002** — relevant to “what can’t go in,” but **unresolved**.

**Honest gap:** No “you cannot put X in house rules” authority list for landlords. Defaults show what we *suggest*, not what law forbids.

---

### 7. Does the property being in a strata scheme change anything? (by-laws, occupancy, subletting)

| | |
| --- | --- |
| **Depth** | `product-only` (checkbox → FT6600 schedule) · effectively **nothing** as landlord education |
| **Jurisdiction** | NSW fields only for strata schedule; QLD Form 18a Item 17 documented as default No/N/A |
| **Currency risk** | FT6600 strata widget names in field maps tied to Dec 2025 template |

**Sources found**

- NSW listing: “Property in strata or community scheme”, owners corporation responsible for smoke alarms, “Strata or community scheme by-laws apply” (`LandlordPropertyFt6600ComplianceFields.tsx`, `propertyFt6600Compliance.ts`).
- FT6600 AcroForm rename map includes `strata_bylaws_*` / owners corp widgets (`docs/nsw/ft6600-renamed-label-verify.json`).
- `docs/form18a-field-mapping.md` Item **17 Body corporate** → “No / N/A” (not captured from landlord).
- Knowledge NSW “sub-letting and assignment” is generic tenant-side; no strata by-law interaction.
- No guide, FAQ, or knowledge chunk explaining strata by-laws, occupancy caps under by-laws, or subletting through an owners corporation.

**Confirm:** strata / by-law *authority content for landlords* — **nothing beyond form checkboxes**. Expectation in the brief was correct.

---

### 8. What do I need to know about tax and declaring room income?

| | |
| --- | --- |
| **Depth** | `nothing` |
| **Jurisdiction** | n/a |
| **Currency risk** | n/a |

**Sources found:** No ATO / rental-income / declare-room-income content in `knowledgeData.json`, FAQ, tenancy packages, or `docs/` (repo search for tax/ATO in docs hit unrelated “generator” / GST platform config only — `BUSINESS_GST_*` in `api/lib/platformConfig.ts` is Quni’s own GST settings, not landlord room-income advice).

---

## FAQ map (`src/lib/faqContent.tsx` + `bondPublicCopy.ts`)

| Guide Q | FAQ touch? | Depth |
| ---: | --- | --- |
| 1 Spare room vs whole property | Partial via “Hosted rooms vs private rentals” | Bond-centric distinction only |
| 2 Which agreement / form | Indirect (“Are tenancy agreements legally binding?” — product) | `product-only` |
| 3 Bond | Yes — “How is bond handled?”, refunds, no-bond | Stronger; still not a full lodgement SOP |
| 4 Occupancy / 4-vs-5 | No | — |
| 5 Ongoing obligations | No | — |
| 6 House rules | No | — |
| 7 Strata | No | — |
| 8 Tax | No | — |

---

## Honest gap list (no real source for a human-written authority guide)

1. **Spare-room legality narrative** — only product routing + licence framing.  
2. **NSW 4-vs-5 / Boarding Houses Act** — open counsel Q + trust checklist; no encoded rule.  
3. **House rules: what is forbidden** — defaults only; prohibited-terms questions open with counsel.  
4. **Strata / by-laws / OC subletting** — form checkboxes only.  
5. **Tax / declaring room income** — nothing.  
6. **QLD residential obligations corpus** — almost no `tenancy_law` knowledge beyond boarder bond (19 NSW vs 1 QLD).  
7. **End-to-end landlord “once they move in” checklist** — fragments only (addenda + NSW knowledge).

---

## Contradictions (repo vs repo)

1. **Hosted-room bond — QLD**  
   - Live FAQ (`BOND_FAQ_HOSTED_VS_PRIVATE` / `BOND_FAQ_HOW_HANDLED`): QLD boarder bond must be lodged with RTA within 10 days.  
   - Stale review copy `docs/faq-comprehensive-review.md`: “bond (if any) is usually held directly by the landlord” for hosted rooms — **no QLD caveat**.  
   - `docs/dual-tier-service-model.md` Listing non-goals: “Bond — you lodge it yourself (NSW Fair Trading for private rooms; **held by you for hosted rooms**)” — again **misses QLD T1 RTA lodgement** encoded in `qld.ts` / occupancy content / knowledge.

2. **QLD T1 “under the RTRA Act” vs “most of the Act does not apply”**  
   - Signing explainer (`jurisdictionCopy.ts`): “Agreement generated under the Residential Tenancies and Rooming Accommodation Act 2008 (Qld)…”  
   - Occupancy nature paragraphs: most of the Act does not apply to the occupation; bond s 32 / s 43 are the highlighted hooks. Soft conflict in public-facing framing.

3. **Knowledge / docs vs product for rooming**  
   - Product refuses T3; Trust checklist #48 still asks operators to determine Boarding Houses Act registration — process debt, not a content contradiction, but easy to misread as “we have a rule.”

---

## Reusable assets (edit, don’t author from scratch)

| Asset | Useful for guide Q | Notes |
| --- | --- | --- |
| `src/lib/tenancy/qldBoarderLodger.ts` + QLD T1 `occupancyContent.ts` | 1, 2, 3, 4 (QLD rooms) | Strongest QLD boarder package; still marked legal-review |
| NSW T1 `occupancyContent.ts` | 1, 2, 3, 5–6 (T1) | Same |
| `bondPublicCopy.ts` + `api/lib/tenancy/rules/{nsw,qld}.ts` + `listingBondPaymentCopy.ts` | 3 | Align dual-tier / faq-review docs to these first |
| NSW knowledge `tenancy_law` chunks (entry, repairs, bond return, smoke alarms, condition reports) | 5, 3 | Treat as draft summaries; many say “check current Fair Trading” |
| Quni platform addenda (NSW/QLD) inspection & condition sections | 5, 6 | T2 only; cite Act, don’t paste as standalone advice |
| `resolveTenancyPackage` truth table + `/sample-agreements` | 2 | Product matrix, not legislation commentary |
| `content/guides/can-a-landlord-refuse-international-students-australia/article.md` | Adjacent only | Discrimination; one live-in-landlord aside |
| `docs/legal/questions-for-jenny.md` | Meta | Shows what counsel has **not** cleared (T3 5+, prohibited terms, etc.) |

---

## Strata / by-law angle (confirmation)

**Confirmed empty as authority content.**  
What exists: NSW FT6600 boolean schedule fields and AcroForm mapping; QLD body corporate item left blank/N/A in the Form 18a field map.  
What does not exist: FAQ, knowledge, occupancy clause, or guide explaining by-laws, strata occupancy limits, or OC consent to sublet/room-let.

---

## Bond handling logic — short cross-cut

```
NSW T1  → landlord-held security deposit (no Fair Trading lodgement)
NSW T2  → landlord/tenant → NSW Fair Trading (RBO); 10 business days
QLD T1  → if bond taken → RTA (not landlord-held); 10 calendar days; bond optional
QLD T2  → RTA; 10 calendar days
All     → Quni not custodian; Listing: money between parties; Managed: conduit ≠ custody
```

Sources: `api/lib/tenancy/rules/*.ts`, `src/lib/bondPublicCopy.ts`, occupancy bond sections, knowledge QLD boarder entry.

---

## Closing

The repo is richest on **document routing**, **bond custody splits (especially NSW T1 vs QLD T1)**, and **NSW T2 residential knowledge snippets**. It is weakest on **strata**, **tax**, **NSW boarding-house thresholds**, and **house-rules legality**. Anything written as a landlord “authority” guide will need human authorship against primary sources; the reusable pieces above are starting drafts and product truth, not verified law.
