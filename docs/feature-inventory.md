# Quni feature inventory (living document)

**Last reviewed:** 2026-05-29  
**Source of truth:** codebase (`src/`, `api/`, Supabase functions). If this doc disagrees with the app, the app wins until someone updates this file.

Granular list of student and landlord capabilities — including small actions (e.g. **duplicate listing**, **request more information** on a booking). Admin-only tools are out of scope.

---

## How to use this practically

### 1. Answer “do we have X?” in seconds

Search this file (`Ctrl+F`) before digging through routes or asking in chat. Use the **Status** column mentally:

| Status | Meaning |
|--------|---------|
| **Live** | Shipped and wired end-to-end |
| **UI only** | Surfaced in product but not fully backed (e.g. Saved listings) |
| **Deprecated** | Replaced; kept here so support/marketing do not resurrect it |

### 2. Keep marketing and FAQ honest

When editing [`faq-comprehensive-review.md`](./faq-comprehensive-review.md), `/faq`, or landing copy:

1. Claim only features marked **Live** here.
2. If you promote something **UI only**, label it “coming soon” on the site or finish the backend first.
3. After copy changes, skim the relevant **Students** or **Landlords** section here for gaps.

### 3. QA and release checklists

Before a student- or landlord-facing release:

- Pick the persona section below.
- Walk the bullets that touch your change; add any new bullets in the same PR (or immediately after merge).
- For big flows (booking, onboarding, listing form), cross-check [`mobile-testing-checklist.md`](./mobile-testing-checklist.md).

### 4. Support and triage

Map tenant/landlord tickets to a bullet (e.g. “Bond receipt download” → Students → Post-booking). If the user asks for something with no bullet, it is either missing product, mis-routed role, or a bug — not “undocumented magic.”

### 5. Scope and prioritisation

- **Roadmap:** mark new bullets as Live when shipped; move wishlist items to a “Backlog (not in product)” subsection if you add them.
- **Dual-tier work:** see also [`dual-tier-service-model.md`](./dual-tier-service-model.md) for Listing vs Managed rules; this doc lists *what users can click*, not fee tables.

### 6. Onboarding teammates

New dev, support, or marketing: read **How to use** → skim **Shared** → deep-read one persona. Key routes are in parentheses where helpful.

### 7. Keeping it alive (maintenance rule)

Update this file when you ship or remove **user-visible** behaviour:

- New button, step, tab, status, or gating rule → add a bullet under the right persona.
- Remove or rename → delete or strike through and note **Deprecated**.
- “Coming soon” removed → change **UI only** → **Live**.

Optional PR habit: *“Touches student/landlord UX → update `docs/feature-inventory.md` if needed.”*

---

## Shared (both students and landlords)

- Peer **messaging** per listing (`/messages`, `/messages/:conversationId`)
- Unread badge in header when logged in as student or landlord
- **Contact masking** until booking accepted; unlock shows email/phone
- Public **listings browse** and property detail (`/listings`, `/properties/:slug`) with role-specific gates
- **Verified host** badge on listing cards and property detail when `landlord_profiles.verified` (Stripe-driven)
- **AI chat** widget (persona: student renter vs landlord); host verification honesty rules + knowledge-base chunk
- Auth: signup, login, Google OAuth, email verification, sign out
- Legal/info: Terms, Privacy, Refunds, How it works, FAQ, Contact
- Ad-hoc feedback via Sentry (`submitUserFeedback` in `src/lib`) — no public “Report a problem” button; structured issues use **Qase** (admin + dashboard “Get support”)

---

## Students

### Account & auth — Live

- Sign up as **Student** or **Non-student tenant** (same `student` role; different verification route)
- Email/password + confirmation email; **Continue with Google** (role chosen first)
- Login, resend confirmation, OAuth callback (`/auth/callback`)
- Role/terms gate (`/onboarding`); legacy `/student-signup` → `/signup`
- **Delete account** (confirm with `DELETE`)

### Onboarding (`/onboarding/student`) — Live

- **University email OTP** (student route) or **work email OTP** (non-student route)
- Steps: about you → emergency contact + living prefs → accept Terms/Privacy
- Profile photo; uni/campus/course/year; phone; budget; move-in; lease length; gender
- **Draft saved** in browser (resume / start fresh); back between steps

### Profile (`/student-profile`, `/student/profile`) — Live

- Tabs: **Profile** | **Verification** | **Bookings** (`?tab=…`)
- Edit profile, photo, emergency contact, living preferences
- **Work location** + geocode (non-student route) for distance search
- **Rent billing card** — Stripe Customer for ongoing rent (Quni card path)
- Profile draft autosave
- Delete account (danger zone)

### Verification — Live

