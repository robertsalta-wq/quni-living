# Quni Living Design System

The shared visual language for **Quni Living** — Australia's student accommodation marketplace. A two-sided platform connecting university students with private landlords renting rooms near campus. Quni operates a **marketplace web app**, an **admin dashboard**, and a **mobile app on Android** (iOS in progress).

The product handles significant financial decisions — rent, bonds, tenancy agreements — so the design language is **warm, trustworthy, considered**. Not playful, not SaaS chrome. Editorial polish, generous whitespace, restrained typography. Light-only (`color-scheme: light` is enforced in CSS and `<meta>`).

## Sources

This system was extracted from a 16-file snapshot of the live Quni codebase, mounted at `claude-design-bundle/`:

| Path | Role |
| --- | --- |
| `tailwind.config.js` | font families, `max-w-site = 1200px` |
| `src/index.css` | `:root` tokens, h1/h2 defaults, light-only enforcement |
| `index.html` | font imports, theme-color `#FF6F61`, OG tags |
| `src/lib/site.ts` | layout constants — `SITE_CONTENT_MAX_CLASS`, private SEO paths |
| `src/components/PropertyCard.tsx` | marketplace listing card (canonical card pattern) |
| `src/components/PageHeroBand.tsx` | coral hero band w/ Playfair title |
| `src/components/SiteBrandLockup.tsx` | logo + AI sparkle entry point |
| `src/components/StudentVerifiedBadge.tsx` | emerald 15% verified pill |
| `src/components/VerifiedLandlordBadge.tsx` | coral 15% verified pill |
| `src/components/landlord/LandlordApplicantVerificationBadges.tsx` | applicant verification badges (emoji 🎓 ✅ 📄 📎) |
| `src/components/AUDateField.tsx` | dd/mm/yyyy text input + native picker |
| `src/pages/admin/AdminLayout.tsx` | cream sidebar shell, indigo active state, 19 flat nav items |
| `src/pages/admin/adminUi.tsx` | `adminCardClass`, `adminTableWrapClass`, `adminThClass`, `adminTdClass` |
| `src/pages/admin/AdminBookings.tsx` | booking status pills (12 states) |
| `src/pages/admin/AdminOverview.tsx` | KPI cards (informal — no shared primitive yet) |
| `src/pages/admin/AdminPricing.tsx` | T1/T2/T3 tier badges, lifecycle pills, green CTAs |

