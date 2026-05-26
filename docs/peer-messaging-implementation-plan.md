# Peer messaging — implementation plan

**Status:** Chunks 1–6 implemented in repo; apply `20260528120000_peer_messaging_enquiries_freeze.sql` in Supabase for cutover. Decisions locked 25 May 2026.  
**Stack:** Supabase (Postgres + RLS + Realtime) + Vercel API routes + existing React app.

**Note:** `booking_messages` already exists for post-booking review (`LandlordBookingReviewPage`). This plan adds **pre-booking** `conversations` / `conversation_messages` and **unifies the UX** into one thread through booking; legacy `booking_messages` remain readable, new post-booking chat uses the conversation thread when `booking_id` is set.

---

## 1. Locked product rules (reference)

| Rule | Decision |
|------|----------|
| Auth | Sign-in required to open/send |
| Thread key | One conversation per `(property_id, tenant_user_id)` |
| Personas | Same UX for student + professional (`student_profiles`) |
| Unmask | On booking **accepted** + Listing **fee success**; Managed accept unlocks without $99 |
| Masking | Full `body` stored; mask in UI/API for participants until unlock |
| Admin | `is_platform_admin()` **SELECT all** on conversations/messages/mask events from day one |
| Mask logs | `message_contact_mask_events`; use **`content_dedup_hash`** for dedup stats only (not positioned as privacy) |
| Terms | New §3.3 off-platform circumvention + consequences |
| Location | Listing stays suburb-level; unmask = **contact**, not map pin (no street map in v1) |

---

## 2. Data model (tables)

### 2.1 `conversations`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `property_id` | uuid FK → `properties` | |
| `landlord_profile_id` | uuid FK → `landlord_profiles` | |
| `landlord_user_id` | uuid FK → `auth.users` | Denormalized for RLS |
| `tenant_user_id` | uuid FK → `auth.users` | |
| `tenant_profile_id` | uuid FK → `student_profiles` nullable | Set when tenant has profile |
| `booking_id` | uuid FK → `bookings` nullable | Set when booking requested/created |
| `status` | text | `open` \| `archived` |
| `contact_unlocked_at` | timestamptz null | Set by confirm-booking success |
| `last_message_at` | timestamptz | Inbox sort |
| `last_message_preview` | text | Snippet (masked text for preview if still locked) |
| `landlord_last_read_at` | timestamptz | Unread for landlord |
| `tenant_last_read_at` | timestamptz | Unread for tenant |
| `created_at` | timestamptz | |

**Constraints:** `UNIQUE (property_id, tenant_user_id)`

### 2.2 `conversation_messages`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `conversation_id` | uuid FK | |
| `sender_user_id` | uuid FK → `auth.users` nullable | **Required** when `kind = 'user'`. **Nullable** when `kind = 'system'` (e.g. auto-archive has no actor; `booking_accepted` may set landlord user id) |
| `sender_role` | text | `tenant` \| `landlord` \| `system` |
| `kind` | text | `user` \| `system` |
| `body` | text | Full submitted text (admin reads via RLS) |
| `metadata` | jsonb | System events: `{ "event": "booking_requested", "bookingId": "..." }` |
| `created_at` | timestamptz | |

**No** duplicate masked body column — mask at read time in app/API for non-admin when `contact_unlocked_at` is null.

### 2.3 `message_contact_mask_events`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `conversation_id` | uuid FK | |
| `message_id` | uuid FK | |
| `sender_user_id` | uuid FK | For repeat-offender admin views |
| `mask_type` | text | `phone` \| `email` \| `url` \| `social` |
| `match_count` | int | Hits of that type in message |
| `content_dedup_hash` | text | Dedup stats only — **not** privacy-preserving |
| `created_at` | timestamptz | |

### 2.4 Optional column on `bookings`

- `conversation_id` uuid FK nullable — links booking pipeline to the same thread.

### 2.5 Relationship to existing `enquiries` / `booking_messages`

| Legacy | v1 strategy |
|--------|-------------|
| `enquiries` | **Hard cutover:** one-time backfill → `conversations` + messages; **no dual-write**. New traffic uses conversations API only. Rows with `student_id` null (anonymous) are **not** backfilled — historical only in `enquiries`. |
| `booking_messages` | **Freeze inserts at cutover** (RLS: read-only for participants). Legacy rows readable; new post-booking chat uses `conversation_messages` when `bookings.conversation_id` set |

---

## 3. Migrations — apply order

