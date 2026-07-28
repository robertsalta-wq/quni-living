# Listing Extractor — source audit (phase 1)

**Repo:** `robertsalta-wq/quni-living`  
**Scope:** Read-only. What exists in code today — field names, draft path, tier wiring, AI plumbing.  
**Decision record:** `docs/Quni-Decision-Listing-Extractor-2026-07-27.md`  
**Brief:** `docs/Cursor-Brief-Listing-Extractor-Audit.md`

---

## 1. Property-creation form — location and fields

### Where it lives

| Route | Entry |
|-------|--------|
| `/landlord/property/new` (+ `/basic`, `/section/:sectionId`) | `src/App.tsx` → `LandlordListingEditEntry` |
| `/landlord/property/edit/:id` (+ `/basic`, `/section/:sectionId`) | same |

- **Desktop:** full form `src/pages/landlord/LandlordPropertyFormPage.tsx`
- **Mobile:** hub `LandlordListingEditHubPage.tsx` + section drill-ins into the same form page
- **Entry switch:** `src/pages/landlord/LandlordListingEditEntry.tsx`

### State shape / schema

**Plain React `useState` — no React Hook Form, no Zod, no Formik.**

Canonical draft type for localStorage (new listings only):

```226:267:src/pages/landlord/LandlordPropertyFormPage.tsx
type LandlordPropertyDraftV1 = {
  v: typeof LANDLORD_PROPERTY_DRAFT_VERSION
  title: string
  description: string
  bedrooms: string
  bathrooms: string
  roomsRentedToResidents: string
  roomType: RoomType | ''
  propertyListingType: PropertyListingType
  furnished: boolean
  linenSupplied: boolean
  weeklyCleaning: boolean
  openToNonStudents: boolean
  selectedFeatureIds: string[]
  address: string
  suburb: string
  state: string
  postcode: string
  universityId: string
  campusId: string
  latitude: number | null
  longitude: number | null
  showAddAnotherUniversity: boolean
  rentPerWeek: string
  maxOccupants: string
  coupleSurchargePerWeek: string
  parkingSurchargePerWeek: string
  parkingAvailable: boolean
  bondWeeks: string
  qldBondRemittancePreference: QldBondRemittancePreference
  leaseLength: string
  availableFrom: string
  images: string[]
  isRegisteredRoomingHouse: boolean
  roomingHouseRegistrationNumber: string
  serviceTier: LandlordServiceTier
  houseRules: string
  selectedRules: Partial<Record<string, RulePermitted>>
  listerRole?: ListerRole
  headTenantLandlordConsent?: HeadTenantLandlordConsent
}
```

Nav sections (form’s own labels):

```175:186:src/pages/landlord/LandlordPropertyFormPage.tsx
const LANDLORD_FORM_NAV_SECTIONS: { id: string; label: string }[] = [
  { id: 'section-basic-info', label: 'Basic info' },
  { id: 'section-property-details', label: 'Property details' },
  { id: 'section-inclusions-features', label: 'Inclusions' },
  { id: 'section-utilities', label: 'Utilities' },
  { id: 'section-ft6600-compliance', label: 'Compliance' },
  { id: 'section-house-rules', label: 'Rules' },
  { id: 'section-location', label: 'Location' },
  { id: 'section-pricing-availability', label: 'Pricing' },
  { id: 'section-description', label: 'Description' },
  { id: 'section-photos', label: 'Photos' },
]
```

Conditional: **Utilities** only when `state ∈ {QLD, VIC}`; **Compliance** only when `state === 'NSW'`.

---

### Every field by section

#### Basic info

| Form key | Type | Required | Validation / notes |
|----------|------|----------|-------------------|
| `title` | `string` | **Yes** on submit | Non-empty trim (`handleSubmit` ~L2044–2047) |
| `headline` | `string` | No | Hub-only (`listingHubDraft.ts`); not on main draft type |

#### Property details — accommodation / room / structure

**Not** the legacy “Rent / Homestay / Student House”. Those were `listing_type`; the form always saves `listing_type: null` and uses `property_type` + `room_type`.

