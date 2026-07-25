# Quni Site Visual Atlas

**Purpose:** Ground truth for “what does the next page look like?” — derived from routes and components in this repo, not memory.  
**Last derived:** 2026-07-25  
**Source of truth:** `src/App.tsx` + page/layout components named below. If this doc disagrees with the app, the app wins.

**Chrome shells (decide first):**

| Shell | When | Renders |
|-------|------|---------|
| **Marketing** | Most public routes under `MarketingChromeLayout` | `Header` → main (+ `OnboardingResumeBanner`) → full `Footer` **or** `FocusFormLegalStrip` |
| **App shell** | Authenticated destinations under `AppShellLayout` | sticky `AppHeader` → main (+ banner) → `AppActionBar` → `Footer` only at `sm+` |
| **AI landing** | `/landlords/ai` only | Custom sticky header + page + custom footer — **no** marketing Header/Footer |
| **Admin** | `/admin/*` | Separate admin shell (out of scope for this atlas) |

**Focus-form paths** (marketing shell swaps full Footer for `FocusFormLegalStrip`): `/onboarding`, `/booking/…` *(booking actually mounts in App shell — see note)*, `/invite/…`, `/signup`, `/student-signup`, `/landlord-signup`, `/landlord/property/new`, `/landlord/property/edit/…`. Strip links: Privacy Policy → `/privacy`, Terms of Service → `/terms`, Refund Policy → `/refunds`, About Quni → `/about`. (`src/lib/site.ts`, `MarketingChromeLayout.tsx`)

**Platform feature flag used on marketing/landlord surfaces:** `managedTierEnabled` ← `public_platform_features.managed_tier_enabled` via `usePlatformFeatures()`. Default **false** until loaded. Coming-soon copy lives in `managedComingSoonCopy.ts`.

---

## Shared chrome

### Marketing `Header`  (source: `src/components/Header.tsx`)

- **Who sees it:** Guests and logged-in users on MarketingChrome routes.
- **Brand:** logo lockup → `/` (`aria-label="Quni home"`). Sparkle (md+) → `/landlords/ai` (`title="Landlord AI features"`).
- **Desktop main nav (`md+`, `aria-label="Main"`):**
  - `Listings` → `/listings`
  - `For students` (dropdown) → `Browse by university` `/student-accommodation` · `International students` `/international` · `Rent near campus` `/rent-near-campus` · `Guides & advice` `/guides`
  - `Pricing` → `/pricing`
  - `For landlords` → `/for-landlords` (redirects to partnerships)
  - `Universities` → `/for-universities`
- **Logged out CTAs:** `Log in` → `/login`; `Sign up` (+ `→` on `sm+`) → `/signup`
- **Logged in:** `Messages` → `/messages`; `Dashboard` → role dashboard (`/landlord/dashboard`, `/student-dashboard`, or `/student-profile` if renter incomplete). Admin: `Admin` → `/admin`. Account menu: `Dashboard` (mobile), `Finish setup` / `Profile` / `Admin dashboard`, `Sign out`. Finish setup → renter `/student-profile`, landlord `/landlord/dashboard?tab=profile`, else `/onboarding`.
- **Mobile:** coral pill `Listings` → `/listings`; hamburger drawer title `Menu` with same primary links + `Landlord AI` → `/landlords/ai`; logged-out drawer has `Log in` only (no Sign up in drawer); also `About` → `/about`, `Contact` → `/contact`.

### Marketing `Footer`  (source: `src/components/Footer.tsx`)

- Tagline: `Verified rooms near Australian universities and workplaces - for students, graduates, and professionals.`
- **For renters:** `Accommodation guides →` → `/student-accommodation`; `International students →` → `/international`
- **Guides:** `All guides →` → `/guides` + three featured guide links
- **Quick Links:** Home `/`; Properties `/listings`; About `/about`; Pricing `/pricing`; FAQ `/faq`; Verification `/verification`; Contact `/contact`; For landlords `/for-landlords`; For universities `/for-universities`; `AI listing tools` `/landlords/ai`; `Rent near university` `/rent-near-campus`
- **Legal:** Terms `/terms`; Refund `/refunds`; Privacy `/privacy`; Non-Discrimination `/non-discrimination`; Landlord Service Agreement `/landlord-service-agreement`
- **Our Services:** Accommodation, Property Management, Landlord Partnerships, Fully Furnished Units under `/services/…`
- Contact: `hello@quni.com.au` mailto

### `AppHeader`  (source: `src/components/appShell/AppHeader.tsx`)

- Brand: logo → `/` + literal `Dashboard`.
- **Desktop landlord tabs:** `Overview` → `/landlord/dashboard` · `Listings` → `?tab=listings` · `Messages` → `/messages` · `Bookings` → `?tab=bookings` · `Profile` → `?tab=profile`. Bell → `/messages`. Account: `Profile`, `Sign out`.
- **Desktop renter tabs:** `Overview` → `/student-dashboard` · `Bookings` → `?tab=bookings` · `Saved` → `?tab=saved` · `Messages` → `/messages` · `Profile` → `/student-profile`.
- **Mobile dashboard header:** logo + `Dashboard` + account menu (tabs in bottom bar).
- **Task header** (mobile renter `/booking/*`): back (`Bookings` / `Listings` / `Back`); center title `Apply`; account menu.

