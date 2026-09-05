# Queensland classification rule: reconciliation

**Date:** 5 Sep 2026
**Canonical rule:** [`docs/legal/qld-classification-rule.md`](legal/qld-classification-rule.md)
**Scope:** Inventory only. No router, generator, test, or copy changes in this task.

This file lists every existing expression of the Queensland classification test found in the repo (and the June chat half-rule, which is not in git). Each row is judged against the canonical file, not against `resolveTenancyPackage`.

Legend: **correct** / **half-correct** / **wrong**. "Feeds" means what still reads or copies from that expression.

---

## 1. Where the canonical rule lives, and why

Path: **`docs/legal/qld-classification-rule.md`**

Why this path, this turn:

- The instruction was one citable statement, then stop. Briefs, Jenny questions, product copy, and code comments can all point at a stable legal path under `docs/legal/` (same shelf as `questions-for-jenny.md`).
- Wiring a classifier into `resolveTenancyPackage`, or adding tests that would fail today, is a behaviour or test change. Out of scope.
- A TypeScript module with an unused `classifyQldArrangement` would look load-bearing and would not be. Restating the rule in JSDoc next to a function nobody calls is how a second paraphrase appears.

What this file is **not**: it does not make the router fail. See opinion below for the follow-up that would.

---

## 2. The half-rule grep ("4 or more bedrooms" and variants)

Searched the repo (including `*.md`, `*.ts`, `*.tsx`, `*.js`, `*.sql`, `*.json`) for:

- `4 or more bedrooms`
- `4+ bedrooms`
- `four or more`
- `4 or more rooms`
- `more than 3 rooms` / `more than three`
- `4+` as a rooms/bedrooms threshold

**Committed result: the exact phrase is not in the repo.**

It was stated in June chats, not landed as a document:

| Source | Quote | In git? |
|---|---|---|
| [Tenancy agreement compliance audit](475e08e7-ec4b-4374-bd79-9c390474099b) (3 Jun 2026) | Form R18 for residents covered by the Act; s 43 live-in exclusion discussed. Snippet classed rooming vs occupancy. | No |
| [Queensland rental bond regulations](eb9c7f53-b957-4d92-8fc9-63188022a504) (15 Jun 2026) | "4 or More Bedrooms Rooming Accommodation You are legally classified as a Provider. You must use an official Rooming Accommodation Agreement (Form R18)..." | No |

That chat line is wrong twice (no live-in precondition; bedrooms not rooms let to residents). It is still the most likely seed of "QLD off-site room → T2 Form 18a": drop the live-in condition, keep a numeric vibe, then the national on-site/off-site table does the rest.

### Near-misses that **are** in git (threshold without a clean test)

These are the quotable fragments that can rebuild the same table if someone skims them.

| Location | Quote | Verdict | Feeds |
|---|---|---|---|
| `src/pages/landlord/LandlordPropertyFormPage.tsx` (~3774) | "Include this listing and any other **bedrooms** you rent to residents while you live on site (**max 3** for the usual boarder/lodger exemption under s 43)." | **Half-correct.** Live-in precondition is present. Count object is wrong: the field is `rooms_rented_to_residents`, the helper says bedrooms. | Listing form helper under "A room in my home" only. |
| `api/lib/tenancy/rules/ruleMapData.ts` Q4 | Question: "How many people before it becomes something else legally? **(the 4-vs-5 line)**" | **Wrong** as a QLD prompt. 4-vs-5 is the NSW boarding-house registration vibe, not s 43's rooms-let-to-residents. | Admin/rule-map notes. Empty law cells; still a seed. |
| `api/lib/tenancy/rules/ruleMapData.ts` Q4-QLD notes | "Product constant MAX_ROOMS=3 (s43) is product-truth, not a cited rule. **Rooming-accommodation threshold interpretive.**" | **Half-correct.** The constant 3 is the live-in ceiling. Calling it *the* rooming threshold hides the off-site branch (any number). | Same rule map. |
| `docs/plans/nsw-t3-boarding-house-occupancy-agreement-plan.md` D22 | "Do **not** use `properties.max_occupants` as a **5+ house test**" | NSW-only; not a QLD rule. Harmless if left in the NSW plan. | NSW T3 routing notes. |