**UI cards** (`AccommodationUiChoice` in `src/lib/landlordAccommodationChoice.ts`):

| UI value | Label | → `propertyListingType` | → `roomType` |
|----------|-------|-------------------------|--------------|
| `entire_house` | Whole house | `entire_property` | `house` |
| `entire_apartment` | Whole apartment or unit | `entire_property` | `apartment` |
| `entire_studio` | Studio (whole place) | `entire_property` | `studio` |
| `private_room_landlord_off_site` | One private room | `private_room_landlord_off_site` | `single` |
| **`private_room_landlord_on_site`** | **A room in my home** | **`private_room_landlord_on_site`** | **`single`** |
| `shared_room` | A shared bedroom | `shared_room` | `shared` |

Persisted enums (`src/lib/listings.ts`):

```83:87:src/lib/listings.ts
export type PropertyListingType =
  | 'entire_property'
  | 'private_room_landlord_off_site'
  | 'private_room_landlord_on_site'
  | 'shared_room'
```

```3:4:src/lib/listings.ts
/** Matches DB check on `properties.room_type` */
export type RoomType = 'single' | 'shared' | 'studio' | 'apartment' | 'house'
```

| Form key | DB column | Type | Required | Notes |
|----------|-----------|------|----------|-------|
| `propertyListingType` | `property_type` | `PropertyListingType` | Implicit (always set; default `entire_property` in hub empty draft) | Set via accommodation cards |
| `roomType` | `room_type` | `RoomType` | Implicit | Constrained by `roomForRentOptions` for non-entire |
| `bedrooms` | `bedrooms` | string → int ≥ 0 | No | HTML `min={0}` |
| `bathrooms` | `bathrooms` | string → int ≥ 0 | No | |
| `roomsRentedToResidents` | `rooms_rented_to_residents` | string → int 1–99 | **Yes if QLD + on-site** | `parseRoomsRentedToResidents` |
| `isRegisteredRoomingHouse` | `is_registered_rooming_house` | boolean | No | Conflicts with on-site |
| `roomingHouseRegistrationNumber` | `rooming_house_registration_number` | string | Yes if rooming ticked | |
| `listerRole` | `lister_role` | `'owner' \| 'head_tenant'` | No (default owner) | |
| `headTenantLandlordConsent` | (gates attestation only) | `boolean \| null` | New + head_tenant | |
| `authorityToLetAgreed` | → `authority_to_let_attested_at` | boolean | New listings | Checkbox → timestamp |

#### Inclusions

| Form key | DB | Type | Default |
|----------|-----|------|---------|
| `furnished` | `furnished` | boolean | false |
| `linenSupplied` | `linen_supplied` | boolean | false |
| `weeklyCleaning` | `weekly_cleaning_service` | boolean | false |
| `selectedFeatureIds` | `property_features` junction | `string[]` (feature UUIDs) | `[]` |
| `openToNonStudents` | `open_to_non_students` | boolean | false |

**Features are a fixed checklist loaded from DB `features`**, not free text. Seeded names (`supabase/quni_supabase_schema.sql` L449–464):

WiFi, Air conditioning, Heating, Washing machine, Dryer, Dishwasher, Parking, Gym access, Swimming pool, Balcony, Garden, Pet friendly, **Bills included**, Study desk, Near public transport.

“Bills included” is inferred from feature **name** regex (`propertyFeatureSignals.ts`), not a dedicated column — it skips utilities validation when matched.

#### Utilities (QLD / VIC only)

Sub-state: `LandlordPropertyUtilitiesFormState` (`src/lib/propertyUtilitiesFormState.ts`) — TriState `'yes'|'no'|''` for electricity/gas tenant pays, metering, apportionment %, how paid; water usage charged separately + attestation checkbox. Persists to `utilities_services` JSONB + `water_usage_charged_separately` (+ attestation timestamp).

#### Compliance (NSW only)

`LandlordFt6600ComplianceFormState` (`LandlordPropertyFt6600ComplianceFields.tsx`): smoke alarm type (`hardwired`/`battery`), battery replaceability TriStates, battery type strings, strata TriStates, water/electricity/gas embedded network, strata bylaws. All required (answered) on submit when NSW section shown.