### Mobile bottom nav / action bar  (source: `AppActionBar.tsx`, `appChromeBarItems.ts`)

- **Nav mode** (mobile only, landlord or renter): role tabs above + trailing `Ask AI` (opens chat widget, no route).
  - Landlord: Overview · Listings · Messages · Bookings · Profile
  - Renter: Overview · Bookings · Saved · Messages · Profile
- **Page-actions mode** (mobile listing edit / profile section drill-in): e.g. hub `‹ Listings` · `Health` · `Preview`; section `Cancel` / `Save` / `Saving…`; always appends `Ask AI`.

### AI chat widget  (source: `AiChatOpenContext.tsx`, `ChatPanel`)

- Opened from bottom bar `Ask AI` only (no FAB). Desktop: fixed bottom-right panel; mobile: fullscreen.
- Titles: `AI for landlords` / `AI for renters` / `Quni AI`; subtitle `Hi {firstName}` or `Ask me anything.`; buttons `Reset` / `New chat` / `Close`.
- Separate page embeds (`ChatEmbed`) on FAQ/listings/property are not shell chrome.

### Incomplete-profile nudge  (source: `OnboardingResumeBanner.tsx` → `ProfileIncompleteNudge`)

- Default title: `Finish your profile`.
- Shown when: logged-in non-admin; needs onboarding; not on exempt paths (`/onboarding`, auth, `/admin`, …); not on dashboards that own their own nudge (`/student-dashboard`, `/landlord/dashboard`, `/student-profile`); email verified; not already on resume destination.
- Whole card → renter `/student-profile` or landlord `/landlord/dashboard?tab=profile`.
- Subtitle: first renter `blocksBooking` item or `Complete required sections`; landlord step phrases or `Complete required sections`.

---

## 1. Seam pages

### `/signup` — Create an account  (source: `src/pages/Signup.tsx`)

- **Who sees it:** Guests (public). No auth gate.
- **Chrome:** Marketing Header + **FocusFormLegalStrip** (not full Footer).
- **Query / redirects:**
  - `?role=renter` or `non_student` → skip to details as Renter
  - `?role=landlord` → skip to details as Landlord
  - else → primary role-pick step
  - **`?tier=` is not read or rendered by Signup.tsx.** Legacy `/landlord-signup?tier=listing|managed` stores tier in `localStorage` (`quni_intended_landlord_service_tier`) then redirects here with `role=landlord&tier=…` still in the URL; UI ignores tier. Consumed later on listing form / landlord setup.
  - After email signup with session: landlord → `/landlord/dashboard?tab=profile`; renter → `/student-profile`; unverified email → `/verify-email`
  - No session → stay on check-email UI
- **Layout — primary step:**
  - H1: `Create an account` (invite flow: `Create your renter account`; hero title may be `You're invited to book`)
  - Sub: `Already have an account?` + `Log in` → `/login`
  - Prompt: `I am signing up as a…` (invite: `I am a…`)
  - Cards: `Renter` — `Find housing and manage bookings — students and non-students.`; `Landlord` — `List properties and manage enquiries.` (landlord card hidden on tenant-invite)
  - Per-card: `What you'll need to verify` → verification checklist modal
  - Helper: `Not sure what verification involves?` + `See what you'll verify on Quni` + `. You'll choose your situation (student, working, etc.) after sign-up on your profile.`
  - If no role: `Choose one option above to continue with Google or email.`
  - Terms: `I agree to the` Terms of Service / Privacy Policy; landlord also Landlord Service Agreement
  - `Continue with Google` · divider `Or` · `Sign up with email`
- **Layout — details step:** `← Back`; `Signing up as a` **Landlord** or **Renter** `.`; `Your sign-up steps` (1 Create account / 2 Confirm email / 3 Complete profile); fields **Full name**, **Email**, **Password**; submit `Sign up with email` / `Creating account…`; Google again.
- **Check-email state:** H1 `Check your email`; body about confirmation link; `Resend confirmation email`; `Back to log in`.
- **Every clickable:** Log in → `/login`; role cards → set kind; verify links → modal; legal → modals; Google → OAuth; Sign up with email → details or `signUp`; Resend → auth.resend; contact support → `/contact`.
- **States:** step primary|details; accountKind; checkEmail; termsError `Please accept the terms to continue`; tenant-invite hints; submitting.
- **Feature flags:** none on this page.
- **Mobile:** stacked single column (no special alternate layout beyond responsive spacing).

### `/student-signup` — redirect  (source: `StudentSignup.tsx`)

- **Who sees it:** Anyone hitting legacy URL.
- **Behaviour:** `<Navigate to="/signup" replace />` — no UI.

### `/landlord-signup` — redirect + tier stash  (source: `LandlordSignup.tsx`)

- **Who sees it:** Anyone hitting legacy URL (e.g. Pricing CTAs).
- **Behaviour:** If `tier=listing|managed`, write `localStorage` key then `<Navigate to="/signup?role=landlord&tier=…" replace />`. No signup UI of its own.

### `/login` — Log in  (source: `src/pages/Login.tsx`)

