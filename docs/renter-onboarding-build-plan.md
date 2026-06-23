# Renter onboarding redesign — build plan

**Status:** Stage 0 decisions locked; **Stage 1 not started** (2026-06-24).  
**Context:** Codebase audit confirmed the design holds; build is larger than it looked because three gates disagree today and route is written pre-auth in many places. Full audit findings live in the agent transcript for 2026-06-24 (renter onboarding investigation).

**Goal:** Signup = Renter vs Landlord only; six-tile situation picker on profile (section 0); one collapse-on-complete profile page; **live booking-readiness** (not `onboarding_complete`).

---

## 1. Locked decisions

| Topic | Decision |
|-------|----------|
| Signup | **Renter vs Landlord only** — no Student / Non-student at signup |
| Situation storage | New column e.g. `renter_situation` (6 values); **`accommodation_verification_route` derived** (Student → `student`; all others → `non_student`) |
| Booking-readiness | **Computed struct** (`RenterReadiness`) — route-aware, field-presence based; **not** an extension of `verification_type` |
| `verification_type` | Keep as **identity-proof tier** (`none` / `student` / `identity`); listing RLS still keys off it; **promotion** to `student` / `identity` is driven by `RenterReadiness` (Stage 2), not ad-hoc UI effects |
| Employer vs location | **`employer_name`** = canonical employer; **`workplace_*`** = geocode/search anchor only |
| Guarantor consent | Checkbox attestation (`guarantor_consent` boolean) — not a stored document |
| Route switch under active booking | **Block** while booking status ∈ `pending`, `pending_payment`, `pending_confirmation`, `awaiting_info`, `bond_pending`, `confirmed`, `active` (full enum in Stage 6) |
| Post-auth landing | Incomplete renters → **`/student-profile`** (section 0), not `/onboarding/student` |

---

## 2. Kill list (must remove in new model)

These let users past gates without real fields — **Lucy recurs** if left in place:

| Mechanism | Location | Action |
|-----------|----------|--------|
| `markStudentOnboardingCompleteClient` / `quni_student_onboarding_client_ok:*` | `src/lib/studentOnboarding.ts` | Remove usage; delete escape hatch |
| `profileTermsComplete` using `onboarding_complete` or `uni_email_verified` | `src/pages/Onboarding.tsx` | Require `terms_accepted_at` only |
| Renter `onboarding_complete` as gate | Checklist banner, dashboard hide logic | Stop writing/reading for renters; deprecate column for renter flow |
| Pre-auth route writers | Signup, OAuth, triggers, reconciliation (Stage 1) | Neutralise — route set only from section 0 save |

---

## 3. Current behaviour (why we're changing)

| Gate | Today | Problem |
|------|-------|---------|
| UI booking CTA | `isTenantCoreProfileComplete` (core fields only) | Unlocks before verification |
| API booking | `verification_type !== 'none'` | 403 at submit — Lucy mechanism |
| Checklist % | `buildStudentOnboardingSteps` | Disagrees with both above |
| Wizard complete | `onboarding_complete` on step 3 checkbox | Not field-presence based |

**Target:** One `RenterReadiness` module feeds CTA, pinned driver, checklist/meter, routing, and API assert.

---

## 4. Staged build sequence

Do **not** bundle stages. Each stage gets its own Cursor session with: *"Read `docs/renter-onboarding-build-plan.md`; implement Stage N only."*

### Stage 1 — Signup neutralisation + route deferral

**Largest piece.** Everything else assumes route is chosen post-auth on profile.

**Scope:**

- `Signup.tsx` — remove Student / Non-student tiles; stop writing `accommodation_verification_route` to metadata, localStorage, OAuth `signupRoute`
- Neutralise route-on-create in: `Onboarding.tsx`, `applyPendingAccommodationRoute.ts`, `authCallbackProfileReconciliation.ts`, `applyPendingSignupRole.ts`, `ensureSignupProfileRowAfterEmailConfirm.ts`, `AuthCallback.tsx`
- **`handle_new_user` trigger** — stop defaulting route from metadata (migration for Rob — see §6)
- Post-auth: incomplete renters → `/student-profile` (not `/onboarding/student`)
- Existing rows unchanged; null route → section 0 picker (Stage 4 UI can stub until then)

