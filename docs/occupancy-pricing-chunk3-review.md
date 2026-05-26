# Occupancy pricing — chunk 3 review (booking UI)

**Scope:** `Booking.tsx` — combined occupancy step on **Details (step 1)**; create PI + commit payloads wired.

**Depends on:** Chunk 1 (DB) + chunk 2 (API) on production.

---

## What to test (manual smoke)

1. Configure a listing with `max_occupants = 2`, base $400, couple +$100, parking +$50, `parking_available = true`.
2. Open **Request to book** as a student.
3. On step **1. Details**:
   - Section **Who will be living here?** appears after lease length.
   - Select **Two of us** → co-tenant fields appear.
   - Tick **Include carpark** → weekly rent summary shows $550.
   - **Booking summary** and header rent reflect $550.
4. Complete steps 2–3 (rent method, bond).
5. **Continue to payment** → Stripe amount = 1 week at **$550** (+ platform fee if any).
6. Pay (test card) → booking row: `weekly_rent = 550`, `occupant_count = 2`, `co_tenant` json populated.

**Sole occupant:** Select **Just me** → $400 (or $450 with parking only).

**Profile prefill:** Student with `occupancy_type = couple` should default to 2 occupants.

**Email warning:** Co-tenant email same as student → amber note (non-blocking).

---

## Draft persistence

Local draft key `booking_draft_{propertyId}` is now **v3** and stores `occupantCount`, `parkingSelected`, `coTenantForm`.

---

## Not in chunk 3

- Landlord form surcharges (chunk 4)
- Property card / detail “From $X” (chunk 4)
- Lease PDF co-tenant names (chunk 6)

---

## Files

| File | Change |
|------|--------|
| `src/components/booking/BookingOccupancySection.tsx` | UI + client validation |
| `src/pages/Booking.tsx` | State, `resolveWeeklyRent` display, API payloads |
