# Quni — Renter onboarding & profile · developer handoff

Everything needed to build this design into the Quni website.

## What's in this package

| File | What it is |
|---|---|
| `Renter Profile Completion.dc.html` | The page — all frames (sign-up, profile unset, profile working, switch dialog) at web + app widths |
| `ProfilePage.dc.html` | Assembles one profile for a given `state` (unset / working / switching) and `device` (web / app). Holds the counts, numbering and route logic. |
| `ProfileSection.dc.html` | The collapsible section card. Renders text / upload / textarea / checkbox fields, done/to-do/optional status, summary-on-collapse. |
| `SituationSection.dc.html` | The situation picker ("Section 0") — six tiles, collapses to a Done + Edit summary row. |
| `support.js` | Runtime that makes the four `.dc.html` files render in a browser. |
| `design-system/colors_and_type.css` | **The token source of truth** — 146 CSS variables (colour, type, space, radius, shadow). |
| `design-system/quni-design-system.md` | The written design-system rules. |
| `handoff/Quni Renter Profile — standalone.html` | One self-contained file — open in any browser to view the whole design, no setup. |

> The `.dc.html` files are a lightweight custom component format (markup + a small logic class), not React/Vue. They're meant as a **faithful reference** — read them, lift the markup and logic, and re-implement in your stack. They DO render in a browser if you serve them next to `support.js`.

## How to view it right now

Open `handoff/Quni Renter Profile — standalone.html` in any browser. That's the design, fully self-contained.

## Token mapping (do this when you rebuild)

The `.dc.html` files use literal hex/px values so they paint instantly. When you port them, map those literals to the design-system variables in `colors_and_type.css`:

| Literal in the files | Token | Use |
|---|---|---|
| `#FF6F61` | `--quni-coral` | brand / primary CTAs, eyebrows, progress bar, active states |
| `#F2604F` | `--quni-coral-hover` | button hover |
| `#CC4A3C` | `--quni-coral-active` | link active, error text on coral fields |
| `rgba(255,111,97,0.06)` | `--quni-coral-tint` (≈8%) | selected tile / required-field tint |
| `#FEF9E4` | `--quni-cream` | header / status bars (brand panel) |
| `#E8E0CC` | `--quni-cream-border` | cream-panel borders |
| `#1F2A44` | `--quni-navy` | secondary / institutional |
| `#08060D · #2A2433 · #4A4253 · #6B6375 · #908897` | `--quni-ink … --quni-ink-4` | text ramp (warm, never cool grey) |
| `#E5E4E7` | `--quni-line` | default borders |
| `#fff · #F8F6F1 · #F4F3EC` | `--surface-1 / -2 / -3` | surface layers |
| `#E6F4EE / #0F6E56` | `--quni-success-bg / -fg` | "Done" pill |
| `#FEF3C7 / #92400E` | `--quni-warning-bg / -fg` | "To do" pill |
| card radius `16px` | `--radius-lg` | section cards |
| button/field radius `10–12px` | `--radius-md` | buttons, inputs |
| pill radius `999px` | `--radius-pill` | status pills, avatars |
| resting card shadow | `--shadow-1` | section cards |
| modal shadow | `--shadow-3` | switch-confirm dialog |

Fonts: **Inter** for all UI/body, **Playfair Display** for the "Quni" wordmark and the "Onboarding & profile" / "Create an account" display titles. Both load from Google Fonts.

## Screens & states

**1 · Create an account** — renter vs landlord only (situation is NOT chosen here). Google + email sign-up, T&C checkbox, "Sign up with email" is the coral primary.

**Profile** — one scrollable page, collapse-on-complete. Section order is fixed in every state:

```
Your situation        (unnumbered picker — Section 0)
01  Personal details  (universal)
02  Verification       (universal: Government photo ID + Supporting document + situation-driven email)
03  [route section]    (situation-specific — locked placeholder until a situation is chosen)
    Guarantor          (unnumbered — appears only when income is low / unverified; consent is a checkbox, not an upload)
04  Emergency contact  (universal)
--- optional ---
05  About you
06  Living preferences
```

**Route section (03) by situation**
| Situation | Section 03 |
|---|---|
| Student | Study & funding (incl. enrolment proof) |
| Working | Employment & income |
| Working holiday / Backpacker | Visa & funding (incl. visa) |
| Retired | Income — super or pension |
| Between jobs | Income — savings or support |

**Verification (02)** is universal and never clears on a switch: Government photo ID + Supporting document + an email field that varies by situation (university / work / personal). Enrolment and visa live in the route section, not here.

**Required count** is situation-aware and matches the numbered list: 4 required sections (01 Personal details, 02 Verification, 03 route, 04 Emergency).

## Key behaviours to implement

- **Situation picker** drives section 03. Selecting a tile unlocks/swaps that section. Picker collapses to a "Done · Edit" summary once chosen; Edit re-expands it.
- **Switch confirm** — show the "Switch your situation?" dialog ONLY when the new tile changes the route section AND that section already holds entered data. No confirm if it's empty or the switch doesn't change the section (e.g. Working holiday ↔ Backpacker share one route section). On confirm, clear the route section only; Personal details, Verification and Emergency contact stay.
- **Guarantor** appears in the route flow only when declared income is low/unverified. Consent is a checkbox attestation ("I confirm this person agrees to act as my guarantor") — do not collect a consent document.
- **Income bands are weekly** everywhere (e.g. "Under $500 /wk").
- **Request a booking** stays disabled until all required sections are complete.

## Copy & conventions (from the design system)

Sentence case; Australian English; AUD `$` with `/wk`; dates `27 Feb 2026` display / `dd/mm/yyyy` input; no emoji (use Lucide outline icons). Voice: warm, trustworthy, considered.
