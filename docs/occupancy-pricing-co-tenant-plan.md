# Occupancy pricing & co-tenant on lease — implementation plan

**Status:** Chunk 4 landed on `main` (landlord form + listing display). Remaining: landlord booking review UI, lease/PDF co-tenant (chunk 6), fit/search polish.  
**Last updated:** 26 May 2026  
**Stack:** Supabase (Postgres + RLS) + Vercel API routes + React app + existing PDF/DocuSeal pipeline

**Motivating example:** Single room, queen bed, max 2 occupants — **$400/wk** (1 person), **+$100/wk** (2 people / couple), **+$50/wk** optional carpark.

**Related:** `docs/listing-only-go-live-plan.md` (Listing tier go-live), `docs/dual-tier-service-model.md` (fees vs rent).

---

## 1. Locked product rules (reference)

| Rule | Decision |
|------|----------|
| Base rent | `properties.rent_per_week` = **1-person** weekly rent (search/display “from” price) |
| Couple surcharge | Optional `couple_surcharge_per_week`; applies when booking selects **2 occupants** |
| Parking surcharge | Optional `parking_surcharge_per_week`; **`parking_available` is source of truth**; landlord form syncs Parking **feature** tick |
| Max occupants | `max_occupants` on property (default **1** when null for backward compat) |
| Booking source of truth | **Booking** stores `occupant_count`, `parking_selected`, resolved `weekly_rent` — not profile `occupancy_type` alone |
| Server validation | API recomputes rent; never trusts client total |
| Deposit | **1 week** of resolved `weekly_rent` at PI create/commit (unchanged formula) |
| Bond | **Manual** on listing; helper text suggests **4× max weekly rent** (base + surcharges); no auto-recalc in v1 |
| Co-tenant email | May match primary student email — **soft warning in UI**, do not block |
| NSW FT6600 co-tenant | **Alignment** with prescribed form (signatures + parties), not a new legal concept — see §8.2 |
| PI / commit data | Scalars on PI metadata; **co-tenant on commit body** (see §6.3) |
| Co-tenant identity | When `occupant_count = 2`, collect **co-tenant** details on booking; snapshot on `bookings` |
| Co-tenant signing | **v1:** names on PDF; **one** DocuSeal tenant submitter (primary student). **v1.1:** second submitter for co-tenant signature |
| Profile `occupancy_type` | Prefill/hint only; fit checks use booking snapshot once booked |
| Listing tier | Full flow for **Listing** (deposit + bank rent). **Managed** subscription uses resolved `weekly_rent` at confirm; no separate line items in v1 |
| Backward compat | Null surcharges / `max_occupants` null → behaves like today (single rent, 1 occupant) |

---

## 2. Problem statement (today)

| Gap | Current behaviour |
|-----|-------------------|
| Single rent | One `rent_per_week`; booking copies it to `weekly_rent` |
| Couple / parking | Description-only; lease and deposit ignore surcharges |
| Second person on lease | Only **booking student** `student_profiles` → one `tenant` block |
| `housemates_count` | Column exists on `bookings` but **never set**; RTA `maxOccupantsPermitted` uses `(housemates_count ?? 1) + 1` |
| `additionalTenantNames` | QLD Form 18a supports tenant 2/3; generators pass **`[]`** |
| NSW FT6600 (live PDF) | Tenant (1) + one signature block only |
| DocuSeal | Landlord + **one** tenant email |

---

## 3. Data model

### 3.1 `properties` (new columns)

| Column | Type | Notes |
|--------|------|--------|
| `max_occupants` | integer | Check `>= 1` and `<= 10`; default **1** for existing rows via migration |
| `couple_surcharge_per_week` | numeric(10,2) null | Null = no couple pricing |
| `parking_surcharge_per_week` | numeric(10,2) null | Null = no paid parking option |
| `parking_available` | boolean not null default false | Landlord toggle; can align with Parking **feature** in UI |

**Display rule:** If `couple_surcharge_per_week > 0` or `parking_surcharge_per_week > 0`, show **“From $X/wk”** on cards/detail with breakdown in pricing section.

### 3.2 `bookings` (new columns)

| Column | Type | Notes |
|--------|------|--------|
| `occupant_count` | integer not null default 1 | Check `>= 1` and `<= properties.max_occupants` (enforced in API) |
| `parking_selected` | boolean not null default false | Only valid if property offers parking |
| `weekly_rent` | *(existing)* | **Resolved total** at commit (base + surcharges) |
| `rent_breakdown` | jsonb null | e.g. `{ "base": 400, "couple": 100, "parking": 50 }` for audit/UI |
| `housemates_count` | *(existing)* | Set to `occupant_count - 1` on commit (wire up RTA max occupants) |
| `co_tenant` | jsonb null | When `occupant_count = 2`; see §3.3 |

