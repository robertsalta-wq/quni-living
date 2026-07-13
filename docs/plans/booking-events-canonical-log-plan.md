# Plan — Canonical booking event log

**Goal:** One append-only, timestamped event stream per booking that records what actually happened — state transitions and side-effect outcomes (email delivery, signatures, document lifecycle) — so a single query returns the complete operational story. Silent failures (wrong DocuSeal webhook URL; discarded Resend responses) must become visible.

**Problem this fixes:** Two production failures shared one root cause: no reliable record of booking-side outcomes. `service_tier_events` logs some intentions and a thin Listing slice; it does not log email provider accept/delivery, per-party signatures, or most status transitions. A half-complete log that looks authoritative is worse than no log.

**Last updated:** 13 Jul 2026 (shape locked; Stage 0 sign-off; UI schema confirmed)

---

## Stage 0 sign-off (13 Jul 2026)

| # | Decision |
|---|----------|
| 1 | **New `booking_events` table.** STE demoted — not renamed, not dual-written long-term. Historical STE rows left as-is. Operational STE reads (rate-limit, PI recovery, expiry-refund marker) tracked as debt; do not block. |
| 2 | Fail-closed classes as tabled. Email: attempt insert fail → **do not send**; Resend success + result insert fail → **do not retry** (never double-mail); Sentry + gap monitor. Delivery = new appended rows. |
| 3 | Renter surface: pinned obligation from **current** booking/payments state + timeline filtered `audience='both'`. Email events **always `internal`**. Obligations never reconstructed from event replay. |
| 4 | First slice: status trigger + DocuSeal + email (attempt + Resend webhook) + **gap monitors in the same milestone**. Invites, verification, managed-confirm polish, declines after. |
| 5 | One-off DocuSeal signature reconcile for executed pre-fix leases (129, 133, 135, + any others). Signatures only — not a general backfill. |
| 6 | No hash-chaining. Closed. |

### UI schema confirmation

Landlord/admin and renter timelines (see product copy in chat 13 Jul) require the envelope below. **Schema can carry the UI** with the columns in Stage 1. Flags:

| UI need | Schema support | Note |
|---------|----------------|------|
| Actor ("Quinn Lee", "system", "webhook") | `actor_type`, `actor_id`, **`actor_label`** | Label denormalised at write time — do not resolve names at read time. |
| Diffs old → new + reason | **`changes` jsonb** + **`reason` text** | e.g. `[{"field":"lease_length","old":"6 months","new":"3 months"}]`. |
| Provider ids | **`provider`**, **`provider_ref`** | First-class for traceability and indexes; also mirrored in metadata if useful. |
| Outcome / colour | **`outcome`** | `success` \| `failure` \| `pending` \| `n/a` — drives icon colour. |
| Audience filter | **`audience`** | `internal` \| `both`. Emails always `internal`. |
| Chronological newest-first | **`occurred_at`** | Sort key. Distinct from `created_at` (when Quni recorded the row — matters for late reconcile). |
| Links (signed PDF, draft) | `metadata.links` / `document_id` | No separate link table in v1. |
| Email “one row” with delivered/opened | **`correlation_id` (text)** | Append-only ⇒ delivery is a separate row. **UI collapses** rows sharing `correlation_id` into one landlord line. Schema supports; presentation aggregates. |
| Renter never sees email / provider / admin plumbing | `audience` + copy layer | Do not mark email events `both`. Softening is filter + copy, not a second store. |
| Pinned “bond due …” | **Not in this table** | Derived from `bookings` / payments current state. |

**Cannot / must not carry:** reconstructed balances or “what you owe” — SoT stays on booking rows.

---

## Architecture

```
  bookings UPDATE (status, …)     TRIGGER ──INSERT──► booking_events
  API / cron / webhook
       ├── recordBookingEvent()  ───────────────────INSERT──► booking_events
       ├── sendBookingEmail()
       │     ├── email.attempt (fail-closed) → Resend → email.accepted | email.failed
       │     └── (never retry send if accepted-row insert fails)
       ├── DocuSeal send / webhook / reconcile
       │     └── document.* / signature.*
       └── Resend webhook → email.delivered | email.bounced | email.complained

  service_tier_events  — property-tier + legacy operational reads only (demoted)
  journey_events       — funnel; stays separate

  Gap monitors (same milestone as first slice)
       ├── provider_webhook_health.last_received_at (Resend, DocuSeal, Stripe)
       └── scheduled invariants → Sentry
```

