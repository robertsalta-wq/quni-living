# Vercel environment variables

One place to see **every name** the app expects on Vercel and how to add it. Prefer the [Dashboard](https://vercel.com/docs/projects/environment-variables) (Project → Settings → Environment Variables) or the CLI below.

## Pull to your machine (do not commit)

From the repo root, linked to the Vercel project:

```bash
npm run env:pull
```

This writes **`.env.vercel`** (gitignored). Default CLI target is the **Development** environment on Vercel; to mirror production secrets locally (use with care on shared machines):

```bash
npm run env:pull:production
```

Local merge order:

1. **`.env.vercel`** — produced by pull; never commit.
2. **`.env.local`** — your overrides and secrets-only-local values; gitignored via `*.local`.

`npm run dev` (Vite) merges those for `VITE_*` client vars. For **`npx vercel dev`**, use `npm run dev:vercel`, which loads `.env.vercel` then `.env.local` into the process (plain `vercel dev` does not read `.env.vercel` by name).

The authoritative **name → meaning** map stays in **`.env.example`** (committed), including `[vercel]` vs `[local]` hints per variable.

---

## Add on Vercel (CLI cheatsheet)

Replace `production` with `preview` or `development` when you scope vars to those environments. The CLI prompts for the value (paste secret, then choose environments if asked).

```bash
# --- Browser / Vite (public; exposed as import.meta.env) ---
vercel env add VITE_SITE_URL production
vercel env add VITE_OG_IMAGE_URL production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_TURNSTILE_SITE_KEY production
vercel env add VITE_TURNSTILE_VERIFY_URL production
vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
vercel env add VITE_SENTRY_DSN production

# --- Serverless / API (never VITE_ prefix) ---
vercel env add TURNSTILE_SECRET_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_ANON_KEY production
# Resend — all transactional + public form email (contact, listing enquiries, landlord leads, booking notifications, etc.)
vercel env add RESEND_API_KEY production
vercel env add DELETE_USER_DOCS_WEBHOOK_SECRET production
vercel env add SITE_URL production
vercel env add PUBLIC_SITE_URL production
vercel env add ANTHROPIC_API_KEY production
vercel env add CHAT_LIMIT_LOGGED_IN_PER_24H production
vercel env add CHAT_LIMIT_VISITOR_PER_HOUR production
vercel env add CHAT_LISTING_CONTEXT_MAX_IDS production
vercel env add CHAT_MAX_TOKENS production
vercel env add DOCUSEAL_API_URL production
vercel env add DOCUSEAL_API_TOKEN production
vercel env add DOCUSEAL_SUBMISSIONS_PATH production
vercel env add INTERNAL_DOC_FLOW_SECRET production
vercel env add CRON_SECRET production
vercel env add GEOCODE_CACHE_TTL_MS production
vercel env add NOMINATIM_USER_AGENT production
vercel env add NOMINATIM_EMAIL production
```

**Omit from Dashboard / CLI** (Vercel injects automatically): `VERCEL`, `VERCEL_ENV`, `VERCEL_URL`, etc.

After changing variables, **redeploy** so running functions pick up new values.
