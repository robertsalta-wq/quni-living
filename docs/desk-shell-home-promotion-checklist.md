# Desk-shell home → `/` promotion checklist

`/home-v2` is an experiment route. It carries an explicit **`noindex`** so Preview/production crawlers and assistants do not treat the prototype as the canonical home. That is intentional for the experiment.

When the desk shell **replaces** marketing home (`/`), that `noindex` must be removed — or you ship a new homepage that search engines and assistants will not index.

Do **not** remove `noindex` from `/home-v2` while it remains a parallel experiment path.

## Hard gates (must pass before calling cutover done)

1. **Remove `noindex` from the page that becomes `/`**
   - If cutover is “`HomeV2` content moves to `/`” (or `Home` renders the desk shell): the live `/` document must emit `index, follow` (or equivalent), not `noindex`.
   - Confirm in production HTML (view-source or curl, no JS): `<meta name="robots" …>` on `/` is indexable.
2. **Prerender `/`** with the new home so non-JS fetches get real HTML (same bar as machine-readable tranche Item Zero).
3. **Flags / routing**
   - `desk_shell` (or successor) behaviour matches the cutover (no accidental Preview-only shell on production home, unless that is the deliberate staged rollout).
   - Old marketing home is not left as a competing indexable duplicate without a clear canonical.
4. **Canonical / redirects**
   - `/home-v2` either redirects to `/`, or stays experiment-only with **`noindex` retained**.
   - Canonical on `/` points at `https://quni.com.au/` (or current production origin).
5. **Assistant / SEO smoke**
   - Re-check that `/` HTML includes title, description, and any home JSON-LD you intend.
   - Optionally re-run the machine-readable behavioural baseline prompts and note whether Quni’s home is cited.
6. **GATE — Drawer content must be machine-readable**
   - No desk ships with a drawer (⊕ expandable region) whose contents are not also emitted in structured data or an always-present machine-readable block on the same page. Collapsed DOM is a human affordance only; assume extractors drop it.
   - Applies to every desk with a drawer, including the landlord fee table, trust detail, and any future “what's included” content.
   - Implementation preference: rather than maintaining two copies, derive both from one source — the desk's own definition emits the human HTML and the structured data together, so they can't drift apart.
   - JSON-LD (or equivalent structured data) is the primary citation path for assistants; do not rely on collapsed body text.

## Why the noindex was there

So the experiment can ship on Preview (and even sit on production at `/home-v2`) without stealing crawl budget or being quoted as the official homepage. Remembering that at cutover is the point of this checklist.

## Related

- Machine-readable tranche: build-time prerender + rebuild-on-publish is fine at current volume; on-demand rendering is a later scale ceiling, not a cutover blocker. FAQ and similar pages treat FAQPage JSON-LD as the primary citation path (collapsed `<details>` / accordion body is secondary).
- Production deploy path remains PR → merge to `main` → Vercel Production ([`.cursor/rules/production-deploy-from-main-only.mdc`](../.cursor/rules/production-deploy-from-main-only.mdc)).