**Invariant:** Renter view = `WHERE audience = 'both'` over the same table. Never a parallel write.

**Device context:** Handler-emitted rows may include `metadata.user_agent` / `metadata.is_mobile` via `mergeDeviceContextMetadata` (same helper as `journey_events`). DB trigger, webhooks, and cron omit device context — no request / not the actor's device.

---

## Schema (`booking_events`)

New table. Does **not** rename or replace `service_tier_events`.

| Column | Type | Role |
|--------|------|------|
| `id` | uuid PK | |
| `booking_id` | uuid NOT NULL FK → bookings | Booking-scoped log |
| `landlord_id` / `student_id` | uuid null | Denormalised at insert for RLS |
| `event_type` | text NOT NULL | App registry; no Postgres ENUM |
| `occurred_at` | timestamptz NOT NULL | Event time (backdatable for reconcile) |
| `created_at` | timestamptz NOT NULL | Insert time |
| `audience` | text NOT NULL | `internal` \| `both` |
| `outcome` | text NOT NULL | `success` \| `failure` \| `pending` \| `n/a` |
| `actor_type` | text NOT NULL | `system` \| `student` \| `landlord` \| `admin` \| `webhook` \| `cron` |
| `actor_id` | uuid null | Profile / auth when known |
| `actor_label` | text null | Display string at write ("Quinn Lee") |
| `changes` | jsonb null | Structured diffs |
| `reason` | text null | Human reason when supplied |
| `provider` | text null | `docuseal` \| `resend` \| `stripe` \| … |
| `provider_ref` | text null | Submission id / Resend id |
| `correlation_id` | text null | Ties attempt→delivery; UI collapse key |
| `document_id` | uuid null | Optional FK to tenancy_documents |
| `metadata` | jsonb NOT NULL default `{}` | Type-specific extras + `links` |
| `schema_version` | smallint NOT NULL default 1 | Payload version |

**Indexes:** `(booking_id, occurred_at desc)`, `(booking_id, audience, occurred_at desc)`, `(event_type, occurred_at desc)`, `(provider, provider_ref)`, `(correlation_id)` where not null.

**Append-only:** BEFORE UPDATE/DELETE trigger raises; revoke UPDATE/DELETE from `anon`/`authenticated`; service_role insert via `insert_booking_event` / app helper. Dev reset: `set_config('quni.allow_booking_events_mutation','true',true)`.

**RLS SELECT:** platform admin (all); landlord (own `landlord_id`); student (`audience='both'` and own `student_id`). INSERT: service_role only.

**`provider_webhook_health`:** small table for gap monitor (a) — `provider` PK, `last_received_at`, `last_event_type`, `updated_at`. Same Stage 1 migration so monitors are not blocked on a later DDL.

---

## Event catalogue (first slice + later)

### First slice

| event_type | Audience | Outcome | Notes |
|------------|----------|---------|-------|
| `booking.status_changed` | both* | n/a / success | Trigger; \*terminal/internal-only statuses may be `internal` if product prefers |
| `booking.field_changed` | internal | n/a | Other watched columns |
| `document.sent_for_signing` | both | pending | provider docuseal |
| `document.signature_recorded` | both | success | Per party |
| `document.fully_signed` | both | success | |
| `document.voided` / `document.regenerated` | internal | n/a | |
| `document.reconciled` | internal | success | Admin / historical |
| `email.attempt` | internal | pending | Before send; fail-closed |
| `email.accepted` | internal | success | Resend API accept |
| `email.failed` | internal | failure | |
| `email.delivered` / `email.bounced` / `email.complained` | internal | success/failure | Webhook; new rows |

### Cut over from STE (when touching those paths)

Domain events currently on STE (`booking_confirmed`, `bond_received_acknowledged`, `booking_terms_update`, …) move to `booking_events` with `changes` / `reason` / `actor_*` filled. Stop inserting booking lifecycle into STE.