- Student route: uni email OTP, **photo ID**, **enrolment proof**
- Non-student route: work email OTP, photo ID, **identity supporting** doc
- Progress meter (Verification tab + onboarding)

### Dashboard (`/student-dashboard`) — Live

- Cards: bookings (+ pending), messages, profile completeness, browse CTA
- Dismissible **onboarding checklist** with deep links
- Tabs: **Bookings** | **Messages** (link) | **Saved**
- **Get support** (Qase modal)
- Stripe payments card; NSW tenancy copy + lease panel when applicable
- **Download bond receipt** (where listing type supports it)
- Legacy `?tab=enquiries` → `/messages`

### Saved listings — UI only

- **Saved** tab shows “coming soon”; no backend favourites yet

### Search & browse — Live

- Filters (URL-synced): keyword, university/campus, suburb, room type, rent, furnished, dates, lease length
- **Near work**: `near_lat` / `near_lon` / radius; **nearest first** sort
- **Use my saved work location** (non-student with coordinates saved)
- Sort: newest, price low/high, nearest
- Date-aware availability badges; adjust dates when unavailable
- Banner when non-student must verify to see all student-only listings
- Post-onboarding welcome on `/listings`
- SEO: university/campus accommodation, rent near campus
- Featured listings on Home (guest)

### Property detail — Live

- Guest: partial listing + sign-in CTA
- **Student-only listings** access check (RPC)
- Gallery, amenities, rules, nearby campuses/listings
- **Share listing**
- **Verified host** label when landlord has completed Stripe identity (badge on cards; inline on detail)
- **Message landlord** (conversation); pending intent after onboarding
- **Request to book** (gated until core profile complete)
- Link if **active pipeline booking** exists
- **Property enquiry form** — Deprecated (redirects to Messages)

### Booking application (`/booking/:propertyId`) — Live

- Student role only; 4 steps: dates & occupancy → rent method → bond ack → deposit payment
- Move-in (min 7 days), lease length, **1–2 occupants**, **co-tenant** fields when 2
- Optional parking surcharge; message to landlord
- Rent: **Quni card** or **bank transfer**
- Bond acknowledgment; Stripe **booking deposit** (1 week + platform fee when applicable)
- **Booking draft** in localStorage; date overlap / conflict UI
- Cannot book own listings (if user is also landlord)
- **Listing-tier** properties: deposit/booking request allowed before host finishes Stripe identity; **Managed-tier** blocked until host Connect ready
- Statuses: `pending`, `pending_payment`, `pending_confirmation`, `awaiting_info`, `bond_pending`, `confirmed`, `active`, `declined`, `expired`, `payment_failed`, `cancelled`, `completed`, etc.

### Messaging — Live

- Inbox; realtime thread; mark read; send messages
- Masked contact until acceptance; then landlord name, email, phone
- Open from listing (`openConversation`)

### Post-booking — Live

- **Lease panel**: draft preview, **sign** (DocuSeal), download signed agreement + addendum
- Co-tenant signing awareness
- Reply when status is `awaiting_info` (profile Bookings tab)

### Payments — Live

- Booking deposit (Stripe); saved card for rent; method stored on booking

### AI & support — Live

- AI chat (`student_renter` persona)
- Qase tickets from dashboard
- Contact page (student enquiry type)

### Gating (reference)

| Requirement | Unlocks |
|-------------|---------|
| Email confirmed | Protected routes |
| Core profile (uni, course, phone, budget) | Message + book |
| `onboarding_complete` | Full onboarding flow done |
| `verification_type === 'student'` | All student-only listings (non-student route sees subset + prompt) |

---

## Landlords

### Account & auth — Live

- Signup as landlord; tier intent from pricing (`?tier=listing|managed` → localStorage)
- `/landlord-signup` → `/signup`; post-auth → onboarding then `/landlord/dashboard`
- Sign out; email verification

### Onboarding (`/onboarding/landlord`) — Live

1. **Profile** — photo, name, phone, type (Individual / Company / Trust), ABN, address, bio  
2. **Terms** — Terms, Privacy, **Landlord Service Agreement**  
3. **Payments** — Listing: save card (+ optional Connect); Managed: **Stripe Connect** (identity verification required before **accept**, not before listing)  
4. **Insurance** — insurer links + confirmation checkbox  
5. **Complete** — add first listing or dashboard  
- Wizard draft autosave; Stripe return query params

### Dashboard (`/landlord/dashboard`) — Live

- Onboarding checklist; **Add new listing** (gated until setup)
- **Rent payouts** (Connect): connect / continue / manage
- Stats: listings, messages (unread), bookings (pending), profile %
- **Get support** (Qase); Managed Connect banner when needed
- Tabs: **Listings** | **Messages** | **Bookings**

### Listings (dashboard & profile Properties tab) — Live

Per listing:

- **Edit** (`/landlord/property/edit/:id`)
- **View** public `/properties/:slug`
- **Share listing** (disabled while draft)
- **Publish** (draft → active)
- **Duplicate** → confirm → new draft (`duplicate_property_listing`)
- **Pause** / **Reactivate** (active ↔ inactive)
- Badges: draft/active/inactive, featured, service tier

### Property form (`/landlord/property/new`, edit) — Live

- Sections: Basic info, Property details, Inclusions, Rules, Location, Description, Pricing, Photos
- Types: **Rent**, **Homestay**, **Student House**
- Accommodation tiles; beds/baths; room for rent; rooming house registration
- Inclusions (furnished, linen, cleaning, features); **Open to non-students**
- House rules (Yes/No/Approval) + custom; **Reset to platform default**
- Location + geocode; suggested campuses; extra universities
- Description; **AI description generator**
- **Quni Listing** vs **Quni Managed**; rent/week; **AI price suggestion**; occupants; couple/carpark surcharges; bond; lease length; available from
- Photos: upload, reorder, captions, remove
- **Publish listing** / **Save changes**
- New listing: draft indicator; **resume draft** / **start fresh**

### Booking review (`/landlord/bookings/:bookingId/review`) — Live

- Fit summary; occupancy/rent; verification badges; read-only thread
- **AI assessment** (generate / refresh, cooldown)
- **Accept as Listing** / **Accept as Managed** / **Upgrade and accept as Managed**
- **Decline** (optional reason); **Request more information** (suggested chips + message)
- **Bond received from renter** (Listing); **Cancel booking**
- Boarding/lodger: **Mark bond received** → **generate bond receipt**
- **Tenancy agreement**: draft, sign, download + addendum
- Blockers: **Stripe identity** (`stripe_charges_enabled`), Listing saved card, billing module
- **Verified host** badge (Stripe-synced; admin manual override with lock)

### Bookings tab (dashboard) — Live

- Request queue; 48h expiry; **Review request**; applicant modal
- **Verification details**; AI assessment; download/open agreement
- **Bank account required** modal; payment error retry

### Landlord profile — Live

- Tabs: Profile | Properties (same listing actions)
- Completion widget; account agreements; rent payouts; saved Listing card display
- Edit profile + photo

### Messaging — Live

- Same shared messaging; landlord as host; contact unlock after booking

### Host identity & trust — Live

- **Verified host** badge when Stripe Connect has `charges_enabled` (webhook + sync; flips off if Stripe disables)
- **Accept booking** gated on Stripe identity for **both** Listing and Managed; Listing also needs saved card for $99 fee
- List, message, and receive booking **requests** without verification; only **accept** requires Stripe
- Admin **manual verified** toggle sets `admin_override_verified` so webhooks do not overwrite

### Payments & payouts — Live

- **Stripe Connect** (Managed rent payouts; host identity KYC)
- **Listing fee card**; charge on accept via `/api/confirm-booking` (3DS when needed)
- Refund deposit on decline; Listing cancel with fee rules

### Service tiers — Live

- **Quni Listing** — self-managed; card fee on accept; bond/rent with renter; optional upgrade to Managed on accept
- **Quni Managed** — Connect required; managed workflow; no downgrade after upgrade

### AI & support — Live

- AI chat (landlord persona)
- Qase from dashboard

### Marketing / leads (pre-login) — Live

- Landlord partnerships + lead form → `landlord_leads`
- Landlord AI page; pricing CTAs with tier; Landlord Service Agreement

---

## Quick route map

| Area | Students | Landlords |
|------|----------|-----------|
| Home / browse | `/listings` | `/listings` (preview own) |
| Dashboard | `/student-dashboard` | `/landlord/dashboard` |
| Profile | `/student-profile` | `/landlord-profile` |
| Onboarding | `/onboarding/student` | `/onboarding/landlord` |
| Book | `/booking/:propertyId` | — |
| Review booking | — | `/landlord/bookings/:id/review` |
| Listing editor | — | `/landlord/property/new`, `.../edit/:id` |
| Messages | `/messages` | `/messages` |

---

## Related docs

- [`faq-comprehensive-review.md`](./faq-comprehensive-review.md) — customer-facing FAQ copy  
- [`dual-tier-service-model.md`](./dual-tier-service-model.md) — Listing vs Managed product rules  
- [`mobile-testing-checklist.md`](./mobile-testing-checklist.md) — device QA  
- [`professional-workplace-search-scope.md`](./professional-workplace-search-scope.md) — non-student search behaviour  

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-29 | **Verified host** (Stripe-driven): accept gated on identity; Listing deposits without host Connect; FAQ/How it works/AI guardrails aligned |
| 2026-05-27 | Initial inventory from codebase review |
