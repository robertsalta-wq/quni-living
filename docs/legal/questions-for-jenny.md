# Quni — Questions for Jenny (Legal Counsel)

**Living register. Add to the bottom of "Open"; move items to "Resolved" once answered.**

Maintained by: Rob · Counsel: Jenny
Last updated: 23 July 2026

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

### Q-010 — Authority-to-let attestation: sufficient, or must consent be sighted pre-publish?
Status: With Jenny (June 2026 sub-letting brief)
Area: Platform liability · sub-letting
Question. Is the required tick-box attestation (owner, or tenant with landlord's written consent, producible on request) sufficient to publish a listing, or must Quni sight the consent document before a head-tenant listing goes live?
Answer. (pending)

---

### Q-011 — Facilitation liability and ACL s18 exposure on live sub-let wording
Status: With Jenny (June 2026 sub-letting brief)
Area: ACL s18 · facilitation liability
Question. Does hosting head-tenant listings on attestation alone expose Quni to facilitation liability or misleading-conduct risk under ACL s18, given the verification and template wording already live in the product?
Answer. (pending)

---

### Q-012 — Hosted consent-request templates: representation risk
Status: With Jenny (June 2026 sub-letting brief)
Area: Hosted templates · sub-letting
Question. Do the state-aware (NSW/VIC/QLD) editable consent-request letter templates Quni displays — copied and sent by the user from their own address — create any representation or advice liability for Quni?
Answer. (pending)

---

### Q-013 — Sub-let tier classification and bond handling
Status: With Jenny (June 2026 sub-letting brief)
Area: Tier classification · bond
Question. How is a head-tenant sub-let classified within the T1/T2 tier structure, and does bond handling differ from an owner-listed tenancy (Quni remains never bond custodian)?
Answer. (pending)

---

### Q-014 — QLD platform-fee disclosure obligation
Status: With Jenny (June 2026 sub-letting brief)
Area: QLD state-specific
Question. What platform-fee disclosure is Quni required to make to QLD renters and landlords, and where must it appear?
Answer. (pending)

---

### Q-015 — VIC s.30D renter-facing disclosure
Status: With Jenny (June 2026 sub-letting brief) · deferred pending VIC launch
Area: VIC RTA s.30D
Question. What renter-facing disclosure does VIC s.30D require of Quni, and does it apply before VIC listings go live or only at booking?
Answer. (pending)

---

### Q-016 — Landlord Service Agreement authority warranty
Status: With Jenny (June 2026 sub-letting brief)
Area: LSA · contractual backing
Question. Should the Landlord Service Agreement carry an express authority-to-let warranty and indemnity backing the listing attestation, and what should it say?
Answer. (pending)

---

### Q-017 — Future guided sub-let stream
Status: Parked (June 2026 sub-letting brief)
Area: Product roadmap · sub-letting
Question. If Quni later builds a guided sub-let stream (generating the sub-letting agreement itself), what changes legally versus the current copy-a-template model?
Answer. (pending)

---

### Q-018 — Signing sequence: preview at confirm, execution gated on bond receipt
Status: Open (flagged May 2026, not yet sent)
Area: Booking flow · document execution
Question. Renter sees a draft/preview of the tenancy agreement at booking confirmation, but signing is unlocked only after bond receipt — does this sequence raise any concern?
Answer. (pending)

---

### Q-019 — NSW T1 Managed scope: outside RTA/PSAA characterisation?
Status: Open (flagged May 2026, not yet sent)
Area: PSAA s.3A · tier scope
Question. Confirm that NSW T1 boarder/lodger arrangements sit outside the RTA and therefore outside the s.3A PSAA characterisation question (Q-007), so NSW T1 Managed can remain live while only T2 Managed stays gated.
Answer. (pending)

---

### Q-020 — Tier 3 Boarding Houses Act framework
Status: Parked (April 2026 brief Q6a–6d, carried over; Tier 3 deferred)
Area: Boarding Houses Act 2012 · Tier 3
Question. For 5+ resident properties: what must the T3 occupancy agreement contain, is landlord registration verification required at onboarding, and what are Quni's obligations as a facilitating platform?
Answer. (pending)

---

### Q-021 — Executed Listing-tier agreements with incorrect Addendum Section 5
**Status:** Open
**Area:** ACL misleading/deceptive conduct · executed tenancy documents · remediation
**Tier/scope:** Listing tier · T2 residential tenancy packages (NSW / QLD; VIC none in scope)

**Context.** Addendum Section 5 previously applied Managed-tier utilities economics to all bookings regardless of service tier, asserting all-inclusive utilities and a quarterly utilities cap. On Listing tier, Quni provides no utilities service and no cap — that assertion was incorrect on those agreements.

Fixed in code by PR #184 (23 July 2026). Newly generated documents branch correctly on service tier. No mass regeneration was performed; executed documents retain the incorrect Section 5.

Scope verified read-only against prod (23 July 2026) — Listing-tier `residential_tenancy` documents: **2 signed** (1 NSW, tenancy active; 1 QLD, booking cancelled), **3 archived**, **0** open or sent. **One live tenancy** is affected. Counts are operational facts from prod `[CONFIRM — Rob]`; legal characterisation of the misstatement and remediation path remain `[OPEN]`.

**Question.** Does the incorrect Section 5 on the live NSW agreement require tenant notification? Should a corrected addendum be issued and re-executed, or is a written correction sufficient? Does this constitute a misleading representation under the ACL (`s.18` `[CONFIRM]`), and does the correction obligation differ now that the tenancy is on foot? Is any action required in respect of the cancelled QLD agreement or the archived documents?

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
