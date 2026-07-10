# Quni — Questions for Jenny (Legal Counsel)

**Living register. Add to the bottom of "Open"; move items to "Resolved" once answered.**

Maintained by: Rob · Counsel: Jenny
Last updated: 8 July 2026

---

## How to use this document

- One question = one entry with a stable ID (`Q-001`, `Q-002`…). Never reuse an ID.
- Keep the **precise question** to a single answerable sentence. Context goes above it.
- Statutory references are tagged:
  - `[VERIFIED]` — section number checked against primary legislation.
  - `[CONFIRM]` — plausible / from secondary source; Jenny or Rob to verify before filing.
  - `[OPEN]` — the legal position itself is the question.
- When Jenny answers, paste her response under **Answer**, date it, set **Status: Resolved**, and move the whole block to the Resolved section. Don't delete — we want the audit trail.

**Status values:** `Open` · `With Jenny` · `Resolved` · `Parked`

---

## OPEN

### Q-001 — Inspection acknowledgment: does it survive the UCT regime?
**Status:** Open
**Area:** ACL Unfair Contract Terms · sight-unseen bookings
**Tier/scope:** All tiers, all states (T1 licence + T2 tenancy)

**Context.** Renters (esp. international/interstate students) routinely book without an in-person inspection. There is currently no clause acknowledging inspection or the basis on which the renter proceeded. We want to add a factual-basis acknowledgment — explicitly **not** a waiver of rights.

Framework we're relying on (verified): the UCT regime applies here because a "consumer contract" includes a grant of an interest in land to an individual acquiring it for personal/household use — `ACL ss.23–25` `[VERIFIED]`, grant-of-interest-in-land limb `s.23(3)(b)` `[VERIFIED]`, unfairness test `s.24` `[VERIFIED]`.

**Question.** Does an evidentiary "basis of agreement" acknowledgment — even one drafted to include sight-unseen listing review and to preserve the right to adduce pre-contractual representations — risk being an unfair term under `s.24`, in particular via the grey-list example on limiting the evidence a party may adduce (`s.25(1)(l)` `[CONFIRM]`)? If so, what wording keeps it on the right side of the line?

**Answer.** _(pending)_

---

### Q-002 — NSW: does the clause trip the negligence-exemption prohibition?
**Status:** Open
**Area:** NSW RTA — prohibited additional terms
**Tier/scope:** T2, NSW

**Context.** NSW prohibits additional terms that exempt a landlord, agent, or any other person from legal liability for a negligent act or omission. This sits **independently of the ACL** — it's a state-RTA prohibition. Our acknowledgment must not be readable as such an exemption; paragraph (c) of the draft recital (the ACL/RTA non-exclusion savings clause) is intended to keep it clear.

Standard-form / additional-terms mechanics: `RTA 2010 (NSW) s.15` (additional terms permitted only if not inconsistent) `[VERIFIED]`; inconsistent/prohibited terms void under `s.21` `[VERIFIED]`; prohibited-terms provision `s.19` + Residential Tenancies Regulation `[CONFIRM exact clause for the negligence-exemption item]`.

**Question.** As drafted, does the acknowledgment recital risk being characterised as exempting the landlord/agent/platform from liability for a negligent act or omission (prohibited in NSW)? Is paragraph (c) sufficient to avoid that, or does it need tightening?

**Answer.** _(pending)_

---

### Q-003 — Do the ACL consumer guarantees apply to a residential tenancy at all?
**Status:** Open
**Area:** ACL consumer guarantees (Part 3-2)
**Tier/scope:** T2 (and by analogy T1)

**Context.** This came up because an AI review first over-applied and then over-excluded the consumer guarantees. The point is genuinely unsettled and should not be treated as decided either way. The ACL definition of "services" on its face **includes** rights and interests in real property, which cuts against a clean "guarantees don't apply to tenancies" conclusion `[OPEN]`. If the guarantees do apply, `s.64` voids any term that excludes/restricts/modifies them `[VERIFIED — general]`.

