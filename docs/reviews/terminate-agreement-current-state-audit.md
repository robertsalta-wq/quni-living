# Audit — Existing cancellation / termination capability

**Date:** 2026-08-03  
**Branch context:** `docs/lawyer-q022-terminate-plan` (read-only audit; findings only)  
**Spec under review:** `docs/plans/terminate-agreement-capability-plan.md`  
**Purpose:** Map what already exists so the terminate-agreement primitive builds the delta, not duplicates.

---

## Executive verdict

Live writers only cover **pre-tenancy teardown**: landlord decline / cron expiry of applications, and Listing **`bond_pending` → cancelled|expired** (with DocuSeal unwind). There is **no** product path to terminate a **`confirmed` or `active`** agreement (Kim’s case). Cancellation is **service-tier aware** (`listing` vs `managed`), **not legal-tier aware** (`property_type` T1/T2). Bond lodgement is **record-keeping / aspirational**, not an automated RBO/RTA API. `property_group_id` is unused by cancel/availability guards.

---

## 1. Booking cancellation — inventory

### 1.1 Allowed `bookings.status` values (DB check)

From `bookings_status_check` (`supabase/migrations/20260508120000_phase_3_listing_foundation.sql`):

| Status | Role today |
|---|---|
| `pending`, `pending_payment` | Legacy / apply pipeline |
| `pending_confirmation`, `awaiting_info` | Landlord review |
| `bond_pending` | Listing post-accept, bond window |
| `confirmed`, `active` | Stay on foot |
| `completed` | Declared; little runtime use |
| `cancelled`, `declined`, `expired` | Terminal (see `api/lib/booking/terminalBookingStatus.ts`) |
| `payment_failed` | Managed payment failure |

Terminal for “don’t treat agreements as live”: **`cancelled` | `expired` | `declined`**.

### 1.2 Declared lifecycle edges

Canonical declaration: `api/lib/booking/statusLifecycle.ts`.

**Listing edges that end a booking:**

| From → To | Writer |
|---|---|
| `bond_pending` → `cancelled` | `cancelListingBooking` |
| `bond_pending` → `expired` | `expireListingBondPending` |

**Managed declared edges** only list confirm / active advance — decline/expire for Managed exist as handlers/cron but are not fully listed under `managed.edges`.

**Missing for the spec:** any edge from `confirmed` / `active` → terminated/cancelled (or a parallel termination state).

### 1.3 Writers that set terminal booking status

| Outcome | Entry | Core | Who | Source status | Fields set | Side effects |
|---|---|---|---|---|---|---|
| **`cancelled`** | `api/booking-listing-cancel.ts` | `api/lib/booking/cancelListingBooking.ts` | Landlord (JWT) | Only `bond_pending`; requires `service_tier_final === 'listing'` | `status`, `cancelled_at`, `cancelled_by: 'landlord'`, `cancellation_reason` | Stripe Listing-fee refund (if PI); `bond.pending_cancelled_by_landlord` event; cancel emails; **`runUnwindListingAgreementCleanup`** |
| **`declined`** (manual) | `api/refund-booking-deposit.js` | same | Landlord | `pending_confirmation` \| `awaiting_info` | `status`, `declined_at`, notes / `decline_reason` | Deposit PI cancel/refund (Managed); student declined email; **no unwind** |
| **`declined`** (auto) | callers below | `api/lib/booking/declineCompetingBookings.js` | System | Same `property_id`, other rows in `pending_confirmation` \| `awaiting_info` | `status`, `declined_at`, `decline_reason: 'property_taken'` | Competitor deposit refund; “property taken” email; **same property id only**, not `property_group` |
| **`expired`** (response window) | `api/cron/expire-bookings.js` | inline update | Cron | `pending_confirmation` \| `awaiting_info` past `expires_at` | **`status` only** (does **not** set `expired_at`) | Deposit PI cancel/refund; expired email; **no unwind** |
| **`expired`** (bond window) | `api/cron/expire-bookings.js` | `api/lib/booking/expireListingBondPending.ts` | Cron | Listing `bond_pending`, no bond received, past `bond_window_expires_at` | `status`, `expired_at` | Listing-fee refund; `bond.pending_expired`; emails; **unwind**; blocked if lease looks fully signed (`guardSignedLeaseExpiry.ts`) |

