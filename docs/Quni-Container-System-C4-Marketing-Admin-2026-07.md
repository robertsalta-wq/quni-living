# Quni container system — C4 marketing / admin cards (2026-07)

Sibling to C1 (#129), C2 (#130), C3 (#132), modal C-lint (#133). Discipline: classify → review → implement → verify → shrink `containerLegacy.json`.

## Scope

1. Marketing / SEO content cards → `.quni-card`.
2. Admin page panels → `admin/primitives/Card` and `adminCardClass` / `adminTableWrapClass` (both compose `.quni-card`).
3. Remaining elevated content shells found during sweep (Home how-steps, Booking bond block, invite loading card, listings empty states, etc.) → `.quni-card`.
4. Shrink `containerLegacy.json` to leftover non-card chrome that still matches the heuristic (buttons, inputs, menus, toasts, chips).

## Explicit leave (grandfather)

- AI / form **buttons** and **inputs** that trip the card heuristic
- Header / AppHeader / room-row **menus**
- Toast / chip chrome (Faq, Verification, StudentDashboard)
- Nested tinted dashboard insets (e.g. LandlordDashboard move-in callout)
- Chat panel chrome (separate surface family)

## Verify

```bash
npm run lint:app-chrome
npx tsc -b --noEmit
```
