# Open items

Living backlog for unfinished product decisions, tech debt, and ops follow-ups.
Not a chat log — short rows only. When an item ships, move it to **Done** with date and PR.

**Living Console:** [/admin/open-items](https://quni.com.au/admin/open-items) (platform staff only).  
**Structured source for that page:** [`src/lib/openItems.ts`](../src/lib/openItems.ts) — edit that file when adding or closing items, and keep this markdown aligned.

Related: [feature inventory](./feature-inventory.md), larger multi-PR work under [plans/](./plans/).

## How to use

| Field | Meaning |
|-------|---------|
| **ID** | Stable tag (area + number) |
| **What** | Outcome in one line |
| **Why parked** | Why it is not live yet |
| **When to do** | Trigger or condition to pick it up |
| **Where** | Config key, file, or surface |
| **Priority** | P0 fire · P1 soon · P2 product · P3 nice |

---

## Product decisions

| ID | What | Why parked | When to do | Where | Priority |
|----|------|------------|------------|-------|----------|
| LEGAL-4 | Enforce locked legal name before signing / bond docs / tenancy generation | Flag exists and is **off** so verification rollout does not hard-block | After admin Photo ID legal-name capture is routine and support can unlock mistakes | `platform_config.legal_name_signing_gate_enabled` · `api/lib/booking/assertStudentLegalNameForSigning.ts` | P2 |
| MSG-1 | Decide whether renters can **message** landlords before full verification (book still gated) | Today listing CTA treats incomplete readiness like a full block for message + book | When reviewing renter conversion vs verification strictness | `src/pages/PropertyDetail.tsx` (`studentListingActionsOk` / `canRequestBooking`) · `src/lib/renterReadiness.ts` | P2 |

---

## Tech debt / latent

| ID | What | Why parked | When to do | Where | Priority |
|----|------|------------|------------|-------|----------|
| *(none from legal-name / onboarding residual as of 2026-08-08)* | | | | | |

Onboarding no longer writes `first_name`/`last_name` when locked (#268). Profile personal section already skipped those fields when locked (Phase 3d).

---

## Ops / follow-ups

| ID | What | Why parked | When to do | Where | Priority |
|----|------|------------|------------|-------|----------|
| *(none open)* | | | | | |

---

## Done (recent)

| ID | What | Closed | Notes |
|----|------|--------|-------|
| OPS-1 | Re-pull Sentry unresolved (7d) renter routes | 2026-08-08 | No renter-app fires. `/listings` only = Instagram webkit noise. Volume is backend: signature_recorded gaps, stale Stripe/DocuSeal, Resend email_id |
| LEGAL-1–3a | Schema: preferred_name, legal lock columns, lock trigger | 2026-07 | Manual prod apply + migration files |
| LEGAL-3b–3c | Admin ID verify captures + locks legal name | 2026-07 | API + admin Photo ID UI |
| LEGAL-3d | Renter profile: legal read-only when locked; preferred editable | 2026-07 | `RenterProfilePersonalSection` |
| BOOK-1 | Restore `attachBookingToConversationOnCreate` import | 2026-07 | `43720c9` |
| LEGAL-ONB | Onboarding skip legal name writes when locked | 2026-08-08 | #268 |
| BOOK-UX-1 | Managed booking: surface `verification_required` (not generic payment fail) | 2026-08-08 | #268 |

---

## Adding items

1. Add a row in [`src/lib/openItems.ts`](../src/lib/openItems.ts) and mirror it here.
2. Prefer linking a plan doc under `docs/plans/` only if the item becomes multi-PR.
3. Agents: after parking work with “do later”, append in the same PR or a docs follow-up.
