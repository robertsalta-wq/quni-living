# NSW Tier 3 compliance attestation gate - plan

**Status:** Approved (A1–A5 defaults, 19 Aug 2026). Implementing.
**Date:** 14 August 2026
**Follows:** `Cursor-Brief-Tier3-NSW-Compliance-Attestation-Gate.md`; generator plan `docs/plans/nsw-t3-boarding-house-occupancy-agreement-plan.md` (D14).

---

## 1. Verdict

This is a **T3-only onboarding gate**, not an agreement generator. Before a NSW boarding-house listing can **publish** or **generate** an occupancy agreement, the operator must complete a versioned self-attestation stored on the property. Quni records the declaration. Quni does not verify DA, fire, or registration. No public/resident “verified / registered / compliant” badge.

Do not fold this into the generator PR. The generator can ship with the existing rooming-house registration-number field. This gate is the legal shield on top.

---

## 2. Routing (reconciled to code)

T3 today (and in the generator plan) is:

`state = NSW` AND `property_type = private_room_landlord_off_site` AND `is_registered_rooming_house = true`

That is the same signal this gate must use. Do not invent a second T3 detector.

Already on the listing form:

- `is_registered_rooming_house` checkbox
- `rooming_house_registration_number` (required when the box is ticked)
- `lister_role`: `owner` | `head_tenant` (this is the owner vs rent-to-rent branch)
- `authority_to_let_attested_at` (generic authority-to-let timestamp; **not** this T3 warranty)

The gate **reuses** `lister_role` for A3 (head-lessor consent only when `head_tenant`). It **does not** treat `rooming_house_registration_number` alone as the full attestation. The four declarations + warranty are a new append-only record.

---

## 3. Decisions to tick (A1–A5)

| # | Topic | Recommended default | Tick |
|---|---|---|---|
| A1 | Declarations vs uploads | v1: all four declarations + registration number **required**. File uploads **optional**. | ✓ |
| A2 | AFSS expiry re-block | Capture statement date/expiry if the form has it. **No auto-reblock on lapse in v1.** | ✓ |
| A3 | Owner branch | Use existing `lister_role`. Head-lessor consent required only when `head_tenant`. Do not add a second “are you the owner?” question unless `lister_role` is missing. | ✓ |
| A4 | Lapse / withdraw | Block **new** T3 publish and **new** agreement generation. Already-executed agreements stand. | ✓ |
| A5 | Scope | **NSW T3 only.** QLD/VIC later. | ✓ |

---

## 4. What to collect

1. Fair Trading registrable-boarding-house registration number (may copy from `rooming_house_registration_number`).
2. DA / lawful planning entitlement for boarding-house use (declaration).
3. Current Annual Fire Safety Statement (declaration; optional date/expiry).
4. Head-lessor consent to sublet (declaration, **only** if `lister_role = head_tenant`).

Plus warranty (versioned copy): the operator affirms the above are true; **Quni does not verify and relies on the declaration**; the operator is responsible for obtaining and maintaining compliance.

Operator-facing framing must use that wording. Never “we have verified”.

---

## 5. Storage / audit

New append-only table (name at impl, e.g. `property_t3_attestations`):

- `id`, `property_id`, `attested_by` (landlord user/profile id), `attested_at`
- declared registration number, DA bool, AFSS bool + optional dates, head-lessor consent bool/null
- `warranty_version` (string key of the copy they accepted)
- optional evidence storage paths
- `superseded_at` null on current row; new attestation inserts and closes the previous

Retrievable by property_id + time. Do not update-in-place in a way that destroys the prior statement.

Gating reads: “complete current attestation exists” (unsuperseded row with all required fields for that `lister_role`).

---

## 6. Gate points

Block with a clear operator-facing reason, T3 NSW only:

1. Listing **publish** / go-live (property form save-to-active, listing hub publish).
2. Occupancy **agreement generate** (`nswBoardingHouse` preflight). Same T3 routing key.

Do not block T1/T2. Do not block QLD/VIC rooming-house listings (those stay unsupported anyway).

If A4 is ticked: withdrawing or replacing with an incomplete record blocks new publish/generate only.

---

## 7. Copy / badge ban

- No resident-facing or public verified/registered/compliant badge on listing cards, property detail, the occupancy PDF, or emails.
- Test asserts those markers are absent on listing + document surfaces for a T3 property that has attested.

---

## 8. Acceptance (this gate, once approved)

1. NSW T3 cannot publish or generate without a complete current attestation.
2. Record persists (timestamp, operator, declared values, warranty version) and is retrievable.
3. No public badge markers.
4. Operator copy states Quni does not verify.
5. Head-lessor consent required only for `head_tenant`.
6. Tests for block, persist, non-owner path, no badge.

---

## 9. Relation to the generator PR

The generator PR must **not** wait on this table. It may keep requiring `rooming_house_registration_number` when the rooming-house box is ticked (already true). After this gate ships, generator preflight adds “current T3 attestation exists”.

If both were forced into one PR, the occupancy form would be blocked on a new legal-shield schema. Keep them sequential: generator first (approved hybrid+charges), gate second (this file).