- **Who sees it:** Guests. If already signed in, effect redirects (admin → `/admin` or redirect; no role → `/onboarding`; incomplete → profile dest; else dashboard / safe redirect). Unverified → `/verify-email`.
- **Chrome:** Marketing Header + full Footer.
- **Layout:** H1 `Log in`; `New here?` + `Create an account` → `/signup`; optional banner `Your password was updated. Sign in with your new password.`; fields **Email**, **Password**; submit `Sign in` / `Signing in…`; `Forgot password?` → `/forgot-password`; conditional `Resend confirmation email`; divider `Or continue with`; `Google`.
- **States:** submitting; URL error/detail strings; password_updated; confirmation resend; auto-redirect when session present.
- **Feature flags:** none.

### `/pricing` — Pricing  (source: `src/pages/Pricing.tsx`)

- **Who sees it:** Guests and logged-in users (public).
- **Chrome:** Marketing Header + full Footer.
- **Layout, top to bottom:**
  - Hero line: `No hidden fees. You only pay when Quni is working for you.`
  - Chips: `Free for renters` · `Free to list` · `No lock-in contracts`
  - H1 `Pricing`; sub `Free for renters. Free to list for landlords. Choose how much you want Quni to do.`
  - Columns `For renters` / `For landlords`
  - Renter: price `Free`; lines Browse listings / Book a room / Message landlords / Bond; CTA `Find a room →` → `/properties` (→ `/listings`)
  - Landlord: `Quni Listing` / `Quni Managed` cards with fee amounts (loaded for showcase tier `t2`, defaults until API returns)
  - CTAs: `Choose Listing` → `/landlord-signup?tier=listing`; Managed → `Choose Managed` → `/landlord-signup?tier=managed` **or** non-link `Coming soon` when flag off
  - H2 `How it works` · link `See Listing vs Managed flows →` → `/how-it-works`
  - H2 `Common questions` (FAQ accordion buckets)
  - H2 `Ready to find your place?` · `Find a property` → `/properties` · `List your property` → `/landlord-signup`
- **Feature flag `managedTierEnabled`:**
  - **false:** banner headline `Coming soon`; subline `Quni Managed - full tenancy operations - launching within the next month.`; Managed CTA `Coming soon`; how-it-works blurb that Listing is live / Managed launches soon
  - **true:** `Choose Managed` link; parallel-flows how-it-works copy
- **Mobile:** stacked columns.

### `/onboarding` — Welcome to Quni (role gate)  (source: `src/pages/Onboarding.tsx`)

- **Who sees it:** Logged-in users via `RequireUser` (unauth → `/login`; unverified → `/verify-email`). Self-redirects to `/login` if no user. Admin → `/admin`. If terms already complete → post-login destination.
- **Chrome:** Marketing Header + FocusFormLegalStrip.
- **Layout:** H1 `Welcome to Quni`; role body:
  - Landlord: `You're continuing as a` **landlord**. `Please accept the terms below to continue.` + Landlord Service Agreement checkbox
  - Renter: `You're continuing as a` **tenant** ` (covers both student and non-student sign-ups). Please accept the terms below to continue.`
  - Missing role choice amber note defaults to continuing as **student**
  - Checkboxes: Terms of Service + Privacy Policy (links `/terms`, `/privacy`); landlord LSA → `/landlord-service-agreement`
  - CTA `Continue` / `Saving…`
- **Clickables:** legal links (new tab); `hello@quni.com.au` mailto; Continue → save profile + metadata role → dashboard/profile.
- **Sibling redirects (no UI):** `/onboarding/student` → `/student-profile` (renter); `/onboarding/landlord` → `/landlord/dashboard?tab=profile` (landlord).
- **Feature flags:** none.

---

## 2. Marketing pages

### `/` — Home  (source: `src/pages/Home.tsx`)

- **Who sees it:** Everyone (public).
- **Chrome:** Marketing Header + full Footer.
- **Layout, top to bottom:**
  1. **Hero (coral):** eyebrow `Australia's verified accommodation for students, graduates & young professionals`; H1 `Live well` / `near campus.`; body `Browse verified listings near your university or workplace - enquire and book on one marketplace.`; search form (uni/campus or suburb — persona-dependent) + Search → `/listings`…
  2. Fairness / AI trust strip (nationality/gender etc. never sent to AI)
  3. H2 `How it works` — columns `For students` (Search / Enquire / Book) · `For landlords` (List for free / Review applicants / Get paid)
  4. Why Quni trust block — eyebrow `Why Quni`, title `Australian-hosted, Australian-built.`
  5. H2 `Frequently asked questions` — tabs `For students` / `For landlords` (Managed copy flips with `managedTierEnabled`)
  6. Optional dismissible teal banner `Not a student?` → `/rent-near-campus` (`localStorage` `quni_nonstu_banner_dismissed`)
  7. Landlord CTA: H2 `More income. Less vacancy. Predictable returns.` · `Find out more` → `/services/landlord-partnerships` · `List your property` → `/signup`
  8. H2 `Featured properties` — cards or empty `No featured listings yet.` + Browse all listings → `/listings`
  9. `LandlordAIBanner` — H2 `Your listings. Priced. Written.` / `Filled by AI.` · `See how it works →` → `/landlords/ai`
- **States:** Supabase missing / loading listings / persona professional vs student placeholders; `managedTierEnabled` FAQ/how-it-works variants.
- **Mobile:** stacked hero; landlord image order swaps on small screens.

### `/services/landlord-partnerships` — Landlord Partnerships  (source: `src/pages/services/LandlordPartnerships.tsx`)

