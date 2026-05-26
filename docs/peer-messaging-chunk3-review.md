# Peer messaging — chunk 3 review

**Scope:** Inbox + thread UI, Realtime hooks, Header badge, PropertyDetail “Message landlord” entry.

## Routes

| Path | Page |
|------|------|
| `/messages` | `MessagesInboxPage` |
| `/messages/:conversationId` | `ConversationThreadPage` |

Both wrapped in `RequireUser`.

## Manual smoke test

1. Sign in as student → open listing → **Message landlord** → thread opens.
2. Send a message with a phone number → body shows `[contact hidden]` when thread not unlocked.
3. Second browser/tab as landlord → inbox shows unread badge → open thread → reply.
4. Header **Messages** badge updates after read (open thread marks read via API).

## Deferred to chunk 4+

- Dashboard enquiry tab links
- `Booking.tsx` `conversationId`
- `BookingActionBar` on thread
- Terms §3.3

**Stopped before chunk 4.**
