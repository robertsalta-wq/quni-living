# Audit: QLD rooming accommodation vs what Quni does today

**Date:** 5 Sep 2026
**Scope:** Audit only. No code, no PR, no patch.
**Trigger case:** Quang Dinh, Jamboree Heights, Brisbane. He does not live at the house. He lets it room by room (two rooms currently), shared kitchen and bathrooms. Question: does Quni treat that as rooming accommodation and use Form R18 (v15 Sep25), or Form 18a?

**Law used here:** Rob's 4 Sep 2026 RTA verification, taken as given. This file does not re-litigate it. It asks what the code actually does against that reading.

---

## Verdict in one paragraph

Quang's arrangement is classified as QLD Tier 2 and generates a Form 18a plus the Quni platform addendum, with no warning, no opt-in capture, and no Form R18 path. Nothing upstream catches it. The rooming-house card is a NSW registration concept and is a dead end in Queensland. The only place we state the s 43 / Form R18 rule correctly is the live-in helper, which Quang never sees. Your four beliefs are substantially right. The most useful correction is this: we *do* capture whether the landlord lives on site (`property_type`), and the document router *does* read it. The bug is the mapping, not a missing field. QLD off-site room is treated as a general tenancy because the truth table was designed around NSW "host lives here / host does not."

---

## Your four beliefs, confirmed or corrected

### 1. Quang lands on "One private room" and we collect almost nothing else

**Mostly right.** The listing form cards live in `src/lib/landlordAccommodationChoice.ts` (`ACCOMMODATION_UI_OPTIONS`) and render in `src/pages/landlord/LandlordPropertyFormPage.tsx` under "What is the tenant renting?"

"One private room" persists:

| Stored field | Value |
|---|---|
| `properties.property_type` | `private_room_landlord_off_site` |
| `properties.room_type` | `single` or `studio` ("Room for rent") |
| `properties.is_registered_rooming_house` | `false` |

What that path does **not** collect: occupancy as a legal question, room count for the house as a classifier input, services as Level 1/2/3, a room number, or an explicit "do you live here?" follow-up. The card copy already asserts "You do not live on site." Choosing it *is* the live-in answer.

Corrections, not contradictions:

- Bedrooms and bathrooms *are* collected, and the helper copy tells share-house listers to enter totals for the whole property. Those numbers are listing chrome. They are not an input to `resolveTenancyPackage`.
- `properties.max_occupants` is collected. That is people allowed in *this advertised room*, usually 1-2. It is not "rooms in the house" and the NSW T3 plan already warns not to use it as a 5+ house test (`docs/plans/nsw-t3-boarding-house-occupancy-agreement-plan.md` D22).
- `properties.rooms_rented_to_residents` exists, but is only saved when QLD + `private_room_landlord_on_site` (`LandlordPropertyFormPage` save payload, `qldOnSiteSave`). For Quang it is written `null`.
- Linen and weekly cleaning checkboxes exist (`linen_supplied`, `weekly_cleaning_service`). They are not a rooming services classification.

### 2. The state switch resolves QLD + off-site room to Form 18a plus the Quni addendum

**Right.** That is exactly what `resolveTenancyPackage` does, and it is covered by a unit test that treats this as the intended outcome.

The listing-extractor phrase you quoted ("agreement template: NSW FT6600 / Tier 1 occupancy vs QLD Form 18a") is not in this repo. I could not find a file by that name. The live router matches the description: QLD off-site room is Form 18a, not occupancy, not R18.

### 3. The rooming-house block never fires for him; QLD T3 is deferred; the particulars are NSW

**Right, and slightly worse than you said.** The "Rooming house" card requires a registration number and is the only way to set `is_registered_rooming_house = true`. Quang has no reason to pick it, and should not. If he did:

- QLD + off-site + registered flag → `resolveTenancyPackage` returns `supported: false`, tier T3, reason "Rooming/boarding house (T3) tenancy agreements are not available on the platform yet."
- NSW T3 particulars ("Boarding-house occupancy particulars") render only when `isNswT3Listing` (NSW + off-site + registered). A QLD listing never sees that block.
- QLD T3 is also `listing: unsupported` and `managed: unsupported` in `api/lib/serviceTier/qld.ts`. Saving as Listing then fails with "Quni Listing is not available for this property." So the registered-rooming path in QLD is not a silent NSW PDF. It is a save/accept dead end.
- QLD T3 is deferred in `resolveTenancyPackage`. There is no `qldTenancyRules('T3')`. Comment in `api/lib/tenancy/rules/qld.ts` says so explicitly.

### 4. The only correct statement of the QLD rooming rule is the live-in helper; the inverse is nowhere

**Right.** `qldOnSiteListingCallout()` in `src/lib/tenancy/qldBoarderLodger.ts` cites s 43 and names Form R18. `LandlordPropertyFormPage` only renders that block when `isQldOnSiteBoarderLodgerListing(state, propertyListingType)` is true, which requires `private_room_landlord_on_site`.

The inverse (provider not resident → rooming accommodation at any room count → Form R18) does not appear in product copy, in the router, in tests, or in the admin truth table. The closest notes are NSW-shaped: rule-map Q1-QLD still says the fork is "on-site (boarder/lodger, s43) vs off-site" (`api/lib/tenancy/rules/ruleMapData.ts`). Off-site is assumed to be a general tenancy.

---

## What we do today

### Routing and classification

#### Full path: QLD, off-site, one private room, to a signed PDF

