# Occupancy pricing - chunk 7 review (QA / acceptance)

**Scope:** Automated coverage for plan §11 + manual smoke checklist before go-live.

**Automated:** `npm test -- --run api/lib/booking/occupancyAcceptance.test.ts` (and related suites below).

---

## §11 checklist

### Pricing

| Item | Automated | Manual |
|------|-----------|--------|
| Listing with no surcharges: $400 → $400 deposit | Yes - `occupancyAcceptance` + `resolveWeeklyRent` | Optional: one booking on a flat listing |
| Couple: 2 occupants → $500/wk on booking, PI, `weekly_rent` | Yes | Stripe + Supabase row after pay |
| Parking: +$50 only when selected and `parking_available` | Yes | Tick carpark on booking step 1 |
| Couple + parking: $550/wk | Yes | Full stack smoke |
| API rejects `occupantCount: 2` when `max_occupants = 1` | Yes | curl/Postman optional |
| API rejects `parkingSelected` when not offered | Yes | curl/Postman optional |
| Client tamper (wrong total) → server uses resolved rent | Yes - `assertPiMetadataMatchesOccupancy` | Attempt bad commit after PI (should fail) |

### Co-tenant

| Item | Automated | Manual |
|------|-----------|--------|
| 1 occupant: no `co_tenant` required | Yes | Booking UI: “Just me” |
| 2 occupants: commit blocked without valid `co_tenant` | Yes | Omit co-tenant fields → error |
| Landlord review shows co-tenant details | - | `/landlord/bookings/:id` → **Occupancy & rent** |
| NSW/QLD PDF includes second name | Yes - `occupancyLeaseFieldsFromBooking` | Visual: generated RTA PDF page 1 + signatures |
| `maxOccupantsPermitted` matches property `max_occupants` | Yes | PDF “Maximum occupants” line |
| `housemates_count` = 1 when 2 occupants | Yes - `housematesCountFromOccupantCount` | DB column on booking row |

### Regression

| Item | Automated | Manual |
|------|-----------|--------|
| Existing listings (null surcharges) book as today | Yes | Old listing E2E |
| Sole student profile + 1 occupant | - | Profile couple + book “Just me” |
| Listing E2E: accept → deposit → sign (primary tenant only) | - | Full landlord confirm + DocuSeal |

---

## Recommended test command (CI-local)

```bash
npm test -- --run \
  api/lib/booking/occupancyAcceptance.test.ts \
  api/lib/booking/occupancyBooking.test.ts \
  api/lib/booking/occupancyLeaseContext.test.ts \
  api/lib/pricing/resolveWeeklyRent.test.ts \
  src/lib/bookingFitSummary.test.ts \
  src/lib/pricing/listingRentDisplay.test.ts
```

---

## Manual go-live smoke (≈15 min)

1. **Landlord:** Edit listing → Pricing → set base $400, max 2, couple +$100, carpark +$50.
2. **Student:** Book for 2 + carpark → pay → confirm `weekly_rent = 550`, `co_tenant` populated.
3. **Landlord:** Open booking review → see breakdown + co-tenant block.
4. **Documents:** After confirm + bond received → download NSW/QLD package → co-tenant name on form; tenant (2) signature section present (name only in v1).
5. **Regression:** Book a listing with no surcharges → still $base only.

---

## Out of scope (v1.1)

- DocuSeal second submitter for co-tenant signature
- Search/filter by “from” price
