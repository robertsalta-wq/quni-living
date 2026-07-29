# Quni feature inventory (living document)

**Last reviewed:** 2026-07-25  
**Source of truth:** codebase (`src/`, `api/`, Supabase functions). If this doc disagrees with the app, the app wins until someone updates this file.

Granular list of **renter** (student / non-student tenant) and **landlord** capabilities - including small actions (e.g. **duplicate listing**, **request more information** on a booking). Admin-only tools remain out of scope except a one-line pointer.

---

## How to use this practically

### 1. Answer “do we have X?” in seconds

Search this file (`Ctrl+F`) before digging through routes or asking in chat. Use the **Status** column mentally:

| Status | Meaning |
|--------|---------|
| **Live** | Shipped and wired end-to-end |
| **UI only** | Surfaced in product but not fully backed |
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

Map tenant/landlord tickets to a bullet (e.g. “Bond receipt download” → Students → Post-booking). If the user asks for something with no bullet, it is either missing product, mis-routed role, or a bug - not “undocumented magic.”

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

### 8. Keep the AI assistant in sync

After you change this file:

1. Run `npx tsx scripts/syncFeatureInventoryKnowledge.ts` (writes four `platform_policy` rows into `scripts/knowledgeData.json`).
2. Run `npm run seed:knowledge` (re-embeds into Supabase for chat RAG).

See [`ai-knowledge-sync.md`](./ai-knowledge-sync.md) for system prompts and other AI surfaces.

---

## Shared (both students and landlords)

- Peer **messaging** per listing (`/messages`, `/messages/:conversationId`)
- Unread badge in header / chrome when logged in as renter or landlord
- **Contact masking** until booking accepted; unlock shows email/phone
- Public **listings browse** and property detail (`/listings`, `/listings/:slug`, `/properties/:slug`) with role-specific gates
- **Verified host** badge on listing cards and property detail when `landlord_profiles.verified` (Stripe-driven)
- **AI chat** widget (persona: student renter vs landlord); host verification honesty rules + knowledge-base chunk
- **Sample agreement previews** (`/sample-agreements`) - watermarked PDF templates by state/tier; dashboard link for renters and landlords
- Auth: signup, login, Google OAuth, email verification, forgot/reset password, sign out
- **App chrome**: shared `AppHeader` (desktop Ask AI) + mobile bottom nav + action bar (`Cancel` / `Save` / Ask AI) on dashboard and drill-in surfaces; floating Ask AI FAB on marketing / public routes outside the app shell
- **Incomplete-profile nudge**: shared warning chrome (“Finish your profile” + next step); expandable readiness driver on profile; global resume strip on marketing/browse (hidden on dashboards that already nudge)
- Shared dashboard feedback: empty states, error banner, fatal error, welcome toast
- **Non-discrimination** policy page (`/non-discrimination`)
- Content **guides** (`/guides`, `/guides/:slug`)
- SEO surfaces: university/campus accommodation, rent near campus, international students, services pages

### Trust, Stripe & payments - Live

- **Verified host** (core trust feature): landlords complete **Stripe Connect identity verification** (regulated KYC by Stripe, not manual Quni ID review) before they can **accept** any booking; when Stripe enables charges, a **Verified host** badge shows on profile and listings so renters get peace of mind
- Renters may **browse, message, and submit booking requests** before a host finishes Stripe - only **acceptance** is gated on verification
- **Renters**: no Quni booking/platform/service fees; booking **deposit** via Stripe (card hold/charge at application); ongoing rent via **Quni card** (Stripe Customer) or **bank transfer**; bond is tenancy money between parties (Quni is not the bond custodian)
- **Landlords - Quni Listing**: saved card for flat **acceptance fee** (charged on accept via Stripe); bond and weekly rent flow **directly** with the renter after accept (Quni not in rent chain)
- **Landlords - Quni Managed**: **Stripe Connect** for identity + **weekly rent collection**; service fee deducted before payout to bank (~2–3 business days typical). Product UI is **feature-flagged** (`managed_tier_enabled`; default off → “coming soon” in marketing/listing tier picker until enabled)
- Native apps (Capacitor iOS/Android) with push notifications where installed; primary product surface remains the web app
- Declined bookings: deposit hold **released/refunded** via automated Stripe flows (often 5–7 business days)
- Legal/info: Terms, Privacy, Refunds, How it works, FAQ, Contact, About, Landlord Service Agreement
- Ad-hoc feedback via Sentry (`submitUserFeedback` in `src/lib`) - no public “Report a problem” button; structured issues use **Qase** (admin + dashboard “Get support”)

### Admin (pointer only)