1. **Card.** `LandlordPropertyFormPage` → `ACCOMMODATION_UI_OPTIONS` → "One private room".
2. **Persist.** `selectAccommodationChoice('private_room_landlord_off_site')` sets `property_type = private_room_landlord_off_site`, `room_type = single` (or studio), `is_registered_rooming_house = false`. Address `state` is a separate field (QLD).
3. **Property tier (pricing / service matrix, not the document router).** `resolvePropertyTierFromListing` in `src/lib/pricing/index.ts`: on-site → `t1`; off-site + registered flag → `t3`; everything else → `t2`. Quang is `t2`.
4. **Service availability.** `qldServiceTierAvailability('t2')` → Listing and Managed both available. No gate.
5. **Apply.** Renter applies. Bond copy on `src/pages/Booking.tsx` uses `resolveTenancyPackage`. For this listing that is QLD T2 scheme copy (RTA lodgement, 4-week cap, Form 2). The QLD boarder/lodger callout does **not** render (it keys off on-site only).
6. **Accept.** `runListingConfirmBooking` (`api/lib/booking/confirmListing.ts`) calls `preflightListingTenancyDocument`.
7. **Router.** `resolveListingTenancyGenerator` (`api/lib/documents/listingTenancyGeneration/resolveGenerator.ts`) builds `tenancyPackageInputFromBooking` from `properties.state`, `properties.property_type`, `properties.is_registered_rooming_house` (plus move-in date, ignored in v1). Then `resolveTenancyPackage`.
8. **QLD off-site branch.** In `api/lib/resolveTenancyPackage.ts`, after the T3 registered-rooming check fails (flag is false) and the T1 on-site check fails, this block matches:

   `private_room_landlord_off_site` **or** `entire_property` **or** `shared_room`, and not registered rooming, and `state === 'QLD'` → `generator: 'qld-form18a'`, `pdfKind: 'residential_tenancy_agreement'`, `signingPackageName: 'QLD Form 18a - General Tenancy Agreement'`.

9. **Generate.** Registry `api/lib/documents/listingTenancyGeneration/registry.ts` → `runQldForm18aListingTenancy` → `api/lib/documents/officialQldForm18aFill.ts` fills `docs/qld/form18a-renamed.pdf`, then `QuniPlatformAddendumQld.tsx` is bundled into the same DocuSeal package.
10. **Sign.** `api/lib/docuseal.ts` emails "Your QLD Form 18a tenancy agreement is ready to sign."

There is no warning, no "this may be rooming accommodation" interrupt, and no statutory election to opt into Form 18a.

#### What `resolveTenancyPackage` actually keys on

File: `api/lib/resolveTenancyPackage.ts`.

**Inputs** (`TenancyPackageInput`):

- `state` (NSW / VIC / QLD; anything else → `unsupported_state`)
- `property_type`
- `is_registered_rooming_house`
- `date` (accepted, ignored in v1)

**Known `property_type` values:**

- `private_room_landlord_on_site`
- `private_room_landlord_off_site`
- `entire_property`
- `shared_room`

Anything else → `unknown_property_type`.

**Truth table (live, including tests in `api/lib/resolveTenancyPackage.test.ts`):**

| State | `property_type` | Registered rooming? | Tier | Generator | Document |
|---|---|---|---|---|---|
| NSW | on-site | no | T1 | `nsw-occupancy` | Quni occupancy licence |
| NSW | off-site / entire / shared | no | T2 | `nsw-ft6600` | FT6600 + NSW addendum |
| NSW | off-site | **yes** | T3 | `nsw-boarding-house` | NSW Standard Occupancy Agreement |
| QLD | on-site | no | T1 | `qld-occupancy` | Quni occupancy licence (not 18a, not R18) |
| QLD | off-site / entire / shared | no | T2 | `qld-form18a` | Form 18a + QLD addendum |
| QLD | off-site | **yes** | T3 | none | deferred, `supported: false` |
| VIC | on-site | no | T1 | `vic-occupancy` | Licence to Occupy |
| VIC | off-site / entire / shared | no | T2 | `vic-form1` | Form 1 + VIC addendum |
| VIC | off-site | **yes** | T3 | none | deferred |

QLD is not a special classifier. It is the same NSW-shaped matrix with a different generator id on the T2 row.

Re-exports: `src/lib/tenancy/resolveTenancyPackage.ts` → `api/lib/resolveTenancyPackage.ts`. Admin probes: `src/pages/admin/AdminStateWorkflows.tsx` (`qld-t2` intent: "Residential tenancy-style (off-site / entire / shared)").

#### Listing-form property types vs documents, per state

UI cards (`AccommodationUiChoice`) collapse to four DB `property_type` values:

| Card title | Persisted `property_type` | `room_type` | Registered flag | NSW document | QLD document | VIC document |
|---|---|---|---|---|---|---|
| Whole house | `entire_property` | `house` | false | FT6600 | **Form 18a** | Form 1 |
| Whole apartment / unit / granny flat | `entire_property` | `apartment` | false | FT6600 | **Form 18a** | Form 1 |
| Studio (whole place) | `entire_property` | `studio` | false | FT6600 | **Form 18a** | Form 1 |
| One private room | `private_room_landlord_off_site` | `single` or `studio` | false | FT6600 | **Form 18a (Quang)** | Form 1 |
| Rooming house | `private_room_landlord_off_site` | `single` or `studio` | **true** | NSW T3 occupancy | **unsupported** | **unsupported** |
| A room in my home | `private_room_landlord_on_site` | `single` | false | occupancy | occupancy (s 43 helper) | occupancy |
| A shared bedroom | `shared_room` | `shared` | false | FT6600 | **Form 18a** | Form 1 |

QLD *entire place* as Form 18a is the correct instrument if the tenant has exclusive possession of the whole dwelling. QLD *off-site room* and *shared bedroom* as Form 18a is the Quang bug.

#### Do we ask, capture, or infer whether the landlord lives at the property?

**Yes, we capture it. The router reads it.** It is not copy-only.

- Capture: the accommodation card. On-site vs off-site is `property_type`, not a separate boolean.
- Router: `resolveTenancyPackage` branches on `private_room_landlord_on_site` vs the off-site set.
- Copy: `qldOnSiteListingCallout` / `isQldOnSiteBoarderLodgerListing` read the same field, but only to show the s 43 helper.

