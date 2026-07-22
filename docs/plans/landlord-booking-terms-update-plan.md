# Plan — Landlord-editable booking terms (pre-signing)

**Goal:** One landlord surface and one endpoint to edit all material booking terms before any party signs — rent, bond, lease length, dates, occupants, notes, co-tenant — with fail-closed validation and a single audited diff per save.

**Supersedes:** Standalone `set-lease-term` prompts and (for Listing pre-accept) `LandlordBookingAgreedRentEditor` once this ships.

**Scope:** Listing tier only for v1. Managed bookings stay out of scope (existing `buildRentAgreedOverridePatch` managed/deposit guards remain on the legacy agreed-rent path until a separate decision).

**Co-tenant identity verification:** Deferred. Add/change/remove co-tenant is allowed; identity change sets a **warning flag only** — no hard block on save, regenerate, or signing.

**Last updated:** 11 Jul 2026 (v2 + pre-build amendments)

---

## Pre-build amendments (apply before Stage 1)

1. **`end_date` recompute is conditional** — only when the patch includes `lease_length`, `move_in_date`, or `start_date`. Notes-only, occupant-only, co-tenant-only, or rent/bond-only saves must **not** touch `end_date` (avoids silently shifting day-based apply-time values).
2. **Hide `LandlordBookingAgreedRentEditor` for Listing when terms editor shows** — Listing pre-sign uses `LandlordBookingTermsEditor`. Agreed-rent override remains listing-only at the API (`managed_booking` 400); Managed term edits are a follow-up, not “keep the old editor.”
3. **`reason` required on every save** — ≥3 chars whenever any patch key is present (not only rent/bond). Weak audit trail otherwise for lease length / co-tenant / date changes. UI always shows reason field when editor is visible.
4. **Admin events page** — `AdminServiceTierEvents` renders `event_type` as raw text and builds its filter dropdown from distinct DB values; `'booking_terms_update'` needs no code change (appears in filter after first event). Optional polish: human label in a follow-up.

**Non-issue (confirmed):** `occupant_count > 2` with one named co-tenant (couple + kids) matches apply-time behaviour; not a regression.

---

## Resolved decisions (from review)

| Topic | Decision |
|-------|----------|
| UI placement | **New** `LandlordBookingTermsEditor` on `LandlordBookingReviewPage` — **not** inside shared `BookingLeasePanel` (students use that panel; pre-accept has `state === 'none'`). |
| Bond patch shape | API patch key **`bondOverride`** `{ enabled: boolean, weeks?: number }` — **not** raw `bond_amount`. Bond AUD is always server-derived. |
| Rent/bond at `bond_pending` | Endpoint owns status guard (3 statuses). Rent/bond slice **must not** call `buildRentAgreedOverridePatch` status check — use extracted **`buildRentBondPatchSlice`** (new export in `rentAgreedOverride.js`) or equivalent inline using existing parsers + `recomputeBondForAgreedRent` / `resolveAcceptanceBondOverrideAud`. |
| `end_date` formula | **Weeks-based** (13 / 26 / 52 / 104), matching `nswOccupancy.ts` generators. Recompute **only** when patch includes `lease_length`, `move_in_date`, or `start_date`. When recomputed, may differ from apply-time day-based values — intentional on explicit date/length edit. |
| `move_in_date` / `start_date` | When either changes, patch **both** to the same ISO date (apply-time convention). |
| `housemates_count` | Recompute via `housematesCountFromOccupantCount(occupant_count)` on every `occupant_count` change. |
| Co-tenant validation | **Strict:** reuse `parseCoTenantFromBody` from `occupancyBooking.js` (phone + DOB required), not lenient `parseCoTenantFromBooking`. |
| `lease_length` allowlist | `'3 months'`, `'6 months'`, `'12 months'`, `'2 years'`, `'Flexible'` (RTA generators already map `'2 years'` → 104 weeks). |
| Signature guard (API) | Same doc resolution as `lease-state.ts`: prefer `document_type = 'residential_tenancy'`, else `'lease'`. Reject 409 if **any** of `landlord_signed_at`, `student_signed_at`, `co_tenant_signed_at` is set. |
| Signature guard (UI) | Extend **`/api/documents/lease-state`** response with `any_party_signed: boolean` (computed server-side from the three timestamps). Editor hidden when true or booking status outside allowlist. |
| Audit | Insert **`service_tier_events`** with `event_type: 'booking_terms_update'`. Mirror revert-on-audit-failure from `booking-set-agreed-rent.ts`. **No SHA-256 table for v1** (architecture note was aspirational; rent override does not hash either). |
| `reason` | **Required** (≥3 chars) on every save that includes any patch key. |
| After save | Do **not** auto-regenerate. Show notice: regenerate to reissue PDF/signing links. Bump `leasePanelRefreshKey` on review page. |
| `occupant_count` + pricing | v1: allow `occupant_count` edit with consistency rules only. **Do not** auto-recompute `weekly_rent` / `rent_breakdown` (document as follow-up if couple surcharge drift matters). |
| Regenerate | Unchanged — listing `bond_pending` only via existing `BookingLeasePanel` control. |

