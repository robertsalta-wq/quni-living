# Cursor brief — Listing Extractor: phase 2 (BUILD)

**Repo:** `robertsalta-wq/quni-living` · **Supabase ref:** `flegysnshryzvkwzfclc`
**Read first:** `docs/listing-extractor-audit.md` (the phase-1 audit — the source of truth for every field name below) and `docs/Quni-Decision-Listing-Extractor-2026-07-27.md` (the decision + guardrails).

## What we're building

A **paste-to-list extractor.** On the new-listing flow, a landlord pastes the listing text they already wrote elsewhere (a Facebook post, a Flatmates ad, a Gumtree ad). One server-side AI call reads it and **pre-fills the property form draft** with a per-field confidence signal. The landlord reviews, corrects, and publishes as normal. This makes the Facebook-outreach pitch — "add Quni free in sixty seconds, just paste what you wrote" — actually true.

The audit confirmed nothing like this exists yet (§8), so this is a clean build on top of the existing form.

---

## GUARDRAILS — non-negotiable, verify each before you call this done

1. **Paste, don't scrape.** Input is landlord-pasted text only. Do **not** fetch or parse any external URL server-side. v1 accepts a text blob; no OCR, no URL fetch.
2. **Human commits money & legal fields.** The extractor writes to **form state / `localStorage` (`landlord_property_draft`) only** — never to `properties`, `bookings`, or `tenancy_documents`. Do not insert or update any DB row from the AI route (audit §6). Rent flows through the normal landlord submit + accuracy attestation; contract amounts commit later at booking/accept.
3. **Blank beats a guess.** Any field the paste does not explicitly state is returned `null` and left unset in the form. Do **not** invent a bond, dates, surcharges, or occupant counts. Never emit a default that overrides the form's own defaults.
4. **Never infers tier.** `propertyListingType` (the T1/T2/T3 driver, audit §3) is **always left null** by the extractor. The landlord must actively pick an accommodation card before publish. See Task 0 — this is the audit's headline blocker.

---

## Task 0 — Fix the silent-tier blocker FIRST (audit §3, §4, blocker note)

Today an empty draft defaults `propertyListingType` to `entire_property` (`listingHubDraft.emptyDraftBase`), which is a **silent T2 tier choice**. An extractor-initiated draft must never let that default stand.