- **Who sees it:** Public. (`/for-landlords` redirects here.)
- **Chrome:** Marketing Header + full Footer.
- **Layout:** Hero title `Landlord Partnerships`; subtitle about income/vacancy/returns; CTA `List your property free →` → `/signup?role=landlord`; AI banner `See our AI features →` → `/landlords/ai`; numbers / why explore / process / leasing models / checklist; income CTA; Related listings; coral lead form band; `Speak with Quni` → `/contact`; `Become a partner` → signup.
- **Empty related:** configure Supabase / could not load / no listings match…
- **Mobile:** single column under service layout.

### `/landlords/ai` — Landlord AI feature landing  (source: `src/pages/LandlordAIFeaturePage.tsx`)

- **Who sees it:** Public. **Outside MarketingChromeLayout** — custom chrome only.
- **Chrome:** Custom sticky header + custom footer (no site Header/Footer, no AppHeader).
- **Layout:** Badge `Now live across Australia`; H1 `The smartest way to` / `rent to students.`; sub about verified platform + AI; stats `41 Universities · 122 Campuses · AI Powered`; marquee; “old way” H2; feature rows 01–03 (`A polished listing in one click.` / pricing / reply); comparison; testimonials; close `Your property.` / `Your AI advantage.` · `No subscription. No lock-in. Just results.`
- **CTAs:** `List your property →` / `List your property free →` → `/landlord/onboarding` (then redirects to dashboard profile); `See how it works` → `#features`. Demo buttons are non-navigating mocks.
- **Mobile:** CTAs stack; feature rows single column until `lg`.

### `/student-accommodation/:universitySlug` — University SEO  (source: `src/pages/seo/UniversityAccommodation.tsx`)

- **Who sees it:** Public.
- **Chrome:** Marketing Header + full Footer.
- **Layout pattern:** H1 `Student Accommodation near {university.name}`; sub `{city}, {state} - Verified listings for {shortLabel} students`; stats strip; Campuses grid; Featured listings (+ optional “Also nearby”); Area guide `Living near {name}`; `LandlordCtaBand`.
- **CTAs:** campus cards → campus URL; `View all →` → `/listings?uni=…`; empty `Join the waitlist` → `/contact`; landlord `List your property →` → `/landlord-signup`.
- **States:** loading pulse; `Configure Supabase to view this guide.`; `Page not found`; slug alias Navigate to canonical; fetchError banner.
- **Representative claim:** copy and suburbs come from university data + templates — exact suburb/rent numbers are data-dependent.

### `/student-accommodation/:universitySlug/:campusSlug` — Campus SEO  (source: `src/pages/seo/CampusAccommodation.tsx`)

- **Who sees it:** Public.
- **Chrome:** Marketing Header + full Footer.
- **Layout (with content JSON):** Hero → breadcrumbs → intro → listings near campus → Living / Transport / Cost / Tips / FAQ → CTA text → Landlord CTA. Example pattern (UNSW Kensington content): H1 `Student Accommodation near UNSW, Kensington` + Anzac Parade / Roundhouse style intro from JSON.
- **Without JSON (legacy):** breadcrumbs + listings + `About this campus` template + suburbs + sibling campuses + landlord CTA.
- **CTAs:** `View all →` → `/listings?campus_id=…`; suburb chips; sibling campuses; waitlist → `/contact`; landlord → `/landlord-signup`.

### `/how-it-works` — How it works  (source: `src/pages/HowItWorks.tsx`)

- **Who sees it:** Public.
- **Chrome:** Marketing Header + full Footer.
- **Layout:** Hero `How it works` (subtitle flips with `managedTierEnabled`); Why Quni trust; H2 `Quni Listing` (Renters/Landlords steps); H2 `Quni Managed` (same structure; **Coming soon** overlay when `!managedTierEnabled`); CTAs `View pricing` → `/pricing`, `Browse listings` → `/listings`.

### `/faq` — Frequently asked questions  (source: `src/pages/Faq.tsx`, `faqContent.tsx`)

- **Who sees it:** Public.
- **Chrome:** Marketing Header + full Footer.
- **Layout:** Hero `Frequently asked questions` + sub about finding a place / listing / fees / verification; `ChatEmbed`; sticky section nav; accordion sections (About Quni · For students & renters · Verification & identity · For landlords · Money & fees · Bond & compliance · Listing vs Managed · Messaging & enquiries · Hosted rooms vs private rentals · Support & disputes); `Still have a question?` · `Contact us` → `/contact`.

### `/contact` — Get in Touch  (source: `src/pages/Contact.tsx`)

- **Who sees it:** Public.
- **Chrome:** Marketing Header + full Footer.
- **Layout:** Hero `Get in Touch`; form card H2 `Send a message` (subjects: General / Student / Landlord Enquiry / Partnership); landlord ad `Explore landlord partnerships →`; Common questions aside; legal strip; success `Thanks! We'll be back to you within 1 business day`.
- **States:** missing fields; Turnstile not configured → email `hello@quni.com.au`; captcha/API errors.
- **Mobile:** single column; aside below form.

### `/about` — About Quni Living  (source: `src/pages/About.tsx`)

- **Who sees it:** Public.
- **Chrome:** Marketing Header + full Footer.
- **Layout:** Hero `About Quni Living` — `Built for landlords and tenants who expect more`; H2 `About Quinn Lee` — `Founder, Quni Living`; contact lines email | quni.com.au | Australia. No in-page route CTAs beyond mailto/external.

