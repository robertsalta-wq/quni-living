# Plan — Listing `confirmed` → `active` when bond + signature are both done

**Status:** approved (16 Jul 2026) — Chunk 1 orient first, then implement  
**Last updated:** 16 Jul 2026  
**Related:** PR #55 (bond-card gate); audit of Listing post-`confirmed` lifecycle

### Approved edits (folded in)

1. **Bond-done signal:** Helper guards on `bond_received_by_landlord_at` only (correct today). Encode in `STATUS_LIFECYCLE` that Listing bond-complete ≠ RTA lodgement fields, so an RTA-lodged / no-`bond_received` future path fails the invariant loudly.
2. **Soft-fail visibility:** Keep soft-fail on parent; **warn-log** when helper errors or returns not-advanced for an unexpected reason (stuck row must be observable).
3. **Honest proof:** Chunk 4 references the helper symbol → on main pre-Chunk 2 it fails as **import/compile**, not a map assertion. Describe that accurately in the PR body.
4. **Standing note (not this PR):** Invariant guards missing-writer only — not field-vs-status card gating. Per-tier lifecycle e2e stays queued.

---

## Context — what and why

Listing bookings dead-end at `status = 'confirmed'`. No handler advances a Listing booking to `active`. The DocuSeal full-sign path updates `tenancy_documents` but never `bookings.status`; Managed's `release-deposits` (→ `active`) explicitly excludes Listing. After bond ack + signature, the landlord "Chase the signature" and renter "Sign your agreement" cards stay stuck on `status === 'confirmed'` — same class as the bond-card bug (PR #55).

**Critical ordering:** `confirmListing` starts signing with `deferSigning: false` while status is still `bond_pending`, so the lease is often **fully signed before** bond ack. Completion is therefore **order-independent**: a Listing booking is done when **both** bond is received **and** the lease is fully signed, in either order.

**Live proof:** booking `771acf77` (Sahil Harriram) — lease signed 2026-07-13, bond received 2026-07-16, still stuck at `confirmed`.

**This PR does two things:**

1. **(A)** A shared helper that advances Listing `confirmed` → `active` once bond **and** full signature are both present, called from **both** completion sites.
2. **(B)** A path-aware invariant test guarding the Listing `confirmed → active` edge (not “any writer anywhere”).

---

## Hard rules

- **One concern:** “Listing reaches `active` when bond + signature are both done.” Scope **includes** `markBondReceived` (second call site) — deliberate.
- **No migration:** `active` is already a valid `bookings.status`.
- **Do not touch:** Managed `release-deposits`, `listing_agreement_status` transitions, receipt-email copy/PDF path, per-tier e2e. Separate follow-ups.
- **Status update only for `booking.status_changed`:** do **not** app-emit `booking.status_changed`. The DB trigger (`20260713170000_booking_events_status_spine.sql`) already emits it (`metadata.source: 'trigger'`).
- **Domain event:** **skip in this PR.** Do not add `booking.lease_activated` (or similar) here — it needs a types-registry update and is not required for the fix. Trigger-owned `booking.status_changed` is enough for status history; DocuSeal already emits document fully-signed events. Optional domain event = follow-up if product wants a distinct timeline line.
- **Rob** runs prod writes / backfill and enables any new required GitHub check. Agent does not push migrations or prod SQL.

---

## Chunk 1 — Orient (read-only, hard stop)

**Do not change code.** Report, then continue:

1. **Shared fully-signed path:** Identify where webhook (`api/lib/docuseal.ts` ~851–930) and admin reconcile converge (expect `syncTenancyDocumentFromDocuseal` / equivalent in `reconcileFromDocuseal.ts`). If there is no single shared exit after `fullySigned === true`, name both sites and plan to call the helper from each (or extract one exit first).
2. **“Lease fully signed” predicate** (reuse in the helper — prefer **local DB**, no live DocuSeal fetch):
   - Latest lease / residential-tenancy `tenancy_documents` row for the booking’s tenancy, and
   - `status === 'signed'` **or** equivalent signer completeness (`landlord_signed_at` + `student_signed_at` + co-tenant when required).
   - Align with existing sync/`deriveLeaseDocState` notions; do not invent a third definition.
