# Findings: booking-review / listing-fee `card.brand` crash

**Date:** 2026-07-25  
**Mode:** Investigation only (no code fix, no PR, no schema/Stripe writes)  
**Source of suspicion:** Prior audit / handoff ([audit review](4b7265de-328b-40c1-8212-edf9b2e2e5ac)) — “Billing card render crash on null brand”

---

## Executive verdict

The unsafe read is **real** and **confirmed to throw**, but the crash site is **not** the landlord booking-review page. It lives in `formatStripeCardOnFile` (`src/lib/landlordListingBilling.ts`), used only on the **landlord Profile / Payouts & identity** surfaces.

With the **current** `/api/landlord-listing-billing-status` write path, a live landlord should not receive `{ brand: null }` — the API only returns `card` when both `brand` and `last4` are non-empty strings. Blast radius today is therefore a **latent render landmine** (plus any future/inconsistent client payload), not an active booking-review P0.

Confidence that a nullish `brand`/`card` **crashes the formatter:** **High** (reproduced).  
Confidence that **booking-review white-screens** because of this: **Low** (no call site on that page).  
Confidence that **production landlords are currently hitting it** via the live API: **Low** (API null-guards; no Vercel evidence in last 7d).

---

## 1. Unsafe read sites

Grep coverage: `src/`, `api/`, `supabase/functions/` for `.brand`, `.last4`, `.exp_month`, `.exp_year`, `.funding`.

| File:line | Surface / route | Null-guarded? | If missing |
|-----------|-----------------|---------------|------------|
| `src/lib/landlordListingBilling.ts:46` | Shared helper `formatStripeCardOnFile` | Partial — `(card.brand ?? '')` | Falls through brand switch |
| `src/lib/landlordListingBilling.ts:62–63` | Same helper (unknown-brand fallback) | **No** — `card.brand.trim()` | **Throws** `TypeError` if `brand` is `null`/`undefined`; throws reading `.brand` if `card` is `null` |
| `src/lib/landlordListingBilling.ts:65` | Same helper | Yes — `(card.last4 ?? '')` | Omits `•••• last4` |
| `src/components/landlord/LandlordDashboardProfileTab.tsx:711–714` | Landlord dashboard `?tab=profile` (desktop) — “Enabled · Visa •••• 4242” | Caller guards `hasPaymentMethod && card` before call; **does not** validate `card.brand` | If `card` truthy but `brand` nullish → throw during render → Sentry/App error boundary |
| `src/components/landlord/profileHub/LandlordMobileProfileTab.tsx:675–676` | Mobile profile hub payouts row | Same as above | Same |
| `src/components/landlord/profileHub/profileHubSections.ts:99–101` | Profile hub section summary for `payouts` | Same as above | Same |
| `api/landlord-listing-billing-status.js:145–165` | GET listing billing snapshot | **Yes** — type checks; `card` null unless both strings present | Returns `{ hasPaymentMethod: false, card: null }` |
| `src/lib/documents/quniDocumentPdfTheme.tsx:525` (+ compiled `api/documents/*`) | PDF theme style `brandQuni` | N/A — CSS class name, not Stripe | — |
| `.exp_month` / `.exp_year` / `.funding` | — | **No reads** in `src/` / `api/` / `supabase/functions/` | — |

**Not a call site:** `src/pages/landlord/LandlordBookingReviewPage.tsx` — uses `listingBilling` only for confirm gates (`hasPaymentMethod` / loaded flags). Copy says “saved payment method” / “$99” generically; **never** formats brand/last4.

**Confirm / webhook path:** `api/lib/booking/confirmListing.ts` uses `stripe_customer_id` + expanded `invoice_settings.default_payment_method` **id** for `paymentIntents.create`. It does **not** read `.brand` / `.card` fields for display or charge logic.

---

## 2. Lifecycle map — landlord listing-fee payment method