- Staff console at `/admin` (Living Console, bookings, users, properties, payments, knowledge base, Qase, documents, state workflows, etc.). Not inventoried here.

---

## Students

Marketplace role is **`renter`** (URLs still use `student-*` in many places). Product copy may say student or renter depending on situation.

### Account & auth - Live

- Sign up as renter; choose **situation** later on profile (student / working / working holiday / backpacker / retired / between jobs)
- Email/password + confirmation email; **Continue with Google** (role chosen first)
- Login, resend confirmation, OAuth callback (`/auth/callback`), verify email, forgot/reset password
- Role/terms gate (`/onboarding`); legacy `/student-signup` → `/signup`
- **Delete account** (confirm with `DELETE`)

### Onboarding - Live (profile-first)

- **`/onboarding/student` → redirects to `/student-profile`** (legacy multi-step wizard route retired at the router)
- Incomplete renters land on **profile** (`/student-profile`); resume banner on browse/marketing points there
- Situation picker + section completion is the live setup path (not a separate wizard)

### Profile (`/student-profile`, `/student/profile`) - Live

- **Mobile**: Listing-style **profile hub** rows; tap opens section drill-in (`?section=situation|personal|verification|route|emergency|about|prefs`); Cancel · Save in app chrome
- **Desktop**: single-open accordion sections (same section set)
- Sections: **Your situation**, **Personal details** (incl. profile photo; Android HEIC/empty-MIME hardened), **Verification**, **Route details** (student / employment / visa / general by situation), **Emergency contact**, **About you** (optional), **Living preferences** (optional)
- Nested **guarantor** when income band suggests it (`?section=route&guarantor=1`)
- **Profile readiness** strip: compact incomplete (“Finish your profile” + next step) or complete; expand for %
- Stripe **rent payments** card where applicable
- Work location + geocode (non-student routes) for distance search
- Profile draft autosave on section forms
- Delete account (danger zone)
- **Deprecated:** `?tab=bookings` → redirects to dashboard Bookings; old Profile | Verification | Bookings tab chrome removed

### Verification - Live

- Student route: uni email OTP, **photo ID**, **enrolment proof**
- Non-student routes: work email OTP (where applicable), photo ID, **identity supporting** / visa docs by situation
- Progress reflected in hub status ticks + readiness driver

### Dashboard (`/student-dashboard`) - Live

- Tabs: **Overview** | **Bookings** | **Saved**
- Bottom nav also reaches **Messages** and **Profile** (separate routes)
- Overview cards: bookings, messages, profile nudge (same incomplete chrome), find accommodation, get support
- **Get support** (Qase modal)
- Stripe payments card; NSW/QLD/VIC tenancy guidance + lease panel when applicable
- **Download bond receipt** (where listing type supports it)
- **View sample agreements** → `/sample-agreements`
- Legacy `?tab=enquiries` → `/messages`

### Saved properties - Live

- Heart on listing cards and property detail; optimistic save/unsave
- Guest save → sign-in; pending intent resumes via central auth-session consumer
- Dashboard **Saved** tab: grid of favourites, unsave, empty state → `/listings`

### Search & browse - Live

- Filters (URL-synced): keyword, university/campus, suburb, room type, rent, furnished, dates, lease length
- **Near work**: `near_lat` / `near_lon` / radius; **nearest first** sort
- **Use my saved work location** (non-student with coordinates saved)
- Sort: newest, price low/high, nearest
- Date-aware availability badges; adjust dates when unavailable
- Banner when non-student must verify to see all student-only listings
- Post-onboarding welcome on `/listings`
- SEO: university/campus accommodation, rent near campus
- Featured listings on Home (guest)

### Property detail - Live

- Guest: partial listing + sign-in CTA
- **Student-only listings** access check (RPC)
- Gallery, amenities, rules, nearby campuses/listings
- **Share listing**
- **Verified host** label when landlord has completed Stripe identity
- **Message landlord** (conversation); pending intent after setup
- **Apply** (gated until core profile / readiness complete)
- **Save property** (heart; guest pending intent after sign-in)
- Link if **active pipeline booking** exists
- **Property enquiry form** - Deprecated (redirects to Messages)

### Booking application (`/booking/:propertyId`) - Live