3. **Every `bookings.status` writer by tier** (Listing vs Managed vs shared), and confirm `booking.status_changed` is trigger-owned (no app emitter of that type today).

Post findings in the PR/session, then continue to Chunk 2.

---

## Chunk 2 — Fix: shared helper + both call sites

**Commit:** `feat(listing): advance to active when bond + signature both complete`

### Helper

Add something like `api/lib/booking/maybeAdvanceListingBookingToActive.ts`:

```ts
maybeAdvanceListingBookingToActive(admin, bookingId, opts?): Promise<
  | { advanced: true; from: 'confirmed'; to: 'active' }
  | { advanced: false; reason: string }
>
```

**Guards (all required, order-independent):**

| Guard | Required |
|---|---|
| `service_tier_final === 'listing'` | yes |
| current `status === 'confirmed'` | yes (not `bond_pending` — mark-bond writes `confirmed` first, then calls helper) |
| `bond_received_by_landlord_at IS NOT NULL` | yes — **sole** Listing bond-done signal this PR (not `rta_bond_*`) |
| lease fully signed (Chunk 1 predicate) | yes |

**Action:** `status → 'active'`. Conditional update `.eq('status', 'confirmed')` so concurrent races stay safe. **Idempotent:** if already `active`, return `{ advanced: false, reason: 'already_active' }` (or equivalent). No app `booking.status_changed`. No new domain event in this PR.

**Failures / soft-fail visibility:** Do not fail the parent webhook / mark-bond success path. **Warn-log** when the helper throws/errors **or** returns not-advanced for an **unexpected** reason (e.g. update matched 0 rows while guards appeared satisfied). Expected no-ops (`wrong_tier`, `missing_bond`, `not_fully_signed`, `already_active`, `wrong_status`) may stay quiet or debug-level — unexpected stuck paths must be observable in logs.

### Call sites (both required)

1. **Shared fully-signed completion path** — after local doc row is persisted as fully signed, so **webhook and admin reconcile both heal**. Prefer one call in the shared sync exit, not only in the webhook email branch after `docuseal.ts` ~851.
2. **End of `runMarkBondReceivedLandlord`** — **after** the successful `bond_pending → confirmed` update (and after setting `bond_received_by_landlord_at`). Covers sign-then-bond (normal Listing order and `771acf77`).

Do **not** call the helper before the booking row is `confirmed` with bond set.

### Unit tests for the helper (same commit)

Not only the Chunk 4 map test — add focused tests:

- Bond set + fully signed + `confirmed` → advances to `active`.
- Missing bond → no-op.
- Not fully signed → no-op.
- Already `active` → no-op.
- Wrong tier → no-op.
- `markBondReceived` happy path with docs already `signed` → final status `active` (not stuck at `confirmed`).

---

## Chunk 3 — Verify UI reachability (verify-only; expect no code)

Confirm existing `active` action-card copy/CTAs for **landlord** and **renter**:

- No blank card body.
- Stepper shows complete (`bookingReviewLayout` already treats `active` as complete).
- No leftover “Chase the signature” / “Sign your agreement” once status is `active`.

**Minimal fix only if something renders blank.** Otherwise note “verified, no code” in the PR description (no empty commit).

---

## Chunk 4 — Guard: path-aware invariant test

**Commit:** `test(bookings): tier-aware status-lifecycle invariant`

Declare a small **per-tier** source of truth (e.g. `STATUS_LIFECYCLE` in `api/lib/booking/` or `src/lib/booking/`), not a global “has any writer” list.

**Assert:**

