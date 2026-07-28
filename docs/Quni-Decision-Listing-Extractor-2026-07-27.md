# Decision — Build the paste-to-list Listing Extractor (2026-07-27)

*Captured from the innovation-panel session. This is a decision record, not a plan.*

## Context
Rob is opening a Facebook-outreach channel: Quinn direct-messages people already listing rooms in Facebook accommodation groups, inviting them to also list on Quni. The strategic frame settled on is **multi-homing, not switching** — "you're already on Facebook and Flatmates; add Quni too, it's free, and you only pay $99 if you actually place someone. More shelves, more chance of filling the room." This is the supply-side mirror of the renter-facing positioning "discover anywhere, close on Quni."

The barrier to a *free* listing is not money — it is the effort of re-typing a listing the landlord has already written. That effort kills the "sixty seconds" promise the whole pitch rests on.

## Decision
**Unanimous panel yes: build the paste-to-list extractor.** A landlord pastes the listing text they already wrote (Facebook post / Flatmates / Gumtree), an AI call reads it and pre-fills the Quni property form; the landlord reviews, corrects, publishes.

### Conditions attached (each panellist's)
- **Nova:** build it as *the* landlord front door / onboarding, not a feature bolted onto a form we still expect people to grind through.
- **Kai:** present as a **reviewable draft with visible confidence** (green where sure, blank where not) — not a silent black box.
- **Ren:** the paste input must **eat messy input** — a raw Facebook post, a screenshot, half-formatted text. Requiring clean text reintroduces the friction we're deleting.
- **Devon:** **scope audit-first**, hold the four hard rules, and **don't gold-plate** — v1 text-paste only.

### The four hard rules (locked)
1. **Paste, don't scrape.** Landlord pastes their own text. Quni never fetches competitor URLs server-side (ToS/robots grey area; wrong look for a trust brand).
2. **Human commits money/legal fields.** Extracted rent/bond populate the *form* only; the existing landlord-confirm step is what commits them. Never write straight to any record that feeds money or a contract.
3. **Blank beats a guess.** Any field the source doesn't state (bond, exact dates) is left empty, never invented.
4. **Never infers tier.** Tier 1 vs Tier 2 turns on whether the landlord lives on-site — not derivable from listing text. Leave null; ask the human.

### Scope split
- **v1:** text paste only.
- **v1.1:** screenshot / OCR input.

## Sequencing
Extractor ships **before** the first Facebook DM goes out. The pitch's credibility ("sixty seconds") depends on it; sending landlords to a blank eight-section form burns the channel. Order: **audit-first Cursor brief → build → cold-landlord page + trust surface → Quinn's first DMs → scale.**

## Related pre-invite readiness (from same session)
Hard gates before the first DM: (1) extractor live; (2) cold-landlord landing page with the multi-home frame + paste box; (3) trust surface that passes the scam-sniff (founder/About, ABN, "how verification works", real reviewed listings visible); (4) landlord pricing clarity ($99 on-accept, "Quni never holds your rent or bond", no stale $29); (5) geo gate — **invite NSW + QLD freely, both tiers** (proven on Rob's own properties; the earlier "NSW Tier 1 not finalised" flag is retired), honest "not live in your state yet" fallback for other states; (6) "mark as filled / pause" control so multi-homed listings don't rot into dead-end enquiries.

Fast-follow: landlord FAQ (the catch / the money / exclusivity / honest demand expectations), automated freshness nudge, one testimonial (Casa Malvina), expectation-setting copy ("free extra shelf + safe close", never "we'll fill your room fast").

## Artifact
Phase-1 audit brief: `docs/Cursor-Brief-Listing-Extractor-Audit.md`.