What we do *not* capture on the off-site room path: room count as a legal input, whether the provider is absent from the premises, exclusive possession of the room vs the house, or an election to use Form 18a instead of R18.

### The rooming-house path

**Persist.** Card `registered_rooming_house` → same `property_type` as "One private room", plus `is_registered_rooming_house = true` and a required `rooming_house_registration_number`. Validation: `roomingHouseFieldErrors` in `landlordAccommodationChoice.ts` (registration required; cannot combine with on-site).

**Gate.** NSW-only extras:

- Particulars UI and save of `room_description`, `shared_areas`, `additional_charges` (`isNswT3Listing`).
- Compliance attestation (`src/lib/tenancy/nswT3ComplianceAttestation.ts`, table `property_t3_attestations`). Publish blocked without it (`useLandlordPropertyListingActions.assertNswT3ComplianceBeforeActivate`). QLD is not in that predicate.
- Bond cap 2 weeks (`T3_MAX_SECURITY_DEPOSIT_WEEKS`) only when `isNswT3Listing`. A QLD registered-rooming listing would still use the 4-week cap *if it could be saved*, which it cannot.

**QLD listing that selects Rooming house:**

- Does **not** produce NSW artefacts.
- Does **not** fall through to Form 18a (the registered flag takes the T3 deferred branch first).
- **Blocks save** if service tier is Listing: `listingTierAvailable` is false (`LandlordPropertyFormPage` ~2502).
- **Blocks accept** if a row somehow exists: `landlordAcceptTierUiModel` hides Listing when `avail.listing === 'unsupported'`; `confirmListing` preflight returns 400 `agreement_preflight_failed`; `confirmManaged` returns `tenancy_package_unsupported`.

"Blocks accept" is therefore real, but it is keyed off **`is_registered_rooming_house`**, not off "QLD off-site room." Quang never hits it.

State-awareness: the *document* deferral is state-aware (NSW T3 live, QLD/VIC T3 not). The *card* and the registration-number field are not. The heading "Boarding-house occupancy particulars" is NSW Boarding Houses Act 2012 language.

### Copy and disclosure surfaces

There is **no** `(state, property_type)` content record. Closest structures:

| Record | Keys | What QLD off-site room gets |
|---|---|---|
| `ACCOMMODATION_UI_OPTIONS` | card id only | Same national copy as NSW. "Not a registered boarding house." |
| `AGREEMENT_BY_STATE` in `api/lib/tenancy/jurisdictionCopy.ts` | state × tier | QLD T2: "Legally binding Queensland-compliant tenancy agreement" under the RTRA Act 2008. Does not name Form 18a. Does not mention R18. |
| `qldOnSiteListingCallout` | QLD + on-site only | Not shown. |
| `LANDLORD_RULE_MAP_ROWS` | question × state | Empty law cells. Q2-QLD note: "Form 18a v23 Sep25". |
| Admin canonical scenarios | state × intended tier | `qld-t2` = Form 18a path. |

#### Every product surface that names a QLD document to a landlord or renter

These currently tell a Quang-style landlord (or his renter) that they are in a **general tenancy / Form 18a** world:

1. **Generated PDF itself** - official Form 18a (`officialQldForm18aFill.ts`) plus addendum subtitle "Supplementary to the General Tenancy Agreement (Form 18a)" (`src/lib/documents/QuniPlatformAddendumQld.tsx`).
2. **QLD addendum body** - Form 18a named throughout (platform role, damage, ending, bond, entry via **Form 9**, inconsistency clause, early-termination costs). Entry clocks are general-tenancy Form 9, not rooming Form R9. Condition reports named are **Form 1a / Form 14a**, not Form R1.
3. **DocuSeal package** - `api/lib/docuseal.ts`: "QLD Form 18a General Tenancy Agreement.pdf", "Your QLD Form 18a tenancy agreement is ready to sign."
4. **Signing explainer** - `TenancyAgreementExplainer` / `tenancyAgreementExplainerCopy`: "Legally binding Queensland-compliant tenancy agreement" + RTRA Act. Used on landlord review (`LandlordBookingReviewPage`) and renter booking (`RenterBookingZones`).
5. **Download filename** - `signedTenancyAgreementDownloadFilename('QLD')` → `QLD-Residential-Tenancy-Agreement.pdf`.
6. **Utilities form** - all QLD listings, including T1, see "Form 18a Items 13-15" (`LandlordPropertyUtilitiesFields.tsx`, `propertyUtilitiesFormValidation.ts`, `propertyUtilitiesResolver.ts`). `showPropertyUtilitiesSection` is `state in {QLD, VIC}`, not "this listing is T2."
7. **Sample library** - `public/agreement-samples/manifest.json`: QLD T2 = "General tenancy agreement (Form 18a)". No QLD R18 sample.
8. **Bond UI / emails** - QLD T2 uses scheme copy and Form 2 lodgement (`qldRtaBondCopy.ts`, `QldRtaLodgementGuidance.tsx`, `listingBondPaymentCopy.ts`). Correct *if* this were a general tenancy. Wrong instrument framing for rooming, even though RTA lodgement of a taken bond is still the QLD rule.

Surfaces that name Form R18, but **not** on Quang's path:

9. Live-in listing helper (`qldOnSiteListingCallout`) - landlord only, on-site only.
10. Live-in occupancy PDF (`src/lib/documents/qld/occupancyContent.ts`) - "this is not Form 18a and not Form R18", s 43 declaration. On-site T1 only.
11. On-site >3 rooms field error (`qldRoomsRentedFieldError`) - tells the landlord to "use a registered rooming house listing or seek legal advice." That listing type cannot be saved in QLD. Dead end.
12. Service-tier note for QLD T3 (`api/lib/serviceTier/qld.ts`) - "Quni does not support rooming accommodation (registered rooming houses) yet." Only if the registered card is selected.
13. Renter on-site bond callout (`qldOnSiteTenantBondCallout`) - PropertyDetail and Booking, on-site only.