---

## Architecture

```
LandlordBookingReviewPage
  └── LandlordBookingTermsEditor  ──POST──►  /api/booking-update-terms
         (listing, pre-sign statuses)              │
                                                   ├── auth: landlord owns booking
                                                   ├── status ∈ allowlist
                                                   ├── no signatures on lease doc
                                                   ├── buildBookingTermsPatch (async)
                                                   ├── UPDATE bookings
                                                   ├── SYNC tenancies.start_date/end_date if row exists
                                                   └── INSERT service_tier_events (booking_terms_update)
```

**Fail-closed allowlist** — only these patch keys honored; unknown keys → 400:

| Key | Notes |
|-----|--------|
| `weekly_rent` | `parseWeeklyRentAud`; apply-rent cap; updates `rent_breakdown` override fields via rent/bond slice |
| `bondOverride` | `parseBondOverrideFromRequest` |
| `lease_length` | Allowlist tokens; recomputes `end_date` **when this key is in patch** |
| `move_in_date` | ISO date; mirrors `start_date`; recomputes `end_date` **when this key is in patch** |
| `start_date` | ISO date; mirrors `move_in_date`; recomputes `end_date` **when this key is in patch** |
| `occupant_count` | int 1–10; enforces co-tenant coupling; updates `housemates_count` |
| `notes` | string, trimmed, max 4000 |
| `co_tenant` | `null` → clear + `occupant_count = 1`; object → strict parse + email distinct from primary |

**Rejected:** status, service tier, legal names, ids, stripe fields, signing state, doc paths, raw `bond_amount`.

---

## Coupling rules

1. **`co_tenant: null`** → set `co_tenant = null`, `occupant_count = 1`, `housemates_count = 0`.
2. **`co_tenant: object`** (valid) → `occupant_count = max(current, 2)`, `housemates_count = housematesCountFromOccupantCount(occupant_count)`; email ≠ primary (`coTenantEmailDistinctFromPrimary`).
3. **Identity change** (name or email differs from current jsonb) → set `changes.co_tenant_unverified = true` (response only; not a DB column).
4. **Consistency (bidirectional):** `(occupant_count >= 2) ⇔ (valid co_tenant present)`. Patches that violate after merge → 400.
5. **`occupant_count: 1` alone** with existing co-tenant → treat as co-tenant removal (same as `co_tenant: null`) OR reject with clear error — **implement as auto-clear co-tenant**.

---

## Staged execution (4 commits, do not push)

Run stages in order. After each stage: `npx tsc -b --noEmit` must pass.

---

### Stage 1 — Shared lease end-date helper + rent/bond slice refactor

**Commit message:** `Extract lease end-date helper and rent/bond patch slice for term updates`

**CREATE**

- `api/lib/booking/leaseEndDate.js`
- `api/lib/booking/leaseEndDate.d.ts`

**EDIT**

- `api/lib/booking/rentAgreedOverride.js` — add export:

```js
/**
 * Rent/bond patch slice without booking-status guard.
 * Caller (booking-update-terms) validates status + signatures.
 * @returns same shape as buildRentAgreedOverridePatch success branch
 */
export async function buildRentBondPatchSlice(booking, property, agreedWeeklyRentAud, reason, landlordProfileId, bondOverride = null)
```

Implement by extracting the body of `buildRentAgreedOverridePatch` after the status check (or call shared inner function). Keep `buildRentAgreedOverridePatch` calling status check then inner.

