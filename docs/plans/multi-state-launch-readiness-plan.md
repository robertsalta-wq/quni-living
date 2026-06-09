# Plan 2 — Multi-state launch readiness (NSW + QLD + VIC, Listing tier)

**Goal:** Controlled go-live across three states — real money, real leases, known landlords first — then public/DNS/SEO push.

**Scope:** Listing tier only. Managed, saved favourites, Xero, admin stubs deferred.

**Reframe:** Treat **first real booking** and **public launch** as two events:

1. **Quiet go-live** — 3+ verified listings, known landlords, watch 2–3 full cycles under close watch
2. **Public push** — DNS to `quni.com.au`, SEO, outreach — only after clean cycles

**Last updated:** 9 Jun 2026

---

## Critical path (ordered)

These run **once for all states** unless noted.

| # | Item | Type | Notes |
|---|------|------|-------|
| 1 | **Password reset** | Code blocker | No forgot-password flow exists. Users who forget passwords are trapped. |
| 2 | **Refunds page copy fix** | Code / ACL | Page says listing fees are "not yet charged automatically"; `confirm-booking` charges on accept. Misleading representation risk. ~10 min. |
| 3 | **ABN / legal entity** | Data entry | Enter Quinnvestments Pty Ltd ABN in Admin → Business settings. **Must match** Stripe Connect account entity for clean landlord payouts. |
| 4 | **Bond model + #49 build** | Process + code | Decide landlord-direct vs Quni lodges (see Plan 1). Build bond reference field + instruction email. **Gates real bond money in all states.** |
| 5 | **Stripe live keys + webhooks** | Ops | Live keys, live Listing product ID, webhook on production domain. |
| 6 | **DocuSeal signing verified** | Per-state | Stream 0 from Plan 1 — one clean test-mode sign per state. |
| 7 | **G2 — test-mode E2E on production** | Per-state | Full cycle per state (see below). **Blocked until Plan 1 form work done for QLD/VIC.** |
| 8 | **G3 — live $99 smoke test** | Ops | One real charge + refund. Can run once (any state) to prove Stripe live. |
| 9 | **Verified listing inventory** | Ops | 3+ real listings across NSW/QLD/VIC; landlords you can phone. |
| 10 | **Quiet go-live** | Ops | 2–3 complete cycles (book → accept → fee → bond → sign → confirm) with real people. |
| 11 | **DNS to quni.com.au** | Ops | Update `VITE_SITE_URL`, webhooks, sitemap; 301 `quniliving.com.au`. |
| 12 | **Public / SEO push** | Marketing | After quiet go-live succeeds. |

---

## Step 1 — Password reset (code)

**Problem:** Zero references to `resetPasswordForEmail`, forgot-password routes, or reset callback handling.

**Implement:**

- Login page: "Forgot password?" link
- `/forgot-password` — email input → `supabase.auth.resetPasswordForEmail`
- `/reset-password` — new password form (Supabase recovery session)
- Ensure Supabase redirect URLs include reset callback on production origin
- Handle error states (expired link, invalid token)

**Audit first:** Existing auth in `Login.tsx`, `AuthCallback.tsx`, `ProtectedRoute.tsx`, Supabase Site URL config.

---

## Step 2 — Refunds copy fix (code)

**File:** `src/pages/Refunds.tsx` lines 84–90

**Action:** Remove or rewrite the note claiming listing acceptance fees are not charged automatically. Align with actual behaviour: listing fee charged on landlord accept via `api/confirm-booking.ts` → `confirmListing.ts`.

**Do before any real payment.**

---

## Step 3 — Legal entity + Stripe Connect alignment (ops)

**Files:** Admin → Business settings, `src/lib/legalEntity.ts`, Stripe Connect dashboard

**Checklist:**

- [ ] ABN entered and appears in lease PDF footers
- [ ] Legal entity name matches Stripe Connect account holder
- [ ] Bank details populated for rent payment instructions in agreements
- [ ] `hello@quni.com.au` / `noreply@quni.com.au` on correct domain

---

## Step 4 — Bond lodgement (process + code)

**Not optional if collecting real bonds at launch.**