**Deprecate implicit behaviour:** Stop using `(housemates_count ?? 1) + 1` without setting `housemates_count`.

### 3.3 `bookings.co_tenant` shape (jsonb)

```json
{
  "full_name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+61400000000",
  "date_of_birth": "2002-05-15"
}
```

| Field | Required when 2 occupants |
|-------|---------------------------|
| `full_name` | Yes |
| `email` | Yes (for future co-signer; v1 PDF only) |
| `phone` | Yes |
| `date_of_birth` | Yes (RTA / bond identity) |

Optional v1.1: `emergency_contact_name`, `emergency_contact_phone`.

### 3.4 No new tables in v1

Co-tenant is a booking snapshot, not a second `student_profiles` row (partner may not have a Quni account).

---

## 4. Shared rent resolver

**Module:** `api/lib/pricing/resolveWeeklyRent.js` (+ mirror `src/lib/pricing/resolveWeeklyRent.ts` or shared import path used by both).

```ts
resolveWeeklyRent(property, { occupantCount, parkingSelected })
  → { weeklyRent, breakdownCents, breakdownAud }
```

| Input | Logic |
|-------|--------|
| Base | `rent_per_week` |
| Couple | If `occupantCount >= 2` and `couple_surcharge_per_week` set, add surcharge; if `occupantCount >= 2` and `max_occupants < 2`, **400** |
| Parking | If `parkingSelected` and `parking_available` and `parking_surcharge_per_week` set, add surcharge |
| Cap | `occupantCount` must not exceed `max_occupants` |

**Unit tests:** sole/couple/parking combos; null surcharges; max_occupants enforcement.

---

## 5. Migrations — apply order

Single file e.g. `supabase/migrations/20260530120000_occupancy_pricing_co_tenant.sql`:

| Step | Content |
|------|---------|
| **M1** | `properties`: add columns + checks + comments |
| **M2** | Backfill `max_occupants = 1` where null; set not null with default 1 |
| **M3** | `bookings`: add `occupant_count`, `parking_selected`, `rent_breakdown`, `co_tenant`; backfill existing bookings `occupant_count = 1`, `parking_selected = false` |
| **M4** | Optional: backfill `housemates_count = 0` on existing bookings |
| **M5** | Grants unchanged (RLS via existing booking policies) |

**Post-apply:** regenerate `src/lib/database.types.ts`.

---

## 6. API changes

### 6.1 `POST /api/create-booking-payment-intent`

**Create PI** body adds:

```json
{
  "occupantCount": 1,
  "parkingSelected": false,
  "coTenant": null
}
```

When `occupantCount === 2`, require `coTenant` object on **commit** (and create PI request for amount validation).

| Step | Change |
|------|--------|
| Load property | Include new pricing columns |
| Validate | `occupantCount <= max_occupants`; parking only if available |
| Amount | `depositCents = resolveWeeklyRent(...).weeklyRentCents` |
| PI metadata | **Scalars only** (fits Stripe limits): `occupantCount`, `parkingSelected`, `depositCents`, `weeklyRentCents` (+ existing keys). **Do not** put full `co_tenant` JSON in one metadata value |

**Commit** body (authoritative for co-tenant):

- Re-send `occupantCount`, `parkingSelected`, `coTenant` (when 2 occupants)
- Server recomputes rent; verifies `depositCents` on PI matches resolved rent for those scalars
- Insert booking: `weekly_rent`, `rent_breakdown`, `occupant_count`, `parking_selected`, `co_tenant`, `housemates_count = occupant_count - 1`

### 6.3 Stripe metadata limits (verified)

