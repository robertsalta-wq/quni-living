# Admin redesign

Reference package for the Quni admin redesign ("The Living Console").

- **`HANDOFF.md`** - engineering spec: routes, TS prop signatures, acceptance criteria, data mapping, replace/keep/retire list, Tailwind classes, non-goals, PR sequencing. Start here.
- **`prototype/`** - static HTML mockup of the four key screens (Living Console, Bookings, Pricing, canonical states). Open `prototype/index.html` directly in a browser - no build step. The inline JSX is **design intent only**; do not copy styles into production code. Re-implement in our TS/Tailwind/Supabase stack per `HANDOFF.md`.

This folder is reference documentation. No code here ships.
