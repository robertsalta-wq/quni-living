# Booking pages — restructure handoff

**Status:** proposal locked for execution; no code written yet. **Re-layout blocked on section primitive** —
see `docs/section-disclosure-pattern.md`.
**Audience:** Claude (implements), Cursor (reviews), Rob (approves push).
**Date:** 14 Jul 2026 (rev. 4 — renamed from booking-ia-handoff; scope is zones + theming + Section)

Formerly `docs/booking-ia-handoff.md`. “IA” undersold the work: this is the landlord/renter booking-page
restructure (zones on `<Section>`), plus the orthogonal token sweep — not an information-architecture study alone.

---

## 1. The problem

The landlord booking review page (`src/pages/landlord/LandlordBookingReviewPage.tsx`, ~1,965 lines) grew by
accretion. Over recent weeks we shipped, in order: a verification panel, a fit summary, a tenancy agreement
panel, a lease-terms editor, an agreed-rent editor, an occupancy & rent breakdown, a bond-received action,
payment-instruction resend, and a booking activity timeline. **Every feature bolted on a new card. Nothing was
ever removed or regrouped.**

The result: the page is organised by *when we built things*, not by *what a landlord needs*. Same for the
renter's booking view (`src/pages/StudentDashboard.tsx`, bookings tab).

The data is good. The layout is not. **This is an information architecture job, not a feature job.**

---

## 2. What the pages should answer

**Landlord page — four questions, in this order:**

1. **What do I need to do?** One action zone at top. Everything with a deadline or pending decision: bond
   outstanding (with date), agreement unsigned, more info requested, accept/decline pre-acceptance. If there's
   nothing to do, say so plainly and take up little room.
2. **Who is this and should I accept them?** Applicant, verification, fit summary. Matters enormously
   *before* acceptance, barely at all after. Prominent pre-acceptance; collapses to a summary line once
   confirmed.
3. **What are the terms?** Rent, occupants, dates, lease length, bond, service tier. Currently scattered
   across the sidebar, the "Occupancy & rent" card, and the terms editor. Should be **one block** with an
   edit affordance.
4. **What's happened?** Tenancy agreement (status, sign, regenerate, download) and the activity timeline.
   History and reference, not action. Below the fold.

**Renter page — the mirror, simpler:** what do I owe, what did I agree to, what's happened. Nothing else.

---

## 3. Audit findings

### 3.1 Current landlord page inventory (render order)

Left column:

| # | Section | Shows | Appears when |
|---|---|---|---|
| 1 | Title card | H1 (flips to "Booking confirmed"), status pill, tier pill, flow pill, reference, received-ago | always |
| 2 | Property card | address, locality, room type, 88px photo | always |
| 3 | `LandlordListingAcceptedSummary` | bond amount, deadline, listing fee, bond obligations, celebration | listing + `bond_pending` |
| 4 | Tenancy agreement | `TenancyAgreementExplainer` + `BookingLeasePanel` | `bond_pending`, `confirmed`, `active` |
| 5 | AI assessment | assessment text, generate/refresh | **not** listing-bond_pending |
| 6 | Fit summary | `BookingFitSummaryTable` | **always** |
| 7 | Activity | `BookingActivityTimeline mode="internal"` | **always** |
| 8 | Occupancy & rent | occupants, carpark, rent breakdown, total/wk, co-tenant | always (self-hides if no data) |
| 9 | Terms editor | `LandlordBookingTermsEditor` (listing) — rent, bond weeks, lease, move-in, occupants, notes, co-tenant | `pending_confirmation`/`awaiting_info`/`bond_pending` + listing; hides once anyone signs |
| 9b | Agreed-rent editor | `LandlordBookingAgreedRentEditor` (managed) — agreed rent, bond, bond weeks, reason | everything else; editable only pre-acceptance |
| 10 | AI assessment **again** | same component, second JSX slot | listing-bond_pending |
| 11 | Student message | quote block | if present |
| 12 | Managed-upgrade chooser | two tier cards | `tierModel.showManagedUpgrade` |
| 13 | Backups warning | "N other students…" | count > 0 |
| 14 | Confirm-blocked banners ×5 | identity / module / card / payout / billing | pre-acceptance gates |
| 15 | Message thread | full thread | if messages |

Right rail (one sticky card ≥901px; **`order-first` below that**, so on mobile the whole rail renders *above*
everything): applicant header → verification → terms grid (Move-in / Lease / Bond / Platform fee / Service
model) → off-platform bond note → "No Quni payment" note → deposit held/authorised (managed) → weekly rent
(only when no occupancy snapshot) → bond receipt → mark-bond-received → bond deadline card → errors → resend
instructions → bond-received CTA (+QLD guidance, +RTA form, +backups repeat, +cancel) **or** Accept / Decline /
Request info.