**Exit criteria:**

- New renter signup: metadata has `role: renter` only; profile `accommodation_verification_route` null until saved on profile
- No split-brain between metadata route and DB route on new accounts
- Tests updated for signup + auth callback reconciliation
- **Backward compat tested:** existing renters with `accommodation_verification_route` already set keep their route after Stage 1 deploy (regression test — signup-write removal must not null or overwrite existing routes)

---

### Stage 2 — Unified readiness (`RenterReadiness`)

**New module** e.g. `src/lib/renterReadiness.ts` (+ server mirror in `api/lib/` or shared rules):

```
RenterReadiness {
  situation, route
  sections: { personal, verification, routeSpecific, emergency, guarantor? }
  blocksBooking: string[]
  canRequestBooking, canBrowseListings
  verificationTierEligible: 'student' | 'identity' | 'none'
}
```

**Rewire:**

- `PropertyDetail` booking CTA → `canRequestBooking`
- `ProtectedRoute` → readiness redirect to `/student-profile#…`
- `OnboardingChecklistBanner` / dashboard meter → readiness fraction
- `assertRenterEligibleForBooking` → same rules as client
- Remove or thin-wrap `renterOnboardingIncomplete`
- **Replace** ad-hoc `verification_type` promotion in `StudentVerificationPanel` (and any other writers) with readiness-driven promotion when `verificationTierEligible` crosses the threshold

**Kill list items** (§2) in same stage or immediately after.

**Exit criteria:**

- Lucy scenario: CTA disabled until verification + core + route sections satisfied
- Checklist % === booking driver === API block reason
- Unit tests per situation × route (stub situation until Stage 3)
- **Promotion wired:** when readiness says tier-eligible, profile promotes to `verification_type` `student` or `identity`; student-only listing visibility (property RLS on `verification_type = 'student'`) still works after rewire — no orphan path where booking gate is unified but tier promotion is stale

---

### Stage 3 — Schema + situation persistence

**Rob runs migration** (agent drafts SQL only — do not apply to prod).

**New columns on `student_profiles`:**

| Column | Notes |
|--------|--------|
| `renter_situation` | enum: student, working, working_holiday, backpacker, retired, between_jobs |
| `employment_status`, `employer_name`, `job_title`, `employment_type` | Working route |
| `income_band`, `income_source` | Income / guarantor trigger |
| `guarantor_relationship`, `guarantor_phone`, `guarantor_email`, `guarantor_income_band`, `guarantor_consent` | Guarantor section |
| `visa_status`, `visa_subclass`, `visa_expiry`, `visa_doc_url`, `visa_submitted_at` | WH / Backpacker (mirror doc slot pattern) |

**Already exist:** `has_guarantor`, `guarantor_name`, `workplace_*`, `work_email*`, `uni_email*`, doc URL columns, `date_of_birth`, `accommodation_verification_route`, `verification_type`.

**On situation save:** derive `accommodation_verification_route`; sync session metadata if still used.

**Existing-row backfill** (same migration):

- `renter_situation = 'student'` where `accommodation_verification_route = 'student'` (and situation is null)
- Leave `non_student` / legacy `identity` rows with **null** situation — they pick Working / Retired / etc. on first profile load (route alone cannot disambiguate)

**Exit criteria:** Types in `database.types.ts`; readiness reads real situation column; existing student-route renters not re-prompted on section 0.

---

### Stage 4 — Profile page redesign

- Extract route/situation switch from `StudentOnboarding.tsx` → shared hook (session sync, email field clears, confirm dialog)
- Section 0: six-tile situation picker
- Sections 01 Personal, 02 Verification (universal ID + supporting + situation email), 03 route-specific, 04 Emergency, conditional Guarantor
- Collapse-on-complete + pinned driver (`blocksBooking` from readiness)
- Move enrolment to student route section; visa to WH/Backpacker section
- Working section: employment fields + `StudentWorkLocationSection` (still writes `workplace_*`)
- Retire `/onboarding/student` wizard → redirect to profile

**Exit criteria:** New renters never see old 3-step wizard.

---

### Stage 5 — Search persona (situation-aware)

Today `non_student` route ⇒ `professional` persona ⇒ "Set your work location" for **all** non-students. Wrong for Retired / Between jobs.