The bundle is **truth, not gospel** — it contains real drift this system consolidates (see [Consolidation decisions](#consolidation-decisions)).

---

## Consolidation decisions

Every decision below is called out so you can confirm or push back before the system locks in.

### 1. Coral hex — `#FF6F61` is canonical
- **Drift found:** The footer uses `#FF7261` (one digit off). Every other surface — `theme-color` meta, `PageHeroBand`, `SiteBrandLockup`, `VerifiedLandlordBadge` — uses `#FF6F61`.
- **Decision:** `#FF6F61` is canonical. **Flag the footer hex as a fix.**

### 2. Three accent systems → one explicit hierarchy
- **Drift found:** Coral for marketing/landlord verification; indigo for admin nav + student verification badges; greens (`#0F6E56` / `#1D9E75`) for pricing CTAs.
- **Decision:**
  - **Coral** — brand colour and primary CTAs everywhere (marketing, marketplace, admin save buttons, AI accent border).
  - **Navy `#1F2A44`** — secondary actions, sidebar active state, chart series 2.
  - **Semantic greens / ambers / reds / sky** — status only. They never substitute for coral or navy as a "brand" colour.
- **Knock-on:** Pricing CTAs that currently use `#1D9E75` should migrate to **coral primary buttons**; the green stays for the *Live — Phase 1* lifecycle pill (it reads as "go" / status, which is its right job). The admin sidebar shifts from indigo active state → **coral active state** so the brand reads through.

### 3. Verification badge logic — role-based, not arbitrary
- **Drift found:** Student Verified = emerald, Landlord Verified = coral, applicant "Verified Student" tier = emerald with an indigo ring on the *applicant* surface.
- **Decision:** Verification badges encode **role**, not status:
  - **Verified Landlord** — coral pill (matches brand; landlords ARE the brand-facing supplier).
  - **Verified Student** — navy pill (a tenant-side trust signal; navy reads as institutional / academic).
  - **Verified Identity** (non-student route) — neutral ink pill with a checkmark (it's identity, not a role).
- All three use the same shape, padding, and checkmark icon. Only the colour role differs.

### 4. Purple `--accent: #aa3bff` — kept, scoped to AI
- **Drift found:** Defined in `:root` but only surfaced in `SiteBrandLockup`'s AI sparkle entry point.
- **Decision:** **Keep, but reserve exclusively for AI moments** — AI sparkle, AI-generated content callouts, AI feature surfaces (`/landlords/ai`). Never a primary CTA, never a status colour. Documented as `--quni-ai`.

### 5. Radius + shadow — 3 step scales
- **Radius:** `sm 6px` (chips), `md 10px` (buttons/fields), `lg 16px` (cards = canonical `rounded-2xl`), `pill 999px`. Migrate stray `rounded-xl` to `rounded-md` for buttons and `rounded-2xl` for cards.
- **Shadow:** `shadow-1` (resting card), `shadow-2` (hover card / dropdown), `shadow-3` (modal / popover). Replace `shadow-sm` → `shadow-1`, `shadow-md` → `shadow-2`, `shadow-lg` → `shadow-3`.

### 6. Typography — single intentional scale, four families with explicit roles
- **Inter** — UI, body, in-app headings (admin, dashboards).
- **Playfair Display** — display only: hero band titles, marketing h1, brand wordmark.
- **Lora** — pricing values, long-form editorial content (e.g. public pricing page, policy pages).
- **Open Sans** — footer body only, kept for the existing footer compositions; new surfaces should use Inter.
- The `index.css` h1 = 56px Playfair stays for **marketing only**. Admin pages already use `text-2xl font-bold` Inter — that's the in-app h1 (`var(--text-h1-size)` = 28px).

### 7. Admin sidebar — 19 flat items → 4 grouped sections
The current `AdminLayout.tsx` has 19 flat nav items. Proposed grouped IA (matches editorial polish, drops the Supabase-console feel):

| Section | Items |
| --- | --- |
| **Marketplace** | Overview · Bookings · Tier events · Enquiries · Properties |
| **People** | Students · Landlords · Landlord leads |
| **Operations** | Apps · Payments · Trust checklist · State workflows |
| **Settings** | Business settings · Pricing · Domains · Documents · Knowledge base · Support (Qase) · Qase settings |

Sections are visually divided, collapsible. The active state shifts from indigo → coral (per decision 2). See `ui_kits/admin/`.

### 8. Verification badge icons — unified inline-SVG set, NOT emoji
- **Found:** `LandlordApplicantVerificationBadges.tsx` uses 🎓 ✅ 📄 📎 inline.
- **Decision:** **Replace emoji with a unified outline-SVG icon set.** Rationale:
  - Emoji rendering varies wildly across Android/iOS/Windows — a credibility risk on a financial product.
  - Lucide-style outline icons (graduation-cap, check-circle, file-text, paperclip) match the existing Lucide `Globe` already in `AdminLayout.tsx`.
  - The brand voice is **considered**, not playful — emoji read as casual.
- We keep emoji **off-limits** as a system rule; flagged inline in components.

---

## Index — files in this system

```
README.md                  ← you are here
SKILL.md                   ← skill definition (Agent Skills compatible)
colors_and_type.css        ← CSS custom properties — colours, type, spacing, radius, shadow, motion

assets/                    ← logos, mark, AI sparkle (placeholders — see Iconography)
fonts/                     ← (empty — fonts are loaded from Google Fonts CDN; see VISUAL FOUNDATIONS)

preview/                   ← Design System tab cards (HTML)
  brand-coral.html, brand-navy.html, brand-cream.html, brand-ai.html
  neutrals.html, semantic.html, lifecycle.html, chart-palette.html
  type-display.html, type-headings.html, type-body.html, type-pricing.html
  spacing.html, radii.html, shadows.html, layout.html
  buttons.html, badges.html, verification.html, tier-badges.html
  property-card.html, admin-card.html, table.html, sidebar.html
  hero-band.html, brand-lockup.html, audate.html, kpi-card.html
  modal.html, drawer.html, toast.html, kanban.html, empty-states.html

ui_kits/
  marketplace/
    index.html             ← interactive listings page
    PropertyCard.jsx, PropertyHero.jsx, SiteHeader.jsx,
    SiteFooter.jsx, FilterBar.jsx, VerifiedBadges.jsx
  admin/
    index.html             ← interactive admin shell w/ Overview + Bookings
    AdminShell.jsx, AdminSidebar.jsx, KpiCard.jsx,
    AdminTable.jsx, StatusPill.jsx, TierBadge.jsx
```

---

## CONTENT FUNDAMENTALS

### Voice
- **Warm, trustworthy, considered.** This is housing — students sign tenancy agreements; landlords lodge bonds. Tone is closer to a careful real-estate agent than a startup.
- **Plain, sentence-case Australian English.** `Move-in date`, not `Move In Date`. `en-AU` is set in `<html lang>` and dates render `en-AU` (`27 Feb 2026`) via `formatDate()` in `adminUi.tsx`.
- **Specific over breezy.** Existing copy: *"Australia's student accommodation marketplace. Browse verified listings near your university, enquire with landlords, and book online with Quni Living."* — concrete verbs (browse / enquire / book), no slogans.

### Pronouns & address
- **Second-person to the user** — "Browse verified listings", "Set your status".
- **First-person plural ("we") only when speaking AS Quni** — e.g. policy / trust pages.
- **Never first-person singular.** No "I'll help you find a place".

### Casing
- **Sentence case** for nav, buttons, page titles, table headers. Existing admin: *Overview*, *Tier events*, *Landlord leads*, *Business settings*.
- **UPPERCASE eyebrow labels** (`text-[11px] font-semibold uppercase tracking-wide`) on form labels and KPI captions — already standard in `adminUi`.
- **Title Case** is only allowed in proper nouns (*NSW Fair Trading*, *Boarding Houses Act 2012*).

### Numbers & dates
- AUD with `$` prefix, no decimals on whole-dollar amounts: `$450 /wk` (PropertyCard); `$x.xx` only when cents matter (`formatAudCents`).
- Dates: `27 Feb 2026` for display; `dd/mm/yyyy` for inputs (`AUDateField`).
- Times: 24-hour for logs, 12-hour AM/PM for user-facing.

### Emoji
- **No emoji** in product copy or verification badges (per Decision 8).
- Exception: **none.** If you find yourself reaching for one, you want a Lucide icon.

### Examples (lifted from the bundle)
- *"All booking requests and their status."* (admin page subtitle — flat, factual)
- *"Live counts from your Supabase project."* (overview subtitle — internal-tool honest)
- *"Quni Living · Admin dashboard · All changes are date/time stamped"* (pricing page — middot separators, present tense, regulatory undertone)
- *"No verification completed."* (verification empty state — terse, neutral)
- *"Held by landlord — no RBO required"* (legal note — em-dash, plainspoken about regulation)

---

## VISUAL FOUNDATIONS

### Colour
- **Coral `#FF6F61`** is the brand. It is the *only* colour that gets to be loud — used for primary CTAs, hero band, brand lockup AI accent, the `theme-color` meta tag.
- **Cream `#FEF9E4`** is the brand panel — paired with `#E8E0CC` border. Header bars, admin sidebar, hero placeholder backgrounds.
- **Navy `#1F2A44`** carries secondary actions and chart series 2.
- **Warm neutral ramp** derived from the cream. We do not use Tailwind's `gray-*` cool greys for body copy — text is `--quni-ink-3` / `--quni-ink-4`, never `#6b7280`.
- Surfaces are layered: `surface-1 white` (default) → `surface-2 #F8F6F1` (subtle elevated) → `surface-3 #F4F3EC` (code/chip background) → `surface-0 cream` (the brand panel).

### Type
- Display surfaces use **Playfair Display** (serif, editorial). UI runs on **Inter**. Pricing values and long-form editorial use **Lora**. Footer body keeps **Open Sans** for legacy continuity.
- Tracking is **negative** on display sizes (-0.03em) — Playfair already feels generous; pulled-in tracking keeps it from drifting apart.
- Body line-height is `1.55` (generous). UI line-height is `1.50`. Display line-height is `1.04–1.18`.

### Backgrounds
- **No gradient backgrounds.** The brand uses flat coral, flat cream, flat white. The only "gradient" is the AI sparkle (decorative).
- **No textures, no patterns, no full-bleed photography behind copy.** Photography is contained inside cards (PropertyCard hero image at `h-48 object-cover`).
- The marketing **hero band** is a flat coral block (`#FF6F61`) with a `#CC4A3C/20` bottom border. White text. No image. This is the canonical hero treatment.
- Empty image placeholders are cream (`bg-gray-100` in the bundle, but the system says cream — see PropertyCard preview).

### Cards
- Canonical card: `rounded-2xl` (16 px), `border border-gray-100` (`--quni-line`), `shadow-1`, white surface, `p-5` internal padding.
- Hover: `-translate-y-0.5` (2 px lift), `shadow-1 → shadow-2`, `200ms ease-standard`. Image inside a card may scale-105 on group-hover.
- Cards never have coloured left-border accents — that's a SaaS trope we avoid.

### Animation
- **Default duration `200ms`**, easing `cubic-bezier(0.2, 0, 0, 1)` (the standard ease-out).
- **No bounces, no springs.** Calm, deliberate motion.
- Hover states fade colours, optionally lift 2 px on cards. Press states do not shrink — they darken.
- Loading: 2 px-stroke ring spinner (`animate-spin` on a `border-2 border-{coral} border-t-transparent rounded-full`).

### Hover states
- **Buttons:** background darkens (coral → coral-hover `#F2604F`).
- **Links:** colour shifts to coral-active `#CC4A3C` and underlines.
- **Cards:** lift 2 px + shadow step.
- **Nav items:** soft tint background (`--quni-coral-tint`, 8% coral). Active item gets `--quni-coral-tint-15` (15% coral) and coral-active text.

### Press / focus states
- **Press:** colour darkens by ~10%; no shrink, no scale-down.
- **Focus-visible:** 2-px outline `outline-offset: 2px`, coral or navy ring depending on the element. Coded into `--shadow-focus`.

### Borders
- Default: `1 px solid var(--quni-line)` (`#E5E4E7`).
- Cream-panel borders (sidebar, header): `var(--quni-cream-border)` (`#E8E0CC`).
- Coloured borders on AI / verification chips use the matching `*-tint-15` or `*-border` variable, never the saturated brand hex directly.

### Shadows / elevation
- Three steps. Soft, low contrast. Spread is wide, opacity is small (5–10%). Never crisp / never offset-only.
- Primary card uses `shadow-1` resting → `shadow-2` hover; modals use `shadow-3`. Sticky sidebar carries `shadow-1`.

### Transparency / blur
- Two specific places only:
  1. **Image overlay pills** on PropertyCard (`bg-white/90 ... backdrop-blur-sm` for "Furnished").
  2. **Unavailable state badge** on a dimmed card (`bg-stone-800/95 backdrop-blur-sm`).
- Otherwise we avoid glassmorphism. The surface system is opaque.

### Imagery
- **Warm light, daylight, real spaces.** Property hero images are real listing photographs, not stock illustrations.
- No filters, no duotone, no grain. Cream / white walls and warm wood read on-brand.
- Image radii inherit from the parent card; the image itself is **not** independently rounded.

### Layout rules
- **Site content max-width: `1200 px`** (`max-w-site`, `SITE_CONTENT_MAX_CLASS`).
- **Admin shell max-width: `1600 px`**. Sidebar is fixed `224 px` wide.
- Page padding: `px-3 sm:px-6` for marketing, `px-4 py-6 md:px-8` for admin pages, `px-6 py-8 lg:px-10` for the admin shell.
- Hero band uses `py-8`, page title block uses `text-2xl font-bold` + `mt-1 mb-6 text-sm text-gray-500` subtitle. Both observed canonical patterns.

### Corner radii — recap
- Inputs / buttons: `--radius-md` (10 px).
- Cards / hero images / table wrappers: `--radius-lg` (16 px).
- Pills / chips / avatars: `--radius-pill`.

---

## ICONOGRAPHY

The codebase uses **Lucide** (`lucide-react`, e.g. `Globe` in `AdminLayout.tsx`) plus a handful of inline SVGs hand-rolled at the call site (calendar, MapPin-style location, building, bed, bath, graduation cap, checkmark).

**System rule:** **Lucide is the canonical icon set.** Outline style, `1.5–2 px` stroke, 16 / 20 / 24 px sizes. Everything new uses Lucide. Existing inline SVGs may stay where they are, but new icons must be Lucide.

- For prototyping in HTML artifacts, link Lucide from CDN: `https://unpkg.com/lucide@latest/dist/umd/lucide.js`.
- The **AI sparkle** is custom (see `assets/ai-sparkle.svg`). It is the one icon outside the Lucide set, reserved for AI features.
- The **brand wordmark** is a PNG raster file (`/quni-logo.png`) in production — **the bundle does not include the raster file**. Until the user supplies the official PNG, this system uses an SVG placeholder rendered in Playfair Display (`assets/quni-wordmark.svg` and coral / white variants).

### Emoji
- **Off-limits** in the system per Decision 8. The applicant verification badges 🎓 ✅ 📄 📎 are documented but flagged for migration to Lucide icons (`graduation-cap`, `check-circle`, `file-text`, `paperclip`).

### Asset checklist (what's missing)
- ❗ **Quni wordmark PNG** — replace `assets/quni-wordmark.svg` with the official artwork.
- ❗ **Favicon assets** (`favicon.png`, `favicon-16x16.png`) referenced in `index.html`.
- Generic property hero photography is sourced from Unsplash in production; this system uses Unsplash URLs in the marketplace UI kit for parity.

---

## Font substitutions

All four production typefaces are loaded from **Google Fonts** in `index.html` — no font files ship in the repo. This system follows the same approach (CDN imports). If you need a self-hosted bundle, drop `.woff2` files into `fonts/` and add `@font-face` rules in `colors_and_type.css`. No substitutions are flagged — Inter, Playfair Display, Lora, and Open Sans are all available on Google Fonts at the weights used (400/500/600/700).

---

## Asks for the user

1. **Confirm the eight consolidation decisions** above before this system is referenced by other surfaces.
2. **Provide the official `quni-logo.png` and favicon files** so we can replace the SVG placeholder in `assets/`.
3. **Confirm the proposed admin IA grouping** (4 sections) — particularly that *Knowledge base* / *Support (Qase)* / *Qase settings* belong in **Settings** rather than their own section.