Apply in Supabase SQL Editor (or single migration file `YYYYMMDDHHMMSS_peer_messaging.sql`) in this order:

| Step | Migration content |
|------|-------------------|
| **M1** | Ensure `public.is_platform_admin()` exists (already in `admin_rls_policies.sql`; no-op if present) |
| **M2** | `conversations` table + indexes: `(property_id, tenant_user_id)` unique, `(landlord_user_id, last_message_at desc)`, `(tenant_user_id, last_message_at desc)`, `(booking_id)` partial |
| **M3** | `conversation_messages` table + index `(conversation_id, created_at)` |
| **M4** | `message_contact_mask_events` table + indexes `(conversation_id, created_at)`, `(sender_user_id, created_at)` |
| **M5** | `bookings.conversation_id` nullable FK → `conversations` |
| **M6** | RLS enable + policies (see §4) |
| **M7** | Grants: `authenticated` SELECT/INSERT on messages where policies allow; no tenant access to mask_events |
| **M8** | Realtime: `alter publication supabase_realtime add table conversation_messages` (and optionally `conversations` for inbox list updates) |
| **M9** | Backfill SQL (one-time): from `enquiries` → `conversations` + first message; link `reply` as second message if present |
| **M10** | `platform_config` row `contact_masking_enabled` = true (if table exists; else skip) |

**Post-apply:** `supabase gen types` → update `src/lib/database.types.ts`.

---

## 4. RLS policies (summary)

### `conversations`

| Operation | Who |
|-----------|-----|
| SELECT | Landlord where `landlord_user_id = auth.uid()`; tenant where `tenant_user_id = auth.uid()`; **admin** `is_platform_admin()` |
| INSERT | Tenant or landlord participant only via RPC/API (service role) or policy: tenant creates on property message; landlord cannot create empty threads |
| UPDATE | Participants: `last_read_*` only; service role / admin: broader; **unlock** only service role (from `confirm-booking`) |

### `conversation_messages`

| Operation | Who |
|-----------|-----|
| SELECT | Same participant check as parent conversation **OR** admin |
| INSERT | Participant with `sender_user_id = auth.uid()` and valid conversation membership |

### `message_contact_mask_events`

| Operation | Who |
|-----------|-----|
| SELECT | **Admin only** |
| INSERT | **Service role only** (API/trigger) |

**Helper functions (recommended):**

- `public.is_conversation_participant(conv_id uuid)` — landlord or tenant match on `auth.uid()`
- Reuse `public.current_auth_student_profile_id()` for tenant booking joins

---

## 5. Shared libraries (new files)

| File | Purpose |
|------|---------|
| `src/lib/messaging/maskContactInfo.ts` | AU phone/email/URL detection; return `{ maskedBody, maskTypes, matches }` |
| `src/lib/messaging/contentDedupHash.ts` | Normalize match → SHA-256 for `content_dedup_hash` (document: dedup only) |
| `src/lib/messaging/displayMessageBody.ts` | Given `body`, `unlocked`, `isAdmin` → display string |
| `src/lib/messaging/conversationTypes.ts` | Shared TS types |
| `src/hooks/useConversationRealtime.ts` | Subscribe to `conversation_messages` for one conversation |
| `src/hooks/useConversationInbox.ts` | List conversations for current user |
| `api/lib/messaging/` | Server-side mask + insert + notify (mirror pattern from `api/enquiry-email.ts`) |

---

## 6. API endpoints

Prefer **server routes** for sends (mask logging + email without PII). Reads can use Supabase client + RLS for speed.

| Method | Path | Auth | Responsibility |
|--------|------|------|----------------|
| POST | `/api/conversations/open` | Bearer | `{ propertyId }` → get-or-create conversation for current tenant + property; return `{ conversationId, contactUnlocked }` |
| POST | `/api/conversations/message` | Bearer | `{ conversationId, body }` → validate participant → insert message → mask event rows → update conversation preview/`last_message_at` → queue email notify |
| POST | `/api/conversations/read` | Bearer | `{ conversationId }` → set `landlord_last_read_at` or `tenant_last_read_at` |
| POST | `/api/conversations/notify` | Internal/called from message handler | Resend: no peer email in body; deep link `/messages/:id` |
| — | *(existing)* `POST /api/confirm-booking` | Landlord | **Extend:** on success → `contact_unlocked_at = now()` + system message on linked `conversation_id` |
| — | *(existing)* `POST /api/enquiry-email` | — | **Deprecate** for new flows; keep for backward compat during transition or remove caller |

