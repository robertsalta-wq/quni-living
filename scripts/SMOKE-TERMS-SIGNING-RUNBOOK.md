# Three-party terms → regenerate → signing smoke

## Scripts

```bash
# Discover (read-only)
node scripts/run-with-env.mjs node scripts/smoke-terms-signing-setup.mjs
# with: SMOKE_DISCOVER=1 SMOKE_LANDLORD_PROFILE_ID=<uuid>

# Preview (no writes)
BOOKING_ID=<uuid> node scripts/run-with-env.mjs node scripts/smoke-terms-signing-setup.mjs

# Execute against live prod (requires confirm)
SMOKE_CONFIRM_PROD_WRITE=1 BOOKING_ID=<uuid> \
  SMOKE_MINT_LANDLORD_SESSION=1 \
  node scripts/run-with-env.mjs node scripts/smoke-terms-signing-setup.mjs

# Or create disposable bond_pending booking then setup
SMOKE_CONFIRM_PROD_WRITE=1 SMOKE_CREATE_BOOKING=1 \
  SMOKE_PROPERTY_ID=... SMOKE_STUDENT_PROFILE_ID=... SMOKE_LANDLORD_PROFILE_ID=... \
  SMOKE_MINT_LANDLORD_SESSION=1 \
  node scripts/run-with-env.mjs node scripts/smoke-terms-signing-setup.mjs

# After human signs all three parties
node scripts/run-with-env.mjs node scripts/smoke-terms-signing-verify.mjs <bookingId>
```

## Pass criteria

`tenancy_documents.status = signed` with landlord + student + co_tenant timestamps, plus `booking_events.event_type = document.fully_signed`. No reconcile scripts.

## Inventory note (2026-07-22)

- Quinn NSW Ryde rooms are `private_room_landlord_on_site` → **occupancy** (skips co-tenant DocuSeal).
- Only NSW FT6600 listing (`8f68e6a0…` off-site) is **occupied** by a real active tenancy — do not displace.
- Free residential candidates were QLD Form18a / entire_property — valid for co-tenant residential package smoke.

## Passed smoke (2026-07-22)

| Field | Value |
|-------|--------|
| Booking | `1b07c4e6-245e-4c51-87ed-b7a5a769405c` |
| Submission | 167 |
| Package | `residential_tenancy_qld` |
| Doc | `6afcd6c7-6567-40be-a9a4-5d802982fa82` → `signed` |
| Parties | landlord + tenant + **Co-tenant** (submitters 283/284/285) |
| Events | `booking.terms_updated` → regenerate → `document.signature_recorded` × parties → `document.fully_signed` |
| Reconcile | **not used** |

Completion used DocuSeal API `PUT …/submitters/:id` with `completed: true` (browser optional); webhooks still updated `*_signed_at` including `co_tenant_signed_at`.

## Hard rule

If co-tenant submitter is missing or verify fails: **STOP**. Do not run `reconcile-historical-docuseal-signatures` or patch `*_signed_at`.