False positives (not QLD classification): FT6600 "fixed term of more than 3 years"; QLD occupancy "3 days after a written reminder."

---

## 3. Inventory: every expression of the QLD rule

### A. The live router (load-bearing, wrong)

| Location | Quote / behaviour | Verdict | Feeds |
|---|---|---|---|
| `api/lib/resolveTenancyPackage.ts` QLD T2 branch | `private_room_landlord_off_site` **or** `entire_property` **or** `shared_room`, not registered, state QLD → `qld-form18a`, "QLD Form 18a - General Tenancy Agreement" | **Wrong** for off-site room and shared room (rooming). **Correct** for whole premises / self-contained entire place. Same branch, no facilities test. | Confirm, preflight, DocuSeal, explainer, bond copy, samples. |
| Same file, QLD T1 branch | `private_room_landlord_on_site` + not registered → `qld-occupancy` | **Half-correct.** Right family *if* live-in and ≤3 rooms let to residents. Router never reads `rooms_rented_to_residents`. 4+ live-in still gets occupancy. | Occupancy PDF, on-site helper. |
| Same file, QLD T3 branch | off-site + `is_registered_rooming_house` → unsupported, `T3_DEFERRED_REASON` | **Wrong test.** Registration is not an input. Off-site unregistered rooms (the common case) never enter this branch. | Save/accept dead end only if the NSW-shaped card is ticked. |
| `T3_DEFERRED_REASON` | "Rooming/boarding house (T3) tenancy agreements are not available on the platform yet." | **Half-correct** as a product deferral. **Wrong** as a statement of the QLD test (equates rooming with registered T3). | `unsupportedReason` on QLD/VIC registered-rooming rows. |
| Comment on occupancy predicate | "True when resolveTenancyPackage would route to an occupancy agreement (boarder/lodger)." | **Half-correct.** Occupancy PDF kind also covers NSW T3. QLD occupancy is treated as boarder/lodger without the s 43 count. | `bookingUsesOccupancyAgreement`. |

### B. Tests and fixtures that lock the wrong outcome

| Location | Quote / assertion | Verdict | Feeds |
|---|---|---|---|
| `api/lib/resolveTenancyPackage.test.ts` | `it('T2 private_room_landlord_off_site → qld-form18a')` | **Wrong** vs canonical (that listing is rooming). **Correct** vs today's router. | CI. This is the lock. |
| Same file | `it('T3 off_site + rooming house → deferred')` for QLD | **Wrong test.** Treats registration as the QLD rooming trigger. | CI. |
| `api/lib/tenancy/jurisdictionCopy.test.ts` | QLD entire_property explainer cites RTRA Act; "returns null for QLD T3 (still deferred)" | Explainer for entire place: **correct family**. T3-null: **wrong trigger** (registration). | CI. |
| `src/lib/tenancy/qldBoarderLodger.test.ts` | `qldRoomsRentedFieldError(4)` must match `/s 43/` | **Correct** for the live-in branch only. Does not test off-site. | CI for copy helper. |
| `src/pages/admin/AdminStateWorkflows.tsx` `qld-t2` | intent: "Residential tenancy-style (off-site / entire / shared)" | **Wrong** for off-site room and shared. **Correct** for entire. | Admin truth-table UI. |
| Same, `qld-t3` | intent: "Registered rooming house - deferred" | **Wrong test.** | Same. |
| Same, matrix labels | "Tier 2 - Private room", "Tier 3 - Boarding house" | **Wrong** as QLD labels (NSW boarding house). | Same. |
| `public/agreement-samples/manifest.json` | QLD T2 = "General tenancy agreement (Form 18a)". No R18 sample. | **Wrong** if T2 is used to mean off-site room. **Correct** if T2 means entire place. The sample set does not distinguish. | Sample agreements page. |

### C. Property tier and service matrix (state-blind)