Current Listing model: landlord collects bond, Quni provides state-aware copy and bond window. Missing pieces (Trust checklist #49):

- Bond reference number field (dashboard)
- Post-signing instruction email with authority-specific lodgement steps
- Written SOP: who lodges, by when, what happens if landlord doesn't

**Per-state deadlines (already in code):**

| State | Authority | Scheme | Deadline |
|-------|-----------|--------|----------|
| NSW T2 | RBO | Yes | Per `bondCopy.ts` |
| QLD T1/T2 | RTA | Yes | 10 calendar days |
| VIC T2 | RTBA | Yes | 10 business days |
| VIC T1 / NSW T1 | Landlord-held | No scheme | Different copy path |

See Plan 1 Stream 3 for build tasks.

---

## Steps 5–8 — Payments & E2E proof

### Stripe live (step 5)

- [ ] Live `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
- [ ] Live `STRIPE_LISTING_PRODUCT_ID`
- [ ] Webhook endpoint on production domain (`/api/stripe-webhook`)
- [ ] DocuSeal webhook on same domain

### G2 — per-state test-mode E2E (step 7)

Run **three times** (one per state with a property in that state):

```text
Student signup → find listing → message/book → deposit PI →
Landlord accept → $99 listing fee (test) → bond_pending →
DocuSeal sign (both docs) → mark bond received → confirmed
```

**NSW:** Can run now (after DocuSeal signing re-verify).

**QLD / VIC:** Wait for Plan 1 Streams 1–2 sample PDF review + DocuSeal E2E.

### G3 — live smoke test (step 8)

One real $99 charge on any state → full flow → refund. Proves live Stripe before public traffic.

---

## Step 9 — Inventory

Minimum for credible marketplace:

- [ ] 3+ verified real listings (plan allows spread across states)
- [ ] Each listing: real photos, accurate dates, landlord Stripe-ready
- [ ] At least 1 listing per target state if launching all three hot

Outreach tasks (Trust checklist Phase 3) can run in parallel.

---

## Step 10 — Quiet go-live

Before DNS/SEO:

- [ ] Onboard landlords personally (phone/screenshare)
- [ ] Watch first 2–3 bookings end-to-end
- [ ] Fix anything that breaks in real use
- [ ] Confirm transactional emails deliver (Resend)
- [ ] Confirm bond instructions are actionable

---

## Step 11–12 — Public push

Deferred until quiet go-live succeeds:

- [ ] DNS `quni.com.au` on Vercel
- [ ] Update production env URLs
- [ ] `robots.txt` sitemap line
- [ ] Google Search Console
- [ ] Outreach / SEO / social

---

## How Plan 1 and Plan 2 interlock

```text
                    ┌─────────────────────────────────┐
                    │  Shared (Plan 2 steps 1–5, 8)   │
                    │  password reset, refunds, ABN,  │
                    │  bond decision, Stripe live     │
                    └───────────────┬─────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
    ┌───────────┐           ┌───────────┐           ┌───────────┐
    │ NSW       │           │ QLD       │           │ VIC       │
    │ Plan 1:   │           │ Plan 1:   │           │ Plan 1:   │
    │ signing   │           │ Form 18a  │           │ Form 1    │
    │ re-verify │           │ verify    │           │ verify    │
    └─────┬─────┘           └─────┬─────┘           └─────┬─────┘
          │                         │                         │
          ▼                         ▼                         ▼
    ┌───────────┐           ┌───────────┐           ┌───────────┐
    │ G2 NSW    │           │ G2 QLD    │           │ G2 VIC    │
    │ inventory │           │ inventory │           │ inventory │
    └─────┬─────┘           └─────┬─────┘           └─────┬─────┘
          └─────────────────────────┼─────────────────────────┘
                                    ▼
                    ┌─────────────────────────────────┐
                    │  Quiet go-live (2–3 cycles)     │
                    └───────────────┬─────────────────┘
                                    ▼
                    ┌─────────────────────────────────┐
                    │  DNS + public push                │
                    └─────────────────────────────────┘
```

**Parallel work:** Plan 2 steps 1–3 (password reset, refunds, ABN) can start **immediately** while Plan 1 QLD/VIC form work runs.

**Serial dependency:** QLD/VIC G2 cannot pass until Plan 1 form verification completes.

---

## Explicitly deferred (not launch blockers)

| Item | Notes |
|------|-------|
| Quni Managed tier | Gated everywhere; "coming soon" is correct |
| Saved favourites | UI-only; documented in feature inventory |
| Xero integration | 501 stub in admin |
| Admin: tenancies, condition reports, search, notifications | Stubs |
| Footer phone number | Email works |
| Global 404 page | Unknown URLs render blank main |
| `PropertyDetailOriginal.tsx` | Orphan file |
| Chat `console.log` in production | Low priority polish |
| Admin student doc review UI | Only if manual verification becomes policy |
| WA/SA/TAS/ACT/NT subletting letters | Out of scope for 3-state launch |

---

## Progress snapshot (9 Jun 2026)

From [`listing-only-go-live-plan.md`](../listing-only-go-live-plan.md):

| Done | Not done |
|------|----------|
| Phase 1–2 code + DB flags | G2 test-mode E2E (all states) |
| G1 typecheck + tests | G3 live smoke test |
| Resend + DocuSeal infra | Stripe live flip |
| Platform staff / admin team | 3+ verified listings |
| Vercel test env | Password reset |
| | Refunds copy fix |
| | Bond #49 build |
| | QLD/VIC form verification |
| | DNS cutover |

**Typecheck:** `npx tsc -b --noEmit` passes (9 Jun 2026).

---

## Next actions (recommended)

1. **Today:** Refunds copy fix (10 min)
2. **This week:** Password reset + ABN in Business settings
3. **Parallel:** Plan 1 Stream 0 (DocuSeal signing audit per state) + QLD/VIC sample PDF review
4. **Decision:** Bond model (landlord-direct recommended)
5. **Then:** Per-state G2 → quiet go-live → DNS

See [`qld-vic-listing-parity-plan.md`](./qld-vic-listing-parity-plan.md) for state-specific form work.
