# Peer messaging - chunk 6 review

**Scope:** Cutover polish - freeze legacy enquiries path; document backfill.

## Database

| Item | Notes |
|------|--------|
| `20260527120000_peer_messaging.sql` (M11) | One-time backfill `enquiries` → `conversations` + messages; link `bookings.conversation_id` |
| `20260528120000_peer_messaging_enquiries_freeze.sql` | **Apply in Supabase** - revokes `INSERT` on `enquiries`; drops insert policies |

## App / API

| Area | Change |
|------|--------|
| `PropertyEnquiryForm.tsx` | No `enquiries` insert or `/api/enquiry-email`; sign-in / open messages only |
| `api/enquiry-email.ts` | `410 deprecated` for all POSTs |
| `AdminEnquiries.tsx` | Legacy banner + subtitle |

## Already done (chunks 1–5)

- `PropertyDetail` → Message landlord → conversations
- Dashboards redirect `?tab=enquiries` → `/messages`
- `api/enquiries/reply.ts` deprecated (chunk 4)
- `booking_messages` insert revoked (chunk 1 migration)

## Manual smoke (when a listing exists)

1. Apply **`20260528120000_peer_messaging_enquiries_freeze.sql`** in production if not yet run.
2. Signed-in student → listing → **Message landlord** → send message (not enquiry form).
3. Optional: confirm `INSERT` into `enquiries` fails from SQL editor as `authenticated`.

## Deferred

- Chunk 7: QA polish, “View full conversation” on landlord booking review
- Chunk 8: Admin conversation viewer