| Location | Quote / behaviour | Verdict | Feeds |
|---|---|---|---|
| `src/lib/pricing/index.ts` `resolvePropertyTierFromListing` | on-site → t1; off-site + registered → t3; else t2. **No `state` argument.** | **Wrong** as a QLD legal classifier. Off-site room is t2 everywhere. | Listing/Managed availability, accept UI, fees. |
| `api/lib/serviceTier/qld.ts` | t1/t2 available; else "Quni does not support rooming accommodation **(registered rooming houses)** yet." | **Wrong.** Equates QLD rooming with registered houses. t2 (including Quang) is fully available. | Listing save, accept buttons. |
| `api/lib/booking/termination/types.ts` `isLegalTier2PropertyType` | off-site, entire, shared = "Legal Tier 2 (RTA)" | **Wrong** for QLD rooms (not general tenancy). State-blind. | Termination / hold logic. |
| `isLegalTier1PropertyType` | on-site only | **Half-correct** for QLD if s 43 count also holds. Count not checked. | Same. |

### D. Product copy that states a QLD rule

| Location | Quote | Verdict | Feeds |
|---|---|---|---|
| `src/lib/tenancy/qldBoarderLodger.ts` `qldOnSiteListingCallout` | Live on site, ≤3 rooms let to residents, rooming provisions including Form R18 usually do not apply (s 43). "Quni does not support **registered** rooming accommodation yet." | **Correct** on the live-in ≤3 test. **Half-correct** overall: names registration as the missing rooming path; silent on off-site = rooming at any count. | Listing form, QLD on-site only. **This is the best in-product sentence.** |
| Same, `qldRoomsRentedFieldError` (>3) | On-site, more than 3 rooms, "may be rooming accommodation ... use a **registered rooming house listing** or seek legal advice." | **Half-correct.** Outcome (rooming) is right for live-in 4+. Escape hatch (registered card) is not the QLD test, and that card cannot be saved in QLD. | Same form field. |
| Same, `qldSection43PdfAcknowledgement` | Owner resides on premises; N rooms occupied or available; parties rely on s 43; not Form R18. | **Correct** as a live-in declaration, if N is rooms let to residents and excludes the provider's room. | Occupancy PDF. |
| File header | "Queensland on-site boarder/lodger (T1)" | **Half-correct.** Frames T1 as the whole QLD room story. | Imports. |
| `LandlordPropertyFormPage.tsx` s 43 field | See bedrooms near-miss above. Also: "max 3". | **Half-correct.** | Form. |
| `src/lib/documents/qld/occupancyContent.ts` | Not Form 18a, not Form R18. Live on site, ≤3 rooms, s 43 conditions not met so rooming provisions do not apply. Also: boarder vs tenant vs rooming resident "depends on the facts" including control and shared facilities. | **Correct** on s 43 mechanics. **Half-correct** as a complete QLD rule (on-site only). The "depends on the facts" sentence is extra-statutory caution; do not let it replace the test. | Signed occupancy PDFs. |
| `src/lib/landlordAccommodationChoice.ts` "One private room" | "A bedroom in a share house. You do not live on site. **Not a registered boarding house.**" | **Wrong** as QLD law. Implies off-site share room is the residual (which the router papers as 18a). Registration is irrelevant. | Listing cards, all states. |
| Same, "Rooming house" | "registered boarding house (NSW) or rooming house... you have a registration number." | **Wrong** as QLD test. RSAA 2002 is a separate axis. | Same. |
| Same, "A room in my home" | "You live on site (boarder or lodger style)." | **Half-correct.** Live-in is input 2. Does not mention the 3-room cap. | Same. |
| Same, "Studio (whole place)" | "A self-contained studio the tenant rents in full." | **Correct** mapping to general tenancy *if* it is truly self-contained / whole premises. | Same. |
| Same, off-site studio option | Form helper: "Choose Studio only if you are listing a **self-contained studio room** (uncommon for share houses)." | **Judgement call sitting in copy.** A self-contained unit is general tenancy under the canonical rule. This option lives on the **room** card (`private_room_landlord_off_site`), which the router treats as T2 18a today and which the rule would treat as **rooming** unless we treat that studio as a self-contained unit. | Form. |
| `src/lib/listings.ts` labels | Off-site: "landlord lives elsewhere". On-site: "boarder/lodger arrangement". | Descriptive, not a test. Off-site label does not say 18a. | UI labels. |
| `src/lib/bondPublicCopy.ts` | "Private rooms are **standard residential tenancies**..." Hosted = boarder/lodger. | **Wrong** for QLD off-site private rooms (rooming, not general tenancy). | FAQ / marketing. |
| `api/lib/tenancy/jurisdictionCopy.ts` QLD T2 | "Legally binding Queensland-compliant **tenancy** agreement" + RTRA Act | **Wrong** for off-site rooms. **Correct** for entire place. Keyed by router tier, so it follows the wrong table. | Explainer on review/booking. |
| `api/lib/tenancy/jurisdictionCopy.ts` QLD T1 | "Queensland occupancy agreement" + RTRA Act | **Half-correct** (outside the Act as to the occupation, but RTRA still named; bond is under the Act). | Explainer. |
| QLD addendum `QuniPlatformAddendumQld.tsx` | Form 18a, Form 9, Forms 1a/14a throughout | **Wrong** whenever attached to a rooming arrangement. Correct companion to a real 18a. | Signing package. |
| `api/lib/docuseal.ts` | "Your QLD Form 18a tenancy agreement is ready to sign." | Follows generator id. **Wrong** for rooming listings. | Emails. |
| `LandlordPropertyUtilitiesFields.tsx` | "QLD Form 18a Items 13-15" on all QLD listings | **Wrong** on occupancy and on rooming. | Listing utilities section. |