#### Rules

| Form key | Storage | Allowed values |
|----------|---------|----------------|
| `selectedRules` | `property_house_rules` (`rule_id`, `permitted`) | `'yes' \| 'no' \| 'approval'` (`RulePermitted`) |
| `houseRules` | `properties.house_rules` | free text; **no client maxLength** |

Structured rules loaded from `house_rules_ref` (dynamic). Seeded: No smoking, Pets, Overnight guests, Parties/events, Quiet hours, Parking (`20260415130000_house_rules_system.sql` L83–91).

**Platform default:** `resetHouseRulesToPlatformDefault()` → `POST /api/platform/house-rules-default` fills the free-text `houseRules` textarea from `platform_config.house_rules.default`.

#### Location

| Form key | DB | Notes |
|----------|-----|-------|
| `address`, `suburb`, `state`, `postcode` | same | `state` free text; default `'NSW'` on save if empty |
| `latitude`, `longitude` | same | From `/api/geocode`; fallback on save |
| `universityId`, `campusId` | `university_id`, `campus_id` | Auto nearest campus (Haversine top 5) unless override |
| `showAddAnotherUniversity` | `show_add_another_university` | When false, save uses nearest suggestion |

No separate multi-campus table — one campus FK per listing.

#### Pricing

| Form key | DB column | Type | Allowed / validation |
|----------|-----------|------|----------------------|
| `serviceTier` | `service_tier` | `'listing' \| 'managed'` | Quni product tier (not legal T1/T2); default `'listing'` in form |
| `rentPerWeek` | `rent_per_week` | string → number | **Required** > 0 |
| `maxOccupants` | `max_occupants` | string → int | UI 1 or 2; save clamped 1–10 |
| `coupleSurchargePerWeek` | `couple_surcharge_per_week` | string → number \| null | Shown if max ≠ 1; ≥ 0; saved only if max≥2 and >0 |
| `parkingAvailable` | `parking_available` | boolean | |
| `parkingSurchargePerWeek` | `parking_surcharge_per_week` | string → number \| null | If parking; ≥ 0 |
| `bondWeeks` | `bond_weeks` | string → int | UI **0–4**; default **`DEFAULT_BOND_WEEKS = 2`** |
| `qldBondRemittancePreference` | `qld_bond_remittance_preference` | `'landlord_collects_remits' \| 'tenant_choice'` | QLD + bond scheme only; default `tenant_choice` |
| `leaseLength` | `lease_length` | string | `'Flexible' \| '6 months' \| '12 months' \| '2 years'` |
| `availableFrom` | `available_from` | date string | HTML `type="date"`; optional |
| payee name/BSB/account | `property_payout_details` | strings | Listing service tier; BSB `/^\d{6}$/`, account `/^\d{5,10}$/` |

Bond **amount** is not stored on save — computed later as weeks × rent at booking.

#### Description

| Form key | DB | Max length |
|----------|-----|------------|
| `description` | `description` | **None on client**; DB `text` |

AI helpers on this section: `AIDescriptionGenerator`, `AIListingProofread`.

#### Photos

| Form key | DB | Constraints |
|----------|-----|-------------|
| `images` | `images` (`text[]`) | Max **10**; max **5MB**/file; jpg/png/gif/webp/heic/heif; captions max 200 chars |

Serialized via `serializePropertyImages` (URL string or JSON `{url, description}`).

#### Attestations (footer)

| Key | Persists as | When required |
|-----|-------------|---------------|
| `nonDiscriminationAgreed` | landlord profile flag | If not previously accepted |
| `accuracyAgreed` | `accuracy_attested_at` + content hash | When listing content hash changed |

---

## 2. Properties data model

### `properties` (canonical TS: `src/lib/database.types.ts` L1243–1304)

Key columns for the extractor:

