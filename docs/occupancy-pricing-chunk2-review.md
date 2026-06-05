# Occupancy pricing - chunk 2 review (booking API)

**Scope:** `POST /api/create-booking-payment-intent` - PI create + commit use `resolveWeeklyRent`; deposit = 1× resolved weekly rent; PI metadata scalars; commit stores occupancy snapshot + `co_tenant`.

**Prerequisite:** Chunk 1 migration applied; test property configured with surcharges (example below).

---

## Behaviour summary

| Step | Rent source |
|------|-------------|
| **Create PI** | `resolveWeeklyRent(property, { occupantCount, parkingSelected })` → `amount` = deposit + booking fee |
| **Commit** | Recomputes rent from body + property; must match PI `metadata` (`occupantCount`, `parkingSelected`, `weeklyRentCents`, `depositCents`) and `pi.amount` |
| **Booking row** | `weekly_rent`, `rent_breakdown`, `occupant_count`, `parking_selected`, `co_tenant`, `housemates_count` |

Legacy PaymentIntents (no `occupantCount` in metadata) are treated as **1 occupant, no parking**.

---

## Test property setup (SQL)

Run in Supabase SQL editor on a **draft/test** listing you can book:

```sql
update public.properties
set
  rent_per_week = 400,
  max_occupants = 2,
  couple_surcharge_per_week = 100,
  parking_surcharge_per_week = 50,
  parking_available = true,
  status = 'active'
where id = '<PROPERTY_UUID>';
```

Expected resolved rents:

| occupantCount | parkingSelected | weekly_rent | deposit (PI) |
|---------------|-----------------|-------------|--------------|
| 1 | false | 400 | 40000 cents |
| 2 | false | 500 | 50000 cents |
| 1 | true | 450 | 45000 cents |
| 2 | true | 550 | 55000 cents |

---

## Auth token

Sign in as a **student** in the app, then from browser devtools:

```js
const { data } = await window.supabase.auth.getSession()
copy(data.session.access_token)
```

Or Supabase Dashboard → Authentication → user → impersonate / magic link.

Set:

```bash
export SITE_URL="https://quni-living.vercel.app"
# or http://localhost:5173 with vercel dev / API proxy
export API_BASE="${SITE_URL}"
export TOKEN="<access_token>"
export PROPERTY_ID="<uuid>"
```

For local API only (Vercel dev on :3000):

```bash
export API_BASE="http://localhost:3000"
```

---

## 1. Create PaymentIntent - sole occupant ($400)

```bash
curl -sS -X POST "${API_BASE}/api/create-booking-payment-intent" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"propertyId\": \"${PROPERTY_ID}\",
    \"moveInDate\": \"2026-06-15\",
    \"leaseLength\": \"6 months\",
    \"bondAcknowledged\": true,
    \"occupantCount\": 1,
    \"parkingSelected\": false
  }" | jq
```

**Expect:** `depositCents` = 40000, `weeklyRent` = 400, `breakdownAud` = `{ "base": 400 }`, `clientSecret`, `paymentIntentId`.

---

## 2. Create PI - couple + parking ($550)

```bash
curl -sS -X POST "${API_BASE}/api/create-booking-payment-intent" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"propertyId\": \"${PROPERTY_ID}\",
    \"moveInDate\": \"2026-06-15\",
    \"leaseLength\": \"6 months\",
    \"bondAcknowledged\": true,
    \"occupantCount\": 2,
    \"parkingSelected\": true
  }" | jq
```

**Expect:** `depositCents` = 55000, `weeklyRent` = 550, `breakdownAud` includes `base`, `couple`, `parking`.

Complete card auth in Stripe test mode (clientSecret) before commit - PI status must be `requires_capture`.

---

## 3. Commit booking (after Stripe authorisation)

Use `paymentIntentId` from step 2 and the **same** occupancy fields + `coTenant`:

```bash
export PI_ID="pi_..."
curl -sS -X POST "${API_BASE}/api/create-booking-payment-intent" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"commit\": true,
    \"paymentIntentId\": \"${PI_ID}\",
    \"propertyId\": \"${PROPERTY_ID}\",
    \"moveInDate\": \"2026-06-15\",
    \"leaseLength\": \"6 months\",
    \"bondAcknowledged\": true,
    \"rentPaymentMethod\": \"bank_transfer\",
    \"occupantCount\": 2,
    \"parkingSelected\": true,
    \"coTenant\": {
      \"full_name\": \"Jane Smith\",
      \"email\": \"jane.partner@example.com\",
      \"phone\": \"+61400111222\",
      \"date_of_birth\": \"2001-05-20\"
    }
  }" | jq
```

**Expect:** `{ "ok": true, "bookingId": "<uuid>" }`

**Verify in DB:**

```sql
select id, weekly_rent, occupant_count, parking_selected, rent_breakdown, co_tenant, housemates_count, deposit_amount
from public.bookings
where id = '<bookingId>';
```

- `weekly_rent` = 550  
- `occupant_count` = 2, `housemates_count` = 1  
- `rent_breakdown` → `{"base":400,"couple":100,"parking":50}`  
- `co_tenant` populated  

---

## 4. Negative tests

### 4a. Couple on max_occupants = 1 listing

```bash
# After: update properties set max_occupants = 1 where id = ...
curl -sS -X POST "${API_BASE}/api/create-booking-payment-intent" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"propertyId\":\"${PROPERTY_ID}\",\"moveInDate\":\"2026-06-15\",\"leaseLength\":\"6 months\",\"bondAcknowledged\":true,\"occupantCount\":2}" | jq
```

**Expect:** `400`, `error`: `occupants_exceed_max`

### 4b. Parking when not available

```bash
# parking_available = false on property
curl -sS -X POST ... -d '{ ..., "parkingSelected": true }' | jq
```

**Expect:** `400`, `error`: `parking_not_available`

### 4c. Commit without coTenant (2 occupants)

**Expect:** `400`, `error`: `co_tenant_required`

### 4d. Commit occupancy mismatch vs PI

Create PI with `occupantCount: 1`, authorise, then commit with `occupantCount: 2`.

**Expect:** `400`, `error`: `payment_occupancy_mismatch` (PI released)

### 4e. Commit coTenant when sole occupant

**Expect:** `400`, `error`: `co_tenant_not_allowed`

---

## Postman

Import as two requests on collection **Occupancy pricing chunk 2**:

| Request | Method | URL | Body |
|---------|--------|-----|------|
| Create PI (sole) | POST | `{{API_BASE}}/api/create-booking-payment-intent` | §1 JSON |
| Create PI (couple+parking) | POST | same | §2 JSON |
| Commit booking | POST | same | §3 JSON (`commit: true`) |

Collection variables: `API_BASE`, `TOKEN`, `PROPERTY_ID`, `PI_ID`.

---

## Stripe dashboard checks

After create PI (couple + parking), open PaymentIntent in Stripe test mode:

- **Amount** = depositCents + bookingFeeCents (e.g. 55000 + fee)  
- **Metadata:** `occupantCount` = `2`, `parkingSelected` = `true`, `weeklyRentCents` = `55000`, `depositCents` = `55000`  

---

## Not in chunk 2

- `Booking.tsx` UI (still sends old body - use curl until chunk 3)  
- Landlord form surcharges  
- Lease PDF co-tenant names  

---

## Files changed

| File | Role |
|------|------|
| `api/lib/booking/occupancyBooking.js` | Parse body, co-tenant validation, PI metadata match |
| `api/lib/booking/occupancyBooking.test.ts` | Unit tests |
| `api/create-booking-payment-intent.js` | Wired create + commit |

---

## Next: chunk 3

Booking UI combined step + pass `occupantCount` / `parkingSelected` / `coTenant` on create and commit.
