# Prototype — how to view

Open `index.html` directly in a browser (double-click, or `open index.html`). No build, no install, no dev server.

It's a single-file React + Babel prototype that loads JSX siblings via `<script type="text/babel" src>`. All styling comes from `colors_and_type.css` (a copy of the design-system tokens) plus inline styles in each `.jsx`.

**Don't copy this code.** It's design intent. Re-implement in `src/` per `../HANDOFF.md`.

Switch screens via the sidebar:
- **The Living Console** (`/admin` equivalent) — home
- **Marketplace → Bookings** — dense table + drawer
- **Money → Pricing** — form + live preview + change log
- Any other sidebar item — canonical empty / loading / error states