### `/guides` — Guides index  (source: `src/pages/Guides.tsx`)

- **Who sees it:** Public.
- **Chrome:** Marketing Header + full Footer.
- **Layout:** Hero `Guides & advice for student renters`; Articles list (empty: `New guides are on the way.`); Platform help links → `/international`, `/how-it-works`, `/faq`.

### `/guides/:slug` — Guide article  (source: `src/pages/guides/GuideArticlePage.tsx`)

- **Who sees it:** Public.
- **Chrome:** Marketing Header + full Footer.
- **Layout:** Breadcrumbs Home / Guides / headline → H1 from guide SEO → `Updated {dateModified}` → markdown body → optional FAQ → footer links to `/international` and `/listings`. Unknown slug: `Page not found` + link to International students.
- **Registry:** three guides in `src/lib/guides/registry.ts` (e.g. `can-a-landlord-refuse-international-students-australia`).

### `/sample-agreements` — Sample agreements  (source: `src/pages/SampleAgreementsPage.tsx`)

- **Who sees it:** Authenticated `renter | landlord | admin` via `ProtectedRoute`. Still under Marketing chrome.
- **Chrome:** Marketing Header + full Footer.
- **Layout:** breadcrumbs → H1 `Sample agreements` → watermark note → gallery; `Back to dashboard` → role dashboard.
- **States:** spinner; `Sample agreements are not available right now.` / could not load.

### `/terms` — Platform Terms of Service  (source: `Terms.tsx` + `TermsContent.tsx`)

- **Chrome:** Marketing Header + full Footer · `LegalPageShell` band `Terms of Service`, page title `Platform Terms of Service`, TOC §§1–12.
- **Mobile:** “Other legal documents” wrap links at top; desktop sticky TOC.

### `/privacy` — Privacy Policy  (source: `Privacy.tsx` + `PrivacyContent.tsx`)

- **Chrome:** Marketing · LegalPageShell band/page `Privacy Policy`, TOC §§1–12.

### `/non-discrimination` — Non-Discrimination Policy  (source: `NonDiscrimination.tsx`)

- **Chrome:** Marketing · band `Non-Discrimination Policy`; H2s include Our commitment, What this means, Listings…, Limited legal exceptions, How we enforce, Reporting, Agreement.

### `/refunds` — Refund Policy  (source: `Refunds.tsx`)

- **Chrome:** Marketing · Hero `Refund Policy`; H2s `Quni Listing - landlord acceptance fee`, `Quni Managed - tenancy money Quni routes`, `Bond refunds`.

### `/landlord-service-agreement` — Landlord Service Agreement  (source: `LandlordServiceAgreement.tsx`)

- **Chrome:** Marketing · LegalPageShell band/page `Landlord Service Agreement`, TOC §§1–13.

### `/verification` — What you'll verify on Quni  (source: `src/pages/Verification.tsx`)

- **Who sees it:** Public.
- **Chrome:** Marketing Header + full Footer.
- **Layout:** Hero `What you'll verify on Quni`; intro; sticky nav (Students / Working tenants / Landlords / Quick answers); tables for student (Confirm email → university email → Photo ID → Proof of enrolment), working (email → profile → Photo ID → Supporting document), landlord (email → profile → Terms/Privacy/LSA → payment card → insurance optional → identity); Quick answers Q&A. No primary CTA buttons (inline legal links only).

---

## 3. Renter funnel

### `/listings` — Browse listings  (source: `src/pages/Listings.tsx`)

- **Who sees it:** Public (guest / renter / landlord). Redirects: `/search` → `/listings`; `/properties` → `/listings`.
- **Chrome:** Marketing Header + full Footer.
- **Layout:**
  - Dynamic H1 via hero: base `Rooms near campus` (student/guest) or `Professional rentals` (professional renter); may include uni/campus/search/room-type prefixes
  - Subtitle: `Searching…` or `{n} listing(s) available`
  - Conditional banners (welcome; complete verification; set work location; near-distance chip)
  - Filters card (`h2` `Filters`): Search; optional work location / radius; University / Campus (hidden for professional persona); Room type; Weekly rent; Move-in / Move-out / lease length; Furnished only; `Clear all`
  - Results count + sort (Nearest / Price low-high / high-low / Newest); cards → `/properties/{slug}`; empty `No listings found` / `Try adjusting your filters`
- **States:** persona student|professional|guest; auth verification banners; empty/loading.
- **Mobile:** single column filters above results; sticky filter card from `md`.

### `/properties/:slug` (also `/listings/:slug`) — Property detail  (source: `src/pages/PropertyDetail.tsx`)