- Introduce an explicit **"unset"** accommodation state for extractor-initiated new drafts (e.g. `propertyListingType: null` / a sentinel the form treats as "not yet chosen"), rather than falling back to `entire_property`.
- **Block publish** until the landlord actively selects one of the six accommodation cards (`src/lib/landlordAccommodationChoice.ts`). Surface a clear "Choose how this is let" prompt on the Property-details section when unset.
- Guard the **mobile hub path** too (audit §3): the hub's "Private room" tile defaults to `private_room_landlord_off_site`. An extractor draft must not reach `active` via that default — force the on-site/off-site choice explicitly.
- While here, align the contradictory bond default (audit §7, gap #7): `listingHubDraft.emptyDraftBase` uses `bondWeeks: '4'` but the form/API default is `DEFAULT_BOND_WEEKS = 2`. Make the extractor path leave `bondWeeks` unset so the form's own `2` applies; do not carry `'4'`.

Do this before wiring the extractor — otherwise a pasted listing publishes as T2 by accident.

---

## Task 1 — Server route `api/ai/extract-listing.ts`

Clone the shape of existing AI routes (audit §5). Do not invent new plumbing.

- **Auth:** Bearer + landlord check, copied from `api/ai/generate-description.ts`.
- **Model / client:** `ANTHROPIC_API_KEY` via `api/lib/anthropicModel.ts` (`ANTHROPIC_SONNET_MODEL`); Edge runtime + CORS pattern as the other `api/ai/*` routes.
- **Failure reporting:** `api/lib/reportAiFailure.ts`.
- **Structured output:** follow the prompt-enforced-JSON + parse pattern from `api/ai/suggest-pricing.ts` (`parseSuggestion` / `extractAllJsonObjects`). Return only JSON matching the schema in Task 2; instruct the model to leave unknowns `null`.
- **Body:** `{ text: string }` (the pasted listing). Allowlist the body; reject empty/oversized input.
- **No Supabase writes from this route** (guardrail 2). It returns extracted JSON to the client; the client does the pre-fill.

---

## Task 2 — Extraction JSON schema (mirror `LandlordPropertyDraftV1`)

Return one object. **Every field is `{ value, confidence }` or `null`.** `confidence` is `"high"` (value explicitly stated in the paste) or `"low"` (inferred). Absent → the whole field is `null` (blank beats a guess).

**Extract these (fill form/localStorage only):**

- `title` — string
- `description` — string
- `rentPerWeek` — numeric string (money — form only, never committed here)
- `bedrooms`, `bathrooms` — int strings
- `maxOccupants` — int string (1–10; only if clearly stated)
- `furnished`, `linenSupplied`, `weeklyCleaning` — boolean
- `features` — `string[]` of **feature names** (not IDs). The model matches against the known list: WiFi, Air conditioning, Heating, Washing machine, Dryer, Dishwasher, Parking, Gym access, Swimming pool, Balcony, Garden, Pet friendly, Bills included, Study desk, Near public transport (audit §1 inclusions). Client resolves names → UUIDs (Task 3).
- `parkingAvailable` — boolean
- `address`, `suburb`, `state`, `postcode` — strings (only when stated)
- `leaseLength` — one of `Flexible | 6 months | 12 months | 2 years` (only if clearly stated)
- `availableFrom` — ISO date string (only if a real date is stated)
- `houseRulesText` — free text for the `houseRules` textarea (optional)
- `accommodationHint` — **non-binding** short string only (e.g. "reads like a whole apartment"). Displayed near the accommodation cards to help the landlord choose. It must **NOT** auto-select a card or set `propertyListingType`/`roomType`.

**NEVER extract / always null (leave for the human / state-gated — audit §3, §6, §7):**

- `propertyListingType`, `roomType`, on-site/off-site (tier — Task 0 forces the card)
- `bondWeeks`, `coupleSurchargePerWeek`, `parkingSurchargePerWeek`, `qldBondRemittancePreference`
- `serviceTier`, payout bank details (`property_payout_details`)
- NSW FT6600 compliance fields, QLD/VIC utilities fields
- `images`, all attestations, rooming-house fields (`isRegisteredRoomingHouse`, registration number)
- legacy `listing_type` (Rent/Homestay/Student House — always null on save, audit §1/§6)

Mirror the enums exactly from `src/lib/listings.ts` and `src/lib/landlordAccommodationChoice.ts` so extracted values validate against the same rules the form uses (audit reusable-assets table).

---

## Task 3 — Client: paste UI, pre-fill, confidence, feature resolution

- **Entry point:** on `/landlord/property/new` (the cold-landlord path). Add a "Paste your existing listing" box above/before the blank form. On submit, call `extract-listing`, then patch the draft via the existing bridge `src/lib/listingHubDraft.ts` (`patchLandlordPropertyDraftBasic`, `emptyDraftBase`) and `landlord_property_draft` localStorage (audit §4). Reuse the form's existing autosave — don't add a second persistence path.
- **Reviewable draft with confidence (Kai's condition):** render pre-filled fields with a visible signal — **high = filled + subtle "from your listing" marker; low = filled but flagged for review; null = left blank.** The landlord is confirming, not trusting blindly. Never silently fill and hide.
- **Feature name → UUID resolution (audit gap #4):** match returned `features` names (case-insensitive) against the loaded `features` table; resolve to `selectedFeatureIds`. Show unmatched names as suggestions the landlord can accept or drop — do not silently discard or invent. "Bills included" by name preserves the existing utilities-skip heuristic (`propertyFeatureSignals.ts`).
- **Accommodation stays unset:** per Task 0, do not pre-select a card. Show `accommodationHint` beside the cards as a nudge; require an explicit choice before publish.
- **State-gated blanks:** never pre-fill NSW compliance TriStates, QLD/VIC utilities, or QLD remittance preference (audit §7) — leave them for the landlord to answer.

---

## Task 4 — Tier & money safety checks (make these explicit, not incidental)

- Assert in code/tests that an extractor-initiated draft cannot reach `properties.insert` with `status: 'active'` while `propertyListingType` is unset.
- Assert the AI route performs **zero** Supabase writes.
- Confirm `rentPerWeek` from extraction lands only in form state and still requires the normal submit + accuracy attestation to persist (audit §6).

---

## Task 5 — Tests

- **Unit:** parser against 3–4 realistic pasted samples (a messy Facebook post, a Flatmates ad, a Gumtree ad, and a near-empty blurb). Assert: known fields populate with correct confidence; unstated fields are `null`; `propertyListingType`/`roomType`/`bondWeeks` are never set; feature names map to real IDs.
- **Guardrail tests:** route makes no DB writes; publish blocked while accommodation unset (Task 0); no state-gated field pre-filled.
- **e2e (Playwright, matches existing `e2e/`):** paste → review pre-filled draft → forced accommodation choice → publish succeeds; and paste → attempt publish without choosing accommodation → blocked with the prompt.

---

## Out of scope (v1.1 — do not build now)

- Screenshot / image / OCR input (v1 is text paste only).
- URL fetch of any kind.
- Structured `selectedRules` extraction (house-rule yes/no/approval) — v1 puts rule text into the `houseRules` free-text field only; structured mapping is v1.1.
- Any Anthropic tool-use / JSON-schema API mode — match the existing prompt-enforced-JSON + parse pattern for now (audit §5).

## Acceptance criteria

1. Pasting a real listing pre-fills title, description, rent, beds/baths, inclusions/features, and address fields with visible confidence, in under a few seconds.
2. `propertyListingType` is never set by the extractor; publish is blocked until the landlord picks an accommodation card.
3. The AI route writes nothing to the database; rent/bond commit only through the normal submit/booking paths.
4. Unstated fields are blank, not guessed; no invented bond weeks, dates, or surcharges.
5. Feature names resolve to real IDs; unmatched names are surfaced, not dropped or invented.
6. v1 is text-paste only; tests cover the guardrails above.

*Guardrails recap: paste-not-scrape · human commits money fields · blank beats a guess · never infers tier. If any task conflicts with a guardrail, the guardrail wins — stop and flag it.*