| Column | Type (app) | Notes |
|--------|------------|-------|
| `title`, `slug`, `description` | text | slug generated on insert |
| `rent_per_week` | number NOT NULL | |
| `bond_weeks` | int 0–4, default 2 | Replaces writing legacy `bond` AUD |
| `bond` | number \| null | **Legacy**; form does not write it |
| `room_type` | enum check | `single\|shared\|studio\|apartment\|house` |
| `property_type` | text (no DB enum) | App: four `PropertyListingType` values |
| `listing_type` | `'rent'\|'homestay'\|'student_house'\|null` | **Legacy; always null on save** |
| `status` | `active\|inactive\|pending\|suspended\|draft` | New form insert = **`active`** |
| `furnished`, `linen_supplied`, `weekly_cleaning_service` | boolean | |
| Address / geo / campus FKs | as above | |
| `service_tier` | `listing\|managed` | Product tier |
| `max_occupants`, surcharges, `parking_available` | | |
| FT6600 / utilities / attestations | | State-gated |
| `lister_role` | `owner\|head_tenant` | |
| `house_rules` | text | Free-form |
| `utilities_services` | JSONB | |

**FKs:** `landlord_id` → `landlord_profiles`; `university_id` → `universities`; `campus_id` → `campuses`.

### Related tables (no `property_inclusions` / `property_images` / `property_campuses`)

| Table | Role |
|-------|------|
| `features` + `property_features` | Amenity checklist |
| `house_rules_ref` + `property_house_rules` | Structured yes/no/approval |
| `properties.images` + Storage `property-images` | Photos |
| `property_payout_details` | Listing-tier bank details |
| `property_fee_snapshots` | Fee tier snapshots from `property_type` |

### Form field → DB column (save path)

Save builds `baseFields` at `LandlordPropertyFormPage.tsx` L2304–2363:

| Form | DB |
|------|-----|
| `title` | `title` |
| `description` | `description` |
| `propertyListingType` | `property_type` |
| `roomType` | `room_type` |
| — | `listing_type: null` |
| `furnished` / `linenSupplied` / `weeklyCleaning` | matching columns |
| `selectedFeatureIds` | `property_features` rows |
| `selectedRules` | `property_house_rules` |
| `houseRules` | `house_rules` |
| address fields + lat/lon | same |
| `universityId` / `campusId` | `university_id` / `campus_id` |
| `rentPerWeek` | `rent_per_week` |
| `bondWeeks` | `bond_weeks` |
| `maxOccupants` / surcharges / parking | matching |
| `leaseLength` / `availableFrom` | `lease_length` / `available_from` |
| `serviceTier` | `service_tier` |
| `images` | `images` via serialize |
| FT6600 / utilities forms | compliance columns + `utilities_services` |
| attestations | `*_attested_at` (+ accuracy hash) |

### Stored differently from entry

- Accommodation **card** → `property_type` + `room_type` pair (`fieldsFromAccommodationChoice`)
- TriState UI → `boolean | null` columns
- Feature names → UUID join rows; “bills included” by name heuristic
- Photos → `text[]` (URL or JSON string)
- Bond weeks in form → dollar amount only at booking (`bookingBondAmount`)
- Hub `headline` → localStorage / per-property key — **not a `properties` column**

### Types drift

Migrations mention `bond_is_fixed`, `bond_fixed_amount`, `show_add_another_university`; last is used in the form but **missing from generated `database.types.ts` Row**. Bond fixed columns are unused in app code.

---

## 3. Tier logic — CRITICAL

### What drives legal Tier 1 vs Tier 2

**Field:** `properties.property_type` (form: `propertyListingType`).  
**T1:** `private_room_landlord_on_site` (landlord lives on site).  
**T3 (deferred):** `private_room_landlord_off_site` + `is_registered_rooming_house`.  
**T2:** everything else (`entire_property`, off-site private room, shared room).

```107:114:src/lib/pricing/index.ts
export function resolvePropertyTierFromListing(
  propertyType: string | null | undefined,
  isRegisteredRoomingHouse: boolean | null | undefined,
): 't1' | 't2' | 't3' {
  const pt = String(propertyType || '').trim()
  if (pt === 'private_room_landlord_on_site') return 't1'
  if (pt === 'private_room_landlord_off_site' && Boolean(isRegisteredRoomingHouse)) return 't3'
  return 't2'
}
```