### 3.2 Duplication

- **Weekly rent** — sidebar (conditional), Occupancy & rent card, terms editor, agreed-rent editor.
- **Bond amount** — sidebar tile, `LandlordListingAcceptedSummary`, terms-editor preview, bond modal prefill.
  Three visible simultaneously at listing/`bond_pending`.
- **Bond deadline** — sidebar deadline card + AcceptedSummary "Deadline:" line + timeline event detail.
- **"Bond is off-platform / Quni holds nothing"** — **five copies**, including two *adjacent paragraphs* in the
  sidebar (`LandlordBookingReviewPage.tsx` ~L1315–1326).
- **Listing fee** — sidebar "Platform fee", AcceptedSummary, hardcoded `$99` in the no-payment-method banner,
  cancel modal.
- **Service tier** — header pill, sidebar "Service model", AcceptedSummary framing.
- **Backups count** — standalone warning card + repeated inside bond-received helper text.
- **Confirm-blocked reason** — full banner in left column + condensed repeat above the Accept button.
- **Receipt-≠-RTA-lodgement disclaimer** — four copies.
- **Co-tenant** — Occupancy & rent card + terms editor.
- **Move-in / lease length / occupants** — sidebar tiles + terms editor fields.

### 3.3 Dead weight

- **Fit summary and AI assessment render at `confirmed`/`active`.** They are pre-acceptance decision aids.
- **AI assessment is rendered from two JSX slots** (`!isListingBondPending` high, `isListingBondPending` low)
  purely to fake a reorder at one status. Should be one slot.
- **Applicant + verification sit at the top of the sticky rail at every status**, and because the rail is
  `order-first`, a mobile landlord opening a `bond_pending` booking sees applicant identity before "bond due
  by 3 August".
