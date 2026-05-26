# Peer messaging — chunk 4 review

**Scope:** Dashboard entry points; deprecate enquiry reply path in product UI.

## Changes

| Area | Change |
|------|--------|
| `StudentDashboard.tsx` | Removed enquiries tab; overview links to `/messages`; `?tab=enquiries` → `/messages` |
| `LandlordDashboard.tsx` | Removed enquiries fetch/table/inline reply + AI draft; Messages link + unread badge; stats card → `/messages`; `?tab=enquiries` → `/messages` |
| `api/enquiries/reply.ts` | Deprecation comment (route retained) |

## Already in chunk 3

- `PropertyDetail` — Message landlord → conversation open
- `Header` — Messages nav + unread badge

## Manual smoke (optional)

1. `/student-dashboard?tab=enquiries` → lands on `/messages`.
2. `/landlord/dashboard?tab=enquiries` → lands on `/messages`.
3. Landlord dashboard **Messages** tab and stats card open inbox; no enquiry reply UI.

## Next: chunk 5

- `Booking.tsx` `conversationId`
- `confirm-booking` unlock + system messages