**Where set in form:** Property details — card **“A room in my home”** (`landlordAccommodationChoice.ts` L38–40).  
**Where read:** `api/lib/resolveTenancyPackage.ts` (agreements + bond rules); fee snapshot trigger; pricing UI.

### Downstream wiring (map only)

| Tier | NSW | QLD | Bond |
|------|-----|-----|------|
| T1 on-site | `nsw-occupancy` | `qld-occupancy` | NSW: `schemeApplies: false` (landlord-held). QLD: **still RTA lodgement** (`qld.ts`) |
| T2 | `nsw-ft6600` (FT6600) | `qld-form18a` | NSW Fair Trading / QLD RTA |

```163:176:api/lib/resolveTenancyPackage.ts
  if (propertyType === 'private_room_landlord_on_site' && !isRooming) {
    if (state === 'NSW') {
      const rules = nswTenancyRules('T1')
      return {
        tier: 'T1',
        supported: true,
        generator: 'nsw-occupancy',
        ...
```

**Do not confuse with** `service_tier` (`listing` vs `managed`) — that is Quni’s commercial product, not legal T1/T2.

### Derivable from pasted listing text?

**No.** On-site vs off-site is a landlord-lived-there fact that listing copy rarely states reliably. Decision rule 4: leave null; ask the human.

**Does the form force the choice?** Yes on the **full form** (six accommodation cards). **Gap:** mobile hub Basic info only has Entire / Private room / Rooming house — “Private room” defaults to **`private_room_landlord_off_site`** unless already on-site (`listingEditHubHealth.ts`). Extractor must not silently pick T2 via that hub path.

---

## 4. Draft-save path

### Two layers

| Layer | Mechanism | Status |
|-------|-----------|--------|
| **Browser draft** | `localStorage` key `landlord_property_draft` (v1) | Pre-DB only |
| **DB draft** | `properties.status = 'draft'` | Created by **`duplicate_property_listing` RPC**, not by normal new-listing submit |

### Browser draft (extractor’s natural target)

- Autosave 500ms + flush on `visibilitychange` / `pagehide` (`LandlordPropertyFormPage.tsx`)
- Bridge: `src/lib/listingHubDraft.ts` (`patchLandlordPropertyDraftBasic`, `emptyDraftBase`)
- **Minimum to persist:** none — any partial state is fine
- Cleared on successful first insert

`emptyDraftBase()` defaults (relevant contradictions flagged later): `state: 'NSW'`, `propertyListingType: 'entire_property'`, `bondWeeks: '4'`, `serviceTier: 'listing'`.

### Normal create (first DB write)

```2475:2483:src/pages/landlord/LandlordPropertyFormPage.tsx
        const { data: inserted, error: insErr } = await supabase
          .from('properties')
          .insert({
            ...baseFields,
            title: t,
            slug,
            landlord_id: landlordId,
            status: 'active',
```

Button copy is effectively **publish** — there is **no “save as DB draft”** on new listing from this form.

**Client minimum for that insert:** non-empty `title`, `rent_per_week` > 0, plus state-gated compliance/utilities, service-tier availability, attestations (authority to let, accuracy, etc.), payee details when Listing tier.

### `duplicate_property_listing`

RPC (`supabase/migrations/20260603130000_ensure_duplicate_property_listing.sql` / prereqs): landlord-owned source → new row with **`status: 'draft'`**, null availability, copies fields/features/rules/images. Called from `useLandlordPropertyListingActions.ts` → navigates to edit.

### Publish draft → active

```49:58:src/hooks/useLandlordPropertyListingActions.ts
  const publishDraftListing = useCallback(
    async (property: LandlordPropertyForListingActions) => {
      if (property.status !== 'draft') return
      if (!propertyHasAuthorityToLetAttestation(property)) {
        showToast({ kind: 'error', message: AUTHORITY_TO_LET_BLOCKED_MESSAGE })
        return
      }
      ...
        const { error: updateError } = await supabase.from('properties').update({ status: 'active' }).eq('id', property.id)
```

