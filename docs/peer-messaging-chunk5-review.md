# Peer messaging - chunk 5 review

**Scope:** Wire bookings to conversations; unlock contact on landlord confirm.

## Changes

| Area | Change |
|------|--------|
| `api/lib/messaging/bookingConversation.js` | Link booking ↔ conversation on commit; `booking_requested` system message; unlock + `contact_unlocked` on confirm |
| `api/create-booking-payment-intent.js` | Accept optional `conversationId` on commit |
| `api/lib/booking/confirmListing.ts` | Unlock conversation after successful Listing fee + `bond_pending` |
| `api/lib/booking/confirmManaged.ts` | Unlock conversation after managed `confirmed` |
| `api/confirm-booking.ts` | Load `landlord_profiles.user_id` for system message attribution |
| `src/pages/Booking.tsx` | Read `?conversationId=` and pass through on booking commit |

## Flow

1. Student books from thread (`/booking/:propertyId?conversationId=…`) → commit sets `bookings.conversation_id`, `conversations.booking_id`, system line **Booking requested**.
2. Landlord confirms (Listing $99 success or Managed accept) → `contact_unlocked_at` set, system line **Contact details unlocked**.

## Manual smoke

1. Open thread → **Request to book** → complete deposit → thread shows booking requested.
2. Landlord confirms → both sides see unlock banner + contact actions; PII in older messages unmasked in UI.

## Next: chunk 6

- Cutover polish; hide legacy enquiry form everywhere