**`leaseEndDate.js` exports**

- `ALLOWED_LEASE_TERMS = ['3 months','6 months','12 months','2 years','Flexible']`
- `leaseEndDateFromMoveIn(moveInIso, leaseLength)` — weeks mapping identical to `nswOccupancy.ts` (13/26/52/104; default 52 for unknown non-Flexible; `Flexible` → null)
- `isPeriodicLeaseLength(leaseLength)` → true for `'Flexible'`

**Optional follow in same commit (recommended):** replace duplicated local `leaseEndDateFromMoveIn` in `nswOccupancy.ts` with import from `leaseEndDate.js` (one generator only, to prove import path works). Other generators can stay duplicated for now.

**Tests:** add `api/lib/booking/leaseEndDate.test.ts` (smoke: 3/6/12/Flexible/2 years).

**Stage only:** `leaseEndDate.*`, `rentAgreedOverride.js`, (+ optional `nswOccupancy.ts`, test file).

---

### Stage 2 — Fail-closed patch builder

**Commit message:** `Add fail-closed allowlist for landlord booking-term edits`

**CREATE**

- `api/lib/booking/bookingTermsUpdate.js`
- `api/lib/booking/bookingTermsUpdate.d.ts`

**IMPORTS (reuse, do not reimplement)**

- `leaseEndDate.js` — `ALLOWED_LEASE_TERMS`, `leaseEndDateFromMoveIn`, `isPeriodicLeaseLength`
- `rentAgreedOverride.js` — `parseWeeklyRentAud`, `parseBondOverrideFromRequest`, `buildRentBondPatchSlice`
- `occupancyBooking.js` — `parseCoTenantFromBody`, `housematesCountFromOccupantCount`
- `coTenantSigning.js` — `coTenantEmailDistinctFromPrimary`

**EXPORT**

```js
/**
 * @returns {Promise<{ patch: object, changes: object, errors: string[], co_tenant_unverified?: boolean }>}
 */
export async function buildBookingTermsPatch(currentBooking, patch, context)
```

**`context`:** `{ property, primaryTenantEmail, landlordProfileId, reason }`

**Behavior**

- Fail-closed on patch keys.
- `weekly_rent` / `bondOverride` → `buildRentBondPatchSlice` (only when those keys present).
- **Only if patch contains `lease_length`, `move_in_date`, or `start_date`:** recompute `end_date` (weeks formula); periodic → `end_date: null`; sync `tenancies` dates in endpoint.
- Date change → set both `move_in_date` and `start_date` to the new value.
- Patches without those keys → leave `end_date` unchanged.
- `occupant_count` → clamp 1–10; sync `housemates_count`; enforce coupling.
- `co_tenant` → strict parse; distinct email; unverified flag on identity change.
- `changes` — flat old/new per field for audit metadata.
- If no effective changes after merge → `errors: ['no_changes']`.

**Tests:** `api/lib/booking/bookingTermsUpdate.test.ts` — unknown key, co-tenant coupling, end_date recompute, bondOverride-only, co_tenant_unverified flag.

**Stage only:** `bookingTermsUpdate.*`, test file.

---

### Stage 3 — Endpoint

**Commit message:** `Add landlord booking-terms update endpoint (pre-signing, audited)`

**CREATE**

- `api/booking-update-terms.ts`

**EDIT**

- `vercel.json` — add `"api/booking-update-terms.ts": { "maxDuration": 30 }`

**POST body:** `{ bookingId: string, patch: object, reason?: string }`

**Auth / guards** (mirror `booking-set-agreed-rent.ts` CORS + Bearer → landlord profile → `booking.landlord_id`)

**Allowed statuses:** `pending_confirmation`, `awaiting_info`, `bond_pending`

**Listing only:** `service_tier_at_request === 'listing'` OR (`service_tier_final === 'listing'` and status is `bond_pending`) — reject managed with 400.

**Signature guard:** load tenancy → load lease doc (`residential_tenancy` preferred, else `lease`) → 409 if any signed_at set.

**Booking select:** include fields needed for patch builder + `rent_breakdown`, `properties(bond, bond_weeks, state, property_type, is_registered_rooming_house)`, join student email for co-tenant check.