Validates: is `draft` + authority-to-let attestation present. **Does not** re-run full form validation (rent, NSW compliance, photos).

---

## 5. Existing AI plumbing

### Routes under `api/ai/`

| File | Auth | Response shape |
|------|------|----------------|
| `generate-description.ts` | Bearer + landlord (or admin) | Free text `{ description }` |
| `suggest-pricing.ts` | **None** | Structured `{ low, high, reasoning }` (prompt + parse) |
| `proofread-text.ts` | **None** | Structured `{ suggestions: [...] }` |
| `draft-enquiry-reply.ts` | **None** | Free text `{ reply }` (no UI caller found) |
| `student-assessment.ts` | Bearer + landlord | Structured assessment JSON |
| `health.ts` | cron secret | Probe |

Shared: `ANTHROPIC_API_KEY`, `api/lib/anthropicModel.ts` (`ANTHROPIC_SONNET_MODEL`), `api/lib/reportAiFailure.ts`, Edge runtime + CORS pattern.

**Structured output today:** prompt-enforced JSON + client-side parse (`suggest-pricing` `parseSuggestion` / `extractAllJsonObjects`) — **not** Anthropic tool-use / JSON-schema API mode. Free-text pattern: `generate-description`.

**Best reuse for extractor:** new `api/ai/extract-listing.ts` cloned from **`generate-description.ts`** (auth, allowlist body, `reportAiFailure`) + structured JSON parse pattern from **`suggest-pricing.ts`**. Do not write to Supabase from the AI route.

Client call sites already on the property form: `AIDescriptionGenerator`, `AIPricingSuggestionModal`, `AIListingProofread`.

---

## 6. Money & legal commit points

| Stage | What commits rent/bond | Where |
|-------|------------------------|--------|
| Form save / first insert | Listing row `rent_per_week`, `bond_weeks` (+ accuracy attestation hash) | `LandlordPropertyFormPage` → `properties` |
| Student apply | Snapshots `weekly_rent`, `bond_amount` onto booking | `api/lib/booking/listingBookingApply.js` |
| Pre-accept | Landlord may override agreed rent | `POST /api/booking-set-agreed-rent` |
| Listing accept ($99) | Charges fee; booking → `bond_pending`; generates agreement from booking + property tier/state | `api/lib/booking/confirmListing.ts` (`LISTING_FEE_CENTS = 9900`) |
| Agreement PDFs | Read booking `weekly_rent` / `bond_amount` | NSW FT6600 / occupancy / QLD Form 18a generators |

**Extractor rule alignment:** extracted rent/bond may fill **form / localStorage only**. Landlord submit + accuracy attestation commit the listing; booking confirm / agreed-rent commit contract amounts. Never write extractor output straight into bookings or tenancy_documents.

---

## 7. State handling (NSW / QLD)

**Source of truth:** `properties.state` (form free-text; default `'NSW'`).

`resolveTenancyPackage` uppercases and accepts only `NSW | VIC | QLD`; other states → unsupported.

| State | Form sections gated | T2 agreement | T1 agreement | Bond scheme |
|-------|---------------------|--------------|--------------|-------------|
| NSW | FT6600 compliance block | FT6600 | NSW occupancy | T1 off scheme; T2 Fair Trading |
| QLD | Utilities; rooms-rented if on-site; bond remittance pref | Form 18a | QLD occupancy | RTA both tiers |
| VIC | Utilities (same as QLD) | Form 1 | VIC occupancy | via `vicTenancyRules` |

**Extractor should not pre-fill** NSW compliance TriStates, QLD/VIC utilities detail, or QLD remittance preference from paste — those are state-gated attestations the landlord must answer. Safe to suggest `state` / address / suburb / postcode when the paste states them; leave compliance/utilities blank.

---

## 8. Existing import / paste feature

**Nothing shipped.** No `extract-listing` route, no scrape/OCR, no abandoned parser. Only decision + this audit brief. Description AI “Improve” accepts pasted rough draft text into the **description** field only — not a listing importer.

