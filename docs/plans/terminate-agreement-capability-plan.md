# Terminate-Agreement Capability — Build Plan

**Status:** Draft for implementation · no code written yet
**Author:** Rob (via Cowork)  ·  **Date:** 2026-07-23
**Related:** `docs/legal/questions-for-jenny.md` Q-022 · Quni-Whole-Unit-Single-Tenant playbook (Claude project)

---

## 1. Why

We hit a real case (Kim) where one tenant wants to take every room in a self-contained unit. The correct legal structure is a **single whole-unit tenancy**, not two per-room agreements (exclusive possession → one RTA tenancy; *Radaich v Smith*). This move — "end an existing agreement so the tenant can enter a new one" — will recur: upgrades, downsizes, room swaps, early exits, whole-unit conversions.

Rather than build a bespoke "whole-unit collapse / guided convert" macro, build one **reusable primitive: terminate an agreement.** Once terminated, the tenant re-enters the existing booking/signing flow to sign a new agreement. Terminate + existing new-agreement flow = conversion, with no special-case machinery.

## 2. Verified current data (prod, 2026-07-23)

Confirmed against the live DB so the spec is grounded, not assumed:

- **Kim's current booking** `c2c98560-7048-4a70-82bc-6cec17edf2b0` — status `active`, room `8f68e6a0` ("Private room with own bathroom"), Liverpool NSW, $400/wk, bond_amount $800, `rta_bond_number = null`.
- **Legal tier = Tier 2.** `property_type = private_room_landlord_off_site` (landlord off-site → RTA 2010 applies). **Not Tier 1.** The "Tier 1" impression came from `service_tier = listing` — that's the *service* tier (Listing vs Managed), a separate axis from the legal tier.
- **Whole-unit listing already exists**: `f6f4ed60-e080-4b1e-b6ae-b416d05e13a5` ("2 Bedroom 2 Bathroom 1 carspace fully furnished"), `property_type = entire_property`, $800/wk (= 2 × $400), status `active`, **0 bookings**. Same `property_group_id = 60e340e2-3b36-4a00-ab32-65101e8480bf` as Kim's room.
- **Data flags to check:** `rta_bond_number` null + `bonds` table empty → Kim's Tier 2 bond may not actually be lodged/tracked in RBO (affects whether "transfer" or "fresh lodge" is the real path). One older `expired` Kim booking on the same room = history only.

Implication for Kim: the "create the whole-unit listing" prerequisite is **already done**. Her conversion = terminate `c2c98560` → book existing `f6f4ed60` → pause room `8f68e6a0` → bond outcome. All Tier 2.

## 3. Design principle

- **Build the primitive, compose the outcome.** `terminate(agreement)` is the new capability. "New agreement" already exists (booking → FT6600/occupancy → DocuSeal → bond). Kim's conversion composes the two — no convert-specific code path.
- **Terminate is a legal event, not a delete or a toggle.** It carries type, effective date, consent, and an audit trail, or it undermines the legal position it exists to protect.
- **Tier-aware by construction.** Termination mechanics and bond handling differ by legal tier (see §6). Build both branches; Kim runs the Tier 2 branch.
- **Platform is never bond custodian.** The primitive records the bond *outcome*; it never moves bond money. RBO (Tier 2) / landlord (Tier 1) do the actual bond action externally.

## 4. Scope

**In scope**
- Terminate an active agreement/tenancy with a typed reason and effective date.
- Two-party acknowledgment (DocuSeal) for mutual-surrender terminations.
- Retain the terminated record (no hard delete); emit canonical `booking_events` + `service_tier_events` entries as appropriate.
- Release the associated listing/room back to available on the effective date.
- Record the bond outcome per tier; no money movement.
- Overlap guard: prevent one tenant holding two *active* agreements on the same premises / `property_group` simultaneously.

**Out of scope (explicitly not building)**
- Multi-room single booking spanning two listing IDs.
- In-app RBO API lodgement/refund (stays external admin).
- Any change to prescribed FT6600 / Form 18a / VIC Form 1 templates for this case.
- Auto-collapse (silently converting when the last room is booked by one tenant). Not needed once terminate + overlap-guard exist.

## 5. Data model

Add to the booking/tenancy record (align to existing `bookings` / `tenancies` schema):

- `termination_status` — `active | terminating | terminated`
- `termination_type` — enum (see §6)
- `termination_effective_date` — date the agreement ends / new one may begin
- `termination_reason_note` — free text
- `termination_initiated_by` — `landlord | tenant | admin`
- `termination_acknowledged_at` — set when both parties e-acknowledge (mutual surrender)
- `bond_outcome` — `pending | transferred | refunded | retained_by_agreement | na`
- `bond_outcome_note` — RBO reference (Tier 2) / landlord decision record (Tier 1)

Canonical log: emit `booking.agreement_terminated` on `booking_events` (matches the existing canonical-log pattern) with type, effective date, tier, and actor. Never delete prior rows. The `tenancies` row moves to a terminated status; keep it for history.

## 6. Tier-aware termination + bond (the part Rob asked to factor in)