**Optional v1.1**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/conversations/:id/contact` | Post-unlock only: return masked-safe contact payload (phone/email from profiles) |

**`vercel.json`:** No special entry needed unless you add long-running handlers (defaults fine for Edge/Node).

**Env:** Reuse `RESEND_API_KEY`; add `PUBLIC_SITE_URL` for deep links if not already set.

---

## 7. Screen-by-screen UI checklist

### 7.1 Routes (`src/App.tsx`)

| Route | Guard | Page component |
|-------|-------|----------------|
| `/messages` | `RequireUser` | `MessagesInboxPage` — role-aware list |
| `/messages/:conversationId` | `RequireUser` + participant RLS | `ConversationThreadPage` |

Redirects:

- `/student-dashboard?tab=enquiries` → prefer **Messages** tab or redirect old tab to `/messages`
- Landlord: `/landlord/dashboard?tab=enquiries` → **Messages** tab or `/messages`

### 7.2 New components

| Component | Used on |
|-----------|---------|
| `components/messaging/MessagesInbox.tsx` | Inbox list row |
| `components/messaging/ConversationList.tsx` | Inbox |
| `components/messaging/ConversationThread.tsx` | Thread layout |
| `components/messaging/MessageBubble.tsx` | User vs system styling |
| `components/messaging/MessageComposer.tsx` | Sticky bottom input + Send |
| `components/messaging/ConversationHeader.tsx` | Listing thumb, title, suburb, rent, status pill |
| `components/messaging/ContactUnlockBanner.tsx` | Pre-unlock policy copy (Terms-backed) |
| `components/messaging/ContactUnlockActions.tsx` | Post-unlock phone/email buttons |
| `components/messaging/BookingActionBar.tsx` | Tenant: Request to book; Landlord: Accept Listing / Managed / Decline |
| `components/messaging/SystemEventLine.tsx` | Grey pills for booking/unlock events |

### 7.3 Page-level

| Page | Screens / states |
|------|------------------|
| **`MessagesInboxPage`** | Empty: “No messages yet”; List: unread dot, preview, time, property title; Loading skeleton; Error retry |
| **`ConversationThreadPage`** | Header + banner + message list + composer; Loading; Send optimistic; Failed send retry; Realtime append; Scroll-to-bottom on new; Mobile full viewport |

### 7.4 Integrations (modify existing)

| Screen | Change |
|--------|--------|
| **`Header.tsx`** | Logged-in student/landlord: **Messages** link + unread badge (count from conversations where `last_message_at > last_read`) |
| **`PropertyDetail.tsx`** | “Message landlord” → **lightest signup** if needed → `POST open` → navigate `/messages/:id`. **Sign-in UX (locked):** single screen, OTP-first (email magic link / SMS OTP per existing auth stack) — no multi-step profile wizard before first message. Replace/supersede `PropertyEnquiryForm` for logged-in users. **Product note:** anonymous enquire-with-email goes away; Quinn should sanity-check student acceptance of signup-to-message friction. |
| **`PropertyEnquiryForm.tsx`** | Deprecate for new sends OR thin wrapper that calls `/api/conversations/open` + first message |
| **`StudentDashboard.tsx`** | Enquiries tab → “Open conversation” links to `/messages/:id` (or replace tab with link to `/messages`) |
| **`LandlordDashboard.tsx`** | Replace enquiries reply UI with link to thread; remove `/api/enquiries/reply` usage for new replies |
| **`Booking.tsx`** | On submit: attach `conversationId` if came from thread query param; set `bookings.conversation_id` |
| **`LandlordBookingReviewPage`** | If `booking.conversation_id`: embed link “View full conversation” → thread; optional: show recent messages from conversation instead of `booking_messages` |
| **`Terms.tsx`** | Add §3.3 + TOC entry (legal) |

### 7.5 Admin (v1 = read-only, no UX priority)

| Route | Component |
|-------|-------------|
| `/admin/conversations/:id` | `AdminConversationViewer` — read-only transcript, full `body`, mask events count optional |

Defer admin inbox list to v1.1; schema/RLS ready day one.

### 7.6 Email templates (Resend)

**Hard rule (all peer-message notifications):** email body contains **only** (1) property title, (2) sender first name, (3) deep link button to `/messages/:conversationId`. **No message body** — not masked, not unmasked, not a one-line preview. Preview leakage is the same circumvention vector as full text.

| Trigger | Recipient | Content rules |
|---------|-----------|----------------|
| New message | Other party | Property title + sender first name + **Open conversation** → `/messages/:id` — **no** message text, **no** email addresses |
| Booking requested | Landlord | Same PII rule; system-style subject line; link to thread only |
| Booking accepted / unlocked | Both | “Contact details unlocked” (or equivalent) + link to thread — **no** contact details in email |

`platform_config.contact_masking_enabled`: when `false`, **display** masking is off in app/API; **`message_contact_mask_events` logging always runs** on detected PII in submitted bodies.

---

## 8. Unlock wiring (confirm-booking)

In `api/lib/booking/confirmListing.js` (and managed path after accept):

1. Resolve `conversation_id` from `bookings.conversation_id` or lookup `(property_id, tenant_user_id)`.
2. On successful confirm (+ listing charge success):
   - `UPDATE conversations SET contact_unlocked_at = now() WHERE id = ?`
   - Insert `conversation_messages` system: `booking_accepted` / `contact_unlocked`
3. On payment failure: do **not** unlock; system message optional: “Payment failed — contact still hidden”

---

## 9. Build sequence (calendar estimate)

Assumes **one strong full-stack dev**, includes QA on iPhone. Adjust if part-time.

| Chunk | Days | Deliverables |
|-------|------|----------------|
| **0. Spec & legal** | 0.5 | Terms §3.3 draft; `src/lib/messaging/maskContactInfo.test.ts` (~20 adversarial AU phone/email/social cases incl. spelled-out digits, @handles, wa.me/t.me); `content_dedup_hash` helper |
| **1. Database** | 1.0 | M1–M10 migrations, types, RLS verified with SQL smoke tests |
| **2. API core** | 1.5 | `open`, `message`, `read`; mask event insert; notify email (no PII) |
| **3. UI foundation** | 1.5 | Inbox + thread components; hooks; optimistic send; Realtime subscribe |
| **4. Entry points** | 1.0 | PropertyDetail, Header badge, dashboards; deprecate enquiry reply path |
| **5. Booking + unlock** | 1.0 | `conversation_id` on booking create; `confirm-booking` unlock + system messages |
| **6. Backfill & cutover** | 0.5 | Enquiry backfill; feature flag if needed; hide old enquiry form |
| **7. QA & polish** | 1.0 | Mobile Safari, unread counts, edge cases (duplicate thread, archived) |
| **8. Admin viewer** *(same release)* | 1.0 | Read-only `/admin/conversations/:id` — dispute resolution without SQL |

**Total:** ~**8–9 days**.

---

## 10. Testing checklist (acceptance)

- [ ] Tenant must be signed in to message from listing
- [ ] Second message on same property reuses thread (no duplicate)
- [ ] Phone/email in message shows masked for both sides pre-unlock
- [ ] `message_contact_mask_events` row created; `content_dedup_hash` populated
- [ ] Landlord email notification has **no** tenant email
- [ ] Landlord accept Listing + successful $99 → unlock + contact buttons work
- [ ] Failed card → stays masked
- [ ] Managed accept unlocks without $99
- [ ] Admin can read full thread via RLS (service role or admin user)
- [ ] Realtime: message appears without refresh on second device
- [ ] Professional tenant (`non_student` route) same flow
- [ ] Legacy enquiry rows visible after backfill

---

## 11. Out of scope (v1)

- Attachments / video
- WhatsApp / Google Picker
- Admin moderation UI / auto-suspend from mask counts
- Street-level map pin
- Typing indicators (nice-to-have v1.1)
- Push notifications (native / web push v1.1)

---

## 12. Locked decisions (25 May 2026)

| # | Decision |
|---|----------|
| 1 | **Backfill enquiries:** Hard cutover after one-time migration; no dual-write |
| 2 | **`booking_messages`:** Freeze inserts at cutover (DB + app); read-only for history |
| 3 | **Admin viewer:** Same release as peer messaging |
| 4 | **`contact_masking_enabled`:** Display-only kill switch; **always** log mask events |
| 5 | **PropertyDetail sign-in:** Single-screen OTP-ready flow before first message (see §7.4) |
| 6 | **Notification email:** Property title + first name + deep link only — no message body (see §7.6) |
| 7 | **Masking tests:** Dedicated adversarial unit test file (~20 cases) in chunk 0 / before API |
| 8 | **`sender_user_id`:** Nullable when `kind = 'system'` |

---

## Related docs

- `docs/dual-tier-service-model.md` — Listing fee + contact masking intent
- `docs/listing-only-go-live-plan.md` — broader go-live context