Transactional emails (`listingAgreementReadyRenter` in `api/lib/emailTemplates.js`) say "residential tenancy agreement" without naming 18a or R18. Still the wrong family for Quang.

Marketing/FAQ bond copy (`src/lib/bondPublicCopy.ts`) treats "private rooms" as "standard residential tenancies." That is the NSW split, published as national.

---

## What Form R18 requires

Official form: Rooming accommodation agreement (Form R18) **v15 Sep25**, 11 pages, Part 1 items 1-20 then locked standard terms. Source: [RTA Form R18](https://www.rta.qld.gov.au/forms-resources/forms/forms-for-rooming-accommodation/rooming-accommodation-agreement-form-r18) (PDF extract used for this audit).

This is a different lifecycle, not a different filename on the same fill pipeline.

| Instrument | General tenancy (what we generate for Quang) | Rooming accommodation (what the RTA says he needs) |
|---|---|---|
| Agreement | Form 18a | Form R18 |
| Condition report | Form 1a / 14a (addendum text only; not generated) | Form R1 (not in the repo) |
| Entry notice | Form 9 (addendum clocks) | Form R9, different periods |
| Termination | Form 18a / RTRA general-tenancy notices; product only has mutual surrender | Form R12 (provider), Form R13 (resident), shorter periods |
| Rent in advance | General-tenancy rules (Form 18a standard terms) | 2 week cap |
| Payment methods | Form 18a Item 9, s.83 / standard term 8(3), two methods synthesised | s 98, two methods, plus cost / financial-benefit disclosure |
| Rent increase history | Form 18a Item 11, premises-level, we leave blank | Item 13.2 **for the room**, survives tenant turnover, 12-month rule |
| House rules | Free text on the listing, printed into the addendum | Property-level instrument, forms part of the agreement, delivery must be evidenced (Item 17) |
| Opt into 18a | N/A | Statutory election, both parties, must be evidenced. We do not capture this. |

### Form R18 items 1-20 vs what we hold

| Item | What the form asks | Home in Quni today | Verdict |
|---|---|---|---|
| 1 | Provider / manager name, address, postcode, email, optional phone/ABN | `landlord_profiles` (same as Form 18a Item 1) | Reusable. ABN still a documented Form 18a GAP. |
| 2 | Resident name(s), contacts, **emergency contact name/phone/email**, optional address for service | `student_profiles.emergency_contact_*` already filled onto Form 18a. Resident 2 empty. | **Correction to the expected gap list:** emergency contacts *do* have a home. They are profile-level, not rooming-specific, and we do not treat withdrawal or a second resident as events. |
| 3 | Provider's agent | Always empty (`landlordAgent: null`) | No agent model. Fine for a self-managing provider if we print the provider in Item 1. |
| 4 | Resident's representative for notices | None | **No home.** |
| 5 | Per-party per-channel notice consent: email / **SMS** / fax, for provider, resident, agent, resident's representative | Form 18a fill hardcodes email Yes and other channels No (`officialQldForm18aFill.ts` NOTICE_*_PAIRS; `qldForm18a.ts` sets both consents `true`). No SMS. No withdrawal event. | **No real home.** The 18a checkboxes are an inferred default, not a captured matrix. |
| 6.1 | Premises address **and room number** | Address/suburb/state/postcode. `room_description` exists but is **nulled on save** unless NSW T3. | **Room number has no live home on this path.** |
| 6.2 | Inclusions | Furnished / room type / linen, synthesised into an 18a inclusions line | Weak but exists. |
| 6 (type) | Level 1 / 2 / 3 / Student accommodation tick | None. Linen and weekly cleaning are not this. | **No home.** |
| 7 | Fixed / periodic, start, end | Booking dates / `lease_length` | Reusable. |
| 8 | Rent amount and frequency | `rent_per_week` (weekly only) | Reusable, weekly-only limitation already true of 18a. |
| 9 | **Breakdown:** accommodation / food / personal care / other services | Single `rent_per_week`. `additional_charges` is NSW T3 only and cleared to `[]` on QLD save. | **No home.** |
| 10 | Rent due day / period | Derived weekday for Form 18a | Reusable as a derivation, not stored. |
| 11 | Two nominated methods + BSB details; s 98 | `bookings.rent_payment_method` is a **single** enum (`bank_transfer` \| `quni_platform`). Generator *invents* a second method for Form 18a Item 9. No cost / financial-benefit disclosure. | Partial. Not a captured pair. |
| 12 | Place of payment (optional) | Hardcoded "As agreed - electronic transfer" on 18a | No real home. |
| 13 | Can rent increase? **Day last increased for the room.** How calculated. When it starts. 12-month rule for that room. | `lastRentIncreaseDate` is hardcoded `null` even on Form 18a (`qldForm18a.ts`). No room-level history table. No survival across tenant turnover. | **No home.** This is harder than a date field: it is a room-level ledger. |
| 14 | Bond amount | `bond` / `bond_weeks`, 4-week product cap | Reusable as an amount. Rooming also lodges with RTA if taken. We do not encode a 2-week rent-in-advance cap. |
| 15 | Services for supported accommodation (Level 1/2/3 food and personal care grid) | None | **No home.** Quang likely Level 1 (accommodation only), but we cannot tick it. |
| 16 | Utility services the resident must pay | `utilities_services` + resolver, QLD/VIC form. Labels say Form 18a Items 13-15. | Reusable as a utilities capture, wrong statute labels. |
| 17 | House rules **have been provided** Yes/No | Free text `properties.house_rules` + `property_house_rules` flags. No delivery timestamp, no version, no acknowledgement event. | Text exists. **Evidence does not.** |
| 18 | Persons allowed in the **room** and at the **premises** | `max_occupants` is room-level. No premises-wide cap. `rooms_rented_to_residents` is on-site-only and a count of rooms, not people. | Half a home. |
| 19 | Body corporate by-laws applicable? Copy given? | Form 18a currently "No / N/A". NSW has `strata_bylaws_applicable` for FT6600. | Thin. |
| 20 | Pets type and number | 18a prints "None unless agreed in writing." Structured pet rule may exist in `property_house_rules` / features. | Not a pet schedule. |

RTA page (as of this audit) also says: house rules form part of the agreement; prescribed house rules in the 2009 Regulation apply until 31 August 2026; **from 1 September 2026 the 2025 Regulation prescribed house rules apply.** Today is 5 September 2026. That transition has already happened. Nothing in the repo knows about it.

---

## The gap

### Data we would have to hold that we do not hold today

Honest list, including where the expected list was too pessimistic:

**No home (must add if we ever generate R18):**

- Room number as part of the premises identity, surviving across the listing (do not reuse NSW-only `room_description` without making it QLD-live).
- Rent broken down by accommodation / food / personal care / other.
- Room-level rent-increase ledger that survives tenant turnover (not a nullable date on the booking).
- Two *nominated* rent-payment methods plus cost and financial-benefit disclosure (not a single enum with a synthesised second line).
- Level 1 / 2 / 3 / Student accommodation classification.
- House-rules delivery evidence (who was given which version, when, by what channel).
- Premises-wide person cap (Item 18.2).
- Per-party per-channel notice consent including SMS, plus withdrawal as an event.
- Resident's representative (Item 4).
- Statutory election to use Form 18a instead of R18, evidenced, both parties.
- Form R1 condition report (room + shared areas), distinct from Form 1a/14a.
- Form R9 / R12 / R13 as documents with rooming clocks.
- 2-week rent-in-advance cap as a product rule.

**Has a near-home, not enough:**

- Resident emergency contacts: `student_profiles.emergency_contact_*`. Fine as a source for Item 2. Not a rooming object.
- Utilities: QLD utilities capture can feed Item 16 if we stop labelling it Form 18a.
- Bond amount and RTA lodgement: QLD scheme already assumes RTA + Form 2. Rooming bond still lodges with the RTA. Form 2 is not the gap. Form R1 is.
- Shared areas: NSW T3 JSON (`kitchen` / `bathroom` / `commonRoom` / `laundry` / `other`). Closest structured rooming particulars, but saved only for NSW T3 and conceptually "boarding house" not "QLD house rules / R18 Item 6."
- `property_group_id`: groups sibling rooms for landlord UI and, recently, overlap guards. It is **not** a property-level legal entity. House rules are per listing row.

**Already exist and would be reused:**

- Provider and resident identity, addresses, phones, emails.
- Term dates, weekly rent, bond weeks, payout BSB.
- Electronic signing pipeline (`resolveTenancyPackage` → registry → DocuSeal).

### House rules: nearest existing object

House rules need to be a **property-level document with version history and delivery evidence**. Nothing we have is that.

Nearest things, in order of "could we extend this rather than invent a new universe":

1. **`tenancy_documents`** (`src/lib/database.types.ts`). Already has `status` (`draft` / `sent_for_signing` / `signed` / `acknowledged` / `disputed` / `archived`), `file_path`, `metadata`, signing timestamps. Enum includes `condition_report_*`, `breach_notice`, `termination_notice`, `rent_increase_notice` - **none of those generators exist.** Condition reports are an admin stub (`AdminFeatureInventory` / living-console comments: no `condition_reports` table). This is the right *shape* for a versioned, delivered, acknowledged instrument. It is booking/tenancy scoped today, not property-scoped, and house rules are not a `document_type`.
2. **`property_t3_attestations`**. Append-only, `warranty_version`, `superseded_at`, retained after listing delete. That is the closest **versioned legal artefact** we actually write. It is NSW boarding-house compliance, not house rules, but the pattern (version key, supersede, do not mutate) is the one to copy.
3. **`listingAccuracyAttestation`**. Hashes current `house_rules` + structured rules into `accuracy_attested_content_hash`. A publish-time checksum, not a document, not delivered to a resident, not a history.
4. **`properties.house_rules` + `property_house_rules` + `house_rules_ref`.** Latest-only listing copy and yes/no/approval flags. `platform_config` `house_rules.default` is a template. NSW T3 prints a "Statement of House Rules" page from `properties.house_rules` or leaves it blank. This is the content source, not the instrument.

Opinion: extend `tenancy_documents` (or a sibling `property_documents` with the same status machine) for the house-rules PDF/version, and keep the free-text / flags as the editor. Do not try to make `house_rules_ref` carry statute. The 2025 prescribed rules are a locked legal text, closer to NSW T3 `lockedText.ts` than to our amenity-style junction table.

### Notices and reminder machinery: config change or rewrite?

There is **no** state-agnostic notice-clock engine.

What exists:

- **Clocks baked into PDFs.** FT6600 standard terms (NSW T2). Form 18a Part 2 (QLD T2). QLD addendum table of Form 9 periods. NSW T3 occupancy-principle tables in `src/lib/documents/nsw/boardingHouse/lockedText.ts` (suggested entry and termination periods; override column left blank by design). QLD/NSW/VIC T1 occupancy prose (2 weeks' written notice by the resident; "not governed by prescribed residential tenancy notice periods").
- **Operational workflows that are not statutory notices.** Mutual surrender (`api/lib/booking/termination/*`) - the only live way to end a confirmed agreement. Bond-window expiry cron. Booking expiry. `tenancy_documents` enum values for notices with no writers.
- **Copy clocks.** Bond lodgement 10 calendar days (QLD) vs 10 business days (NSW). Not entry/termination.

NSW T3 is the closest analogue to rooming clocks, and it is **print suggested periods on a locked form**, not a scheduler. D8 of the NSW T3 plan: override-notice UI is deferred; column 3 stays blank.

A second set of QLD rooming clocks is a **rewrite**, not a configuration change. There is no table of `(state, instrument, notice_type) → days` that we could add a row to. Adding R9/R12/R13 means new forms, new document types, new send paths, and (if we ever remind) new jobs. Do not pretend `lockedText.ts` arrays are that engine.

Mutual surrender remaining the only termination path is itself a product fact (`docs/reviews/terminate-agreement-current-state-audit.md`). R12/R13 would land on that unfinished spine, not on a mature NSW notice module.

### Bond: Form R1 plus Form 2 vs the general-tenancy path

QLD T1 and T2 both already use `schemeApplies: true`, RTA as authority, 10 calendar days, 4-week cap (`api/lib/tenancy/rules/qld.ts`). Listing-tier bond is landlord-direct: mark received on Quni, lodge off-platform, Form 2 named in copy. No RTA API.

What rooming needs on top of that path:

- **Form R1** (rooming condition report) at start if a bond is taken. We do not generate Form 1a either; the addendum only *talks about* 1a/14a. So R1 is not "add a variant of an existing generator." It is the first real condition-report product, and it is room + shared areas, not a whole-premises 1a.
- **Form 2** still lodges the bond. Copy can stay. Do not invent a second lodgement authority.
- **Rent in advance cap (2 weeks)** is not implemented. Product default bond is already 2 weeks (`DEFAULT_BOND_WEEKS`), max 4. The distinctive rooming money rule is rent-in-advance, which we do not model.
- NSW T3 *security deposit* is proprietor-held and capped at 2 weeks. That is the wrong analogue for QLD rooming bond (RTA-lodged). Do not reuse T3 bond rules for QLD R18.

---

## Contradictions: docs, DB, live site

This is the section that matters if you are using internal docs as a map.

1. **The classifier is NSW-shaped and the tests lock the wrong QLD outcome in.** `resolveTenancyPackage.test.ts` `"T2 private_room_landlord_off_site → qld-form18a"` is not an accident. Shipping R18 without changing that test means we currently have a green suite for generating the wrong form.

2. **`docs/plans/qld-vic-listing-parity-plan.md` (9 Jun 2026) disagrees with itself, and with the code.** The current-state table correctly says QLD Form 18a is official AcroForm fill (`officialQldForm18aFill.ts`). Two screens later it says "QLD Form 18a is not the same AcroForm pipeline as NSW. It is a full react-pdf rebuild." Stream 0 still says "Text tags in `QldGeneralTenancyAgreement.tsx`." Live path is AcroForm fill of `docs/qld/form18a-renamed.pdf` plus addendum. The plan also says "T3 rooming house stays deferred in all states." **NSW T3 is live** (`nsw-boarding-house` generator, sample PDF, Listing available).

3. **`docs/dual-tier-service-model.md` (April 2026)** defines property tier as "boarder/lodger / RTA / boarding house" implemented via on-site vs off-site. That is the NSW fork. It treats T3 as "boarding house, post-launch." Live NSW T3 is a registered Boarding Houses Act occupancy. Live QLD T3 is "registered rooming house, unsupported." Neither is "QLD off-site room = R18."

4. **`docs/listing-to-booking-confirmation.md`** says property type drives "NSW/QLD/VIC agreement template and bond rules." True as a pointer to the router. It does not say the QLD room template is 18a for share rooms. Easy to read as "we pick the right state form."

5. **`docs/form18a-field-mapping.md`** is an accurate map of the 18a fill. It is also the document we would be executing for Quang. Item 11 last rent increase is listed as left blank. Item 9 two methods are synthesised. That file is not wrong about 18a. Using it for a rooming house is the error.

6. **Rule map Q2-QLD** pins "Form 18a v23 Sep25" as the QLD room-let form. Q4-QLD still talks about MAX_ROOMS=3 (s 43) as the rooming threshold. That is the live-in exemption, not the off-site rule.

7. **On-site overflow copy vs QLD T3 availability.** `qldRoomsRentedFieldError` tells an on-site landlord with 4+ rooms to use a registered rooming house listing. `qldServiceTierAvailability('t3')` makes that listing unsavable. The live-in path's only "this might be R18" escape hatch is a brick wall.

8. **Utilities UI names Form 18a on QLD T1 occupancy listings.** The document those landlords actually get says it is *not* Form 18a.

9. **`landlordHeldBondIntroParagraph` T3 copy** always cites the Boarding Houses Act 2012 (NSW). Harmless today because QLD T3 never gets `rules`. It will be wrong the day someone adds `qldTenancyRules('T3')` by copying NSW.

10. **The listing-extractor audit you quoted is not in `docs/`.** If it still lives in a chat or a canvas, treat the code as source of truth. The code matches that quote.

11. **Admin living console / condition reports.** Document types exist. Product is stubbed. Docs that imply we "do condition reports" are aspirational.

12. **Prescribed house rules.** RTA transition date 1 Sep 2026 has passed. Our `house_rules.default` and listing free text are not the 2025 Regulation instrument.

---

## Opinion

### 1. How bad is this actually?

**Bad, and not theoretical.** A QLD off-site room-by-room landlord today receives a Form 18a with no warning. I did not find an upstream catch. Preflight succeeds. Accept succeeds. DocuSeal names Form 18a. The addendum tells both parties to use Form 9 and Forms 1a/14a.

If Quang listed tomorrow, walked a renter through apply → accept → sign, Quni would put the wrong prescribed form in front of both of them and call it a "Queensland-compliant tenancy agreement."

The rooming-house card does not save him. He will not pick it (no registration number, and the copy is NSW boarding house). If he did, we would refuse to generate anything, which is better than a wrong form, but we would not explain the QLD rule.

Two rooms as two listings makes it worse: each sibling would get its own Form 18a, its own house-rules blob, no property-level instrument.

I would not call this "we forgot a PDF." I would call it "our legal classifier points the wrong way in the state we are actually licensed to operate."

The one mercy: QLD *entire place* as Form 18a is probably right. Do not slam a gate on all QLD listings.

### 2. Is the tier abstraction salvageable?

Yes, if we stop pretending T1/T2/T3 *are* "host lives here / exclusive possession / registered boarding house" and start treating them as **outputs of a per-state classifier**.

What the code actually looks like: one truth table, NSW-shaped, with `state` selecting the generator id on each row. `resolvePropertyTierFromListing` does not even take `state`. That is why QLD off-site room is T2.

I would not keep "does the host live here" as the tier definition. I would keep three *legal outcomes* and let each state decide how facts map onto them:

| Outcome | Meaning | QLD facts (your RTA reading) | NSW facts (live) |
|---|---|---|---|
| Outside the Act / licence | Common-law occupancy | Live-in provider, ≤3 rooms, boarder/lodger on the facts | On-site boarder/lodger (T1) |
| General tenancy | Exclusive possession of a dwelling | Entire place, or a real 18a election | Off-site room / entire / shared (T2) |
| Rooming / boarding | Rooming accommodation or registered boarding house | Provider **not** resident, room with shared facilities, any room count; or live-in with >3 rooms | Registered boarding house only (T3) |

That is still three buckets. The mistake was encoding NSW's mapping as the buckets.

A cleaner shape given this code: **do not add `qld-form-r18` as "QLD T3" by flipping `is_registered_rooming_house`.** QLD rooming is not a registration flag. Reusing T3 that way forces Quang to lie on the form (invent a registration number) or keeps him on 18a. Put a QLD classifier in front of the existing generator switch: facts → `legalRegime` → generator. Keep T1/T2/T3 as labels if Rob wants them for pricing, but make `resolvePropertyTierFromListing` take `state` or die.

I would not invent a fourth national tier. I would not wait for a unified "rooming engine" shared with NSW T3. NSW T3 is Boarding Houses Act occupancy principles, proprietor-held deposit, no RTA lodgement. QLD R18 is RTRA rooming, RTA bond, different notices. Shared pipeline (preflight / run / DocuSeal) is already there. Shared legal object model is a trap.

### 3. Smallest change that stops a wrong document tomorrow

**A gate, not a feature.** Separate from the R18 build.

Gate: QLD + (`private_room_landlord_off_site` or `shared_room`) + not a captured 18a election → `supported: false` with an honest reason. Mirror it in `qldServiceTierAvailability` so they cannot save a Listing that we cannot paper. Card copy on that path: this is rooming accommodation in Queensland; Quni cannot generate Form R18 yet; do not sign a general tenancy unless both parties have actually opted in.

Do **not** route them to the registered-rooming card. That is a NSW concept and a save dead end.

Do **not** generate a blank or "coming soon" R18. Wrong form is worse; a fake R18 is worse still.

Entire-property QLD stays on 18a.

If Rob wants a still-smaller emergency: hide or disable "One private room" and "A shared bedroom" when `state === 'QLD'`, with a support/waitlist path. That is uglier UX and still a gate.

The 18a opt-in, if we ever offer it, is a **both-parties evidenced election**, not a landlord checkbox on the listing form.

### 4. Where the real difficulty is

Your instinct (house rules object + notice consent matrix) is half right.

**Harder than it looks:**

- **Classifier / facts, not the PDF fill.** Once we have fields, Form R18 is the same kind of job as Form 18a AcroForm. We already did that. The hard part is admitting off-site room is a different *regime* and collecting rooming facts without NSW registration theatre.
- **House rules as a property-level versioned instrument with delivery evidence.** Our current rules are listing copy. Sibling rooms do not share a legal object. Prescribed 2025 rules are now in force. This is the real object-model piece.
- **Room-level rent history that survives turnover.** Not a column on `properties`. A ledger keyed by room identity, which we barely have (`property_group_id` is a grouping key, `room_description` is NSW-only).
- **Notice lifecycle.** There is no clock engine. R9/R12/R13 plus reminders is a new product spine on top of a termination module that only does mutual surrender.
- **Form R1.** First condition-report product, room + commons, bond-linked. Admin has been stubbing this for a reason.

**Easier than it looks:**

- **Emergency contacts.** Already on the student profile; 18a already prints them.
- **Two payment methods as a fill.** We already synthesise two lines for 18a. The gap is disclosure and capturing a real pair, not inventing EFT.
- **DocuSeal / confirm / preflight pipeline.** Registry-based. A `qld-form-r18` generator can plug in the same way NSW T3 did. That part of T3 is the right precedent.
- **Notice consent checkboxes.** 18a already has yes/no pairs. We hardcode them. Capturing a matrix is a form + persistence problem, not a platform problem. Withdrawal-as-event is the part people underestimate.
- **Bond lodgement copy.** Form 2 / RTA Web Services can stay. Do not rebuild lodgement to ship a gate.

House rules are the hard object. Notice consent is medium. Notice *clocks* are a later product, not part of "stop 18a tomorrow."

### 5. Sequencing

Your instinct is right: **classifier before generator.** An R18 emitted by a still-wrong classifier (for example only when the registered card is ticked) would miss Quang and still issue 18a to the people who matter.

Suggested order:

1. **Gate the wrong document.** QLD off-site room / shared room → unsupported, with copy that names rooming accommodation and Form R18 as the missing instrument. Change the tests that currently require 18a on that path. This is the only thing that should ship before anything else if the goal is "stop harm."
2. **Classifier design, state-specific, facts not flags.** Decide QLD mapping: off-site room → rooming; entire place → general tenancy; on-site ≤3 → occupancy; on-site >3 → rooming (and stop pointing at NSW registration). Decide whether a studio-with-own-facilities off-site is rooming or 18a (exclusive possession). Write that as a table *before* PDF work. Push back on using `is_registered_rooming_house` as the QLD trigger.
3. **Minimal R18 particulars capture** on the off-site room path: room identity, Level 1 default, two payment methods, house-rules delivery tick, persons in room / at premises. Enough to fill items, not the whole lifecycle.
4. **Form R18 generator** on the existing listing pipeline (NSW T3's pipeline, not NSW T3's legal model).
5. **House-rules instrument** (version + delivery evidence), because Item 17 and the statute say the rules *are* part of the agreement.
6. **Form R1** if bond is taken.
7. **R9 / R12 / R13** only after we have an actual notice product, not as a PDF footnote.

I would not build the consent matrix or the clock engine before the gate. I would not wait for house rules to ship the gate. I *would* wait for the classifier before generating R18.

### 6. Things you did not ask, and should have

- **Exclusive possession / studio edge.** "One private room" allows `room_type = studio`. A self-contained studio with no shared facilities can be a general tenancy even if the owner lives elsewhere. Quang's shared kitchen/bathrooms are the easy case. The classifier needs a facilities question, or we will mis-gate real 18a studios.
- **The 18a opt-in is a real statutory off-ramp.** If we gate 18a for all off-site rooms, some pairs may lawfully want 18a. That must be an evidenced two-party election, not a landlord preference. If we are not willing to build that, the gate copy should say so.
- **QLD T1 occupancy PDFs assert they are not R18** on the strength of an s 43 declaration we do not verify. Facts (control of the house, services, locks) can still make a live-in arrangement rooming or a tenancy. That is a quieter cousin of Quang's bug.
- **On-site >3 is already a known R18 situation in copy, and we brick it.** If you sequence "classifier first," include that overflow. It is the same missing generator.
- **Two listings, one house.** `property_group_id` does not carry house rules or rent-increase history. Quang's two rooms are two legal processes in our DB.
- **We are past 1 Sep 2026.** Prescribed house rules changed. Even a perfect R18 fill that attaches our current default text may attach the wrong prescribed rules.
- **Managed vs Listing.** QLD Managed is available for T2. If we keep sending off-site rooms down T2, Managed would operate a general tenancy we should not have created. The gate must apply to Managed too (`qldServiceTierAvailability` and `confirmManaged` already fail closed for T3; they succeed for Quang's T2).
- **AI / matching guardrails** recite "lodger vs tenant" as legal information (`aiSurfacePromptAssembly.ts`) but the product classifier does not implement the QLD version of that distinction for off-site rooms.
- **Production data.** This audit did not query prod. If any QLD `private_room_landlord_off_site` listings are live or already signed, the gate creates a follow-up: do we void, re-paper, or grandfather? That is a Rob decision, not an engineering default.

---

## Recommendation (short)

Stop generating Form 18a for QLD off-site rooms and shared bedrooms. That is a classifier/gate. Do not wait for R18. Do not reuse the NSW registered-rooming card. Redefine tiers as legal outcomes with a QLD-specific mapping. Build R18 only after that mapping is explicit, including the studio/exclusive-possession edge and the 18a opt-in question. Treat house rules as the first *new object*; treat notice clocks as a later product.

---

## Open questions for Rob

1. **Ship the gate without R18?** Recommendation: yes. Confirm.
2. **Existing QLD off-site room listings / signed 18as.** Void and re-paper, grandfather, or case-by-case (Quang)?
3. **18a opt-in.** Offer it as a two-party evidenced election, or refuse 18a on this path until R18 exists?
4. **Self-contained studio / granny-flat-as-room.** Facilities question on the listing, or treat all `private_room_landlord_off_site` as rooming regardless?
5. **On-site, more than 3 rooms.** Same gate as off-site rooming, or still "seek legal advice"?
6. **House rules.** Start a property-level document now, or attach listing free text to a first R18 with a delivery tick and accept the weakness?
7. **Counsel.** You verified the off-site = rooming rule against the RTA on 4 Sep 2026. Do you want Jenny or QLD counsel to confirm the classifier table (especially studio + opt-in) before the gate goes to Production, given the preview-or-flag rule for anything user-visible?
8. **Quang specifically.** Support-led "do not use Quni for this until we have R18," or wait for the gate to ship?

---

## File index (primary)

| Concern | File |
|---|---|
| Document router | `api/lib/resolveTenancyPackage.ts` |
| Router tests (lock 18a for QLD off-site room) | `api/lib/resolveTenancyPackage.test.ts` |
| Pricing tier (no state) | `src/lib/pricing/index.ts` (`resolvePropertyTierFromListing`) |
| QLD service matrix | `api/lib/serviceTier/qld.ts` |
| Listing cards | `src/lib/landlordAccommodationChoice.ts` |
| Listing form | `src/pages/landlord/LandlordPropertyFormPage.tsx` |
| s 43 / R18 copy (on-site only) | `src/lib/tenancy/qldBoarderLodger.ts` |
| QLD T2 generator | `api/lib/documents/listingTenancyGeneration/qldForm18a.ts` |
| Form 18a fill | `api/lib/documents/officialQldForm18aFill.ts` |
| QLD addendum (Form 9, 1a/14a) | `src/lib/documents/QuniPlatformAddendumQld.tsx` |
| Confirm / preflight | `api/lib/booking/confirmListing.ts`, `resolveGenerator.ts` |
| Accept UI availability | `src/lib/landlordAcceptTierOptions.ts` |
| Explainer copy | `api/lib/tenancy/jurisdictionCopy.ts` |
| NSW T3 (wrong analogue, right pipeline) | `api/lib/documents/listingTenancyGeneration/nswBoardingHouse.ts`, `src/lib/documents/nsw/boardingHouse/lockedText.ts` |
| House rules tables | `supabase/migrations/20260415130000_house_rules_system.sql` |
| Versioned attestation analogue | `src/lib/tenancy/nswT3ComplianceAttestation.ts`, `property_t3_attestations` |
| Bond rules | `api/lib/tenancy/rules/qld.ts`, `api/lib/booking/bookingBondAmount.js` |
| Form 18a field map | `docs/form18a-field-mapping.md` |
