# Cursor brief — Listing Extractor: source audit (READ-ONLY · no code changes)

**Repo:** `robertsalta-wq/quni-living` · **Supabase ref:** `flegysnshryzvkwzfclc` · **Prod:** quni-living.vercel.app

## Why this brief exists

We are building a **paste-to-list extractor**: a landlord pastes the listing text they already wrote elsewhere (a Facebook accommodation-group post, a Flatmates ad, a Gumtree listing), and an AI call reads it and **pre-fills the Quni property-creation form** — address, rent, room type, available-from, inclusions, description, etc. The landlord reviews, corrects, and publishes. This is the thing that makes our Facebook-outreach pitch ("add a free shelf in sixty seconds — just paste what you wrote") *true* instead of a lie that dies on a blank six-section form.

**This brief is phase 1: the audit. Do NOT write the extractor yet.** Before we wire anything, we need the extractor to map to *real* field names, the *real* draft-save path, and the *real* tier logic — not assumptions. Build on guesses and every extracted value lands in the wrong box.

## Rules for this task

- **READ-ONLY.** Change no application code. Run nothing that mutates data.
- Create **ONE** new file: `docs/listing-extractor-audit.md`. Modify nothing else.
- Report what *actually exists in the code*, with **file paths + line references + short quotes**. Where something doesn't exist, say so plainly — a confirmed "nothing" is a useful finding.

---

## What to report

### 1. The property-creation form — where it lives and every field it holds
Locate the new/edit property form (expected around `/landlord/property/new` and `/landlord/property/edit/:id`). For it, report:

- The component file(s) and the form's state shape / schema (React Hook Form, Zod, Formik, plain state — whatever it is), with the file path.
- **Every field**, grouped by the form's own sections (we believe: Basic info, Property details, Inclusions, Rules, Location, Description, Pricing, Photos). For each field give: **the exact field name/key in code, its type, allowed values / enum options, required vs optional, and any validation** (min/max, regex, format).
- Pay special attention to and report the exact shape of:
  - **Property type** (we believe options are `Rent` / `Homestay` / `Student House`) — exact enum values.
  - **Room type** (Private room / Studio / Whole home, or similar) — exact values.
  - **Pricing block:** `rent per week`, `bond`, `occupants`, couple surcharge, carpark surcharge, lease length, `available from` — exact keys and types.
  - **Inclusions** (furnished, linen, cleaning, features) — is this a fixed checklist, free text, or tags? List the canonical options.
  - **House rules** — the Yes/No/Approval structure and any "platform default" set.
  - **Location** — address fields, and how geocoding + suggested campuses are captured/stored.
  - **Description** — field key and max length.

### 2. The properties data model
Report the Supabase `properties` table (and any related tables: inclusions, rules, photos, campuses). Columns, types, enums, defaults, foreign keys. Map each **form field → DB column** so we can see where an extracted value ultimately lands. Flag any field that is stored differently from how it's entered (e.g. a display string that's persisted as an enum/int).

### 3. Tier logic — CRITICAL
The extractor must **never guess the tier.** Report exactly how Tier 1 (hosted / boarder-lodger) vs Tier 2 (private room / RTA) is determined and stored today:

- The field that drives it (we believe something like `private_room_landlord_on_site` / a "landlord lives on-site" flag). Exact name, type, where it's set in the form, where it's read.
- How tier selection routes downstream (which agreement/template, which bond handling). Just map the wiring — don't change it.
- Confirm: is tier derivable from anything in a pasted listing? (Expected answer: **no** — it depends on whether the landlord lives on-site, which a listing text won't state.) Report whether the form currently forces this choice and where.

### 4. Draft-save path — how a listing is created without publishing
The extractor pre-fills a **draft**, not a live listing. Report:

- How a draft property is created and saved (draft → active state machine), the relevant function(s) and endpoint(s). We saw references to a `duplicate_property_listing` function and a draft indicator — report the real create/save-draft path.
- What the minimum required fields are to persist a draft (so the extractor can save a partial draft with unknowns left blank).
- Where publish (draft → active) happens and what it validates.

### 5. Existing AI plumbing — what we can reuse
We already call the Anthropic API elsewhere (AI **description generator**, AI **price suggestion**, enquiry-reply helpers). Report:

- Where those calls are made (server route / edge function / lib file), how the API key and client are configured, and the request/response pattern used.
- Whether there's an existing **structured-output / JSON-schema** call pattern we can copy, or whether every current call returns free text.
- The extractor should be **one server-side structured-output call** — report the cleanest existing place to add it so we reuse auth/rate-limiting/error handling rather than inventing new plumbing.

### 6. Money & legal commit points
Report where **rent** and **bond** are committed into anything that feeds a contract or payment (booking confirmation, agreement generation, the $99 accept flow). We need to confirm that extracted rent/bond can populate the *form* but that the existing **landlord-confirm step** is what commits them — the extractor must not write straight to any record that feeds money or a legal document.

### 7. State handling (NSW / QLD)
Report how the form/back-end resolves **state-specific** behaviour today — how it knows a property is NSW vs QLD and what that switches (agreement template: NSW FT6600 / Tier 1 occupancy vs QLD Form 18a; bond handling). The extractor needs to know which fields are state-gated so it doesn't pre-fill something the state overrides.

### 8. Any existing import/paste feature
Confirm whether *any* paste/import/parse-a-listing capability already exists (even partial or abandoned). If yes, report it — we'd extend rather than duplicate.

---

## Also report

- **Honest gap list:** which of the form fields have no clean home in the data model, or any field where entry → storage is non-obvious.
- **Contradictions:** anywhere the form, the DB, and the live site disagree about a field, its options, or pricing.
- **Reusable assets:** existing validation schemas, enum definitions, or type files the extractor's JSON schema should mirror exactly (so extracted values validate against the same rules the form uses).
- **The one-line recommendation** at the end: given what you found, the single cleanest place to add the extractor call and pre-fill the form, and any blocker you'd resolve before phase 2 (the build).

## Output

One file: `docs/listing-extractor-audit.md`. No other changes. When done, summarise in the PR/commit message: form location, tier field name, draft-save function, and the reusable AI-call pattern — the four things phase 2 depends on.

---

*Phase 2 (the build — separate brief, not this one) will be: a source-agnostic paste box → one server-side structured-output call returning JSON matching the audited schema, unknowns left null, mapped to the form as a reviewable draft with per-field confidence. Guardrails locked by the team: paste-not-scrape · human commits money fields · blank beats a guess · never infers tier. v1 = text paste only; screenshot/OCR = v1.1.*