```text
[A SAVE]  Profile / booking-review “Add a card” modal
            → POST /api/landlord-stripe-payment-setup
               Stripe: customers.create (if needed)
               DB: landlord_profiles.stripe_customer_id = cus_…
               Stripe: setupIntents.create (usage=off_session, type=card)
            → Stripe.js confirmSetup
            → POST /api/landlord-stripe-setup-complete { setupIntentId }
               Stripe: setupIntents.retrieve
               Stripe: customers.update({ invoice_settings.default_payment_method: pm_… })
               DB: no card snapshot stored (only customer id already on profile)

[B STORE] landlord_profiles.stripe_customer_id  (text, Stripe Customer id only)
          Card brand/last4 are NOT persisted in Postgres.

[C FETCH] useLandlordBookingReview / LandlordDashboard
            → fetchLandlordListingBillingSnapshot()
            → GET /api/landlord-listing-billing-status
               Stripe: customers.retrieve(cus, expand: invoice_settings.default_payment_method)
               Optional: paymentMethods.retrieve(pm_id) if expand left an unexpanded id
               Response shape: { moduleEnabled, hasPaymentMethod, card: { brand, last4 } | null }
          Client re-parses body; accepts any object as `card` without validating brand/last4 strings.

[D CHARGE] POST /api/confirm-booking → confirmListing
            Stripe: customers.retrieve + default PM id
            Stripe: paymentIntents.create({ payment_method, off_session, confirm, amount })
            3DS: 402 + client_secret → client confirms → re-POST
            No .brand read.
```

**Shape note:** Live card details always come from a **full Stripe PaymentMethod retrieve/expand**, not a slim webhook payload or DB snapshot. Webhooks are not involved in rendering the on-file card label.

---

## 3. Tier-variation analysis — can a landlord reach booking review with no `card` object?

| Path | Can booking review load with no usable listing card? | Does UI crash? |
|------|------------------------------------------------------|----------------|
| **Quni Listing** (self-managed), never saved card | Yes — `hasPaymentMethod: false`, `card: null` | **No** — shows `listing_no_payment_method` banner + readiness gate “Confirm a billing card” |
| **Quni Listing**, card saved (Visa etc.) | `hasPaymentMethod: true`, `card: { brand, last4 }` | No crash; Profile shows “Enabled · …” |
| **Quni Managed** | Card not required for Managed confirm; billing gate omitted when `selectedConfirmTier !== 'listing'` | No formatter call on review |
| **Upgrade-to-Managed on accept** | Mid-flow tier switch uses Managed confirm path (Connect), not listing card charge | Review still may fetch billing snapshot; unused for Managed accept |
| **Fee-exempt landlord** | Card not required (`listingFeeExempt`) | Gate skipped |
| **Customer id set, default PM missing / non-card / detached** | API returns `hasPaymentMethod: false`, `card: null` | No crash on review; Profile omits card label |
| **Customer id set, PM.card null** (non-card PM) | Same — API treats as no payment method | No crash |
| **Inconsistent client payload** (`hasPaymentMethod: true` + `card: { brand: null, last4: '…' }`) | Only if fetch layer accepts it (it currently would) | **Profile / hub throw** — not booking-review |
| **Legacy DB “card fields null”** | N/A — no card columns in DB | Counts below are customer-id presence only |

**Root cause of the throw (code):** inconsistent null handling inside `formatStripeCardOnFile` — line 46 uses `?? ''`, lines 62–63 call `card.brand.trim()` unguarded on the unknown-brand branch. Also unguarded if `card` itself is null.

**Root cause of null `card` / empty brand in Stripe data (product):** normal for Managed-only landlords, incomplete SetupIntent, deleted/detached default PM, or non-card default PM. Current API already collapses those to `card: null`.

---

## 4. Evidence of real-world occurrence

### Logs / Sentry
- **Vercel runtime errors (7d):** no `TypeError` / `brand` clusters; only unrelated `url.parse` deprecation on `/api/pricing/[propertyTier]`.
- **Vercel runtime logs (1d / 7d):** no matches for `TypeError` / `brand` / `listing-billing` (retention also limited).
- **Sentry MCP:** connection timed out repeatedly during this investigation (`plugin-sentry-sentry`). Org expected: `quni` / project `javascript-react`. Manual check recommended: issues matching `TypeError` + `trim`/`brand` + `landlordListingBilling` or Profile route.

### Read-only DB (prod `cqakltqzqrxnmxfbqatx`) — counts only, no PII

Card brand/last4 are **not stored**. Proxy metric: `landlord_profiles.stripe_customer_id`.

| Metric | Count |
|--------|------:|
| Landlords total | 8 |
| With `stripe_customer_id` | 3 |
| Without customer id | 5 |
| `fee_exempt = true` | 4 |
| `stripe_charges_enabled = true` | 1 |
| Charges-enabled **and** no customer | 0 |
| Charges-enabled **with** customer | 1 |
| Not charges-enabled **with** customer | 2 |

By property `service_tier` (distinct landlords):

| Property tier | Landlords | With customer | Without |
|---------------|----------:|--------------:|--------:|
| `listing` | 3 | 2 | 1 |

Created-at (month):