1. Every status the UI branches on exists in the declared map.
2. Every status a handler writes exists in the map.
3. **For Listing:** a Listing-capable writer is declared for the **`confirmed → active`** edge (this is the assertion that **FAILS on main** and **PASSES after Chunk 2**). Do **not** use “any writer anywhere” — Managed `release-deposits` / reinstate already write `active` and would hide the bug.

**How to make (3) loud and real:** the Listing edge must **reference the helper module/symbol** (import or `toString` of the exported function name registered in the map) so deleting the helper or the call-site registration breaks the test. A comment-only map is too weak.

**Classify `completed`:** terminal / unused — **no writer required**, so the test does not fail forever.

**Bond-done assumption (Edit 1):** Declare Listing bond-complete for the `confirmed → active` edge as **`bond_received_by_landlord_at` only**. Explicitly document that `rta_bond_lodged_at` / `rta_bond_number` are **not** alternate bond-done signals for status advance. Add an assertion that fails loudly if a Listing writer (or the helper’s declared bond predicate) treats RTA lodgement fields as sufficient without `bond_received_by_landlord_at` — so a future RBO-lodged-only flow cannot silently dead-end the same way.

Optional (nice, not required): declare Managed `confirmed → active` via `release-deposits` for documentation symmetry.

---

## Chunk 5 — Close out

- **Prove it (honest):** Chunk 4 references the helper symbol, so against main **without Chunk 2** the test fails as an **import/compile error** (missing module), not as a pure map-assertion failure. That is acceptable proof — state it accurately in the PR body. With Chunk 2 present, the suite compiles and the Listing edge assertions pass.
- `npx tsc --noEmit` passes; full suite green.
- Branch from `origin/main`; commits above (specific `git add` per chunk, single `-m` each; no `git add -A`); open PR; `gh pr merge --auto --squash`.

### PR notes for Rob (not agent work)

1. **Heal already-stuck rows:** `771acf77` (and any other Listing `confirmed` + bond set + lease `signed`) will **not** self-heal — no future sign event. Prefer **admin DocuSeal reconcile** once it calls the helper; else one-off SQL `confirmed → active` for matching rows. Agent does not run prod writes.
2. After merge, add the invariant test (or the CI job that runs it) to **required** status checks if you want it to gate every PR.

---

## Explicitly not in this PR

| Follow-up | Why deferred |
|---|---|
| Receipt copy / PDF mismatch (audit findings 4–5) | Separate product/copy + send-path work |
| Per-tier Playwright full lifecycle e2e | Separate PR; invariant unit test is the CI gate here |
| New `booking.lease_activated` (or similar) domain event | Optional product/timeline polish; trigger covers status |
| Advancing to `completed` | Still unused; out of scope |
| UI gating on lease-state fields instead of status | This PR unsticks cards **via** status; field-based gating is a later hardening |

---

## Adjustments vs prior draft (changelog)

| Prior draft | This plan |
|---|---|
| Global “non-terminal has a writer” invariant | **Listing-specific** `confirmed → active` edge (fails on main for real) |
| Emit `booking.status_changed` from app | **Forbidden** — trigger-owned |
| Optional `booking.lease_activated` in same PR | **Skip this PR** — avoid event-taxonomy churn |
| Webhook-only fully-signed branch | **Shared sync exit** so reconcile heals too |
| markBond out of scope | **In scope** — second call site for sign-then-bond |
| No heal note for Sahil | **Rob note** — reconcile or one-off SQL |
| Invariant-only tests | **Helper + markBondReceived unit tests** in Chunk 2 |

---

## Suggested commit sequence

1. `feat(listing): advance to active when bond + signature both complete` (helper + call sites + helper tests)
2. `test(bookings): tier-aware status-lifecycle invariant` (Chunk 4)
3. Chunk 3: no commit unless a UI blank-card fix is required

---

## Approval gate

**Do not start coding until this plan is approved.** After approval: Chunk 1 orient report first (hard stop), then implement Chunks 2–5.