Auto-decline callers: `confirmManaged.ts`, `markBondReceived.ts`.

**UI trigger for Listing cancel:** `LandlordBookingReviewPage.tsx` → `POST /api/booking-listing-cancel`.

**Not found:**

- No student-facing booking cancel API.
- No admin writer to `cancelled` / `declined` / `expired` (admin can force other statuses in places; not a terminate path).
- No cancel path for `confirmed` / `active`.
- No `supabase/functions/` cancel/terminate handlers.

### 1.4 Teardown / “property freed”

**Unwind:** `api/lib/booking/unwindListingAgreement.ts` → `runUnwindListingAgreementCleanup`.

Called from Listing **cancel** and Listing **bond-window expire** only (not from pre-accept decline/expire).

Behavior (best-effort, never rolls back booking transition):

1. Load `tenancies` by `booking_id`.
2. For `residential_tenancy` / `lease` docs: DocuSeal **archive** (`DELETE` submission via `docusealArchive.ts`), local doc → `status: 'archived'`, emit `document.voided` (unless regenerate).
3. If tenancy `active` → `status: 'ended'`.
4. Set `bookings.listing_agreement_status = 'voided'`.

**Does not** update `properties.status`. Availability is booking-driven: once the booking leaves `PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES` (`bond_pending` | `confirmed` | `active` in `tenantBookingPipelineStatuses.js`), `propertyAvailability.js` stops blocking new applications on that **property_id**.

### 1.5 Reinstatement (`booking_reinstatement_requests`)

| Piece | Path |
|---|---|
| Schema | `supabase/migrations/20260718080000_booking_reinstatement_requests.sql` |
| Request / confirm / decline / cancel request | `api/lib/booking/reinstatement/*`, HTTP under `api/booking/reinstatement/` |
| Eligibility | Withdrawn booking (`cancelled`/`declined` via helpers) + grace after **`expired_at`** (self-serve grace is expiry-oriented) |
| Effect | Can reinstate booking / DocuSeal reconcile path (`reconcileFromDocuseal.ts`) — **repair**, not terminate |

`declineCancel.ts` updates **`booking_reinstatement_requests.status`**, not `bookings.status`.

---

## 2. Tenancy lifecycle

### 2.1 `tenancies.status`

Check constraint (`20260407125900_tenancies_foundation.sql`): **`active` | `ended` | `disputed`**.

No `terminating` / `terminated` values today.

### 2.2 Create

Rows inserted during **Listing agreement generation** (FT6600 / occupancy / Form 18a / VIC equivalents) with `status: 'active'` if none exists for the booking — e.g. `api/lib/documents/listingTenancyGeneration/nswFt6600.ts`. Not at apply; not on Managed confirm as the primary path.

### 2.3 End

**Only** unwind sets `active` → `ended` (`unwindListingAgreement.ts`). That runs only when Listing cancel/expire tears down **bond_pending** (or regenerate partial archive).

### 2.4 Distinct “terminate tenancy” vs “cancel booking”?

**No.** Ending a tenancy row is a side effect of Listing unwind after booking cancel/expire. There is no separate terminate-tenancy primitive, no mutual surrender, no effective-dated end of an on-foot stay.

When a booking is declined/expired **before** a tenancy row exists, nothing happens to `tenancies`. When unwind runs after cancel/expire with a tenancy, the row is retained with `status: 'ended'` (not deleted).

---

## 3. Bond on cancel / end

| Mechanism | Wired? | On cancel/expire |
|---|---|---|
| `bookings.bond_amount` | Set at apply | Unchanged |
| `bookings.bond_received_by_landlord_at` | Listing landlord ack → advances toward confirmed/active | Unchanged / not cleared |
| `bookings.bond_window_expires_at` | Listing accept | Used by expire cron |
| `bookings.rta_bond_*` | **QLD Listing record-only** API: `api/booking-record-rta-bond.ts` → `runRecordRtaBondLodgement` — **not a confirmation gate** (`statusLifecycle.ts` comment; excluded from advance) | **Not cleared** |
| `public.bonds` | Inserted on **Managed confirm** (`confirmManaged.ts`, `bond_status: 'pending_lodgement'`); admin UI can update lodgement refs | **No cancel/decline/expire writer** |
| In-app RBO / NSW Fair Trading lodgement API | **Not implemented** (product plans say external) | n/a |