**Question.** Do the ACL consumer guarantees (e.g. `s.54` acceptable quality, `s.56` correspondence with description) apply to a T2 residential tenancy — or is a grant of an interest in land outside the guarantee regime? This determines whether `s.64` is a live voiding risk for any acknowledgment/booking-flow language.

**Answer.** _(pending)_

---

### Q-004 — AI listing generator: conduit protection on the Listing tier
**Status:** Open
**Area:** ACL `s.18` misleading/deceptive conduct · intermediary liability
**Tier/scope:** Listing tier (landlord-managed)

**Context.** On Managed, Quni authors listing copy, so the AI-generator constraints (no unverifiable adjectives; must surface recorded material defects) reduce Quni's own `s.18` exposure. On the Listing tier, Quni is meant to be a marketplace/conduit. Offering the same AI generator to Listing-tier landlords may push Quni from neutral conduit to active content creator.

**Question.** Does providing the AI description generator to Listing-tier landlords risk Quni losing "mere conduit" protection and picking up primary or accessorial `s.18` liability for a landlord's misleading listing? If so, is gating the tool to Managed-only — or an indemnity from Listing landlords — the cleaner fix?

**Answer.** _(pending)_

---

### Q-005 — Cross-jurisdiction section numbers for the clause-placement rule
**Status:** Open
**Area:** Prescribed-form integrity
**Tier/scope:** T2, all states

**Context.** The acknowledgment must live in the Quni Addendum (T2) / Occupancy Agreement (T1), **never** in the prescribed forms (NSW FT6600, VIC Form 1, QLD Form 18a), and the Addendum should state that the prescribed standard terms prevail over any inconsistency.

Section hooks for "you can't vary the prescribed form": NSW `s.15`/`s.21` `[VERIFIED]`; VIC `RTA 1997 s.26` `[CONFIRM]`; QLD `RTRA Act 2008 s.53` `[CONFIRM]`; QLD prescribed form under `Residential Tenancies and Rooming Accommodation Regulation 2009` — note **2009, not 2011** `[CONFIRM]`.

**Question.** Confirm the correct VIC and QLD section numbers and the QLD regulation year, so the "prescribed terms prevail / no variation" recital cites accurately.

**Answer.** _(pending)_

---

### Q-009 — T1 couples: one licensee, partner as authorised occupant
**Status:** Open
**Area:** T1 occupancy agreements
**Tier/scope:** T1

**Question.** T1 occupancy agreements with couples: confirm one licensee signs and the partner is named as authorised occupant (not a co-signatory) — current platform behaviour as of Jul 2026.

**Answer.** _(pending)_

---

## STANDING ITEMS ALREADY WITH JENNY
_(pre-existing, tracked here so there's one register)_

### Q-006 — FT6600 printed execution date: form-open vs signing-click
**Status:** With Jenny
**Area:** NSW prescribed form execution
**Blocking:** NSW package "production-ready" declaration

**Question.** Is it acceptable on the prescribed FT6600 for the printed execution date to reflect form-open time rather than the exact signing-click time? Pre-dating has been ruled out after the stale-date incident; pre-fill is via the redirect wrapper.

**Answer.** _(pending)_

---

### Q-007 — s.3A PSAA ruling (NSW Managed)
**Status:** With Jenny
**Area:** Property & Stock Agents Act — agency services
**Blocking:** NSW Managed tier go-live

**Question.** Does the Managed model as structured require licensing / expose Quni under `s.3A` PSAA in NSW? Determines whether NSW Managed can launch or stays gated.

**Answer.** _(pending)_

---

### Q-008 — IDV privacy ruling (Didit)
**Status:** With Jenny
**Area:** Privacy Act / APPs
**Blocking:** Didit IDV production go-live only (not the build)

**Question.** Sign-off on the identity-verification flow re: APP 8 (cross-border disclosure), APP 3.3 (biometric consent), and the Didit GDPR DPA → AU APP addendum. Confirms whether the process-and-purge + unbundled-consent design clears production.

**Answer.** _(pending)_

---

## RESOLVED
_(move answered items here with date + Jenny's response; keep full history)_

_None yet._