- Renter role only; multi-step: dates & occupancy → rent method → bond ack → deposit payment
- Move-in (min 7 days), lease length, **1–2 occupants**, **co-tenant** fields when 2
- Optional parking surcharge; message to landlord
- Rent: **Quni card** or **bank transfer**
- Bond acknowledgment; Stripe **booking deposit**
- **Booking draft** in localStorage; date overlap / conflict UI
- Cannot book own listings (if user is also landlord)
- **Listing-tier** properties: deposit/booking request allowed before host finishes Stripe identity; **Managed-tier** blocked until host Connect ready
- Statuses: `pending`, `pending_payment`, `pending_confirmation`, `awaiting_info`, `bond_pending`, `confirmed`, `active`, `declined`, `expired`, `payment_failed`, `cancelled`, `completed`, etc.
- Tenant invite accept flow: `/invite/:token`

### Messaging - Live

- Inbox; realtime thread; mark read; send messages
- Masked contact until acceptance; then landlord name, email, phone
- Open from listing (`openConversation`)

### Post-booking - Live

- **Lease panel**: draft preview, **sign** (DocuSeal), download signed agreement + addendum
- Co-tenant signing awareness
- Reply when status is `awaiting_info`
- Bond receipt download where supported (state / rooming-house rules)
- **Booking reinstatement** request / confirm / decline where eligible (`/api/booking/reinstatement/*`)
- Tenancy packages: NSW / QLD / VIC occupancy (T1) and residential (T2); **T3 rooming agreements** not available yet

### Payments - Live

- Booking deposit (Stripe); saved card for rent; method stored on booking

### AI & support - Live

- AI chat (`student_renter` persona)
- Qase tickets from dashboard
- Contact page (student enquiry type)

### Gating (reference)

| Requirement | Unlocks |
|-------------|---------|
| Email confirmed | Protected routes |
| Situation + core personal / terms / emergency / verification (readiness) | Message + book |
| Student verification tier | All student-only listings (non-student route sees subset + prompt) |

---

## Landlords

### Account & auth - Live

- Signup as landlord; tier intent from pricing (`?tier=listing|managed` → localStorage)
- `/landlord-signup` → `/signup`; post-auth → profile/dashboard
- Sign out; email verification
- Legacy `/landlord-profile`, `/landlord/profile`, `/landlord-dashboard` → `/landlord/dashboard?tab=…`

### Onboarding - Live (profile-first)

- **`/onboarding/landlord` → redirects to `/landlord/dashboard?tab=profile`**
- Setup lives on **Profile** tab: personal, address, about, agreements, payouts, insurance, languages
- Publish readiness + accept readiness (Stripe / card) drive CTAs

### Dashboard (`/landlord/dashboard`) - Live

- Tabs: **Overview** | **Listings** | **Bookings** | **Profile**
- Messages via shared `/messages` (chrome / nav)
- Overview: profile funnel / finish CTA, Stripe payouts card, stats, support
- **Add new listing** (gated until publish-ready)
- **Get support** (Qase); Managed Connect banner when needed
- **View sample agreements** → `/sample-agreements`
- **Invite tenant** modal → share `/invite/:token` link for a listing

### Listings & Listing Health - Live

Per listing:

- **Listing Health hub** (mobile-first section rows + quality score): Basic info, Property details, Inclusions, Rules, Location, Description, Pricing, Photos (+ compliance sections as applicable)
- Section drill-ins: `/landlord/property/new|edit/:id/section/:sectionId` (and `/basic`)
- **Edit**, **View** public `/properties/:slug`, **Share** (disabled while draft)
- **Publish** (draft → active); **Pause** / **Reactivate** (active ↔ inactive)
- **Duplicate** → confirm → new draft (`duplicate_property_listing`)
- Badges: draft/active/inactive, featured, service tier

### Property form (`/landlord/property/new`, edit) - Live

- Same section content as Listing Health (desktop can still use full form)
- Types: **Rent**, **Homestay**, **Student House**
- Accommodation tiles; beds/baths; room for rent; rooming house registration; FT6600 / Form 18a / Form 1 compliance fields by state
- Inclusions; **Open to non-students**
- House rules (Yes/No/Approval) + custom; **Reset to platform default**
- Location + geocode; suggested campuses; extra universities
- Description; **AI description generator** + **AI proofread**
- **Quni Listing** vs **Quni Managed** (Managed option gated by `managed_tier_enabled`); rent/week; **AI price suggestion**; occupants; couple/carpark surcharges; bond; lease length; available from
- Photos: upload, reorder, captions, remove (HEIC-aware prep)
- **Publish listing** / **Save changes**; draft resume / start fresh

### Booking review (`/landlord/bookings/:bookingId/review`) - Live