Stripe: **40 chars per key**, **500 chars per value**, 50 keys max ([metadata docs](https://docs.stripe.com/metadata)).

| Approach | Verdict |
|----------|---------|
| Single `co_tenant` JSON in metadata | **Risky** — typical payload ~180–350 chars (fits one value), but brittle if fields grow; prefer not |
| Split keys (`coTenantName`, `coTenantEmail`, …) | OK for PI snapshot; still redundant with commit body |
| **Commit body + PI scalars** | **Preferred** — matches today (commit already re-posts `moveInDate`, `leaseLength`, etc.) |
| `booking_drafts` table keyed by `payment_intent_id` | Fallback only if we need pre-payment persistence across sessions |

**Do not** rely on metadata alone for co-tenant identity at commit.

### 6.2 Other API touchpoints (read resolved rent)

| File | Change |
|------|--------|
| `api/lib/booking/confirmManaged.ts` | Subscription amount from `booking.weekly_rent` (already) — ensure commit set it |
| `api/lib/docusealLeasePrefill.js` | Optional `tenant_2_*` keys when `co_tenant` present |
| `api/documents/generate-*.ts` | Pass `additionalTenantNames`, `maxOccupantsPermitted` from booking + property |
| `api/lib/bookingFitForAssessment.ts` | Couple + `max_occupants >= 2` → **match** for single room |
| `api/ai/student-assessment.ts` | Include booking occupancy + rent breakdown when present |

---

## 7. Frontend changes

### 7.1 Landlord — `LandlordPropertyFormPage.tsx`

New subsection under **Pricing**:

- Max occupants (1–2 for v1 UI; validate up to 10 in DB)
- Couple surcharge ($/wk), optional
- Parking available + parking surcharge ($/wk)
- Helper: “Leave surcharges empty if not offered”

### 7.2 Student — `PropertyDetail.tsx` / `PropertyCard.tsx`

- Show **From $X/wk** when surcharges exist
- Pricing breakdown text: “$400 (1 person) · +$100 second person · +$50 carpark”

### 7.3 Student — `Booking.tsx`

**Single combined step** (before payment), after move-in / lease length — not separate steps:

1. **How many people will live here?** — 1 / 2 (disable 2 if `max_occupants < 2`)
2. **Co-tenant details** (conditional, inline when 2 selected): name, email, phone, DOB
3. **Include carpark?** (conditional checkbox when `parking_available`)
4. **Rent summary** line items → total → existing deposit + fee display

Prefill: if profile `occupancy_type === 'couple'`, pre-select 2 occupants (editable).

**Co-tenant email:** if same as logged-in student email, show non-blocking warning (“Co-tenant email matches your account — partner may not receive a separate copy”).

### 7.4 Landlord — `LandlordBookingReviewPage.tsx`

Show: occupant count, parking, rent breakdown, co-tenant contact block.

### 7.5 Student profile

No requirement to add partner fields in v1; optional later for prefill.

---

## 8. Lease & signing

### 8.1 PDF generators

| Document | v1 change |
|----------|-----------|
| `generate-residential-tenancy.ts` (NSW) | `additionalTenantNames: [co_tenant.full_name]`; `maxOccupantsPermitted: property.max_occupants` |
| `generate-qld-residential-tenancy.ts` | Same + Form 18a tenant 2 schedule lines |
| `generate-lease.ts` / QLD occupancy | Second named occupant in schedule or special conditions: “Co-occupant: {name}, DOB …” |
| `docusealLeasePrefill.js` | Map `tenant_2_full_name`, `tenant_2_email`, etc. |

### 8.2 NSW FT6600 — alignment, not invention

**Prescribed form (FT6600 Dec 2025 extraction, `docs/ft6600-2025-12-17.txt`):**

- Signature section includes **SIGNED BY THE TENANT (1–4)** with “Name of tenant:” / “Signature of tenant:” for each.
- Our **legacy** `NswResidentialTenancyAgreement_legacy.tsx` already rendered Tenant (2–4) in the parties table and tenant (2–4) signature blocks.

**Current gap:** live `NswResidentialTenancyAgreement.tsx` regressed — schedule shows **Tenant Name (1)** only and signatures stop at tenant (1).

| Work | Type |
|------|------|
| Restore tenant (2) signature block + name from `additionalTenantNames[0]` | **Alignment** with prescribed FT6600 |
| Restore parties-row Tenant (2) if published schedule page includes it | **Alignment** (verify against PDF page 1 once before chunk 6) |
| Special-conditions-only fallback | **Not** default if signatures exist on form |

**Locked:** Option **B** = restore/port multi-tenant blocks from legacy + extraction, not design a new agreement shape.

### 8.3 DocuSeal (phased)

| Phase | Behaviour |
|-------|-----------|
| **v1** | Primary student signs as tenant; co-tenant named on PDF; co-tenant receives informational email optional |
| **v1.1** | Third submitter `co_tenant` with own signature fields on RTA/addendum |

---

## 9. Fit assessment & search (secondary)

| Area | Change |
|------|--------|
| `bookingFitForAssessment.ts` | `occupancyMatch`: if property `max_occupants >= 2`, couple + single room → **match** |
| `useListingsQuery` / SEO | v1.1: filter/sort by base rent; “from” display only in v1 |
| `propertySeo.ts` | Mention “from $X” in meta when surcharges set |

---

## 10. Build sequence (calendar estimate)

One full-stack dev, includes QA. **~4–6 days** total.

| Chunk | Days | Deliverables |
|-------|------|----------------|
| **0. Spec lock** | 0.25 | This doc + product sign-off on DocuSeal v1 (name-only co-tenant) |
| **1. DB + types** | 0.5 | Migration, `database.types.ts`, `resolveWeeklyRent` + tests |
| **2. API booking** | 1.0 | `create-booking-payment-intent` validate + commit snapshot |
| **3. Booking UI** | 1.0 | Occupancy step, co-tenant form, rent summary |
| **4. Landlord form + listing display** | 0.75 | Property form fields; card/detail “from” pricing |
| **5. Review + fit** | 0.5 | Landlord review; `bookingFitForAssessment` |
| **6. Documents** | 1.0 | RTA/occupancy generators + prefill; NSW tenant 2 if option B |
| **7. QA** | 0.5–1.0 | E2E matrix below; regression single-occupant listings |

**Optional +1 day:** DocuSeal co-tenant submitter (v1.1).  
**Optional +0.5 day:** Search “from” price filters.

---

## 11. Testing checklist (acceptance)

### Pricing

- [ ] Listing with no surcharges: booking unchanged ($400 → $400 deposit)
- [ ] Couple surcharge: 2 occupants → $500/wk on booking, PI, `weekly_rent`
- [ ] Parking: +$50 only when selected and `parking_available`
- [ ] Couple + parking: $550/wk
- [ ] API rejects `occupantCount: 2` when `max_occupants = 1`
- [ ] API rejects `parkingSelected: true` when parking not offered
- [ ] Client tamper (wrong total) → server uses resolved rent

### Co-tenant

- [ ] 1 occupant: no `co_tenant` required
- [ ] 2 occupants: commit blocked without valid `co_tenant`
- [ ] Landlord review shows co-tenant details
- [ ] NSW/QLD PDF includes second name where implemented
- [ ] `maxOccupantsPermitted` matches property `max_occupants`
- [ ] `housemates_count` = 1 when 2 occupants

### Regression

- [ ] Existing active listings (null surcharges) book as today
- [ ] Sole student profile + 1 occupant booking
- [ ] Listing E2E: accept → deposit → sign (primary tenant only in v1)

---

## 12. Out of scope (v1)

- Second Quni account / login for co-tenant
- Per-person bond split or separate bond lodgements
- Stripe line items for parking (single weekly rent total is enough)
- Homestay / student_house multi-room pricing matrices
- Admin UI to edit occupancy surcharges in bulk
- Co-tenant DocuSeal signature (v1.1)
- Automatic bond recalculation from resolved rent

---

## 13. Locked decisions (26 May 2026 — review pass)

| # | Decision |
|---|----------|
| 1 | NSW FT6600: **restore** tenant (2) blocks per prescribed form / legacy — not “extend” with new fields |
| 2 | Co-tenant email may equal primary — **warn, don’t block** |
| 3 | `parking_available` source of truth; form syncs Parking feature |
| 4 | Bond manual + helper “4× max weekly rent” |
| 5 | Booking UI: **one** combined occupancy + co-tenant + parking step |
| 6 | PI metadata: **scalars only**; co-tenant on **commit body** |
| 7 | Chunk 1 lands alone for review before chunk 2 (same as messaging) |

---

## 14. Open questions (remaining)

| # | Question | Notes |
|---|----------|--------|
| 1 | FT6600 page-1 schedule: does published PDF list Tenant Name (2) on “Between” page? | Signatures confirmed; quick visual check before chunk 6 |
| 2 | DocuSeal v1.1 timing for second submitter | Names on PDF in v1 |

---

## 15. Example configuration (Casa Malvina–style room)

| Field | Value |
|-------|-------|
| `rent_per_week` | 400 |
| `max_occupants` | 2 |
| `couple_surcharge_per_week` | 100 |
| `parking_available` | true |
| `parking_surcharge_per_week` | 50 |
| `room_type` | single |
| Description | Queen bed; max 2; pricing as per booking summary |

---

## Related docs

- `docs/listing-only-go-live-plan.md` — G2 E2E after implementation
- `docs/dual-tier-service-model.md` — platform fees vs weekly rent
- `supabase/migrations/20260409120000_residential_tenancy_package.sql` — `housemates_count` origin
