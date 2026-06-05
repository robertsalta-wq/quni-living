# Quni Living - Dual-Tier Service Model and Persona Expansion

**Status:** Strategic decisions locked. Implementation sequencing TBD.
**Date:** April 2026
**Author:** Rob (with strategic input from Claude and Cursor)

This document captures architectural and product decisions made during a multi-hour strategy session in April 2026. It exists so future sessions (Claude, Cursor, contractors) have shared context without re-deriving it from chat logs.

---

## The shift in one paragraph

Quni Living is moving from a single-tier marketplace (10% landlord service fee, full tenancy management) to a dual-tier service model under one brand: **Quni Listing** (low-friction listing-only product, $99 flat per accepted booking, landlord runs the tenancy) and **Quni Managed/Complete** (full tenancy operations, 7% per booking with active tenant). Simultaneously, the brand opens up from students-only to *students and professionals near campus*. The architecture for both was already partially built; this document captures what's decided and what remains to be built.

---

## Why this matters strategically

Three problems this solves at once:

1. **NSW launch is blocked on PSAA 2002 licensing.** Quni Listing has no PSAA exposure (Quni never touches rent), so it can launch nationwide today. Managed/Complete waits on Jenny's opinion for NSW. QLD Managed is already legally clear via Rob's full Class 1 Real Estate Agent licence (#4809870).
2. **Cold-start landlord supply.** Listing tier is unambiguously cheaper than every alternative (Flatmates, RentBetter, traditional REAs), removing the price barrier to acquiring supply.
3. **Sub-optimal positioning vs Flatmates.** Quni's verification + AI tools + tenancy docs were buried under a 10% fee that read as expensive. Splitting into Listing ($99) and Managed (7%) repositions the platform.

The dual-tier model also creates a demand-pull dynamic: students prefer the Managed tier (more protection), which generates upward pressure on Listing landlords to upgrade. This is analogous to Airbnb's on-platform lock-in mechanic.

---

## What's decided

### Service tiers

| | **Quni Listing** | **Quni Managed/Complete** |
|---|---|---|
| Price | $99 flat per accepted booking | 7% of weekly rent (active tenant only) |
| What landlord gets | Listing, verified renters, AI tools, tenancy documents + e-signing | Everything in Listing + rent collection, RBO bond lodgement, dispute support, move-in protection, maintenance routing |
| What landlord handles | Rent, bond, disputes, maintenance | Nothing (Quni runs the tenancy end to end) |
| PSAA 2002 exposure | None | NSW Tier 2 only (gated on Jenny) |
| Geographic availability | Everywhere | QLD now; NSW + VIC pending |

The second-tier name (Managed vs Complete) is **still open**. We have a small comprehension test running with potential landlords. Until decided, treat them as interchangeable in code (one canonical name in DB; UI string driven by a config value).

### Pricing rationale

Listing at $99 is positioned against Flatmates' subscription model (~$36/month for landlords + same for tenants, no result guarantee). Managed at 7% beats Sydney REA all-in cost (~$1,690 for a $550/wk × 26-week tenancy at 5.8% management + 1.2 weeks letting fee + extras) by ~$700 per tenancy. Renter side moves to zero fees (was $49 booking + 3% platform under v2 model).

This dropped per-tenancy revenue from ~$1,394 (10%) to ~$1,001 (7%). Year 3 projection drops accordingly from $2.16M to ~$1.5M, but the model becomes structurally defensible at launch. Pricing can be revisited once the platform has 100+ active tenancies and real data.

### Persona expansion

Brand opens to *students and professionals near campus*. The non-student signup path was already built architecturally - this decision activates it as a co-primary persona rather than a secondary segment.

- **Headline (locked)**: *"Verified housing near your university or workplace. For students and professionals near campus."*
- **Signup page**: three equal-weight cards (Student / Professional / Landlord). The "Non-Student" label renames to "Professional" at UI layer; DB field stays `non_student` for backwards compatibility.
- **SEO content**: stays student-led. Suburb and university pages don't change. The student-keyword volume is real and Flatmates doesn't compete there - that's the moat.
- **University partnerships**: stay student-led. Student unions and university accommodation offices are still served - they just don't need to know the platform also serves professionals.

Cursor flagged that professionals near campus may need different product treatment (room norms, age preferences, shared-space etiquette templates). This is real implementation scope that's not yet sized.

### Geographic sequencing

| Property type | Listing tier | Managed tier |
|---|---|---|
| Tier 1 (hosted, boarder/lodger) | Live nationally | Live nationally (no PSAA exposure) |
| Tier 2 (private RTA) NSW | Live | **Blocked on Jenny** |
| Tier 2 (private RTA) QLD | Live | Live (Rob's Class 1 #4809870) |
| Tier 2 (private RTA) VIC | Live | Pending VIC lawyer |
| Tier 3 (boarding house) | Post-launch | Post-launch |

### Demand-pull dynamic

Listing-tier landlords are upgraded through three mechanisms:

1. **Booking-stage upgrade request** - primary trigger. Student requesting to book a Listing property checks: *"I'd like this to be a Quni Managed tenancy."* Landlord receives the booking request with the upgrade flag. Landlord clicks one of three buttons: *Accept as Managed (7%)*, *Accept as Listing ($99)*, or *Decline*. If Managed is accepted, the $99 Listing fee is waived (no double charging).
2. **Search filter** - students can filter for "Quni Managed only" or sort with Managed properties prioritised. Listing-tier landlords see their conversion rate drop and self-select into upgrading.
3. **In-product education** - landlord dashboard shows: *"X% of bookings on your listing requested Managed protection."*

### Anti-circumvention: contact masking

Listing tier is structurally exposed to off-platform booking (no money flows through Quni, so nothing forces the booking to complete on-platform). Contact masking is the primary defence:

- Phone numbers and email addresses are masked in messages between renter and landlord during the enquiry phase
- Masking is applied via regex at message render time
- Unmasking happens automatically at booking acceptance + Listing fee paid (or upgrade to Managed)
- **Admin feature flag** controls whether masking is active platform-wide. Stored in `platform_config`. Default state to be decided at launch.

This is not landlord-controlled. Allowing landlords to disable their own masking would defeat the mechanism (anyone wanting to circumvent would just disable). Admin-controlled toggle gives operational flexibility without breaking the model.

### Non-goals at Listing onboarding

When a landlord chooses Listing tier during onboarding, they see an explicit non-goals screen (not buried in Terms):

> **What Quni Listing does NOT include**
> Once your tenant is signed, you run the rest:
> - **Rent collection** - your tenant pays you directly. Quni never touches the money.
> - **Bond** - you lodge it yourself (NSW Fair Trading for private rooms; held by you for hosted rooms).
> - **Disputes** - we don't mediate between you and your tenant.
> - **Late rent or arrears** - chasing payment is on you.
> - **Maintenance and repairs** - your tenant contacts you, not Quni.
> - **Move-out and final bond** - final inspection and bond release are your responsibility.
>
> *Want all of this handled? Choose **Quni Managed** - 7% per booking, full tenancy operations.*

This protects against regulatory boundary creep and makes the upgrade pitch obvious. Cursor specifically recommended this surface live at onboarding rather than in Terms.

---

## How this layers onto existing architecture

The service tier (Listing vs Managed) sits **above** the existing property tier classification (T1/T2/T3) - they're orthogonal:

- **Property tier** = legal classification (boarder/lodger / RTA / boarding house). Already implemented via `private_room_landlord_on_site` field and `resolveTenancyPackage` in `api/lib/tenancy/rules/`.
- **Service tier** = operational scope (Listing or Managed). New concept.

A Tier 2 (RTA private room) property can be on either Listing or Managed. So can a Tier 1. The TenancyRules layer already returns `bondCopy`, `schemeApplies`, etc. based on property tier - service tier needs to layer on top, controlling the ops/payment workflow but not the legal document content.

This means existing files don't need to be torn up. The service tier is an additive layer.

---

## Implementation surface area

### New things to build

1. **Database** - `service_tier` enum on tenancy and/or property record (`listing` | `managed`)
2. **Database** - `upgrade_requested` boolean on booking record
3. **Database** - `platform_config` entries: `contact_masking_enabled`, `service_tier_naming` (managed|complete), `quni_listing_fee_amount`, `quni_managed_fee_percentage`
4. **Booking acceptance UI** - three-button accept screen for landlords with upgrade-flagged bookings
5. **Listing onboarding** - non-goals screen for Listing-tier landlords
6. **Listing card UI** - service tier badge ("Quni Managed" or no badge for Listing)
7. **Search/filter** - students can filter or sort by service tier
8. **Messaging masking** - regex layer applied to messages until booking accepted, controlled by `platform_config` flag
9. **Admin dashboard** - toggle for contact masking (and other config-driven settings)
10. **Fee resolution logic** - Listing fee charged or waived based on service tier outcome of booking acceptance

### Things to modify

1. **Pricing page** (`/pricing`) - current page shows old fees and incorrect bond information ("held via Stripe"). Full rewrite needed. Mockups exist at `/mnt/user-data/outputs/quni-variant-{a,b}-blocks.html` for reference.
2. **Homepage hero** - locked headline replaces current copy
3. **Signup page** - Professional path equal weight, "preview the non-student landing page" link removed
4. **Footer copy** - current "Premium student accommodation... student-focused" is now inconsistent
5. **Landlord onboarding flow** - adds tier choice step (Listing vs Managed)

### Things deliberately untouched

1. Suburb/university SEO pages - stay student-led for keyword volume
2. University partnerships outreach - stays student-led
3. Tier 1/2/3 property classification - separate concept from service tier
4. Existing TenancyRules layer - service tier sits above it, doesn't replace it
5. Tier 3 (boarding house) - deferred per existing roadmap

---

## What's still open

1. **Tier name** - Managed vs Complete. Test running. Default to Managed in code; UI string driven by `platform_config.service_tier_naming` for easy switch.
2. **Persona product scope** - room norms, age preferences, shared-space templates for professionals near campus. Not sized yet.
3. **NSW Managed launch timing** - gated on Jenny's PSAA 2002 opinion.
4. **Tiered pricing** - possible future move to 7% under 30 weeks / 5% over 30 weeks. Data-driven decision post-launch. Not at launch.
5. **VIC Managed** - pending Victorian property lawyer engagement.

---

## Question for Cursor

Given all of this, please review and advise. I'm not asking for any code yet - I want to lock the approach before any implementation.

1. **Sequencing** - what order should these changes ship in? My instinct is:
   - First: contact masking + admin toggle (low risk, high defensive value, can ship invisibly)
   - Second: pricing page rewrite (urgent - current page misrepresents fees and has the bond/Stripe error)
   - Third: booking-stage upgrade flow (the feature that operationalises the demand-pull dynamic)
   - Fourth: non-goals onboarding screen + tier badge on listing cards
   - Last: filters + search ranking changes (only meaningful once supply has both tiers)
   
   Do you agree, or is there a dependency I'm missing?

2. **Database schema** - should `service_tier` live on the property record, the tenancy record, or both? How does it interact with the existing `TenancyRules` resolver? My instinct: on the **booking** at acceptance time, denormalised onto the **tenancy** when created. Property record stays tier-agnostic so a landlord can switch a property between tiers without rewriting history.

3. **Migration risk** - any existing properties or bookings need backfilling? What's the safest approach for production data?

4. **Prompt slicing** - would you recommend one mega-prompt covering everything, or smaller prompts per feature? If sliced, which feature would you tackle first?

5. **Anything I'm missing** - is there anything in the existing codebase (the `TenancyRules` layer, the booking flow, the message system, Stripe Connect setup, DocuSeal integration) that would conflict with this model, or any failure modes you'd flag?

6. **Defaulting Cursor's earlier sharpening points** - Cursor previously recommended (a) the non-goals paragraph at Listing onboarding, (b) reconsidering tier naming because "Complete" is asymmetric, and (c) modelling support cost per tier and upgrade rate. Items (a) and (b) are reflected here. (c) is a behavioural model that's separate from this implementation work - agree it can wait until post-launch data?

This is review-only. Don't implement anything yet - I want to lock sequencing and approach before any code changes happen.