| | **Tier 1 — Hosted/boarder-lodger** (`landlord_on_site`) | **Tier 2 — Private room / whole unit** (`landlord_off_site`, `entire_property`) — *Kim* |
|---|---|---|
| Governing doc | Quni Occupancy Agreement / Licence to Occupy | Prescribed FT6600 + Quni Addendum |
| Law | RTA excluded (common-law licence) | RTA 2010 (NSW) applies |
| Termination mechanics | Per licence terms (notice as drafted); RTA notice/NCAT do **not** apply | RTA-consistent; mutual surrender for a consensual early end |
| **Bond** | **Landlord-held, no RBO.** Outcome = refund by landlord, or retain/carry by written agreement | **RBO-lodged.** Outcome = transfer/carry-over in RBO (top up to 4 wks of new combined rent) **or** refund + re-lodge |
| Bond cap / count | Per agreement terms | s.159(1) ≤ 4 wks combined rent; s.161 one bond per agreement |

**Whole-unit routing guard (legal).** A single tenant in sole occupation of a whole self-contained unit has exclusive possession → this **cannot** be a Tier 1 licence; the new agreement must route to Tier 2 (`entire_property`, RTA). Enforce/flag this even if a starting room booking was Tier 1.

## 7. Flow

1. Initiator (landlord/admin) selects an active agreement → **Terminate**.
2. Choose `termination_type` + `termination_effective_date` (+ note). System reads the agreement's tier to pick the right mechanics/bond branch (§6).
3. If `mutual_surrender`: generate a short surrender/mutual-termination acknowledgment, route to both parties via DocuSeal (same rail as signing). Status `terminating` until both acknowledge; then set `termination_acknowledged_at`, status → `terminated` on the effective date.
4. On effective date: agreement → `terminated`, listing/room → available (or ready to fold into the whole-unit listing), `booking.agreement_terminated` logged.
5. **Bond outcome step** (checklist, no money moved) per tier (§6). Record `bond_outcome` + reference.
6. Tenant is now free to sign a **new** agreement via the existing booking/signing flow.

## 8. Overlap guard (safety net)

Before confirming a new agreement, block/warn if the same tenant would hold **two active agreements on the same premises / `property_group`** at once (i.e. the prior one isn't terminated with an effective date on/before the new start). This prevents the two-agreement structure re-appearing by accident and makes "terminate → sign new" the enforced path.

## 9. Kim walkthrough (composed from the primitive — Tier 2)

1. `entire_property` listing already exists (`f6f4ed60`, $800/wk) — no creation needed. Confirm bond weeks / max_occupants on it.
2. Pause/retire the room listing `8f68e6a0` so it can't be re-booked.
3. **Terminate** Kim's room booking `c2c98560`: type `mutual_surrender`, effective = changeover date, both acknowledge via DocuSeal.
4. Bond outcome (Tier 2): transfer/carry-over in RBO to the whole-unit tenancy, top up to 4 wks of $800 — **but first confirm the current bond's real RBO status** (data shows `rta_bond_number` null / `bonds` empty). If never lodged, this becomes a fresh single lodgement, not a transfer.
5. Kim books `f6f4ed60` via the existing flow → new whole-unit FT6600, starting on the effective date.
6. Fresh whole-unit ingoing condition report; single combined rent ledger from changeover.

## 10. Phasing

- **P1 — Terminate primitive:** typed, tier-aware termination + effective date + retain record + `booking.agreement_terminated` log + listing release.
- **P2 — Consent + bond + guard:** DocuSeal two-party acknowledgment for `mutual_surrender`; tier-aware bond-outcome field; overlap guard on new-agreement confirm; whole-unit Tier-2 routing guard.
- **P3 — (optional) Convenience:** landlord "convert to whole-unit" shortcut chaining pause siblings → terminate → prompt new booking. UX sugar over P1+P2; only if volume justifies. No auto/silent collapse.

## 11. Edge cases

- Second room occupied by someone else → conversion unavailable; guard on room availability (for Kim the whole-unit listing has 0 bookings, so clear).
- Fixed-term room not yet expired → fine under `mutual_surrender` (consensual, no break fee); state that in the acknowledgment.
- Dates: new agreement start ≥ termination effective date; no gap/overlap.
- Bond top-up shortfall/over-cap → validate against 4 wks combined rent (s.159(1)); one bond only (s.161).
- Bond never actually lodged (Kim's data flag) → outcome branch = fresh lodge, not transfer.
- Tenant declines to acknowledge surrender → stays `terminating`; cannot proceed.
- Tier mismatch: starting agreement Tier 1 but whole-unit outcome → force Tier 2 routing (§6 guard).

## 12. Legal dependencies (do not finalise wording until resolved)

- **Q-022** (Jenny): single whole-unit tenancy vs two agreements; confirm s.159(1)/s.161/s.219 cites; bless the convert sequence and the surrender documentation (continuity/re-characterisation).
- Confirm exact **RBO transfer/carry-over path** for a room→whole-unit change (same tenant/landlord) with Fair Trading — and whether Kim's current bond was ever lodged.
- Surrender/mutual-termination acknowledgment wording to be lawyer-reviewed before the DocuSeal template is finalised.

## 13. Verification

- Unit tests: termination type/effective-date validation; tier-aware bond branch selection; overlap-guard blocks same-tenant same-premises active overlap; bond-cap validation.
- Event tests: `booking.agreement_terminated` emitted once via webhook path; terminated record retained; `tenancies` status transition correct.
- E2E smoke: terminate (Tier 2 mutual_surrender, two-party ack) → room listing released → new `entire_property` booking + FT6600 signed → single bond outcome recorded. Mirror the existing three-party signing smoke harness.