- Fit summary; occupancy/rent; verification badges; read-only thread
- **AI assessment** (generate / refresh, cooldown; all applicant tiers)
- **Accept as Listing** / **Accept as Managed** / **Upgrade and accept as Managed**
- **Decline** (optional reason); **Request more information** (suggested chips + message)
- **Bond received from renter** (Listing); **Cancel booking**
- Boarding/lodger: **Mark bond received** → **generate bond receipt**
- **Tenancy agreement**: draft, sign, download + addendum (NSW / QLD / VIC packages)
- Blockers: **Stripe identity** (`stripe_charges_enabled`), Listing saved card, billing module
- **Verified host** badge (Stripe-synced; admin manual override with lock)

### Bookings tab (dashboard) - Live

- Request queue; views: requests / calendar / timeline (`?view=`)
- 48h expiry; **Review request**; applicant modal
- **Verification details**; AI assessment; download/open agreement
- **Bank account required** modal; payment error retry

### Landlord profile (`?tab=profile`) - Live

- **Mobile**: hub rows + section drill-in (`?section=personal|address|about|agreements|payouts|insurance|languages`); Cancel · Save chrome
- **Desktop**: accordion / section editors
- Readiness driver (publish + accept); account agreements; rent payouts; saved Listing card
- Edit profile + photo

### Messaging - Live

- Same shared messaging; landlord as host; contact unlock after booking

### Host identity & trust - Live

- **Verified host** badge when Stripe Connect has `charges_enabled` (webhook + sync; flips off if Stripe disables)
- **Accept booking** gated on Stripe identity for **both** Listing and Managed; Listing also needs saved card for acceptance fee
- List, message, and receive booking **requests** without verification; only **accept** requires Stripe
- Admin **manual verified** toggle sets `admin_override_verified` so webhooks do not overwrite

### Payments & payouts - Live

- **Stripe Connect** (Managed rent payouts; host identity KYC)
- **Listing fee card**; charge on accept via `/api/confirm-booking` (3DS when needed)
- Refund deposit on decline; Listing cancel with fee rules

### Service tiers - Live / flagged

- **Quni Listing** - self-managed; card fee on accept; bond/rent with renter; optional upgrade to Managed on accept when Managed is enabled
- **Quni Managed** - Connect required; managed workflow; no downgrade after upgrade. **UI only / coming soon** while `managed_tier_enabled` is false (APIs exist; marketing and tier picker show coming soon)

### AI & support - Live

- AI chat (landlord persona)
- Qase from dashboard

### Marketing / leads (pre-login) - Live

- Landlord partnerships + lead form → `landlord_leads`
- Landlord AI page (`/landlords/ai`); pricing CTAs with tier; Landlord Service Agreement
- `/for-landlords` — desk page behind `desk_shell_enabled` (Preview); Production HTTP 302 → `/services/landlord-partnerships`

---

## Quick route map

| Area | Renters | Landlords |
|------|---------|-----------|
| Home / browse | `/listings` | `/listings` (preview own) |
| Dashboard | `/student-dashboard` | `/landlord/dashboard` |
| Profile | `/student-profile` | `/landlord/dashboard?tab=profile` |
| Setup entry | `/student-profile` (legacy `/onboarding/student` redirects) | Profile tab (legacy `/onboarding/landlord` redirects) |
| Book | `/booking/:propertyId` | - |
| Invite | `/invite/:token` | Invite modal → same |
| Review booking | - | `/landlord/bookings/:id/review` |
| Listing editor / health | - | `/landlord/property/new`, `.../edit/:id`, `.../section/:sectionId` |
| Messages | `/messages` | `/messages` |
| Sample agreements | `/sample-agreements` | `/sample-agreements` |

---

## Related docs

- [`faq-comprehensive-review.md`](./faq-comprehensive-review.md) - customer-facing FAQ copy  
- [`dual-tier-service-model.md`](./dual-tier-service-model.md) - Listing vs Managed product rules  
- [`mobile-testing-checklist.md`](./mobile-testing-checklist.md) - device QA  
- [`professional-workplace-search-scope.md`](./professional-workplace-search-scope.md) - non-student search behaviour  
- [`ai-knowledge-sync.md`](./ai-knowledge-sync.md) - how chat AI stays aligned with this inventory  

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-25 | Full codebase rescan: profile-first onboarding redirects; renter situation hub + readiness chrome; landlord Overview/Profile tabs + Listing Health; invite tenant; shared app chrome / incomplete nudge; deprecate profile Bookings tab; Managed flag; reinstatement; T3 rooming gap; AI proofread |
| 2026-06-02 | Trust/Stripe/payments section for AI; sample agreements; knowledge sync script |
| 2026-05-29 | **Verified host** (Stripe-driven): accept gated on identity; Listing deposits without host Connect; FAQ/How it works/AI guardrails aligned |
| 2026-05-27 | Initial inventory from codebase review |