- **Who sees it:** Public. Guest = `!user` preview; logged-in gets full sections.
- **Chrome:** Marketing Header + full Footer.
- **Shared:** breadcrumb Home → Listings → title; gallery; availability / distance banners; Share.
- **Guest view:** H1 title + Share; suburb/price/campus line; accommodation stats; sidebar Rent/From + Save; **blurred gate** overlay: `Create a free account to see the full listing and send an enquiry.` · `Sign up free` → `/signup?redirect=…` · `Log in` → `/login?redirect=…` · `You'll return to this listing after signing in.` · `← Back to all listings`. Guests do **not** see About/Amenities/House rules/Apply/Message or mobile booking bar.
- **Logged-in view:** About this place · Amenities · House rules · Nearby universities · Similar homes; sticky sidebar (md+): rent, bond, lease, Check availability, Listed by, trust lines (`Verified listing`, `Secure payments via Quni`, `Support available 7 days`); CTAs:
  - Incomplete readiness → first block message + `Complete profile →` → `/student-profile`
  - Unavailable / active booking / default `Apply` → `/booking/{id}` · `Message landlord` · Save
  - Mobile bottom bar (`md:hidden`): rent + Apply / Complete profile / etc.
- **Other states:** student-only wall `Student tenants only`; ended listing `This listing is no longer available`.
- **Note:** Apply URL for unauthenticated is computed as signup redirect, but guest UI does not show the Apply control (gate uses Sign up free instead).

### `/booking/:propertyId` — Apply / booking flow  (source: `src/pages/Booking.tsx`)

- **Who sees it:** Renters only. `ProtectedRoute` with `redirectUnauthenticatedToStudentSignup` → `/signup?role=renter&redirect=…`; `requireStudentListingActions` → incomplete → `/student-profile`. Also email verify / role gates.
- **Chrome:** **App shell** — AppHeader (task title `Apply` on mobile) + AppActionBar; Footer at `sm+`.
- **Early exits:** headings such as `Book a property`, `Student tenants only`, `Cannot book this listing`, `Bookings not available yet`, success `Your booking request was sent` / summary + `Go to dashboard`.
- **Main chrome:** eyebrow `Apply`; H1 = property title; stepper always: `1. Details` → `2. Rent payment` → `3. Bond info` → `4. Payment`.
  - **Listing tier** (`service_tier === 'listing'`): step 1 → skip 2 → step 3 submits (no step 4 / no deposit UI).
  - **Managed tier:** all four steps including Stripe deposit.
- **Step 1 Details:** Move-in date; Lease length (3/6/12/Flexible); `Who will be living here?`; optional co-tenant fields; Include carpark; Booking summary; Message to landlord; `Continue` · `Back to listing`.
- **Step 2 Rent payment (managed):** `How would you like to pay your weekly rent?` — `Pay via Quni (card)` Recommended · `Bank transfer (free - no additional cost)`.
- **Step 3 Bond info:** `About your bond`; acknowledgement checkboxes; guide link `Booking a place you haven't visited`; listing: `Submit booking request`; managed: `Continue to payment`.
- **Step 4 Payment (managed):** `Pay booking deposit`; totals; Stripe; `Pay ${total}`; `← Back to bond step`.
- **Mobile:** booking summary collapsible; step 4 extra bottom padding.

### `/student-profile` — Renter profile hub  (source: `StudentProfile.tsx` → `RenterProfileSetup` / `RenterProfileHub.tsx`)

- **Who sees it:** Renters (`ProtectedRoute`). Also `/student/profile` same component.
- **Chrome:** App shell — AppHeader tabs + mobile bottom nav (Profile active).
- **Hub (`Your profile`):** sections → `?section=…`:
  | ID | Title |
  |----|-------|
  | situation | Your situation |
  | personal | Personal details |
  | verification | Verification |
  | route | situation-specific (e.g. Study & funding) or Your route details |
  | emergency | Emergency contact |
  | about | About you |
  | prefs | Living preferences |
- Footer hub actions: `Sign out` · `Delete account`. Complete banner: `You're all set up` / `Ready to apply`.
- **Mobile:** hub list + drill-in; **desktop:** accordion (`useIsMobile`). Optional divider `Optional · helps landlords match you`.
- **`?tab=bookings`:** redirects to `/student-dashboard?tab=bookings`.

#### Drill-in: Personal details  (source: `RenterProfilePersonalSection.tsx`)

- Fields: First/Last name (or locked Legal names + Preferred name); Date of birth; Phone; Gender; Nationality; Profile photo Upload; `Save section` / `Saving…`; flash `Personal details saved.`
- Mobile action bar: Cancel / Save.

### `/student-dashboard` — Renter dashboard  (source: `src/pages/StudentDashboard.tsx`)

- **Who sees it:** Renters.
- **Chrome:** App shell. In-page title null; tabs in AppHeader / AppActionBar: Overview · Bookings · Saved · Messages · Profile.
- **Overview:** stat cards Bookings / Messages / Profile % or `Finish your profile` nudge → `/student-profile`; Find accommodation → `/listings`; Get support → Qase modal; Stripe payments card; `View sample agreements →` → `/sample-agreements`.
- **Bookings (`?tab=bookings`):** empty `No bookings yet` + `Browse listings`; else mobile cards / desktop rows with status, dates, zones.
- **Saved (`?tab=saved`):** empty `No saved properties yet` + heart hint; else PropertyCard grid.
- **Mobile:** shorter Find accommodation copy; card layouts differ.

### `/messages` — Messages  (source: `MessagesPage.tsx`, `MessagesInbox.tsx`)

- **Who sees it:** Any logged-in user (`RequireUser`). Renters wrapped in renter tab shell.
- **Chrome:** App shell (Messages tab active).
- **Layout:** empty `No messages yet` · `When you message a landlord from a listing, your conversations will appear here.`; desktop split list/thread (`Select a conversation to view messages`); composer `Write a message…` · `Send`.
- **Mobile:** list **or** thread (`/messages/:conversationId`); not split.
- **States:** error + Retry; access denied + Back to messages; loading conversation.