**Kim-shaped observation (from terminate plan prod notes):** `bonds` empty + `rta_bond_number` null is consistent with Listing NSW (no RBO API; QLD record fields unused). Bond “lodgement” is **aspirational / external admin**, not a live platform money path. Cancel today refunds the **Listing platform fee** (Stripe), not the rental bond.

---

## 4. Documents / DocuSeal on cancel

| Action | When |
|---|---|
| DocuSeal submission archived (remote DELETE) | Unwind on Listing cancel / bond-window expire |
| `tenancy_documents.status` → `archived` | Same |
| `document.voided` event | Same (not on regenerate-only archive) |
| `listing_agreement_status` → `voided` | Same |
| Pre-accept decline / response-window expire | **No document void** (typically no package yet) |

Signed PDFs are not “un-signed”; the platform archives the submission and marks local rows archived/voided. Best-effort: archive failure emits `document.archive_failed` and does not roll back booking status.

---

## 5. Events

### 5.1 Emitted on cancel / expire / unwind

| Event | Path | Emitter |
|---|---|---|
| `booking.status_changed` | Any status change | DB trigger (`booking_events` status spine migration) |
| `bond.pending_cancelled_by_landlord` | Listing cancel | Direct `recordBookingEvent` in `cancelListingBooking.ts` |
| `bond.pending_expired` | Bond-window expire | Direct `recordBookingEvent` in `expireListingBondPending.ts` |
| `bond.expiry_blocked_signed_lease` | Signed-lease guard | `guardSignedLeaseExpiry.ts` |
| `document.voided` / `document.archive_failed` | Unwind | `emitDocusealDocumentEvents` → `recordBookingEvent` |

### 5.2 Declared but not emitted by cancel writers

Types exist in `api/lib/booking/events/types.ts` for `booking.cancelled`, `booking.expired`, `booking.declined` — **no runtime emitter found** on the cancel/decline/expire writers above (timeline may still show status spine).

### 5.3 Webhooks

DocuSeal webhook (`api/webhooks/docuseal.ts`) drives signature / fully-signed events (`actorType: 'webhook'`). It does **not** cancel bookings. Cancel/expire domain events are **API/cron direct writes**, not webhook-driven.

### 5.4 Spec event not present

`booking.agreement_terminated` — **missing** (plan-only).

---

## 6. Tier awareness

| Axis | Cancel behavior |
|---|---|
| **Service tier** (`listing` vs `managed`) | **Yes.** Listing cancel requires `service_tier_final === 'listing'`. Managed has no `cancelled` edge; uses decline/expire/deposit refund paths. |
| **Legal tier** (`private_room_landlord_on_site` T1 vs off-site / `entire_property` T2) | **No.** Cancel/expire/unwind do not read `property_type` or package generator. Same Listing cancel for all legal packages. |
| Whole-unit Tier-2 routing guard | **Missing** (plan §6). |

---

## 7. Listing / property state & `property_group_id`

| Concern | Behavior |
|---|---|
| Room returns to bookable | **Yes**, indirectly: leaving reserved statuses clears the availability block on that **property_id**. |
| `properties.status` flip | **No** on cancel/unwind. |
| Pause sibling rooms | **Manual** ops only; not part of cancel. |
| `property_group_id` | Used for landlord UI grouping / duplicate rooms; **not** consulted by cancel, availability, or auto-decline. Same student can hold pipelines on sibling rooms in one group. |

---

## 8. Gap analysis vs `terminate-agreement-capability-plan.md`

### §5 Data model

| Spec field / behavior | Status |
|---|---|
| `termination_status` (`active` \| `terminating` \| `terminated`) | **Missing** |
| `termination_type` | **Missing** |
| `termination_effective_date` | **Missing** |
| `termination_reason_note` | **Partial** — `cancellation_reason` exists but only for Listing `bond_pending` cancel |
| `termination_initiated_by` | **Partial** — `cancelled_by` exists (`landlord` only today) |
| `termination_acknowledged_at` | **Missing** |
| `bond_outcome` / `bond_outcome_note` | **Missing** |
| Retain terminated record (no hard delete) | **Already exists** for unwind (`tenancies` → `ended`, docs archived) |
| `booking.agreement_terminated` event | **Missing** |
| `tenancies` → terminated/ended on terminate | **Partial** — `ended` via unwind only for bond_pending teardown, not active-stay terminate |