| Situation | Persona | Uni filters | Work location prompt |
|-----------|---------|-------------|----------------------|
| Student | student | yes | no |
| Working | professional | no | yes if no coords |
| Working holiday, Backpacker | traveller | no | optional / different copy |
| Retired, Between jobs | general | no | **no** work nag |

**Files:** `useRenterSearchPersona.ts`, `Listings.tsx`, `PropertyDetail.tsx` copy/banners.

---

### Stage 6 — Landlord surface + booking integrity

**Block situation/route switch** when the renter has any booking in a live-pipeline status.

Full `bookings.status` enum (from `bookings_status_check`):

`pending`, `pending_payment`, `pending_confirmation`, `awaiting_info`, `bond_pending`, `confirmed`, `active`, `completed`, `cancelled`, `declined`, `expired`, `payment_failed`

**Block switch when status ∈:** `pending`, `pending_payment`, `pending_confirmation`, `awaiting_info`, `bond_pending`, `confirmed`, `active`

**Allow switch when status ∈:** `completed`, `cancelled`, `declined`, `expired`, `payment_failed` (application over)

- Extend `LandlordSafeStudentSnapshot` + `studentToSnapshot` — employment/income/guarantor; still no DOB, emergency, doc URLs
- Landlord accept: re-read readiness at confirm; block or flag if profile changed since request
- Landlord sees `enrolment_submitted_at` / `visa_submitted_at` only (same pattern as ID)

**Exit criteria:** Switch blocked for all seven live-pipeline statuses; allowed for terminal statuses; test covers `pending` and `pending_payment` (not only `pending_confirmation`).

---

### Stage 7 — Capacitor / mobile pass

- Section expand → `scrollIntoView` + focus
- Pinned driver: safe-area + keyboard inset (`Booking.tsx` pattern)
- Doc upload: generous bottom padding (`StudentVerificationPanel` already uses `pb-32`)
- Smoke iOS + Android WebView

---

## 5. Document slots (unchanged columns)

| Slot | Column | Section after redesign |
|------|--------|-------------------------|
| Government photo ID | `id_document_url` | 02 Verification (universal) |
| Supporting identity | `identity_supporting_doc_url` | 02 Verification (universal) |
| Enrolment | `enrolment_doc_url` | 03 Student route |
| Visa | **new** | 03 WH / Backpacker |

---

## 6. Migrations — Rob runs these

| Stage | Migration intent | Apply before |
|-------|------------------|--------------|
| 1 | `handle_new_user` — do not set `accommodation_verification_route` from signup metadata | Deploy Stage 1 code |
| 3 | `renter_situation` + employment/income/guarantor/visa columns | Deploy Stage 4 code that writes them |
| 3 | Backfill `renter_situation = 'student'` where route is `student`; leave `non_student` null | Same |
| 3 | Any enum/check constraints for situation values | Same |

**Agent rule:** Draft SQL in `supabase/migrations/`; output *"Rob runs this — proceed?"* — never push to prod.

---

## 7. Cursor prompt templates

**Stage 1:**
```
Read docs/renter-onboarding-build-plan.md. Implement Stage 1 only: collapse signup to Renter/Landlord,
neutralise all pre-auth accommodation_verification_route writers, redirect incomplete renters to
/student-profile. Draft migration for handle_new_user if needed. Do not build RenterReadiness yet.
```

**Stage 2:**
```
Read docs/renter-onboarding-build-plan.md. Implement Stage 2 only: add renterReadiness.ts, rewire
PropertyDetail CTA, ProtectedRoute, checklist/meter, assertRenterEligibleForBooking; remove kill-list
bypasses (§2). Tests for Lucy scenario.
```

**Stage N:** Same pattern — one stage, exit criteria from §4.

---

## 8. Progress tracker

| Stage | Status | Notes |
|-------|--------|-------|
| 0 Decisions | Done | This doc |
| 1 Signup / route deferral | Not started | |
| 2 RenterReadiness | Not started | |
| 3 Schema | Not started | |
| 4 Profile UI | Not started | |
| 5 Search persona | Not started | |
| 6 Landlord + booking lock | Not started | |
| 7 Mobile | Not started | |

Update this table as stages ship.