### E. Docs and briefs

| Location | Quote | Verdict | Feeds |
|---|---|---|---|
| `docs/legal/qld-classification-rule.md` | The test | **Correct.** Canonical. | This reconciliation. |
| `docs/qld-rooming-accommodation-audit.md` | Off-site provider, any rooms, R18; s 43 live-in cap; registration not the QLD test | **Correct** vs canonical. Written 5 Sep 2026 from the same RTA reading. Not a second rule: an audit of the router. Cite the legal file for the test, the audit for "what we do." | Humans. |
| `docs/dual-tier-service-model.md` | "Property tier = legal classification (boarder/lodger / RTA / boarding house). Already implemented via `private_room_landlord_on_site`..." | **Wrong** as QLD law. NSW-shaped tiers. | Strategy docs. |
| `docs/plans/qld-vic-listing-parity-plan.md` | QLD routing `qld-form18a` / `qld-occupancy`; "T3 rooming house stays deferred **in all states**" | **Wrong** as a legal test (rooming = registered T3). Stale on NSW T3 live. Describes the router, not the Act. | Parity work. |
| `docs/plans/nsw-t3-boarding-house-occupancy-agreement-plan.md` | "QLD/VIC T3 stay deferred"; off-site not registered → T2 | Describes NSW router. **Wrong** if used as QLD law. | NSW T3. |
| `docs/form18a-field-mapping.md` | Routing `qld-form18a` | Mechanical 18a map. **Wrong** if used as "this is the QLD room form." | 18a fill. |
| `api/lib/tenancy/rules/qld.ts` header | "Tier 3 (rooming accommodation) is deferred in resolveTenancyPackage, not defined here" | **Half-correct** product status. **Wrong** implication that T3 = QLD rooming. | Bond rules module. |
| `api/lib/tenancy/rules/ruleMapData.ts` Q1-QLD | "Forks by on-site (boarder/lodger, s43) vs off-site." | **Wrong.** Off-site rooms are not the other side of s 43; they are rooming without a count. | Rule map. |
| Q2-QLD notes | "Form 18a v23 Sep25" as the QLD agreement/form answer | **Wrong** as the room-let form. | Same. |
| `docs/feature-inventory.md` | "T3 rooming agreements not available yet"; Form 18a compliance fields by state | Product inventory, not the test. T3 ≠ QLD rooming. | Admin inventory. |
| `docs/ai-matching-criteria-policy.md` | `rooms_rented_to_residents` = "Rooming-house context" | **Half-correct.** Column is s 43 live-in count, not a rooming flag. | Matching policy. |
| `docs/tenant-landlord-matching-data.md` | Same column: "Shared-house / rooming-house context" | **Half-correct.** | Same. |
| `supabase/migrations/20260605150000_property_rooms_rented_to_residents.sql` | "QLD on-site... rooms occupied or available for residents in the home (s 43 RTRA Act). Null when not applicable." | **Correct** for what the column is. Does not state the off-site rule. | DB comment. |
| `api/documents/rtaTypes.ts` | "QLD on-site: rooms occupied/available for residents (s 43 declaration)." | **Correct** as a field note. | Occupancy PDF types. |
| `api/documents/generate-qld-occupancy.ts` | "Queensland boarder/lodger Residential Occupancy Agreement" | Product label. Follows T1 routing. | HTTP entry. |