| Month | Landlords created | With customer |
|-------|------------------:|--------------:|
| 2026-06 | 5 | 2 |
| 2026-05 | 3 | 1 |

Pending Listing booking-review exposure:

| Metric | Count |
|--------|------:|
| `pending_confirmation` Listing bookings | **0** |

**Blast-radius interpretation:** At most **3** landlords currently have a Stripe Customer for listing billing; none have a pending Listing accept screen. Without Stripe Dashboard inspection of each Customer’s default PM, we cannot count “PM present but `card.brand` empty” from SQL. Given the API’s dual-string gate, those 3 are unlikely to be serving a null-brand `card` object to the client today.

---

## 5. Repro result (test / controlled)

**Method:** In-browser / Node mirror of `formatStripeCardOnFile` (no Stripe writes, no booking constructed — booking-review does not invoke the formatter).

| Input | Result |
|-------|--------|
| `{ brand: null, last4: '4242' }` | **THREW** `TypeError: Cannot read properties of null (reading 'trim')` |
| `{ brand: undefined, last4: '4242' }` | **THREW** `TypeError: Cannot read properties of undefined (reading 'trim')` |
| `{ brand: '', last4: '4242' }` | OK → `Card •••• 4242` |
| `null` | **THREW** `TypeError: Cannot read properties of null (reading 'brand')` |
| `{ brand: 'visa', last4: '4242' }` | OK → `Visa •••• 4242` |
| `{ brand: 'foo', last4: '1111' }` | OK → `Foo •••• 1111` |

Screenshot from controlled browser repro: `page-2026-07-24T20-55-36-001Z.png` (Cursor temp screenshots).

**Booking-review with missing card (logical / code-path):** renders warning banner “Add a payment method to confirm” — **no throw**.  
**Profile with poisoned snapshot** (`hasPaymentMethod: true` + nullish `brand`): throw during render → top-level `Sentry.ErrorBoundary` fallback (“Something went wrong…”) — full-page error UI, not a partial strip.

---

## 6. Recommended minimal fix (do not implement until explicit go)

### Read-time (primary, small)
1. **`formatStripeCardOnFile`** — use the already-normalized `b` (or `(card?.brand ?? '').trim()`) in the unknown-brand branch; never call `card.brand.trim()` raw. Fallback label: `"Card"` or product copy **“your saved card”**.
2. Optional harden **`fetchLandlordListingBillingSnapshot`**: only accept `card` when `typeof brand === 'string' && typeof last4 === 'string'`; otherwise force `card: null` and `hasPaymentMethod: false` if either missing.
3. Call sites (3) already guard on `card` truthiness — keep; no need for more if (1)+(2) land.

Expected touch count: **1–2 files** (`landlordListingBilling.ts` ± tests), not 2–4 UI sites.

### Write-time (secondary, optional)
- API already safe; no change required for crash prevention.
- Optionally keep returning `hasPaymentMethod: true` when a default PM **id** exists even if brand/last4 missing (today those are linked) — product decision; if split, UI must not assume brand exists.

### Test plan
- Unit: `formatStripeCardOnFile` for `null`/`undefined`/`''` brand, null card, known brands, unknown brand.
- Unit: snapshot fetch normalizer rejects `{ brand: null, last4: '4242' }`.
- Manual: Profile with test Visa 4242 still shows `Visa •••• 4242`.
- Manual: Listing booking-review with no card shows add-card banner (no error boundary).
- Manual: Managed confirm path unchanged.

---

## 7. Other dangerous findings on the same path (noted, not fixed)

1. **Fee quote vs charge (prior audit item still relevant):** UI/booking-review hardcodes **$99** display in places; charge path uses `resolveListingPlatformFeeCents` / `DEFAULT_LISTING_FEE_CENTS = 9900`. Brief mentioned **$29** — that amount is **not** what current confirm/display code uses. Any future pricing-cell-driven quote still needs to stay wired to the charge amount.
2. **Client snapshot trust:** `fetchLandlordListingBillingSnapshot` trusts any JSON object as `card` — the gap that makes the formatter landmine reachable without an API bug.
3. **No booking-review card label:** if product wants “accepting will charge your Visa •••• 4242” on review, that copy does not exist yet — adding it without the formatter fix would expand blast radius onto the accept screen.
4. **Sentry visibility gap this session:** could not confirm/deny historical client events via MCP timeouts — worth a human pass in `quni` Sentry before prioritizing as P0 vs P2 landmine.

---

## Stop

No fix PR opened. Ready to implement the minimal read-time guard on explicit go.