---

## Honest gap list

1. **No DB draft on first create** — “draft” for new listings is localStorage; first insert is `active`. Extractor should target localStorage + form state, not invent a draft RPC.
2. **`headline`** lives outside `properties` (hub/localStorage only).
3. **Hub cannot set T1** without already being on-site — private room tile → off-site.
4. **Feature / house-rule options are UUID-keyed** from DB — extractor must match by **name** then resolve IDs client-side, or return names for the UI to map.
5. **`database.types.ts` lag** vs migrations (`show_add_another_university`, bond_fixed columns).
6. **Legacy `listing_type` (Rent/Homestay/Student House)** still in types but cleared on save — do not map extractor output there.
7. **Empty draft defaults** in hub (`bondWeeks: '4'`) disagree with form/API default (`2`).
8. Publish-from-draft skips full form validation — weak gate if anyone ever inserts sparse DB drafts.

---

## Contradictions

| Topic | Disagreement |
|-------|----------------|
| Brief expected property types | Brief: Rent / Homestay / Student House. **Code:** `property_type` four values; legacy `listing_type` always null. |
| Bond default weeks | Form/`DEFAULT_BOND_WEEKS` = **2**; `listingHubDraft.emptyDraftBase` = **`'4'`**; DB default 2. |
| “Draft” UX vs DB | Hub treats unsaved new listing as conceptual draft; DB status for new publish path is **`active`**. |
| Legal tier vs service tier | Both named “tier” in UI/docs — `property_type` → T1/T2/T3 vs `service_tier` listing/managed. |
| NSW T1 bond vs QLD T1 bond | NSW T1 no scheme; QLD T1 still RTA — same on-site flag, different bond rules. |
| Search param naming | Some UI “property_type” filters actually hit **`room_type`** (browse path). |

---

## Reusable assets (mirror in extractor JSON schema)

| Asset | Path |
|-------|------|
| `PropertyListingType`, `RoomType`, labels | `src/lib/listings.ts` |
| Accommodation UI ↔ DB map | `src/lib/landlordAccommodationChoice.ts` |
| Draft shape v1 | `LandlordPropertyDraftV1` in `LandlordPropertyFormPage.tsx` |
| Hub draft bridge | `src/lib/listingHubDraft.ts` |
| Lease options | `LEASE_OPTIONS` in form page |
| Bond weeks 0–4 + defaults | `api/lib/booking/bookingBondAmount.js` / `src/lib/booking/resolveBookingBondAmount` |
| Rule permitted | `'yes' \| 'no' \| 'approval'` |
| Service tier | `src/lib/landlordServiceTier.ts` |
| Utilities / FT6600 form types | `propertyUtilitiesFormState.ts`, `LandlordPropertyFt6600ComplianceFields.tsx` |
| Feature name seeds | `supabase/quni_supabase_schema.sql` |
| House rule seeds | `20260415130000_house_rules_system.sql` |
| Tenancy package truth table | `api/lib/resolveTenancyPackage.ts` |
| AI Edge + auth template | `api/ai/generate-description.ts` |
| Structured JSON parse pattern | `api/ai/suggest-pricing.ts` |

There is **no shared Zod schema** for the property form — extractor schema should mirror `LandlordPropertyDraftV1` + accommodation choice enums, with **`propertyListingType` / on-site left null** until human choice.

---

## One-line recommendation

**Add `api/ai/extract-listing.ts` (auth pattern from `generate-description`, structured JSON parse from `suggest-pricing`) and pre-fill `landlord_property_draft` / `LandlordPropertyFormPage` state on `/landlord/property/new` — leave `propertyListingType` null and force the accommodation card; do not insert `properties` from the AI call.**

**Blocker before phase 2:** decide how null accommodation maps into UI (draft currently always has a `propertyListingType`; empty draft defaults to `entire_property`) so the extractor never silently commits T2 via hub defaults, and align hub `bondWeeks` default with `DEFAULT_BOND_WEEKS` so blanks/defaults don’t invent 4 weeks.