**Reason validation:** require `reason` length 3–2000 whenever patch is non-empty.

**Flow:** `buildBookingTermsPatch` → 400 on errors → update `bookings` with optimistic status guard → sync `tenancies` dates if exists → audit event → `{ ok: true, changes, co_tenant_unverified? }`.

**Audit helper** (inline or `insertBookingTermsUpdateEvent` in `bookingTermsUpdate.js`):

```js
admin.from('service_tier_events').insert({
  event_type: 'booking_terms_update',
  booking_id, property_id, landlord_id, student_id,
  service_tier: 'listing',
  metadata: { ...changes, reason, actor_landlord_id, co_tenant_unverified, recorded_at }
})
```

On audit failure: revert booking row (same fields as patch) → 500 `audit_failed`.

**Stage only:** `booking-update-terms.ts`, `vercel.json`.

---

### Stage 4 — Lease-state flag + landlord UI

**Commit message:** `Add landlord edit-booking-terms panel on review page`

**EDIT**

- `api/documents/lease-state.ts` — add to JSON response:

```js
any_party_signed: Boolean(doc.landlord_signed_at || doc.student_signed_at || doc.co_tenant_signed_at)
```

When no doc / no tenancy: `any_party_signed: false`.

**CREATE**

- `src/components/landlord/LandlordBookingTermsEditor.tsx`
- `src/hooks/useLandlordBookingTermsEditor.ts` (optional — only if component would exceed ~250 lines)

**EDIT**

- `src/pages/landlord/LandlordBookingReviewPage.tsx`:
  - Import and render `LandlordBookingTermsEditor` for listing bookings in `pending_confirmation | awaiting_info | bond_pending`.
  - Pass booking fields + `onSaved={() => { reload(); setLeasePanelRefreshKey(k => k+1) }}`.
  - **Hide** `LandlordBookingAgreedRentEditor` when listing tier **and** new terms editor is shown (same statuses). **Managed:** Terms rail shows no Edit (API rejects agreed-rent override); use property/room rent for changes.

**Do NOT edit** `BookingLeasePanel.tsx` except optionally document in comment — regenerate control stays there.

**Editor behavior**

- Form fields: weekly rent, bond override (checkbox + weeks, mirror agreed-rent editor), lease length dropdown, move-in date, occupant count, notes, co-tenant block (add/remove; name, email, phone, DOB).
- Enable when: listing tier + allowed status + `!any_party_signed` (fetch lease-state once on mount / after save).
- Save: POST changed keys only to `/api/booking-update-terms`.
- Success notice (exact copy): *"Terms updated — click Regenerate agreement to reissue the PDF and signing links to all parties. The previous draft is now void."*
- Non-blocking warning if `co_tenant_unverified`.
- Surface 400/403/409/500 errors inline.

**Stage only:** `lease-state.ts`, `LandlordBookingTermsEditor.tsx`, hook if created, `LandlordBookingReviewPage.tsx`.

---

## Verification checklist (run after Stage 4)

- [x] `npx tsc -b --noEmit` (CI + local)
- [x] `npx vitest run` booking-terms unit suite (CI; includes `bookingTermsUpdate` / `leaseEndDate` / endpoint guards)
- [x] Unknown patch key → 400 (`api/booking-update-terms.test.ts`)
- [x] Reason missing or under 3 chars → 400 (`api/booking-update-terms.test.ts`; also prod: "Tenant request")
- [x] Managed booking → 400 (`api/booking-update-terms.test.ts`)
- [x] Status outside allowed set → 409 (`api/booking-update-terms.test.ts`)
- [x] Edit blocked when any party has signed (`landlord_signed_at` / `student_signed_at` / `co_tenant_signed_at`) → 409 (`api/booking-update-terms.test.ts`)
- [x] Edit allowed at `bond_pending` when unsigned (prod: Sahil booking)
- [x] Edit allowed at `pending_confirmation` with no tenancy doc → 200 (`api/booking-update-terms.test.ts`)
- [x] `co_tenant: null` → `occupant_count = 1`, `housemates_count = 0` (builder + endpoint)
- [x] Co-tenant email = primary email → 400 (builder + endpoint)
- [x] `lease_length: 'Flexible'` → `end_date` null on booking + tenancy sync (endpoint)
- [x] Notes-only save → `end_date` unchanged (builder + endpoint)
- [x] Conditional `end_date` recompute on lease-length change (prod: 6 months → 3 months, 2027-01-16 → 2026-10-16; only those fields)
- [x] Audit row in `booking_events` with `event_type = 'booking.terms_updated'` (endpoint tests + prod path; STE demoted)
- [x] Regenerate agreement reissues DocuSeal submission (prod: 164 → 165)
- [x] Student dashboard `BookingLeasePanel` — no edit form visible (`landlordBookingTermsEditorPrivilege.test.ts`)