### §6 Tier-aware bond

| Spec | Status |
|---|---|
| Branch T1 landlord-held vs T2 RBO outcome checklist | **Missing** |
| Cap validation s.159(1) / one bond s.161 on convert | **Missing** (copy exists in tenancy rules; not on terminate) |
| Whole-unit must route T2 / `entire_property` | **Missing** as a terminate/convert guard (package routing for new `entire_property` listings **already exists**) |
| Never move bond money in-app | **Already exists** (platform never lodges RBO) |

### §7 Flow

| Spec step | Status |
|---|---|
| Terminate from **active** agreement | **Missing** |
| Typed reason + effective date | **Missing** |
| Mutual surrender DocuSeal ack | **Missing** (`terminating` until both ack) |
| On effective date → terminated + listing available | **Partial** — availability-on-status-leave exists; effective-dated transition **missing** |
| Bond outcome checklist step | **Missing** |
| Re-enter existing new-agreement booking flow after | **Already exists** as composition target (no convert macro) |

### §8 Overlap guard

| Spec | Status |
|---|---|
| Block same tenant two active agreements on same premises / `property_group` | **Missing** |
| Same-property reserved statuses | **Already exists** (`propertyAvailability` + unique indexes on `property_id`) |
| Auto-decline competitors | **Partial** — same `property_id` only; ignores siblings in group; does not cover `bond_pending` competitors |

---

## 9. Delta to build (short)

1. **Terminate primitive for `confirmed` / `active`** (and Listing stay on foot) — distinct from `bond_pending` cancel; typed reason, effective date, retain history.
2. **Data model** — termination_* + bond_outcome fields (or equivalent) on booking/tenancy; do not overload `cancelled` without clarifying semantics for pre-bond vs mid-tenancy.
3. **Event** — `booking.agreement_terminated` (plus keep status spine).
4. **Mutual surrender** — short DocuSeal acknowledgment; `terminating` → `terminated` on effective date after both parties ack.
5. **Tier-aware bond outcome checklist** — T1 landlord-held vs T2 RBO external; no money movement; handle “never lodged” (Kim).
6. **Overlap guard on `property_group_id`** (and/or same address) before new agreement confirm.
7. **Whole-unit legal routing guard** — new agreement after sole whole-unit occupation must be T2 `entire_property`.
8. **Reuse, don’t duplicate** — unwind patterns (archive docs, end tenancy, void listing_agreement_status), `recordBookingEvent`, availability-via-status, existing new-booking/signing flow; **do not** treat current Listing cancel as the terminate path for Kim.

### Explicit non-goals confirmed by this audit

- In-app RBO API lodgement/refund (still external).
- Multi-room single booking across listing IDs.
- Silent auto-collapse when last room booked.

---

## 10. Key file index

| Area | Paths |
|---|---|
| Listing cancel | `api/booking-listing-cancel.ts`, `api/lib/booking/cancelListingBooking.ts` |
| Bond-window expire | `api/lib/booking/expireListingBondPending.ts`, `api/cron/expire-bookings.js` |
| Decline | `api/refund-booking-deposit.js`, `api/lib/booking/declineCompetingBookings.js` |
| Unwind / teardown | `api/lib/booking/unwindListingAgreement.ts` |
| Lifecycle declaration | `api/lib/booking/statusLifecycle.ts` |
| Terminal statuses | `api/lib/booking/terminalBookingStatus.ts` |
| Availability | `api/lib/booking/tenantBookingPipelineStatuses.js`, `api/lib/booking/propertyAvailability.js` |
| Events | `api/lib/booking/events/types.ts`, `recordBookingEvent.js` |
| RTA record (QLD) | `api/lib/booking/recordRtaBondLodgement.ts` |
| Reinstatement | `api/lib/booking/reinstatement/*`, migration `20260718080000_booking_reinstatement_requests.sql` |
| Spec | `docs/plans/terminate-agreement-capability-plan.md` |
| Lawyer Q | `docs/legal/questions-for-jenny.md` Q-022 |