---

## 4. Landlord funnel

### `/landlord/dashboard` — Landlord dashboard  (source: `LandlordDashboard.tsx` + tab panels)

- **Who sees it:** Landlords (`ProtectedRoute`).
- **Chrome:** App shell — Overview / Listings / Messages / Bookings / Profile.
- **Tab query:** missing → overview; `listings` | `bookings` | `profile`; `?tab=enquiries` → `/messages`.

#### Overview

- **Desktop (`sm+`):** funnel incomplete `Finish your profile` · Step 1/2 of 2 · `Finish to publish` · steps Account → Payouts → Listing → Live; or `Profile complete` / `View your listing →`; Stripe payouts; stats Active listings / Messages / Bookings; Need help; Next 7 days; Sample agreements card; Recent activity; optional mixed-tier note.
- **Mobile:** same stats (Messages unread → `All caught up`); profile readiness card; Need help; Next 7 days; sample agreements link — no desktop Recent activity / funnel card layout.

#### Listings (`?tab=listings`)  (source: `LandlordListingsGroupedPanel.tsx`)

- Heading `Listings` (hidden below ~840px); search `Search address or room`; CTA `Add` / `Add listing` (gated to setup if incomplete); filters All / Live / Draft / Booked / Paused; empty `You haven't listed any properties yet.`; room ⋯ menu Edit / Pause|Unpause / Duplicate / Delete; Add room.

#### Bookings (`?tab=bookings`)

- View toggle: `Requests` | `Calendar` | `Timeline`.
- Requests: Booking requests section; Review request →; AI assessment CTA; mobile cards vs desktop table (Student, Verification, Property, Move-in, Rent, Service, Status, Actions).

#### Profile (`?tab=profile`)  (source: `LandlordDashboardProfileTab.tsx`)

- **Step 1 · Required to publish a listing:** Personal details · Address · About you · Agreements  
- **Step 2 · Required to accept bookings:** Payouts & identity  
- **Optional:** Insurance · Languages spoken  
- Mobile hub + `?section=` drill-in; desktop accordion.
- **Personal fields:** Landlord type Individual/Company/Trust; names; phone; company/ABN; Save details.
- Payouts: Stripe Connect; Listing card row when listing billing applies; Managed-only note when `managedTierEnabled` and listing module off.

### `/landlord/property/new` — Listing health hub / form  (source: `LandlordListingEditEntry.tsx`, `ListingHealthHub.tsx`, `LandlordPropertyFormPage.tsx`)

- **Who sees it:** Landlord or admin.
- **Chrome:** App shell (focus/action-bar on mobile; desktop long-form).
- **Mobile:** hub at `/new` or `/new/basic`; drill-in `/new/section/:sectionId`. Desktop: always form; nested hub URLs redirect to `#section-…`.
- **Hub sections:**
  | Title | Subtitle | Tag |
  |-------|----------|-----|
  | Basic info | Listing title, type, availability | |
  | Property details | Bedrooms, bathrooms, registration & compliance | |
  | Inclusions | Furnished, linen, utilities & bills | |
  | Rules | House rules — yes, no or on approval | |
  | Location | Address, map pin, nearby campuses | |
  | Description | Tell students about the place | ✦ AI writer |
  | Pricing | Rent, bond, occupants, surcharges | ✦ AI price |
  | Photos | Upload, reorder, add captions | |
- Setup banner: `We'll walk you through each section in order. Your progress saves as you go.`
- Mobile action bar: `‹ Listings` · `Health` · `Preview`. Focus title `New listing` / `Edit listing`.

#### Drill-in: Basic info  (source: `ListingBasicInfoDrillIn.tsx`)

- Back `Listing health`; h1 `Basic info`; `Step 1 of 8`
- Fields: Listing title (placeholder `e.g. Sunny room near UNSW`, max 60); Listing type tiles Entire place / Private room / Rooming house; Headline optional; Available from; toggle `Open to non-students`
- Actions: setup `Draft` + `Next`; edit `Cancel` + `Save`
- **Desktop long-form also:** `Quni service model` Listing vs Managed — Managed tile/hint gated by **`managedTierEnabled`** (coming-soon copy when false).

### `/landlord/bookings/:bookingId/review` — Booking review  (source: `LandlordBookingReviewPage.tsx`)

- **Who sees it:** Landlords.
- **Chrome:** App shell; focus title `Booking review`; back `Bookings`.
- **Layout:** sticky action rail (first on mobile) + main. Titles by status (Booking request, Awaiting response, Bond pending, …).
- **Primary actions (status-dependent):** `Accept as Quni Listing` / `Accept as Quni Managed` / `Upgrade and accept as Quni Managed`; `Decline booking`; `Request more information`; bond received / cancel / resend payment / View agreement / Message tenant / `← Back to bookings`.
- **Gates:** Verify identity / Add a payment method / Add payee bank details / listing paused / etc.
- **Main sections:** The applicant · AI assessment · Fit summary · Messages · tier chooser `How will you handle this tenancy?` (when Managed upgrade UI allowed via `managedTierEnabled` + booking state) · Tenancy agreement · Activity.
- **Modals:** Decline; Request more information; Mark bond; Cancel; Resend payment.