### F. DB and enums

| Location | What it encodes | Verdict | Feeds |
|---|---|---|---|
| `properties.property_type` | on-site / off-site / entire / shared | Live-in vs not, and whole vs room, **lossy** (see opinion). | Router. |
| `properties.bedrooms` | Bedrooms in the listing/house | **Not** the s 43 count. Must not become the test. | Listing chrome. |
| `properties.rooms_rented_to_residents` | s 43 count, on-site QLD only; null otherwise | **Correct object**, **not fed to the router**, not collected off-site. | Form + column. |
| `properties.is_registered_rooming_house` | NSW-shaped registration flag | **Not an input** to the QLD test. **Is** an input to the router. | T3 branch. |
| `properties.room_type` `studio` on a private-room listing | Self-contained studio *room* | Ambiguous vs "self-contained unit" in the rule. | Form. |
| `properties.university_id` / `campus_id` | Nearest campus for search | **Not** the on-campus provider exclusion. | Browse. |
| `listing_type` `homestay` / `student_house` | Legacy category, listing form sets null | Unused by router. | Old rows possible. |

---

## 4. Size of the contradiction (no fixes)

Load-bearing wrongness is concentrated, not scattered:

1. **One function** (`resolveTenancyPackage`) maps QLD off-site room and shared room to Form 18a.
2. **One test file** asserts that mapping.
3. **One pricing helper** (`resolvePropertyTierFromListing`) makes those listings `t2` with no state.
4. **One service matrix row** then allows Listing and Managed for that `t2`.

Around that: listing cards, bond FAQ, explainers, samples, addendum, DocuSeal, admin scenarios, dual-tier and parity plans, rule-map Q1/Q2/Q4-QLD.

Correct islands: s 43 helper + occupancy PDF + `rooms_rented_to_residents` column comment. All live-in-only. None of them reach the router.

The June "4 or more bedrooms" line is **not** sitting in a markdown someone will paste next week. The **router table** is the surviving half-rule.

---

## 5. Opinion

### Can the router evaluate this rule with data we hold?

**Not as written. The listing form has to change before the router can implement the test faithfully.**