### Still manual (UI / product smoke)

- [x] Managed booking review → agreed-rent editor (closed 2026-07-22): `booking-set-agreed-rent` returns `managed_booking` 400; Terms rail uses `resolveBookingReviewTermsEditorMode` so Managed gets **no** Edit / listing terms editor. Full Managed term edits remain a follow-up.
- [ ] Full landlord smoke: edit terms → Regenerate agreement → all parties sign via live DocuSeal webhooks (beyond Sahil regenerate + manual reconcile)

---

## Agent runbook (when user says "run the booking terms plan")

1. Read this file: `docs/plans/landlord-booking-terms-update-plan.md`
2. Execute **Stage 1 → 2 → 3 → 4** sequentially; one commit per stage; **do not push** unless user asks
3. After Stage 4, run verification checklist
4. Report: files changed, any deviations, manual QA steps for Rob (edit terms → regenerate → sign)

---

## Follow-ups (out of v1 scope)

- Auto-recompute `weekly_rent` / `rent_breakdown` when `occupant_count` changes (couple surcharge)
- Extract `leaseEndDateFromMoveIn` import across all generators (dedupe 7 copies)
- Align apply-time `end_date` (days) with weeks formula at apply — separate migration decision
- Retire `/api/booking-set-agreed-rent` once all callers migrated
- Co-tenant identity verification workstream (hard gate at signing)
- Managed tier term edits
- SHA-256 hashed compliance row if legal/compliance requires it later

---

## Stage prompts (copy-paste ready)

### Stage 1 prompt

```
Read docs/plans/landlord-booking-terms-update-plan.md Stage 1 only.
CREATE api/lib/booking/leaseEndDate.js (+ .d.ts) with ALLOWED_LEASE_TERMS, leaseEndDateFromMoveIn, isPeriodicLeaseLength per plan.
EDIT api/lib/booking/rentAgreedOverride.js — extract buildRentBondPatchSlice (no status guard); keep buildRentAgreedOverridePatch behavior unchanged.
Optionally import leaseEndDate in nswOccupancy.ts instead of local copy.
Add api/lib/booking/leaseEndDate.test.ts.
npx tsc -b --noEmit && vitest run on new tests.
Commit stage 1 files only. Do not push.
```

### Stage 2 prompt

```
Read docs/plans/landlord-booking-terms-update-plan.md Stage 2 only.
CREATE api/lib/booking/bookingTermsUpdate.js (+ .d.ts) — async buildBookingTermsPatch per plan (strict co-tenant, bondOverride not bond_amount, coupling rules).
Add bookingTermsUpdate.test.ts.
npx tsc -b --noEmit && vitest run api/lib/booking/bookingTermsUpdate.test.ts.
Commit stage 2 files only. Do not push.
```

### Stage 3 prompt

```
Read docs/plans/landlord-booking-terms-update-plan.md Stage 3 only.
CREATE api/booking-update-terms.ts per plan (listing-only, 3 statuses, signature guard, audit + revert).
EDIT vercel.json maxDuration entry.
npx tsc -b --noEmit.
Commit stage 3 files only. Do not push.
```

### Stage 4 prompt

```
Read docs/plans/landlord-booking-terms-update-plan.md Stage 4 only.
EDIT api/documents/lease-state.ts — add any_party_signed.
CREATE src/components/landlord/LandlordBookingTermsEditor.tsx (+ hook if needed).
EDIT LandlordBookingReviewPage.tsx — mount editor, hide LandlordBookingAgreedRentEditor when editor shown.
Do NOT add edit UI to BookingLeasePanel.
npx tsc -b --noEmit.
Commit stage 4 files only. Do not push.
```