### Invite-tenant modal  (source: `LandlordTenantInviteModal.tsx`)

- **Intended context:** Mounted from `LandlordDashboard` listings tab; intended when listing `status === 'active'` and `service_tier === 'listing'`.
- **What renders when open:** h3 `Invite a tenant`; body about share link/email; fields Tenant email · Tenant name (optional) · Note (optional); toggles special rent offer / bond override; `Send invite email` · `Copy link only`; success Copy this link now; Pending invites (Email again / Copy again / Revoke); Close.
- **Wiring state (code fact):** `onInviteTenant` is passed into `LandlordListingsGroupedPanel` → `LandlordPropertyGroupCard`, but the group card **does not call it**. `LandlordPropertyListingActions` (`Invite a tenant` button) is **not imported** by live listings UI. Modal component exists; **no live open control in the current listings UI** — treat as implemented UI without a reachable trigger until wired.

### Landlord redirects (no page UI)

| Path | Destination | Source |
|------|-------------|--------|
| `/landlord-dashboard` | `/landlord/dashboard` (+ search/hash) | `LandlordDashboardRedirect.tsx` |
| `/landlord/profile`, `/landlord-profile` | `/landlord/dashboard?tab=profile` (+ hash→section map) | `LandlordProfileRedirect.tsx` |
| `/landlord/onboarding` | `/landlord/dashboard?tab=profile` | `App.tsx` |
| `/onboarding/landlord` | same profile path | `App.tsx` |

---

## 5. Other redirects & dead ends worth knowing

| Path | Behaviour |
|------|-----------|
| `/search` | → `/listings` |
| `/properties` | → `/listings` |
| `/for-landlords` | → `/services/landlord-partnerships` |
| `/student-signup` | → `/signup` |
| `/landlord-signup` | → `/signup?role=landlord` (+ optional tier stash) |
| `/onboarding/student` | → `/student-profile` (renter) |
| Unknown path under marketing or admin | `NotFoundPage` |
| `/invite/:token` | Tenant invite landing (FocusFormLegalStrip; not expanded in this atlas priority list — see `InviteTenantPage`) |

---

## Summary table

| Route | Chrome | Primary CTA | Destination |
|-------|--------|-------------|-------------|
| `/signup` | Marketing + legal strip | `Sign up with email` / `Continue with Google` | Profile / verify-email / check-email UI |
| `/login` | Marketing + Footer | `Sign in` | Dashboard / profile / onboarding / verify-email |
| `/pricing` | Marketing + Footer | `Find a room →` / `Choose Listing` / Managed CTA | `/properties` · `/landlord-signup?tier=…` |
| `/onboarding` | Marketing + legal strip | `Continue` | Role dashboard / profile |
| `/` | Marketing + Footer | Search / `List your property` | `/listings` · `/signup` |
| `/services/landlord-partnerships` | Marketing + Footer | `List your property free →` | `/signup?role=landlord` |
| `/landlords/ai` | Custom AI chrome | `List your property free →` | `/landlord/onboarding` → profile tab |
| `/student-accommodation/:uni` | Marketing + Footer | `View all →` | `/listings?uni=…` |
| `/student-accommodation/:uni/:campus` | Marketing + Footer | `View all →` | `/listings?campus_id=…` |
| `/how-it-works` | Marketing + Footer | `View pricing` / `Browse listings` | `/pricing` · `/listings` |
| `/faq` | Marketing + Footer | `Contact us` | `/contact` |
| `/contact` | Marketing + Footer | Submit message | API / mailto fallback |
| `/about` | Marketing + Footer | mailto / site link | external |
| `/guides` | Marketing + Footer | Article cards | `/guides/:slug` |
| `/guides/:slug` | Marketing + Footer | Browse / international links | `/listings` · `/international` |
| `/sample-agreements` | Marketing + Footer (auth) | `Back to dashboard` | Role dashboard |
| `/terms` · `/privacy` · `/refunds` · `/non-discrimination` · `/landlord-service-agreement` | Marketing + Footer | Cross-legal links | Peer legal routes |
| `/verification` | Marketing + Footer | (none primary) | Inline legal links |
| `/listings` | Marketing + Footer | Property cards | `/properties/:slug` |
| `/properties/:slug` | Marketing + Footer | Guest: `Sign up free` · Auth: `Apply` | `/signup` · `/booking/:id` |
| `/booking/:propertyId` | App shell | `Continue` / `Submit booking request` / `Pay $…` | Next step / dashboard |
| `/student-profile` | App shell | Section rows / `Save section` | `?section=` drill-ins |
| `/student-dashboard` | App shell | Tab actions / Browse listings | tabs · `/listings` |
| `/messages` | App shell | `Send` | Conversation thread |
| `/landlord/dashboard` | App shell | Tab CTAs / `Add listing` / `Review request →` | tabs · edit · review |
| `/landlord/property/new` | App shell | Section / `Next` / `Save` | Hub sections · publish path |
| `/landlord/bookings/:id/review` | App shell | Accept / Decline / Request info | Status transitions · `/messages` |
| Invite-tenant modal | (overlay on dashboard) | `Send invite email` / `Copy link only` | Invite link / email — **no live open control today** |

---

*End of atlas. Design room: use this file as the continuity source for seam work (signup line, pricing de-menu) before inventing screens.*