| Canonical input | What we hold | Lossy? |
|---|---|---|
| What is let (whole / self-contained unit vs room with shared facilities) | `property_type` entire vs room/shared, plus `room_type` | **Yes.** Entire house/apartment/studio cards are a decent proxy for general tenancy. "One private room" + studio is the hole: copy allows a self-contained studio *room*, which the rule would call general tenancy, while the same card with shared kitchen is rooming. Shared facilities are not a stored fact. |
| Provider (or agent) lives at the premises | `property_type` on-site vs off-site | **Mostly.** Landlord live-in is captured by the card. **Agent living on site** is not. Head tenant / `lister_role` is not "provider lives here." |
| Rooms occupied by or available to residents (excluding provider's room) | `rooms_rented_to_residents` | **Only on QLD on-site.** Null for Quang. Router does not read it even when set. `bedrooms` is a different number and must stay unused. Off-site does not need the count **for the test**, so Quang's path is evaluable *without* it, if we trust off-site + shared facilities. |
| Registration | `is_registered_rooming_house` | Held, and the router uses it. Canonical rule says **do not**. |
| On-campus university/college exclusion | `campus_id` | **Wrong proxy.** Nearest campus ≠ premises inside campus boundaries provided by the uni or an NFP college. |
| 18a opt-in | nothing | Correct to omit (we do not offer it). Do not infer it from silence. |
| Service level | linen / cleaning flags | Must not route. Fine as later R18 particulars. |

**Practical split:**

- **Off-site + `private_room_landlord_off_site` (single) or `shared_room`:** the router *could* classify as rooming with data we already persist, if we accept the card as "rooms with shared facilities." That is the Quang case. No new field required for a **gate**.
- **Off-site + studio on the room card:** need an explicit "self-contained unit / exclusive possession of a dwelling" vs "room with shared facilities" before the router should choose 18a vs R18. That is a listing-form change.
- **On-site:** we already collect the right count. The router ignores it. Using it is a router change (out of scope here), not a new field.
- **Agent-on-site, on-campus provider, 18a election:** we do not collect these. Do not pretend `campus_id` or `lister_role` answers them.

### Ambiguity in the rule as written (judgement calls; do not hide them in a function)

1. **"Self-contained unit" vs "studio room."** If the studio has its own kitchen and bathroom and is let as the whole dwelling, it is general tenancy even if the owner lives in another dwelling on the land? The rule says whole premises or self-contained unit → 18a, nothing else matters. We need a yes/no on facilities, not `room_type === 'studio'`.
2. **"Provider or their agent" lives at the premises.** We capture owner/lister live-in, not a resident manager. A live-in agent with the owner off-site might be live-in for s 43. Uncollected.
3. **Provider's own room.** The form says include "this listing and any other bedrooms you rent." It does not say "do not count the room you sleep in." If a host counts four let rooms plus their own as four, that is right; if they count three let + their bedroom as four, that is wrong. Copy must say exclude the provider's room.
4. **Control / exclusive possession overlay.** Occupancy PDF says boarder vs tenant vs rooming "depends on the facts." The canonical test is already a facts test (what is let, who lives there, count). Extra "degree of control" should not become a fourth router input without a collected fact.
5. **Granny flat / dual occupancy.** Entire-place card vs room card. If it is a self-contained dwelling, 18a. If it is a bedroom in the main house, rooming (off-site) or s 43 (on-site).
6. **Two rooms, two listings, one house.** Each row will be classified alone. Premises-level count for live-in s 43 must be the house, not the listing. We already ask for house-level `rooms_rented_to_residents` on on-site. Off-site does not need it for the test.
7. **RSAA 2002.** Canonical says it does not affect the *test*. A provider might still need accreditation as a separate compliance matter. Do not overload `is_registered_rooming_house` for that.

I do not think the off-site "one room is enough" limb is ambiguous. Quang is not a judgement call.

### Where the rule should live so it is load-bearing

This markdown is the **citation** target. It is not load-bearing yet.

Next change (not this task): a module such as `api/lib/tenancy/qldClassification.ts` that exports only:

- the three outcomes as a type
- `QLD_SECTION_43_MAX_ROOMS_FOR_RESIDENTS` (move the constant; one number)
- a pure function whose inputs are the three canonical facts (plus explicit "unknown")
- a file comment: "Prose SoT: docs/legal/qld-classification-rule.md. Do not paraphrase."

Then a test file that **only** asserts that function against the canonical table (off-site one room → rooming; entire place → general tenancy; on-site 3 → outside Act; on-site 4 → rooming).

A **second** test, later, that maps `resolveTenancyPackage` QLD cases onto those outcomes. That test should fail until the truth table changes. That is the tripwire. Do not put the legal sentences in the test names ("4 bedrooms"). Name cases by the three inputs.

Until that second test exists, this markdown is a sign on the wall. The router will keep generating 18a.

### Anything in the stated rule I think is wrong

I am not re-trying the RTA. Taking 4 Sep 2026 as given:

- Treating **whole premises / self-contained unit as always general tenancy** matches exclusive possession. I would not dilute that with "unless they call it a room."
- **Off-site + shared facilities = rooming at one room** is the piece the codebase never encoded. I agree the June bedroom line is a mutilated live-in branch.
- **Quni does not offer 18a opt-in** is a product decision sitting inside a legal file. That is right: if it lives only in a backlog, someone will "helpfully" add a landlord checkbox. Keep it in the rule.
- I would flag for counsel, not change the rule here: whether a **resident on-site agent** is "the provider lives at the premises" for s 43, and the **studio-with-own-facilities** edge. Those are the judgement calls above.
- I would **not** use university proximity as an exclusion. You already said off-campus student housing is ordinary rooming. Good. Our `campus_id` would have got that wrong.

---

## 6. Stop line

Canonical file: `docs/legal/qld-classification-rule.md`

This inventory: `docs/qld-rule-reconciliation.md`

No router, test, copy, or card was changed.