- **Sidebar "Deposit authorised" renders `booking.created_at`** — that's the request date, mislabelled.
- **`src/components/student/StudentDashboardBookingCard.tsx` (235 lines) is imported by nothing.**
  `StudentDashboard.tsx` has an inline copy that has drifted: the dashboard version gained
  `ListingPaymentInstructions` and the host block; the orphan retains `BookingAgreedRentNotice`, which the live
  page therefore **never renders**. Renters on listing bookings with an agreed-rent override are not seeing
  that notice. (Bug — keep out of the re-layout PR; see §8 #6.)
  Note: the file is named in `src/components/landlord/landlordBookingTermsEditorPrivilege.test.ts` as a path
  that must not import the editor — deleting it means touching that test.

### 3.4 Observed on the live site (from screenshots, not in code review)

- H1 says "Booking confirmed" while the pill under it says "bond pending".
- Sidebar "Platform fee: –" while the accepted-summary panel says "Listing fee ($0.00)".
- Sidebar "Lease: 3 months", fit summary "student 3 months / listing Flexible", AI assessment "for 6 months".
  Three numbers, one lease. **Not a layout bug** — either the AI prompt reads a different field or
  `lease_length` is stale. Worth a separate look.
- Activity renders **above** Occupancy & rent — history outranking terms.

---

## 4. Proposed IA

### Landlord — sidebar dissolves, four zones, single column

Each zone is an instance of the shared `<Section>` primitive
(`docs/section-disclosure-pattern.md` — promote `CollapsibleProfileSection` first). **Reference** disclosure
policy: independent toggles, not step accordion.

| Zone | Content | `<Section>` | pre-accept | `bond_pending` | `confirmed` | `active` |
|---|---|---|---|---|---|---|
| **0 Header** | property · applicant · status · reference (replaces cards 1+2) | not a Section (page chrome) | ✓ | ✓ | ✓ | ✓ |
| **1 Do** | gates checklist + Accept/Decline/More info + tier chooser + backups | `tone="warning" collapsible={false}` | full | bond amount + deadline + *Bond received* + Cancel + Resend + RTA (disclosure) | sign-agreement line / mark-bond-received, else **"Nothing to do"** (one row) | "Nothing to do" |
| **2 Who** | applicant, verification, fit, AI, student message, thread | collapsible; summary + `editLabel="View applicant"` when collapsed | **expanded** | collapsed | collapsed | collapsed |
| **3 Terms** | money block, then rent / bond / move-in / lease / occupants / co-tenant / parking / service model — **one dl, one Edit affordance** | collapsible; summary + `editLabel="Edit terms"` | editable | editable until first signature (existing gate) | read-only | read-only |
| **4 History** | tenancy agreement (explainer + lease panel) → activity timeline | collapsible; no status pill; **collapsed by default** | timeline only (no agreement exists) | ✓ | ✓ | ✓ |

**Zone 3 is the only place the service tier branches.** Edit opens `LandlordBookingTermsEditor` (listing) or
`LandlordBookingAgreedRentEditor` (managed) **in place**. Cards 8, 9, 9b and the sidebar terms grid all collapse
into it. `LandlordListingAcceptedSummary`'s obligations copy becomes a disclosure inside Zone 1.

**Zone 3 money block** (marketplace pattern — lead with what Quni holds / what the host gets):

- **Listing:** `Rent to you`, `Bond — paid direct to you`, `Quni listing fee −$99`, **`Quni holds $0`**.
  That last line says the off-platform thing *once, as a number*, and retires four of the five prose copies.
- **Managed:** `Rent`, `Bond` (own line — do **not** fold into “holds” until product confirms bond custody),
  `Holding deposit`, `Platform fee`, **`Quni holds $X`** where `$X` is status-aware (see §4.1).

**Money totals:** `lease_length` is a free string (`'3 months'`, `'12 months'`, `'Flexible'`) and `end_date`
isn't always set, so `$420 × 52 weeks` is **not always computable**. Where the term is open-ended / no
`end_date`, the money block **degrades to per-week**. Don't invent a total. (**Locked.**)

### 4.1 Managed “Quni holds” — fact (locked)

Holding deposit ≠ bond.

| Field | Meaning |
|---|---|
| `deposit_amount` | One week’s rent PaymentIntent — authorised at Managed request, **captured on Managed confirm** |
| `deposit_released_at` | Set by `api/cron/release-deposits.js` the day after move-in (Connect transfer to landlord) |
| Listing | `deposit_amount` stays null → **Quni holds $0** always |

**`$X` for Managed:**

| Status | Quni holds |
|---|---|
| pre-accept | authorised hold = `deposit_amount` |
| `confirmed` / `active`, `deposit_released_at` null | captured holding deposit = `deposit_amount` |
| after `deposit_released_at` | **$0** |

Show bond on its **own** line. Do not add bond into “Quni holds $X” unless product later confirms Quni still
custodies Managed bond. Today the durable held amount on the booking row is the holding deposit.

Also fix in re-layout (not theming): sidebar “Deposit authorised” currently shows `booking.created_at`
(request date) — mislabelled.

### Renter — three zones

| Zone | Content |
|---|---|
| **1 Owe** | obligation band, **merged with** `StudentDashboardBookingStatusStrip` and `tenantBookingCardBanner` — today those are three stacked components saying nearly the same thing at `awaiting_info` and `bond_pending`. Payment instructions + bond guidance + sign CTA sit under the band. |
| **2 Agreed** | read-only **full mirror** of landlord Zone 3 fields: rent, dates, lease length, bond, bond weeks, occupants, co-tenant, parking, service model. Use progressive disclosure if dense. Fields already live on the booking row; listing terms can change pre-signature — hiding them hides binding truth. (**Locked.**) |
| **3 History** | agreement panel + `BookingActivityTimeline mode="renter"`. Privilege model untouched. |

Mobile: zones stack, action first. The rail's `order-first` problem disappears because there is no rail.

---

## 5. Theming — do this before the re-layout

### 5.1 The finding

`tailwind.config.js` already defines a full design system ("The Living Console") — `admin-coral`, `admin-ink`
1–5, `admin-line`, `admin-surface` 1–3, `admin-success/warning/danger/info`, Inter/Lora/Playfair roles.
Documented in `docs/admin-redesign/HANDOFF.md`. Claude Design ships the **same hex values** as `--quni-*`
CSS variables in `src/styles/quni-design-tokens.css`.

**It was only ever applied to admin and half the landlord page.**

Booking surfaces: **362 raw Tailwind colour classes, 63 hardcoded brand hex, 3 inline Playfair styles** across
15 files. Token adoption is binary — three files use the system, twelve have never heard of it:

| File | raw colours | brand hex | admin tokens |
|---|---|---|---|
| `LandlordBookingReviewPage` | 63 | 30 | 187 |
| `LandlordBookingTermsEditor` | 7 | 0 | 46 |
| `BookingActivityTimeline` | 15 | 0 | 14 |
| `StudentDashboard` | 67 | 23 | **0** |
| `BookingLeasePanel` | 47 | 0 | **0** |
| `BookingOccupancySection` | 29 | 7 | **0** |
| `LandlordBookingOccupancySummary` | 27 | 0 | **0** |
| `LandlordBookingAgreedRentEditor` | 23 | 0 | **0** |
| `tenantBookingStatus.ts` | 20 | 0 | **0** |
| `BookingFitSummaryTable` | 19 | 0 | **0** |
| `LandlordListingAcceptedSummary` | 15 | 2 | **0** |
| `ListingBondPaymentGuidance` | 14 | 1 | **0** |
| `RenterBookingObligationBand`, `BookingAgreedRentNotice`, `StudentDashboardBookingStatusStrip` | 16 | 0 | **0** |

### 5.2 Substitution map (mechanical, ~250 of the 362)

**Sweep targets `admin-*` utilities.** Do not wait for a rename.

| Raw | Token |
|---|---|
| `text-gray-900` / `-800` | `text-admin-ink` / `text-admin-ink-2` |
| `text-gray-700` / `-600` / `-500` | `text-admin-ink-3` / `-4` / `-5` |
| `border-gray-100` / `-200` / `-300` | `border-admin-line-soft` / `border-admin-line` / `border-admin-line` |
| `bg-gray-50` / `-100` | `bg-admin-surface-2` / `bg-admin-surface-3` |
| `amber-*` | `admin-warning` / `-fg` / `-bg` |
| `emerald-*` / `green-*` | `admin-success` / `-fg` / `-bg` |
| `red-*` / `rose-*` | `admin-danger` / `-fg` / `-bg` |
| `sky-*` | `admin-info` / `-fg` / `-bg` |
| `rounded-lg` / `-xl` / `-2xl` | `rounded-admin-sm` / `-md` / `-lg` |
| `#FF6F61` / `#F2604F` / `#CC4A3C` | `admin-coral` / `-hover` / `-active` |
| `#FEF9E4` | `admin-cream` |
| inline `fontFamily: 'Playfair Display'` | drop Playfair on booking section titles (use sans / existing hierarchy). `font-admin-display` is Living Console hero only. |

Off-palette values found in the wild, to be corrected, not tokenised: `#e85d52` (×3, a near-miss of
`#F2604F`), `#F7F8FA`, `#B25548`.

### 5.3 Indigo — delete it

**41 indigo classes on the renter surfaces.** `BookingLeasePanel` is `bg-indigo-50` / `border-indigo-100` /
`text-indigo-950`; `BookingActivityTimeline variant="student"` links are `text-indigo-700`; `StudentDashboard`
rings the current booking `indigo-100`.

Effect: **the same booking is a different colour depending on which party is looking at it** — renter blue,
landlord coral. And because `BookingLeasePanel` is shared, the indigo panel renders *inside* the coral landlord
page too.

Claude Design has **no indigo / no blue accent**. This is Tailwind-default drift. **The 41 classes get
deleted, not replaced with a blue token.** Renter surfaces move to coral + `admin-*` like everything else.
Fold into the token-sweep PR.

### 5.4 Naming fork — deferred (own PR later)

`--quni-*` CSS vars and `admin-*` Tailwind utilities are the same palette under two names. The `admin-`
prefix is now a lie (product-wide tokens), but renaming ~56+ TSX files + config is **out of scope** for the
booking sweep. Defer a mechanical `admin-*` → `quni-*` rename (optionally with Tailwind aliases first) to a
separate commit so the booking theming PR stays reviewable.

Claude Design extras not yet in Tailwind (AI accent, motion, layout, lifecycle) — track separately; optional
`--quni-ai` wiring for the assessment panel is not required for the sweep.

---

## 6. Guardrails — do not break these

1. **Re-layout only.** Do not remove functionality. Do not add features.
2. **Renter timeline privilege boundary.** `BookingActivityTimeline mode="renter"` filters to `audience='both'`
   and must **never** show email events. Filtering happens at three layers — RLS, the `useBookingEvents` query
   (`audienceBothOnly`), and `buildBookingActivityItems`. Do not weaken any of them.
   *Note:* filtering is on `audience` only, never on `event_type`. An `email.*` row written with
   `audience: 'both'` **would** render to a renter. Nothing writes that today. A defence-in-depth
   `&& !isEmailEvent(e.event_type)` in the renter branch is optional and, if done, should be its own commit.
3. **The obligation band reads current booking state, not the event log.** Keep it that way
   (`src/lib/booking/renterBookingObligation.ts`).
4. **Managed-tier bookings still use `LandlordBookingAgreedRentEditor`.** The new terms editor is listing-only
   (`listingBookingTermsEditorEligible`). Do not break managed.
5. **Mobile matters** — renters are on phones.
6. **Branch + PR only. One concern per commit. Never push without Rob's say-so.**
   (Overrides any default “deploy after changes” agent habit for this workstream.)

---

## 7. Commit slicing

**Prerequisite (own doc / PR):** promote `<Section>` per `docs/section-disclosure-pattern.md` §5 steps 1→2
before any booking zone re-layout. Do not invent a sixth card pattern.

**Rule (locked):** Long scroll-and-read → sticky section nav. Status-bearing → collapsible `<Section>`.
Neither → plain stack. PropertyDetail sticky nav is its **own PR after promote** — not booking.

1. **Token sweep + indigo delete** — booking surfaces onto `admin-*`. Pure substitution, **zero layout
   change**. Orthogonal to Section promote — can land before or after. Cursor reviews: substitution table
   faithful, no behavioural / DOM-order moves.
2. **Section promote + landlord-profile import swap** — see section-disclosure doc (not booking code yet).
3. Extract Zone 3 terms block (`BookingTermsBlock`) — shared shape, landlord + renter.
4. Landlord Zone 1 — `<Section tone="warning" collapsible={false}>`; absorbs confirm-blocked banners,
   backups, bond deadline, bond-received CTA, resend, cancel.
5. Landlord Zone 2 — `<Section>` applicant collapse post-acceptance; summary + View applicant; single
   AI-assessment slot.
6. Landlord Zone 3 — `<Section>` money block + Edit terms (editors in place).
7. Landlord Zone 4 — `<Section>` agreement + timeline; collapsed by default.
8. Renter zones (Owe / Agreed / History) on the same primitive.
9. Dead-code removal for booking orphan only if not already deleted in the disclosure dead-code PR
   (`StudentDashboardBookingCard.tsx` + privilege-test path list).

**Later / separate (see also section-disclosure doc):**

- Property form → `<Section collapsible={false}>` + scroll-target fixes.
- Renter profile rebuild (explicitly deferred).
- `admin-*` → `quni-*` rename (repo-wide).
- Restore `BookingAgreedRentNotice` on the live renter card (bugfix).
- Optional renter-timeline email event-type filter.
- Lease-length / AI prompt inconsistency (data, not layout).

---

## 8. Decisions

| # | Decision | Status |
|---|---|---|
| 1 | Rename `admin-*` → `quni-*` repo-wide? | **Deferred** — sweep onto `admin-*`; rename is its own PR |
| 2 | Money-block total degrades to per-week when lease is `'Flexible'` / no `end_date`? | **Yes** |
| 3 | Renter Zone 2 field set | **Full mirror** of landlord terms (progressive disclosure OK) |
| 4 | Managed “Quni holds” | **Holding deposit only**, status-aware (§4.1); bond is a separate line |
| 5 | Defence-in-depth email filter on renter timeline? | Optional, own commit |
| 6 | Restore `BookingAgreedRentNotice` on live renter card? | Yes eventually — **out of re-layout PR** |
| 7 | Disclosure primitive | **Superseded / blocked on** `docs/section-disclosure-pattern.md` — promote `<Section>`, then four booking zones are instances of it |

---

## 9. Where to start

1. **Lock** `docs/section-disclosure-pattern.md` §3 + §8 with Rob (rule + promote path).
2. Claude can still ship **§7.1** (token sweep) anytime — no layout commitment.
3. Claude ships **Section promote** (section-disclosure §5.1→5.2); Cursor reviews additive API + landlord
   profile unchanged except intentional summary-when-collapsed behaviour.
4. Only then: booking zone re-layout (§7.3–7.8). Still no push without Rob.

### Cursor review checklist (token-sweep PR)

- [ ] Only class / hex / fontFamily substitutions — no DOM reorder, conditionals, or copy changes
- [ ] Substitution map applied; off-palette hex corrected to tokens (not left as near-misses)
- [ ] All indigo classes removed (not re-tokenised as blue) on shared + renter surfaces
- [ ] No new Playfair on booking section titles
- [ ] Shared components (`BookingLeasePanel`, timeline) stay coherent for both parties
- [ ] One concern per commit; branch + PR only

### Cursor review checklist (Section promote PR)

- [ ] Additive props only; landlord profile still compiles via re-export
- [ ] Summary row shows whenever collapsed + `summary` set (not only `status === 'done'`)
- [ ] `collapsible={false}` has no chevron / no toggle; `tone` borders render
- [ ] No booking re-layout in the same PR
