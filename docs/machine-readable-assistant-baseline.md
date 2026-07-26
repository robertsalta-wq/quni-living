# Assistant baseline (machine-readable site)

Record **before** the machine-readable hardening PR merges, then re-run about **one month** later.

## Prompts (same for each assistant)

**(a)** Find a verified room near UTS under $400.

**(b)** Can I rent out my spare room in NSW?

## Assistants

Run each prompt in:

1. ChatGPT (note model if shown)
2. Claude (note model if shown)
3. Gemini (or Perplexity if Gemini unavailable)

Use a normal consumer session (not logged into Quni). Do not paste Quni URLs into the prompt.

## Log template (copy per run)

| Field | Value |
| --- | --- |
| Date (ISO) | |
| Assistant + model | |
| Prompt | (a) / (b) |
| Quni mentioned (Y/N) | |
| Sources / URLs cited | (list, or “none”) |
| Full answer | (paste or link to saved copy) |

“Never surfaced” (Quni = N with no Quni URLs) is the key failure mode for demand-side discoverability.

## Findings (2026-07 baseline) — strategic correction

**Prompt (b) (“Can I rent out my spare room in NSW?”)**  
Assistants already answer the **law / knowing** part competently and often cite **nobody**. There is no durable citation slot to win by re-explaining NSW spare-room rules.

The winnable slot is the step **after** that explanation: next steps for **doing** — right agreement, finding a verified renter, handling bond correctly, getting the room listed. In the baseline run, answers ended in next-steps language and named no letting platform — except Gemini, which pointed at Flatmates.com.au.

**Implication for guides / supply-side content**  
Guides own the **doing**, not the knowing. Rule map stays required: it makes the doing accurate. Do not spend guide budget trying to become the cited law explainer.

**Prompt (a)** remains the demand-side machine-readability check (listings / inventory surfacing).

## Staleness note (engineering)

Listing HTML is generated at **build time**. A listing published after the last production deploy has no static HTML until `requestSiteRebuild` → `/api/internal/trigger-rebuild` (Vercel deploy hook) completes, or the next normal production deploy.

**Audit (this tranche):**

- Fires on: landlord publish draft → active, toggle active/inactive, property form save paths that go live, admin property status changes.
- `VERCEL_DEPLOY_HOOK_URL` is set in Production (encrypted).
- Known ceiling: rebuild-on-publish is fine at current volume; at scale prefer on-demand HTML over full-site rebuild. Do not redesign that here.

Webhook backup (Supabase publish → deploy hook) only if client-triggered rebuild proves leaky after this ships.