### After first slice

Invites, verification / legal-name lock, managed-confirm domain polish, declines, `booking.created`, etc.

---

## Failure modes

| Class | Policy |
|-------|--------|
| Status change + trigger insert | Same transaction; event fail ⇒ status fail |
| Terms / bond ack / signature recorded | Fail-closed on event insert |
| `email.attempt` insert fails | **Do not send** |
| Resend OK, `email.accepted` insert fails | **Do not retry send**; Sentry + gap monitor |
| Resend call fails | `email.failed` when possible |
| Delivery webhook insert fails | 5xx retry; alert if sustained |
| Signature column update without event | P0 — prefer same boundary; gap monitor backs it |

---

## Gap monitors (same milestone as first slice)

**(a) Provider health** — update `provider_webhook_health` on each webhook. Admin surface: stale if `now() - last_received_at` > N hours (start N=24; tune).

**(b) Invariant cron → Sentry**

- Document `sent_for_signing` with no `document.signature_recorded` within N days
- `bond_pending` with no payment-instructions `email.*` attempt/accepted
- `email.accepted` with no delivered/bounced/complained after 24h
- `*_signed_at` set on tenancy_documents with no matching signature event (post–Stage 4)

---

## Implementation stages (one concern per commit)

| Stage | Commit focus | Deliverable |
|-------|--------------|-------------|
| **0** | Plan only | This document |
| **1** | Migration only | `booking_events` + `provider_webhook_health` + append-only + `insert_booking_event` + RLS. **Rob applies to prod before code merge.** |
| **2** | App write helper | `recordBookingEvent` + TS types/registry; no behaviour change yet |
| **3** | Status spine | `bookings` UPDATE trigger; actor session vars on primary paths; tests |
| **4** | Email + Resend webhook + monitors (a)(b) for email | `sendBookingEmail`; webhook route; health updates; invariant cron |
| **5** | DocuSeal emit + historical signature reconcile | Live path events; one-off 129/133/135 (+peers); signature invariant |
| **6** | Cut STE booking writes | Retarget confirm/bond/cancel/terms/etc. to `booking_events` |
| **7** | Product UI | Admin/landlord timeline; renter pinned band + filtered timeline |

**Ship constraint:** Stages 1–5 are the minimum that would have caught both recent incidents. UI (7) can trail logging. Do not ship logging without gap monitors.

**Git:** branch `feat/booking-events-stage-1` (extends through later stages). **Do not push until Rob confirms.** PR when pushed. Migration SQL is this Stage 1 file — apply via SQL Editor / human pipeline, not agent `db push`.

---

## STE demotion / debt

- Leave historical STE rows untouched.
- Property triggers continue writing STE until a separate cleanup decides otherwise.
- Debt (non-blocking): move resend rate-limit, listing-fee PI recovery, expiry-refund marker off STE metadata onto proper columns/tables.
- After Stage 6, no new booking-lifecycle inserts into STE.

---

## Testing plan (cumulative)

- Privilege: authenticated UPDATE/DELETE on `booking_events` fails; insert via function succeeds
- RLS: student cannot see `internal`; landlord cannot see others’ bookings
- Status transitions produce trigger rows
- Email: attempt fail blocks send; accepted-insert fail does not resend
- Resend webhook: bounce never `audience=both`
- DocuSeal: form.completed → signature event; historical reconcile sets columns + events with correct `occurred_at`
- Gap cron: fixtures trip Sentry paths in test/staging

---

## Rollout

1. Rob applies Stage 1 migration to prod (**constraint/enum widening style:** DDL before code that depends on it).
2. Merge/deploy Stages 2+ only after migration is live.
3. Configure Resend webhook URL in Resend dashboard the same day Stage 4 deploys — health monitor must scream if misconfigured.
4. Run historical DocuSeal reconcile (Stage 5) as admin/one-off with explicit submission list; treat as evidentiary.

---

## Non-goals (v1)

- Hash-chaining
- Merging `journey_events`
- Event-replay as source of truth for money/status
- General historical email backfill
- Renaming or dropping STE in this project
